const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')

esbuild.build({
  entryPoints: [path.join(rootDir, 'src/inspector-toolbar.ts')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/inspector-toolbar.js'),
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  minify: false,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  external: [],
}).catch(() => process.exit(1))