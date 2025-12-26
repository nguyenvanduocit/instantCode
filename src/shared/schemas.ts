import { z } from 'zod'

// Define Zod schemas as single source of truth
export const ElementDataSchema = z.object({
  index: z.number(),
  tagName: z.string(),
  xpath: z.string(),
  cssSelector: z.string(),
  textContent: z.string(),
  attributes: z.record(z.string(), z.string()),
  children: z.array(z.any()),
  imagePath: z.string().optional(),
  computedStyles: z.object({
    width: z.number(), // outerWidth (offsetWidth)
    height: z.number(), // outerHeight (offsetHeight)
    fontSize: z.string(), // computed font-size
    fontFamily: z.string(), // computed font-family
    color: z.string().optional(), // computed color
    backgroundColor: z.string().optional(), // computed background-color
    display: z.string().optional(), // computed display
    position: z.string().optional(), // computed position
  }).optional(),
  componentData: z.object({
    componentLocation: z.string(),
    componentName: z.string().optional(),
    // Enhanced element-specific location data
    elementLocation: z.object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
      endLine: z.number().optional(),
      endColumn: z.number().optional(),
      source: z.string().optional(), // The actual source code of this element
    }).optional(),
    // Framework-specific metadata
    framework: z.enum(['vue', 'react', 'angular', 'svelte', 'vanilla']).optional(),
    // Source map data for precise mapping
    sourceMap: z.object({
      originalLine: z.number(),
      originalColumn: z.number(),
      originalSource: z.string(),
      originalName: z.string().optional(),
    }).optional(),
    // Element hierarchy in source (e.g., "Button > .content > span")
    sourceHierarchy: z.string().optional(),
  }).optional(),
})

export const PageInfoSchema = z.object({
  url: z.string(),
  title: z.string(),
})

export const SendMessageSchema = z.object({
  userPrompt: z.string(),
  selectedElements: z.array(ElementDataSchema),
  pageInfo: PageInfoSchema,
  cwd: z.string().optional(),
  sessionId: z.string().optional(),
  consoleErrors: z.array(z.string()).optional(),
  consoleWarnings: z.array(z.string()).optional(),
  consoleInfo: z.array(z.string()).optional(),
})


// API key source types matching SDK
export const ApiKeySourceSchema = z.enum(['user', 'project', 'org', 'temporary'])

// Permission mode types matching SDK
export const PermissionModeSchema = z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan'])

// Usage schema (non-nullable as per SDK)
export const UsageSchema = z.object({
  input_tokens: z.number(),
  cache_creation_input_tokens: z.number(),
  cache_read_input_tokens: z.number(),
  output_tokens: z.number(),
})

// Permission denial schema
export const PermissionDenialSchema = z.object({
  tool_name: z.string(),
  tool_use_id: z.string(),
  tool_input: z.record(z.string(), z.unknown()),
})

// System message - matches SDKSystemMessage
export const SDKSystemMessageSchema = z.object({
  type: z.literal('system'),
  subtype: z.literal('init'),
  apiKeySource: ApiKeySourceSchema,
  cwd: z.string(),
  session_id: z.string(),
  tools: z.array(z.string()),
  mcp_servers: z.array(z.object({
    name: z.string(),
    status: z.string(),
  })),
  model: z.string(),
  permissionMode: PermissionModeSchema,
  slash_commands: z.array(z.string()),
})

// Assistant message - matches SDKAssistantMessage
export const SDKAssistantMessageSchema = z.object({
  type: z.literal('assistant'),
  message: z.object({
    id: z.string(),
    type: z.literal('message'),
    role: z.literal('assistant'),
    model: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      id: z.string().optional(),
      name: z.string().optional(),
      input: z.record(z.string(), z.unknown()).optional(),
    })),
    stop_reason: z.string().nullable().optional(),
    stop_sequence: z.string().nullable().optional(),
    usage: z.object({
      input_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      output_tokens: z.number(),
    }).optional(),
  }),
  parent_tool_use_id: z.string().nullable(),
  session_id: z.string(),
})

// User message - matches SDKUserMessage
export const SDKUserMessageSchema = z.object({
  type: z.literal('user'),
  message: z.object({
    role: z.literal('user'),
    content: z.array(z.object({
      type: z.string(),
      content: z.string().optional(),
      tool_use_id: z.string().optional(),
    })),
  }),
  parent_tool_use_id: z.string().nullable(),
  session_id: z.string(),
})

// Result message - matches SDKResultMessage discriminated union
// Success result has `result` field, error results do not
export const SDKResultSuccessSchema = z.object({
  type: z.literal('result'),
  subtype: z.literal('success'),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  is_error: z.literal(false),
  num_turns: z.number(),
  result: z.string(),
  session_id: z.string(),
  total_cost_usd: z.number(),
  usage: UsageSchema,
  permission_denials: z.array(PermissionDenialSchema),
})

export const SDKResultErrorSchema = z.object({
  type: z.literal('result'),
  subtype: z.enum(['error_max_turns', 'error_during_execution']),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  is_error: z.literal(true),
  num_turns: z.number(),
  session_id: z.string(),
  total_cost_usd: z.number(),
  usage: UsageSchema,
  permission_denials: z.array(PermissionDenialSchema),
})

// Server-generated error messages (not from SDK)
// Used for cancellation, network errors, etc.
export const ServerErrorSchema = z.object({
  type: z.literal('result'),
  subtype: z.literal('error'),
  is_error: z.literal(true),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  result: z.string(),
  session_id: z.string().optional(),
})

// Combined result schema (SDK results + server errors)
export const SDKResultMessageSchema = z.union([
  SDKResultSuccessSchema,
  SDKResultErrorSchema,
  ServerErrorSchema,
])

// Full SDK message union - matches SDKMessage from @anthropic-ai/claude-code
export const SendMessageResponseSchema = z.union([
  SDKSystemMessageSchema,
  SDKAssistantMessageSchema,
  SDKUserMessageSchema,
  SDKResultMessageSchema,
])

// Infer TypeScript types from Zod schemas
export type ElementData = z.infer<typeof ElementDataSchema>
export type PageInfo = z.infer<typeof PageInfoSchema>
export type SendMessage = z.infer<typeof SendMessageSchema>
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>