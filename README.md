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

## Quick Start Tutorial

### Step 1: Run InstantCode

The easiest way to get started is using `bunx` (no installation needed!):

```bash
bunx github:nguyenvanduocit/instantCode
```

**Alternative options:**

```bash
# With npm
npx instantcode

# Or install globally first
npm install -g instantcode
instantcode

# For local development
git clone https://github.com/nguyenvanduocit/instantCode.git
cd instantCode
bun install
bun src/index.ts
```

You should see a message like:
```
🚀 Starting InstantCode server...
📡 Server will run on port 7318
💡 Add this to your webpage to get started:
   <script src="http://localhost:7318/inspector-toolbar.js?autoInject"></script>

✅ InstantCode server running on port 7318
🌐 Ready to assist with your frontend development!
```

### Step 2: Add to Your Website

Add this single line to any webpage you want to inspect:

```html
<script src="http://localhost:7318/inspector-toolbar.js?autoInject"></script>
```

**For local development**, add it to your HTML file:
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- Your content here -->
    
    <!-- Add this line at the end of your body -->
    <script src="http://localhost:7318/inspector-toolbar.js?autoInject"></script>
</body>
</html>
```

**For React/Vue/Angular projects**, add it to your main HTML file (usually `public/index.html` or `index.html`).

### Step 3: Start Inspecting!

1. **Refresh your webpage** - you'll see a small toolbar appear
2. **Click the "Select Element" button** in the toolbar
3. **Hover over any element** on your page - it will highlight in blue
4. **Click on an element** you want to learn about
5. **Ask questions** like:
   - "What does this button do?"
   - "How can I change the color of this text?"
   - "Why isn't this element centered?"
   - "How do I make this responsive?"

## Common Use Cases

### 🎓 **Learning Web Development**
- Select elements to understand HTML structure
- Ask about CSS properties and how they work
- Learn about JavaScript event handlers

### 🐛 **Debugging Issues**
- Click on broken elements to get fixing suggestions
- Ask "Why isn't this working?" about specific components
- Get help with CSS layout problems

### 🔧 **Building Features**
- Select similar elements to understand patterns
- Ask how to modify or extend existing components
- Get code suggestions for improvements

### 👥 **Team Collaboration**
- Quickly understand code written by others
- Get explanations of complex components
- Ask about best practices for specific elements

## Advanced Setup

### Custom Port
If port 7318 is already in use:
```bash
PORT=8080 bun src/index.ts
```

### Automatic Project Detection
The server automatically detects your project directory from where it's running, so you don't need to specify any paths manually. The AI will have full context of your project structure automatically!

### Manual Integration
For more control over when the toolbar appears:
```html
<script src="http://localhost:7318/inspector-toolbar.js"></script>
<script>
  // Add toolbar when needed
  const toolbar = document.createElement('inspector-toolbar');
  toolbar.setAttribute('ai-endpoint', 'http://localhost:7318');
  document.body.prepend(toolbar);
</script>
```

## Troubleshooting

### Toolbar Not Appearing?
1. Check that the server is running on port 7318
2. Make sure the script tag is added to your HTML
3. Check browser console for any error messages
4. Try refreshing the page

### Server Won't Start?
1. Make sure port 7318 isn't already in use
2. Check that you have Bun installed: `bun --version`
3. Try a different port: `PORT=8080 bun src/index.ts`

### Not Getting Good AI Responses?
1. Try being more specific in your questions
2. Make sure you're selecting the right element
3. Add the `cwd` parameter to provide project context

## What's Next?

Once you're comfortable with the basics:
- Try asking complex questions about your code architecture
- Use it to learn new CSS techniques
- Get suggestions for accessibility improvements
- Ask for performance optimization tips

## Support

Having issues? Found a bug? Want to suggest a feature?
- Check the console for error messages
- Make sure you're using the latest version
- Ask the AI assistant itself - it can help debug issues!

---

**Happy coding! 🚀** Frontend Context is here to make your web development journey smoother and more enjoyable.