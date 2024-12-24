// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', displayKeys);

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
                    
                    // Create a unique ID using index
                    const buttonId = `delete-${index}`;
                    
                    // Create the row
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
                //pageLength: 5,  // Show fewer rows per page
                order: [[0, 'desc']],
                columnDefs: [
                    {
                        targets: 0,
                        width: '60%',
                        render: function(data, type, row) {
                            if (type === 'display') {
                                // Add tooltip for full text on hover
                                return `<div title="${data.replace(/"/g, '&quot;')}">${data}</div>`;
                            }
                            return data;
                        }
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
                dom: '<"top"f>rt<"bottom"ip>', // Customize the DataTables layout
                language: {
                    search: "Search:",
                    paginate: {
                        first: "«",
                        previous: "‹",
                        next: "›",
                        last: "»"
                    },
                    info: "_START_ - _END_ of _TOTAL_",
                    infoEmpty: "No entries to show",
                    infoFiltered: "(filtered from _MAX_ total entries)"
                },
                scrollY: '400px',  // Enable vertical scrolling
                scrollCollapse: true,  // Enable scroll collapse
                responsive: true,  // Make the table responsive
                initComplete: function(settings, json) {
                    // Add any post-initialization customization here
                    $('.dataTables_filter input').attr('placeholder', 'Type to search...');
                }
            });

            // Add window resize handler to adjust the table layout
            $(window).on('resize', function() {
                if ($.fn.DataTable.isDataTable('#table-keys')) {
                    $('#table-keys').DataTable().columns.adjust();
                }
            });

        });
    } catch (error) {
        console.error('Error in displayKeys:', error);
        // Display error message to user
        const tableBody = $('#table-keys tbody');
        tableBody.html('<tr><td colspan="3">Error loading saved pages. Please try again.</td></tr>');
    }
}

function deleteKey(key) {
    if (!key) {
        console.error('No key provided for deletion');
        return;
    }

    // Add confirmation dialog
    if (confirm('Are you sure you want to delete this saved page?')) {
        chrome.runtime.sendMessage({ 
            action: 'deleteKey', 
            key: key 
        }, response => {
            if (response.status === 'success') {
                displayKeys(); // Refresh the table
            } else {
                console.error('Error deleting key:', response.error);
                alert('Error deleting the saved page. Please try again.');
            }
        });
    }
}

// Handle errors that might occur during script loading
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    return false;
};