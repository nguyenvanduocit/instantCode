/**
 * Lit-based InspectorToolbar with reactive UI
 */

import { LitElement, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { classMap } from 'lit/directives/class-map.js'
import { createRef, ref, type Ref } from 'lit/directives/ref.js'

import type { ElementData, PageInfo, SendMessageResponse } from './shared/types'
import { createAIManager, type AIManager, type AIMessageHandler } from './inspector/ai'
import { createElementSelectionManager, type ElementSelectionManager } from './inspector/selection'
import { createInspectionManager, type InspectionManager } from './inspector/inspection'
import { findNearestComponent } from './inspector/detectors'
import { createLogger, type Logger } from './inspector/logger'
import { createToolbarEventEmitter } from './inspector/events'
import { TOOLBAR_STYLES } from './inspector/style'
import { HtmlUtils } from './utils/html'
import * as yaml from 'js-yaml'
import { 
  initializeConsoleErrorCapture, 
  captureConsoleErrors, 
  captureConsoleWarnings, 
  captureConsoleInfo 
} from './inspector/console'

// Configuration constants
const CONFIG = {
  MAX_CONTENT_LENGTH: 10000,
  MAX_RESULT_LENGTH: 10000,
  MAX_INPUT_DISPLAY: 10000,
  MESSAGE_HISTORY_LIMIT: 10
} as const

// Message formatter interface
interface MessageFormatter {
  formatPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo): string
  shouldShowMessage(jsonData: any): boolean
  createMessage(data: any): string | null
  clearMessages(): void
}

@customElement('inspector-toolbar')
export class InspectorToolbar extends LitElement {
  // Reactive properties
  @property({ attribute: 'ai-endpoint' })
  aiEndpoint = ''

  @property({ type: string })
  cwd = ''

  @property({ type: Boolean })
  verbose = false

  // Internal state - all managed through Lit's reactive properties
  @state()
  private isExpanded = false

  @state()
  private isInspecting = false

  @state()
  private isProcessing = false

  @state()
  private sessionId = ''

  @state()
  private selectedElements: ElementData[] = []

  @state()
  private hasSelectedElements = false

  @state()
  private messages: SendMessageResponse[] = []

  @state()
  private showProcessingIndicator = false

  @state()
  private showProcessingMessage = false

  // Managers
  private events = createToolbarEventEmitter()
  private selectionManager: ElementSelectionManager
  private aiManager: AIManager
  private inspectionManager: InspectionManager
  private messageFormatter: MessageFormatter
  private logger: Logger

  // Element refs
  private promptInputRef: Ref<HTMLTextAreaElement> = createRef()
  private jsonContentRef: Ref<HTMLDivElement> = createRef()

  // Event cleanup functions
  private cleanupFunctions: (() => void)[] = []

  // Message formatter state
  private lastMessageHash = ''
  private messageHistory = new Set<string>()

  static styles = TOOLBAR_STYLES

  constructor() {
    super()

    // Initialize logger first
    this.logger = createLogger(this.verbose)

    // Initialize console error capture on first toolbar creation
    initializeConsoleErrorCapture()

    // Initialize managers using factory functions
    this.selectionManager = createElementSelectionManager()
    this.aiManager = createAIManager(this.verbose)
    this.inspectionManager = createInspectionManager(
      (element) => this.handleElementSelection(element),
      (element) => this.shouldIgnoreElement(element),
      (element) => this.selectionManager.hasElement(element)
    )
    
    // Create inline message formatter
    this.messageFormatter = {
      formatPrompt: (userPrompt, selectedElements, pageInfo) => 
        this.formatPrompt(userPrompt, selectedElements, pageInfo),
      shouldShowMessage: (jsonData) => this.shouldShowMessage(jsonData),
      createMessage: (data) => this.createMessage(data),
      clearMessages: () => this.clearMessages()
    }

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen to state changes and update reactive properties directly
    this.cleanupFunctions.push(
      this.events.on('ui:expand', () => {
        this.isExpanded = true
      }),
      this.events.on('ui:collapse', () => {
        this.isExpanded = false
        this.isInspecting = false
      }),
      this.events.on('ui:enter-inspection', () => {
        this.enterInspectionMode()
        this.isInspecting = true
      }),
      this.events.on('ui:exit-inspection', () => {
        this.exitInspectionMode()
        this.isInspecting = false
      }),
      this.events.on('ui:processing-start', () => {
        this.isProcessing = true
        this.isInspecting = false
      }),
      this.events.on('ui:processing-end', () => {
        this.isProcessing = false
      }),
      this.events.on('session:updated', ({ sessionId }) => {
        this.sessionId = sessionId || ''
      }),
      this.events.on('session:new', () => {
        this.sessionId = ''
        this.selectedElements = []
        this.messages = []
      }),
      this.events.on('selection:changed', (elements) => {
        this.selectedElements = elements || []
        this.hasSelectedElements = this.selectionManager.getSelectedCount() > 0
      }),
      this.events.on('messages:add', (message) => {
        this.messages = [...this.messages, message]
        
        // Update session ID from messages
        if ((message.type === 'claude_json' || message.type === 'claude_response' || message.type === 'complete') && message.sessionId) {
          this.sessionId = message.sessionId
        }
        
        // End processing when complete
        if (message.type === 'complete') {
          this.isProcessing = false
        }
        
        // Auto-scroll to bottom
        this.updateComplete.then(() => {
          if (this.jsonContentRef.value) {
            this.jsonContentRef.value.scrollTop = this.jsonContentRef.value.scrollHeight
          }
        })
      }),
      this.events.on('messages:clear', () => {
        this.messages = []
        this.messageFormatter.clearMessages()
      }),
      this.events.on('prompt:clear', () => {
        if (this.promptInputRef.value) {
          this.promptInputRef.value.value = ''
        }
      }),
      this.events.on('selection:clear', () => {
        this.selectionManager.clearAllSelections()
        this.selectedElements = []
        this.hasSelectedElements = false
      }),
      this.events.on('notification:show', ({ message, type }) => {
        // Simple console notification for now
        console.log(`${type}: ${message}`)
      }),
    )
  }

  render() {
    return html`
      <button
        class=${classMap({
      'toolbar-button': true,
      'active': this.isExpanded
    })}
        @click=${this.handleToggle}
      >
        <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
        </svg>
      </button>

      <div
        class=${classMap({
          'toolbar-card': true,
          'expanded': this.isExpanded,
          'inspecting': this.isInspecting,
          'processing': this.isProcessing
        })}
      >
        <div class="toolbar-header">
          <div
            class=${classMap({
          'session-info': true,
              'hidden': !this.sessionId
        })}
          >
            <span class="session-label">Session:</span>
            <span class="session-id">${this.sessionId.substring(0, 8)}</span>
            ${when(this.isProcessing, () => html`
              <button class="action-button cancel-button" @click=${this.handleCancel}>
                <span>Cancel</span>
              </button>
            `)}
            <button class="action-button new-chat-button" @click=${this.handleNewChat}>
              <span>New Chat</span>
            </button>
          </div>
          <textarea
            ${ref(this.promptInputRef)}
            rows="2"
            autocomplete="off"
            class="toolbar-input"
            placeholder="Type your prompt then press Enter"
            @keydown=${this.handlePromptKeydown}
          ></textarea>
        </div>

        <div class="toolbar-actions">
          <button
            class="action-button inspect-button"
            @click=${this.handleInspect}
            ?disabled=${this.isProcessing}
          >
            <span>Inspect</span>
          </button>
          ${when(this.hasSelectedElements, () => html`
            <button class="action-button clear-button" @click=${this.handleClearElements}>
              <span>Clear</span>
            </button>
          `)}
          ${when(this.isInspecting, () => html`
            <button class="action-button close-button" @click=${this.handleCloseInspection}>
              <span>Cancel</span>
            </button>
          `)}
        </div>

        ${when(this.showProcessingIndicator, () => html`
          <div class="processing-indicator show">
            <div>Starting Claude Code<span class="processing-dots"></span></div>
          </div>
        `)}

        ${when(this.messages.length > 0 || this.showProcessingMessage, () => html`
          <div class="json-display show">
            <div class="json-content" ${ref(this.jsonContentRef)}>
              ${this.messages.map(message => this.renderMessage(message))}
            </div>
            ${when(this.showProcessingMessage, () => html`
              <div class="processing-message show">
                <div class="processing-spinner"></div>
                <span class="processing-text">Processing request...</span>
              </div>
            `)}
          </div>
        `)}
      </div>
    `
  }

  private renderMessage(message: SendMessageResponse) {
    if (!this.messageFormatter.shouldShowMessage(message)) {
      return nothing
    }

    const formattedMessage = this.messageFormatter.createMessage(message)
    if (!formattedMessage) {
      return nothing
    }

    return html`
      <div class="json-message">
        <div .innerHTML=${formattedMessage}></div>
      </div>
    `
  }

  // Event handlers
  private handleToggle(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    if (!this.isExpanded) {
      this.events.emit('ui:expand', undefined)

      if (this.selectionManager.getSelectedCount() === 0 && !this.isInspecting && !this.isProcessing) {
        this.events.emit('ui:enter-inspection', undefined)
      }
    } else {
      this.events.emit('ui:collapse', undefined)

      if (this.isInspecting) {
        this.events.emit('ui:exit-inspection', undefined)
      }
      this.events.emit('selection:clear', undefined)
      this.events.emit('prompt:clear', undefined)
    }
  }

  private handleInspect() {
    if (!this.isProcessing) {
      this.events.emit('ui:enter-inspection', undefined)
    }
  }

  private handleClearElements() {
    this.events.emit('selection:clear', undefined)
  }

  private handleCloseInspection() {
    this.events.emit('ui:exit-inspection', undefined)
  }

  private async handleNewChat() {
    if (this.isProcessing) {
      this.logger.log('Cannot start new chat while processing')
      return
    }

    if (this.promptInputRef.value) {
      this.promptInputRef.value.value = ''
    }
    this.selectionManager.clearAllSelections()
    this.hasSelectedElements = false
    this.messages = []
    this.messageFormatter.clearMessages()

    this.events.emit('ui:enter-inspection', undefined)

    if (this.aiManager.isInitialized()) {
      try {
        await this.aiManager.newChat()
        this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })
      } catch (error) {
        this.logger.error('Failed to start new chat:', error)
      }
    } else {
      this.logger.warn('AI manager not initialized')
    }
  }

  private async handleCancel() {
    if (this.aiManager.isProcessing()) {
      this.aiManager.cancel()
      this.setProcessingState(false)
      console.log('success: Request cancelled')

      // Start new chat after canceling
      if (this.promptInputRef.value) {
        this.promptInputRef.value.value = ''
      }
      this.selectionManager.clearAllSelections()
      this.hasSelectedElements = false
      this.messages = []
      this.messageFormatter.clearMessages()

      if (this.aiManager.isInitialized()) {
        try {
          await this.aiManager.newChat()
          this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })
        } catch (error) {
          this.logger.error('Failed to start new chat after cancel:', error)
        }
      }
    }
  }

  private handlePromptKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      this.handlePromptSubmit(target.value.trim())
    }
  }

  // Additional methods from original implementation
  private enterInspectionMode(): void {
    this.updateComplete.then(() => {
      if (this.promptInputRef.value) {
        this.promptInputRef.value.focus()
      }
    })

    this.inspectionManager.enterInspectionMode()
  }

  private exitInspectionMode(): void {
    this.inspectionManager.exitInspectionMode()
  }

  private handleElementSelection(element: Element): void {
    if (this.selectionManager.hasElement(element)) {
      this.selectionManager.deselectElement(element)
    } else {
      this.selectionManager.selectElement(element, (el) => findNearestComponent(el, this.verbose))
    }
    this.hasSelectedElements = this.selectionManager.getSelectedCount() > 0
  }

  private shouldIgnoreElement(element: Element): boolean {
    if (element === this || this.contains(element)) return true
    if (element.classList?.contains('inspector-badge')) return true

    let currentElement: Element | null = element
    while (currentElement) {
      if (currentElement.classList?.contains('inspector-badge') ||
        currentElement.classList?.contains('inspector-ignore')) {
        return true
      }

      const parent = currentElement.parentNode
      if (parent && parent.nodeType === Node.ELEMENT_NODE) {
        currentElement = parent as Element
      } else if ((currentElement as any).host) {
        currentElement = (currentElement as any).host
      } else {
        break
      }
    }

    return false
  }

  private async handlePromptSubmit(prompt: string): Promise<void> {
    if (!prompt) {
      this.logger.log('Empty prompt, nothing to process')
      return
    }

    if (this.isProcessing) {
      this.logger.log('Already processing, ignoring new prompt')
      return
    }

    this.logger.log('AI Prompt submitted:', prompt)
    this.logger.log('Selected elements:', Array.from(this.selectionManager.getSelectedElements().keys()))

    // Exit inspection mode when prompt is submitted
    if (this.isInspecting) {
      this.events.emit('ui:exit-inspection', undefined)
    }

    const pageInfo = this.getCurrentPageInfo()
    const selectedElementsHierarchy = this.selectionManager.buildHierarchicalStructure(
      (el) => findNearestComponent(el, this.verbose)
    )

    if (this.aiEndpoint) {
      await this.callAI(prompt, selectedElementsHierarchy, pageInfo)
    } else {
      this.logger.warn('No AI endpoint provided. Set the ai-endpoint attribute to use AI features.')
    }
  }

  private getCurrentPageInfo(): PageInfo {
    return {
      url: window.location.href,
      title: document.title,
    }
  }

  private async callAI(prompt: string, selectedElements: ElementData[], pageInfo: PageInfo): Promise<void> {
    if (!this.aiEndpoint) {
      this.logger.warn('No AI endpoint specified')
      return
    }

    const originalPromptText = this.promptInputRef.value?.value || ''

    try {
      if (!this.aiManager.isInitialized()) {
        throw new Error('AI manager not initialized')
      }

      this.setProcessingState(true)

      // Capture console messages based on prompt keywords
      let consoleErrors: string[] | undefined
      let consoleWarnings: string[] | undefined
      let consoleInfo: string[] | undefined

      if (prompt.includes('@error')) {
        consoleErrors = captureConsoleErrors()
      }

      if (prompt.includes('@warning')) {
        consoleWarnings = captureConsoleWarnings()
      }

      if (prompt.includes('@info')) {
        consoleInfo = captureConsoleInfo()
      }

      const messageHandler: AIMessageHandler = {
        onData: (data: SendMessageResponse) => {
          if (data.type === 'claude_json') {
            this.showProcessingIndicator = false
            this.events.emit('messages:add', data)
          } else if (data.type === 'claude_response') {
            this.showProcessingMessage = false
            this.events.emit('messages:add', data)
          } else if (data.type === 'complete') {
            if (this.promptInputRef.value) {
              this.promptInputRef.value.value = ''
            }
            this.showProcessingIndicator = false
            this.showProcessingMessage = false
            this.setProcessingState(false)
          }

          // Update session display when session ID is received
          if ((data.type === 'complete' || data.type === 'claude_response' || data.type === 'claude_json') && data.sessionId) {
            this.events.emit('session:updated', { sessionId: data.sessionId })
          }
        },
        onError: (error) => {
          this.logger.error('AI subscription error:', error)
          console.log('error: Failed to send message')
          this.setProcessingState(false)
        },
        onComplete: () => {
          this.setProcessingState(false)
        }
      }

      // For now, keep using the existing AI manager method but extend it with console data
      // We would need to modify the AI manager to handle console data, but for simplicity
      // we'll add this as additional context to the prompt when console capture keywords are used
      let enhancedPrompt = prompt
      if (consoleErrors?.length) {
        enhancedPrompt += '\n\n**Console Errors:**\n' + consoleErrors.join('\n')
      }
      if (consoleWarnings?.length) {
        enhancedPrompt += '\n\n**Console Warnings:**\n' + consoleWarnings.join('\n')
      }
      if (consoleInfo?.length) {
        enhancedPrompt += '\n\n**Console Info:**\n' + consoleInfo.join('\n')
      }

      await this.aiManager.sendMessage(
        enhancedPrompt,
        selectedElements,
        pageInfo,
        this.cwd,
        messageHandler
      )
    } catch (error) {
      this.logger.error('Error calling AI endpoint:', error)

      if (this.promptInputRef.value) {
        this.promptInputRef.value.value = originalPromptText
      }
      this.setProcessingState(false)

      this.logger.error('Error calling AI endpoint:', (error as Error).message || 'Failed to connect to AI service')
    }
  }

  private setProcessingState(isProcessing: boolean): void {
    if (isProcessing) {
      this.showProcessingIndicator = true
      this.showProcessingMessage = true
      this.events.emit('ui:processing-start', undefined)
      window.onbeforeunload = () => 'Processing in progress. Are you sure you want to leave?'
    } else {
      this.showProcessingIndicator = false
      this.showProcessingMessage = false
      this.events.emit('ui:processing-end', undefined)
      window.onbeforeunload = null
    }
  }

  // Lifecycle methods
  connectedCallback(): void {
    super.connectedCallback()

    // Only initialize if not already initialized to prevent duplicates
    if (!this.aiManager.isInitialized()) {
      this.aiManager.initialize(this.aiEndpoint)
    }
    this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })

    // Handle clicks outside to collapse
    document.addEventListener('click', this.handleOutsideClick)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    window.onbeforeunload = null

    this.aiManager.destroy()
    this.inspectionManager.destroy()
    this.selectionManager.clearAllSelections()
    this.events.cleanup()
    this.cleanupFunctions.forEach(cleanup => cleanup())

    document.removeEventListener('click', this.handleOutsideClick)
  }

  private handleOutsideClick = (e: Event) => {
    if (!this.contains(e.target as Node) && this.isExpanded && !this.isInspecting) {
      this.events.emit('ui:collapse', undefined)
    }
  }

  // ===============================
  // MESSAGE FORMATTING METHODS
  // ===============================

  private formatPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo): string {
    let formattedPrompt = `<userRequest>${userPrompt}</userRequest>`

    const replacer = (_key: string, value: any) => {
      if (value === '' || (Array.isArray(value) && value.length === 0) || value === null) {
        return undefined
      }
      return value
    }

    if (pageInfo) {
      formattedPrompt += `<pageInfo>${JSON.stringify(pageInfo, replacer)}</pageInfo>`
    }

    if (selectedElements && selectedElements.length > 0) {
      formattedPrompt += `<inspectedElements>${JSON.stringify(selectedElements, replacer)}</inspectedElements>`
    }

    return formattedPrompt
  }

  private shouldShowMessage(jsonData: any): boolean {
    // Always show messages that don't have a hash (empty content)
    const messageHash = this.hashMessage(jsonData)
    if (!messageHash) return true

    // Skip exact consecutive duplicates
    if (messageHash === this.lastMessageHash) return false

    // Only check history for assistant messages to prevent duplicate streaming
    if (jsonData.type === 'assistant' && this.messageHistory.has(messageHash)) return false

    // Track message
    this.lastMessageHash = messageHash
    if (jsonData.type === 'assistant') {
      this.messageHistory.add(messageHash)
      if (this.messageHistory.size > CONFIG.MESSAGE_HISTORY_LIMIT) {
        const firstHash = this.messageHistory.values().next().value
        if (firstHash) this.messageHistory.delete(firstHash)
      }
    }

    // Always show non-assistant messages (including Claude JSON responses)
    return true
  }

  private createMessage(data: any): string | null {
    try {
      // Handle different message types clearly
      if (data.type === 'assistant') {
        return this.createAssistantMessage(data)
      } else if (data.type === 'user') {
        return this.createUserMessage(data)
      } else if (data.type === 'system') {
        return this.createSystemMessage(data)
      } else if (data.type === 'result') {
        return this.createResultMessage(data)
      } else if (data.type === 'claude_response') {
        return this.createClaudeResponseMessage(data)
      } else {
        return this.createFallbackMessage(data)
      }
    } catch (error) {
      console.error('Error creating message:', error)
      return this.createErrorMessage(data)
    }
  }

  private clearMessages(): void {
    this.lastMessageHash = ''
    this.messageHistory.clear()
  }

  // Helper methods for message creation
  private createAssistantMessage(data: any): string | null {
    if (!data.message?.content) return null

    const extracted = this.extractContentFromAssistant(data.message.content)

    // Regular assistant message - escape HTML for safety
    const meta = data.message?.usage ?
      `${data.message.usage.input_tokens || 0}↑ ${data.message.usage.output_tokens || 0}↓` : ''

    return this.formatMessage(extracted.text, extracted.badge, meta)
  }

  private createUserMessage(data: any): string | null {
    if (!data.message?.content) return null

    const extracted = this.extractContentFromUser(data.message.content)

    // Escape HTML for user messages
    return this.formatMessage(extracted.text, extracted.badge)
  }

  private createSystemMessage(data: any): string {
    const content = `System: ${data.subtype || 'message'}`
    const meta = data.cwd ? data.cwd : ''
    return this.formatMessage(content, 'System', meta)
  }

  private createResultMessage(data: any): string {
    const content = data.result || 'Task completed'
    return this.formatMessage(content, 'Result')
  }

  private createClaudeResponseMessage(response: any): string {
    // Create a summary content showing key metrics instead of the full text result
    let content = ''
    // Show timing information
    if (response.duration_ms) {
      content += `<strong>Total Time:</strong> ${response.duration_ms}ms`
      if (response.duration_api_ms) {
        content += ` (API: ${response.duration_api_ms}ms)`
      }
      content += '<br>'
    }

    // Show cost information
    if (response.total_cost_usd) {
      content += `<strong>Cost:</strong> $${response.total_cost_usd.toFixed(4)}<br>`
    }

    // Show token usage
    if (response.usage) {
      const usage = response.usage
      const tokens = []
      if (usage.input_tokens) tokens.push(`${usage.input_tokens}↑`)
      if (usage.output_tokens) tokens.push(`${usage.output_tokens}↓`)
      if (usage.cache_read_input_tokens) tokens.push(`${usage.cache_read_input_tokens}(cached)`)
      if (tokens.length > 0) {
        content += `<strong>Tokens:</strong> ${tokens.join(' ')}<br>`
      }
    }

    // Show turn count
    if (response.num_turns) {
      content += `<strong>Turns:</strong> ${response.num_turns}<br>`
    }
    return this.formatMessage(content, 'Claude Complete', "")
  }

  private createFallbackMessage(data: any): string {
    // For Claude JSON responses that don't match known types
    // Display them in a readable format
    const content = typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2)

    // Truncate if too long but ensure we always show something
    const displayContent = content.length > CONFIG.MAX_CONTENT_LENGTH
      ? content.substring(0, CONFIG.MAX_CONTENT_LENGTH) + '...'
      : content

    // Wrap JSON in a pre/code block for better formatting
    const formattedContent = typeof data === 'object'
      ? `<pre style="background:#f5f5f5;padding:6px;border-radius:4px;overflow-x:auto;font-size:8px"><code>${displayContent}</code></pre>`
      : displayContent

    return this.formatMessage(formattedContent, 'Claude')
  }

  private createErrorMessage(data: any): string {
    const errorContent = `<pre style="background:#fee;padding:6px;border-radius:4px;overflow-x:auto;font-size:8px"><code>${JSON.stringify(data)}</code></pre>`
    return this.formatMessage(errorContent, 'Error')
  }

  private formatMessage(content: string, badge?: string, meta?: string): string {
    const badgeHtml = badge ? `<div class="message-badge">${badge}</div>` : ''
    const metaHtml = meta ? `<div class="message-meta">${meta}</div>` : ''
    // Don't escape HTML in content since we're now using HTML formatting
    return `<div class="message-wrapper">${badgeHtml}<div class="message-content">${content}</div>${metaHtml}</div>`
  }

  private formatTodoList(input: any): string {
    if (!input || !input.todos || !Array.isArray(input.todos)) {
      return '<div>No todos found</div>'
    }

    const todos = input.todos
    let html = '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin: 4px 0;">'
    html += '<div style="font-weight: 600; color: #374151; margin-bottom: 6px; font-size: 12px;">📝 Todo List</div>'

    todos.forEach((todo: any) => {
      const status = todo.status || 'pending'
      let statusIcon = '⚪'
      let statusColor = '#6b7280'

      switch (status) {
        case 'completed':
          statusIcon = '✅'
          statusColor = '#059669'
          break
        case 'in_progress':
          statusIcon = '🔄'
          statusColor = '#dc2626'
          break
        case 'pending':
          statusIcon = '⚪'
          statusColor = '#6b7280'
          break
      }

      html += `<div style="display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 11px;">`
      html += `<span style="color: ${statusColor}; flex-shrink: 0;">${statusIcon}</span>`
      html += `<span style="color: #374151; line-height: 1.4;">${HtmlUtils.escapeHtml(todo.content || '')}</span>`
      html += `</div>`
    })

    html += '</div>'
    return html
  }

  private extractContentFromAssistant(content: any[]): { text: string, badge?: string } {
    const items = content.map(item => {
      if (item.type === 'text') {
        return { text: item.text, badge: undefined }
      } else if (item.type === 'tool_use') {
        // Special handling for TodoWrite tool
        if (item.name === 'TodoWrite') {
          const todoContent = this.formatTodoList(item.input)
          return {
            text: todoContent,
            badge: item.name
          }
        } else {
          const toolContent = `${item.input ? yaml.dump(item.input, { indent: 2 }) : ''}`
          return {
            text: `<pre>${HtmlUtils.escapeHtml(toolContent)}</pre>`,
            badge: item.name
          }
        }
      }
      return { text: '', badge: undefined }
    }).filter(item => item.text)
    
    if (items.length === 0) return { text: '' }
    
    const toolUseItem = items.find(item => item.badge)
    if (toolUseItem) {
      return {
        text: items.map(item => item.text).join('\n'),
        badge: toolUseItem.badge
      }
    }
    
    return { text: items.map(item => item.text).join('\n') }
  }

  private extractContentFromUser(content: any[]): { text: string, badge?: string } {
    const items = content.map(item => {
      if (item.type === 'text') {
        return { text: item.text, badge: undefined }
      } else if (item.type === 'tool_result') {
        const result = typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
        return { 
          text: `<pre>${HtmlUtils.escapeHtml(result)}</pre>`,
          badge: 'Tool Result'
        }
      }
      return { text: '', badge: undefined }
    })
    
    const toolResultItem = items.find(item => item.badge)
    if (toolResultItem) {
      return {
        text: items.filter(item => item.text).map(item => item.text).join('\n'),
        badge: toolResultItem.badge
      }
    }

    const filteredItems = items.filter(item => item.text)
    if (filteredItems.length === 0) return { text: '' }

    return { text: filteredItems.map(item => item.text).join('\n') }
  }

  private hashMessage(jsonData: any): string {
    let content = ''
    if (jsonData.type === 'assistant' && jsonData.message?.content) {
      content = this.extractContentFromAssistant(jsonData.message.content).text
    } else if (jsonData.type === 'user' && jsonData.message?.content) {
      content = this.extractContentFromUser(jsonData.message.content).text
    } else {
      content = JSON.stringify(jsonData)
    }
    
    return HtmlUtils.hashString(content || '')
  }
}

// Register the custom element
declare global {
  interface HTMLElementTagNameMap {
    'inspector-toolbar': InspectorToolbar
  }
}