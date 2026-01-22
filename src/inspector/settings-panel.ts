import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

export interface SettingsState {
  language: string
  autoSave: boolean
  defaultTool: string
  theme: 'light' | 'dark' | 'system'
  toolbarPosition: 'top' | 'bottom' | 'left' | 'right'
  uiOpacity: number
  exportFormat: string
  exportQuality: number
  includeAnnotations: boolean
}

@customElement('settings-panel')
export class SettingsPanel extends LitElement {
  @property({ type: Boolean })
  accessor open = false

  @state()
  private accessor settings: SettingsState = {
    language: 'en-US',
    autoSave: true,
    defaultTool: 'select',
    theme: 'dark',
    toolbarPosition: 'top',
    uiOpacity: 85,
    exportFormat: 'png',
    exportQuality: 90,
    includeAnnotations: true,
  }

  private languages = [
    { value: 'en-US', label: 'English (United States)' },
    { value: 'ja', label: 'Japanese (日本語)' },
    { value: 'de', label: 'German (Deutsch)' },
    { value: 'fr', label: 'French (Français)' },
    { value: 'es', label: 'Spanish (Español)' },
  ]

  private tools = [
    { value: 'select', label: 'Select (Pointer)' },
    { value: 'rectangle', label: 'Rectangle Tool' },
    { value: 'arrow', label: 'Arrow Tool' },
    { value: 'pen', label: 'Pen (Freehand)' },
    { value: 'text', label: 'Text Tool' },
  ]

  private exportFormats = [
    { value: 'png', label: 'Portable Network Graphics (PNG)' },
    { value: 'jpg', label: 'JPEG Image (JPG)' },
    { value: 'pdf', label: 'Portable Document Format (PDF)' },
    { value: 'svg', label: 'Scalable Vector Graphics (SVG)' },
  ]

  private readonly positionOptions = [
    { value: 'top' as const, label: 'Top', icon: 'borderTop' },
    { value: 'bottom' as const, label: 'Bottom', icon: 'borderBottom' },
    { value: 'left' as const, label: 'Left', icon: 'borderLeft' },
    { value: 'right' as const, label: 'Right', icon: 'borderRight' },
  ]

  static styles = css`
    :host {
      --primary: #135bec;
      --surface-low: #0f1115;
      --surface-mid: #1a1d24;
      --surface-high: #262a33;
      --border: #333946;
      --text-main: #e2e8f0;
      --text-muted: #94a3b8;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
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

    .panel {
      position: fixed;
      right: 0;
      top: 0;
      height: 100%;
      width: 380px;
      background: var(--surface-low);
      border-left: 1px solid var(--border);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      opacity: 0;
      visibility: hidden;
      transition: transform 0.3s ease, opacity 0.2s ease, visibility 0.2s ease;
    }

    .panel.open {
      transform: translateX(0);
      opacity: 1;
      visibility: visible;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(19, 91, 236, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-icon svg {
      width: 20px;
      height: 20px;
      color: var(--primary);
    }

    .header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-main);
    }

    .close-button {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .close-button:hover {
      background: var(--surface-high);
      color: var(--text-main);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .content::-webkit-scrollbar {
      width: 5px;
    }

    .content::-webkit-scrollbar-track {
      background: transparent;
    }

    .content::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 10px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-header {
      padding-bottom: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(51, 57, 70, 0.5);
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--primary);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 6px;
      padding-left: 4px;
    }

    .select-wrapper {
      position: relative;
    }

    .select-wrapper select {
      width: 100%;
      padding: 10px 40px 10px 16px;
      background: var(--surface-mid);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-main);
      cursor: pointer;
      appearance: none;
      transition: all 0.15s ease;
    }

    .select-wrapper select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(19, 91, 236, 0.2);
    }

    .select-wrapper svg {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .toggle-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: rgba(26, 29, 36, 0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
      transition: border-color 0.15s ease;
    }

    .toggle-card:hover {
      border-color: rgba(19, 91, 236, 0.5);
    }

    .toggle-info h4 {
      margin: 0 0 2px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }

    .toggle-info p {
      margin: 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--surface-high);
      border-radius: 24px;
      transition: background 0.2s ease;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 2px;
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    .toggle input:checked + .toggle-slider {
      background: var(--primary);
    }

    .toggle input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    .theme-buttons {
      display: flex;
      padding: 4px;
      background: var(--surface-mid);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .theme-button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      border: none;
      border-radius: 6px;
      background: transparent;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .theme-button:hover {
      color: var(--text-main);
    }

    .theme-button.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 8px rgba(19, 91, 236, 0.3);
    }

    .theme-button svg {
      width: 14px;
      height: 14px;
    }

    .position-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .position-option {
      position: relative;
      cursor: pointer;
    }

    .position-option input {
      position: absolute;
      opacity: 0;
    }

    .position-label {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: rgba(26, 29, 36, 0.5);
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: all 0.15s ease;
    }

    .position-option:hover .position-label {
      background: var(--surface-mid);
    }

    .position-option input:checked + .position-label {
      border-color: var(--primary);
      background: rgba(19, 91, 236, 0.05);
    }

    .position-label svg {
      width: 18px;
      height: 18px;
      color: var(--text-muted);
    }

    .position-option input:checked + .position-label svg {
      color: var(--primary);
    }

    .position-label span {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-main);
    }

    .slider-group {
      margin-bottom: 16px;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
    }

    .slider-value {
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      background: var(--surface-high);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--primary);
    }

    input[type="range"] {
      width: 100%;
      height: 6px;
      background: var(--surface-high);
      border-radius: 3px;
      appearance: none;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      background: var(--primary);
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(19, 91, 236, 0.4);
    }

    .checkbox-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(26, 29, 36, 0.3);
      border: 1px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }

    .checkbox-card:hover {
      border-color: rgba(19, 91, 236, 0.5);
    }

    .checkbox {
      position: relative;
      width: 20px;
      height: 20px;
    }

    .checkbox input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .checkbox-visual {
      width: 20px;
      height: 20px;
      background: var(--surface-mid);
      border: 1px solid var(--border);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .checkbox input:checked + .checkbox-visual {
      background: var(--primary);
      border-color: var(--primary);
    }

    .checkbox-visual svg {
      width: 14px;
      height: 14px;
      color: white;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .checkbox input:checked + .checkbox-visual svg {
      opacity: 1;
    }

    .checkbox-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-main);
    }

    .shortcuts-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px;
      background: var(--surface-mid);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .shortcuts-button:hover {
      border-color: rgba(19, 91, 236, 0.6);
      background: rgba(19, 91, 236, 0.05);
    }

    .shortcuts-button:active {
      transform: scale(0.98);
    }

    .shortcuts-button svg {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      transition: color 0.15s ease;
    }

    .shortcuts-button:hover svg {
      color: var(--primary);
    }

    .footer {
      padding: 20px 24px;
      border-top: 1px solid var(--border);
      background: rgba(15, 17, 21, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .version {
      display: flex;
      flex-direction: column;
    }

    .version-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .version-number {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-main);
    }

    .footer-links {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .footer-links a {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .footer-links a:hover {
      color: var(--text-main);
    }

    .footer-divider {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--border);
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

  private updateSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    this.settings = { ...this.settings, [key]: value }
    this.dispatchEvent(new CustomEvent('settings-change', {
      detail: { key, value, settings: this.settings }
    }))
  }

  private openShortcuts() {
    this.dispatchEvent(new CustomEvent('open-shortcuts'))
  }

  private renderIcon(name: string) {
    const icons: Record<string, ReturnType<typeof html>> = {
      settings: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      close: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
      chevronDown: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`,
      sun: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
      moon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
      monitor: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
      borderTop: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18" stroke-width="3"/></svg>`,
      borderBottom: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18" stroke-width="3"/></svg>`,
      borderLeft: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18" stroke-width="3"/></svg>`,
      borderRight: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18" stroke-width="3"/></svg>`,
      check: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`,
      keyboard: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`,
    }
    return icons[name] || html``
  }

  render() {
    return html`
      <div class="backdrop ${this.open ? 'open' : ''}" @click=${this.handleBackdropClick}></div>
      <div class="panel ${this.open ? 'open' : ''}">
        <header class="header">
          <div class="header-title">
            <div class="header-icon">${this.renderIcon('settings')}</div>
            <h2>Settings</h2>
          </div>
          <button class="close-button" @click=${this.close}>
            ${this.renderIcon('close')}
          </button>
        </header>

        <div class="content">
          <!-- General Section -->
          <section class="section">
            <div class="section-header">
              <span class="section-title">General</span>
            </div>

            <div class="form-group">
              <label class="form-label">Language</label>
              <div class="select-wrapper">
                <select @change=${(e: Event) => this.updateSetting('language', (e.target as HTMLSelectElement).value)}>
                  ${this.languages.map(lang => html`
                    <option value=${lang.value} ?selected=${this.settings.language === lang.value}>${lang.label}</option>
                  `)}
                </select>
                ${this.renderIcon('chevronDown')}
              </div>
            </div>

            <div class="toggle-card">
              <div class="toggle-info">
                <h4>Auto-save</h4>
                <p>Sync changes automatically</p>
              </div>
              <label class="toggle">
                <input type="checkbox" ?checked=${this.settings.autoSave}
                  @change=${(e: Event) => this.updateSetting('autoSave', (e.target as HTMLInputElement).checked)}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="form-group" style="margin-top: 16px;">
              <label class="form-label">Default Tool</label>
              <div class="select-wrapper">
                <select @change=${(e: Event) => this.updateSetting('defaultTool', (e.target as HTMLSelectElement).value)}>
                  ${this.tools.map(tool => html`
                    <option value=${tool.value} ?selected=${this.settings.defaultTool === tool.value}>${tool.label}</option>
                  `)}
                </select>
                ${this.renderIcon('chevronDown')}
              </div>
            </div>
          </section>

          <!-- Appearance Section -->
          <section class="section">
            <div class="section-header">
              <span class="section-title">Appearance</span>
            </div>

            <div class="theme-buttons">
              <button class="theme-button ${this.settings.theme === 'light' ? 'active' : ''}"
                @click=${() => this.updateSetting('theme', 'light')}>
                ${this.renderIcon('sun')} Light
              </button>
              <button class="theme-button ${this.settings.theme === 'dark' ? 'active' : ''}"
                @click=${() => this.updateSetting('theme', 'dark')}>
                ${this.renderIcon('moon')} Dark
              </button>
              <button class="theme-button ${this.settings.theme === 'system' ? 'active' : ''}"
                @click=${() => this.updateSetting('theme', 'system')}>
                ${this.renderIcon('monitor')} System
              </button>
            </div>

            <div class="form-group" style="margin-top: 24px;">
              <label class="form-label">Toolbar Position</label>
              <div class="position-grid">
                ${this.positionOptions.map(({ value, label, icon }) => html`
                  <label class="position-option">
                    <input type="radio" name="position" value=${value}
                      ?checked=${this.settings.toolbarPosition === value}
                      @change=${() => this.updateSetting('toolbarPosition', value)}>
                    <div class="position-label">
                      ${this.renderIcon(icon)}
                      <span>${label}</span>
                    </div>
                  </label>
                `)}
              </div>
            </div>

            <div class="slider-group" style="margin-top: 24px;">
              <div class="slider-header">
                <label class="form-label" style="margin: 0;">UI Opacity</label>
                <span class="slider-value">${this.settings.uiOpacity}%</span>
              </div>
              <input type="range" min="0" max="100" .value=${String(this.settings.uiOpacity)}
                @input=${(e: Event) => this.updateSetting('uiOpacity', Number((e.target as HTMLInputElement).value))}>
            </div>
          </section>

          <!-- Export Section -->
          <section class="section">
            <div class="section-header">
              <span class="section-title">Export Defaults</span>
            </div>

            <div class="form-group">
              <label class="form-label">Default Format</label>
              <div class="select-wrapper">
                <select @change=${(e: Event) => this.updateSetting('exportFormat', (e.target as HTMLSelectElement).value)}>
                  ${this.exportFormats.map(format => html`
                    <option value=${format.value} ?selected=${this.settings.exportFormat === format.value}>${format.label}</option>
                  `)}
                </select>
                ${this.renderIcon('chevronDown')}
              </div>
            </div>

            <div class="slider-group">
              <div class="slider-header">
                <label class="form-label" style="margin: 0;">Export Quality</label>
                <span class="slider-value">${this.settings.exportQuality}%</span>
              </div>
              <input type="range" min="0" max="100" .value=${String(this.settings.exportQuality)}
                @input=${(e: Event) => this.updateSetting('exportQuality', Number((e.target as HTMLInputElement).value))}>
            </div>

            <label class="checkbox-card">
              <div class="checkbox">
                <input type="checkbox" ?checked=${this.settings.includeAnnotations}
                  @change=${(e: Event) => this.updateSetting('includeAnnotations', (e.target as HTMLInputElement).checked)}>
                <div class="checkbox-visual">${this.renderIcon('check')}</div>
              </div>
              <span class="checkbox-label">Include annotations in export</span>
            </label>
          </section>

          <!-- Shortcuts Section -->
          <section class="section">
            <div class="section-header">
              <span class="section-title">Shortcuts</span>
            </div>
            <button class="shortcuts-button" @click=${this.openShortcuts}>
              ${this.renderIcon('keyboard')}
              Manage Keyboard Shortcuts
            </button>
          </section>
        </div>

        <footer class="footer">
          <div class="version">
            <span class="version-label">Version</span>
            <span class="version-number">2.4.0 PRO</span>
          </div>
          <div class="footer-links">
            <a href="#">Support</a>
            <div class="footer-divider"></div>
            <a href="#">Privacy</a>
          </div>
        </footer>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-panel': SettingsPanel
  }
}
