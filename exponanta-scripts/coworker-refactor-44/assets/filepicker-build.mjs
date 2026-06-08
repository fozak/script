
import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir   = path.resolve(__dirname, '..')
const isWatch   = process.argv.includes('--watch')
const isDev     = process.argv.includes('--dev')

const config = {
  entryPoints: [path.join(__dirname, 'filepicker.jsx')],
  bundle:      true,
  outfile: path.join(__dirname, 'filepicker.js'),
  format:      'esm',
  platform:    'browser',
  target:      ['es2020'],
  minify:      !isDev,
  sourcemap:   isDev,
  metafile:    true,

  loader: {
    '.jsx': 'jsx',
    '.js':  'jsx',
    '.css': 'css',
    '.svg': 'dataurl',
    '.png': 'dataurl',
  },

  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },

  plugins: [{
    name: 'build-report',
    setup(build) {
      build.onEnd(result => {
        const outputs = result.metafile?.outputs || {}
        for (const [file, meta] of Object.entries(outputs)) {
          console.log(`📦 ${path.basename(file)}: ${(meta.bytes / 1024).toFixed(1)} KB`)
        }
        console.log(`✅ filepicker.js built (${isDev ? 'dev' : 'production'})`)
      })
    }
  }],

  logLevel: 'info',
}

if (isWatch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('👀 Watching...')
} else {
  try {
    await esbuild.build(config)
  } catch (err) {
    console.error('❌ Build failed:', err.message)
    process.exit(1)
  }
}
