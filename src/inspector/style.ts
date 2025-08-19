/**
 * CSS styles for the inspector toolbar
 * Organized by component and animation types
 */

// Configuration constants for animations
export const ANIMATION_CONFIG = {
  DURATIONS: {
    GRADIENT_SHIFT: '7.3s',
    GLOWING_AURA: '9.7s',
    ROTATE_MIST: '13.5s',
    BLINK_EYE: '5s'
  }
} as const

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