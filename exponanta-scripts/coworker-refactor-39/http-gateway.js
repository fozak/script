// ./http-gateway.js
export default {
  config: {
    rateLimit: { ip: { max: 100, window: 60000 }, user: { max: 1000, window: 60000 } },
    bodySize: 102400,
    methods: ['POST'],
    contentType: 'application/json'
  },

 async execute(payload, run_doc) {
  const ip = payload.headers?.get('CF-Connecting-IP') 
    || payload.headers?.get('X-Forwarded-For') 
    || 'unknown';

  if (!this.checkRateLimit(`ip:${ip}`)) {
    run_doc.input['Adapter.http-gateway'] = '-1';
    run_doc.error = '429 Too Many Requests';
    return;
  }

  const contentLength = parseInt(payload.headers?.get('Content-Length') || 0);
  if (contentLength > this.config.bodySize) {
    run_doc.input['Adapter.http-gateway'] = '-1';
    run_doc.error = '413 Payload Too Large';
    return;
  }

  if (!this.config.methods.includes(payload.method)) {
    run_doc.input['Adapter.http-gateway'] = '-1';
    run_doc.error = '405 Method Not Allowed';
    return;
  }

  const contentType = payload.headers?.get('Content-Type') || '';
  if (!contentType.includes(this.config.contentType)) {
    run_doc.input['Adapter.http-gateway'] = '-1';
    run_doc.error = '400 Invalid Content-Type';
    return;
  }

  let body;
  try {
    body = await payload.json();
  } catch {
    run_doc.input['Adapter.http-gateway'] = '-1';
    run_doc.error = '400 Invalid JSON';
    return;
  }

  if (!body.operation) {
    run_doc.input['Adapter.http-gateway'] = '-1';
    run_doc.error = '400 Missing operation';
    return;
  }

  run_doc.operation = body.operation;
  run_doc.target_doctype = body.target_doctype || null;
  run_doc.query = body.query || {};

  Object.assign(run_doc.input, body.input, { 'Adapter.http-gateway': '1' });

  run_doc.user = { 
    'Adapter.http-gateway': { 
      ip, 
      method: payload.method, 
      contentType, 
      token: payload.headers?.get('Authorization') || null, 
      authenticated: 0 
    } 
  };
},

checkRateLimit(key) {
  this._rateLimits = this._rateLimits || new Map();
  const now = Date.now();
  const isUser = key.startsWith('user:');
  const cfg = isUser ? this.config.rateLimit.user : this.config.rateLimit.ip;
  let times = this._rateLimits.get(key) || [];
  times = times.filter(t => t > now - cfg.window);
  if (times.length >= cfg.max) return false;
  times.push(now);
  this._rateLimits.set(key, times);
  return true;
}
}