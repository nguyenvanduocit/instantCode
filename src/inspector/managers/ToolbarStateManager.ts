/**
 * Centralized state manager for the toolbar using event-driven architecture
 * Coordinates state between UI, selection, AI, and session management
 */

import { ToolbarEventEmitter } from '../events/ToolbarEvents'
import type { ElementData, SendMessageResponse } from '../../shared/types'

export interface ToolbarState {
  isExpanded: boolean
  isInspecting: boolean
  isProcessing: boolean
  sessionId: string | null
  selectedElements: ElementData[]
  messages: SendMessageResponse[]
}

export class ToolbarStateManager {
  private state: ToolbarState
  private events: ToolbarEventEmitter
  private cleanupFunctions: (() => void)[] = []

  constructor(eventEmitter: ToolbarEventEmitter) {
    this.events = eventEmitter
    this.state = {
      isExpanded: false,
      isInspecting: false,
      isProcessing: false,
      sessionId: null,
      selectedElements: [],
      messages: []
    }
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // UI State Events
    this.cleanupFunctions.push(
      this.events.on('ui:expand', () => {
        this.state.isExpanded = true
        this.onStateChange()
      }),
      
      this.events.on('ui:collapse', () => {
        this.state.isExpanded = false
        this.state.isInspecting = false
        this.onStateChange()
      }),
      
      this.events.on('ui:enter-inspection', () => {
        this.state.isInspecting = true
        this.onStateChange()
      }),
      
      this.events.on('ui:exit-inspection', () => {
        this.state.isInspecting = false
        this.onStateChange()
      }),
      
      this.events.on('ui:processing-start', () => {
        this.state.isProcessing = true
        this.state.isInspecting = false
        this.onStateChange()
      }),
      
      this.events.on('ui:processing-end', () => {
        this.state.isProcessing = false
        this.onStateChange()
      })
    )

    // Selection Events
    this.cleanupFunctions.push(
      this.events.on('selection:changed', (elements) => {
        this.state.selectedElements = elements
        this.onStateChange()
      }),
      
      this.events.on('selection:clear', () => {
        this.state.selectedElements = []
        this.onStateChange()
      })
    )

    // Session Events
    this.cleanupFunctions.push(
      this.events.on('session:updated', ({ sessionId }) => {
        this.state.sessionId = sessionId
        this.onStateChange()
      }),
      
      this.events.on('session:new', () => {
        this.state.sessionId = null
        this.state.selectedElements = []
        this.state.messages = []
        this.onStateChange()
      })
    )

    // Message Events
    this.cleanupFunctions.push(
      this.events.on('messages:add', (message) => {
        this.state.messages.push(message)
        
        // Update session ID from message if available
        if ((message.type === 'claude_json' || message.type === 'claude_response' || message.type === 'complete') && message.sessionId) {
          this.state.sessionId = message.sessionId
        }
        
        // Handle processing state based on message type
        if (message.type === 'complete') {
          this.state.isProcessing = false
        }
        
        this.onStateChange()
      }),
      
      this.events.on('messages:clear', () => {
        this.state.messages = []
        this.onStateChange()
      })
    )

    // Prompt Events
    this.cleanupFunctions.push(
      this.events.on('prompt:clear', () => {
        // Could trigger other state changes if needed
        this.onStateChange()
      })
    )
  }

  // Called whenever state changes - can be used for debugging or additional coordination
  private onStateChange(): void {
    // console.log('Toolbar state changed:', this.state)
    // Could emit a general 'state:changed' event if other components need to react
  }

  // Getters for accessing state
  getState(): Readonly<ToolbarState> {
    return { ...this.state }
  }

  isExpanded(): boolean {
    return this.state.isExpanded
  }

  isInspecting(): boolean {
    return this.state.isInspecting
  }

  isProcessing(): boolean {
    return this.state.isProcessing
  }

  getSessionId(): string | null {
    return this.state.sessionId
  }

  getSelectedElements(): ElementData[] {
    return [...this.state.selectedElements]
  }

  getMessages(): SendMessageResponse[] {
    return [...this.state.messages]
  }

  // Cleanup
  destroy(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup())
    this.cleanupFunctions = []
  }
}