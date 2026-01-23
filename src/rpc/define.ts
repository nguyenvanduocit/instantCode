/**
 * Socket RPC Interface Definitions for InstantCode
 *
 * Server: WebSocket server running on port 7318
 * Client: Browser annotator toolbar
 */

// Types shared between client and server
export interface PageContext {
  url: string
  title: string
  selectionCount: number
  isInspecting: boolean
}

export interface ElementData {
  index: number
  tagName: string
  xpath: string
  cssSelector: string
  textContent: string
  attributes: Record<string, string>
  imagePath?: string
  comment?: string
  computedStyles?: {
    width: number
    height: number
    fontSize: string
    fontFamily: string
    color?: string
    backgroundColor?: string
    display?: string
    position?: string
  }
  componentData?: {
    componentLocation: string
    componentName?: string
    framework?: 'vue' | 'react' | 'angular' | 'svelte' | 'vanilla'
  }
  children: ElementData[]
}

export interface ScreenshotResult {
  success: boolean
  base64?: string
  filePath?: string
  error?: string
}

export interface ConsoleEntry {
  type: 'log' | 'info' | 'warn' | 'error' | 'debug'
  args: string[]
  timestamp: number
}

export interface InjectResult {
  success: boolean
  result?: unknown
  error?: string
}

export interface SelectionResult {
  success: boolean
  count: number
  error?: string
}

export interface BrowserSession {
  id: string
  url: string
  title: string
  connectedAt: number
  lastActivity: number
}

// SERVER exposes these functions (MCP/external clients can call via server)
// Used by socket-rpc code generator, not referenced directly
export interface ServerFunctions {
  // Session management
  getSessions: () => BrowserSession[]
  setActiveSession: (sessionId: string) => boolean

  // Ping for health check
  ping: () => string
}

// CLIENT (browser) exposes these functions (server can call)
// Used by socket-rpc code generator, not referenced directly
export interface ClientFunctions {
  // Get current page context
  getPageContext: () => PageContext

  // Get selected elements data
  getSelectedElements: () => ElementData[]

  // Trigger element selection mode or select by selector
  triggerSelection: (mode: 'inspect' | 'selector', selector?: string, selectorType?: 'css' | 'xpath') => SelectionResult

  // Capture screenshot
  captureScreenshot: (type: 'viewport' | 'element', selector?: string, format?: 'png' | 'jpeg', quality?: number) => ScreenshotResult

  // Clear all selections
  clearSelection: () => void

  // Inject CSS into the page
  injectCSS: (css: string) => InjectResult

  // Inject and execute JavaScript in the page
  injectJS: (code: string) => InjectResult

  // Get console logs captured since connection or last clear
  getConsole: (clear?: boolean) => ConsoleEntry[]

  // Ping for health check
  ping: () => string
}
