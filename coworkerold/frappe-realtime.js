const doctype = 'Issue';
const docname = 'ISS-2025-00023';

// Subscribe to realtime updates for this document
frappe.realtime.doc_subscribe(doctype, docname);

// Listen for doc_update events
frappe.realtime.on('doc_update', (data) => {
  if (data.doctype === doctype && data.docname === docname) {
    console.log(`Document ${doctype} ${docname} updated`, data);
    frappe.db.get_doc(doctype, docname).then(doc => {
      console.log('Updated doc:', doc);
      // update your UI here
    });
  }
});

const doctype = 'Issue';
const docname = 'ISS-2025-00023';

// Subscribe to realtime updates for this document
frappe.realtime.doc_subscribe(doctype, docname);

// Listen for doc_update events
frappe.realtime.on('doc_update', (data) => {
  if (data.doctype === doctype && data.docname === docname) {
    console.log(`Document updated`);
  }
});