/**
 * UI rendering, styling, and message formatting for the inspector toolbar
 * 
 * Message Flow:
 * 1. createMessage() - Creates new message HTML
 * 2. updateMessage() - Updates existing message by ID
 * 3. formatPrompt() - Formats user input with context
 * 4. shouldShowMessage() - Determines if message should be displayed
 * 5. clearMessages() - Clears message history
 */

import { HtmlUtils } from '../utils/html'
import type { ElementData, PageInfo } from '../shared/types'
import * as yaml from 'js-yaml'

// Configuration constants
const CONFIG = {
  MAX_CONTENT_LENGTH: 10000,
  MAX_RESULT_LENGTH: 10000,
  MAX_INPUT_DISPLAY: 10000,
  MESSAGE_HISTORY_LIMIT: 10,
  ANIMATION_DURATIONS: {
    GRADIENT_SHIFT: '7.3s',
    GLOWING_AURA: '9.7s',
    ROTATE_MIST: '13.5s',
    BLINK_EYE: '5s'
  }
} as const



// CSS Styles organized by component

// Combined styles for the toolbar
export const TOOLBAR_STYLES = `
  :host {
    position: fixed;
    bottom: 20px;
    right: 40px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }

  :host * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    box-sizing: border-box;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    14% { background-position: 23% 77%; }
    27% { background-position: 52% 68%; }
    41% { background-position: 79% 42%; }
    56% { background-position: 95% 21%; }
    73% { background-position: 62% 30%; }
    88% { background-position: 31% 47%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes blinkEye {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  @keyframes glowingAura {
    0% { box-shadow: 0 0 10px 5px rgba(255, 107, 107, 0.4), 0 0 20px 10px rgba(255, 150, 113, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.1); }
    13% { box-shadow: 0 0 18px 12px rgba(249, 212, 35, 0.5), 0 0 28px 15px rgba(254, 202, 87, 0.3), 0 0 0 3px rgba(255, 255, 255, 0.16); }
    27% { box-shadow: 0 0 15px 8px rgba(255, 159, 243, 0.6), 0 0 24px 11px rgba(255, 140, 66, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12); }
    42% { box-shadow: 0 0 22px 14px rgba(255, 200, 87, 0.55), 0 0 30px 16px rgba(255, 107, 107, 0.28), 0 0 0 4px rgba(255, 255, 255, 0.18); }
    58% { box-shadow: 0 0 12px 7px rgba(255, 166, 107, 0.45), 0 0 19px 9px rgba(255, 126, 103, 0.25), 0 0 0 2px rgba(255, 255, 255, 0.11); }
    73% { box-shadow: 0 0 20px 13px rgba(249, 212, 35, 0.62), 0 0 26px 14px rgba(255, 150, 113, 0.42), 0 0 0 3px rgba(255, 255, 255, 0.22); }
    87% { box-shadow: 0 0 16px 9px rgba(255, 107, 107, 0.53), 0 0 22px 13px rgba(254, 202, 87, 0.32), 0 0 0 2px rgba(255, 255, 255, 0.14); }
    100% { box-shadow: 0 0 10px 5px rgba(255, 107, 107, 0.4), 0 0 20px 10px rgba(255, 150, 113, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.1); }
  }

  @keyframes rotateMist {
    0% { transform: rotate(0deg) scale(1); }
    17% { transform: rotate(83deg) scale(1.15) translateX(3px); }
    31% { transform: rotate(127deg) scale(0.95) translateY(-4px); }
    48% { transform: rotate(195deg) scale(1.12) translateX(-2px) translateY(3px); }
    63% { transform: rotate(246deg) scale(1.05) translateY(5px); }
    79% { transform: rotate(301deg) scale(0.97) translateX(4px) translateY(-2px); }
    91% { transform: rotate(342deg) scale(1.08) translateY(-3px); }
    100% { transform: rotate(360deg) scale(1); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }

  @keyframes dots {
    0%, 20% { content: ''; }
    40% { content: '.'; }
    60% { content: '..'; }
    80%, 100% { content: '...'; }
  }
  .toolbar-button {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF6B6B, #FF9671, #FFA75F, #F9D423, #FECA57, #FF7E67, #FF8C42, #FFC857);
    background-size: 400% 400%;
    animation: gradientShift 7.3s ease-in-out infinite, glowingAura 9.7s infinite cubic-bezier(0.42, 0, 0.58, 1);
    border: none;
    color: white;
    cursor: pointer;
    filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    position: relative;
    z-index: 10000000;
  }

  .toolbar-button::before {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 107, 107, 0.3) 0%, rgba(255, 140, 66, 0.2) 50%, rgba(249, 212, 35, 0.1) 70%, transparent 100%);
    filter: blur(10px);
    opacity: 0.7;
    z-index: -1;
    animation: rotateMist 13.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
    transition: all 0.5s ease;
  }

  @keyframes rotateMist {
    0% { transform: rotate(0deg) scale(1); }
    17% { transform: rotate(83deg) scale(1.15) translateX(3px); }
    31% { transform: rotate(127deg) scale(0.95) translateY(-4px); }
    48% { transform: rotate(195deg) scale(1.12) translateX(-2px) translateY(3px); }
    63% { transform: rotate(246deg) scale(1.05) translateY(5px); }
    79% { transform: rotate(301deg) scale(0.97) translateX(4px) translateY(-2px); }
    91% { transform: rotate(342deg) scale(1.08) translateY(-3px); }
    100% { transform: rotate(360deg) scale(1); }
  }

  .toolbar-button:hover {
    transform: scale(1.1);
  }

  .toolbar-button:hover::before {
    inset: -15px;
    filter: blur(15px);
    opacity: 0.9;
  }

  .toolbar-button.active {
    background-size: 400% 400%;
    animation: gradientShift 5.2s cubic-bezier(0.36, 0.11, 0.89, 0.32) infinite;
    transform: scale(1.15);
  }

  .toolbar-button.active::before {
    inset: -20px;
    filter: blur(20px);
    opacity: 1;
    animation: rotateMist 9.7s cubic-bezier(0.34, 0.82, 0.6, 0.23) infinite;
  }

  .toolbar-button .icon {
    width: 25px;
    height: 25px;
    animation: blinkEye 5s infinite;
  }

  .toolbar-card {
    cursor: auto !important;
    position: absolute;
    bottom: 30px;
    right: -13px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    padding: 12px;
    display: none;
    min-width: 380px;
    transform: translateY(20px);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    z-index: 1;
  }

  .toolbar-card.expanded {
    display: block;
    transform: translateY(0);
    opacity: 1;
  }

  .toolbar-header {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
    width: 100%;
    gap: 8px;
  }

  .session-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #64748b;
    padding: 4px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }

  .session-label {
    font-weight: 500;
  }

  .session-id {
    font-family: 'Monaco', 'Courier New', monospace;
    background: #ffffff;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #e5e7eb;
    font-size: 10px;
    color: #374151;
    min-width: 60px;
    text-align: center;
  }


  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .toolbar-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 13px;
    transition: border-color 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    width: 100%;
  }

  .toolbar-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .action-button {
    padding: 4px 8px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    height: 26px;
    line-height: 1.3;
  }

  .inspect-button {
    background: #4b83da;
    border: 1px solid #2d5ca8;
    color: white;
  }

  .inspect-button:hover {
    background: #3a72c9;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(59, 130, 246, 0.2);
  }

  .inspect-button:active {
    transform: translateY(0);
    background: #2c5aa0;
  }

  .close-button {
    background: #e05252;
    border: 1px solid #b03e3e;
    color: white;
    display: none;
  }

  .close-button:hover {
    background: #cc4545;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(224, 82, 82, 0.2);
  }

  .close-button:active {
    transform: translateY(0);
    background: #b73a3a;
  }

  .new-chat-button {
    background: #4ead88;
    border: 1px solid #3a8a68;
    color: white;
  }

  .new-chat-button:hover {
    background: #419a78;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(78, 173, 136, 0.2);
  }

  .new-chat-button:active {
    transform: translateY(0);
    background: #358a6c;
  }

  .cancel-button {
    background: #f59e0b;
    border: 1px solid #d97706;
    color: white;
    display: none;
  }

  .cancel-button:hover {
    background: #e5890c;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(245, 158, 11, 0.2);
  }

  .cancel-button:active {
    transform: translateY(0);
    background: #d97706;
  }

  .clear-button {
    background: #6b7280;
    border: 1px solid #4b5563;
    color: white;
  }

  .clear-button:hover {
    background: #5d646f;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(107, 114, 128, 0.2);
  }

  .clear-button:active {
    transform: translateY(0);
    background: #4b5563;
  }

  .copy-button {
    background: #8b5cf6;
    border: 1px solid #7c3aed;
    color: white;
  }

  .copy-button:hover {
    background: #7c3aed;
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(139, 92, 246, 0.2);
  }

  .copy-button:active {
    transform: translateY(0);
    background: #6d28d9;
  }

  .inspecting .close-button {
    display: inline-flex;
  }

  .inspecting .inspect-button {
    display: none;
  }

  .icon {
    width: 18px;
    height: 18px;
  }

  .json-display {
    margin-top: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    width: 380px;
    display: none;
    flex-direction: column;
  }

  .json-display.show {
    display: flex;
  }

  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid #e5e7eb;
    background: #f8fafc;
    border-radius: 6px 6px 0 0;
  }

  .json-header span {
    font-size: 11px;
    font-weight: 500;
    color: #64748b;
  }

  .json-clear-button {
    padding: 2px 6px;
    border: none;
    border-radius: 3px;
    background: #e2e8f0;
    color: #64748b;
    font-size: 9px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .json-clear-button:hover {
    background: #cbd5e1;
  }

  .json-content {
    max-height: 400px;
    overflow: auto;
  }

  .json-message {
    margin-bottom: 3px;
    padding: 6px 8px;
    background: #fafbfc;
    border-left: 3px solid #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2937;
    line-height: 1.4;
  }

  .json-message.assistant {
    border-left-color: #3b82f6;
    background: #f0f9ff;
  }

  .json-message.user {
    border-left-color: #10b981;
    background: #f0fdf4;
  }

  .json-message.system {
    border-left-color: #64748b;
    background: #f8fafc;
    font-size: 10px;
    color: #64748b;
  }

  .json-message.result {
    border-left-color: #8b5cf6;
    background: #faf5ff;
    font-size: 14px;
  }

  .message-wrapper {
    position: relative;
  }

  .message-badge {
    position: absolute;
    top: -9px;
    right: -7px;
    background: #4f46e5;
    color: white;
    font-size: 8px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
    z-index: 1;
    line-height: 1.2;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .json-message.assistant .message-badge {
    background: #3b82f6;
  }

  .json-message.user .message-badge {
    background: #10b981;
  }

  .json-message.system .message-badge {
    background: #64748b;
  }

  .json-message.result .message-badge {
    background: #8b5cf6;
  }

  .json-message pre {
    margin: 0;
    overflow: auto;
  }

  .message-content {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    font-size: 10px
  }

  .result .message-content {
    font-size: 13px;
  }

  .message-meta {
    font-size: 9px;
    color: #94a3b8;
    margin-top: 4px;
    display: flex;
    gap: 8px;
  }

  .tool-use {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    margin: 4px 0;
    padding: 4px 6px;
  }

  .tool-name {
    font-weight: 500;
    font-size: 10px;
    color: #475569;
  }

  .tool-input {
    font-family: 'Courier New', monospace;
    font-size: 9px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 2px;
    padding: 3px;
    margin-top: 2px;
    max-height: 60px;
    overflow-y: auto;
  }

  .json-message:last-child {
    margin-bottom: 0;
  }

  .json-message .tool-combined {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6px 8px;
    margin: 2px 0;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.3;
  }

  .json-message .tool-section {
    margin: 3px 0;
    padding: 2px 0;
  }

  .json-message .tool-section:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
  }

  .json-message[data-tool-call-id] {
    position: relative;
    transition: all 0.3s ease;
  }

  .json-message[data-tool-call-id] .message-badge {
    transition: all 0.3s ease;
  }

  .json-message[data-tool-call-id]:has(.message-content:contains("Running")) .message-badge {
    background: #f59e0b;
    animation: pulse 2s infinite;
  }

  @keyframes toolPulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }

  .toolbar-card.processing .toolbar-input,
  .toolbar-card.processing .toolbar-actions {
    display: none;
  }

  .toolbar-card.processing .new-chat-button {
    display: none !important;
  }

  .processing-indicator {
    display: none;
    text-align: center;
    padding: 20px;
    color: #6b7280;
    font-size: 14px;
    animation: pulse 2s infinite;
  }

  .toolbar-card.processing .processing-indicator {
    display: block;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }

  .processing-dots {
    display: inline-block;
    animation: dots 1.5s infinite;
  }

  @keyframes dots {
    0%, 20% { content: ''; }
    40% { content: '.'; }
    60% { content: '..'; }
    80%, 100% { content: '...'; }
  }

  .processing-message {
    margin-bottom: 3px;
    padding: 8px 12px;
    background: #fffbeb;
    border-left: 3px solid #f59e0b;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    color: #92400e;
    line-height: 1.4;
    display: none;
    align-items: center;
    gap: 8px;
  }

  .processing-message.show {
    display: flex;
  }

  .processing-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #fbbf24;
    border-top: 2px solid #d97706;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .processing-text {
    font-weight: 500;
  }
`

/**
 * Render the complete toolbar HTML structure
 */
export function renderToolbar(): string {
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
          <button class="action-button cancel-button" id="cancelButton">
            <span>Cancel</span>
          </button>
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
        <div>Starting Claude Code<span class="processing-dots"></span></div>
      </div>

      <div class="json-display" id="jsonDisplay">
        <div class="json-content" id="jsonContent"></div>
        <div class="processing-message" id="processingMessage">
          <div class="processing-spinner"></div>
          <span class="processing-text">Processing request...</span>
        </div>
      </div>
    </div>
  `
}

// ===============================
// UI STATE UPDATE FUNCTIONS
// ===============================

/**
 * Update the expanded/collapsed state of the toolbar
 */
export function updateExpandedState(shadowRoot: ShadowRoot | null, isExpanded: boolean): void {
  const toolbarCard = shadowRoot?.getElementById('toolbarCard')
  const toggleButton = shadowRoot?.getElementById('toggleButton')

  if (isExpanded) {
    toolbarCard?.classList.add('expanded')
    toggleButton?.classList.add('active')
  } else {
    toolbarCard?.classList.remove('expanded')
    toggleButton?.classList.remove('active')
  }
}

/**
 * Update the inspection mode visual state
 */
export function updateInspectionState(shadowRoot: ShadowRoot | null, isInspecting: boolean): void {
  const toolbarCard = shadowRoot?.querySelector('.toolbar-card')

  if (isInspecting) {
    toolbarCard?.classList.add('inspecting')
  } else {
    toolbarCard?.classList.remove('inspecting')
  }
}

/**
 * Update the processing state visual feedback
 */
export function updateProcessingState(shadowRoot: ShadowRoot | null, isProcessing: boolean): void {
  const toolbarCard = shadowRoot?.getElementById('toolbarCard')

  if (isProcessing) {
    toolbarCard?.classList.add('processing')
  } else {
    toolbarCard?.classList.remove('processing')
  }
}

/**
 * Update session display with current session ID
 */
export function updateSessionDisplay(shadowRoot: ShadowRoot | null, sessionId?: string | null, isProcessing?: boolean): void {
  const sessionInfoElement = shadowRoot?.getElementById('sessionInfo')
  const sessionIdElement = shadowRoot?.getElementById('sessionId')
  const cancelButton = shadowRoot?.getElementById('cancelButton')

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
      if (isProcessing) {
        cancelButton.style.display = 'inline-flex'
      } else {
        cancelButton.style.display = 'none'
      }
    }
  }
}


/**
 * Update clear button visibility based on selection state
 */
export function updateClearButtonVisibility(shadowRoot: ShadowRoot | null, hasSelectedElements: boolean): void {
  const clearElementButton = shadowRoot?.getElementById('clearElementButton')
  if (clearElementButton) {
    clearElementButton.style.display = hasSelectedElements ? 'inline-flex' : 'none'
  }
}

/**
 * Clear the prompt input field
 */
export function clearPromptInput(shadowRoot: ShadowRoot | null): void {
  const promptInput = shadowRoot?.getElementById('promptInput') as HTMLTextAreaElement
  if (promptInput) promptInput.value = ''
}

// ===============================
// NOTIFICATION FUNCTIONS
// ===============================

/**
 * Show notification (currently just logs to console)
 */
export function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  console.log(`${type}: ${message}`)
}

// ===============================
// PROCESSING INDICATOR FUNCTIONS
// ===============================

/**
 * Show processing indicator
 */
export function showProcessingIndicator(shadowRoot: ShadowRoot | null): void {
  const processingIndicator = shadowRoot?.getElementById('processingIndicator')
  const processingMessage = shadowRoot?.getElementById('processingMessage')
  const jsonDisplay = shadowRoot?.getElementById('jsonDisplay')

  if (processingIndicator) {
    processingIndicator.style.display = 'block'
  }

  // Show processing message at the end of message list
  if (processingMessage && jsonDisplay) {
    processingMessage.classList.add('show')
    jsonDisplay.classList.add('show')

    // Scroll to bottom to show the processing indicator
    const jsonContent = shadowRoot?.getElementById('jsonContent')
    if (jsonContent) {
      jsonContent.scrollTop = jsonContent.scrollHeight
    }
  }
}

/**
 * Hide processing indicator
 */
export function hideProcessingIndicator(shadowRoot: ShadowRoot | null): void {
  const processingIndicator = shadowRoot?.getElementById('processingIndicator')

  if (processingIndicator) {
    processingIndicator.style.display = 'none'
  }
}

/**
 * Hide processing message
 */
export function hideProcessingMessage(shadowRoot: ShadowRoot | null): void {
  const processingMessage = shadowRoot?.getElementById('processingMessage')

  // Hide processing message from message list
  if (processingMessage) {
    processingMessage.classList.remove('show')
  }
}

// ===============================
// JSON DISPLAY FUNCTIONS
// ===============================

/**
 * Display JSON message in the message area
 */
export function displayJsonMessage(shadowRoot: ShadowRoot | null, jsonData: any, messageFormatter: MessageFormatter): void {
  const jsonDisplay = shadowRoot?.getElementById('jsonDisplay')
  const jsonContent = shadowRoot?.getElementById('jsonContent')

  if (!jsonDisplay || !jsonContent) return

  if (!messageFormatter.shouldShowMessage(jsonData)) {
    return
  }

  const formattedMessage = messageFormatter.createMessage(jsonData)
  if (!formattedMessage) {
    return
  }
  
  jsonDisplay.classList.add('show')

  // Create regular message element
  const messageElement = document.createElement('div')
  messageElement.classList.add('json-message', jsonData.type || 'generic')
  messageElement.innerHTML = formattedMessage
  jsonContent.appendChild(messageElement)

  jsonContent.scrollTop = jsonContent.scrollHeight
}

/**
 * Clear JSON display area
 */
export function clearJsonDisplay(shadowRoot: ShadowRoot | null): void {
  const jsonDisplay = shadowRoot?.getElementById('jsonDisplay')
  const jsonContent = shadowRoot?.getElementById('jsonContent')

  if (!jsonDisplay || !jsonContent) return

  jsonContent.innerHTML = ''
  jsonDisplay.classList.remove('show')
}

// ===============================
// MESSAGE OPERATIONS - CLEAR FLOW
// ===============================

/**
 * Simple interface for message operations
 */
export interface MessageFormatter {
  formatPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo): string
  shouldShowMessage(jsonData: any): boolean
  createMessage(data: any): string | null
  clearMessages(): void
}

/**
 * Create message manager with clear operations
 */
export function createMessageFormatter(): MessageFormatter {
  // State management
  let lastMessageHash = ''
  let messageHistory = new Set<string>()

  // ===================
  // 1. FORMAT USER INPUT
  // ===================
  function formatPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo): string {
    let formattedPrompt = `<userRequest>${userPrompt}</userRequest>`

    const replacer = (_key: string, value: any) => {
      if (value === '' || (Array.isArray(value) && value.length === 0) || value === null) {
        return undefined
      }
      return value
    }

    if (pageInfo) {
      formattedPrompt += `<pageInfo>${JSON.stringify(pageInfo, replacer)}</pageInfo>`
    }

    if (selectedElements && selectedElements.length > 0) {
      formattedPrompt += `<inspectedElements>${JSON.stringify(selectedElements, replacer)}</inspectedElements>`
    }

    return formattedPrompt
  }

  // ========================
  // 2. CHECK MESSAGE DISPLAY
  // ========================
  function shouldShowMessage(jsonData: any): boolean {
    // Always show messages that don't have a hash (empty content)
    const messageHash = hashMessage(jsonData)
    if (!messageHash) return true

    // Skip exact consecutive duplicates
    if (messageHash === lastMessageHash) return false

    // Only check history for assistant messages to prevent duplicate streaming
    if (jsonData.type === 'assistant' && messageHistory.has(messageHash)) return false

    // Track message
    lastMessageHash = messageHash
    if (jsonData.type === 'assistant') {
      messageHistory.add(messageHash)
      if (messageHistory.size > CONFIG.MESSAGE_HISTORY_LIMIT) {
        const firstHash = messageHistory.values().next().value
        if (firstHash) messageHistory.delete(firstHash)
      }
    }

    // Always show non-assistant messages (including Claude JSON responses)
    return true
  }

  // ==================
  // 3. CREATE MESSAGE
  // ==================
  function createMessage(data: any): string | null {
    try {
      // Handle different message types clearly
      if (data.type === 'assistant') {
        return createAssistantMessage(data)
      } else if (data.type === 'user') {
        return createUserMessage(data)
      } else if (data.type === 'system') {
        return createSystemMessage(data)
      } else if (data.type === 'result') {
        return createResultMessage(data)
      } else if (data.type === 'claude_response') {
        return createClaudeResponseMessage(data)
      } else {
        return createFallbackMessage(data)
      }
    } catch (error) {
      console.error('Error creating message:', error)
      return createErrorMessage(data)
    }
  }

  // =================
  // 4. CLEAR MESSAGES
  // =================
  function clearMessages(): void {
    lastMessageHash = ''
    messageHistory.clear()
  }

  // ===============================
  // HELPER FUNCTIONS - MESSAGE TYPES
  // ===============================
  function createAssistantMessage(data: any): string | null {
    if (!data.message?.content) return null

    const extracted = extractContentFromAssistant(data.message.content)

    // Regular assistant message - escape HTML for safety
    const meta = data.message?.usage ?
      `${data.message.usage.input_tokens || 0}↑ ${data.message.usage.output_tokens || 0}↓` : ''

    return formatMessage(extracted.text, extracted.badge, meta)
  }

  function createUserMessage(data: any): string | null {
    if (!data.message?.content) return null

    const extracted = extractContentFromUser(data.message.content)

    // Escape HTML for user messages
    return formatMessage(extracted.text, extracted.badge)
  }

  function createSystemMessage(data: any): string {
    const content = `System: ${data.subtype || 'message'}`
    const meta = data.cwd ? data.cwd : ''
    return formatMessage(content, 'System', meta)
  }

  function createResultMessage(data: any): string {
    const content = data.result || 'Task completed'
    return formatMessage(content, 'Result')
  }

  function createClaudeResponseMessage(response: any): string {

    // Create a summary content showing key metrics instead of the full text result
    let content = ''
    // Show timing information
    if (response.duration_ms) {
      content += `<strong>Total Time:</strong> ${response.duration_ms}ms`
      if (response.duration_api_ms) {
        content += ` (API: ${response.duration_api_ms}ms)`
      }
      content += '<br>'
    }

    // Show cost information
    if (response.total_cost_usd) {
      content += `<strong>Cost:</strong> $${response.total_cost_usd.toFixed(4)}<br>`
    }

    // Show token usage
    if (response.usage) {
      const usage = response.usage
      const tokens = []
      if (usage.input_tokens) tokens.push(`${usage.input_tokens}↑`)
      if (usage.output_tokens) tokens.push(`${usage.output_tokens}↓`)
      if (usage.cache_read_input_tokens) tokens.push(`${usage.cache_read_input_tokens}(cached)`)
      if (tokens.length > 0) {
        content += `<strong>Tokens:</strong> ${tokens.join(' ')}<br>`
      }
    }

    // Show turn count
    if (response.num_turns) {
      content += `<strong>Turns:</strong> ${response.num_turns}<br>`
    }
    return formatMessage(content, 'Claude Complete', "")
  }

  function createFallbackMessage(data: any): string {
    // For Claude JSON responses that don't match known types
    // Display them in a readable format
    const content = typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2)

    // Truncate if too long but ensure we always show something
    const displayContent = content.length > CONFIG.MAX_CONTENT_LENGTH
      ? content.substring(0, CONFIG.MAX_CONTENT_LENGTH) + '...'
      : content

    // Wrap JSON in a pre/code block for better formatting
    const formattedContent = typeof data === 'object'
      ? `<pre style="background:#f5f5f5;padding:6px;border-radius:4px;overflow-x:auto;font-size:8px"><code>${displayContent}</code></pre>`
      : displayContent

    return formatMessage(formattedContent, 'Claude')
  }

  function createErrorMessage(data: any): string {
    const errorContent = `<pre style="background:#fee;padding:6px;border-radius:4px;overflow-x:auto;font-size:8px"><code>${JSON.stringify(data)}</code></pre>`
    return formatMessage(errorContent, 'Error')
  }

  // ===============================
  // FORMATTING UTILITIES
  // ===============================
  function formatMessage(content: string, badge?: string, meta?: string): string {
    const badgeHtml = badge ? `<div class="message-badge">${badge}</div>` : ''
    const metaHtml = meta ? `<div class="message-meta">${meta}</div>` : ''
    // Don't escape HTML in content since we're now using HTML formatting
    return `<div class="message-wrapper">${badgeHtml}<div class="message-content">${content}</div>${metaHtml}</div>`
  }


  /**
   * Formats TodoWrite tool input into a user-friendly todo list display
   */
  function formatTodoList(input: any): string {
    if (!input || !input.todos || !Array.isArray(input.todos)) {
      return '<div>No todos found</div>'
    }

    const todos = input.todos
    let html = '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin: 4px 0;">'
    html += '<div style="font-weight: 600; color: #374151; margin-bottom: 6px; font-size: 12px;">📝 Todo List</div>'

    todos.forEach((todo: any) => {
      const status = todo.status || 'pending'
      let statusIcon = '⚪'
      let statusColor = '#6b7280'

      switch (status) {
        case 'completed':
          statusIcon = '✅'
          statusColor = '#059669'
          break
        case 'in_progress':
          statusIcon = '🔄'
          statusColor = '#dc2626'
          break
        case 'pending':
          statusIcon = '⚪'
          statusColor = '#6b7280'
          break
      }

      html += `<div style="display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 11px;">`
      html += `<span style="color: ${statusColor}; flex-shrink: 0;">${statusIcon}</span>`
      html += `<span style="color: #374151; line-height: 1.4;">${HtmlUtils.escapeHtml(todo.content || '')}</span>`
      html += `</div>`
    })

    html += '</div>'
    return html
  }

  function extractContentFromAssistant(content: any[]): { text: string, badge?: string } {
    const items = content.map(item => {
      if (item.type === 'text') {
        return { text: item.text, badge: undefined }
      } else if (item.type === 'tool_use') {
        // Special handling for TodoWrite tool
        if (item.name === 'TodoWrite') {
          const todoContent = formatTodoList(item.input)
          return {
            text: todoContent,
            badge: item.name
          }
        } else {
          const toolContent = `${item.input ? yaml.dump(item.input, { indent: 2 }) : ''}`
          return {
            text: `<pre>${HtmlUtils.escapeHtml(toolContent)}</pre>`,
            badge: item.name
          }
        }
      }
      return { text: '', badge: undefined }
    }).filter(item => item.text)
    
    if (items.length === 0) return { text: '' }
    
    const toolUseItem = items.find(item => item.badge)
    if (toolUseItem) {
      return {
        text: items.map(item => item.text).join('\n'),
        badge: toolUseItem.badge
      }
    }
    
    return { text: items.map(item => item.text).join('\n') }
  }

  function extractContentFromUser(content: any[]): { text: string, badge?: string } {
    const items = content.map(item => {
      if (item.type === 'text') {
        return { text: item.text, badge: undefined }
      } else if (item.type === 'tool_result') {
        const result = typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
        return { 
          text: `<pre>${HtmlUtils.escapeHtml(result)}</pre>`,
          badge: 'Tool Result'
        }
      }
      return { text: '', badge: undefined }
    })
    
    const toolResultItem = items.find(item => item.badge)
    if (toolResultItem) {
      return {
        text: items.filter(item => item.text).map(item => item.text).join('\n'),
        badge: toolResultItem.badge
      }
    }

    const filteredItems = items.filter(item => item.text)
    if (filteredItems.length === 0) return { text: '' }

    return { text: filteredItems.map(item => item.text).join('\n') }
  }

  function hashMessage(jsonData: any): string {
    let content = ''
    if (jsonData.type === 'assistant' && jsonData.message?.content) {
      content = extractContentFromAssistant(jsonData.message.content).text
    } else if (jsonData.type === 'user' && jsonData.message?.content) {
      content = extractContentFromUser(jsonData.message.content).text
    } else {
      content = JSON.stringify(jsonData)
    }
    
    return HtmlUtils.hashString(content || '')
  }

  // Return the clean interface
  return {
    formatPrompt,
    shouldShowMessage,
    createMessage,
    clearMessages
  }
}