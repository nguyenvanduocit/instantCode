# Frontend Context Standalone Server

A standalone server for Frontend Context that enables direct UI element interaction and context extraction without requiring VS Code extension.

## Features

- Pick elements directly from the browser
- Extract comprehensive element context (properties, attributes, DOM structure)
- Framework detection (Vue, React, Angular, Svelte, Vanilla)
- Real-time communication via Server-Sent Events (SSE)
- Auto-injection capability for easy integration

## Installation

```bash
npm install
```

or with Bun:

```bash
bun install
```

## Usage

### Start the server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

The server will start on port 7318 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Integrate with your frontend

Add the following script tag to your HTML:

```html
<script src="http://localhost:7318/inspector-toolbar.js?autoInject"></script>
```

This will automatically inject the inspector toolbar into your page.

## API Endpoints

- `GET /` - Health check endpoint
- `GET /inspector-toolbar.js` - Serves the browser-side inspection component
- `POST /sendMessage` - SSE endpoint for handling element context
- `GET /newChat` - Initialize new chat session

## Environment Variables

- `PORT` - Server port (default: 7318)

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode with watch
npm run dev

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

## How it works

1. The server serves an inspector toolbar component to the browser
2. Users can pick elements directly from the browser UI
3. The toolbar extracts comprehensive context about selected elements
4. Context is sent to the server via SSE
5. The server processes and returns the element information

## License

MIT