#!/usr/bin/env node

import { startServer, stopServer, type ServerInstance } from './ws-server'
import { createServer } from 'net'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Read version from package.json
function getVersion(): string {
  // Try multiple possible locations for package.json
  const possiblePaths = [
    join(__dirname, '..', 'package.json'),  // From dist/
    join(__dirname, 'package.json'),        // Same directory
    join(process.cwd(), 'package.json'),    // Current working directory
  ]

  for (const pkgPath of possiblePaths) {
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        if (pkg.name === 'instantcode' && pkg.version) {
          return pkg.version
        }
      } catch {
        continue
      }
    }
  }

  return '0.0.0' // Fallback version
}

const VERSION = getVersion()

let serverInstance: ServerInstance | null = null
let isShuttingDown = false

// CLI argument parsing
const args = process.argv.slice(2)
const helpFlag = args.includes('--help') || args.includes('-h')
const versionFlag = args.includes('--version') || args.includes('-v')
const verboseFlag = args.includes('--verbose') || args.includes('-V')
const portFlag = args.findIndex(arg => arg === '--port' || arg === '-p')
const listenFlag = args.findIndex(arg => arg === '--listen' || arg === '-l')
const publicAddressFlag = args.findIndex(arg => arg === '--public-address' || arg === '-a')

if (helpFlag) {
  console.log(`
InstantCode - AI-powered web inspection tool

Usage:
  bunx instantcode [options]
  npx instantcode [options]

Options:
  -p, --port <number>           Port to run the server on (default: 7318)
  -l, --listen <address>        Address to bind server to (default: localhost)
  -a, --public-address <url>    Public URL for reverse proxy (default: http://localhost:7318)
  -V, --verbose                 Enable verbose logging
  -h, --help                    Show this help message
  -v, --version                 Show version number

Examples:
  bunx instantcode                    # Start on localhost:7318
  bunx instantcode --port 8080        # Start on port 8080
  bunx instantcode --listen 0.0.0.0   # Listen on all interfaces
  bunx instantcode --public-address https://ai.example.com  # Use with reverse proxy
  bunx instantcode --verbose          # Start with verbose logging
  
  # Use directly from GitHub:
  bunx github:nguyenvanduocit/instantCode

Getting Started:
  1. Run this command to start the server
  2. Add the MCP config to ~/.claude/settings.json (shown on startup)
  3. For non-Vite projects, add to your webpage:
     <script src="http://localhost:7318/annotator-toolbar.js"></script>

Learn more: https://github.com/nguyenvanduocit/instantCode
`)
  process.exit(0)
}

if (versionFlag) {
  console.log(`InstantCode v${VERSION}`)
  process.exit(0)
}

// Parse port, addresses, and verbose settings from CLI args
let port = 7318
let listenAddress = 'localhost'
let publicAddress = ''
const isVerbose = verboseFlag || process.env.VERBOSE === 'true'

// Check environment variables for port override
if (process.env.INSPECTOR_PORT) {
  const envPort = parseInt(process.env.INSPECTOR_PORT, 10)
  if (!isNaN(envPort) && envPort > 0 && envPort < 65536) {
    port = envPort
  }
} else if (process.env.PORT) {
  const envPort = parseInt(process.env.PORT, 10)
  if (!isNaN(envPort) && envPort > 0 && envPort < 65536) {
    port = envPort
  }
}

// CLI arguments override environment variables
if (portFlag !== -1 && args[portFlag + 1]) {
  const parsedPort = parseInt(args[portFlag + 1], 10)
  if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
    port = parsedPort
  } else {
    console.error('❌ Invalid port number. Please provide a number between 1 and 65535.')
    process.exit(1)
  }
}

// Parse listen address
if (listenFlag !== -1 && args[listenFlag + 1]) {
  listenAddress = args[listenFlag + 1]
  // Validate listen address
  if (!['localhost', '127.0.0.1', '0.0.0.0', '::1', '::'].includes(listenAddress)) {
    console.error('❌ Invalid listen address. Use localhost, 127.0.0.1, 0.0.0.0, ::1, or ::')
    process.exit(1)
  }
}

// Parse public address
if (publicAddressFlag !== -1 && args[publicAddressFlag + 1]) {
  publicAddress = args[publicAddressFlag + 1]
  // Basic URL validation
  try {
    new URL(publicAddress)
  } catch (error) {
    console.error('❌ Invalid public address. Please provide a valid URL (e.g., https://ai.example.com)')
    process.exit(1)
  }
}

// Default public address if not specified
if (!publicAddress) {
  publicAddress = `http://${listenAddress}:${port}`
}

function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(true) // Other errors, assume port is available
      }
    })
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.listen(port)
  })
}

async function main() {
  try {
    // Check port availability before starting server
    const isPortAvailable = await checkPortAvailability(port)
    if (!isPortAvailable) {
      console.error(`❌ Port ${port} is already in use. Please choose a different port using --port flag.`)
      process.exit(1)
    }

    serverInstance = await startServer(port, listenAddress, publicAddress, isVerbose)

    // Show MCP configuration for Claude Code
    console.log(`✅ InstantCode server started`)
    console.log(``)
    console.log(`📋 Add to Claude Code settings (~/.claude/settings.json):`)
    console.log(``)
    console.log(`  "mcpServers": {`)
    console.log(`    "instantcode": {`)
    console.log(`      "url": "${publicAddress}/mcp"`)
    console.log(`    }`)
    console.log(`  }`)
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
async function gracefulShutdown() {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true
  
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
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})