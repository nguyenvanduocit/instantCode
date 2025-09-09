# Product Overview

## What InstantCode Is

InstantCode is an AI-powered web development assistant that enables developers to interact directly with web elements in their browser to make instant code changes. It bridges the gap between visual web elements and their underlying source code through AI-powered element inspection and code modification.

## Core Features

- **Point-and-Click Element Selection** - Click any element in your web application to select it for modification
- **Natural Language Commands** - Use simple phrases like "make it bigger", "center it", "change color to blue" 
- **AI-Powered Code Discovery** - Automatically finds and identifies the source files responsible for selected elements
- **Instant Code Updates** - AI modifies the actual source code files based on your requests
- **Real-Time Preview** - Changes appear immediately in the browser without manual refresh
- **Framework Detection** - Intelligently detects React, Vue, Angular, Svelte components and vanilla HTML/CSS
- **Console Integration** - Captures browser console errors/warnings/info with `@error`, `@warning`, `@info` commands
- **Mock Mode** - Development mode that simulates AI responses without requiring Claude Code installation

## Target Use Cases

### Primary Use Cases
- **Rapid UI Prototyping** - Quickly adjust layouts, colors, spacing, and styling without diving into code
- **Visual Debugging** - Identify which source files control specific visual elements
- **Learning and Exploration** - Understand how changes to code affect visual appearance
- **Cross-Framework Development** - Work with multiple frontend frameworks using consistent tooling

### Specific Scenarios
- Frontend developers working on complex component hierarchies
- Design-to-code translation and refinement
- Debugging layout issues across different screen sizes
- Training junior developers on component structure
- Rapid iteration during client presentations

## Key Value Propositions

### Speed and Efficiency
- **Eliminates File Hunting** - No need to search through project files to find the right component
- **Instant Feedback Loop** - See changes immediately without save/refresh cycles
- **Natural Interface** - Use plain English instead of memorizing CSS properties or framework syntax

### Intelligence and Accuracy
- **Context-Aware Modifications** - AI understands component structure, props, and styling patterns
- **Framework-Specific Logic** - Adapts behavior based on detected frontend framework
- **Sourcemap Integration** - Precisely maps visual elements to source code locations

### Developer Experience
- **Zero Configuration** - Works out of the box with Vite-based projects
- **Reverse Proxy Support** - Integrates with production deployment workflows
- **Verbose Logging** - Detailed debugging information when needed
- **Flexible Deployment** - Can run as Vite plugin or standalone server

## Integration Requirements

### Essential Dependencies
- **Claude Code** - Required for AI functionality (`@anthropic-ai/claude-code`)
- **Vite** - Primary integration method via `vite-plugin`
- **Modern Browser** - JavaScript and WebSocket support required

### Development Environment
- Node.js 18+ or Bun runtime
- Frontend framework (React, Vue, Angular, Svelte) or vanilla HTML/CSS/JS
- Development server with hot module replacement support