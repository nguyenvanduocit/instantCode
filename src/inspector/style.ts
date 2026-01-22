/**
 * CSS styles for the inspector toolbar
 * Organized by component and animation types
 */

import { css } from 'lit'

// Combined styles for the toolbar as CSSResult
export const TOOLBAR_STYLES = css`
  :host {
    /* CSS Custom Properties */
    --primary-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --gradient-colors: linear-gradient(135deg, #FF6B6B, #FF9671, #FFA75F, #F9D423, #FECA57, #FF7E67, #FF8C42, #FFC857);
    --shadow-primary: rgba(255, 107, 107, 0.5);
    --border-radius: 6px;
    --transition-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    --color-border: #e5e7eb;
    --color-text: #1f2937;
    --color-text-muted: #64748b;
    --color-bg-light: #f8fafc;
    --color-white: #ffffff;

    /* Tool Colors */
    --color-tool-file: #f59e0b;
    --color-tool-bash: #dc2626;
    --color-tool-search: #8b5cf6;
    --color-tool-web: #06b6d4;
    --color-tool-todo: #10b981;
    --color-tool-task: #3b82f6;
    
    position: fixed;
    bottom: 5px;
    right: 5px;
    z-index: 999999;
    font-family: var(--primary-font) !important;
  }

  :host * {
    font-family: var(--primary-font) !important;
    box-sizing: border-box;
  }

  .hidden {
    display: none !important;
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

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .toolbar-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--gradient-colors);
    background-size: 400% 400%;
    animation: gradientShift 7.3s ease-in-out infinite;
    border: none;
    color: var(--color-white);
    cursor: pointer;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s var(--transition-spring);
    position: relative;
    z-index: 10000000;
  }

  .toolbar-button::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 107, 107, 0.1) 0%, transparent 70%);
    filter: blur(4px);
    opacity: 0.3;
    z-index: -1;
    transition: all 0.3s ease;
  }


  .toolbar-button:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  }

  .toolbar-button:hover::before {
    inset: -4px;
    filter: blur(6px);
    opacity: 0.4;
  }

  .toolbar-button.active {
    background-size: 400% 400%;
    animation: gradientShift 5.2s cubic-bezier(0.36, 0.11, 0.89, 0.32) infinite;
    transform: scale(1.08);
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
  }

  .toolbar-button.active::before {
    inset: -5px;
    filter: blur(8px);
    opacity: 0.5;
  }

  .toolbar-button .icon {
    width: 18px;
    height: 18px;
    animation: blinkEye 5s infinite;
  }

  .toolbar-card {
    cursor: auto !important;
    position: absolute;
    bottom: 30px;
    right: 0px;
    background: white;
    border-radius: 5px;
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
    color: var(--color-text-muted);
    padding: 4px 8px;
    background: var(--color-bg-light);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .session-label {
    font-weight: 500;
  }

  .session-id {
    font-family: 'Monaco', 'Courier New', monospace;
    background: var(--color-white);
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
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
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
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
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.4s var(--transition-spring);
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
    color: var(--color-white);
  }

  .inspect-button:hover {
    background: #3a72c9;
    box-shadow: 0 3px 6px rgba(59, 130, 246, 0.2);
  }

  .inspect-button:active { background: #2c5aa0; }

  .close-button {
    background: #e05252;
    border: 1px solid #b03e3e;
    color: var(--color-white);
    display: none;
  }

  .close-button:hover {
    background: #cc4545;
    box-shadow: 0 3px 6px rgba(224, 82, 82, 0.2);
  }

  .close-button:active { background: #b73a3a; }

  .new-chat-button {
    background: #4ead88;
    border: 1px solid #3a8a68;
    color: var(--color-white);
    height: 20px;
    font-size: 11px;
  }

  .new-chat-button:hover {
    background: #419a78;
    box-shadow: 0 3px 6px rgba(78, 173, 136, 0.2);
  }

  .new-chat-button:active { background: #358a6c; }

  .cancel-button {
    background: #f59e0b;
    border: 1px solid #d97706;
    color: var(--color-white);
  }

  .cancel-button:hover {
    background: #e5890c;
    box-shadow: 0 3px 6px rgba(245, 158, 11, 0.2);
  }

  .cancel-button:active { background: #d97706; }

  .clear-button {
    background: #6b7280;
    border: 1px solid #4b5563;
    color: var(--color-white);
  }

  .clear-button:hover {
    background: #5d646f;
    box-shadow: 0 3px 6px rgba(107, 114, 128, 0.2);
  }

  .clear-button:active { background: #4b5563; }

  .copy-button {
    background: #8b5cf6;
    border: 1px solid #7c3aed;
    color: var(--color-white);
  }

  .copy-button:hover {
    background: #7c3aed;
    box-shadow: 0 3px 6px rgba(139, 92, 246, 0.2);
  }

  .copy-button:active { background: #6d28d9; }

  .shortcuts-button,
  .settings-button {
    background: #374151;
    border: 1px solid #4b5563;
    color: var(--color-white);
    padding: 4px 6px;
    min-width: 26px;
  }

  .shortcuts-button:hover,
  .settings-button:hover {
    background: #4b5563;
    box-shadow: 0 2px 4px rgba(55, 65, 81, 0.2);
  }

  .shortcuts-button:active,
  .settings-button:active {
    background: #374151;
  }

  .shortcuts-button svg,
  .settings-button svg {
    display: block;
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

  .message {
    padding: 0px;
    background: #fafbfc;
    border-left: 3px solid var(--color-border);
    font-family: var(--primary-font);
    color: var(--color-text);
    line-height: 1.4;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .message.assistant {
    border-left-color: #3b82f6;
    background: #f0f9ff;
  }

  .message.user {
    border-left-color: #10b981;
    background: #f0fdf4;
  }

  .message.system {
    border-left-color: #64748b;
    background: #f8fafc;
    font-size: 10px;
    color: #64748b;
  }

  .message.result {
    border-left-color: #8b5cf6;
    background: #faf5ff;
  }

  .message-wrapper {
    position: relative;
  }

  .badge {
    display: inline-block;
    width: fit-content;
    background: #4f46e5;
    color: white;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-top-right-radius: 4px;
  }

  /* Legacy message-based badge colors (fallback) */
  .message.assistant .badge {
    background: #3b82f6;
  }

  .message.user .badge {
    background: #10b981;
  }

  .message.system .badge {
    background: #64748b;
  }

  .message.result .badge {
    background: #8b5cf6;
  }

  /* New badge type-specific colors (higher specificity) */
  .badge.badge-system {
    background: #64748b;
  }

  .badge.badge-assistant {
    background: #3b82f6;
  }

  .badge.badge-todo {
    background: #10b981;
  }

  .badge.badge-tool-file {
    background: #f59e0b;
  }

  .badge.badge-tool-exec {
    background: #dc2626;
  }

  .badge.badge-tool-search {
    background: #8b5cf6;
  }

  .badge.badge-tool-web {
    background: #06b6d4;
  }

  .badge.badge-user {
    background: #10b981;
  }

  .badge.badge-complete {
    background: #059669;
  }

  .badge.badge-error {
    background: #dc2626;
  }

  .badge.badge-default {
    background: #6b7280;
  }

  .message-content{
    padding: 5px;
    white-space: break-spaces;
  }

  .message pre {
    margin: 4px 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .meta {
    display: block;
    font-size: 9px;
    color: #94a3b8;
    padding: 5px;
    padding-top: 0px;
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

  .message:last-child {
    margin-bottom: 0;
  }

  .message .tool-combined {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6px 8px;
    margin: 4px 0;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.3;
  }

  .message .tool-section {
    margin: 3px 0;
    padding: 2px 0;
  }

  .message .tool-section:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
  }

  .message[data-tool-call-id] {
    position: relative;
    transition: all 0.3s ease;
  }

  .message[data-tool-call-id] .badge {
    transition: all 0.3s ease;
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

  .processing-dots {
    display: inline-block;
    animation: dots 1.5s infinite;
  }

  .processing-message {
    margin-bottom: 3px;
    padding: 8px 12px;
    background: #fffbeb;
    border-left: 3px solid #f59e0b;
    font-family: var(--primary-font);
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

  .processing-text {
    font-weight: 500;
  }

  .message-copy-button {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border: none;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    color: #64748b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .message:hover .message-copy-button {
    opacity: 1;
  }

  .message-copy-button:hover {
    background: rgba(255, 255, 255, 0.95);
    color: #374151;
    transform: scale(1.05);
  }

  .message-copy-button:active {
    transform: scale(0.95);
  }

  /* Tool Cards Container - no wrapper needed */
  .tool-cards-container {
    padding: 0;
  }

  /* Tool Card Styles */
  .tool-card {
    border-radius: 4px;
    margin: 2px 0;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }

  .tool-card.pending {
    border-left: 3px solid #f59e0b;
  }

  .tool-card.success {
    border-left: 3px solid #10b981;
  }

  .tool-card.error {
    border-left: 3px solid #dc2626;
  }

  .tool-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    cursor: pointer;
    background: #f8fafc;
    transition: background 0.15s ease;
  }

  .tool-card-header:hover {
    background: #f1f5f9;
  }

  .tool-card.expanded .tool-card-header {
    border-bottom: 1px solid #e2e8f0;
  }

  .tool-card .tool-status-icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .tool-card .tool-name-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    background: #3b82f6;
    color: white;
  }

  .tool-card .tool-summary {
    flex: 1;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    color: #475569;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tool-card .tool-duration {
    flex-shrink: 0;
    font-size: 9px;
    color: #94a3b8;
    font-weight: 500;
  }

  .tool-card .tool-expand-icon {
    flex-shrink: 0;
    font-size: 10px;
    color: #94a3b8;
    transition: transform 0.2s ease;
  }

  .tool-card.expanded .tool-expand-icon {
    transform: rotate(180deg);
  }

  .tool-card-body {
    padding: 6px 8px;
    background: #ffffff;
  }

  .tool-card-body .tool-section {
    margin-bottom: 6px;
  }

  .tool-card-body .tool-section:last-child {
    margin-bottom: 0;
  }

  .tool-card-body .tool-section-label {
    font-size: 8px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }

  .tool-card-body pre {
    margin: 0;
    padding: 4px 6px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.3;
    overflow-x: auto;
    max-height: 100px;
    overflow-y: auto;
    color: #334155;
  }

  .tool-card-body pre code {
    white-space: pre-wrap;
    word-break: break-word;
    color: #334155;
  }

  /* Tool name badge colors by type */
  .tool-card .tool-name-badge[data-tool="Read"],
  .tool-card .tool-name-badge[data-tool="Write"],
  .tool-card .tool-name-badge[data-tool="Edit"] {
    background: var(--color-tool-file);
  }

  .tool-card .tool-name-badge[data-tool="Bash"] {
    background: var(--color-tool-bash);
  }

  .tool-card .tool-name-badge[data-tool="Glob"],
  .tool-card .tool-name-badge[data-tool="Grep"] {
    background: var(--color-tool-search);
  }

  .tool-card .tool-name-badge[data-tool="WebFetch"],
  .tool-card .tool-name-badge[data-tool="WebSearch"] {
    background: var(--color-tool-web);
  }

  .tool-card .tool-name-badge[data-tool="TodoWrite"] {
    background: var(--color-tool-todo);
  }

  /* Spinner for pending status */
  .tool-status-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #f59e0b;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Active Tools Section - shows pending operations immediately */
  .active-tools-section {
    position: sticky;
    bottom: 0;
    background: linear-gradient(180deg, rgba(255,251,235,0.95) 0%, #fffbeb 100%);
    border-top: 1px solid #fbbf24;
    padding: 6px 8px;
    backdrop-filter: blur(4px);
  }

  .active-tool-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 11px;
    color: #92400e;
  }

  .active-tool-item:not(:last-child) {
    border-bottom: 1px dashed #fcd34d;
    padding-bottom: 6px;
    margin-bottom: 2px;
  }

  .active-tool-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #fcd34d;
    border-top: 2px solid #f59e0b;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  .active-tool-name {
    font-weight: 600;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background: #f59e0b;
    color: white;
    flex-shrink: 0;
  }

  /* Active tool name colors by type */
  .active-tool-name[data-tool="Read"],
  .active-tool-name[data-tool="Write"],
  .active-tool-name[data-tool="Edit"] {
    background: var(--color-tool-file);
  }

  .active-tool-name[data-tool="Bash"] {
    background: var(--color-tool-bash);
  }

  .active-tool-name[data-tool="Glob"],
  .active-tool-name[data-tool="Grep"] {
    background: var(--color-tool-search);
  }

  .active-tool-name[data-tool="WebFetch"],
  .active-tool-name[data-tool="WebSearch"] {
    background: var(--color-tool-web);
  }

  .active-tool-name[data-tool="Task"] {
    background: var(--color-tool-task);
  }

  .active-tool-summary {
    flex: 1;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    color: #78350f;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`