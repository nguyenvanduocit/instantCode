import type { Express, Request, Response } from 'express'
import type { Server } from 'node:http'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as os from 'node:os'
import * as path from 'node:path'
import cors from 'cors'
import express from 'express'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { createRpcServer, type RpcServer } from './rpc/server.generated'
import { isRpcError } from './rpc/types.generated'
import type { BrowserSession } from './rpc/define'
import { createLogger, type Logger } from './utils/logger'

export interface ServerInstance {
  app: Express
  server: Server
  io: SocketIOServer
  port: number
  listenAddress: string
  publicAddress: string
  verbose: boolean
}

export interface BrowserConnection {
  socket: Socket
  rpc: RpcServer
  session: BrowserSession
}

// Session state management
const sessions = new Map<string, BrowserConnection>()
let activeSessionId: string | null = null

function generateSessionId(): string {
  return crypto.randomUUID()
}

export function getActiveBrowserConnection(): BrowserConnection | null {
  if (!activeSessionId) {
    // Auto-select first available session
    const firstSession = sessions.values().next().value
    if (firstSession) {
      activeSessionId = firstSession.session.id
      return firstSession
    }
    return null
  }
  return sessions.get(activeSessionId) || null
}

export function setActiveSession(sessionId: string): boolean {
  if (sessions.has(sessionId)) {
    activeSessionId = sessionId
    return true
  }
  return false
}

export function getAllSessions(): BrowserSession[] {
  return Array.from(sessions.values()).map(conn => conn.session)
}

// Export RPC client accessor for MCP server
export function getActiveRpc(): RpcServer | null {
  const conn = getActiveBrowserConnection()
  return conn?.rpc || null
}

// Screenshot cache directory
function getScreenshotCacheDir(): string {
  const cacheDir = path.join(os.tmpdir(), 'instantcode-screenshots')
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

function saveScreenshot(base64: string, format: 'png' | 'jpeg'): string {
  const cacheDir = getScreenshotCacheDir()
  const timestamp = Date.now()
  const filename = `screenshot-${timestamp}.${format}`
  const filePath = path.join(cacheDir, filename)

  const buffer = Buffer.from(base64, 'base64')
  fs.writeFileSync(filePath, buffer)

  return filePath
}

function setupRoutes(app: Express, publicAddress: string, verbose: boolean): void {
  app.get('/annotator-toolbar.js', (_req, res) => {
    try {
      const isProduction = process.env.NODE_ENV === 'production'
      const filePath = isProduction
        ? path.join(__dirname, 'annotator-toolbar.js')
        : path.join(__dirname, '..', 'dist', 'annotator-toolbar.js')

      const fileContent = fs.readFileSync(filePath, 'utf8')

      res.setHeader('Content-Type', 'application/javascript')

      const wsUrl = publicAddress.replace('http://', 'ws://').replace('https://', 'wss://')
      const injectionCode = `
const toolbar = document.createElement('annotator-toolbar');
toolbar.setAttribute('ws-endpoint', '${wsUrl}');
toolbar.setAttribute('verbose', '${verbose}');
document.body.prepend(toolbar);
`
      res.send(fileContent + injectionCode)
    } catch (error) {
      console.error('Error reading annotator-toolbar.js:', error)
      res.status(404).send('File not found')
    }
  })

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      sessions: sessions.size,
      activeSession: activeSessionId,
    })
  })

  // API endpoints for MCP server to query
  app.get('/api/sessions', (_req, res) => {
    res.json(getAllSessions())
  })

  app.post('/api/sessions/active', (req, res) => {
    const { sessionId } = req.body
    if (setActiveSession(sessionId)) {
      res.json({ success: true })
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  })
}

function setupSocketIO(io: SocketIOServer, logger: Logger): void {
  io.on('connection', (socket: Socket) => {
    const sessionId = generateSessionId()

    const session: BrowserSession = {
      id: sessionId,
      url: '',
      title: '',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    }

    // Create RPC server for this connection
    const rpc = createRpcServer(socket)

    sessions.set(sessionId, { socket, rpc, session })

    // Auto-select as active if no active session
    if (!activeSessionId) {
      activeSessionId = sessionId
    }

    logger.log(`Browser connected: ${sessionId} (total: ${sessions.size})`)

    // Register server-side RPC handlers
    rpc.handle.getSessions(async () => {
      return getAllSessions()
    })

    rpc.handle.setActiveSession(async (targetSessionId) => {
      return setActiveSession(targetSessionId)
    })

    rpc.handle.ping(async () => {
      return 'pong'
    })

    rpc.handle.rpcError((error) => {
      logger.error('RPC Error:', error)
    })

    // Send session ID to browser
    socket.emit('connected', { sessionId })

    // Update session info when browser reports page context
    socket.on('pageContextChanged', (context: { url: string; title: string }) => {
      session.url = context.url
      session.title = context.title
      session.lastActivity = Date.now()
    })

    socket.on('disconnect', () => {
      rpc.dispose()
      sessions.delete(sessionId)
      if (activeSessionId === sessionId) {
        // Switch to another session if available
        activeSessionId = sessions.keys().next().value || null
      }
      logger.log(`Browser disconnected: ${sessionId} (total: ${sessions.size})`)
    })
  })
}

// MCP Server setup
function createMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'instantcode',
    version: '1.0.0',
  })

  // Tool: annotator_list_sessions
  mcp.tool(
    'annotator_list_sessions',
    'List all connected browser sessions',
    {},
    async () => {
      const sessionList = getAllSessions()
      return {
        content: [{
          type: 'text',
          text: sessionList.length > 0
            ? JSON.stringify(sessionList, null, 2)
            : 'No browser sessions connected. Add the annotator script to your webpage.'
        }]
      }
    }
  )

  // Tool: annotator_set_active_session
  mcp.tool(
    'annotator_set_active_session',
    'Set the active browser session by ID',
    { sessionId: z.string().describe('The session ID to set as active') },
    async ({ sessionId }) => {
      const success = setActiveSession(sessionId)
      return {
        content: [{
          type: 'text',
          text: success ? `Active session set to: ${sessionId}` : `Session not found: ${sessionId}`
        }]
      }
    }
  )

  // Tool: annotator_get_page_context
  mcp.tool(
    'annotator_get_page_context',
    'Get current page context from the active browser session (URL, title, selection count)',
    {},
    async () => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.getPageContext(10000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  // Tool: annotator_select_element
  mcp.tool(
    'annotator_select_element',
    'Enter element inspection mode or select element by CSS/XPath selector',
    {
      mode: z.enum(['inspect', 'selector']).default('inspect').describe('Selection mode'),
      selector: z.string().optional().describe('CSS or XPath selector (required when mode is "selector")'),
      selectorType: z.enum(['css', 'xpath']).default('css').describe('Type of selector'),
    },
    async ({ mode, selector, selectorType }) => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.triggerSelection(mode, selector, selectorType, 10000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      return {
        content: [{
          type: 'text',
          text: result.success
            ? `Selection triggered. ${result.count} element(s) selected.`
            : `Selection failed: ${result.error}`
        }]
      }
    }
  )

  // Tool: annotator_get_selected_elements
  mcp.tool(
    'annotator_get_selected_elements',
    'Get data about currently selected elements in the browser',
    {},
    async () => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.getSelectedElements(15000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      return {
        content: [{
          type: 'text',
          text: result.length > 0
            ? JSON.stringify(result, null, 2)
            : 'No elements selected. Use annotator_select_element first.'
        }]
      }
    }
  )

  // Tool: annotator_capture_screenshot
  mcp.tool(
    'annotator_capture_screenshot',
    'Capture a screenshot of the viewport or a specific element. Returns the file path where the screenshot is saved.',
    {
      type: z.enum(['viewport', 'element']).default('viewport').describe('Type of screenshot'),
      selector: z.string().optional().describe('CSS selector for element screenshot'),
      format: z.enum(['png', 'jpeg']).default('png').describe('Image format'),
      quality: z.number().min(0).max(1).default(0.8).describe('Image quality (0-1)'),
    },
    async ({ type, selector, format, quality }) => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.captureScreenshot(type, selector, format, quality, 30000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      if (result.success && result.base64) {
        const filePath = saveScreenshot(result.base64, format)
        return { content: [{ type: 'text', text: filePath }] }
      } else {
        return { content: [{ type: 'text', text: `Screenshot failed: ${result.error}` }] }
      }
    }
  )

  // Tool: annotator_clear_selection
  mcp.tool(
    'annotator_clear_selection',
    'Clear all selected elements in the browser',
    {},
    async () => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      rpc.client.clearSelection()
      return { content: [{ type: 'text', text: 'Selection cleared.' }] }
    }
  )

  // Tool: annotator_inject_css
  mcp.tool(
    'annotator_inject_css',
    'Inject CSS styles into the page',
    {
      css: z.string().describe('CSS code to inject into the page'),
    },
    async ({ css }) => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.injectCSS(css, 10000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      return {
        content: [{
          type: 'text',
          text: result.success
            ? 'CSS injected successfully.'
            : `CSS injection failed: ${result.error}`
        }]
      }
    }
  )

  // Tool: annotator_inject_js
  mcp.tool(
    'annotator_inject_js',
    'Inject and execute JavaScript code in the page context',
    {
      code: z.string().describe('JavaScript code to execute in the page'),
    },
    async ({ code }) => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.injectJS(code, 15000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      if (result.success) {
        const output = result.result !== undefined
          ? `Result: ${JSON.stringify(result.result, null, 2)}`
          : 'JavaScript executed successfully (no return value).'
        return { content: [{ type: 'text', text: output }] }
      } else {
        return { content: [{ type: 'text', text: `JavaScript execution failed: ${result.error}` }] }
      }
    }
  )

  // Tool: annotator_get_console
  mcp.tool(
    'annotator_get_console',
    'Get console logs captured from the browser',
    {
      clear: z.boolean().default(false).describe('Clear the console buffer after reading'),
    },
    async ({ clear }) => {
      const rpc = getActiveRpc()
      if (!rpc) {
        return { content: [{ type: 'text', text: 'No browser connected' }] }
      }

      const result = await rpc.client.getConsole(clear, 15000)
      if (isRpcError(result)) {
        return { content: [{ type: 'text', text: `Error: ${result.message}` }] }
      }

      return {
        content: [{
          type: 'text',
          text: result.length > 0
            ? JSON.stringify(result, null, 2)
            : 'No console logs captured.'
        }]
      }
    }
  )

  return mcp
}

// MCP transport management
const mcpTransports = new Map<string, StreamableHTTPServerTransport>()

function setupMcpRoutes(app: Express, logger: Logger): void {
  const mcp = createMcpServer()

  // MCP endpoint - handles all MCP requests
  app.all('/mcp', async (req: Request, res: Response) => {
    // Get or create transport for this session
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport

    if (sessionId && mcpTransports.has(sessionId)) {
      // Existing valid session
      transport = mcpTransports.get(sessionId)!
    } else {
      // New session OR invalid session ID (server restarted)
      // In both cases, create a fresh session
      if (sessionId) {
        logger.log(`MCP session not found (server may have restarted): ${sessionId}, creating new session`)
        // Remove the invalid session ID so transport creates a new one
        delete req.headers['mcp-session-id']
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      })

      // Connect transport to MCP server
      await mcp.connect(transport)
    }

    try {
      await transport.handleRequest(req, res, req.body)

      // Store transport by session ID after request is handled
      const newSessionId = res.getHeader('mcp-session-id') as string | undefined
      if (newSessionId && !mcpTransports.has(newSessionId)) {
        mcpTransports.set(newSessionId, transport)
        logger.log(`MCP session created: ${newSessionId}`)

        // Register cleanup handler with the known session ID
        transport.onclose = () => {
          mcpTransports.delete(newSessionId)
          logger.log(`MCP session closed: ${newSessionId}`)
        }
      }
    } catch (error) {
      logger.error('MCP request error:', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'MCP request failed' })
      }
    }
  })

  // MCP capabilities endpoint (optional, for discovery)
  app.get('/mcp/info', (_req: Request, res: Response) => {
    res.json({
      name: 'instantcode',
      version: '1.0.0',
      capabilities: {
        tools: true,
      },
      endpoint: '/mcp',
    })
  })
}

export async function startServer(
  port: number,
  listenAddress: string,
  publicAddress: string,
  verbose = false
): Promise<ServerInstance> {
  const logger = createLogger(verbose)
  const app = express()

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))

  app.use(express.json({ limit: '10mb' }))

  setupRoutes(app, publicAddress, verbose)
  setupMcpRoutes(app, logger)

  const server = await listen(app, port, listenAddress)

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  })

  setupSocketIO(io, logger)

  return { app, server, io, port, listenAddress, publicAddress, verbose }
}

export async function stopServer(serverInstance: ServerInstance): Promise<void> {
  return new Promise((resolve, reject) => {
    let ioComplete = false
    let serverComplete = false
    let rejected = false

    function checkCompletion() {
      if (ioComplete && serverComplete && !rejected) {
        resolve()
      }
    }

    // Dispose all RPC instances and close connections
    sessions.forEach(({ rpc }) => {
      rpc.dispose()
    })
    sessions.clear()
    activeSessionId = null

    serverInstance.io.close((err) => {
      if (err && !rejected && serverInstance.verbose) {
        console.error('Error closing Socket.IO server:', err)
      }
      ioComplete = true
      checkCompletion()
    })

    serverInstance.server.close((error) => {
      if (error && !rejected) {
        rejected = true
        reject(error)
      } else {
        serverComplete = true
        checkCompletion()
      }
    })
  })
}

async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(true)
    }, 1000)

    socket.on('connect', () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve(false)
    })

    socket.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout)
      if (err.code === 'ECONNREFUSED') {
        resolve(true)
      } else {
        resolve(false)
      }
    })

    socket.connect(port, 'localhost')
  })
}

function listen(app: Express, port: number, listenAddress: string): Promise<Server> {
  return new Promise(async (resolve, reject) => {
    const isPortAvailable = await checkPortAvailable(port)

    if (!isPortAvailable) {
      reject(new Error(`Port ${port} is already in use. Please choose a different port.`))
      return
    }

    const server = app.listen(port, listenAddress, () => resolve(server))
    server.on('error', (error) => {
      reject(error)
    })
  })
}
