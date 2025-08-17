import { startServer, stopServer } from './trpc-server'

interface ServerInstance {
  app: any
  server: any
  wss: any
  port: number
}

let serverInstance: ServerInstance | null = null

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7318

  try {
    console.log(`Starting Frontend Context Standalone Server on port ${port}...`)
    serverInstance = await startServer(port)
    console.log(`✅ Server started successfully on http://localhost:${port}`)
    console.log('\nAvailable endpoints:')
    console.log(`  - tRPC Panel: http://localhost:${port}/trpc/panel`)
    console.log(`  - tRPC HTTP: http://localhost:${port}/trpc`)
    console.log(`  - tRPC WebSocket: ws://localhost:${port}/trpc`)
    console.log(`  - Inspector toolbar: http://localhost:${port}/inspector-toolbar.js`)
    console.log('\nTo integrate with your frontend, add:')
    console.log(`  <script src="http://localhost:${port}/inspector-toolbar.js?autoInject"></script>`)
    console.log(`  <script src="http://localhost:${port}/inspector-toolbar.js?autoInject&cwd=/path/to/your/project"></script>`)
    console.log('\nPress Ctrl+C to stop the server')
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down server...')
  if (serverInstance) {
    try {
      await stopServer(serverInstance)
      console.log('Server stopped successfully')
    } catch (error) {
      console.error('Error stopping server:', error)
    }
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  if (serverInstance) {
    await stopServer(serverInstance)
  }
  process.exit(0)
})

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})