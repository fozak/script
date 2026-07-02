




//===
CW._expand = function (run_doc, fieldname) {
  const schema  = CW.Schema?.[run_doc.target_doctype];
  const docName = run_doc.target?.data?.[0]?.name;
  if (!schema || !docName) return;

  const fields = fieldname
    ? schema.fields?.filter(f => f.fieldname === fieldname)
    : schema.fields?.filter(f => f.fieldtype === 'Table' || f.fieldtype === 'Relationship Panel');

  for (const field of fields || []) {
    const exists = run_doc.child_run_ids
      .some(id => CW.runs[id]?.source_field === field.fieldname);
    if (exists) continue;
    run_doc.child({
      operation:      'select',
      target_doctype: field.options,
      query:          { where: { parent: docName } },
      source_field:   field.fieldname,
      options:        { render: false },
      view:           'list',
      component: null,
      container: null,     
    });
  }
};