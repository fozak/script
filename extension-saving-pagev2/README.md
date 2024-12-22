# scripts
I'll help modify the popup to use DataTables with a table structure.



```javascript
// popup.html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.7/css/jquery.dataTables.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css">
    <style>
        body {
            width: 800px;
            max-height: 600px;
            padding: 10px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <h2>Saved Webpages</h2>
    <table id="table-keys" class="display">
        <thead>
            <tr>
                <th>Title & Preview</th>
                <th>Link</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    </table>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="popup.js"></script>
</body>
</html>

// popup.js
async function displayKeys() {
    try {
        // Request keys from background script
        chrome.runtime.sendMessage({ action: 'getAllKeys' }, response => {
            if (response.status === 'error') {
                console.error('Error:', response.error);
                return;
            }

            const keys = response.keys;
            
            // Destroy existing DataTable if it exists
            if ($.fn.DataTable.isDataTable('#table-keys')) {
                $('#table-keys').DataTable().destroy();
            }

            // Clear the table body
            const tableBody = $('#table-keys tbody');
            tableBody.empty();

            // Add rows
            keys.forEach(key => {
                // Extract URL from the key (assuming it's the first part before the space)
                const url = key.split(' ')[0];
                
                tableBody.append(`
                    <tr>
                        <td>${key}</td>
                        <td><a href="${url}" target="_blank">Visit Page</a></td>
                        <td><button onclick="deleteKey('${key.replace(/'/g, "\\'")}')">Delete</button></td>
                    </tr>
                `);
            });

            // Initialize DataTable
            $('#table-keys').DataTable({
                pageLength: 10,
                order: [[0, 'desc']],
                columnDefs: [
                    {
                        targets: 0,
                        width: '60%'
                    },
                    {
                        targets: 1,
                        width: '20%'
                    },
                    {
                        targets: 2,
                        width: '20%',
                        orderable: false
                    }
                ]
            });
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function deleteKey(key) {
    chrome.runtime.sendMessage({ action: 'deleteKey', key }, response => {
        if (response.status === 'success') {
            displayKeys(); // Refresh the table
        } else {
            console.error('Error deleting key:', response.error);
        }
    });
}

// Load keys when popup opens
document.addEventListener('DOMContentLoaded', displayKeys);

```

Key changes made:

1. Added DataTables:
- Included jQuery and DataTables CDN links
- Initialized DataTable with configuration
- Added proper table structure

2. Table Structure:
- Three columns: content, link, and actions
- URL extracted from the key for the link column
- Delete button in actions column

3. Features:
- Search functionality (built into DataTables)
- Pagination
- Sorting (except for actions column)
- Column width definitions
- Links open in new tab

4. Improvements:
- Wider popup (800px) to accommodate table
- Better organization of data
- More professional look

The rest of your extension files (manifest.json, content.js, background.js) remain the same. Would you like me to add any additional DataTables features or modify the current setup?

# Challenges - not able to load js scripts

