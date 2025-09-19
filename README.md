# InstantCode - AI-Powered Web Development Assistant

[![Watch the Tutorial](https://img.youtube.com/vi/OuKnfCbmfTg/maxresdefault.jpg)](https://youtu.be/OuKnfCbmfTg)
> 📺 **[Watch the Tutorial Video](https://youtu.be/OuKnfCbmfTg)** - See InstantCode in action!

## What can this plugin help you?

After installing the plugin, you can:
- **Point directly at any element** on your webapp
- **Type a short request** like "make it bigger", "center it", "change color to blue"
- **Wait for AI to modify your code** - it automatically finds and updates the source files
- **See instant results** - your changes appear immediately in the browser

> Save cognitive load, because it's precious.

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
bun add -d instantcode
```

### 2. Add to Your Vite Config

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import inspectorPlugin from 'instantcode/vite-plugin';

export default defineConfig({
  plugins: [
    inspectorPlugin(),
  ],
});
```

### 3. Start Your Dev Server

```bash
bun dev
```

That's it! The InstantCode toolbar will automatically appear in your application and ready to use.

## Plugin Configuration

The Vite plugin accepts these options:

```typescript
inspectorPlugin({
  port: 7318,
  verbose: false,
})
```

## Framework Support

InstantCode works with all Vite-supported frameworks:

- ⚛️ **React** - Detects components, props, and state
- 🟢 **Vue** - Understands composition/options API
- 🅰️ **Angular** - Recognizes components and directives  
- 🟠 **Svelte** - Identifies components and stores
- 📄 **Vanilla JS** - Works with plain HTML/CSS/JS

## Advanced Usage - Team Collaboration

### Enable Team-Wide Code Modification

Want your entire team to modify the app? Or let users customize the app themselves? Run InstantCode on a server!

```typescript
inspectorPlugin({
  port: 7318,                            // Port to run server on (default: 7318)
  listenAddress: '0.0.0.0',              // Used for socket connection between the toolbar and the server
  publicAddress: 'https://ai.example.com', // Used to serve the inspector-toolbar.js file
  verbose: false,                        // Enable detailed logging (default: false)
})
```

**How it works:**
- `listenAddress: '0.0.0.0'` - Makes the InstantCode server accessible from any network
- `publicAddress` - The URL where your team accesses the inspector toolbar

**Example Setup for Team Access:**
```typescript
// Deploy your app on a server at https://myapp.com
// Configure InstantCode to be accessible:
inspectorPlugin({
  listenAddress: '0.0.0.0',              // Accept connections from team members
  publicAddress: 'https://myapp.com:7318' // Where the toolbar connects
})
```

Now anyone on your team can:
1. Open the app at `https://myapp.com`
2. Use the InstantCode toolbar to modify the UI
3. Changes are saved directly to the server's source files
4. Everyone sees updates in real-time!

### Manual Setup (Without Vite)

If you prefer manual control or aren't using Vite:

#### Run Standalone Server

```bash
# Navigate to your project directory first (important for context!)
cd /path/to/your/project

# Start the server (basic)
bunx instantcode@latest

# With custom port
bunx instantcode --port 8080

# Listen on all interfaces (for team access)
bunx instantcode --listen 0.0.0.0

# Use with reverse proxy
bunx instantcode --listen localhost --public-address https://ai.example.com

# Enable verbose logging
bunx instantcode --verbose
```

#### CLI Options

- `-p, --port <number>` - Port to run server on (default: 7318)
- `-l, --listen <address>` - Address to bind server to (default: localhost)
- `-a, --public-address <url>` - Public URL for reverse proxy scenarios
- `-V, --verbose` - Enable verbose logging
- `-h, --help` - Show help message
- `-v, --version` - Show version

#### Add Script Manually

Add to your HTML:

```html
<!-- Default setup -->
<script src="http://localhost:7318/inspector-toolbar.js"></script>

<!-- With custom port -->
<script src="http://localhost:8080/inspector-toolbar.js"></script>

<!-- With reverse proxy -->
<script src="https://ai.yourdomain.com/inspector-toolbar.js"></script>
```

**Happy coding! 🚀** and save your precious cognitive load.