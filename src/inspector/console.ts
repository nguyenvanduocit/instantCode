/**
 * Global console capture system for errors, warnings, and info messages
 */

declare global {
  interface Console { 
    original?: {
      error?: typeof console.error
      warn?: typeof console.warn
      info?: typeof console.info
      log?: typeof console.log
      assert?: typeof console.assert
    }
  }
}

// Global console capture system
const globalConsoleErrors: string[] = []
const globalConsoleWarnings: string[] = []
const globalConsoleInfo: string[] = []
const MAX_CONSOLE_MESSAGES = 50 // Limit to prevent memory issues
let consoleErrorCaptureInitialized = false

const overridableFunctionNames = ['error', 'warn', 'info', 'log', 'assert'] as const

function addErrorToGlobalList(error: string): void {
  globalConsoleErrors.push(error)
  // Keep only the most recent errors
  if (globalConsoleErrors.length > MAX_CONSOLE_MESSAGES) {
    globalConsoleErrors.shift()
  }
}

function addWarningToGlobalList(warning: string): void {
  globalConsoleWarnings.push(warning)
  // Keep only the most recent warnings
  if (globalConsoleWarnings.length > MAX_CONSOLE_MESSAGES) {
    globalConsoleWarnings.shift()
  }
}

function addInfoToGlobalList(info: string): void {
  globalConsoleInfo.push(info)
  // Keep only the most recent info messages
  if (globalConsoleInfo.length > MAX_CONSOLE_MESSAGES) {
    globalConsoleInfo.shift()
  }
}

function serializeArgument(arg: any): string {
  if (typeof arg === 'object') {
    if (arg instanceof Error) {
      return JSON.stringify(arg, Object.getOwnPropertyNames(arg))
    }
    try {
      return JSON.stringify(arg, null, 2)
    } catch {
      return String(arg)
    }
  } else {
    return String(arg)
  }
}

function saveConsoleLog(functionName: string, args: any[]): void {
  const timestamp = new Date().toISOString()
  const serializedArgs = args.map(serializeArgument).join('\n')
  
  const logEntry = `[${functionName.toUpperCase()}] ${timestamp}
Message: ${serializedArgs}
---`

  switch (functionName) {
    case 'error':
    case 'assert':
      addErrorToGlobalList(logEntry)
      break
    case 'warn':
      addWarningToGlobalList(logEntry)
      break
    case 'info':
    case 'log':
      addInfoToGlobalList(logEntry)
      break
  }
}

function createConsoleProxy(originalFunction: Function, functionName: string): Function {
  const proxyHandler = {
    apply: (target: Function, thisArgument: any, argumentsList: any[]) => {
      // For assert, only log if condition is false
      if (functionName === 'assert' && argumentsList[0]) {
        return target.apply(thisArgument, argumentsList)
      }
      
      saveConsoleLog(functionName, argumentsList)
      return target.apply(thisArgument, argumentsList)
    }
  }
  
  return new Proxy(originalFunction, proxyHandler)
}

function setConsoleProxies(): void {
  if (!console.original) {
    console.original = {}
  }

  overridableFunctionNames.forEach(funcName => {
    if (!console.original![funcName]) {
      // @ts-ignore - Store original function
      console.original[funcName] = console[funcName]
    }
    // @ts-ignore - Replace with proxy
    console[funcName] = createConsoleProxy(console[funcName], funcName)
  })
}

function resetConsoleToOriginal(): void {
  if (console.original) {
    overridableFunctionNames.forEach(funcName => {
      if (console.original![funcName]) {
        // @ts-ignore - Restore original function
        console[funcName] = console.original[funcName]
      }
    })
  }
}

export function initializeConsoleErrorCapture(): void {
  if (consoleErrorCaptureInitialized) return

  setConsoleProxies()

  // Capture uncaught errors
  window.addEventListener('error', (event) => {
    const timestamp = new Date().toISOString()
    const errorDetails = event.error ? serializeArgument(event.error) : `${event.message}`

    addErrorToGlobalList(`[UNCAUGHT ERROR] ${timestamp}
Message: ${errorDetails}
File: ${event.filename}:${event.lineno}:${event.colno}
Stack: ${event.error?.stack || 'No stack trace available'}
---`)
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const timestamp = new Date().toISOString()
    const reason = serializeArgument(event.reason)

    addErrorToGlobalList(`[UNHANDLED PROMISE REJECTION] ${timestamp}
Reason: ${reason}
---`)
  })

  // Capture resource loading errors (images, scripts, stylesheets, etc.)
  window.addEventListener('error', (event) => {
    if (event.target !== window && event.target) {
      const target = event.target as HTMLElement
      const timestamp = new Date().toISOString()
      const tagName = target.tagName?.toLowerCase()
      const src = (target as any).src || (target as any).href

      addErrorToGlobalList(`[RESOURCE ERROR] ${timestamp}
Failed to load ${tagName}: ${src}
Element: ${target.outerHTML?.substring(0, 200)}...
---`)
    }
  }, true)

  // Capture network errors from fetch if possible
  const originalFetch = window.fetch
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    try {
      const response = await originalFetch.apply(window, args)
      if (!response.ok) {
        const timestamp = new Date().toISOString()
        const url = typeof args[0] === 'string' ? args[0] :
          args[0] instanceof Request ? args[0].url :
            args[0] instanceof URL ? args[0].href : String(args[0])

        addErrorToGlobalList(`[NETWORK ERROR] ${timestamp}
Failed request: ${response.status} ${response.statusText}
URL: ${url}
---`)
      }
      return response
    } catch (error) {
      const timestamp = new Date().toISOString()
      const url = typeof args[0] === 'string' ? args[0] :
        args[0] instanceof Request ? args[0].url :
          args[0] instanceof URL ? args[0].href : String(args[0])

      addErrorToGlobalList(`[FETCH ERROR] ${timestamp}
Request failed: ${serializeArgument(error)}
URL: ${url}
---`)
      throw error
    }
  }

  consoleErrorCaptureInitialized = true
  console.log('🔍 Console error capture initialized successfully')
}

export function captureConsoleErrors(): string[] {
  const captured = [...globalConsoleErrors]
  return captured
}

export function captureConsoleWarnings(): string[] {
  const captured = [...globalConsoleWarnings]
  return captured
}

export function captureConsoleInfo(): string[] {
  const captured = [...globalConsoleInfo]
  return captured
}

export function flushConsoleCaptures(): void {
  globalConsoleErrors.length = 0
  globalConsoleWarnings.length = 0
  globalConsoleInfo.length = 0
}

export function stopConsoleCapture(): void {
  resetConsoleToOriginal()
  consoleErrorCaptureInitialized = false
}