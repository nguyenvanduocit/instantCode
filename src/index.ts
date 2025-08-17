#!/usr/bin/env node

import { startServer, stopServer } from './trpc-server'

interface ServerInstance {
  app: any
  server: any
  wss: any
  port: number
}

let serverInstance: ServerInstance | null = null

// CLI argument parsing
const args = process.argv.slice(2)
const helpFlag = args.includes('--help') || args.includes('-h')
const versionFlag = args.includes('--version') || args.includes('-v')
const portFlag = args.findIndex(arg => arg === '--port' || arg === '-p')

if (helpFlag) {
  console.log(`
InstantCode - AI-powered web inspection tool

Usage:
  bunx instantcode [options]
  npx instantcode [options]

Options:
  -p, --port <number>    Port to run the server on (default: 7318)
  -h, --help            Show this help message
  -v, --version         Show version number

Examples:
  bunx instantcode                    # Start on default port 7318
  bunx instantcode --port 8080        # Start on port 8080
  
  # Use directly from GitHub:
  bunx github:nguyenvanduocit/instantCode

Getting Started:
  1. Run this command to start the server
  2. Add this script tag to your webpage:
     <script src="http://localhost:7318/inspector-toolbar.js?autoInject"></script>
  3. Refresh your page and start inspecting elements!

Learn more: https://github.com/nguyenvanduocit/instantCode
`)
  process.exit(0)
}

if (versionFlag) {
  console.log('InstantCode v1.0.0')
  process.exit(0)
}

// Parse port
let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7318
if (portFlag !== -1 && args[portFlag + 1]) {
  const parsedPort = parseInt(args[portFlag + 1], 10)
  if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
    port = parsedPort
  } else {
    console.error('❌ Invalid port number. Please provide a number between 1 and 65535.')
    process.exit(1)
  }
}

async function main() {
  try {
    console.log('🚀 Starting InstantCode server...')
    console.log(`📡 Server will run on port ${port}`)
    console.log('💡 Add this to your webpage to get started:')
    console.log(`   <script src="http://localhost:${port}/inspector-toolbar.js?autoInject"></script>`)
    console.log('')

    serverInstance = await startServer(port)
    console.log(`✅ InstantCode server running on port ${port}`)
    console.log(`🌐 Ready to assist with your frontend development!`)
    console.log(`🔗 Visit any webpage with the script tag to start inspecting`)
    console.log('')
    console.log('Press Ctrl+C to stop the server')
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message)
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