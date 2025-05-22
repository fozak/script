/*html
<div id="editable-content" contenteditable="true">
  {{ doc.main_section_html or '' }}
</div>

<button id="save-content">Save</button>

<script>
document.getElementById('save-content').addEventListener('click', function () {
  const updatedHTML = document.getElementById('editable-content').innerHTML;
  const parts = window.location.pathname.split('/').filter(Boolean);
  const docName = parts.length ? decodeURIComponent(parts[parts.length - 1].trim()) : null;

  if (!docName) {
    console.error("Document name not found in URL path.");
    return;
  }

  frappe.call({
    method: "frappe.client.set_value",
    args: {
      doctype: "Web Page",
      name: docName,
      fieldname: {
        main_section_html: updatedHTML
      }
    },
    callback: function(response) {
      frappe.msgprint("Content updated successfully.");
    },
    error: function(error) {
      console.error("Failed to update content:", error);
      frappe.msgprint("Failed to save content.");
    }
  });
});
</script>

*/


// Get the current route from window.location.pathname
// Assuming URL like /web-page-name or /some-path/web-page-name
const parts = window.location.pathname.split('/').filter(Boolean);
const docName = parts.length ? parts[parts.length - 1] : null;

if (!docName) {
  console.error("Document name not found in URL path.");
} else {
  frappe.call({
    method: "frappe.client.set_value",
    args: {
      doctype: "Web Page",
      name: docName,
      fieldname: {
        main_section_html: "<p>NEEWCONTN</p>"
      }
    },
    callback: function(response) {
      console.log("Content updated successfully:", response.message);
    },
    error: function(error) {
      console.error("Failed to update content:", error);
    }
  });
}
