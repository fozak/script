;(async () => {

  let pass = 0, fail = 0
  const test   = async (name, fn) => { try { await fn(); console.log('  ✅', name); pass++ } catch(e) { console.log('  ❌', name+':', e.message); fail++ } }
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'failed') }

  // ── boot: fetch first available Project ──────────────────
  console.log('\n── boot ──')
  const bootRun = await CW.run({
    operation:      'select',
    target_doctype: 'Project',
    options:        { render: false },
  })
  const project = bootRun.target?.data?.[0]
  if (!project) { console.error('No Project found — create one first'); return }
  console.log('  using project:', project.name, project.project_name || project.title || '')

  // ── Task A — root task ────────────────────────────────────
  console.log('\n── Task A (root, parent = Project) ──')
  const taskARun = await bootRun.child({
    operation:      'create',
    target_doctype: 'Task',
    input:          { subject: '[TEST] Task A', project: project.name },
    options:        { render: false },
  })
  const taskA = taskARun.target?.data?.[0]
  console.log('  name:', taskA?.name, '| top_parent:', taskA?.top_parent)

  await test('Task A created',                  () => assert(!taskARun.error, taskARun.error))
  await test('Task A top_parent is unset',      () => assert(!taskA?.top_parent, `got: ${taskA?.top_parent}`))
  await test('Task A owner set',                () => assert(taskA?.owner, 'owner missing'))
  await test('Task A creation set',             () => assert(taskA?.creation, 'creation missing'))
  await test('Task A parent_run_id = bootRun',  () => assert(taskARun.parent_run_id === bootRun.name, `got: ${taskARun.parent_run_id}`))

  // ── Task B — subtask of A ─────────────────────────────────
  console.log('\n── Task B (subtask of A) ──')
  const taskBRun = await taskARun.child({
    operation:      'create',
    target_doctype: 'Task',
    input:          { subject: '[TEST] Task B', project: project.name, parent_task: taskA.name },
    options:        { render: false },
  })
  const taskB = taskBRun.target?.data?.[0]
  console.log('  name:', taskB?.name, '| top_parent:', taskB?.top_parent)

  await test('Task B created',                  () => assert(!taskBRun.error, taskBRun.error))
  await test('Task B top_parent = Task A',      () => assert(taskB?.top_parent === taskA.name, `expected ${taskA.name}, got: ${taskB?.top_parent}`))
  await test('Task B parent_run_id = taskARun', () => assert(taskBRun.parent_run_id === taskARun.name, `got: ${taskBRun.parent_run_id}`))
  await test('taskARun has taskBRun as child',  () => assert(taskARun.child_run_ids.includes(taskBRun.name), 'not in child_run_ids'))

  // ── Task C — sub-subtask of B ─────────────────────────────
  console.log('\n── Task C (sub-subtask of B) ──')
  const taskCRun = await taskBRun.child({
    operation:      'create',
    target_doctype: 'Task',
    input:          { subject: '[TEST] Task C', project: project.name, parent_task: taskB.name },
    options:        { render: false },
  })
  const taskC = taskCRun.target?.data?.[0]
  console.log('  name:', taskC?.name, '| top_parent:', taskC?.top_parent)

  await test('Task C created',                  () => assert(!taskCRun.error, taskCRun.error))
  await test('Task C top_parent = Task A',      () => assert(taskC?.top_parent === taskA.name, `expected ${taskA.name}, got: ${taskC?.top_parent}`))
  await test('Task C parent_run_id = taskBRun', () => assert(taskCRun.parent_run_id === taskBRun.name, `got: ${taskCRun.parent_run_id}`))

  // ── one query: all descendants of Task A ─────────────────
  console.log('\n── one query: all descendants of Task A ──')
  const allRun = await taskARun.child({
    operation:      'select',
    target_doctype: 'Task',
    query:          { where: { top_parent: taskA.name } },
    options:        { render: false },
  })
  const names = allRun.target?.data?.map(t => t.name) || []
  console.log('  found:', names)

  await test('query returns 2 descendants',   () => assert(names.length === 2, `got ${names.length}: ${names}`))
  await test('Task B in descendants',         () => assert(names.includes(taskB.name), 'Task B missing'))
  await test('Task C in descendants',         () => assert(names.includes(taskC.name), 'Task C missing'))
  await test('Task A not in descendants',     () => assert(!names.includes(taskA.name), 'Task A should not appear'))

  // ── summary ───────────────────────────────────────────────
  console.log(`\n── ${pass} passed, ${fail} failed ──`)
  if (fail > 0) console.warn('Some tests failed — check systemFields in CW-config.js')
  else console.log('All tests passed ✅')

})()
