#!/usr/bin/env node

import { startServer, stopServer } from './trpc-server'
import { execSync } from 'child_process'

interface ServerInstance {
  app: any
  server: any
  wss: any
  port: number
}

let serverInstance: ServerInstance | null = null
let isShuttingDown = false

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

// Parse port
let port = 7318
if (portFlag !== -1 && args[portFlag + 1]) {
  const parsedPort = parseInt(args[portFlag + 1], 10)
  if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
    port = parsedPort
  } else {
    console.error('❌ Invalid port number. Please provide a number between 1 and 65535.')
    process.exit(1)
  }
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
    // Check if Claude Code is installed
    if (!checkClaudeCodeInstallation()) {
      showClaudeCodeInstallationInstructions()
      process.exit(1)
    }

    serverInstance = await startServer(port)
    console.log(`✅ Server running on http://localhost:${port}`)
    console.log(`📋 Add to your webpage: <script src="http://localhost:${port}/inspector-toolbar.js"></script>`)
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