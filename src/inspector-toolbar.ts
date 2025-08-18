/**
 * Functional InspectorToolbar with minimal class usage
 */

import type { ElementData, PageInfo, SendMessageResponse } from './shared/types'
import { createAIManager, type AIManager, type AIMessageHandler } from './inspector/ai'
import { createElementSelectionManager, type ElementSelectionManager } from './inspector/selection'
import { createInspectionManager, type InspectionManager } from './inspector/inspection'
import { createToolbarStateManager, type ToolbarStateManager } from './inspector/state'
import { findNearestComponent } from './inspector/detectors'
import { 
  renderToolbar, 
  createMessageFormatter, 
  type MessageFormatter,
  updateExpandedState,
  updateInspectionState,
  updateProcessingState,
  updateSessionDisplay,
  updateClearButtonVisibility,
  clearPromptInput,
  showNotification,
  showProcessingIndicator,
  hideProcessingIndicator,
  hideProcessingMessage,
  displayJsonMessage,
  clearJsonDisplay
} from './inspector/ui'
import { createToolbarEventEmitter } from './inspector/events'

export class InspectorToolbar extends HTMLElement {
  // Event-driven architecture
  private events = createToolbarEventEmitter()
  private stateManager: ToolbarStateManager
  
  // Managers
  private selectionManager: ElementSelectionManager
  private aiManager: AIManager
  private inspectionManager: InspectionManager
  private messageFormatter: MessageFormatter


  // Event cleanup functions
  private cleanupFunctions: (() => void)[] = []

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    
    // Initialize managers using factory functions
    this.stateManager = createToolbarStateManager(this.events)
    this.selectionManager = createElementSelectionManager()
    this.aiManager = createAIManager()
    this.inspectionManager = createInspectionManager(
      (element) => this.handleElementSelection(element),
      (element) => this.shouldIgnoreElement(element),
      (element) => this.selectionManager.hasElement(element)
    )
    this.messageFormatter = createMessageFormatter()
    
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
    this.shadowRoot.innerHTML = renderToolbar()

    // Set initial clear button visibility
    updateClearButtonVisibility(this.shadowRoot, false)
  }

  private setupEventListeners(): void {
    // Listen to state changes and update UI accordingly
    this.cleanupFunctions.push(
      this.events.on('ui:expand', () => updateExpandedState(this.shadowRoot, true)),
      this.events.on('ui:collapse', () => updateExpandedState(this.shadowRoot, false)),
      this.events.on('ui:enter-inspection', () => {
        this.enterInspectionMode()
        updateInspectionState(this.shadowRoot, true)
      }),
      this.events.on('ui:exit-inspection', () => {
        this.exitInspectionMode() 
        updateInspectionState(this.shadowRoot, false)
      }),
      this.events.on('ui:processing-start', () => updateProcessingState(this.shadowRoot, true)),
      this.events.on('ui:processing-end', () => updateProcessingState(this.shadowRoot, false)),
      this.events.on('session:updated', ({ sessionId }) => updateSessionDisplay(this.shadowRoot, sessionId, this.stateManager.isProcessing())),
      this.events.on('selection:changed', () => this.updateSelectionDisplay()),
      this.events.on('messages:add', (message) => this.displayMessage(message)),
      this.events.on('messages:clear', () => this.clearMessagesDisplay()),
      this.events.on('prompt:clear', () => clearPromptInput(this.shadowRoot)),
      this.events.on('selection:clear', () => {
        this.selectionManager.clearAllSelections()
        updateClearButtonVisibility(this.shadowRoot, false)
      }),
      this.events.on('notification:show', ({ message, type }) => {
        if (type === 'info') {
          showNotification(message, 'success') // Map info to success for now
        } else {
          showNotification(message, type)
        }
      }),
    )
  }

  // UI helper methods

  private updateSelectionDisplay(): void {
    const hasSelectedElements = this.selectionManager.getSelectedCount() > 0
    updateClearButtonVisibility(this.shadowRoot, hasSelectedElements)
  }

  private displayMessage(message: SendMessageResponse): void {
    displayJsonMessage(this.shadowRoot, message, this.messageFormatter)
  }


  private clearMessagesDisplay(): void {
    clearJsonDisplay(this.shadowRoot)
    this.messageFormatter.clearMessages()
  }

  private attachDOMEventListeners(): void {
    if (!this.shadowRoot) return

    const toggleButton = this.shadowRoot.getElementById('toggleButton')
    const inspectButton = this.shadowRoot.getElementById('inspectButton')
    const clearElementButton = this.shadowRoot.getElementById('clearElementButton')
    const closeInspectButton = this.shadowRoot.getElementById('closeInspectButton')
    const promptInput = this.shadowRoot.getElementById('promptInput') as HTMLTextAreaElement
    const newChatButton = this.shadowRoot.getElementById('newChatButton')
    const cancelButton = this.shadowRoot.getElementById('cancelButton')

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
        // Don't clear messages when just collapsing - only clear selection and prompt
        this.events.emit('selection:clear', undefined)
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
      // Prevent new chat while processing
      if (this.stateManager.isProcessing()) {
        console.log('Cannot start new chat while processing')
        return
      }

      if (promptInput) promptInput.value = ''
      this.selectionManager.clearAllSelections()
      updateClearButtonVisibility(this.shadowRoot, false)
      clearJsonDisplay(this.shadowRoot)
      this.messageFormatter.clearMessages()

      this.events.emit('ui:enter-inspection', undefined)

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
    cancelButton?.addEventListener('click', async () => {
      if (this.aiManager.isProcessing()) {
        this.aiManager.cancel()
        this.setProcessingState(false)
        showNotification('Request cancelled', 'success')
        
        // Start new chat after canceling
        if (promptInput) promptInput.value = ''
        this.selectionManager.clearAllSelections()
        updateClearButtonVisibility(this.shadowRoot, false)
        clearJsonDisplay(this.shadowRoot)
        this.messageFormatter.clearMessages()

        if (this.aiManager.isInitialized()) {
          try {
            await this.aiManager.newChat()
            this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })
          } catch (error) {
            console.error('Failed to start new chat after cancel:', error)
          }
        }
      }
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
      this.selectionManager.selectElement(element, findNearestComponent)
    }
    const hasSelectedElements = this.selectionManager.getSelectedCount() > 0
    updateClearButtonVisibility(this.shadowRoot, hasSelectedElements)
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
      this.events.emit('ui:exit-inspection', undefined)
    }

    const pageInfo = this.getCurrentPageInfo()
    const selectedElementsHierarchy = this.selectionManager.buildHierarchicalStructure(
      findNearestComponent
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
          if (data.type === 'claude_json') {
            hideProcessingIndicator(this.shadowRoot)
            displayJsonMessage(this.shadowRoot, data.claudeJson, this.messageFormatter)
          } else if (data.type === 'claude_response') {
            hideProcessingMessage(this.shadowRoot)
            displayJsonMessage(this.shadowRoot, data.claudeResponse, this.messageFormatter)
          } else if (data.type === 'complete') {
            if (promptInput) promptInput.value = ''
            hideProcessingIndicator(this.shadowRoot)
            hideProcessingMessage(this.shadowRoot)
            this.setProcessingState(false)
          }
          
          // Update session display when session ID is received
          if ((data.type === 'complete' || data.type === 'claude_response' || data.type === 'claude_json') && data.sessionId) {
            this.events.emit('session:updated', { sessionId: data.sessionId })
          }
        },
        onError: (error) => {
          console.error('AI subscription error:', error)
          showNotification('Failed to send message', 'error')
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







  private setProcessingState(isProcessing: boolean): void {
    if (isProcessing) {
      showProcessingIndicator(this.shadowRoot)
      this.events.emit('ui:processing-start', undefined)
      window.onbeforeunload = () => 'Processing in progress. Are you sure you want to leave?'
    } else {
      this.events.emit('ui:processing-end', undefined)
      window.onbeforeunload = null
    }
  }


  connectedCallback(): void {
    // Only initialize if not already initialized to prevent duplicates
    if (!this.aiManager.isInitialized()) {
      this.aiManager.initialize(this.aiEndpoint)
    }
    this.events.emit('session:updated', { sessionId: this.aiManager.getSessionId() })
  }

  disconnectedCallback(): void {
    window.onbeforeunload = null

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