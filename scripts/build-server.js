const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')

esbuild.build({
  entryPoints: [path.join(rootDir, 'src/index.ts')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/index.js'),
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  minify: true,
  sourcemap: false,
  external: [
    '@anthropic-ai/claude-code',
    //'express',
    //'ws',
    'cors'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
}).then(() => {
  console.log('Server build completed successfully')
}).catch((err) => {
  console.error('Server build failed:', err)
  process.exit(1)
})