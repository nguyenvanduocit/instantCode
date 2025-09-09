# Technology Stack

## Architecture Overview

InstantCode follows a dual-architecture pattern:
- **Server Component** - Node.js/Bun backend providing AI integration and WebSocket communication
- **Client Component** - Browser-based inspector toolbar built with Lit web components
- **Integration Layer** - Vite plugin for seamless development workflow integration

## Primary Technologies

### Backend Runtime
- **Bun** - Primary runtime for development and production (preferred over Node.js)
- **Node.js 18+** - Fallback runtime support
- **TypeScript** - Full type safety across server and client code

### Server Framework
- **Express.js 5.x** - HTTP server with middleware support
- **tRPC 11.x** - Type-safe API layer with real-time subscriptions
- **WebSocket (ws)** - Real-time communication between browser and server
- **CORS** - Cross-origin request handling for development environments

### Frontend Components
- **Lit 3.x** - Web components framework for inspector toolbar UI
- **Optimal Select** - DOM element selection and CSS selector generation
- **WebSocket Client** - Real-time communication with server

### AI Integration
- **@anthropic-ai/claude-code** - Claude Code CLI integration for AI assistance
- **Child Process Spawning** - Server manages Claude Code subprocess execution

### Build Tools and Bundling
- **ESBuild** - Fast TypeScript compilation and bundling
- **Vite 6.x** - Development server integration and plugin architecture
- **Custom Build Scripts** - Specialized bundling for different output formats

## Development Environment

### Package Management
- **Bun** - Primary package manager (never use npm per project guidelines)
- **Peer Dependencies** - Vite 2.0+ required for plugin functionality

### Common Commands
```bash
# Development
bun dev                    # Start server in development mode
bun run build             # Build all components (server + inspector + plugin + types)

# Individual builds
bun run build:server      # Compile server to dist/index.cjs
bun run build:inspector   # Bundle inspector toolbar to dist/inspector-toolbar.js  
bun run build:vite-plugin # Build Vite plugin to dist/vite-plugin.js
bun run build:types       # Generate TypeScript declarations

# Quality assurance
bun run typecheck         # TypeScript type checking (tsc --noEmit)
```

### TypeScript Configuration
- **Target**: ES2020 with CommonJS modules for Node.js compatibility
- **Strict Mode**: Enabled with additional strictness flags
- **Declaration Files**: Generated for package consumers
- **Source Maps**: Disabled for production builds

## Port Configuration

### Default Ports
- **7318** - Default InstantCode server port
- **Configurable** - Via CLI arguments, environment variables, or plugin options

### Address Binding Options
- **localhost** - Default binding for development
- **0.0.0.0** - All interfaces for container/network deployment
- **Custom addresses** - Support for specific IP binding

### Reverse Proxy Support
- **Public Address Override** - Separate public URL for external access
- **WebSocket Proxying** - Compatible with nginx, Apache, cloud load balancers

## Environment Variables

### Server Configuration
- `INSPECTOR_PORT` - Override default port (alternative to PORT)
- `PORT` - Standard port environment variable
- `INSTANTCODE_MOCK` - Enable mock mode without Claude Code
- `VERBOSE` - Enable detailed logging output
- `NODE_ENV` - Production/development mode detection

### Development Flags
- `--mock` - Simulate AI responses for UI development
- `--verbose` - Detailed console logging
- `--listen` - Custom bind address
- `--public-address` - External URL for reverse proxy scenarios

## Communication Protocols

### HTTP/HTTPS
- **Express Router** - Standard HTTP request handling
- **tRPC HTTP Batch** - Efficient API call batching
- **CORS Enabled** - Wildcard origin support for development

### WebSocket
- **Real-time Subscriptions** - AI response streaming
- **Connection Management** - Automatic reconnection and error handling
- **Session Persistence** - Maintains AI conversation context

### Data Serialization
- **SuperJSON** - Enhanced JSON serialization with type preservation
- **Zod Schemas** - Runtime type validation and parsing

## Framework Detection and Support

### Supported Frameworks
- **React** - Component and prop detection
- **Vue 3** - Composition API and Options API support
- **Angular** - Component and directive recognition
- **Svelte** - Component and store identification
- **Vanilla** - Plain HTML/CSS/JavaScript support

### Detection Mechanisms
- **File Extension Analysis** - .jsx, .vue, .svelte file detection
- **Build Tool Integration** - Vite plugin context awareness
- **Runtime Element Inspection** - DOM structure pattern recognition

## Security Considerations

### Network Security
- **CORS Configuration** - Controlled cross-origin access
- **Port Validation** - Input sanitization for port numbers
- **URL Validation** - Public address format checking

### Process Security
- **Subprocess Management** - Controlled Claude Code execution
- **Graceful Shutdown** - Proper cleanup of child processes
- **Error Isolation** - AI process failures don't crash main server

## Performance Characteristics

### Build Performance
- **ESBuild** - Fast TypeScript compilation
- **Parallel Builds** - Independent component building
- **Incremental Development** - TypeScript watch mode support

### Runtime Performance
- **Lightweight Inspector** - Minimal browser overhead
- **Efficient Communication** - WebSocket reduces polling overhead
- **Process Management** - Single AI process per server instance