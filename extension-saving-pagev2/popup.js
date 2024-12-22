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
            keys.forEach((key, index) => {
                try {
                    // Extract URL - everything before the first space
                    const urlEndIndex = key.indexOf(' ');
                    const url = urlEndIndex !== -1 ? key.substring(0, urlEndIndex) : key;
                    
                    // Create a unique ID using index instead of URL encoding
                    const buttonId = `delete-${index}`;
                    
                    // Create the row - use textContent in a safer way
                    const row = document.createElement('tr');
                    
                    // First column - key content
                    const keyCell = document.createElement('td');
                    keyCell.textContent = key;
                    row.appendChild(keyCell);
                    
                    // Second column - link
                    const linkCell = document.createElement('td');
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.textContent = 'Visit Page';
                    linkCell.appendChild(link);
                    row.appendChild(linkCell);
                    
                    // Third column - delete button
                    const buttonCell = document.createElement('td');
                    const deleteButton = document.createElement('button');
                    deleteButton.id = buttonId;
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', () => deleteKey(key));
                    buttonCell.appendChild(deleteButton);
                    row.appendChild(buttonCell);
                    
                    // Add the complete row
                    tableBody[0].appendChild(row);
                    
                } catch (err) {
                    console.error('Error processing key:', err);
                }
            });

            // Initialize DataTable with improved configuration
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
                ],
                // Remove drawCallback as we're using direct DOM manipulation
                language: {
                    search: "Search saved pages:",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error in displayKeys:', error);
    }
}

function deleteKey(key) {
    if (!key) {
        console.error('No key provided for deletion');
        return;
    }

    chrome.runtime.sendMessage({ 
        action: 'deleteKey', 
        key: key 
    }, response => {
        if (response.status === 'success') {
            displayKeys(); // Refresh the table
        } else {
            console.error('Error deleting key:', response.error);
        }
    });
}

// Load keys when popup opens
document.addEventListener('DOMContentLoaded', displayKeys);