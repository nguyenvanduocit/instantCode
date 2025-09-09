/**
 * AI Manager for tRPC client management and AI communication
 */

import {
  createTRPCProxyClient,
  createWSClient,
  httpBatchLink,
  splitLink,
  wsLink
} from '@trpc/client'
import superjson from 'superjson'
import type { 
  AppRouter, 
  ElementData, 
  PageInfo, 
  SendMessageInput,
  SendMessageResponse,
  SaveImageRequest
} from '../shared/types'
import { 
  initializeConsoleErrorCapture, 
  captureConsoleErrors, 
  captureConsoleWarnings, 
  captureConsoleInfo 
} from './console'
import { createLogger } from './logger'
import { createScreenshotCaptureService } from './capture'

export interface AIMessageHandler {
  onData: (data: SendMessageResponse) => void
  onError: (error: any) => void
  onComplete: () => void
}

export interface AIManager {
  initialize(aiEndpoint: string): void
  sendMessage(
    userPrompt: string,
    selectedElements: ElementData[],
    pageInfo: PageInfo,
    cwd: string,
    handler: AIMessageHandler
  ): Promise<void>
  captureAndUploadElementImages(selectedElements: ElementData[], domElements: Element[]): Promise<string[]>
  newChat(): Promise<void>
  cancel(): void
  getSessionId(): string | null
  isInitialized(): boolean
  isProcessing(): boolean
  destroy(): void
}

export function createAIManager(verbose = false): AIManager {
  const logger = createLogger(verbose)
  let trpcClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null
  let wsClient: ReturnType<typeof createWSClient> | null = null
  let currentSubscription: any = null
  let globalSessionId: string | null = null
  const clientId: string = Math.random().toString(36).substring(7)
  const screenshotService = createScreenshotCaptureService()

  // Initialize console error capture on first AI manager creation
  initializeConsoleErrorCapture()

  return {
    initialize(aiEndpoint: string): void {
      if (!aiEndpoint) return

      if (wsClient) {
        wsClient.close()
      }

      const wsUrl = aiEndpoint.replace('http://', 'ws://').replace('https://', 'wss://')
      wsClient = createWSClient({
        url: `${wsUrl}/trpc`,
      })

      trpcClient = createTRPCProxyClient<AppRouter>({
        links: [
          splitLink({
            condition(op) {
              return op.type === 'subscription'
            },
            true: wsLink({
              client: wsClient,
              transformer: superjson,
            }),
            false: httpBatchLink({
              url: `${aiEndpoint}/trpc`,
              transformer: superjson,
            }),
          }),
        ],
      })
    },

    async sendMessage(
      userPrompt: string,
      selectedElements: ElementData[],
      pageInfo: PageInfo,
      cwd: string,
      handler: AIMessageHandler
    ): Promise<void> {
      if (!trpcClient) {
        throw new Error('tRPC client not initialized')
      }

      if (currentSubscription) {
        logger.log(`🟡 [CLIENT ${clientId}] Cancelling existing subscription before creating new one`)
        currentSubscription.unsubscribe()
        currentSubscription = null
      }

      logger.log(`🟢 [CLIENT ${clientId}] Creating new subscription for prompt: "${userPrompt.substring(0, 30)}..."`)

      // Capture console messages based on prompt keywords
      let consoleErrors: string[] | undefined
      let consoleWarnings: string[] | undefined
      let consoleInfo: string[] | undefined

      if (userPrompt.includes('@error')) {
        consoleErrors = captureConsoleErrors()
      }

      if (userPrompt.includes('@warning')) {
        consoleWarnings = captureConsoleWarnings()
      }

      if (userPrompt.includes('@info')) {
        consoleInfo = captureConsoleInfo()
      }

      // Collect image paths from selected elements
      const imagePaths: string[] = []
      selectedElements.forEach(element => {
        if (element.imagePath) {
          imagePaths.push(element.imagePath)
        }
      })

      const structuredInput: SendMessageInput = {
        userPrompt,
        selectedElements,
        pageInfo,
        cwd,
        sessionId: globalSessionId || undefined,
        consoleErrors,
        consoleWarnings,
        consoleInfo,
        imagePaths: imagePaths.length > 0 ? imagePaths : undefined
      }

      logger.log('structuredInput', structuredInput)

      const subscription = trpcClient.sendMessage.subscribe(
        structuredInput,
        {
          onData: (data) => {
            logger.log(`📥 [CLIENT ${clientId}] SSE data received:`, data)

            // Update session ID from any message that contains it
            if ('session_id' in data && data.session_id) {
              globalSessionId = data.session_id
            }

            handler.onData(data)

            if (data.type === 'result') {
              logger.log(`✅ [CLIENT ${clientId}] AI request completed with session ID:`, data.session_id)
              currentSubscription = null
              handler.onComplete()
            }
          },
          onError: (error) => {
            logger.error(`❌ [CLIENT ${clientId}] Subscription error:`, error)
            currentSubscription = null
            handler.onError(error)
          },
        }
      )

      currentSubscription = subscription
    },

    async captureAndUploadElementImages(selectedElements: ElementData[], domElements: Element[]): Promise<string[]> {
      if (!trpcClient) {
        logger.warn('tRPC client not initialized - skipping image capture')
        return []
      }

      // Check browser support for screenshot capture
      if (!('HTMLCanvasElement' in window)) {
        logger.warn('Browser does not support canvas - skipping image capture')
        return []
      }

      const imagePaths: string[] = []
      const errors: string[] = []

      // Process each selected element with graceful error handling
      for (let i = 0; i < Math.min(selectedElements.length, domElements.length); i++) {
        const elementData = selectedElements[i]
        const domElement = domElements[i]

        try {
          logger.log(`📷 [CLIENT ${clientId}] Capturing screenshot for element ${i + 1}`)

          // Capture element screenshot with timeout
          const capturePromise = screenshotService.captureElementScreenshot(domElement)
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Screenshot capture timeout')), 5000)
          })

          const captureResult = await Promise.race([capturePromise, timeoutPromise])
          
          if (!captureResult.success) {
            const errorMsg = `Screenshot capture failed for element ${i + 1}: ${captureResult.error.message}`
            logger.warn(errorMsg)
            errors.push(errorMsg)
            continue
          }

          // Generate filename for the element
          const filename = screenshotService.generateImageFilename(domElement)

          // Create save request
          const saveRequest: SaveImageRequest = {
            imageData: captureResult.data,
            filename: filename,
            elementInfo: {
              xpath: elementData.xpath,
              cssSelector: elementData.cssSelector,
              tagName: elementData.tagName
            }
          }

          // Upload to server with timeout
          logger.log(`📤 [CLIENT ${clientId}] Uploading image for element ${i + 1}`)
          const uploadPromise = trpcClient.saveElementImage.mutate(saveRequest)
          const uploadTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Image upload timeout')), 10000)
          })

          const uploadResult = await Promise.race([uploadPromise, uploadTimeoutPromise])

          if (uploadResult.success) {
            imagePaths.push(uploadResult.imagePath)
            logger.log(`✅ [CLIENT ${clientId}] Image uploaded successfully: ${uploadResult.filename}`)
            
            // Update the element data with image path
            elementData.imagePath = uploadResult.imagePath
          } else {
            const errorMsg = `Image upload failed for element ${i + 1}: Server returned unsuccessful response`
            logger.warn(errorMsg)
            errors.push(errorMsg)
          }

        } catch (error) {
          const errorMsg = `Image capture/upload error for element ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
          logger.error(errorMsg, error)
          errors.push(errorMsg)
          
          // Check for browser compatibility issues
          if (error instanceof Error) {
            if (error.message.includes('not supported') || error.message.includes('getDisplayMedia')) {
              logger.warn('Browser may not support required screenshot APIs - continuing with text-only mode')
            }
            if (error.message.includes('network') || error.message.includes('fetch')) {
              logger.warn('Network error during image upload - continuing with text-only mode')
            }
          }
        }
      }

      if (errors.length > 0 && imagePaths.length === 0) {
        logger.warn(`All image captures failed. Errors: ${errors.join('; ')}`)
      } else if (errors.length > 0) {
        logger.warn(`Some image captures failed (${errors.length}/${selectedElements.length}). Errors: ${errors.join('; ')}`)
      }

      logger.log(`📷 [CLIENT ${clientId}] Image capture completed. ${imagePaths.length}/${selectedElements.length} images captured successfully.`)
      return imagePaths
    },

    async newChat(): Promise<void> {
      if (trpcClient) {
        try {
          await trpcClient.newChat.mutate()
          globalSessionId = null
        } catch (error) {
          logger.error('Failed to start new chat:', error)
          throw error
        }
      } else {
        logger.warn('tRPC client not initialized')
        throw new Error('tRPC client not initialized')
      }
    },

    cancel(): void {
      if (currentSubscription) {
        logger.log('Cancelling current AI request')
        currentSubscription.unsubscribe()
        currentSubscription = null
      }
    },

    getSessionId(): string | null {
      return globalSessionId
    },

    isInitialized(): boolean {
      return trpcClient !== null
    },

    isProcessing(): boolean {
      return currentSubscription !== null
    },

    destroy(): void {
      if (currentSubscription) {
        currentSubscription.unsubscribe()
      }
      if (wsClient) {
        wsClient.close()
      }
    }
  }
}