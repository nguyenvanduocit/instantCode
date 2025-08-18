/**
 * State Manager for toolbar state management with event listeners
 */

import type { ElementData, SendMessageResponse } from '../shared/types'
import { ToolbarEventEmitter } from './events'

export interface ToolbarState {
  isExpanded: boolean
  isInspecting: boolean
  isProcessing: boolean
  sessionId: string | null
  selectedElements: ElementData[]
  messages: SendMessageResponse[]
  tokenCounts: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
  }
}

export interface ToolbarStateManager {
  getState(): Readonly<ToolbarState>
  isExpanded(): boolean
  isInspecting(): boolean
  isProcessing(): boolean
  getSessionId(): string | null
  getSelectedElements(): ElementData[]
  getMessages(): SendMessageResponse[]
  getTokenCounts(): { inputTokens: number, outputTokens: number, cacheReadTokens: number }
  destroy(): void
}

export function createToolbarStateManager(eventEmitter: ToolbarEventEmitter): ToolbarStateManager {
  const state: ToolbarState = {
    isExpanded: false,
    isInspecting: false,
    isProcessing: false,
    sessionId: null,
    selectedElements: [],
    messages: [],
    tokenCounts: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0
    }
  }

  const cleanupFunctions: (() => void)[] = []

  function onStateChange(): void {
  // console.log('Toolbar state changed:', state)
  }

  function setupEventListeners(): void {
    cleanupFunctions.push(
      eventEmitter.on('ui:expand', () => {
        state.isExpanded = true
        onStateChange()
      }),
      
      eventEmitter.on('ui:collapse', () => {
        state.isExpanded = false
        state.isInspecting = false
        onStateChange()
      }),
      
      eventEmitter.on('ui:enter-inspection', () => {
        state.isInspecting = true
        onStateChange()
      }),
      
      eventEmitter.on('ui:exit-inspection', () => {
        state.isInspecting = false
        onStateChange()
      }),
      
      eventEmitter.on('ui:processing-start', () => {
        state.isProcessing = true
        state.isInspecting = false
        onStateChange()
      }),
      
      eventEmitter.on('ui:processing-end', () => {
        state.isProcessing = false
        onStateChange()
      })
    )

    cleanupFunctions.push(
      eventEmitter.on('selection:changed', (elements) => {
        state.selectedElements = elements
        onStateChange()
      }),
      
      eventEmitter.on('selection:clear', () => {
        state.selectedElements = []
        onStateChange()
      })
    )

    cleanupFunctions.push(
      eventEmitter.on('session:updated', ({ sessionId }) => {
        state.sessionId = sessionId
        onStateChange()
      }),
      
      eventEmitter.on('session:new', () => {
        state.sessionId = null
        state.selectedElements = []
        state.messages = []
        state.tokenCounts = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0
        }
        onStateChange()
      })
    )

    cleanupFunctions.push(
      eventEmitter.on('messages:add', (message) => {
        state.messages.push(message)
        
        if ((message.type === 'claude_json' || message.type === 'claude_response' || message.type === 'complete') && message.sessionId) {
          state.sessionId = message.sessionId
        }
        
        if (message.type === 'complete') {
          state.isProcessing = false
        }
        
        onStateChange()
      }),
      
      eventEmitter.on('messages:clear', () => {
        state.messages = []
        onStateChange()
      })
    )

    cleanupFunctions.push(
      eventEmitter.on('prompt:clear', () => {
        onStateChange()
      })
    )
  }

  // Initialize event listeners
  setupEventListeners()

  return {
    getState(): Readonly<ToolbarState> {
      return { ...state }
    },

    isExpanded(): boolean {
      return state.isExpanded
    },

    isInspecting(): boolean {
      return state.isInspecting
    },

    isProcessing(): boolean {
      return state.isProcessing
    },

    getSessionId(): string | null {
      return state.sessionId
    },

    getSelectedElements(): ElementData[] {
      return [...state.selectedElements]
    },

    getMessages(): SendMessageResponse[] {
      return [...state.messages]
    },

    getTokenCounts(): { inputTokens: number, outputTokens: number, cacheReadTokens: number } {
      return { ...state.tokenCounts }
    },

    destroy(): void {
      cleanupFunctions.forEach(cleanup => cleanup())
      cleanupFunctions.length = 0
    }
  }
}