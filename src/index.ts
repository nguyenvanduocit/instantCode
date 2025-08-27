#!/usr/bin/env node

import { startServer, stopServer, type ServerInstance } from './trpc-server'
import { execSync } from 'child_process'

let serverInstance: ServerInstance | null = null
let isShuttingDown = false

// CLI argument parsing
const args = process.argv.slice(2)
const helpFlag = args.includes('--help') || args.includes('-h')
const versionFlag = args.includes('--version') || args.includes('-v')
const mockFlag = args.includes('--mock') || args.includes('-m')
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
  -m, --mock                    Enable mock mode (skip Claude Code, use sample responses)
  -V, --verbose                 Enable verbose logging
  -h, --help                    Show this help message
  -v, --version                 Show version number

Examples:
  bunx instantcode                    # Start on localhost:7318
  bunx instantcode --port 8080        # Start on port 8080
  bunx instantcode --listen 0.0.0.0   # Listen on all interfaces
  bunx instantcode --public-address https://ai.example.com  # Use with reverse proxy
  bunx instantcode --mock             # Start in mock mode
  bunx instantcode --verbose          # Start with verbose logging
  
  # Use directly from GitHub:
  bunx github:nguyenvanduocit/instantCode

Getting Started:
  1. Run this command to start the server
  2. Add this script tag to your webpage:
     <script src="http://localhost:7318/inspector-toolbar.js"></script>
  3. Refresh your page and start inspecting elements!

Learn more: https://github.com/nguyenvanduocit/instantCode
`)
  process.exit(0)
}

if (versionFlag) {
  console.log('InstantCode v1.0.0')
  process.exit(0)
}

// Parse port, addresses, verbose, and mock settings from CLI args
let port = 7318
let listenAddress = 'localhost'
let publicAddress = ''
const isVerbose = verboseFlag || process.env.VERBOSE === 'true'
const isMock = mockFlag

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
  publicAddress = `http://${listenAddress === '0.0.0.0' ? 'localhost' : listenAddress}:${port}`
}

function checkClaudeCodeInstallation(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe' })
    return true
  } catch (error) {
    return false
  }
}

function showClaudeCodeInstallationInstructions(): void {
  console.log('')
  console.log('❌ Claude Code is not installed or not available in PATH')
  console.log('')
  console.log('🔧 Installation Instructions:')
  console.log('')
  console.log('Option 2 - Install globally with Bun:')
  console.log('  bun install -g @anthropic-ai/claude-code')
  console.log('')
  console.log('After installation, verify with:')
  console.log('  claude --version')
  console.log('')
  console.log('📚 For more installation options and troubleshooting:')
  console.log('  https://docs.anthropic.com/en/docs/claude-code')
  console.log('')
}

async function main() {
  try {
    // Check if Claude Code is installed (skip in mock mode)
    if (!isMock) {
      if (!checkClaudeCodeInstallation()) {
        showClaudeCodeInstallationInstructions()
        process.exit(1)
      }
    } else {
      console.log('🧪 Starting in MOCK mode - skipping Claude Code check')
    }

    serverInstance = await startServer(port, listenAddress, publicAddress, isVerbose, isMock)
    console.log(`✅ Server listening on ${listenAddress}:${port}`)
    console.log(`🌐 Public address: ${publicAddress}`)
    console.log(`📋 Add to your webpage: <script src="${publicAddress}/inspector-toolbar.js"></script>`)
    console.log(`⏹️  Ctrl+C to stop`)
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