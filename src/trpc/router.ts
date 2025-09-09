import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'
import { query, Options } from '@anthropic-ai/claude-code'
import type { Context } from './context'
import {
  ElementDataSchema,
  SendMessageSchema,
  SaveImageRequestSchema,
  type ElementData,
  type PageInfo,
  type SendMessageResponse,
  type SaveImageResponse
} from '../shared/schemas'
import { sampleSendMessageResponses } from '../sample'
import { saveElementImage } from '../utils/image-storage'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// All schemas are now imported from shared/schemas.ts

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: 'Frontend Context server is running',
    timestamp: new Date().toISOString(),
  })),

  newChat: publicProcedure
    .mutation(() => {
      // Client resets its own session ID; server just acknowledges
      return { success: true }
    }),

  sendMessage: publicProcedure
    .input(SendMessageSchema)
    .subscription(async function* ({ input, signal, ctx }) {
      const subscriptionId = Math.random().toString(36).substring(7)
      ctx.logger.log(`🔵 [SERVER] New subscription created: ${subscriptionId} for session: ${input.sessionId || 'new'}`)

      ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent connection message`)

      const formattedPrompt = formatAIPrompt(input.userPrompt, input.selectedElements, input.pageInfo, input.consoleErrors, input.imagePaths)

      ctx.logger.log('Received structured input:', {
        userPrompt: input.userPrompt,
        elements: input.selectedElements,
        pageInfo: input.pageInfo,
        sessionId: input.sessionId || 'new session'
      })
      ctx.logger.log(formattedPrompt)

      try {
        // Mock mode: stream deterministic frames for UI/dev without real backend calls
        if (ctx.isMock) {
          ctx.logger.log(`🧪 [SERVER ${subscriptionId}] Mock mode enabled - streaming sample messages`)
          for await (const message of sampleSendMessageResponses(input)) {
            if (signal?.aborted) {
              yield {
                type: 'result',
                subtype: 'error',
                is_error: true,
                duration_ms: 0,
                duration_api_ms: 0,
                result: 'Request was cancelled',
                session_id: input.sessionId || ''
              } as SendMessageResponse
              break
            }
            yield message as SendMessageResponse
            ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent mock message: ${message.type}`)
          }
          ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent mock completion message`)
          ctx.logger.log(`🔴 [SERVER] Subscription ${subscriptionId} ended`)
          return
        }

        const abortController = new AbortController()
        
        // Forward the tRPC signal cancellation to our AbortController
        if (signal) {
          signal.addEventListener('abort', () => {
            abortController.abort()
          })
        }

        const queryOptions: Options = {
          permissionMode: "bypassPermissions",
          maxTurns: 50,
          executable: "bun",
          cwd: input.cwd,
          abortController,
          appendSystemPrompt: "think carefully about user request and provided context, use todolist if the task is complicated"
        }

        // Add resumeSessionId if sessionId is provided
        if (input.sessionId) {
          queryOptions.resume = input.sessionId
        }

        for await (const message of query({
          prompt: formattedPrompt,
          options: queryOptions
        })) {
          // Check if the request was cancelled
          if (abortController.signal.aborted) {
            yield {
              type: 'result',
              subtype: 'error',
              is_error: true,
              duration_ms: 0,
              duration_api_ms: 0,
              result: 'Request was cancelled',
              session_id: message.session_id,
            } as SendMessageResponse
            break
          }


          // Stream all Claude Code messages directly to the toolbar with their original type
          yield message as SendMessageResponse
          ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent message: ${message.type}`)

        }
        ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent completion message`)
      } catch (error) {
        // Check if the error is due to cancellation
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          ctx.logger.log(`🚫 [SERVER ${subscriptionId}] Claude processing was cancelled`)
          yield {
            type: 'result',
            subtype: 'error',
            is_error: true,
            duration_ms: 0,
            duration_api_ms: 0,
            result: 'Request was cancelled',
            session_id: input.sessionId,
          } as SendMessageResponse
          ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent cancellation messages`)
        } else {
          ctx.logger.error(`❌ [SERVER ${subscriptionId}] Claude processing error:`, error)
          
          yield {
            type: 'result',
            subtype: 'error',
            is_error: true,
            duration_ms: 0,
            duration_api_ms: 0,
            result: 'Error processing with Claude: ' + (error as Error).message,
            session_id: input.sessionId,
          } as SendMessageResponse
          ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent error messages`)
        }
      }
      
      ctx.logger.log(`🔴 [SERVER] Subscription ${subscriptionId} ended`)
    }),

  processElements: publicProcedure
    .input(
      z.object({
        elements: z.array(ElementDataSchema),
        prompt: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const componentLocations: string[] = []

      const extractFromElement = (element: ElementData) => {
        if (element.componentData?.componentLocation) {
          componentLocations.push(element.componentData.componentLocation)
        }
        if (element.children && Array.isArray(element.children)) {
          element.children.forEach(extractFromElement)
        }
      }

      input.elements.forEach(extractFromElement)

      return {
        componentLocations,
        elementsCount: input.elements.length,
        prompt: input.prompt,
      }
    }),

  saveElementImage: publicProcedure
    .input(SaveImageRequestSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.logger.log('Saving element image:', {
        filename: input.filename,
        elementInfo: input.elementInfo,
        dataSize: input.imageData.length
      })

      try {
        const result = await saveElementImage(input, ctx.cwd)
        
        if (result.success) {
          ctx.logger.log('Image saved successfully:', result.data)
          return result.data as SaveImageResponse
        } else {
          ctx.logger.error('Image save failed:', result.error)
          throw new Error(`Image save failed: ${result.error.message}`)
        }
      } catch (error) {
        ctx.logger.error('Image save error:', error)
        throw new Error(`Image save error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})

function formatAIPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo, consoleErrors?: string[], imagePaths?: string[]): string {
  let formattedPrompt = `<userRequest>${userPrompt}</userRequest>`

  const replacer = (_key: string, value: any) => {
    if (value === '' || (Array.isArray(value) && value.length === 0) || value === null) {
      return undefined
    }
    return value
  }

  if (pageInfo) {
    formattedPrompt += `<pageInfo>${JSON.stringify(pageInfo, replacer)}</pageInfo>`
  }

  if (selectedElements && selectedElements.length > 0) {
    formattedPrompt += `<selection>${JSON.stringify(selectedElements, replacer)}</selection>`
  }

  if (consoleErrors && consoleErrors.length > 0) {
    formattedPrompt += `<consoleErrors>${JSON.stringify(consoleErrors, replacer)}</consoleErrors>`
  }

  if (imagePaths && imagePaths.length > 0) {
    formattedPrompt += `<elementImages>${JSON.stringify(imagePaths, replacer)}</elementImages>`
  }

  return formattedPrompt
}

export type AppRouter = typeof appRouter