/**
 * InstantCode Annotator Toolbar
 *
 * Browser component that:
 * 1. Connects to InstantCode server via Socket.IO
 * 2. Handles RPC requests from server (element selection, screenshots, etc.)
 * 3. Shows toolbar UI with inspect/clear buttons
 * 4. Shows commentPopover for adding comments when elements are selected
 */

import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { io, Socket } from 'socket.io-client'
import { toBlob } from 'html-to-image'
import { computePosition, offset, flip, shift, autoUpdate } from '@floating-ui/dom'

import { createElementSelectionManager, type ElementSelectionManager } from './annotator/selection'
import { createInspectionManager, type InspectionManager } from './annotator/inspection'
import { findNearestComponent } from './annotator/detectors'
import type { ElementData, PageContext, SelectionResult, ScreenshotResult, ConsoleEntry, InjectResult } from './rpc/define'
import { createRpcClient, type RpcClient } from './rpc/client.generated'

interface PopoverState {
  visible: boolean
  element: Element | null
  comment: string
}

@customElement('annotator-toolbar')
export class AnnotatorToolbar extends LitElement {
  @property({ attribute: 'ws-endpoint' }) wsEndpoint = 'http://localhost:7318'
  @property({ attribute: 'verbose', type: Boolean }) verbose = false

  @state() private connected = false
  @state() private sessionId = ''
  @state() private selectionCount = 0
  @state() private isInspecting = false
  @state() private commentPopover: PopoverState = { visible: false, element: null, comment: '' }
  private popoverCleanup: (() => void) | null = null

  private socket: Socket | null = null
  private rpc: RpcClient | null = null
  private selectionManager: ElementSelectionManager | null = null
  private inspectionManager: InspectionManager | null = null
  private elementComments = new Map<Element, string>()
  private consoleBuffer: ConsoleEntry[] = []
  private originalConsoleMethods: Partial<Record<keyof Console, (...args: unknown[]) => void>> = {}

  static styles = css`
    :host {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #888;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toolbar-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .toolbar-btn.active {
      background: #3b82f6;
      color: white;
    }

    .toolbar-btn.active:hover {
      background: #2563eb;
    }

    .toolbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .toolbar-btn svg {
      width: 18px;
      height: 18px;
    }

    .divider {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.15);
      margin: 0 4px;
    }

    .selection-badge {
      background: #3b82f6;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: white;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      color: #fca5a5;
      font-size: 12px;
    }

    .error-message svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    /* Popover styles */
    .popover {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1000000;
      background: white;
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      padding: 12px;
      min-width: 280px;
      max-width: 350px;
    }

    .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }

    .popover-title {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .popover-title .tag {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      color: #666;
      font-weight: 500;
    }

    .popover-close {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .popover-close:hover {
      background: #f0f0f0;
      color: #333;
    }

    .popover-close svg {
      width: 16px;
      height: 16px;
    }

    .popover-textarea {
      width: 100%;
      min-height: 80px;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }

    .popover-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }

    .popover-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }

    .popover-btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .popover-btn-danger {
      background: transparent;
      border: 1px solid #ef4444;
      color: #ef4444;
    }

    .popover-btn-danger:hover {
      background: #ef4444;
      color: white;
    }

    .hidden {
      display: none;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this.initializeManagers()
    this.initializeConsoleCapture()
    this.connectToServer()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.cleanup()
  }

  private initializeManagers() {
    this.selectionManager = createElementSelectionManager()

    // Set up edit callback for badge pencil icon click
    this.selectionManager.setOnEditClick((element) => {
      this.showCommentPopoverForElement(element)
    })

    this.inspectionManager = createInspectionManager(
      (element) => this.handleElementSelected(element),
      (element) => this.shouldIgnoreElement(element),
      (element) => this.selectionManager?.hasElement(element) || false
    )
  }

  private initializeConsoleCapture() {
    const methods: Array<'log' | 'info' | 'warn' | 'error' | 'debug'> = ['log', 'info', 'warn', 'error', 'debug']

    methods.forEach((method) => {
      this.originalConsoleMethods[method] = console[method].bind(console)

      console[method] = (...args: unknown[]) => {
        // Store in buffer
        this.consoleBuffer.push({
          type: method,
          args: args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            } catch {
              return String(arg)
            }
          }),
          timestamp: Date.now()
        })

        // Limit buffer size to prevent memory issues
        if (this.consoleBuffer.length > 1000) {
          this.consoleBuffer = this.consoleBuffer.slice(-500)
        }

        // Call original method
        this.originalConsoleMethods[method]?.(...args)
      }
    })
  }

  private restoreConsoleMethods() {
    const methods: Array<'log' | 'info' | 'warn' | 'error' | 'debug'> = ['log', 'info', 'warn', 'error', 'debug']
    methods.forEach((method) => {
      if (this.originalConsoleMethods[method]) {
        console[method] = this.originalConsoleMethods[method] as (...args: unknown[]) => void
      }
    })
  }

  private connectToServer() {
    this.log('Connecting to', this.wsEndpoint)

    this.socket = io(this.wsEndpoint, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    // Create RPC client and register handlers
    this.rpc = createRpcClient(this.socket)
    this.registerRpcHandlers()

    this.socket.on('connect', () => {
      this.connected = true
      this.log('Connected to server')
      this.reportPageContext()
    })

    this.socket.on('connected', (data: { sessionId: string }) => {
      this.sessionId = data.sessionId
      this.log('Session ID:', this.sessionId)
    })

    this.socket.on('disconnect', () => {
      this.connected = false
      this.log('Disconnected from server')
    })

    this.socket.on('connect_error', (error: Error) => {
      this.log('Connection error:', error.message)
    })
  }

  private registerRpcHandlers() {
    if (!this.rpc) return

    this.rpc.handle.getPageContext(async () => this.getPageContext())
    this.rpc.handle.getSelectedElements(async () => this.getSelectedElements())
    this.rpc.handle.triggerSelection(async (mode, selector, selectorType) =>
      this.triggerSelection(mode, selector, selectorType)
    )
    this.rpc.handle.captureScreenshot(async (type, selector, format, quality) =>
      this.captureScreenshot(type, selector, format, quality)
    )
    this.rpc.handle.clearSelection(async () => this.clearSelection())
    this.rpc.handle.ping(async () => 'pong')
    this.rpc.handle.injectCSS(async (css) => this.injectCSS(css))
    this.rpc.handle.injectJS(async (code) => this.injectJS(code))
    this.rpc.handle.getConsole(async (clear) => this.getConsoleLogs(clear))
  }

  private reportPageContext() {
    if (!this.socket?.connected) return

    this.socket.emit('pageContextChanged', {
      url: window.location.href,
      title: document.title,
    })
  }

  private getPageContext(): PageContext {
    return {
      url: window.location.href,
      title: document.title,
      selectionCount: this.selectionCount,
      isInspecting: this.isInspecting,
    }
  }

  private getSelectedElements(): ElementData[] {
    if (!this.selectionManager) return []

    const elements = this.selectionManager.buildHierarchicalStructure(
      (el) => findNearestComponent(el, this.verbose)
    )

    // Add comments to elements
    const addComments = (items: ElementData[], selectedElements: Map<Element, any>) => {
      for (const item of items) {
        // Find element by index
        for (const [element] of selectedElements) {
          const info = selectedElements.get(element)
          if (info?.index === item.index) {
            const comment = this.elementComments.get(element)
            if (comment) {
              item.comment = comment
            }
            break
          }
        }
        if (item.children.length > 0) {
          addComments(item.children, selectedElements)
        }
      }
    }

    addComments(elements, this.selectionManager.getSelectedElements())
    return elements
  }

  private triggerSelection(
    mode: 'inspect' | 'selector',
    selector?: string,
    selectorType?: 'css' | 'xpath'
  ): SelectionResult {
    try {
      if (mode === 'inspect') {
        this.inspectionManager?.enterInspectionMode()
        this.isInspecting = true
        return { success: true, count: this.selectionCount }
      } else if (mode === 'selector' && selector) {
        let elements: NodeListOf<Element> | Element[]

        if (selectorType === 'xpath') {
          const result = document.evaluate(
            selector,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          )
          elements = []
          for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i)
            if (node instanceof Element) {
              (elements as Element[]).push(node)
            }
          }
        } else {
          elements = document.querySelectorAll(selector)
        }

        elements.forEach((element) => {
          if (!this.selectionManager?.hasElement(element)) {
            this.selectionManager?.selectElement(element, (el) => findNearestComponent(el, this.verbose))
          }
        })

        this.selectionCount = this.selectionManager?.getSelectedCount() || 0
        return { success: true, count: elements.length }
      }

      return { success: false, count: 0, error: 'Invalid mode or missing selector' }
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async captureScreenshot(
    type: 'viewport' | 'element',
    selector?: string,
    format: 'png' | 'jpeg' = 'png',
    quality: number = 0.8
  ): Promise<ScreenshotResult> {
    try {
      let targetElement: HTMLElement = document.body

      if (type === 'element' && selector) {
        const element = document.querySelector(selector)
        if (!element || !(element instanceof HTMLElement)) {
          return { success: false, error: `Element not found: ${selector}` }
        }
        targetElement = element
      }

      const blob = await toBlob(targetElement, {
        quality,
        type: format === 'png' ? 'image/png' : 'image/jpeg',
      })

      if (!blob) {
        return { success: false, error: 'Failed to capture screenshot' }
      }

      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      return { success: true, base64 }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private clearSelection() {
    this.selectionManager?.clearAllSelections()
    this.elementComments.clear()
    this.selectionCount = 0
    this.hideCommentPopover()
  }

  private injectCSS(css: string): InjectResult {
    try {
      const style = document.createElement('style')
      style.setAttribute('data-injected-by', 'instantcode')
      style.textContent = css
      document.head.appendChild(style)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private injectJS(code: string): InjectResult {
    try {
      // Execute code in page context using Function constructor (intentional for DevTools-like functionality)
      // eslint-disable-next-line no-new-func
      const fn = new Function(code)
      const result = fn()
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private getConsoleLogs(clear?: boolean): ConsoleEntry[] {
    const logs = [...this.consoleBuffer]
    if (clear) {
      this.consoleBuffer = []
    }
    return logs
  }

  private handleElementSelected(element: Element) {
    if (!this.selectionManager) return

    const wasSelected = this.selectionManager.hasElement(element)

    if (wasSelected) {
      // Click on already selected element → deselect it
      this.selectionManager.deselectElement(element)
      this.elementComments.delete(element)
      this.hideCommentPopover()
    } else {
      // New selection → select and show popover
      this.selectionManager.selectElement(element, (el) => findNearestComponent(el, this.verbose))
      this.showCommentPopoverForElement(element)
    }

    this.selectionCount = this.selectionManager.getSelectedCount()

    if (this.socket?.connected) {
      this.socket.emit('selectionChanged', {
        count: this.selectionCount,
        elements: this.getSelectedElements(),
      })
    }
  }

  private removeSelectedElement() {
    if (!this.commentPopover.element || !this.selectionManager) return

    const element = this.commentPopover.element
    this.selectionManager.deselectElement(element)
    this.elementComments.delete(element)
    this.hideCommentPopover()

    this.selectionCount = this.selectionManager.getSelectedCount()

    if (this.socket?.connected) {
      this.socket.emit('selectionChanged', {
        count: this.selectionCount,
        elements: this.getSelectedElements(),
      })
    }
  }

  private showCommentPopoverForElement(element: Element) {
    // Clean up previous popover positioning
    if (this.popoverCleanup) {
      this.popoverCleanup()
      this.popoverCleanup = null
    }

    const existingComment = this.elementComments.get(element) || ''

    this.commentPopover = {
      visible: true,
      element,
      comment: existingComment
    }

    // Add keyboard listener for ESC and Enter
    document.addEventListener('keydown', this.handlePopoverKeydown)

    // Setup floating-ui positioning after render
    this.updateComplete.then(() => {
      const popoverEl = this.shadowRoot?.querySelector('.popover') as HTMLElement
      if (!popoverEl || !element) return

      this.popoverCleanup = autoUpdate(element, popoverEl, () => {
        computePosition(element, popoverEl, {
          placement: 'bottom',
          middleware: [
            offset(10),
            flip({ fallbackPlacements: ['top', 'right', 'left'] }),
            shift({ padding: 10 }),
          ],
        }).then(({ x, y }) => {
          Object.assign(popoverEl.style, {
            left: `${x}px`,
            top: `${y}px`,
          })
        })
      })
    })
  }

  private handlePopoverKeydown = (e: KeyboardEvent) => {
    if (!this.commentPopover.visible) return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.hideCommentPopover()
    }
  }

  private hideCommentPopover() {
    document.removeEventListener('keydown', this.handlePopoverKeydown)
    if (this.popoverCleanup) {
      this.popoverCleanup()
      this.popoverCleanup = null
    }
    this.commentPopover = { visible: false, element: null, comment: '' }
  }

  private handlePopoverInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    const comment = target.value
    const element = this.commentPopover.element

    this.commentPopover = { ...this.commentPopover, comment }

    // Auto-save comment
    if (element) {
      const hasComment = comment.trim().length > 0
      if (hasComment) {
        this.elementComments.set(element, comment.trim())
        this.selectionManager?.updateBadgeCommentIndicator(element, true)
      } else {
        this.elementComments.delete(element)
        this.selectionManager?.updateBadgeCommentIndicator(element, false)
      }
    }
  }

  private shouldIgnoreElement(element: Element): boolean {
    if (element.closest('annotator-toolbar')) return true
    if (element.classList.contains('annotator-badge')) return true
    if (element.classList.contains('annotator-ignore')) return true
    return false
  }

  private cleanup() {
    if (this.popoverCleanup) {
      this.popoverCleanup()
      this.popoverCleanup = null
    }
    this.inspectionManager?.destroy()
    this.selectionManager?.clearAllSelections()
    this.restoreConsoleMethods()
    this.rpc?.dispose()
    this.socket?.disconnect()
  }

  private log(...args: unknown[]) {
    if (this.verbose) {
      console.log('[InstantCode]', ...args)
    }
  }

  private toggleInspect() {
    if (this.isInspecting) {
      this.inspectionManager?.exitInspectionMode()
      this.isInspecting = false
      if (this.commentPopover.visible) {
        this.hideCommentPopover()
      }
    } else {
      this.inspectionManager?.enterInspectionMode()
      this.isInspecting = true
    }
  }

  private handleClearClick() {
    this.clearSelection()
    if (this.socket?.connected) {
      this.socket.emit('selectionChanged', {
        count: 0,
        elements: [],
      })
    }
  }

  // SVG Icons
  private renderCursorIcon() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>`
  }

  private renderTrashIcon() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>`
  }

  private renderCloseIcon() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>`
  }

  private renderHelpIcon() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>`
  }

  private renderErrorIcon() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>`
  }

  private openHelpPage() {
    window.open('https://instantcode.dev', '_blank')
  }

  render() {
    if (!this.connected) {
      return html`
        <div class="toolbar">
          <div class="error-message">
            ${this.renderErrorIcon()}
            <span>Cannot connect to InstantCode server</span>
          </div>
        </div>
      `
    }

    return html`
      <div class="toolbar">
        ${this.selectionCount > 0 ? html`
          <span class="selection-badge">${this.selectionCount}</span>
          <div class="divider"></div>
        ` : ''}

        <button
          class="toolbar-btn ${this.isInspecting ? 'active' : ''}"
          @click=${this.toggleInspect}
          title=${this.isInspecting ? 'Stop inspecting (click to exit)' : 'Start inspecting elements'}
        >
          ${this.renderCursorIcon()}
        </button>

        <button
          class="toolbar-btn"
          @click=${this.handleClearClick}
          title="Clear all selections"
          ?disabled=${this.selectionCount === 0}
        >
          ${this.renderTrashIcon()}
        </button>

        <div class="divider"></div>

        <button
          class="toolbar-btn"
          @click=${this.openHelpPage}
          title="Help & Documentation"
        >
          ${this.renderHelpIcon()}
        </button>
      </div>

      ${this.commentPopover.visible ? html`
        <div class="popover">
          <div class="popover-header">
            <div class="popover-title">
              ${this.elementComments.has(this.commentPopover.element!) ? 'Edit Comment' : 'Add Comment'}
              <span class="tag">${(this.commentPopover.element as Element)?.tagName?.toLowerCase() || 'element'}</span>
            </div>
            <button class="popover-close" @click=${this.hideCommentPopover}>
              ${this.renderCloseIcon()}
            </button>
          </div>
          <textarea
            class="popover-textarea"
            placeholder="Describe what you want to change about this element..."
            .value=${this.commentPopover.comment}
            @input=${this.handlePopoverInput}
          ></textarea>
          <div class="popover-actions">
            <button class="popover-btn popover-btn-danger" @click=${this.removeSelectedElement}>Remove</button>
          </div>
        </div>
      ` : ''}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'annotator-toolbar': AnnotatorToolbar
  }
}
