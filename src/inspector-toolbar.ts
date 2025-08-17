/**
 * Refactored InspectorToolbar using modular architecture
 */

import type { ElementData, PageInfo, SendMessageResponse } from './shared/types'
import { ElementSelectionManager } from './inspector/managers/ElementSelectionManager'
import { AIManager, type AIMessageHandler } from './inspector/managers/AIManager'
import { InspectionManager } from './inspector/managers/InspectionManager'
import { ComponentDetector } from './inspector/detectors/ComponentDetector'
import { UIRenderer } from './inspector/ui/UIRenderer'
import { MessageFormatter } from './inspector/formatters/MessageFormatter'

export class InspectorToolbar extends HTMLElement {
  private isExpanded = false
  private isProcessing = false
  
  // Managers
  private selectionManager = new ElementSelectionManager()
  private aiManager = new AIManager()
  private inspectionManager: InspectionManager
  private messageFormatter = new MessageFormatter()

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
    this.attachEventListeners()
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

  private attachEventListeners(): void {
    if (!this.shadowRoot) return

    const toggleButton = this.shadowRoot.getElementById('toggleButton')
    const toolbarCard = this.shadowRoot.getElementById('toolbarCard')
    const inspectButton = this.shadowRoot.getElementById('inspectButton')
    const clearElementButton = this.shadowRoot.getElementById('clearElementButton')
    const closeInspectButton = this.shadowRoot.getElementById('closeInspectButton')
    const promptInput = this.shadowRoot.getElementById('promptInput') as HTMLTextAreaElement
    const newChatButton = this.shadowRoot.getElementById('newChatButton')
    const jsonClearButton = this.shadowRoot.getElementById('jsonClearButton')

    // Toggle expand/collapse
    toggleButton?.addEventListener('click', (evt) => {
      evt.preventDefault()
      evt.stopPropagation()
      evt.stopImmediatePropagation()

      this.isExpanded = !this.isExpanded
      if (this.isExpanded) {
        toolbarCard?.classList.add('expanded')
        toggleButton.classList.add('active')

        if (this.selectionManager.getSelectedCount() === 0 && !this.inspectionManager.isInInspectionMode() && !this.isProcessing) {
          this.enterInspectionMode()
        }
      } else {
        toolbarCard?.classList.remove('expanded')
        toggleButton.classList.remove('active')

        if (this.inspectionManager.isInInspectionMode()) {
          this.exitInspectionMode()
        }
        this.selectionManager.clearAllSelections()
        this.clearJsonDisplay()
        if (promptInput) promptInput.value = ''
      }
    })

    // Click outside to collapse
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target as Node) && this.isExpanded && !this.inspectionManager.isInInspectionMode()) {
        this.isExpanded = false
        toolbarCard?.classList.remove('expanded')
        toggleButton?.classList.remove('active')
      }
    })

    // Start inspection mode
    inspectButton?.addEventListener('click', () => {
      if (!this.isProcessing) {
        this.enterInspectionMode()
      }
    })

    // Clear selected elements only (keep messages and session)
    clearElementButton?.addEventListener('click', () => {
      this.selectionManager.clearAllSelections()
    })

    // Exit inspection mode
    closeInspectButton?.addEventListener('click', () => {
      this.exitInspectionMode()
    })

    // New chat button
    newChatButton?.addEventListener('click', async () => {
      if (promptInput) promptInput.value = ''
      this.selectionManager.clearAllSelections()
      this.clearJsonDisplay()
      
      if (!this.isProcessing) {
        this.enterInspectionMode()
      }

      if (this.aiManager.isInitialized()) {
        try {
          await this.aiManager.newChat()
          this.updateSessionDisplay()
        } catch (error) {
          console.error('Failed to start new chat:', error)
        }
      } else {
        console.warn('AI manager not initialized')
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

    if (this.isProcessing) {
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
            this.updateSessionDisplay()
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
    this.isProcessing = isProcessing
    const toolbarCard = this.shadowRoot?.getElementById('toolbarCard')

    if (isProcessing) {
      toolbarCard?.classList.add('processing')
    } else {
      toolbarCard?.classList.remove('processing')
    }
  }

  private hideProcessingIndicator(): void {
    const processingIndicator = this.shadowRoot?.getElementById('processingIndicator')
    if (processingIndicator) {
      processingIndicator.style.display = 'none'
    }
  }

  private updateSessionDisplay(): void {
    const sessionInfoElement = this.shadowRoot?.getElementById('sessionInfo')
    const sessionIdElement = this.shadowRoot?.getElementById('sessionId')
    
    if (sessionInfoElement && sessionIdElement) {
      const sessionId = this.aiManager.getSessionId()
      
      if (sessionId) {
        sessionInfoElement.style.display = 'flex'
        sessionIdElement.textContent = sessionId.substring(0, 8)
        sessionIdElement.title = sessionId
      } else {
        sessionInfoElement.style.display = 'none'
      }
    }
  }

  connectedCallback(): void {
    this.aiManager.initialize(this.aiEndpoint)
    this.updateSessionDisplay()
  }

  disconnectedCallback(): void {
    this.aiManager.destroy()
    this.inspectionManager.destroy()
    this.selectionManager.clearAllSelections()
  }
}

// Register the custom element
customElements.define('inspector-toolbar', InspectorToolbar)