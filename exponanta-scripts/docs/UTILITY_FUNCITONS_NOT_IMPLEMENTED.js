globalThis.CW._resolveInputKey = function(key, value, run_doc) {
  // leading dot → run_doc field
  if (key.startsWith('.')) {
    run_doc[key.slice(1)] = value;
    return;
  }

  const parts = key.split('.');
  
  // 3+ parts → _state signal
  if (parts.length >= 3) {
    if (!run_doc.input._state || typeof run_doc.input._state !== 'object') {
      run_doc.input._state = {};
    }
    run_doc.input._state[key] = value;
    return;
  }

  // 2-part → run_doc path
  if (parts.length === 2) {
    const [l1, l2] = parts;
    if (!run_doc[l1] || typeof run_doc[l1] !== 'object') run_doc[l1] = {};
    run_doc[l1][l2] = value;
    return;
  }

  // 1-part → schema field delta
  run_doc.input[key] = value;
};
VM271:1 Uncaught TypeError: Cannot set properties of undefined (setting '_resolveInputKey')
    at <anonymous>:1:32
(anonymous) @ VM271:1Understand this error
Navigated to https://exponanta.com/
js?id=G-NSLH4990V1:232 Fetch failed loading: POST "https://www.google-analytics.com/g/collect?v=2&tid=G-NSLH4990V1&gtm=45je62n0v9238889167za200zd9238889167&_p=1772025166127&gcd=13l3l3l3l1l1&npa=0&dma=0&cid=2137039668.1766796547&ul=en-us&sr=1280x800&uaa=x86&uab=64&uafvl=Not%253AA-Brand%3B99.0.0.0%7CGoogle%2520Chrome%3B145.0.7632.76%7CChromium%3B145.0.7632.76&uamb=0&uam=&uap=Windows&uapv=19.0.0&uaw=0&are=1&frm=0&pscdl=noapi&_eu=AAAAAAQ&_s=1&tag_exp=103116026~103200004~104527907~104528501~104684208~104684211~115938466~115938468~117455676~117455678&sid=1772025166&sct=34&seg=1&dl=https%3A%2F%2Fexponanta.com%2F&dt=Center%20for%20Entrepreneurship%20%7C%20Center%20for%20Entrepreneurship&en=page_view&_ee=1&tfd=5658".
rd @ js?id=G-NSLH4990V1:232
bm @ js?id=G-NSLH4990V1:391
JP @ js?id=G-NSLH4990V1:895
MP @ js?id=G-NSLH4990V1:895
SP.flush @ js?id=G-NSLH4990V1:903
(anonymous) @ js?id=G-NSLH4990V1:901
setTimeout
SP.N @ js?id=G-NSLH4990V1:901
SP.add @ js?id=G-NSLH4990V1:903
k.An @ js?id=G-NSLH4990V1:919
k.As @ js?id=G-NSLH4990V1:919
(anonymous) @ js?id=G-NSLH4990V1:917
vm @ js?id=G-NSLH4990V1:402
wo @ js?id=G-NSLH4990V1:422
(anonymous) @ js?id=G-NSLH4990V1:917
c @ js?id=G-NSLH4990V1:846
EL @ js?id=G-NSLH4990V1:846
k.zs @ js?id=G-NSLH4990V1:917
b @ js?id=G-NSLH4990V1:926
v @ js?id=G-NSLH4990V1:544
Em @ js?id=G-NSLH4990V1:404
du @ js?id=G-NSLH4990V1:544
cu.flush @ js?id=G-NSLH4990V1:548
cu.push @ js?id=G-NSLH4990V1:546
bC.config @ js?id=G-NSLH4990V1:698
wC @ js?id=G-NSLH4990V1:707
yC @ js?id=G-NSLH4990V1:710
setTimeout
jd @ js?id=G-NSLH4990V1:228
zC @ js?id=G-NSLH4990V1:713
mn @ js?id=G-NSLH4990V1:999
(anonymous) @ js?id=G-NSLH4990V1:1002
c @ js?id=G-NSLH4990V1:1000
(anonymous) @ js?id=G-NSLH4990V1:1002
(anonymous) @ js?id=G-NSLH4990V1:1002
(anonymous) @ js?id=G-NSLH4990V1:1004
const run = await CW.run({
  operation: 'update',
  target_doctype: 'Task',
  input: {
    // dot prefix → run_doc field
    '.view': 'form',
    
    // 1-part → schema field delta
    'status': 'Open',
    
    // 2-part → run_doc path
    'user.email': 'john@example.com',
    'query.where': { name: 'Task123' },
    
    // 3+ part → _state signal
    'Adapter.pocketbase.update': '',
    '1.0_1.Adapter.auth.signup': ''
  }
});

console.log('run.view:', run.view);                      // 'form'
console.log('run.input.status:', run.input.status);      // 'Open'
console.log('run.user.email:', run.user.email);          // 'john@example.com'
console.log('run.query.where:', run.query.where);        // { name: 'Task123' }
console.log('run.input._state:', run.input._state);      // { 'Adapter.pocketbase.update': '', '1.0_1.Adapter.auth.signup': '' }
console.log('run.input[".view"]:', run.input['.view']);  // undefined — not in input
VM374:1 Uncaught ReferenceError: CW is not defined