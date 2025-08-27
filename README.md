# InstantCode - AI-Powered Web Development Assistant

[![Watch the Tutorial](https://img.youtube.com/vi/OuKnfCbmfTg/maxresdefault.jpg)](https://youtu.be/OuKnfCbmfTg)
> 📺 **[Watch the Tutorial Video](https://youtu.be/OuKnfCbmfTg)** - See InstantCode in action!

## What can this plugin help you?

After installing the plugin, you can:
- **Point directly at any element** on your webapp
- **Type a short request** like "make it bigger", "center it", "change color to blue"
- **Wait for AI to modify your code** - it automatically finds and updates the source files
- **See instant results** - your changes appear immediately in the browser

No need to search through files or remember CSS properties - just point and tell!

## Prerequisites

InstantCode requires **Claude Code** to provide AI assistance:

```bash
# Install Claude Code globally
bun install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

## Quick Start with Vite

The fastest way to get started is using our Vite plugin. This automatically handles everything for you!

### 1. Install InstantCode

```bash
npm install --save-dev instantcode
# or
bun add -d instantcode
# or  
yarn add -D instantcode
```

### 2. Add to Your Vite Config

Add the plugin to your `vite.config.ts` or `vite.config.js`:

```typescript
import { defineConfig } from 'vite';
import inspectorPlugin from 'instantcode/vite-plugin';

export default defineConfig({
  plugins: [
    // Your existing plugins...
    inspectorPlugin(),
  ],
});
```

### 3. Start Your Dev Server

```bash
npm run dev
# or
bun dev
# or
yarn dev
```

That's it! The InstantCode toolbar will automatically appear in your application.

## Plugin Configuration

The Vite plugin accepts these options:

```typescript
inspectorPlugin({
  port: 7318,                            // Port to run server on (default: 7318)
  listenAddress: 'localhost',            // Server binding address (default: 'localhost')
  publicAddress: 'https://ai.example.com', // Public URL for reverse proxy (optional)
  verbose: false,                        // Enable detailed logging (default: false)
  mock: false,                          // Enable mock mode (default: false)
})
```

### Address Configuration

**Basic Setup** (default):
- Server listens on `localhost:7318`
- Toolbar uses `http://localhost:7318`

**Reverse Proxy Setup**:
```typescript
inspectorPlugin({
  listenAddress: 'localhost',           // Server binds to localhost
  publicAddress: 'https://ai.mysite.com' // Toolbar uses public URL
})
```

**Listen on All Interfaces**:
```typescript
inspectorPlugin({
  listenAddress: '0.0.0.0',  // Allow external connections
  port: 7318
})
```

### Mock mode

Set `mock: true` in the plugin options to develop UI without Claude Code installed or external calls. The server will stream a deterministic series of frames that mimic actual responses (including a sample "🟢 Vue component found" message). You can also enable mock mode via environment variable when running the standalone server:

```bash
INSTANTCODE_MOCK=true bunx instantcode
```

## Framework Support

InstantCode works with all Vite-supported frameworks:

- ⚛️ **React** - Detects components, props, and state
- 🟢 **Vue** - Understands composition/options API
- 🅰️ **Angular** - Recognizes components and directives  
- 🟠 **Svelte** - Identifies components and stores
- 📄 **Vanilla JS** - Works with plain HTML/CSS/JS

## Advanced Usage - Manual Setup

If you prefer manual control or aren't using Vite:

### Run Standalone Server

```bash
# Navigate to your project directory first (important for context!)
cd /path/to/your/project

# Start the server (basic)
bunx instantcode@latest

# With custom port
bunx instantcode --port 8080

# Listen on all interfaces
bunx instantcode --listen 0.0.0.0

# Use with reverse proxy
bunx instantcode --listen localhost --public-address https://ai.example.com

# Enable verbose logging
bunx instantcode --verbose

# Enable mock mode
bunx instantcode --mock
```

#### CLI Options

- `-p, --port <number>` - Port to run server on (default: 7318)
- `-l, --listen <address>` - Address to bind server to (default: localhost)
- `-a, --public-address <url>` - Public URL for reverse proxy scenarios
- `-V, --verbose` - Enable verbose logging
- `-m, --mock` - Enable mock mode (skip Claude Code)
- `-h, --help` - Show help message
- `-v, --version` - Show version

### Add Script Manually

Add to your HTML:

```html
<!-- Default setup -->
<script src="http://localhost:7318/inspector-toolbar.js"></script>

<!-- With custom port -->
<script src="http://localhost:8080/inspector-toolbar.js"></script>

<!-- With reverse proxy -->
<script src="https://ai.yourdomain.com/inspector-toolbar.js"></script>
```

## Troubleshooting

### Plugin Not Working?
1. Make sure you're running `npm run dev` (or equivalent)
2. Check that InstantCode is in your `vite.config.ts`
3. Restart your dev server
4. Check console for error messages

### Toolbar Not Appearing?
1. Ensure Vite dev server is running
2. Check browser console for errors
3. Verify port 7318 isn't blocked
4. Try refreshing the page

### AI Responses Not Helpful?
1. **Run from your project root** - this gives AI better context
2. Be specific about what you want to achieve
3. Select the exact element you're asking about
4. Try rephrasing your question

### Port Already In Use?
The server automatically checks port availability. If you see this error:
1. Use a different port: `bunx instantcode --port 8080`
2. Stop any existing InstantCode servers
3. Check what's using the port: `lsof -i :7318`
4. Kill the process or restart your machine

### Using with Reverse Proxy?
For production deployments behind nginx, Apache, or cloud load balancers:

```bash
# Server listens locally, toolbar uses public URL
bunx instantcode --listen localhost --public-address https://ai.yourdomain.com
```

Example nginx config:
```nginx
location /instantcode/ {
    proxy_pass http://localhost:7318/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

**Happy coding! 🚀** Frontend Context is here to make your web development journey smoother and more enjoyable.