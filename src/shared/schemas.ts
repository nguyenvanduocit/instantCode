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
  imagePath: z.string().optional(), // Optional path to captured screenshot
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
  imagePaths: z.array(z.string()).optional(), // Array of captured image file paths
})


// Image storage schemas
export const ElementIdentifierSchema = z.object({
  xpath: z.string(),
  cssSelector: z.string(),
  tagName: z.string(),
})

export const SaveImageRequestSchema = z.object({
  imageData: z.string(), // base64 encoded
  filename: z.string(),
  elementInfo: ElementIdentifierSchema,
})

export const SaveImageResponseSchema = z.object({
  success: z.boolean(),
  imagePath: z.string(),
  filename: z.string(),
})

export const SendMessageResponseSchema = z.union([

// 'system' message type
  z.object({
    type: z.literal('system'),
    subtype: z.literal('init'),
    cwd: z.string(),
    session_id: z.string(),
    apiKeySource: z.string(), // e.g. "none"
    mcp_servers: z.array(z.object({
      name: z.string(),
      status: z.string(),
    })),
    model: z.string(), // e.g. "claude-opus-4-1-20250805"
    permissionMode: z.string(), // e.g. "bypassPermissions"
    slash_commands: z.array(z.string()),
    tools: z.array(z.string()),
  }),

  // 'assistant' message type  
  z.object({
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
  }),

  // 'user' message type
  z.object({
    type: z.literal('user'),
    message: z.object({
      role: z.literal('user'),
      content: z.array(z.object({
        type: z.string(), // e.g. "tool_result"
        content: z.string().optional(),
        tool_use_id: z.string().optional(),
      })),
    }),
    parent_tool_use_id: z.string().nullable(),
    session_id: z.string(),
  }),

  // 'result' message type
  z.object({
    type: z.literal('result'),
    // Allow any subtype string; server will use 'error' for errors
    subtype: z.string(),
    is_error: z.boolean(),
    duration_ms: z.number(),
    duration_api_ms: z.number(),
    num_turns: z.number().optional(),
    result: z.string().optional(),
    session_id: z.string(),
    total_cost_usd: z.number().optional(),
    usage: z.object({
      input_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      output_tokens: z.number(),
    }).optional(),
    permission_denials: z.array(z.object({
      tool_name: z.string(),
      tool_use_id: z.string(),
      tool_input: z.record(z.string(), z.unknown()),
    })).optional(),
  }),
])

// Infer TypeScript types from Zod schemas
export type ElementData = z.infer<typeof ElementDataSchema>
export type PageInfo = z.infer<typeof PageInfoSchema>
export type SendMessage = z.infer<typeof SendMessageSchema>
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>
export type ElementIdentifier = z.infer<typeof ElementIdentifierSchema>
export type SaveImageRequest = z.infer<typeof SaveImageRequestSchema>
export type SaveImageResponse = z.infer<typeof SaveImageResponseSchema>