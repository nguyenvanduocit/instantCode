import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'

/**
 * Inner context - always available in procedures
 * Used for shared data like database connections
 */
export async function createContextInner() {
  return {
    // Add shared resources here (db connections, etc.)
  }
}

/**
 * Context for Express HTTP requests
 */
export async function createContext(opts: CreateExpressContextOptions) {
  const inner = await createContextInner()
  
  return {
    ...inner,
    req: opts.req,
    res: opts.res,
  }
}

/**
 * Context for WebSocket connections
 */
export async function createWSSContext(opts: CreateWSSContextFnOptions) {
  const inner = await createContextInner()
  
  return {
    ...inner,
    req: opts.req,
  }
}

export type Context = Awaited<ReturnType<typeof createContextInner>>