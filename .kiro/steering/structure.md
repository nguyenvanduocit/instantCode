# Project Structure

## Root Directory Organization

```
instantcode/
├── .claude/commands/kiro/          # Spec-driven development commands
├── .kiro/steering/                 # Project steering documents
├── dist/                          # Compiled output files
├── scripts/                       # Build automation scripts
├── src/                          # Source code (TypeScript)
├── CLAUDE.md                     # Claude Code project instructions
├── README.md                     # User documentation
├── package.json                  # Package configuration and dependencies
└── tsconfig.json                 # TypeScript compiler configuration
```

## Source Code Structure (`src/`)

### Main Entry Points
- **`index.ts`** - CLI entry point and server launcher with argument parsing
- **`trpc-server.ts`** - HTTP/WebSocket server setup and routing
- **`vite-plugin.ts`** - Vite integration plugin with server management
- **`inspector-toolbar.ts`** - Client-side web component (compiled separately)

### Core Modules

#### `/inspector/` - Client-Side Inspector Components
- **`ai.ts`** - tRPC client management and AI communication
- **`selection.ts`** - DOM element selection and CSS selector generation
- **`detectors.ts`** - Framework detection (React, Vue, Angular, Svelte)
- **`inspection.ts`** - Element analysis and data extraction
- **`style.ts`** - CSS manipulation and style utilities
- **`console.ts`** - Browser console capture (@error, @warning, @info)
- **`logger.ts`** - Client-side logging utilities

#### `/trpc/` - API Layer
- **`router.ts`** - tRPC route definitions and procedure implementations
- **`context.ts`** - Request context creation and dependency injection

#### `/shared/` - Common Types and Schemas
- **`types.ts`** - TypeScript type definitions shared between client/server
- **`schemas.ts`** - Zod validation schemas for runtime type checking

#### `/utils/` - Utility Functions
- **`sourcemap.ts`** - Source map parsing and location mapping
- **`xpath.ts`** - XPath generation and DOM traversal utilities
- **`html.ts`** - HTML processing and manipulation
- **`logger.ts`** - Server-side logging utilities

### Supporting Files
- **`sample.ts`** - Mock data for development and testing
- **`types/optimal-select.d.ts`** - Type definitions for third-party library

## Build Scripts (`scripts/`)

Each build script handles a specific output target:

- **`build-server.js`** - Compiles server code to `dist/index.cjs`
- **`build-inspector.js`** - Bundles inspector toolbar to `dist/inspector-toolbar.js`
- **`build-vite-plugin.js`** - Builds Vite plugin to `dist/vite-plugin.js`
- **`build-types.js`** - Generates TypeScript declarations in `dist/`

## Code Organization Patterns

### Module Import Structure
```typescript
// External dependencies first
import express from 'express'
import { createTRPCProxyClient } from '@trpc/client'

// Internal utilities
import { createLogger } from '../utils/logger'

// Shared types and schemas
import type { ElementData, PageInfo } from '../shared/types'

// Local module imports
import { detectFramework } from './detectors'
```

### Type Safety Patterns
- **Shared Types** - Single source of truth in `/shared/types.ts`
- **Runtime Validation** - Zod schemas for all API boundaries
- **tRPC Integration** - Full type inference from server to client

### Error Handling Patterns
```typescript
// Graceful error handling with logging
try {
  const result = await riskyOperation()
  logger.log('Operation successful:', result)
} catch (error) {
  logger.error('Operation failed:', error)
  // Continue with fallback behavior
}
```

## File Naming Conventions

### TypeScript Files
- **kebab-case** - For multi-word filenames (`inspector-toolbar.ts`)
- **lowercase** - For single-word files (`selection.ts`, `detectors.ts`)
- **Descriptive names** - Clear indication of module purpose

### Build Outputs
- **`index.cjs`** - CommonJS server executable
- **`inspector-toolbar.js`** - Browser-compatible ES module
- **`vite-plugin.js`** - ESM plugin for Vite
- **`*.d.ts`** - TypeScript declaration files

### Configuration Files
- **Standard names** - Following Node.js/TypeScript conventions
- **Explicit extensions** - `.json`, `.ts`, `.js` for clarity

## Architectural Principles

### Separation of Concerns
- **Client/Server Boundary** - Clear distinction between browser and Node.js code
- **API Layer** - tRPC provides typed contract between frontend and backend
- **Build Separation** - Independent compilation of different deployment targets

### Framework Agnostic Design
- **Pluggable Detection** - Support for multiple frontend frameworks
- **Configurable Integration** - Vite plugin with flexible options
- **Standalone Capability** - Can run without Vite for manual integration

### Process Management
- **Single Responsibility** - Each component handles one primary concern
- **Graceful Lifecycle** - Proper startup, running, and shutdown procedures
- **Error Isolation** - Component failures don't cascade to other parts

### Development Experience
- **Hot Reload Support** - TypeScript watch mode and Vite integration
- **Verbose Logging** - Detailed debugging when enabled
- **Mock Mode** - Development without external AI dependencies

## Import Organization Guidelines

### External Dependencies
Place all third-party imports at the top, grouped by source:
- Node.js built-ins (`node:fs`, `node:path`)
- NPM packages (`express`, `@trpc/server`)

### Internal Modules
Organize internal imports by proximity and dependency:
- Utilities (most foundational)
- Shared types and schemas
- Local module dependencies

### Type-Only Imports
Use `import type` for TypeScript-only imports to improve build performance:
```typescript
import type { Express } from 'express'
import type { ElementData } from '../shared/types'
```

## Key Architectural Decisions

### Why tRPC?
- **End-to-end type safety** - Shared types between client and server
- **WebSocket subscriptions** - Real-time AI response streaming
- **Developer experience** - Excellent TypeScript integration

### Why Lit for Inspector?
- **Web standards** - Custom elements work in any framework
- **Small footprint** - Minimal impact on host applications
- **Framework independence** - Works with React, Vue, Angular, Svelte

### Why Separate Build Scripts?
- **Targeting flexibility** - Different output formats for different use cases
- **Build optimization** - Each target can be optimized independently
- **Clear boundaries** - Explicit separation between server, client, and plugin code