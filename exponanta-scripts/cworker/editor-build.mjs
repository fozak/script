/**
 * build.mjs — CW BlockNote Editor build script
 *
 * Usage:
 *   node editor-src/build.mjs              # production build
 *   node editor-src/build.mjs --watch      # watch mode
 *   node editor-src/build.mjs --dev        # unminified
 *
 * Output:
 *   editor.js    — ES module bundle (~600KB gzipped ~180KB)
 *   editor.css   — BlockNote + Mantine styles
 *
 * Commit both output files to your repo.
 * Load in threads.html:
 *   <link rel="stylesheet" href="editor.css">
 *   ...
 *   const { mount, mountRenderer } = await import('./editor.js')
 */

import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
//const rootDir = path.resolve(__dirname, '..')
const rootDir = __dirname

const srcDir = __dirname

const args = process.argv.slice(2)
const isWatch = args.includes('--watch')
const isDev = args.includes('--dev')

const config = {
  entryPoints: [path.join(srcDir, 'editor.jsx')],
  bundle: true,
  outfile: path.join(rootDir, 'editor.js'),
  format: 'esm',          // ES module — loaded via dynamic import()
  target: ['es2020'],
  minify: !isDev,
  sourcemap: isDev,
  metafile: true,

  // Inline CSS into a separate file
  // esbuild extracts CSS automatically when bundling React/Mantine
  splitting: false,

  loader: {
    '.jsx': 'jsx',
    '.js':  'jsx',       // some blocknote internals need JSX parsing
    '.css': 'css',
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.woff':  'file',
    '.woff2': 'file',
  },

  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },

  plugins: [
    {
      // Extract CSS to editor.css
      name: 'css-extractor',
      setup(build) {
        build.onEnd(async (result) => {
          // esbuild outputs editor.css automatically next to editor.js
          // when CSS imports are encountered in the bundle
          const outputFiles = Object.keys(result.metafile?.outputs || {})
          const cssFile = outputFiles.find(f => f.endsWith('.css'))
          const jsSize  = outputFiles.find(f => f.endsWith('.js'))

          console.log('\n✅ Build complete')
          if (cssFile) console.log(`   CSS: ${cssFile}`)
          if (jsSize)  console.log(`   JS:  ${jsSize}`)
          console.log(`   Mode: ${isDev ? 'development' : 'production'}`)
          console.log('')
        })
      }
    }
  ],

  conditions: ['style', 'browser', 'module', 'import', 'default'],

  logLevel: 'info',
}

if (isWatch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('👀 Watching for changes...')
} else {
  try {
    const result = await esbuild.build(config)

    // Print bundle analysis
    if (result.metafile) {
      const outputs = result.metafile.outputs
      for (const [file, meta] of Object.entries(outputs)) {
        const kb = (meta.bytes / 1024).toFixed(1)
        console.log(`📦 ${path.basename(file)}: ${kb} KB`)
      }
    }
  } catch (err) {
    console.error('❌ Build failed:', err.message)
    process.exit(1)
  }
}
