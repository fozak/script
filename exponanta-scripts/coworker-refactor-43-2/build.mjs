import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isWatch   = process.argv.includes('--watch')
const isDev     = process.argv.includes('--dev')

const config = {
  entryPoints: [path.join(__dirname, 'editor.jsx')],
  bundle:      true,
  outfile:     path.join(__dirname, 'editor.js'),
  format:      'esm',
  platform:    'browser',
  minify:      !isDev,
  sourcemap:   isDev,
  metafile:    true,
  conditions:  ['style', 'browser', 'module', 'import', 'default'],

  external: [],

  plugins: [
    {
      name: 'css-inject',
      setup(build) {
        build.onEnd(() => {
          console.log(`✅ editor.js built (${isDev ? 'dev' : 'production'})`)
        })
      }
    }
  ],

  logLevel: 'info',
}

if (isWatch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('👀 Watching...')
} else {
  try {
    const result = await esbuild.build(config)
    if (result.metafile) {
      for (const [file, meta] of Object.entries(result.metafile.outputs)) {
        console.log(`📦 ${path.basename(file)}: ${(meta.bytes / 1024).toFixed(1)} KB`)
      }
    }
  } catch(err) {
    console.error('❌ Build failed:', err.message)
    process.exit(1)
  }
}
