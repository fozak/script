// index.js
import './CW-state.js';
import './CW-config.js';
import './CW-controller.js';
import './CW-adapters.js';

async function bootstrap() {
  await globalThis.CW.controller({ operation: 'init' });
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



// ============================================================
