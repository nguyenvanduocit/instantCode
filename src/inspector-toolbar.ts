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
import { createToolbarStateManager, type ToolbarStateManager } from './inspector/state'
import { findNearestComponent } from './inspector/detectors'
import { createLogger, type Logger } from './inspector/logger'
import { createMessageFormatter, type MessageFormatter } from './inspector/ui'
import { createToolbarEventEmitter } from './inspector/events'
import { TOOLBAR_STYLES } from './inspector/style'

@customElement('inspector-toolbar')
export class InspectorToolbar extends LitElement {
  // Reactive properties
  @property({ attribute: 'ai-endpoint' })
  aiEndpoint = ''

  @property()
  cwd = ''

  @property({ type: Boolean })
  verbose = false

  // Internal state
  @state()
  private isExpanded = false

  @state()
  private isInspecting = false

  @state()
  private isProcessing = false

  @state()
  private sessionId = ''

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
  private stateManager: ToolbarStateManager
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

  static styles = TOOLBAR_STYLES

  constructor() {
    super()

    // Initialize logger first
    this.logger = createLogger(this.verbose)

    // Initialize managers using factory functions
    this.stateManager = createToolbarStateManager(this.events)
    this.selectionManager = createElementSelectionManager()
    this.aiManager = createAIManager(this.verbose)
    this.inspectionManager = createInspectionManager(
      (element) => this.handleElementSelection(element),
      (element) => this.shouldIgnoreElement(element),
      (element) => this.selectionManager.hasElement(element)
    )
    this.messageFormatter = createMessageFormatter()

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen to state changes and update reactive properties
    this.cleanupFunctions.push(
      this.events.on('ui:expand', () => {
        this.isExpanded = true
      }),
      this.events.on('ui:collapse', () => {
        this.isExpanded = false
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
      }),
      this.events.on('ui:processing-end', () => {
        this.isProcessing = false
      }),
      this.events.on('session:updated', ({ sessionId }) => {
        this.sessionId = sessionId || ''
      }),
      this.events.on('selection:changed', () => {
        this.hasSelectedElements = this.selectionManager.getSelectedCount() > 0
      }),
      this.events.on('messages:add', (message) => {
        this.messages = [...this.messages, message]
        this.requestUpdate()
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
          'visible': !!this.sessionId
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
    this.stateManager.destroy()
    this.events.cleanup()
    this.cleanupFunctions.forEach(cleanup => cleanup())

    document.removeEventListener('click', this.handleOutsideClick)
  }

  private handleOutsideClick = (e: Event) => {
    if (!this.contains(e.target as Node) && this.isExpanded && !this.isInspecting) {
      this.events.emit('ui:collapse', undefined)
    }
  }
}

// Register the custom element
declare global {
  interface HTMLElementTagNameMap {
    'inspector-toolbar': InspectorToolbar
  }
}