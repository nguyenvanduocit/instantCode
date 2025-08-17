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
  SendMessageResponse
} from '../shared/types'
import { 
  initializeConsoleErrorCapture, 
  captureConsoleErrors, 
  captureConsoleWarnings, 
  captureConsoleInfo 
} from './console'

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
  newChat(): Promise<void>
  cancel(): void
  getSessionId(): string | null
  isInitialized(): boolean
  isProcessing(): boolean
  destroy(): void
}

export function createAIManager(): AIManager {
  let trpcClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null
  let wsClient: ReturnType<typeof createWSClient> | null = null
  let currentSubscription: any = null
  let globalSessionId: string | null = null
  const clientId: string = Math.random().toString(36).substring(7)

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
        console.log(`🟡 [CLIENT ${clientId}] Cancelling existing subscription before creating new one`)
        currentSubscription.unsubscribe()
        currentSubscription = null
      }

      console.log(`🟢 [CLIENT ${clientId}] Creating new subscription for prompt: "${userPrompt.substring(0, 30)}..."`)

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

      const structuredInput: SendMessageInput = {
        userPrompt,
        selectedElements,
        pageInfo,
        cwd,
        sessionId: globalSessionId || undefined,
        consoleErrors,
        consoleWarnings,
        consoleInfo
      }

      console.log('structuredInput', structuredInput)

      const subscription = trpcClient.sendMessage.subscribe(
        structuredInput,
        {
          onData: (data) => {
            console.log(`📥 [CLIENT ${clientId}] SSE data received:`, data)

            if ((data.type === 'claude_json' || data.type === 'claude_response' || data.type === 'complete') && data.sessionId) {
              globalSessionId = data.sessionId
            }

            handler.onData(data)

            if (data.type === 'complete') {
              console.log(`✅ [CLIENT ${clientId}] AI request completed with session ID:`, data.sessionId)
              currentSubscription = null
              handler.onComplete()
            }
          },
          onError: (error) => {
            console.error(`❌ [CLIENT ${clientId}] Subscription error:`, error)
            currentSubscription = null
            handler.onError(error)
          },
        }
      )

      currentSubscription = subscription
    },

    async newChat(): Promise<void> {
      if (trpcClient) {
        try {
          await trpcClient.newChat.mutate()
          globalSessionId = null
        } catch (error) {
          console.error('Failed to start new chat:', error)
          throw error
        }
      } else {
        console.warn('tRPC client not initialized')
        throw new Error('tRPC client not initialized')
      }
    },

    cancel(): void {
      if (currentSubscription) {
        console.log('Cancelling current AI request')
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