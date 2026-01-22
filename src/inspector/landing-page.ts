import { LitElement, html, css } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('landing-page')
export class LandingPage extends LitElement {
  static styles = css`
    :host {
      --primary: #135bec;
      --primary-dark: #0d47a1;
      --gradient-colors: linear-gradient(135deg, #FF6B6B, #FF9671, #FFA75F, #F9D423, #FECA57, #FF7E67, #FF8C42, #FFC857);
      --bg-dark: #0a0c10;
      --bg-card: #111318;
      --bg-elevated: #1a1d24;
      --border: #282e39;
      --text-primary: #ffffff;
      --text-secondary: #9da6b9;
      --text-muted: #64748b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      display: block;
      min-height: 100vh;
      background: var(--bg-dark);
      color: var(--text-primary);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Animations */
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(19, 91, 236, 0.3); }
      50% { box-shadow: 0 0 40px rgba(19, 91, 236, 0.6); }
    }

    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Navigation */
    .nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(10, 12, 16, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      text-decoration: none;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--gradient-colors);
      background-size: 200% 200%;
      animation: gradientShift 5s ease infinite;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon svg {
      width: 20px;
      height: 20px;
      color: white;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-link:hover {
      color: var(--text-primary);
    }

    .nav-cta {
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-cta:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }

    /* Hero Section */
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 120px 32px 80px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 800px;
      background: radial-gradient(circle, rgba(19, 91, 236, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(19, 91, 236, 0.1);
      border: 1px solid rgba(19, 91, 236, 0.3);
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      color: var(--primary);
      margin-bottom: 24px;
      animation: fade-in-up 0.6s ease;
    }

    .hero-badge svg {
      width: 16px;
      height: 16px;
    }

    .hero-title {
      font-size: clamp(40px, 8vw, 72px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      animation: fade-in-up 0.6s ease 0.1s both;
    }

    .hero-title .gradient-text {
      background: var(--gradient-colors);
      background-size: 200% 200%;
      animation: gradientShift 5s ease infinite;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: clamp(16px, 2vw, 20px);
      color: var(--text-secondary);
      max-width: 600px;
      line-height: 1.6;
      margin-bottom: 40px;
      animation: fade-in-up 0.6s ease 0.2s both;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      animation: fade-in-up 0.6s ease 0.3s both;
    }

    .btn-primary {
      padding: 16px 32px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(19, 91, 236, 0.3);
    }

    .btn-secondary {
      padding: 16px 32px;
      background: transparent;
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-secondary:hover {
      background: var(--bg-elevated);
      border-color: var(--text-muted);
    }

    .btn-secondary svg, .btn-primary svg {
      width: 20px;
      height: 20px;
    }

    /* Preview Section */
    .preview {
      position: relative;
      margin-top: 60px;
      padding: 0 32px;
      animation: fade-in-up 0.6s ease 0.4s both;
    }

    .preview-window {
      max-width: 1000px;
      margin: 0 auto;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 100px rgba(0, 0, 0, 0.5);
      animation: float 6s ease-in-out infinite;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
    }

    .preview-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .preview-dot.red { background: #ff5f57; }
    .preview-dot.yellow { background: #febc2e; }
    .preview-dot.green { background: #28c840; }

    .preview-content {
      padding: 24px;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1d24 0%, #0a0c10 100%);
    }

    .preview-placeholder {
      text-align: center;
      color: var(--text-muted);
    }

    .preview-placeholder svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    /* Features Section */
    .features {
      padding: 120px 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .section-tag {
      display: inline-block;
      padding: 6px 12px;
      background: rgba(19, 91, 236, 0.1);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: clamp(28px, 4vw, 40px);
      font-weight: 700;
      margin-bottom: 16px;
    }

    .section-subtitle {
      font-size: 16px;
      color: var(--text-secondary);
      max-width: 500px;
      margin: 0 auto;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .feature-card {
      padding: 32px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      transition: all 0.3s;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      border-color: rgba(19, 91, 236, 0.5);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .feature-icon.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .feature-icon.purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
    .feature-icon.orange { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .feature-icon.green { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .feature-icon.red { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .feature-icon.cyan { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }

    .feature-icon svg {
      width: 24px;
      height: 24px;
    }

    .feature-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .feature-description {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* How It Works Section */
    .how-it-works {
      padding: 120px 32px;
      background: var(--bg-card);
    }

    .steps {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .step {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .step-number {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-content {
      padding-top: 8px;
    }

    .step-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .step-description {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* CTA Section */
    .cta {
      padding: 120px 32px;
      text-align: center;
    }

    .cta-card {
      max-width: 700px;
      margin: 0 auto;
      padding: 64px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 24px;
      position: relative;
      overflow: hidden;
    }

    .cta-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-colors);
      background-size: 200% 200%;
      animation: gradientShift 5s ease infinite;
    }

    .cta-title {
      font-size: clamp(24px, 4vw, 36px);
      font-weight: 700;
      margin-bottom: 16px;
    }

    .cta-subtitle {
      font-size: 16px;
      color: var(--text-secondary);
      margin-bottom: 32px;
    }

    /* Footer */
    .footer {
      padding: 48px 32px;
      border-top: 1px solid var(--border);
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 24px;
    }

    .footer-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
    }

    .footer-links {
      display: flex;
      gap: 32px;
    }

    .footer-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
    }

    .footer-link:hover {
      color: var(--text-primary);
    }

    .footer-copy {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .nav-links {
        display: none;
      }

      .hero-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
        justify-content: center;
      }

      .step {
        flex-direction: column;
        text-align: center;
        align-items: center;
      }

      .footer-content {
        flex-direction: column;
        text-align: center;
      }
    }
  `

  private renderIcon(name: string) {
    const icons: Record<string, ReturnType<typeof html>> = {
      eye: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
      zap: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      code: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      layers: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      sparkles: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3L14.3 9.3L21 11L14.3 12.7L12 19L9.7 12.7L3 11L9.7 9.3L12 3Z"/></svg>`,
      cursor: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-7 2-3 7-4-18z"/></svg>`,
      message: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      rocket: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
      github: html`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
      play: html`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
      arrow: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
      terminal: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    }
    return icons[name] || html``
  }

  render() {
    return html`
      <!-- Navigation -->
      <nav class="nav">
        <a href="#" class="logo">
          <div class="logo-icon">
            ${this.renderIcon('eye')}
          </div>
          <span>InstantCode</span>
        </a>
        <div class="nav-links">
          <a href="#features" class="nav-link">Features</a>
          <a href="#how-it-works" class="nav-link">How It Works</a>
          <a href="https://github.com/nicholasxuu/instantcode" class="nav-link">GitHub</a>
          <button class="nav-cta">Get Started</button>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-badge">
          ${this.renderIcon('sparkles')}
          <span>AI-Powered Development Tool</span>
        </div>
        <h1 class="hero-title">
          Inspect. Select.<br>
          <span class="gradient-text">Let AI Code It.</span>
        </h1>
        <p class="hero-subtitle">
          Point at any element on your webpage, describe what you want, and watch AI instantly implement it. The fastest way to iterate on your frontend.
        </p>
        <div class="hero-actions">
          <button class="btn-primary">
            ${this.renderIcon('rocket')}
            Get Started Free
          </button>
          <button class="btn-secondary">
            ${this.renderIcon('github')}
            View on GitHub
          </button>
        </div>

        <!-- Preview Window -->
        <div class="preview">
          <div class="preview-window">
            <div class="preview-header">
              <div class="preview-dot red"></div>
              <div class="preview-dot yellow"></div>
              <div class="preview-dot green"></div>
            </div>
            <div class="preview-content">
              <div class="preview-placeholder">
                ${this.renderIcon('play')}
                <p>Interactive demo coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features" id="features">
        <div class="section-header">
          <span class="section-tag">Features</span>
          <h2 class="section-title">Everything you need to code faster</h2>
          <p class="section-subtitle">
            Powerful tools designed to accelerate your frontend development workflow
          </p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon blue">
              ${this.renderIcon('cursor')}
            </div>
            <h3 class="feature-title">Visual Element Selection</h3>
            <p class="feature-description">
              Click on any element to select it. Multi-select supported. The AI understands exactly what you're pointing at.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon purple">
              ${this.renderIcon('message')}
            </div>
            <h3 class="feature-title">Natural Language Prompts</h3>
            <p class="feature-description">
              Describe changes in plain English. "Make this button bigger" or "Add a hover effect" - AI understands context.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon orange">
              ${this.renderIcon('zap')}
            </div>
            <h3 class="feature-title">Instant Implementation</h3>
            <p class="feature-description">
              AI generates and applies changes in real-time. See results immediately without refreshing the page.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon green">
              ${this.renderIcon('layers')}
            </div>
            <h3 class="feature-title">Framework Detection</h3>
            <p class="feature-description">
              Automatically detects Vue, React, Angular, and Svelte components. AI knows your component structure.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon red">
              ${this.renderIcon('terminal')}
            </div>
            <h3 class="feature-title">Console Error Capture</h3>
            <p class="feature-description">
              Capture and send console errors to AI with @error. Debug faster with context-aware suggestions.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon cyan">
              ${this.renderIcon('code')}
            </div>
            <h3 class="feature-title">Vite Plugin Integration</h3>
            <p class="feature-description">
              Drop-in Vite plugin for seamless integration. Zero config required, works with any Vite project.
            </p>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="how-it-works" id="how-it-works">
        <div class="section-header">
          <span class="section-tag">How It Works</span>
          <h2 class="section-title">Three steps to faster coding</h2>
          <p class="section-subtitle">
            Simple workflow that feels like magic
          </p>
        </div>

        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3 class="step-title">Select Elements</h3>
              <p class="step-description">
                Click the inspector button in the corner, then click any element on your page. You can select multiple elements to give AI more context.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3 class="step-title">Describe Your Changes</h3>
              <p class="step-description">
                Type what you want in natural language. "Change the color to blue", "Add animation on hover", or "Fix the alignment issue".
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3 class="step-title">AI Implements It</h3>
              <p class="step-description">
                Claude Code analyzes your selection, understands your codebase, and makes the exact changes you described. Review and iterate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta">
        <div class="cta-card">
          <h2 class="cta-title">Ready to code faster?</h2>
          <p class="cta-subtitle">
            Join developers who are building frontends at lightning speed with AI-powered inspection.
          </p>
          <button class="btn-primary">
            ${this.renderIcon('arrow')}
            Get Started Now
          </button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-content">
          <div class="footer-logo">
            <div class="logo-icon" style="width: 28px; height: 28px;">
              ${this.renderIcon('eye')}
            </div>
            <span>InstantCode</span>
          </div>
          <div class="footer-links">
            <a href="https://github.com/nicholasxuu/instantcode" class="footer-link">GitHub</a>
            <a href="#" class="footer-link">Documentation</a>
            <a href="#" class="footer-link">Support</a>
          </div>
          <p class="footer-copy">© 2024 InstantCode. Open source under MIT License.</p>
        </div>
      </footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'landing-page': LandingPage
  }
}
