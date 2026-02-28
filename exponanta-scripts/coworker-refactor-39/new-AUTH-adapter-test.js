// new-AUTH-adapter-test.js
import './CW-state.js';
import './CW-config.js';
import './CW-utils.js';
import './NEW-controller.js';
import authAdapter from './auth-adapter.js';

globalThis.CW.Adapter = globalThis.CW.Adapter || {};
globalThis.CW.Adapter['auth'] = authAdapter;

const secret = globalThis.CW._config.adapters.registry.auth.config.jwtSecret;

const adapterKey = `Adapter.${CW._config.adapters.payloadAdapters['Request']}.execute`;

// ── helpers ───────────────────────────────────────────────────
const makeRequest = (overrides = {}) => ({
  method: 'POST',
  headers: {
    get(key) {
      const h = {
        'Content-Type':    'application/json',
        'Content-Length':  '50',
        'CF-Connecting-IP': '1.2.3.4',
        ...overrides.headers,
      };
      return h[key] ?? null;
    },
  },
  json: async () => overrides.body ?? { operation: 'signin', input: { email: 'a@b.com' } },
  ...overrides,
});

const makeRun  = () => ({ input: {}, user: {} });

const makeUser = (overrides = {}) => ({
  email:          'alice@example.com',
  name:           'Alice',
  _allowed_read:  ['Admin', 'Editor'],
  email_verified: true,
  ...overrides,
});

const makeRunDoc = (user) => ({
  target: { data: [makeUser(user)] }
});

// ── TEST 1: valid request parsed correctly ────────────────────
console.group('Test 1: valid request parsed correctly');
const run1 = makeRun();
await execute(makeRequest(), run1);
console.assert(run1.input[adapterKey] === '1',           '❌ not marked as parsed');
console.assert(run1.operation === 'signin',                  '❌ operation not set');
console.assert(run1.user[adapterKey].ip === '1.2.3.4',   '❌ ip not captured');
console.assert(run1.user[adapterKey].authenticated === 0,'❌ authenticated should be 0');
console.assert(run1.user[adapterKey].token === null,     '❌ token should be null');
console.log('✅ Test 1 passed');
console.groupEnd();

// ── TEST 2: GET request rejected ──────────────────────────────
console.group('Test 2: GET request rejected');
const run2 = makeRun();
await execute(makeRequest({ method: 'GET' }), run2);
console.assert(run2.input[adapterKey] === '-1',        '❌ should be marked failed');
console.assert(run2.error === '405 Method Not Allowed',    '❌ wrong error');
console.log('✅ Test 2 passed');
console.groupEnd();

// ── TEST 3: missing operation rejected ────────────────────────
console.group('Test 3: missing operation rejected');
const run3 = makeRun();
await execute(makeRequest({ body: { input: { email: 'a@b.com' } } }), run3);
console.assert(run3.input[adapterKey] === '-1',        '❌ should be marked failed');
console.assert(run3.error === '400 Missing operation',     '❌ wrong error');
console.log('✅ Test 3 passed');
console.groupEnd();

// ── TEST 4: IP rate limit enforced ────────────────────────────
console.group('Test 4: IP rate limit enforced');
const ipLimit = authAdapter.config.rateLimit.ip;
for (let i = 0; i < ipLimit.max; i++) checkRateLimit('ip:9.9.9.9');
const run4 = makeRun();
const req4  = makeRequest();
req4.headers = { get(key) { return key === 'CF-Connecting-IP' ? '9.9.9.9' : makeRequest().headers.get(key); } };
await execute(req4, run4);
console.assert(run4.input[adapterKey] === '-1',        '❌ should be rate limited');
console.assert(run4.error === '429 Too Many Requests',     '❌ wrong error');
console.log('✅ Test 4 passed');
console.groupEnd();

// ── TEST 5: generateToken produces valid JWT structure ────────
console.group('Test 5: generateToken produces valid JWT structure');
const runDoc5 = makeRunDoc();
await generateToken(runDoc5);
const token5  = runDoc5.target.data[0].token;
console.assert(typeof token5 === 'string',         '❌ token not a string');
console.assert(token5.split('.').length === 3,     '❌ JWT must have 3 parts');
console.log('token:', token5);
console.log('✅ Test 5 passed');
console.groupEnd();

// ── TEST 6: verifyJWT returns correct payload ─────────────────
console.group('Test 6: verifyJWT returns correct payload');
const payload6 = await verifyJWT(token5, secret);
console.assert(payload6 !== null,                              '❌ valid token rejected');
console.assert(payload6.email === 'alice@example.com',         '❌ email wrong');
console.assert(payload6.name  === 'Alice',                     '❌ name wrong');
console.assert(payload6.email_verified === 1,                  '❌ email_verified should be 1');
console.assert(Array.isArray(payload6._allowed_read),          '❌ _allowed_read lost');
console.log('decoded payload:', payload6);
console.log('✅ Test 6 passed');
console.groupEnd();

// ── TEST 7: verifyJWT rejects wrong secret ────────────────────
console.group('Test 7: verifyJWT rejects wrong secret');
const payload7 = await verifyJWT(token5, 'wrong-secret');
console.assert(payload7 === null, '❌ should reject token with wrong secret');
console.log('✅ Test 7 passed');
console.groupEnd();

// ── TEST 8: verifyJWT rejects expired token ───────────────────
console.group('Test 8: verifyJWT rejects expired token');
const runDoc8   = makeRunDoc({ email: 'bob@example.com', name: 'Bob' });
const authCfg   = globalThis.CW._config.adapters.registry.auth.config;
const savedExp  = authCfg.accessTokenExpiryMs;
authCfg.accessTokenExpiryMs = -60 * 1000;
await generateToken(runDoc8);
authCfg.accessTokenExpiryMs = savedExp;
const payload8  = await verifyJWT(runDoc8.target.data[0].token, secret);
console.assert(payload8 === null, '❌ expired token should be rejected');
console.log('✅ Test 8 passed');
console.groupEnd();

// ── TEST 9: email_verified false → 0 in JWT ───────────────────
console.group('Test 9: email_verified false maps to 0');
const runDoc9  = makeRunDoc({ email_verified: false });
await generateToken(runDoc9);
const payload9 = await verifyJWT(runDoc9.target.data[0].token, secret);
console.assert(payload9.email_verified === 0, '❌ email_verified false should become 0');
console.log('✅ Test 9 passed');
console.groupEnd();

// ── TEST 10: Authorization header captured ────────────────────
console.group('Test 10: Authorization header captured on run_doc');
const run10 = makeRun();
const req10 = makeRequest();
req10.headers = {
  get(key) {
    if (key === 'Authorization') return 'Bearer some.jwt.token';
    return makeRequest().headers.get(key);
  }
};
await execute(req10, run10);
console.assert(run10.user[adapterKey].token === 'Bearer some.jwt.token', '❌ token not captured');
console.log('✅ Test 10 passed');
console.groupEnd();



// ── IMPLEMENTATION OF CW.controller AND ADAPTER CALLING ───────
console.group('Test 11: POST call');
// simulate a real HTTP Request
const request = new Request('http://localhost:3000', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': '60',
    'CF-Connecting-IP': '1.2.3.4',
  },
  body: JSON.stringify({
    operation: 'signup',
    target_doctype: 'User',
    input: { email: 'alice@example.com', password: '123456' },
  }),
});

const run_doc = await CW.controller(request);

console.log('run_doc:', run_doc);
console.log('CW.runs:', CW.runs);


// Test 12: full round trip - token in Authorization header
console.group('Test 12: authenticated request round trip');

// generate a real token first
const runDoc12 = makeRunDoc({ email: 'alice@example.com', name: 'Alice', _allowed_read: ['Admin'], email_verified: true });
await generateToken(runDoc12);
const realToken = runDoc12.target.data[0].token;
console.log('generated token:', realToken);

// make a real Request with that token
const request12 = new Request('http://localhost:3000', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': '80',
    'CF-Connecting-IP': '5.6.7.8',
    'Authorization': `Bearer ${realToken}`,
  },
  body: JSON.stringify({
    operation: 'select',
    target_doctype: 'Item',
    query: { take: 10 },
    input: { filter: 'active' },
  }),
});

const run12 = await CW.controller(request12);
console.log('run_doc:', JSON.stringify(run12, null, 2));

console.assert(run12.operation === 'select',          '❌ operation not resolved');
console.assert(run12.target_doctype === 'Item',       '❌ target_doctype not resolved');
console.assert(run12.query.take === 10,               '❌ query not resolved');
console.assert(run12.input.filter === 'active',       '❌ input data lost');
console.log('✅ Test 12 passed');
console.groupEnd();
