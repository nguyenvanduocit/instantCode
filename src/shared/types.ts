import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../trpc/router'

// Export router type for tRPC client
export type { AppRouter }

// Infer types from the router using tRPC's type inference
export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

// Specific procedure types
export type SendMessageInput = RouterInput['sendMessage']
export type SendMessageOutput = RouterOutput['sendMessage']
export type ProcessElementsInput = RouterInput['processElements']
export type ProcessElementsOutput = RouterOutput['processElements']

// Re-export types from schemas (single source of truth)
export type {
  ElementData,
  PageInfo,
  SendMessage,
  SendMessageResponse,
  ElementIdentifier,
  SaveImageRequest,
  SaveImageResponse
} from './schemas'