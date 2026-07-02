





//v1

{
    "schema_name": "Relationship",
    "doctype": "Schema",
    "is_child": 1,
    "is_submittable": 1,
    "title_field": "related_title",
    "autoname": "generateId",
    "fields": [
      {
        "fieldname": "name",
        "fieldtype": "Data",
        "label": "Name",
        "in_list_view": 1,
        "read_only": 1,
        "hidden": 0
      },
      {
        "fieldname": "related_doctype",
        "fieldtype": "Data",
        "label": "Related Doctype",
        "reqd": 1,
        "in_list_view": 1
      },
      {
        "fieldname": "related_name",
        "fieldtype": "Data",
        "label": "Related Name",
        "reqd": 1,
        "in_list_view": 1
      },
      {
        "fieldname": "related_title",
        "fieldtype": "Data",
        "label": "Related Title",
        "in_list_view": 1
      },
      {
        "fieldname": "type",
        "fieldtype": "Select",
        "label": "Type",
        "options": "",
        "in_list_view": 1
      },
      {
        "fieldname": "notes",
        "fieldtype": "Text",
        "label": "Notes"
      }
    ],
    "_state": {
      "1": {
        "name": "_docstatus",
        "fieldname": "docstatus",
        "values": [
          0,
          1,
          2
        ],
        "options": [
          "Draft",
          "Submitted",
          "Cancelled"
        ],
        "transitions": {
          "0": [
            1,
            2
          ],
          "1": [
            2
          ],
          "2": [
            0
          ]
        },
        "requires": {
          "0_1": {
            "is_submittable": 1
          },
          "1_2": {
            "is_submittable": 1
          },
          "2_0": {
            "is_submittable": 1
          }
        },
        "labels": {
          "0_1": "Accept",
          "0_2": "Reject",
          "1_2": "Cancel",
          "2_0": "Reopen"
        },
        "confirm": {
          "0_2": "Reject this relationship?",
          "1_2": "Cancel this relationship?"
        },
        "sideEffects": {
          "0_1": "async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var access = (CW._config.relationshipAccessMap && CW._config.relationshipAccessMap[rec.parenttype] && CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype] && CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype][rec.type]) || 'none'; if (access === 'none' || !rec.related_name || !rec.parent) return; var selRun = await run_doc.child({ operation: 'select', target_doctype: rec.parenttype, query: { where: { name: rec.parent } }, options: { render: false } }); var pDoc = selRun.target && selRun.target.data && selRun.target.data[0]; if (!pDoc) return; var field = access === 'write' ? '_allowed' : '_allowed_read'; var cur = pDoc[field] || []; if (cur.includes(rec.related_name)) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: rec.parenttype, query: { where: { name: rec.parent } }, options: { render: false, internal: true } }); updateRun.target = { data: [pDoc] }; if (access === 'write') { updateRun.input._allowed = cur.concat([rec.related_name]); } else { updateRun.input._allowed_read = (pDoc._allowed_read || []).concat([rec.related_name]); } await CW.controller(updateRun); }",
          "1_2": "async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var access = (CW._config.relationshipAccessMap && CW._config.relationshipAccessMap[rec.parenttype] && CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype] && CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype][rec.type]) || 'none'; if (access === 'none' || !rec.related_name || !rec.parent) return; var selRun = await run_doc.child({ operation: 'select', target_doctype: rec.parenttype, query: { where: { name: rec.parent } }, options: { render: false } }); var pDoc = selRun.target && selRun.target.data && selRun.target.data[0]; if (!pDoc) return; var field = access === 'write' ? '_allowed' : '_allowed_read'; var updateRun = await run_doc.child({ operation: 'update', target_doctype: rec.parenttype, query: { where: { name: rec.parent } }, options: { render: false, internal: true } }); updateRun.target = { data: [pDoc] }; if (access === 'write') { updateRun.input._allowed = (pDoc._allowed || []).filter(function(id) { return id !== rec.related_name; }); } else { updateRun.input._allowed_read = (pDoc._allowed_read || []).filter(function(id) { return id !== rec.related_name; }); } await CW.controller(updateRun); }",
          "2_0": "async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var access = (CW._config.relationshipAccessMap && CW._config.relationshipAccessMap[rec.parenttype] && CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype] && CW._config.relationshipAccessMap[rec.parenttype][rec.related_doctype][rec.type]) || 'none'; if (access === 'none' || !rec.related_name || !rec.parent) return; var selRun = await run_doc.child({ operation: 'select', target_doctype: rec.parenttype, query: { where: { name: rec.parent } }, options: { render: false } }); var pDoc = selRun.target && selRun.target.data && selRun.target.data[0]; if (!pDoc) return; var field = access === 'write' ? '_allowed' : '_allowed_read'; var cur = pDoc[field] || []; if (cur.includes(rec.related_name)) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: rec.parenttype, query: { where: { name: rec.parent } }, options: { render: false, internal: true } }); updateRun.target = { data: [pDoc] }; if (access === 'write') { updateRun.input._allowed = cur.concat([rec.related_name]); } else { updateRun.input._allowed_read = (pDoc._allowed_read || []).concat([rec.related_name]); } await CW.controller(updateRun); }"
        }
      }
    },
   "field_order": [
  "name",
  "related_title",
  "related_doctype",
  "related_name",
  "type"
]
  },