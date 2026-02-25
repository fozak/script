// index.js
// index.js
import 'dotenv/config';  // loads .env — Node.js only, ignored in Cloudflare Worker
import './CW-state.js';

async function bootstrap() {
  const configUrl = typeof process !== 'undefined' 
    ? new URL('./config.json', import.meta.url)
    : './config.json';
  const config = await fetch(configUrl).then(r => r.json());
  if (typeof process !== 'undefined' && process.env?.JWT_SECRET) {
    config.auth.jwtSecret = process.env.JWT_SECRET;
  }
  globalThis.CW._config = config;

  const dbUrl = typeof process !== 'undefined'
    ? new URL('./db.json', import.meta.url)
    : './db.json';
  const docs = await fetch(dbUrl).then(r => r.json());
  const adapters = docs.filter(d => d.doctype === 'Adapter');
  await globalThis.CW._compileDocument({ target: { data: adapters } });

  console.log('✅ bootstrap complete, adapters:', Object.keys(globalThis.CW.Adapter || {}));
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', bootstrap);
} else {
  bootstrap();
}

export default {
  async fetch(request, env) {
    return globalThis.CW.controller(request);
  }
};