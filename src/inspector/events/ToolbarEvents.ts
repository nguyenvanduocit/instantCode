/**
 * Internal event system for the inspector toolbar component
 * Uses mitt for clean event-driven state management within the toolbar only
 */

import mitt, { type Emitter } from 'mitt'
import type { ElementData, SendMessageResponse } from '../../shared/types'

export type ToolbarInternalEvents = {
  // UI State Events
  'ui:expand': void
  'ui:collapse': void
  'ui:enter-inspection': void
  'ui:exit-inspection': void
  'ui:processing-start': void
  'ui:processing-end': void
  
  // Element Selection Events
  'selection:add': Element
  'selection:remove': Element
  'selection:clear': void
  'selection:changed': ElementData[]
  
  // Session Events
  'session:updated': { sessionId: string | null }
  'session:new': void
  
  // Message Events
  'messages:clear': void
  'messages:add': SendMessageResponse
  
  // Prompt Events
  'prompt:submit': { prompt: string }
  'prompt:clear': void
  
  // Notification Events
  'notification:show': { message: string; type: 'success' | 'error' | 'info' }
}

export class ToolbarEventEmitter {
  private emitter: Emitter<ToolbarInternalEvents>
  
  constructor() {
    this.emitter = mitt<ToolbarInternalEvents>()
  }
  
  // Emit events with error handling
  emit<T extends keyof ToolbarInternalEvents>(
    event: T,
    data: ToolbarInternalEvents[T]
  ): void {
    try {
      this.emitter.emit(event, data)
    } catch (error) {
      console.error(`Error emitting toolbar event ${String(event)}:`, error)
    }
  }
  
  // Listen to events with error handling
  on<T extends keyof ToolbarInternalEvents>(
    event: T,
    handler: (data: ToolbarInternalEvents[T]) => void
  ): () => void {
    const safeHandler = (data: ToolbarInternalEvents[T]) => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error handling toolbar event ${String(event)}:`, error)
      }
    }
    
    this.emitter.on(event, safeHandler)
    
    // Return cleanup function
    return () => this.emitter.off(event, safeHandler)
  }
  
  // Remove all listeners (for cleanup)
  cleanup(): void {
    this.emitter.all.clear()
  }
}