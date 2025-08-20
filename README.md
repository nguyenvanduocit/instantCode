# InstantCode - AI-Powered Web Development Assistant

[![Watch the Tutorial](https://img.youtube.com/vi/OuKnfCbmfTg/maxresdefault.jpg)](https://youtu.be/OuKnfCbmfTg)
> 📺 **[Watch the Tutorial Video](https://youtu.be/OuKnfCbmfTg)** - See InstantCode in action!

Get instant AI assistance for any element on your webpage! InstantCode integrates seamlessly with your Vite development workflow, automatically injecting an AI inspector that helps you understand, debug, and improve your code in real-time.

## What is InstantCode?

InstantCode is an AI-powered web development tool that lets you click on any element in your application and get intelligent help about it. Perfect for debugging, learning frameworks, or getting suggestions for improvements.

✨ **Key Benefits:**
- 🎯 **Point & Click**: Select any element to get contextual help
- 🤖 **AI Assistant**: Powered by Claude Code for intelligent insights
- 🔍 **Smart Detection**: Auto-detects React, Vue, Angular, Svelte components
- 💬 **Natural Conversations**: Ask questions in plain English
- ⚡ **Zero Configuration**: Works out of the box with Vite
- 🔧 **Development Focused**: Integrates directly into your dev workflow

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

### 4. Start Getting Help!

1. **Look for the toolbar** - appears as a small widget in your app
2. **Click "Select Element"** to enter selection mode
3. **Click any element** you want help with
4. **Ask questions** like:
   - "How do I change this component's styling?"
   - "Why isn't this button working?"
   - "How can I make this responsive?"
   - "What props does this component accept?"


For installation help, visit: https://docs.anthropic.com/en/docs/claude-code

## Plugin Configuration

The Vite plugin accepts these options:

```typescript
inspectorPlugin({
  verbose: false,  // Enable detailed logging (default: false)
  mock: false,     // Enable mock mode to stream deterministic sample responses (default: false)
})
```

**Note**: The server automatically runs on port 7318 and auto-injects the toolbar - no additional configuration needed!

### Mock mode

Set `mock: true` in the plugin options to develop UI without Claude Code installed or external calls. The server will stream a deterministic series of frames that mimic actual responses (including a sample "🟢 Vue component found" message). You can also enable mock mode via environment variable when running the standalone server:

```bash
INSTANTCODE_MOCK=true bunx instantcode
```

## What Happens When You Use the Plugin?

When you add InstantCode to your Vite project:

1. **🚀 Auto-Start**: Inspector server starts automatically with `vite dev`
2. **💉 Auto-Inject**: Toolbar is automatically added to your app
3. **🎯 Smart Context**: AI understands your project structure and codebase
4. **🛑 Clean Shutdown**: Server stops gracefully when you stop Vite
5. **🔄 Hot Reload**: Maintains connection during HMR updates

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

# Start the server
bunx instantcode@latest
```

### Add Script Manually

Add to your HTML:

```html
<script src="http://localhost:7318/inspector-toolbar.js"></script>
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

### Port 7318 Already In Use?
The server automatically checks port availability. If you see this error:
1. Stop any existing InstantCode servers
2. Check what's using port 7318: `lsof -i :7318`
3. Kill the process or restart your machine

## Tips for Best Results

- 🎯 **Be Specific**: "How do I center this div?" vs "Fix this"
- 📁 **Project Context**: Always run from your project directory
- 🎨 **Element Selection**: Click the exact element you're asking about
- 💭 **Clear Questions**: Ask what you want to accomplish, not just what's broken

---

**Happy coding! 🚀** Frontend Context is here to make your web development journey smoother and more enjoyable.