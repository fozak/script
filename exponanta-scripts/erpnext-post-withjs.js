// WORKING Get the CSRF token from current cookies
const csrfToken = frappe.csrf_token; // If you are on ERPNext page

fetch('http://147.182.187.7/api/resource/Task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    subject: "Task from Chrome Console with CSRF",
    status: "Open"
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Full Response:', data);
})
.catch(error => {
  console.error('❌ Fetch failed:', error);
});


//get all available DocTypes
fetch('/api/resource/DocType?limit_page_length=1000', {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('📜 All available DocTypes:', data.data);
  })
  .catch(console.error);



  //posting a file Works

  //TASK-2025-00002

const csrfToken = frappe.csrf_token; // assume you're already logged in

// Create a Blob (file content)
const fileContent = new Blob(["Hello, this is a test file!"], { type: "text/plain" });

// Create a File object
const file = new File([fileContent], "test_file.txt", { type: "text/plain" });

// Now create FormData
const formData = new FormData();
formData.append('file', file);
formData.append('doctype', 'Task');
formData.append('docname', 'TASK-2025-00002');
formData.append('is_private', 0);

fetch('http://147.182.187.7/api/method/upload_file', {
  method: 'POST',
  headers: {
    'X-Frappe-CSRF-Token': csrfToken
    // DO NOT SET Content-Type manually, browser sets it to multipart/form-data automatically
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('✅ Upload response:', data);
})
.catch(error => {
  console.error('❌ Upload failed:', error);
});

  