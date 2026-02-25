import './CW-state.js';

if (typeof process !== 'undefined') {
  const { config } = await import('dotenv');
  config();
}

async function bootstrap(env) {
  // Node.js — use process.env after dotenv loaded
  const resolvedEnv = env || (typeof process !== 'undefined' ? process.env : {});
  
  const base = resolvedEnv.BASE_URL || 'http://localhost:3000';
  const config = await fetch(`${base}/config.json`).then(r => r.json());
  if (resolvedEnv.JWT_SECRET) config.auth.jwtSecret = resolvedEnv.JWT_SECRET;
  globalThis.CW._config = config;

  const docs = await fetch(`${base}/db.json`).then(r => r.json());
  await globalThis.CW._compileDocument({ target: { data: docs.filter(d => d.doctype === 'Adapter') } });
  console.log('✅ bootstrap complete');
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => bootstrap());
} else {
  bootstrap();
}

export default {
  async fetch(request, env) {
    if (!globalThis.CW._booted) {
      await bootstrap(env);
      globalThis.CW._booted = true;
    }
    return globalThis.CW.controller(request);
  }
};