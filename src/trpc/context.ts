import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'
import { createLogger } from '../utils/logger'

/**
 * Inner context - always available in procedures
 * Used for shared data like database connections
 */
export async function createContextInner(verbose = false, isMock = false) {
  return {
    verbose,
    isMock,
    logger: createLogger(verbose),
    // Add shared resources here (db connections, etc.)
  }
}

/**
 * Context for Express HTTP requests
 */
export async function createContext(opts: CreateExpressContextOptions, verbose = false, isMock = false) {
  const inner = await createContextInner(verbose, isMock)
  
  return {
    ...inner,
    req: opts.req,
    res: opts.res,
  }
}

/**
 * Context for WebSocket connections
 */
export async function createWSSContext(opts: CreateWSSContextFnOptions, verbose = false, isMock = false) {
  const inner = await createContextInner(verbose, isMock)
  
  return {
    ...inner,
    req: opts.req,
  }
}

export type Context = Awaited<ReturnType<typeof createContextInner>>