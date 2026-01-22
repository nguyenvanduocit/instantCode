import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

interface Shortcut {
  label: string
  keys: string[]
}

interface ShortcutCategory {
  icon: string
  title: string
  shortcuts: Shortcut[]
  showTip?: boolean
}

@customElement('keyboard-shortcuts-modal')
export class KeyboardShortcutsModal extends LitElement {
  @property({ type: Boolean })
  accessor open = false

  private shortcuts: ShortcutCategory[] = [
    {
      icon: 'category',
      title: 'Tools',
      shortcuts: [
        { label: 'Selection', keys: ['V'] },
        { label: 'Pen', keys: ['P'] },
        { label: 'Highlighter', keys: ['H'] },
        { label: 'Text', keys: ['T'] },
        { label: 'Arrow', keys: ['A'] },
      ]
    },
    {
      icon: 'bolt',
      title: 'Actions',
      shortcuts: [
        { label: 'Undo', keys: ['Cmd', 'Z'] },
        { label: 'Redo', keys: ['Cmd', 'Shift', 'Z'] },
        { label: 'Save', keys: ['Cmd', 'S'] },
        { label: 'Copy', keys: ['Cmd', 'C'] },
        { label: 'Delete', keys: ['Backspace'] },
      ]
    },
    {
      icon: 'explore',
      title: 'Navigation',
      shortcuts: [
        { label: 'Pan', keys: ['Space'] },
        { label: 'Zoom In', keys: ['Cmd', '+'] },
        { label: 'Zoom Out', keys: ['Cmd', '-'] },
      ],
      showTip: true
    }
  ]

  static styles = css`
    :host {
      --primary: #135bec;
      --bg-dark: #101622;
      --bg-card: #111318;
      --border-color: #282e39;
      --text-primary: #ffffff;
      --text-secondary: #9da6b9;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999998;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .backdrop.open {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 90%;
      max-width: 960px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 9999999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
    }

    .modal.open {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 32px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title svg {
      width: 24px;
      height: 24px;
      color: var(--primary);
    }

    .header-title h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .close-button {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 8px;
      background: var(--border-color);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
    }

    .close-button:hover {
      background: #323a47;
    }

    .content {
      padding: 32px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
    }

    @media (max-width: 768px) {
      .content {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    .category {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 4px;
    }

    .category-header svg {
      width: 18px;
      height: 18px;
      color: var(--primary);
    }

    .category-header h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-primary);
    }

    .shortcuts-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .shortcut-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 4px;
      border-radius: 8px;
      transition: background 0.15s ease;
    }

    .shortcut-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .shortcut-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: color 0.15s ease;
    }

    .shortcut-item:hover .shortcut-label {
      color: var(--text-primary);
    }

    .shortcut-keys {
      display: flex;
      gap: 4px;
    }

    .kbd {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      background: var(--border-color);
      border-bottom: 2px solid #1a1f26;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .tip-area {
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid rgba(40, 46, 57, 0.5);
    }

    .tip-box {
      background: rgba(19, 91, 236, 0.1);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .tip-box svg {
      width: 20px;
      height: 20px;
      color: var(--primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .tip-text {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .tip-text strong {
      color: var(--text-primary);
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 32px;
      background: rgba(26, 31, 38, 0.5);
      border-top: 1px solid var(--border-color);
    }

    .footer-text {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .footer-text a {
      color: var(--primary);
      text-decoration: none;
    }

    .footer-text a:hover {
      text-decoration: underline;
    }

    .done-button {
      padding: 0 24px;
      height: 40px;
      background: var(--primary);
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.15s ease;
      box-shadow: 0 4px 12px rgba(19, 91, 236, 0.2);
    }

    .done-button:hover {
      background: #1a6eff;
    }
  `

  private close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  private handleBackdropClick(e: Event) {
    if (e.target === e.currentTarget) {
      this.close()
    }
  }

  private renderIcon(name: string) {
    const icons: Record<string, ReturnType<typeof html>> = {
      keyboard: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`,
      category: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      bolt: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      explore: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
      info: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
      close: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    }
    return icons[name] || html``
  }

  render() {
    return html`
      <div class="backdrop ${this.open ? 'open' : ''}" @click=${this.handleBackdropClick}>
        <div class="modal ${this.open ? 'open' : ''}">
          <header class="header">
            <div class="header-title">
              ${this.renderIcon('keyboard')}
              <h2>Keyboard Shortcuts</h2>
            </div>
            <button class="close-button" @click=${this.close}>
              ${this.renderIcon('close')}
            </button>
          </header>

          <div class="content">
            ${this.shortcuts.map(category => html`
              <section class="category">
                <div class="category-header">
                  ${this.renderIcon(category.icon)}
                  <h3>${category.title}</h3>
                </div>
                <div class="shortcuts-list">
                  ${category.shortcuts.map(shortcut => html`
                    <div class="shortcut-item">
                      <span class="shortcut-label">${shortcut.label}</span>
                      <div class="shortcut-keys">
                        ${shortcut.keys.map(key => html`<span class="kbd">${key}</span>`)}
                      </div>
                    </div>
                  `)}
                </div>
                ${category.showTip ? html`
                  <div class="tip-area">
                    <div class="tip-box">
                      ${this.renderIcon('info')}
                      <p class="tip-text">
                        Tip: Holding <strong>Shift</strong> while using tools often constrains proportions or axes.
                      </p>
                    </div>
                  </div>
                ` : ''}
              </section>
            `)}
          </div>

          <footer class="footer">
            <p class="footer-text">Press <span class="kbd" style="display:inline-flex;min-width:auto;height:20px;font-size:10px;">?</span> to open this dialog</p>
            <button class="done-button" @click=${this.close}>Done</button>
          </footer>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keyboard-shortcuts-modal': KeyboardShortcutsModal
  }
}
