/**
 * Lit-based InspectorToolbar with reactive UI
 */

import { LitElement, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { classMap } from 'lit/directives/class-map.js'
import { createRef, ref, type Ref } from 'lit/directives/ref.js'

import * as yaml from 'js-yaml'

import type { ElementData, PageInfo, SendMessageResponse } from './shared/types'
import { createAIManager, type AIManager, type AIMessageHandler } from './inspector/ai'
import { createElementSelectionManager, type ElementSelectionManager } from './inspector/selection'
import { createInspectionManager, type InspectionManager } from './inspector/inspection'
import { findNearestComponent } from './inspector/detectors'
import { createLogger, type Logger } from './inspector/logger'
import { TOOLBAR_STYLES } from './inspector/style'
import { HtmlUtils } from './utils/html'
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


@customElement('inspector-toolbar')
export class InspectorToolbar extends LitElement {

  @property({ attribute: 'ai-endpoint' })
  private accessor aiEndpoint!: string

  @property({ type: String })
  private accessor cwd: string

  @property({ type: Boolean })
  private accessor verbose: boolean

  // Internal state - all managed through Lit's reactive properties
  @state()
  private accessor isExpanded: boolean

  @state()
  private accessor isInspecting: boolean

  @state()
  private accessor isProcessing: boolean

  @state()
  private accessor sessionId: string

  @state()
  private accessor hasSelectedElements: boolean

  @state()
  private accessor messages: SendMessageResponse[]

  @state()
  private accessor showInitiatingIndicator: boolean

  @state()
  private accessor showProcessingMessage: boolean

  // Managers
  private selectionManager: ElementSelectionManager
  private aiManager: AIManager
  private inspectionManager: InspectionManager
  private logger: Logger

  // Element refs
  private promptInputRef: Ref<HTMLTextAreaElement> = createRef()
  private jsonContentRef: Ref<HTMLDivElement> = createRef()


  // Message formatter state
  private lastMessageHash = ''
  private messageHistory = new Set<string>()
  private todoWriteToolIds = new Set<string>()

  static styles = TOOLBAR_STYLES

  constructor() {
    super()

    // Initialize property defaults
    this.aiEndpoint = ''
    this.cwd = ''
    this.verbose = false
    this.isExpanded = false
    this.isInspecting = false
    this.isProcessing = false
    this.sessionId = ''
    this.hasSelectedElements = false
    this.messages = []
    this.showInitiatingIndicator = false
    this.showProcessingMessage = false

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

  }

  // Helper methods to replace event emissions with direct property updates
  private expandToolbar(): void {
    this.isExpanded = true
  }

  private collapseToolbar(): void {
    this.isExpanded = false
    this.isInspecting = false
  }

  private enterInspectionModeInternal(): void {
    this.enterInspectionMode()
    this.isInspecting = true
  }

  private exitInspectionModeInternal(): void {
    this.exitInspectionMode()
    this.isInspecting = false
  }

  private startProcessing(): void {
    this.isProcessing = true
    this.isInspecting = false
  }

  private endProcessing(): void {
    this.isProcessing = false
  }

  private updateSessionId(sessionId: string | null): void {
    this.sessionId = sessionId || ''
  }



  private addMessage(message: SendMessageResponse): void {
    // Track TodoWrite tool IDs from assistant messages
    if (message.type === 'assistant') {
      this.trackTodoWriteToolIds(message)
    }

    // Skip displaying TodoWrite tool result messages
    if (this.isTodoWriteToolResult(message)) {
      return
    }

    this.messages = [...this.messages, message]

    // Auto-scroll to bottom
    this.updateComplete.then(() => {
      if (this.jsonContentRef.value) {
        this.jsonContentRef.value.scrollTop = this.jsonContentRef.value.scrollHeight
      }
    })
  }

  private clearMessagesInternal(): void {
    this.messages = []
    this.lastMessageHash = ''
    this.messageHistory.clear()
    this.todoWriteToolIds.clear()
  }

  private clearPrompt(): void {
    if (this.promptInputRef.value) {
      this.promptInputRef.value.value = ''
    }
  }

  private clearSelection(): void {
    this.selectionManager.clearAllSelections()
    this.hasSelectedElements = false
  }

  private isTodoWriteToolResult(message: SendMessageResponse): boolean {
    if (message.type !== 'user') return false
    
    const userMessage = message.message
    if (userMessage.content && Array.isArray(userMessage.content)) {
      return userMessage.content.some((block: any) => 
        block.type === 'tool_result' && 
        block.tool_use_id && 
        this.isToolIdFromTodoWrite(block.tool_use_id)
      )
    }
    
    return false
  }

  private isToolIdFromTodoWrite(toolId: string): boolean {
    // Check if this tool_use_id corresponds to a TodoWrite tool call
    // We'll track TodoWrite tool IDs when they're used
    return this.todoWriteToolIds.has(toolId)
  }

  private trackTodoWriteToolIds(message: Extract<SendMessageResponse, { type: 'assistant' }>): void {
    const assistantMessage = message.message
    if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
      assistantMessage.content.forEach((block: any) => {
        if (block.type === 'tool_use' && block.name === 'TodoWrite' && block.id) {
          this.todoWriteToolIds.add(block.id)
        }
      })
    }
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

        ${when(this.showInitiatingIndicator, () => html`
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

  private renderSystemMessage(message: Extract<SendMessageResponse, { type: 'system' }>): { content: string, badge: string, meta: string } {
    const content = `<strong>Model:</strong> ${message.model}<br>`
      + `<strong>Permission Mode:</strong> ${message.permissionMode}<br>`
      + `<strong>Working Directory:</strong> ${message.cwd}<br>`
      + `<strong>API Key Source:</strong> ${message.apiKeySource}<br>`
      + (message.tools?.length ? `<strong>Available Tools:</strong> ${message.tools.length} tools<br><small>${message.tools.slice(0, 5).join(', ')}${message.tools.length > 5 ? '...' : ''}</small><br>` : '')
      + (message.mcp_servers?.length ? `<strong>MCP Servers:</strong> ${message.mcp_servers.length}<br>${message.mcp_servers.map((server: any) => `<small>• ${server.name} (${server.status})</small>`).join('<br>')}<br>` : '')
      + (message.slash_commands?.length ? `<strong>Slash Commands:</strong> ${message.slash_commands.length}<br>` : '')

    return { content, badge: 'System', meta: '' }
  }

  private renderTodoListFromBlock(block: any): { kind: 'html', value: string } {
    return {
      kind: 'html',
      value: this.renderTodos(block.input.todos as Array<{ id: string, content: string, status: string }>)
    }
  }

  private renderAssistantMessage(message: Extract<SendMessageResponse, { type: 'assistant' }>): { content: string, badge: string, meta: string } {
    const assistantMessage = message.message
    type Segment = { kind: 'text', value: string } | { kind: 'html', value: string }
    const segments: Segment[] = []
    let containsTodoList = false
    let toolName = ""
    if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
      assistantMessage.content.forEach((block: any) => {
        if (block.type === 'text' && block.text) {
          segments.push({ kind: 'text', value: block.text })
        } else if (block.type === 'tool_use' && block.name) {
          if (block.name === 'TodoWrite' && block.input && 'todos' in block.input) {
            containsTodoList = true
            segments.push(this.renderTodoListFromBlock(block))
          } else {
            toolName = block.name
            const inputStr = block.input ? yaml.dump(block.input, { indent: 2 }) : '{}'
            segments.push({ kind: 'text', value: inputStr })
          }
        } else if (block.text) {
          segments.push({ kind: 'text', value: block.text })
        }
      })
    }

    if (segments.length === 0) {
      segments.push({ kind: 'text', value: 'No content available' })
    }

    const htmlParts: string[] = []
    segments.forEach(seg => {
      if (seg.kind === 'html') {
        htmlParts.push(seg.value)
      } else {
        const text = seg.value || ''
        const display = text.length > CONFIG.MAX_CONTENT_LENGTH
          ? text.substring(0, CONFIG.MAX_CONTENT_LENGTH) + '...'
          : text
        htmlParts.push(`<pre><code>${HtmlUtils.escapeHtml(display)}</code></pre>`)
      }
    })

    const content = htmlParts.join('')

    // Build meta information with model and token usage
    let metaInfo = ''
    if (assistantMessage.model) {
      metaInfo = `Model: ${assistantMessage.model}`
    }
    if (assistantMessage.usage) {
      const usage = assistantMessage.usage
      const tokens: string[] = []
      if (usage.input_tokens) tokens.push(`${usage.input_tokens}↑`)
      if (usage.output_tokens) tokens.push(`${usage.output_tokens}↓`)
      if (usage.cache_read_input_tokens) tokens.push(`${usage.cache_read_input_tokens}(cached)`)
      if (tokens.length > 0) {
        const tokenInfo = `Tokens: ${tokens.join(' ')}`
        metaInfo = metaInfo ? `${metaInfo} | ${tokenInfo}` : tokenInfo
      }
    }
    ``
    return { content, badge: (containsTodoList ? 'todo' : toolName.length > 0 ? toolName : "Claude"), meta: metaInfo }
  }

  private renderUserMessage(message: Extract<SendMessageResponse, { type: 'user' }>): { content: string, badge: string, meta: string } {
    const userMessage = message.message
    let userContent = 'User message'
    let toolId = ''

    if (userMessage.content && Array.isArray(userMessage.content)) {
      const toolResults = userMessage.content
        .filter((block: any) => block.type === 'tool_result')
        .map((block: any) => {
          const resultContent = block.content ? block.content : 'No content'
          toolId += block.tool_use_id ? `${block.tool_use_id} ` : ''
          return resultContent
        })

      if (toolResults.length > 0) {
        userContent = toolResults.join('\n')
      }
    }

    return { content: HtmlUtils.escapeHtml(userContent), badge: (toolId ? toolId : 'User'), meta: '' }
  }

  private renderResultMessage(message: Extract<SendMessageResponse, { type: 'result' }>): { content: string, badge: string, meta: string } {
    if (message.is_error) {
      const errorText = message.result || message.subtype || 'Unknown error'
      const content = `<strong>Error:</strong> ${HtmlUtils.escapeHtml(errorText)}<br>`
        + `<strong>Duration:</strong> ${message.duration_ms}ms<br>`
        + (message.duration_api_ms ? `<strong>API Duration:</strong> ${message.duration_api_ms}ms<br>` : '')
        + (message.total_cost_usd ? `<strong>Cost:</strong> $${message.total_cost_usd.toFixed(4)}<br>` : '')

      return { content, badge: 'Error', meta: '' }
    } else {
      let content = `<strong>Total Time:</strong> ${message.duration_ms}ms (API: ${message.duration_api_ms}ms)<br>`

      if (message.total_cost_usd) {
        content += `<strong>Cost:</strong> $${message.total_cost_usd.toFixed(4)}<br>`
      }

      if (message.usage) {
        const usage = message.usage
        const tokens: string[] = []
        if (usage.input_tokens) tokens.push(`${usage.input_tokens}↑`)
        if (usage.output_tokens) tokens.push(`${usage.output_tokens}↓`)
        if (usage.cache_read_input_tokens) tokens.push(`${usage.cache_read_input_tokens}(cached)`)
        if (tokens.length > 0) {
          content += `<strong>Tokens:</strong> ${tokens.join(' ')}<br>`
        }
      }

      if (message.num_turns) {
        content += `<strong>Turns:</strong> ${message.num_turns}<br>`
      }

      if (message.permission_denials?.length) {
        content += `<strong>Permission Denials:</strong> ${message.permission_denials.length}<br>`
      }

      // Build meta information with token usage
      let metaInfo = ''
      if (message.usage) {
        const usage = message.usage
        const tokens: string[] = []
        if (usage.input_tokens) tokens.push(`${usage.input_tokens}↑`)
        if (usage.output_tokens) tokens.push(`${usage.output_tokens}↓`)
        if (usage.cache_read_input_tokens) tokens.push(`${usage.cache_read_input_tokens}(cached)`)
        if (tokens.length > 0) {
          metaInfo = `Tokens: ${tokens.join(' ')}`
        }
      }

      return { content, badge: 'Complete', meta: metaInfo }
    }
  }

  // Progress messages have been removed. Fallback rendering is handled by renderUnknownMessage.

  private renderUnknownMessage(message: SendMessageResponse): { content: string, badge: string, meta: string } {
    const badge = `Unknown (${(message as any).type})`
    let fallbackContent: string

    if ('message' in message && typeof (message as any).message === 'string') {
      fallbackContent = (message as any).message
    } else {
      fallbackContent = JSON.stringify(message, null, 2)
    }

    const displayContent = fallbackContent.length > CONFIG.MAX_CONTENT_LENGTH
      ? fallbackContent.substring(0, CONFIG.MAX_CONTENT_LENGTH) + '...'
      : fallbackContent

    const isJsonContent = fallbackContent.startsWith('{') || fallbackContent.startsWith('[')
    const content = isJsonContent
      ? `<pre ><code>${HtmlUtils.escapeHtml(displayContent)}</code></pre>`
      : `${HtmlUtils.escapeHtml(displayContent)}`

    return { content, badge, meta: '' }
  }

  private renderMessage(message: SendMessageResponse) {
    if (!this.shouldShowMessage(message)) {
      return nothing
    }

    let content = ''
    let badge = ''
    let meta = ''

    try {
      const result = (() => {
        switch (message.type) {
          case 'result':
            return this.renderResultMessage(message as Extract<SendMessageResponse, { type: 'result' }>)
          case 'assistant':
            return this.renderAssistantMessage(message as Extract<SendMessageResponse, { type: 'assistant' }>)
          case 'user':
            return this.renderUserMessage(message as Extract<SendMessageResponse, { type: 'user' }>)
          case 'system':
            return this.renderSystemMessage(message as Extract<SendMessageResponse, { type: 'system' }>)
          default:
            return this.renderUnknownMessage(message)
        }
      })()

      content = result.content
      badge = result.badge
      meta = result.meta
    } catch (error) {
      console.error('Error creating message:', error)
      badge = 'Error'
      content = `<pre style="background:#fee;padding:6px;border-radius:4px;overflow-x:auto;font-size:8px"><code>${JSON.stringify(message)}</code></pre>`
    }

    const formattedMessage = this.formatMessage(content, badge, meta)

    return html`
      <div class=${classMap({
        'message': true,
        'assistant': message.type === 'assistant',
        'user': message.type === 'user',
        'system': message.type === 'system',
        'result': message.type === 'result'
      })} .innerHTML=${formattedMessage}></div>
    `
  }

  // Event handlers
  private handleToggle(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    if (!this.isExpanded) {
      this.expandToolbar()

      if (this.selectionManager.getSelectedCount() === 0 && !this.isInspecting && !this.isProcessing) {
        this.enterInspectionModeInternal()
      }
    } else {
      this.collapseToolbar()

      if (this.isInspecting) {
        this.exitInspectionModeInternal()
      }
      this.clearSelection()
      this.clearPrompt()
    }
  }

  private handleInspect() {
    if (!this.isProcessing) {
      this.enterInspectionModeInternal()
    }
  }

  private handleClearElements() {
    this.clearSelection()
  }

  private handleCloseInspection() {
    this.exitInspectionModeInternal()
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
    this.clearMessagesInternal()

    this.enterInspectionModeInternal()

    if (this.aiManager.isInitialized()) {
      try {
        await this.aiManager.newChat()
        this.updateSessionId(this.aiManager.getSessionId())
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
      this.clearMessagesInternal()

      if (this.aiManager.isInitialized()) {
        try {
          await this.aiManager.newChat()
          this.updateSessionId(this.aiManager.getSessionId())
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
    // Update reactive properties
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
      } else if ('host' in currentElement && currentElement.host instanceof Element) {
        currentElement = currentElement.host
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
      this.exitInspectionModeInternal()
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

      const messageHandler: AIMessageHandler = {
        onData: (data: SendMessageResponse) => {
          console.log(JSON.stringify(data))

          // Update session ID from message
          if (data.session_id) {
            this.updateSessionId(data.session_id)
          }

          // Handle system init message
          if (data.type === "system" && data.subtype === "init") {
            this.showInitiatingIndicator = false
            this.showProcessingMessage = true
          }

          // Handle result message - end processing
          if (data.type === 'result') {
            if (this.promptInputRef.value) {
              this.promptInputRef.value.value = ''
            }
            this.showProcessingMessage = false
            this.setProcessingState(false)
          }

          // Add message to display (this should be last to ensure all state is updated)
          this.addMessage(data)
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

      await this.aiManager.sendMessage(
        prompt,
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
      this.startProcessing()
      this.showInitiatingIndicator = true
      this.showProcessingMessage = true
      window.onbeforeunload = () => 'Processing in progress. Are you sure you want to leave?'
    } else {
      this.endProcessing()
      this.showInitiatingIndicator = false
      this.showProcessingMessage = false
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
    this.updateSessionId(this.aiManager.getSessionId())

    // Handle clicks outside to collapse
    document.addEventListener('click', this.handleOutsideClick)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    window.onbeforeunload = null

    this.aiManager.destroy()
    this.inspectionManager.destroy()
    this.selectionManager.clearAllSelections()

    document.removeEventListener('click', this.handleOutsideClick)
  }

  private handleOutsideClick = (e: Event) => {
    if (!this.contains(e.target as Node) && this.isExpanded && !this.isInspecting) {
      this.collapseToolbar()
    }
  }

  private shouldShowMessage(jsonData: SendMessageResponse): boolean {
    // Always show messages that don't have a hash (empty content)
    const messageHash = this.hashMessage(jsonData)
    if (!messageHash) return true

    // Skip exact consecutive duplicates
    if (messageHash === this.lastMessageHash) return false

    // Track message
    this.lastMessageHash = messageHash
    this.messageHistory.add(messageHash)
    if (this.messageHistory.size > CONFIG.MESSAGE_HISTORY_LIMIT) {
      const firstHash = this.messageHistory.values().next().value
      if (firstHash) this.messageHistory.delete(firstHash)
    }

    // Always show messages
    return true
  }

  private renderTodos(todos: Array<{ id: string, content: string, status: string }>): string {
    if (!Array.isArray(todos)) {
      return '<strong>TodoWrite</strong>\nInvalid todos format'
    }

    let html = '<div>'

    todos.forEach(todo => {
      const statusIcon = this.getStatusIcon(todo.status)
      const statusColor = this.getStatusColor(todo.status)
      html += `<div style="margin: 4px 0; display: flex; align-items: flex-start; gap: 8px;">
        <span style="color: ${statusColor}; font-size: 16px; line-height: 1.2; margin-top: 1px;">${statusIcon}</span>
        <span style="flex: 1; color: ${todo.status === 'completed' ? '#666' : 'inherit'}; ${todo.status === 'completed' ? 'text-decoration: line-through;' : ''}">${HtmlUtils.escapeHtml(todo.content)}</span>
      </div>`
    })

    html += '</div>'
    return html
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅'
      case 'in_progress': return '🔄'
      case 'pending': return '⏳'
      default: return '❓'
    }
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#28a745'
      case 'in_progress': return '#007acc'
      case 'pending': return '#ffc107'
      default: return '#6c757d'
    }
  }

  private getBadgeClass(badge: string): string {
    const lowerBadge = badge.toLowerCase()

    // System messages
    if (lowerBadge === 'system') return 'badge-system'

    // Assistant messages
    if (lowerBadge === 'claude') return 'badge-assistant'
    if (lowerBadge === 'todo') return 'badge-todo'

    // Tool-specific badges
    if (lowerBadge.includes('read') || lowerBadge.includes('write') || lowerBadge.includes('edit')) return 'badge-tool-file'
    if (lowerBadge.includes('bash') || lowerBadge.includes('exec')) return 'badge-tool-exec'
    if (lowerBadge.includes('search') || lowerBadge.includes('grep') || lowerBadge.includes('glob')) return 'badge-tool-search'
    if (lowerBadge.includes('web')) return 'badge-tool-web'

    // User messages
    if (lowerBadge === 'user') return 'badge-user'

    // Result messages
    if (lowerBadge === 'complete') return 'badge-complete'
    if (lowerBadge === 'error') return 'badge-error'

    // Default for unknown badges
    return 'badge-default'
  }

  private formatMessage(content: string, badge?: string, meta?: string): string {
    const badgeClass = this.getBadgeClass(badge || '')
    const badgeHtml = badge ? `<span class="badge ${badgeClass}">${badge}</span>` : ''
    const metaHtml = meta ? `<small class="meta">${meta}</small>` : ''
    return `${badgeHtml}<div class="message-content">${content}</div>${metaHtml}</div>`
  }

  private hashMessage(jsonData: SendMessageResponse): string {
    const content = ('message' in jsonData
      ? typeof jsonData.message === 'string'
        ? jsonData.message
        : JSON.stringify(jsonData.message)
      : JSON.stringify(jsonData))
    return HtmlUtils.hashString(content || '')
  }
}

// Register the custom element
declare global {
  interface HTMLElementTagNameMap {
    'inspector-toolbar': InspectorToolbar
  }
}