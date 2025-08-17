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

interface ServerInstance {
  app: Express
  server: Server
  wss: WebSocketServer
  port: number
}

function setupRoutes(app: Express): void {
  app.get('/inspector-toolbar.js', (req, res) => {
    try {
      const filePath = path.join(__dirname, '..', 'res', 'inspector-toolbar.js')
      const fileContent = fs.readFileSync(filePath, 'utf8')

      res.setHeader('Content-Type', 'application/javascript')

      if (req.query.autoInject !== undefined) {
        const host = `${req.protocol}://${req.get('host')}`
        const cwd = req.query.cwd ? String(req.query.cwd) : ''
        const injectionCode = `
const toolbar = document.createElement('inspector-toolbar');
toolbar.setAttribute('ai-endpoint', '${host}');
${cwd ? `toolbar.setAttribute('cwd', '${cwd}');` : ''}
document.body.prepend(toolbar);
`
        res.send(fileContent + injectionCode)
      } else {
        res.send(fileContent)
      }
    } catch (error) {
      console.error('Error reading inspector-toolbar.js:', error)
      res.status(404).send('File not found')
    }
  })
}

export async function startServer(port: number): Promise<ServerInstance> {
  const app = express()
  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  
  app.use(express.json({ limit: '10mb' }))
  
  setupRoutes(app)
  
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  )
  
  const server = await listen(app, port)
  
  const wss = new WebSocketServer({
    server,
    path: '/trpc',
  })
  
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: createWSSContext,
  })
  
  wss.on('connection', (ws) => {
    console.log(`WebSocket client connected (total: ${wss.clients.size})`)
    ws.on('error', console.error)
    ws.on('close', () => {
      console.log(`WebSocket client disconnected (total: ${wss.clients.size})`)
    })
  })
  
  process.on('SIGTERM', () => {
    handler.broadcastReconnectNotification()
    wss.close()
  })
  
  return { app, server, wss, port }
}

export async function stopServer(serverInstance: ServerInstance): Promise<void> {
  return new Promise((resolve, reject) => {
    serverInstance.wss.close((err) => {
      if (err) console.error('Error closing WebSocket server:', err)
    })
    
    serverInstance.server.close((error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
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

function listen(app: Express, port: number): Promise<Server> {
  return new Promise(async (resolve, reject) => {
    const isPortAvailable = await checkPortAvailable(port)
    
    if (!isPortAvailable) {
      reject(new Error(`Port ${port} is already in use. Please choose a different port.`))
      return
    }
    
    const server = app.listen(port, () => resolve(server))
    server.on('error', (error: any) => {
      reject(error)
    })
  })
}