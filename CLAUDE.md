# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- **Run development server**: `bun src/index.ts` (User will manually run server - AI should not start/stop the server)
- **Type checking**: `bunx tsc --noEmit`
- **Build for production**: `bun run build` (TypeScript compilation)
- **Build inspector toolbar**: `bun run build:inspector` (Browser component compilation)
- **Build all**: `bun run build:all` (Both server and inspector builds)
- **Start production server**: `bun dist/index.js` (requires build first)
- **Clean build artifacts**: `bun run clean`

### Testing & Validation
- **Type check without building**: `bunx tsc --noEmit`
- **Lint and format**: Use `bun run typecheck` to verify TypeScript compilation
- **Check port availability**: The server automatically checks if port 7318 is available before starting

## Architecture

### Core Server Components
The server uses tRPC for type-safe client-server communication:

1. **Entry Point (src/index.ts)**: Manages server lifecycle, port checking, and graceful shutdown handling
2. **tRPC Server (src/trpc-server.ts)**: Configures Express middleware, WebSocket support, and serves the inspector toolbar with auto-injection capability
3. **tRPC Router (src/trpc/router.ts)**: Defines type-safe procedures for health checks, message processing, and element analysis
4. **Context (src/trpc/context.ts)**: Provides request/response context for tRPC procedures

### Key Architectural Decisions

**tRPC Architecture**: The server uses tRPC for type-safe RPC communication with both HTTP and WebSocket transports. This provides:
- Type-safe API contracts between client and server
- Real-time subscriptions via WebSocket for message streaming
- Automatic serialization with SuperJSON for complex data types
- Built-in error handling and validation with Zod schemas

**Claude Code Integration**: The server integrates with @anthropic-ai/claude-code for processing user requests:
- Receives structured element context and user prompts
- Processes requests using Claude Code's query API with configurable options
- Streams real-time responses back to the browser via WebSocket subscriptions

**Auto-Injection Pattern**: The `/inspector-toolbar.js` endpoint can automatically inject itself into existing scripts by detecting `autoInject=true` parameter, enabling seamless integration without manual script modifications. Supports optional `cwd` parameter for project context.

**Component Extraction Flow**:
1. Browser sends element context and user prompts via tRPC subscription
2. Server extracts component file locations from framework-specific attributes
3. Formatted prompts are processed with Claude Code using the extracted context
4. Real-time responses are streamed back to the browser with full type safety

### Browser Component Architecture
The inspector toolbar (res/inspector-toolbar.js) is a self-contained Web Component that:
- Uses Shadow DOM for style isolation
- Detects framework types (Vue, React, Angular, Svelte)
- Extracts component file locations from framework-specific attributes
- Manages element selection and highlighting states
- Communicates with server using tRPC client via WebSocket and HTTP

### Port Management
Default port 7318 with automatic availability checking. Server exits gracefully if port is occupied.

## Project Structure Context

**src/**: TypeScript source files - all server logic lives here
  - **trpc/**: tRPC router definitions and context setup
  - **index.ts**: Entry point managing server lifecycle
  - **trpc-server.ts**: Express + tRPC + WebSocket server configuration
  - **inspector-toolbar.ts**: Browser component source (compiled to res/inspector-toolbar.js)
  - **inspector/**: Simplified browser component architecture
    - **managers.ts**: State management, AI communication, element selection, and inspection
    - **detectors.ts**: Framework detection logic (React, Vue, Angular, Svelte)
    - **events.ts**: Event system using mitt for component communication
    - **ui.ts**: UI rendering, styling, and message formatting
  - **utils/**: Common utilities for HTML manipulation and XPath generation
  - **shared/**: Common schemas and types used by both server and client
**res/**: Static resources including the browser-side inspector component
  - **inspector-toolbar.js**: Compiled Web Component with tRPC client integration
**dist/**: Generated JavaScript output for server (created by build, ignored by git)
**build-inspector.js**: esbuild configuration for compiling the browser component

## Build System

The project uses a dual build system:
- **Server**: TypeScript compilation via `tsc` for Node.js execution
- **Browser Component**: esbuild compilation of inspector-toolbar.ts to a browser-compatible IIFE bundle

The project uses Bun exclusively for both development and production, leveraging its fast TypeScript execution and built-in tooling.

## Environment Variables

- **PORT**: Server port (default: 7318)
- **NODE_ENV**: Environment mode (affects error handling and logging)

## Integration Usage

To integrate the inspector toolbar with a frontend application:
```html
<!-- Auto-injection (automatically detects project directory) -->
<script src="http://localhost:7318/inspector-toolbar.js?autoInject"></script>

<!-- Manual integration -->
<script src="http://localhost:7318/inspector-toolbar.js"></script>
<script>
  const toolbar = document.createElement('inspector-toolbar');
  toolbar.setAttribute('ai-endpoint', 'http://localhost:7318');
  toolbar.setAttribute('cwd', '/path/to/project'); // Optional: override auto-detected path
  document.body.prepend(toolbar);
</script>
```

## Key Development Notes

- **TypeScript configuration**: Server code excludes `inspector-toolbar.ts` from compilation (handled by esbuild)
- **Schema definitions**: All tRPC schemas and types are centralized in `src/shared/schemas.ts` for consistency
- **Session management**: Claude Code sessions can be resumed using session IDs for continuous conversations
- **Component detection**: Automatically extracts file locations from framework-specific DOM attributes
- **Error handling**: Comprehensive error handling with graceful degradation and user feedback