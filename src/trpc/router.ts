import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'
import { query, Options } from '@anthropic-ai/claude-code'
import type { Context } from './context'
import {
  ElementDataSchema,
  StructuredMessageSchema,
  type ElementData,
  type PageInfo,
  type SendMessageResponse
} from '../shared/schemas'

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

  newChat: publicProcedure.mutation(() => {
    console.log('New chat initiated')
    return { message: 'New chat initiated' }
  }),

  sendMessage: publicProcedure
    .input(StructuredMessageSchema)
    .subscription(async function* ({ input, signal }) {
      yield {
        type: 'connection',
        message: 'Connected to Frontend Context',
      } as SendMessageResponse

      const componentLocations = extractComponentLocationsFromElements(input.selectedElements)
      const formattedPrompt = formatAIPrompt(input.userPrompt, input.selectedElements, input.pageInfo)

      console.log('Received structured input:', {
        userPrompt: input.userPrompt.substring(0, 100) + '...',
        elementsCount: input.selectedElements.length,
        pageInfo: input.pageInfo,
        sessionId: input.sessionId || 'new session'
      })
      console.log('Extracted component locations:', componentLocations)

      if (componentLocations.length > 0) {
        yield {
          type: 'progress',
          message: `Found ${componentLocations.length} component(s)`,
          componentLocations,
        } as SendMessageResponse
      } else {
        yield {
          type: 'progress',
          message: 'No component locations found in elements',
        } as SendMessageResponse
      }

      // Process with Claude Code
      let currentSessionId: string | undefined = input.sessionId

      try {
        yield {
          type: 'progress',
          message: 'Processing with Claude...',
        } as SendMessageResponse

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
          abortController
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
              type: 'progress',
              message: 'Request was cancelled',
            } as SendMessageResponse
            break
          }

          // Update current session ID if Claude provides one
          if (message.session_id) {
            currentSessionId = message.session_id
          }

          // Stream all Claude Code messages as JSON to the toolbar
          yield {
            type: 'claude_json',
            message: 'Claude Code message',
            claudeJson: message,
            sessionId: currentSessionId,
          } as SendMessageResponse

          if (message.type === "result" && !message.is_error) {
            yield {
              type: 'claude_response',
              message: 'Claude analysis complete',
              claudeResponse: JSON.stringify(message),
              sessionId: currentSessionId,
            } as SendMessageResponse
          } else if (message.type === "result" && message.is_error) {
            yield {
              type: 'progress',
              message: 'Claude analysis failed: ' + message.subtype,
            } as SendMessageResponse
          }
        }

        yield {
          type: 'complete',
          message: 'Message processed successfully',
          prompt: formattedPrompt,
          componentLocations,
          sessionId: currentSessionId,
        } as SendMessageResponse
      } catch (error) {
        // Check if the error is due to cancellation
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          console.log('Claude processing was cancelled')
          yield {
            type: 'progress',
            message: 'Request was cancelled',
          } as SendMessageResponse
          
          yield {
            type: 'complete',
            message: 'Processing was cancelled',
            prompt: formattedPrompt,
            componentLocations,
            sessionId: currentSessionId,
          } as SendMessageResponse
        } else {
          console.error('Claude processing error:', error)
          yield {
            type: 'progress',
            message: 'Error processing with Claude: ' + (error as Error).message,
          } as SendMessageResponse

          yield {
            type: 'complete',
            message: 'Processing completed with errors',
            prompt: formattedPrompt,
            componentLocations,
            sessionId: currentSessionId,
          } as SendMessageResponse
        }
      }
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
})

function extractComponentLocationsFromElements(elements: ElementData[]): string[] {
  const componentLocations: string[] = []

  const extractFromElement = (element: ElementData) => {
    if (element.componentData?.componentLocation) {
      componentLocations.push(element.componentData.componentLocation)
    }
    if (element.children && Array.isArray(element.children)) {
      element.children.forEach(extractFromElement)
    }
  }

  elements.forEach(extractFromElement)
  return componentLocations
}

function formatAIPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo): string {
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
    formattedPrompt += `<inspectedElements>${JSON.stringify(selectedElements, replacer)}</inspectedElements>`
  }

  return formattedPrompt
}

export type AppRouter = typeof appRouter