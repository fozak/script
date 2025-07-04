const doctype = 'Issue';
const docname = 'ISS-2025-00023';

frappe.realtime.on('doc_update', (data) => {
  console.log('Realtime doc_update event:', data);
  if (data.doctype === doctype && data.docname === docname) {
    frappe.db.get_doc(doctype, docname).then(doc => {
      console.log('Updated doc data:', doc);
    });
  }
});

// Use this instead of raw `subscribe()`
frappe.realtime.doc_subscribe(doctype, docname);


const doctype = 'Issue';
const docname = 'ISS-2025-00023';

frappe.realtime.on('doc_update', (data) => {
  console.log('Realtime doc_update event:', data);
  if (data.doctype === doctype && data.docname === docname) {
    frappe.db.get_doc(doctype, docname).then(doc => {
      console.log('Updated doc data:', doc);
    });
  }
});

// Use this instead of raw `subscribe()`
frappe.realtime.doc_subscribe(doctype, docname);