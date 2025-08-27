import type { Express } from 'express'
import type { Server } from 'node:http'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as path from 'node:path'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import cors from 'cors'
import express from 'express'
import { WebSocketServer } from 'ws'
import { createContext, createWSSContext } from './trpc/context'
import { appRouter } from './trpc/router'

export interface ServerInstance {
  app: Express
  server: Server
  wss: WebSocketServer
  port: number
  listenAddress: string
  publicAddress: string
  verbose: boolean
  isMock: boolean
}

function setupRoutes(app: Express, publicAddress: string, verbose: boolean): void {
  app.get('/inspector-toolbar.js', (req, res) => {
    try {
      // In production, the inspector-toolbar.js should be in the same folder as the built server
      const isProduction = process.env.NODE_ENV === 'production'
      const filePath = isProduction
        ? path.join(__dirname, 'inspector-toolbar.js')  // Same folder as built server (dist/)
        : path.join(__dirname, '..', 'dist', 'inspector-toolbar.js')  // Development: use res/ folder

      const fileContent = fs.readFileSync(filePath, 'utf8')

      res.setHeader('Content-Type', 'application/javascript')

      // Use public address for client connections
      const cwdArgument = req.query.cwd ? String(req.query.cwd) : ''
      const cwd = cwdArgument || process.cwd()
      const injectionCode = `
const toolbar = document.createElement('inspector-toolbar');
toolbar.setAttribute('ai-endpoint', '${publicAddress}');
toolbar.setAttribute('cwd', '${cwd}');
toolbar.setAttribute('verbose', '${verbose}');
document.body.prepend(toolbar);
`
      res.send(fileContent + injectionCode)
    } catch (error) {
      console.error('Error reading inspector-toolbar.js:', error)
      res.status(404).send('File not found')
    }
  })
}

export async function startServer(
  port: number,
  listenAddress: string,
  publicAddress: string,
  verbose = false,
  isMock = false
): Promise<ServerInstance> {
  const app = express()
  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  
  app.use(express.json({ limit: '10mb' }))
  
  setupRoutes(app, publicAddress, verbose)
  
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createContext(opts, verbose, isMock),
    })
  )
  
  const server = await listen(app, port, listenAddress)
  
  const wss = new WebSocketServer({
    server,
    path: '/trpc',
  })
  
  applyWSSHandler({
    wss,
    router: appRouter,
    createContext: (opts) => createWSSContext(opts, verbose, isMock),
  })
  
  wss.on('connection', (ws) => {
    if (verbose) console.log(`WebSocket client connected (total: ${wss.clients.size})`)
    ws.on('error', verbose ? console.error : () => {})
    ws.on('close', () => {
      if (verbose) console.log(`WebSocket client disconnected (total: ${wss.clients.size})`)
    })
  })
  
  
  return { app, server, wss, port, listenAddress, publicAddress, verbose, isMock }
}

export async function stopServer(serverInstance: ServerInstance): Promise<void> {
  return new Promise((resolve, reject) => {
    let wssComplete = false
    let serverComplete = false
    let rejected = false
    
    function checkCompletion() {
      if (wssComplete && serverComplete && !rejected) {
        resolve()
      }
    }
    
    // First, terminate all active WebSocket connections
    serverInstance.wss.clients.forEach((ws) => {
      ws.terminate()
    })
    
    // Close WebSocket server
    serverInstance.wss.close((err) => {
      if (err && !rejected && serverInstance.verbose) {
        console.error('Error closing WebSocket server:', err)
      }
      wssComplete = true
      checkCompletion()
    })
    
    // Close HTTP server
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
    
    socket.on('error', (err: any) => {
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
    server.on('error', (error: any) => {
      reject(error)
    })
  })
}