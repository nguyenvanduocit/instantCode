import type { Plugin, ViteDevServer } from 'vite';
import { spawn, ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

export interface AnnotatorPluginOptions {
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
}

class AnnotatorServerManager {
  private serverProcess: ChildProcess | null = null;
  private options: Required<AnnotatorPluginOptions>;
  private packageDir: string;
  private isDevelopment: boolean;

  constructor(options: AnnotatorPluginOptions = {}) {
    const port = options.port ?? 7318;
    const listenAddress = options.listenAddress ?? 'localhost';
    
    this.options = {
      port,
      listenAddress,
      publicAddress: options.publicAddress ?? `http://${listenAddress}:${port}`,
      verbose: options.verbose ?? false,
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

    // Check if server is already running on the port
    const isRunning = await this.isServerRunning();
    if (isRunning) {
      this.log(`Server already running on port ${this.options.port}, skipping spawn`);
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
          throw new Error(`Annotator server file not found at ${serverFile} or ${fallbackFile}`);
        }
      } else {
        // Use node for compiled CJS in production
        cmd = 'node';
        args = [serverFile];
      }
    }

    // Add CLI arguments
    args.push('--port', String(this.options.port));
    args.push('--listen', this.options.listenAddress);
    args.push('--public-address', this.options.publicAddress);
    if (this.options.verbose) {
      args.push('--verbose');
    }

    this.log(`Starting annotator server: ${cmd} ${args.join(' ')}`);
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
        console.error(`[annotator-server] Error: ${data}`);
      });
    }

    this.serverProcess.on('error', (error) => {
      console.error('[annotator-server] Failed to start:', error);
    });

    this.serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[annotator-server] Process exited with code ${code}`);
      }
      this.serverProcess = null;
    });

    // Give server a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.log('Stopping annotator server...');

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
            this.log('Force killing annotator server...');
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


  private async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.options.listenAddress}:${this.options.port}/health`, {
        signal: AbortSignal.timeout(1000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[annotator-plugin] ${message}`);
    }
  }

  getInjectScript(): string {
    return `<script src="${this.options.publicAddress}/annotator-toolbar.js" type="module" async></script>`;
  }

  shouldInject(): boolean {
    return true;
  }

}

function injectScriptIntoHtml(html: string, scriptTag: string): string {
  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}\n</body>`);
  } else if (html.includes('</html>')) {
    return html.replace('</html>', `${scriptTag}\n</html>`);
  }
  return html + scriptTag;
}

export function annotatorPlugin(options: AnnotatorPluginOptions = {}): Plugin {
  let serverManager: AnnotatorServerManager;

  return {
    name: 'vite-plugin-annotator',
    // Only apply plugin during development (serve command)
    apply: 'serve',

    configResolved() {
      serverManager = new AnnotatorServerManager(options);
    },

    async buildStart() {
      await serverManager.start();
    },

    // For regular Vite apps (SPA)
    transformIndexHtml(html: string) {
      if (!serverManager || !serverManager.shouldInject()) {
        return html;
      }
      return injectScriptIntoHtml(html, serverManager.getInjectScript());
    },

    // For SSR frameworks like Nuxt - intercept HTML responses
    configureServer(server: ViteDevServer) {
      server.middlewares.use((_req, res, next) => {
        if (!serverManager || !serverManager.shouldInject()) {
          return next();
        }

        // Only intercept HTML responses
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);
        let chunks: Buffer[] = [];
        let isHtml = false;

        res.write = function(chunk: any, ...args: any[]) {
          // Check content-type on first write
          const contentType = res.getHeader('content-type');
          if (typeof contentType === 'string' && contentType.includes('text/html')) {
            isHtml = true;
          }

          if (isHtml && chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
          }
          return originalWrite(chunk, ...args);
        } as any;

        res.end = function(chunk?: any, ...args: any[]) {
          if (chunk) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }

          if (isHtml && chunks.length > 0) {
            const html = Buffer.concat(chunks).toString('utf-8');
            const injectedHtml = injectScriptIntoHtml(html, serverManager.getInjectScript());

            // Update content-length header
            res.setHeader('content-length', Buffer.byteLength(injectedHtml));
            return originalEnd(injectedHtml, ...args);
          }

          return originalEnd(chunk, ...args);
        } as any;

        next();
      });
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
export default annotatorPlugin;