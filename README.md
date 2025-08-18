# Frontend Context - AI-Powered Web Inspection Tool

Transform how you interact with web pages! Frontend Context lets you select any element on a webpage and get instant AI assistance about it. Whether you're building, debugging, or learning about web applications, this tool makes web development more intuitive.

## What is Frontend Context?

Frontend Context is a browser inspection tool that brings AI directly to your webpage. Simply click on any element to get intelligent insights, explanations, or help with your frontend development tasks.

✨ **Key Benefits:**
- 🎯 **Point & Click**: Select any element on your webpage
- 🤖 **AI Assistant**: Get instant help about HTML, CSS, JavaScript, and frameworks
- 🔍 **Smart Detection**: Automatically detects React, Vue, Angular, Svelte components
- 💬 **Natural Language**: Ask questions in plain English about your code
- ⚡ **Real-time**: Get responses instantly without leaving your browser

## Prerequisites

Before using Frontend Context, you need to have **Claude Code** installed on your machine.

### Install Claude Code

Frontend Context requires Claude Code to provide AI assistance. Install it using one of these methods:

**Using bun (recommended)**
```bash
bun install -g @anthropic-ai/claude-code
```

After installation, verify it's working:
```bash
claude-code --version
```

For more installation options and troubleshooting, visit: https://docs.anthropic.com/en/docs/claude-code

## Getting Started

### Step 1: Navigate to Your Project Directory

**Important**: Run InstantCode from your project's working directory to automatically provide AI context about your codebase.

```bash
# Navigate to your project folder first
cd /path/to/your/project

# Then run InstantCode - no installation needed!
bunx instantcode
```

This will:
- Start the server on port 7318
- Display setup instructions
- Automatically detect your project structure and provide better AI assistance

### Step 2: Add to Your Website

Add this simple script tag to you index.html:

```html
<script src="http://localhost:7318/inspector-toolbar.js"></script>
```

That's it! The toolbar will automatically appear on your page.

### Step 3: Start Inspecting!

1. **Refresh your webpage** - you'll see a small toolbar appear
2. **Click the "Select Element" button** 
3. **Click on any element** you want to learn about
4. **Ask questions** like:
   - "What does this button do?"
   - "How can I change the color?"
   - "Why isn't this centered?"
   - "How do I make this responsive?"

## Troubleshooting

### Toolbar Not Appearing?
1. Check that the server is running on port 7318
2. Make sure the script tag is added to your HTML
3. Check browser console for any error messages
4. Try refreshing the page

### Server Won't Start?
1. Make sure port 7318 isn't already in use
2. Check that you have Bun installed: `bun --version`
3. Try a different port: `PORT=8080 bunx instantcode`

### Not Getting Good AI Responses?
1. **Make sure you ran `bunx instantcode` from your project directory** - this is crucial for AI context
2. Try being more specific in your questions
3. Make sure you're selecting the right element

## Tips for Better Results

- **Always run from your project directory** for better AI context
- Ask specific questions about what you want to achieve
- Select the exact element you're curious about
- Try questions like "How do I..." or "Why does this..."

## Support

Having issues? Found a bug? Want to suggest a feature?
- Check the console for error messages
- Make sure you're using the latest version
- Ask the AI assistant itself - it can help debug issues!

---

**Happy coding! 🚀** Frontend Context is here to make your web development journey smoother and more enjoyable.