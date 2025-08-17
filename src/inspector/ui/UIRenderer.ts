/**
 * Handles UI rendering and template generation
 */

import { TOOLBAR_STYLES } from './styles'

export class UIRenderer {
  static renderToolbar(): string {
    return `
      <style>
        ${TOOLBAR_STYLES}
      </style>

      <div class="toolbar-button" id="toggleButton">
        <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
        </svg>
      </div>

      <div class="toolbar-card" id="toolbarCard">
        <div class="toolbar-header">
          <div class="session-info" id="sessionInfo">
            <span class="session-label">Session:</span>
            <span class="session-id" id="sessionId">-</span>
            <button class="action-button new-chat-button" id="newChatButton">
              <span>New Chat</span>
            </button>
          </div>
          <textarea rows="2" autocomplete="off" type="text" class="toolbar-input" id="promptInput" placeholder="Type your prompt then press Enter"></textarea>
        </div>
        
        <div class="toolbar-actions">
          <button class="action-button inspect-button" id="inspectButton">
            <span>Inspect</span>
          </button>
          <button class="action-button clear-button" id="clearElementButton">
            <span>Clear</span>
          </button>
          <button class="action-button close-button" id="closeInspectButton">
            <span>Cancel</span>
          </button>
        </div>
        
        <div class="processing-indicator" id="processingIndicator">
          <div>🔄 Processing with Claude<span class="processing-dots"></span></div>
        </div>
        
        <div class="json-display" id="jsonDisplay">
          <div class="json-header">
            <span>Claude Code Messages</span>
            <button class="json-clear-button" id="jsonClearButton">Clear</button>
          </div>
          <div class="json-content" id="jsonContent"></div>
        </div>
      </div>
    `
  }
}