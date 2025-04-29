frappe.ui.form.on('Task', {
    refresh: function(frm) {
        // Add the "Edit Document" button to the form
        frm.add_custom_button(__('Edit Document'), function() {
            // Get attachments for the current document
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'File',
                    filters: {
                        'attached_to_doctype': frm.doctype,
                        'attached_to_name': frm.docname,
                        'file_name': ['like', '%.json']
                    },
                    fields: ['name', 'file_url', 'file_name']
                },
                callback: function(response) {
                    if (response.message && response.message.length > 0) {
                        // If multiple JSON files are found, let the user select one
                        if (response.message.length > 1) {
                            let file_options = {};
                            response.message.forEach(file => {
                                file_options[file.name] = file.file_name;
                            });
                            
                            frappe.prompt([
                                {
                                    fieldtype: 'Select',
                                    fieldname: 'file',
                                    label: 'Select JSON File',
                                    options: Object.keys(file_options).map(key => {
                                        return {
                                            value: key,
                                            label: file_options[key]
                                        }
                                    }),
                                    reqd: 1
                                }
                            ], function(values) {
                                const selected_file = response.message.find(f => f.name === values.file);
                                processJsonFile(selected_file);
                            }, 'Select File', 'Continue');
                        } else {
                            // If only one JSON file, use it directly
                            processJsonFile(response.message[0]);
                        }
                    } else {
                        frappe.msgprint(__('No JSON attachments found for this document.'));
                    }
                }
            });
            
            // Function to process the selected JSON file
            function processJsonFile(file) {
                // Get the full file path
                let file_url = file.file_url;
                
                // If file_url is relative, make it absolute
                if (file_url.startsWith('/')) {
                    file_url = window.location.origin + file_url;
                }
                
                // Fetch the JSON file content
                fetch(file_url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to fetch file');
                        }
                        return response.text();
                    })
                    .then(text => {
                        try {
                            const jsonData = JSON.parse(text);
                            // Check if the JSON contains doctype information
                            if (!jsonData.doctype) {
                                frappe.throw(__('Invalid JSON format: Missing doctype information'));
                                return;
                            }
                            
                            renderDocumentForm(jsonData, file.name);
                        } catch (e) {
                            frappe.throw(__('Error parsing JSON: ') + e.message);
                        }
                    })
                    .catch(error => {
                        frappe.throw(__('Error loading JSON file: ') + error.message);
                    });
            }
            
            // Function to render the form from JSON data
            function renderDocumentForm(jsonData, file_name) {
                const doctype = jsonData.doctype;
                delete jsonData.doctype; // Remove doctype from the data object
                
                // Use a dialog to render the form
                const d = new frappe.ui.Dialog({
                    title: __('Edit Document'),
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'document_html'
                        }
                    ],
                    primary_action_label: __('Save'),
                    primary_action: function() {
                        // Get updated values from the form
                        const tempForm = frappe.model.get_doc(doctype, 'temp_form');
                        
                        // Add the doctype back to the data
                        tempForm.doctype = doctype;
                        
                        // Save the updated JSON back to the attachment
                        saveJsonAttachment(frm, file_name, tempForm);
                        
                        d.hide();
                    }
                });
                
                d.show();
                
                // Create a temporary form to render the document
                frappe.model.with_doctype(doctype, function() {
                    // Create a temporary document
                    frappe.model.with_doc(doctype, 'temp_form', function() {
                        let temp_doc = frappe.model.get_doc(doctype, 'temp_form');
                        if (!temp_doc) {
                            temp_doc = frappe.model.get_new_doc(doctype);
                            temp_doc.name = 'temp_form';
                            frappe.model.add_to_locals(temp_doc);
                        }
                        
                        // Apply JSON data to the temporary doc
                        Object.keys(jsonData).forEach(field => {
                            temp_doc[field] = jsonData[field];
                        });
                        
                        // Create a new form
                        const form = new frappe.ui.form.Form(
                            doctype,
                            d.fields_dict.document_html.wrapper,
                            null,
                            doctype
                        );
                        
                        form.refresh('temp_form');
                    });
                });
            }
        });
        
        // Function to save the JSON back to an attachment
        function saveJsonAttachment(frm, file_name, docData) {
            // Create a copy to avoid modifying the original doc
            const jsonData = Object.assign({}, docData);
            
            // Convert to JSON string
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create FormData to upload the file
            const formData = new FormData();
            formData.append('file', blob, file_name.replace(/^.*[\\\/]/, ''));
            formData.append('doctype', frm.doctype);
            formData.append('docname', frm.docname);
            formData.append('is_private', 1);
            
            // Delete and replace approach
            frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: 'File',
                    name: file_name
                },
                callback: function() {
                    // Upload the new file
                    $.ajax({
                        url: '/api/method/upload_file',
                        type: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function(response) {
                            frappe.show_alert({
                                message: __('Document updated successfully'),
                                indicator: 'green'
                            });
                            frm.reload_doc();
                        },
                        error: function(error) {
                            frappe.throw(__('Error saving document: ') + error.responseText);
                        }
                    });
                }
            });
        }
    }
});