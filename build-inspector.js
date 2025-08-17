const esbuild = require('esbuild')

esbuild.build({
  entryPoints: ['src/inspector-toolbar.ts'],
  bundle: true,
  outfile: 'res/inspector-toolbar.js',
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