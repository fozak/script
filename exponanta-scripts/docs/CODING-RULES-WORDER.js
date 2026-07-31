//set env in Worker as golbal and 


globalThis.env = globalThis.env || env

USE only req in signatures:


async function handleRun(req) {
  const run_doc = await req.json()
  try { run_doc.user = await verifyJWT(req.headers.get('Authorization') || '', env.JWT_SECRET) } catch { run_doc.user = {} }
  // ...
}