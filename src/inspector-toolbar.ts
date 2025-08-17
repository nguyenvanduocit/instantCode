/**
 * Refactored InspectorToolbar using event-driven architecture
 */

import type { ElementData, PageInfo, SendMessageResponse } from './shared/types'
import { ElementSelectionManager } from './inspector/managers/ElementSelectionManager'
import { AIManager, type AIMessageHandler } from './inspector/managers/AIManager'
import { InspectionManager } from './inspector/managers/InspectionManager'
import { ComponentDetector } from './inspector/detectors/ComponentDetector'
import { UIRenderer } from './inspector/ui/UIRenderer'
import { MessageFormatter } from './inspector/formatters/MessageFormatter'
import { ToolbarEventEmitter } from './inspector/events/ToolbarEvents'
import { ToolbarStateManager } from './inspector/managers/ToolbarStateManager'

export class InspectorToolbar extends HTMLElement {
  // Event-driven architecture
  private events = new ToolbarEventEmitter()
  private stateManager = new ToolbarStateManager(this.events)
  
  // Managers
  private selectionManager = new ElementSelectionManager()
  private aiManager = new AIManager()
  private inspectionManager: InspectionManager
  private messageFormatter = new MessageFormatter()

  // Event cleanup functions
  private cleanupFunctions: (() => void)[] = []

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    
    // Initialize inspection manager with callbacks
    this.inspectionManager = new InspectionManager(
      (element) => this.handleElementSelection(element),
      (element) => this.shouldIgnoreElement(element),
      (element) => this.selectionManager.hasElement(element)
    )
    
    this.render()
    this.setupEventListeners()
    this.attachDOMEventListeners()
  }

  get aiEndpoint(): string {
    return this.getAttribute('ai-endpoint') || ''
  }

  set aiEndpoint(value: string) {
    if (value) {
      this.setAttribute('ai-endpoint', value)
    } else {
      this.removeAttribute('ai-endpoint')
    }
  }

  get cwd(): string {
    return this.getAttribute('cwd') || ''
  }

  set cwd(value: string) {
    if (value) {
      this.setAttribute('cwd', value)
    } else {
      this.removeAttribute('cwd')
    }
  }

  private render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = UIRenderer.renderToolbar()
  }

  private setupEventListeners(): void {
    // Listen to state changes and update UI accordingly
    this.cleanupFunctions.push(
      this.events.on('ui:expand', () => this.updateExpandedState(true)),
      this.events.on('ui:collapse', () => this.updateExpandedState(false)),
      this.events.on('ui:enter-inspection', () => this.updateInspectionState(true)),
      this.events.on('ui:exit-inspection', () => this.updateInspectionState(false)),
      this.events.on('ui:processing-start', () => this.updateProcessingState(true)),
      this.events.on('ui:processing-end', () => this.updateProcessingState(false)),
      this.events.on('session:updated', ({ sessionId }) => this.updateSessionDisplay(sessionId)),
      this.events.on('selection:changed', () => this.updateSelectionDisplay()),
      this.events.on('messages:add', (message) => this.displayMessage(message)),
      this.events.on('messages:clear', () => this.clearMessagesDisplay()),
      this.events.on('prompt:clear', () => this.clearPromptInput()),
      this.events.on('selection:clear', () => this.selectionManager.clearAllSelections()),
      this.events.on('notification:show', ({ message, type }) => {
        if (type === 'info') {
          this.showNotification(message, 'success') // Map info to success for now
        } else {
          this.showNotification(message, type)
        }
      })
    )
  }

  // UI update methods triggered by events
  private updateExpandedState(isExpanded: boolean): void {
    const toolbarCard = this.shadowRoot?.getElementById('toolbarCard')
    const toggleButton = this.shadowRoot?.getElementById('toggleButton')

    if (isExpanded) {
      toolbarCard?.classList.add('expanded')
      toggleButton?.classList.add('active')
    } else {
      toolbarCard?.classList.remove('expanded')
      toggleButton?.classList.remove('active')
    }
  }

  private updateInspectionState(isInspecting: boolean): void {
    const toolbarCard = this.shadowRoot?.querySelector('.toolbar-card')

    if (isInspecting) {
      toolbarCard?.classList.add('inspecting')
    } else {
      toolbarCard?.classList.remove('inspecting')
    }
  }

  private updateProcessingState(isProcessing: boolean): void {
    const toolbarCard = this.shadowRoot?.getElementById('toolbarCard')

    if (isProcessing) {
      toolbarCard?.classList.add('processing')
    } else {
      toolbarCard?.classList.remove('processing')
    }
  }

  private updateSessionDisplay(sessionId?: string | null): void {
    const sessionInfoElement = this.shadowRoot?.getElementById('sessionInfo')
    const sessionIdElement = this.shadowRoot?.getElementById('sessionId')
    const cancelButton = this.shadowRoot?.getElementById('cancelButton')

    if (sessionInfoElement && sessionIdElement) {
      if (sessionId) {
        sessionInfoElement.style.display = 'flex'
        sessionIdElement.textContent = sessionId.substring(0, 8)
        sessionIdElement.title = sessionId
      } else {
        sessionInfoElement.style.display = 'none'
      }

      // Show/hide cancel button based on processing state
      if (cancelButton) {
        if (this.stateManager.isProcessing()) {
          cancelButton.style.display = 'inline-flex'
        } else {
          cancelButton.style.display = 'none'
        }
      }
    }
  }

  private updateSelectionDisplay(): void {
    // Could update selection count or other selection-related UI here
  }

  private displayMessage(message: SendMessageResponse): void {
    this.displayJsonMessage(message)
  }

  private clearMessagesDisplay(): void {
    this.clearJsonDisplay()
  }

  private clearPromptInput(): void {
    const promptInput = this.shadowRoot?.getElementById('promptInput') as HTMLTextAreaElement
    if (promptInput) promptInput.value = ''
  }

  private attachDOMEventListeners(): void {
    if (!this.shadowRoot) return

    const toggleButton = this.shadowRoot.getElementById('toggleButton')
    const toolbarCard = this.shadowRoot.getElementById('toolbarCard')
    const inspectButton = this.shadowRoot.getElementById('inspectButton')
    const clearElementButton = this.shadowRoot.getElementById('clearElementButton')
    const closeInspectButton = this.shadowRoot.getElementById('closeInspectButton')
    const promptInput = this.shadowRoot.getElementById('promptInput') as HTMLTextAreaElement
    const newChatButton = this.shadowRoot.getElementById('newChatButton')
    const cancelButton = this.shadowRoot.getElementById('cancelButton')
    const jsonClearButton = this.shadowRoot.getElementById('jsonClearButton')

    // Toggle expand/collapse
    toggleButton?.addEventListener('click', (evt) => {
      evt.preventDefault()
      evt.stopPropagation()
      evt.stopImmediatePropagation()

      const isCurrentlyExpanded = this.stateManager.isExpanded()

      if (!isCurrentlyExpanded) {
        this.events.emit('ui:expand', undefined)

        if (this.selectionManager.getSelectedCount() === 0 && !this.inspectionManager.isInInspectionMode() && !this.stateManager.isProcessing()) {
          this.events.emit('ui:enter-inspection', undefined)
        }
      } else {
        this.events.emit('ui:collapse', undefined)

        if (this.inspectionManager.isInInspectionMode()) {
          this.events.emit('ui:exit-inspection', undefined)
        }
        this.events.emit('selection:clear', undefined)
        this.events.emit('messages:clear', undefined)
        this.events.emit('prompt:clear', undefined)
      }
    })

    // Click outside to collapse
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target as Node) && this.stateManager.isExpanded() && !this.inspectionManager.isInInspectionMode()) {
        this.events.emit('ui:collapse', undefined)
      }
    })

    // Start inspection mode
    inspectButton?.addEventListener('click', () => {
      if (!this.stateManager.isProcessing()) {
        this.events.emit('ui:enter-inspection', undefined)
      }
    })

    // Clear selected elements only (keep messages and session)
    clearElementButton?.addEventListener('click', () => {
      this.events.emit('selection:clear', undefined)
    })

    // Exit inspection mode
    closeInspectButton?.addEventListener('click', () => {
      this.events.emit('ui:exit-inspection', undefined)
    })

    // New chat button
    newChatButton?.addEventListener('click', async () => {
      if (promptInput) promptInput.value = ''
      this.selectionManager.clearAllSelections()
      this.clearJsonDisplay()
      
      if (!this.stateManager.isProcessing()) {
        this.enterInspectionMode()
      }

      if (this.aiManager.isInitialized()) {
        try {
          await this.aiManager.newChat()
          this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })
        } catch (error) {
          console.error('Failed to start new chat:', error)
        }
      } else {
        console.warn('AI manager not initialized')
      }
    })

    // Cancel button
    cancelButton?.addEventListener('click', () => {
      if (this.aiManager.isProcessing()) {
        this.aiManager.cancel()
        this.setProcessingState(false)
        this.showNotification('Request cancelled', 'success')
      }
    })

    // JSON clear button
    jsonClearButton?.addEventListener('click', () => {
      this.clearJsonDisplay()
    })

    // Handle prompt input
    promptInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.handlePromptSubmit(promptInput.value.trim())
      }
    })
  }

  private enterInspectionMode(): void {
    setTimeout(() => {
      const promptInput = this.shadowRoot?.getElementById('promptInput') as HTMLTextAreaElement
      promptInput?.focus()
    }, 100)

    this.inspectionManager.enterInspectionMode()
    this.shadowRoot?.querySelector('.toolbar-card')?.classList.add('inspecting')
  }

  private exitInspectionMode(): void {
    this.inspectionManager.exitInspectionMode()
    this.shadowRoot?.querySelector('.toolbar-card')?.classList.remove('inspecting')
  }

  private handleElementSelection(element: Element): void {
    if (this.selectionManager.hasElement(element)) {
      this.selectionManager.deselectElement(element)
    } else {
      this.selectionManager.selectElement(element, ComponentDetector.findNearestComponent)
    }
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
      console.log('Empty prompt, nothing to process')
      return
    }

    if (this.stateManager.isProcessing()) {
      console.log('Already processing, ignoring new prompt')
      return
    }

    console.log('AI Prompt submitted:', prompt)
    console.log('Selected elements:', Array.from(this.selectionManager.getSelectedElements().keys()))

    // Exit inspection mode when prompt is submitted
    if (this.inspectionManager.isInInspectionMode()) {
      this.exitInspectionMode()
    }

    const pageInfo = this.getCurrentPageInfo()
    const selectedElementsHierarchy = this.selectionManager.buildHierarchicalStructure(
      ComponentDetector.findNearestComponent
    )

    if (this.aiEndpoint) {
      await this.callAI(prompt, selectedElementsHierarchy, pageInfo)
    } else {
      console.warn('No AI endpoint provided. Set the ai-endpoint attribute to use AI features.')
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
      console.warn('No AI endpoint specified')
      return
    }

    const promptInput = this.shadowRoot?.getElementById('promptInput') as HTMLTextAreaElement
    const originalPromptText = promptInput?.value || ''

    try {
      if (!this.aiManager.isInitialized()) {
        throw new Error('AI manager not initialized')
      }

      this.setProcessingState(true)

      const messageHandler: AIMessageHandler = {
        onData: (data: SendMessageResponse) => {
          console.log('SSE data received:', data)
          
          if (data.type === 'claude_json') {
            this.hideProcessingIndicator()
            this.displayJsonMessage(data.claudeJson)
          } else if (data.type === 'complete') {
            console.log('AI request completed with session ID:', data.sessionId)
            if (promptInput) promptInput.value = ''
            this.setProcessingState(false)
          }
          
          // Update session display when session ID is received
          if ((data.type === 'complete' || data.type === 'claude_response' || data.type === 'claude_json') && data.sessionId) {
            this.events.emit('session:updated', { sessionId: data.sessionId })
          }
        },
        onError: (error) => {
          console.error('AI subscription error:', error)
          this.showNotification('Failed to send message', 'error')
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
      console.error('Error calling AI endpoint:', error)

      if (promptInput) promptInput.value = originalPromptText
      this.setProcessingState(false)

      console.error('Error calling AI endpoint:', (error as Error).message || 'Failed to connect to AI service')
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    console.log(`${type}: ${message}`)
  }

  private displayJsonMessage(jsonData: any): void {
    const jsonDisplay = this.shadowRoot?.getElementById('jsonDisplay')
    const jsonContent = this.shadowRoot?.getElementById('jsonContent')

    if (!jsonDisplay || !jsonContent) return

    if (!this.messageFormatter.shouldDisplayMessage(jsonData)) {
      return
    }
    
    jsonDisplay.classList.add('show')

    const messageElement = document.createElement('div')
    messageElement.classList.add('json-message', jsonData.type || 'generic')
    messageElement.innerHTML = this.messageFormatter.formatClaudeMessage(jsonData)

    jsonContent.appendChild(messageElement)
    jsonContent.scrollTop = jsonContent.scrollHeight
  }

  private clearJsonDisplay(): void {
    const jsonDisplay = this.shadowRoot?.getElementById('jsonDisplay')
    const jsonContent = this.shadowRoot?.getElementById('jsonContent')

    if (!jsonDisplay || !jsonContent) return

    jsonContent.innerHTML = ''
    jsonDisplay.classList.remove('show')
    this.messageFormatter.clearHistory()
  }





  private setProcessingState(isProcessing: boolean): void {
    if (isProcessing) {
      this.events.emit('ui:processing-start', undefined)
    } else {
      this.events.emit('ui:processing-end', undefined)
    }
  }

  private hideProcessingIndicator(): void {
    const processingIndicator = this.shadowRoot?.getElementById('processingIndicator')
    if (processingIndicator) {
      processingIndicator.style.display = 'none'
    }
  }


  connectedCallback(): void {
    this.aiManager.initialize(this.aiEndpoint)
    this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })
  }

  disconnectedCallback(): void {
    this.aiManager.destroy()
    this.inspectionManager.destroy()
    this.selectionManager.clearAllSelections()
    this.stateManager.destroy()
    this.events.cleanup()
    this.cleanupFunctions.forEach(cleanup => cleanup())
  }
}

// Register the custom element
customElements.define('inspector-toolbar', InspectorToolbar)