export interface ToolUse {
  id: string
  name: string
  timestamp: number
  sessionId?: string
}

export interface ToolResult {
  id: string
  timestamp: number
  sessionId?: string
}

export class ToolTracker {
  private toolUses: Map<string, ToolUse> = new Map()
  private toolResults: Map<string, ToolResult> = new Map()
  private sessionTrackers: Map<string, ToolTracker> = new Map()

  addToolUse(toolUse: ToolUse): void {
    this.toolUses.set(toolUse.id, toolUse)
  }

  addToolResult(toolResult: ToolResult): boolean {
    this.toolResults.set(toolResult.id, toolResult)
    
    // Check if this result matches any previous tool use
    const matchingToolUse = this.toolUses.get(toolResult.id)
    
    if (!matchingToolUse) {
      // Log marker for unmatched tool result
      console.error(`🔍 [TOOL-MISMATCH-MARKER] Tool result without matching tool use detected:`, {
        resultId: toolResult.id,
        timestamp: new Date(toolResult.timestamp).toISOString(),
        sessionId: toolResult.sessionId || 'unknown',
        availableToolUses: Array.from(this.toolUses.keys())
      })
      return false
    }
    
    return true
  }

  getUnmatchedToolResults(): ToolResult[] {
    const unmatchedResults: ToolResult[] = []
    
    for (const [resultId, result] of this.toolResults) {
      if (!this.toolUses.has(resultId)) {
        unmatchedResults.push(result)
      }
    }
    
    return unmatchedResults
  }

  getUnmatchedToolUses(): ToolUse[] {
    const unmatchedUses: ToolUse[] = []
    
    for (const [useId, toolUse] of this.toolUses) {
      if (!this.toolResults.has(useId)) {
        unmatchedUses.push(toolUse)
      }
    }
    
    return unmatchedUses
  }

  clearSession(sessionId: string): void {
    // Remove all tool uses and results for this session
    for (const [id, toolUse] of this.toolUses) {
      if (toolUse.sessionId === sessionId) {
        this.toolUses.delete(id)
      }
    }
    
    for (const [id, toolResult] of this.toolResults) {
      if (toolResult.sessionId === sessionId) {
        this.toolResults.delete(id)
      }
    }
    
    this.sessionTrackers.delete(sessionId)
  }

  getStats(): { toolUses: number, toolResults: number, unmatched: number } {
    const unmatchedResults = this.getUnmatchedToolResults()
    
    return {
      toolUses: this.toolUses.size,
      toolResults: this.toolResults.size,
      unmatched: unmatchedResults.length
    }
  }

  static getGlobalTracker(): ToolTracker {
    if (!global.toolTracker) {
      global.toolTracker = new ToolTracker()
    }
    return global.toolTracker
  }
}

declare global {
  var toolTracker: ToolTracker | undefined
}