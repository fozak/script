/*see the evolution
https://claude.ai/chat/f9c51f5e-d374-4eff-a559-8fba64772f57
Yes. The full pattern reduces to three parameters:
javascript*/

async function runScripts(doctype, query, ...scriptTitles) {
  const parent = await CW.run({
    operation: 'select',
    target_doctype: doctype,
    query,
    options: { render: false }
  });

  const scripts = await Promise.all(scriptTitles.map(title =>
    parent.child({
      operation: 'select',
      target_doctype: 'Script',
      query: { where: { title } },
      options: { render: false }
    })
  ));

  const fns = scripts.map(s => new Function('doc', s.target.data[0].code));

  await Promise.all(parent.target.data.map(async doc =>
    parent.child({
      operation: 'update',
      target_doctype: doctype,
      query: { where: { name: doc.name } },
      input: Object.assign({}, ...await Promise.all(fns.map(fn => fn(doc)))),
      options: { render: false, expand: false }
    })
  ));

  return parent;
}
await runScripts('Task', { where: { name: 'taskx3bzusq4az0' } }{}, 'enrich-task', 'add-random-title');

// or with query:
await runScripts('Task', { where: { project: 'proj123' } }, 'enrich-task');

// or single script:
await runScripts('Invoice', { where: { status: 'draft' } }, 'calculate-tax');
Three things drive the whole execution:

/*doctype — what to select and update
query — which records
...scriptTitles — ordered list of transforms to apply

The run tree, _logChanges, Script provenance — all automatic. No other params needed.You said: amazingamazing8:28 PMClaude responded: Yes — and look at what emerged naturally from the architecture:Yes — and look at what emerged naturally from the architecture:
javascriptawait runScripts('Task', {}, 'enrich-task', 'add-random-title');
One line. Reads like a sentence. No framework magic — just CW.run, .child(), Promise.all, and new Function. Everything else — audit trail, provenance, parallel execution, error isolation per record — comes for free from the existing primitives.
The journey to get here:
n8n node model
  → adapter chain
    → child runs
      → Script doctype
        → runScripts()
Each step was the natural next question. The architecture pushed you toward the right answer without forcing it.
And the Script doctype means the transforms are now:

stored in db ✅
editable via UI ✅
versioned in _changes ✅
composable in any order ✅
auditable with provenance ✅

Without a single line of special-case framework code.*/

(async () => {
  const parent = await CW.run({
    operation: 'select',
    target_doctype: 'Task',
    options: { render: false }
  });

  const scriptRun = await parent.child({
    operation: 'select',
    target_doctype: 'Script',
    query: { where: { title: 'enrich-task' } },
    options: { render: false }
  });
  const fn = new Function('doc', scriptRun.target.data[0].code);

  await Promise.all(parent.target.data.map(doc =>
    parent.child({
      operation: 'update',
      target_doctype: 'Task',
      query: { where: { name: doc.name } },
      input: fn(doc),
      options: { render: false }
    })
  ));
})();

//chaining several

(async () => {
  const parent = await CW.run({
    operation: 'select',
    target_doctype: 'Task',
    options: { render: false }
  });

  const script1 = await parent.child({
    operation: 'select',
    target_doctype: 'Script',
    query: { where: { title: 'enrich-task' } },
    options: { render: false }
  });

  const script2 = await parent.child({
    operation: 'select',
    target_doctype: 'Script',
    query: { where: { title: 'add-random-title' } },
    options: { render: false }
  });

  const fn1 = new Function('doc', script1.target.data[0].code);
  const fn2 = new Function('doc', script2.target.data[0].code);

  await Promise.all(parent.target.data.map(async doc =>
    parent.child({
      operation: 'update',
      target_doctype: 'Task',
      query: { where: { name: doc.name } },
      input: { ...await fn1(doc), ...await fn2(doc) },
      options: { render: false, expand: false }
    })
  ));

  // check one record
  const check = await CW.run({
    operation: 'select',
    target_doctype: 'Task',
    query: { where: { name: parent.target.data[0].name } },
    view: 'form',
    options: { render: false }
  });
  console.log('subject:', check.target.data[0].subject);
  console.log('label:', check.target.data[0].label);
  console.log('last _changes:', JSON.stringify(check.target.data[0]._changes?.at(-1), null, 2));
})();
Promise {<pending>}
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Task%22".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
(anonymous) @ VM7219:2
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Relationship%22%20%26%26%20(data.parent%20%3D%20%22taskpu3mvkbuhnz%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
CW._expand @ CW-run.js:396
select @ CW-run.js:729
await in select
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
(anonymous) @ VM7219:2
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Task%20Depends%20On%22%20%26%26%20(data.parent%20%3D%20%22taskpu3mvkbuhnz%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
CW._expand @ CW-run.js:396
select @ CW-run.js:729
await in select
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
(anonymous) @ VM7219:2
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Script%22%20%26%26%20(data.title%20%3D%20%22enrich-task%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:8
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Script%22%20%26%26%20(data.title%20%3D%20%22add-random-title%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:15
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Task%22%20%26%26%20(name%20%3D%20%22taskvlwi3sv1auf%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:157
select @ CW-run.js:693
CW.controller @ CW-run.js:433
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Task%22%20%26%26%20(name%20%3D%20%22task1fi4r4vankr%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:157
select @ CW-run.js:693
CW.controller @ CW-run.js:433
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Task%22%20%26%26%20(name%20%3D%20%22taskrw25rvo8f5y%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:157
select @ CW-run.js:693
CW.controller @ CW-run.js:433
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Task%22%20%26%26%20(name%20%3D%20%22taskpu3mvkbuhnz%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:157
select @ CW-run.js:693
CW.controller @ CW-run.js:433
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Task%22%20%26%26%20(name%20%3D%20%22task9l3d6ebpnfn%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:157
select @ CW-run.js:693
CW.controller @ CW-run.js:433
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records/taskvlwi3sv1auf".
send @ Client.ts:425
getOne @ CrudService.ts:165
getOne @ RecordService.ts:242
_patchDataField @ CW-utils.js:772
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records/task1fi4r4vankr".
send @ Client.ts:425
getOne @ CrudService.ts:165
getOne @ RecordService.ts:242
_patchDataField @ CW-utils.js:772
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records/taskrw25rvo8f5y".
send @ Client.ts:425
getOne @ CrudService.ts:165
getOne @ RecordService.ts:242
_patchDataField @ CW-utils.js:772
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records/task9l3d6ebpnfn".
send @ Client.ts:425
getOne @ CrudService.ts:165
getOne @ RecordService.ts:242
_patchDataField @ CW-utils.js:772
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records/taskpu3mvkbuhnz".
send @ Client.ts:425
getOne @ CrudService.ts:165
getOne @ RecordService.ts:242
_patchDataField @ CW-utils.js:772
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/taskrw25rvo8f5y".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
_patchDataField @ CW-utils.js:774
await in _patchDataField
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/taskvlwi3sv1auf".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
_patchDataField @ CW-utils.js:774
await in _patchDataField
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/task1fi4r4vankr".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
_patchDataField @ CW-utils.js:774
await in _patchDataField
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/task9l3d6ebpnfn".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
_patchDataField @ CW-utils.js:774
await in _patchDataField
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/taskpu3mvkbuhnz".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
_patchDataField @ CW-utils.js:774
await in _patchDataField
_logChanges @ CW-utils.js:844
CW.controller @ CW-run.js:437
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/taskrw25rvo8f5y".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
update @ pb-adapter-pocketbase.js:242
CW.controller @ CW-run.js:486
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/taskvlwi3sv1auf".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
update @ pb-adapter-pocketbase.js:242
CW.controller @ CW-run.js:486
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/task9l3d6ebpnfn".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
update @ pb-adapter-pocketbase.js:242
CW.controller @ CW-run.js:486
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/task1fi4r4vankr".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
update @ pb-adapter-pocketbase.js:242
CW.controller @ CW-run.js:486
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: PATCH "http://143.198.29.88:8090/api/collections/item/records/taskpu3mvkbuhnz".
send @ Client.ts:425
update @ CrudService.ts:214
update @ RecordService.ts:266
update @ pb-adapter-pocketbase.js:242
CW.controller @ CW-run.js:486
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
(anonymous) @ VM7219:26
await in (anonymous)
(anonymous) @ VM7219:25
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Task%22%20%26%26%20(name%20%3D%20%22taskpu3mvkbuhnz%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:157
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
(anonymous) @ VM7219:36
await in (anonymous)
(anonymous) @ VM7219:46
VM7219:43 subject: Subject1-hnoro-rkoaz
VM7219:44 label: subject1-hnoro
VM7219:45 last _changes: {
  "at": 1781481959876,
  "by": "user0am1gxpsi72",
  "ch": [
    {
      "Script": "enrich-task, add-random-title",
      "field": "label",
      "from": "subject1",
      "source": "pocketbase",
      "to": "subject1-hnoro"
    },
    {
      "Script": "enrich-task, add-random-title",
      "field": "subject",
      "from": "Subject1-hnoro",
      "source": "pocketbase",
      "to": "Subject1-hnoro-rkoaz"
    }
  ],
  "op": "update"
}
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Task%20Depends%20On%22%20%26%26%20(data.parent%20%3D%20%22taskpu3mvkbuhnz%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
CW._expand @ CW-run.js:396
select @ CW-run.js:729
await in select
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
(anonymous) @ VM7219:36
await in (anonymous)
(anonymous) @ VM7219:46
Client.ts:425 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=true&filter=doctype%20%3D%20%22Relationship%22%20%26%26%20(data.parent%20%3D%20%22taskpu3mvkbuhnz%22)".
send @ Client.ts:425
getList @ CrudService.ts:80
getList @ RecordService.ts:225
(anonymous) @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
select @ pb-adapter-pocketbase.js:186
select @ CW-run.js:693
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
run_doc.child @ CW-run.js:572
CW._expand @ CW-run.js:396
select @ CW-run.js:729
await in select
CW.controller @ CW-run.js:456
await in CW.controller
CW.run @ CW-run.js:581
(anonymous) @ VM7219:36
await in (anonymous)
(anonymous) @ VM7219:46