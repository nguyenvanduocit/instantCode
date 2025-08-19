const esbuild = require('esbuild')
const path = require('path')

const rootDir = path.join(__dirname, '..')

esbuild.build({
  entryPoints: [path.join(rootDir, 'src/vite-plugin.ts')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/vite-plugin.js'),
  platform: 'node',
  target: 'node18',
  format: 'esm',
  minify: false, // Keep readable for debugging
  sourcemap: true,
  external: [
    'vite',
    'child_process',
    'path',
    'fs',
    'url'
  ],
}).then(() => {
  console.log('Vite plugin build completed successfully')
}).catch((err) => {
  console.error('Vite plugin build failed:', err)
  process.exit(1)
})