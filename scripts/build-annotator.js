const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')

esbuild.build({
  entryPoints: [path.join(rootDir, 'src/annotator-toolbar.ts')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/annotator-toolbar.js'),
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