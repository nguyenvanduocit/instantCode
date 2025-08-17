import { z } from 'zod'

// Define Zod schemas as single source of truth
export const ElementDataSchema = z.object({
  index: z.number(),
  tagName: z.string(),
  xpath: z.string(),
  textContent: z.string(),
  attributes: z.record(z.string(), z.string()),
  children: z.array(z.any()),
  componentData: z.object({
    componentLocation: z.string(),
    componentName: z.string().optional(),
  }).optional(),
})

export const PageInfoSchema = z.object({
  url: z.string(),
  title: z.string(),
})

export const StructuredMessageSchema = z.object({
  userPrompt: z.string(),
  selectedElements: z.array(ElementDataSchema),
  pageInfo: PageInfoSchema,
  cwd: z.string().optional(),
  sessionId: z.string().optional(),
})

export const SendMessageResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('connection'),
    message: z.string(),
  }),
  z.object({
    type: z.literal('progress'),
    message: z.string(),
    componentLocations: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('complete'),
    message: z.string(),
    prompt: z.string().optional(),
    componentLocations: z.array(z.string()).optional(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('claude_response'),
    message: z.string(),
    claudeResponse: z.string().optional(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('claude_json'),
    message: z.string(),
    claudeJson: z.any().optional(),
    sessionId: z.string().optional(),
  }),
])

// Infer TypeScript types from Zod schemas
export type ElementData = z.infer<typeof ElementDataSchema>
export type PageInfo = z.infer<typeof PageInfoSchema>
export type StructuredMessage = z.infer<typeof StructuredMessageSchema>
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>