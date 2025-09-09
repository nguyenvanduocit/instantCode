import type { Plugin, ResolvedConfig } from 'vite';
import { spawn, ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

export interface InspectorPluginOptions {
  /**
   * Port to run the server on
   * @default 7318
   */
  port?: number;
  /**
   * Address for the server to listen on
   * @default 'localhost'
   */
  listenAddress?: string;
  /**
   * Public URL for reverse proxy scenarios
   * @default Automatically determined from listenAddress and port
   */
  publicAddress?: string;
  /**
   * Verbose logging
   * @default false
   */
  verbose?: boolean;
  /**
   * Enable mock mode (serve deterministic mock stream instead of real backend calls)
   * @default false
   */
  mock?: boolean;
}

class InspectorServerManager {
  private serverProcess: ChildProcess | null = null;
  private options: Required<InspectorPluginOptions>;
  private packageDir: string;
  private isDevelopment: boolean;

  constructor(options: InspectorPluginOptions = {}) {
    const port = options.port ?? 7318;
    const listenAddress = options.listenAddress ?? 'localhost';
    
    this.options = {
      port,
      listenAddress,
      publicAddress: options.publicAddress ?? `http://${listenAddress}:${port}`,
      verbose: options.verbose ?? false,
      mock: options.mock ?? false,
    };
  

    // Detect if we're running from source or from installed package
    // @ts-ignore - import.meta is available in ESM builds
    const currentFileDir = dirname(fileURLToPath(import.meta.url));

    // Check if we're in src directory (development) or dist directory (production)
    this.isDevelopment = currentFileDir.endsWith('/src') || currentFileDir.endsWith('\\src');

    // Get the package root directory
    if (this.isDevelopment) {
      // In development: current file is in src/, package root is one level up
      this.packageDir = dirname(currentFileDir);
    } else {
      // In production: current file is in dist/, package root is one level up
      this.packageDir = dirname(currentFileDir);
    }

    this.log(`Package directory: ${this.packageDir}`);
    this.log(`Running in ${this.isDevelopment ? 'development' : 'production'} mode`);
  }

  async start(): Promise<void> {
    if (this.serverProcess) {
      return;
    }

    // Determine the server file to run
    let serverFile: string;
    let cmd: string;
    let args: string[];

    if (this.isDevelopment) {
      // Development: run TypeScript file directly with bun
      serverFile = join(this.packageDir, 'src', 'index.ts');
      cmd = 'bun';
      args = [serverFile];
    } else {
      // Production: run compiled JavaScript file
      serverFile = join(this.packageDir, 'dist', 'index.cjs');

      // Check if dist/index.cjs exists, if not try to use bun with src/index.ts as fallback
      if (!existsSync(serverFile)) {
        const fallbackFile = join(this.packageDir, 'src', 'index.ts');
        if (existsSync(fallbackFile)) {
          this.log('dist/index.cjs not found, falling back to src/index.ts');
          serverFile = fallbackFile;
          cmd = 'bun';
          args = [serverFile];
        } else {
          throw new Error(`Inspector server file not found at ${serverFile} or ${fallbackFile}`);
        }
      } else {
        // Use node for compiled CJS in production
        cmd = 'bun';
        args = [serverFile];
      }
    }

    // Add CLI arguments
    args.push('--port', String(this.options.port));
    args.push('--listen', this.options.listenAddress);
    if (this.options.publicAddress ?? `http://${this.options.listenAddress}:${this.options.port}`) {
      args.push('--public-address', this.options.publicAddress);
    }
    if (this.options.verbose) {
      args.push('--verbose');
    }
    if (this.options.mock) {
      args.push('--mock');
    }

    this.log(`Starting inspector server: ${cmd} ${args.join(' ')}`);
    this.log(`Working directory: ${this.packageDir}`);

    // Start the server process
    this.serverProcess = spawn(cmd, args, {
      cwd: this.packageDir,
      env: process.env,
      stdio: this.options.verbose ? 'inherit' : 'pipe',
    });

    if (!this.options.verbose && this.serverProcess.stdout) {
      this.serverProcess.stdout.on('data', (_data) => {
        // Pipe output for debugging if needed
      });
    }

    if (!this.options.verbose && this.serverProcess.stderr) {
      this.serverProcess.stderr.on('data', (data) => {
        console.error(`[inspector-server] Error: ${data}`);
      });
    }

    this.serverProcess.on('error', (error) => {
      console.error('[inspector-server] Failed to start:', error);
    });

    this.serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[inspector-server] Process exited with code ${code}`);
      }
      this.serverProcess = null;
    });

    // Give server a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.log('Stopping inspector server...');

      // Send SIGTERM for graceful shutdown
      this.serverProcess.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        if (!this.serverProcess) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          // Force kill if not exited after 5 seconds
          if (this.serverProcess) {
            this.log('Force killing inspector server...');
            this.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.serverProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.serverProcess = null;
    }
  }


  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[inspector-plugin] ${message}`);
    }
  }

  getInjectScript(cwd?: string): string {
    const params = new URLSearchParams({
      ...(cwd && { cwd }),
    });

    return `<script src="${this.options.publicAddress}/inspector-toolbar.js?${params}" type="module" async></script>`;
  }

  shouldInject(): boolean {
    return true;
  }

}

export function inspectorPlugin(options: InspectorPluginOptions = {}): Plugin {
  let serverManager: InspectorServerManager;
  let projectRoot: string;

  return {
    name: 'vite-plugin-inspector',
    // Only apply plugin during development (serve command)
    apply: 'serve',

    configResolved(config: ResolvedConfig) {
      projectRoot = config.root;
      serverManager = new InspectorServerManager(options);
    },

    async buildStart() {
      await serverManager.start();
    },

    transformIndexHtml(html: string) {
      if (!serverManager || !serverManager.shouldInject()) {
        return html;
      }

      // Inject the inspector toolbar script into the HTML
      const scriptTag = serverManager.getInjectScript(projectRoot);

      // Try to inject before closing body tag, or at the end of HTML
      if (html.includes('</body>')) {
        return html.replace('</body>', `${scriptTag}\n</body>`);
      } else if (html.includes('</html>')) {
        return html.replace('</html>', `${scriptTag}\n</html>`);
      } else {
        // Append to the end if no body or html tags found
        return html + scriptTag;
      }
    },

    async closeBundle() {
      await serverManager.stop();
    },

    async buildEnd() {
      // Stop server when build ends (in build mode)
      if (this.meta.watchMode === false) {
        await serverManager.stop();
      }
    },
  };
}

// Default export for convenience
export default inspectorPlugin;