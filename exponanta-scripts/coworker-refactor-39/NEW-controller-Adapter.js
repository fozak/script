import httpGateway from "./http-gateway.js";

await new Promise(r => {
  const check = () => globalThis.Adapter?.['pocketbase'] ? r() : setTimeout(check, 50);
  check();
});

// NOW overwrite after bootstrap
globalThis.Adapter['http-gateway'] = httpGateway;


// ============================================================
// Risk 10: http-gateway rate limit blocks excess requests
// ============================================================
console.group('Risk 10: http-gateway rate limit');
const makeReq = () => new Request('http://localhost:3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ operation: 'select', target_doctype: 'Item' })
});

const run10 = CW.run({});
httpGateway._rateLimits = new Map(); // reset
httpGateway.config.rateLimit.ip.max = 2; // low limit for test
await httpGateway.execute(makeReq(), run10);
console.assert(run10.input['Adapter.http-gateway'] === '1', '❌ first request should pass');
await httpGateway.execute(makeReq(), run10);
console.assert(run10.input['Adapter.http-gateway'] === '1', '❌ second request should pass');
await httpGateway.execute(makeReq(), run10);
console.assert(run10.input['Adapter.http-gateway'] === '-1', '❌ third request should be rate limited');
console.assert(run10.error === '429 Too Many Requests', '❌ wrong error message');
console.log('✅ Risk 10 passed');
console.groupEnd();

// ============================================================
// Risk 11: http-gateway populates run_doc correctly
// ============================================================
console.group('Risk 11: http-gateway populates run_doc');
httpGateway._rateLimits = new Map();
httpGateway.config.rateLimit.ip.max = 100;
const run11 = CW.run({});
const req11 = new Request('http://localhost:3000', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  },
  body: JSON.stringify({ operation: 'select', target_doctype: 'Item', query: { take: 5 }, input: { search: 'abc' } })
});
await httpGateway.execute(req11, run11);
console.assert(run11.operation === 'select', '❌ operation not set');
console.assert(run11.target_doctype === 'Item', '❌ target_doctype not set');
console.assert(run11.query.take === 5, '❌ query not set');
console.assert(run11.input.search === 'abc', '❌ input not set');
console.assert(run11.user['Adapter.http-gateway'].token === 'Bearer test-token', '❌ token not set');
console.assert(run11.user['Adapter.http-gateway'].authenticated === 0, '❌ authenticated should be 0');
console.log('✅ Risk 11 passed');
console.groupEnd();

// ============================================================
// Risk 12: http-gateway rejects invalid requests
// ============================================================
console.group('Risk 12: http-gateway rejects invalid requests');
httpGateway._rateLimits = new Map();

const run12a = CW.run({});
await httpGateway.execute(new Request('http://localhost:3000', { method: 'GET' }), run12a);
console.assert(run12a.input['Adapter.http-gateway'] === '-1', '❌ GET should be rejected');
console.assert(run12a.error === '405 Method Not Allowed', '❌ wrong error for GET');

const run12b = CW.run({});
await httpGateway.execute(new Request('http://localhost:3000', { 
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: 'hello'
}), run12b);
console.assert(run12b.input['Adapter.http-gateway'] === '-1', '❌ wrong content-type should be rejected');

const run12c = CW.run({});
await httpGateway.execute(new Request('http://localhost:3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_doctype: 'Item' }) // missing operation
}), run12c);
console.assert(run12c.input['Adapter.http-gateway'] === '-1', '❌ missing operation should be rejected');
console.assert(run12c.error === '400 Missing operation', '❌ wrong error for missing operation');

console.log('✅ Risk 12 passed');
console.groupEnd();