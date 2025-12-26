import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { query, Options, AbortError } from '@anthropic-ai/claude-code'
import type { Context } from './context'
import {
  SendMessageSchema,
  type ElementData,
  type PageInfo,
  type SendMessageResponse
} from '../shared/schemas'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

/**
 * Categorize and format error messages for better user feedback
 */
function formatErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred'
  }

  const message = error.message.toLowerCase()

  // API key / authentication errors
  if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
    return 'API key error: Please check your Anthropic API key configuration'
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
    return 'Rate limited: Too many requests. Please wait a moment and try again'
  }

  // Network errors
  if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound') || message.includes('fetch failed')) {
    return 'Network error: Unable to connect to Claude API. Check your internet connection'
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Request timed out: The operation took too long. Try a simpler request'
  }

  // Model/capacity errors
  if (message.includes('overloaded') || message.includes('capacity') || message.includes('503')) {
    return 'Service temporarily unavailable: Claude is experiencing high demand. Please retry'
  }

  // Session errors
  if (message.includes('session') || message.includes('resume')) {
    return 'Session error: Unable to resume previous session. Starting fresh conversation'
  }

  // Claude Code CLI not found
  if (message.includes('not found') || message.includes('enoent') || message.includes('spawn')) {
    return 'Claude Code CLI not found: Ensure @anthropic-ai/claude-code is installed globally'
  }

  // Context length errors
  if (message.includes('context') || message.includes('token') || message.includes('too long')) {
    return 'Context too long: Try selecting fewer elements or shortening your prompt'
  }

  // Default: show the original message but clean it up
  return `Error: ${error.message}`
}

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

      const formattedPrompt = formatAIPrompt(input.userPrompt, input.selectedElements, input.pageInfo, input.consoleErrors)

      ctx.logger.log('Received structured input:', {
        userPrompt: input.userPrompt,
        elements: input.selectedElements,
        pageInfo: input.pageInfo,
        sessionId: input.sessionId || 'new session'
      })
      ctx.logger.log(formattedPrompt)

      try {
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
        // Check if the error is due to cancellation (use SDK's AbortError or check message)
        const isAbortError = error instanceof AbortError ||
          (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted')))

        if (isAbortError) {
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

          // Use improved error message formatting
          const userFriendlyMessage = formatErrorMessage(error)

          yield {
            type: 'result',
            subtype: 'error',
            is_error: true,
            duration_ms: 0,
            duration_api_ms: 0,
            result: userFriendlyMessage,
            session_id: input.sessionId,
          } as SendMessageResponse
          ctx.logger.log(`📤 [SERVER ${subscriptionId}] Sent error messages`)
        }
      }
      
      ctx.logger.log(`🔴 [SERVER] Subscription ${subscriptionId} ended`)
    }),
})

function formatAIPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo, consoleErrors?: string[]): string {
  let formattedPrompt = `<task>${userPrompt}</task>`

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
    // Extract image paths for special handling
    const imagePaths: string[] = []
    const extractImagePaths = (elements: ElementData[]) => {
      elements.forEach(element => {
        if (element.imagePath) {
          imagePaths.push(element.imagePath)
        }
        if (element.children && Array.isArray(element.children)) {
          extractImagePaths(element.children)
        }
      })
    }
    extractImagePaths(selectedElements)

    formattedPrompt += `<selection>${JSON.stringify(selectedElements, replacer)}</selection>`
    
    // Add image paths for Claude to reference
    if (imagePaths.length > 0) {
      formattedPrompt += `\n\nI have attached ${imagePaths.length} screenshot${imagePaths.length > 1 ? 's' : ''} of the selected elements. Please refer to these images when analyzing the UI/UX or visual elements:\n${imagePaths.map(path => `- ${path}`).join('\n')}`
    }
  }

  if (consoleErrors && consoleErrors.length > 0) {
    formattedPrompt += `<consoleErrors>${JSON.stringify(consoleErrors, replacer)}</consoleErrors>`
  }

  return formattedPrompt
}

export type AppRouter = typeof appRouter