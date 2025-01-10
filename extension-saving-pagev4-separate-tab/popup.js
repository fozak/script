document.addEventListener('DOMContentLoaded', displayKeys);

async function viewSavedHTML(key) {
    chrome.runtime.sendMessage({ 
        action: 'getHTML', 
        key: key 
    }, response => {
        if (response.status === 'success' && response.html) {
            const newWindow = window.open('');
            if (newWindow) {
                newWindow.document.write('<!DOCTYPE html>');
                newWindow.document.write(response.html);
                newWindow.document.close();
                const baseTag = newWindow.document.createElement('base');
                baseTag.target = '_blank';
                newWindow.document.head.appendChild(baseTag);
            } else {
                alert('Please allow pop-ups to view saved pages');
            }
        } else {
            console.error('Error retrieving HTML:', response.error);
            alert('Error viewing the saved page. Please try again.');
        }
    });
}

async function displayKeys() {
    try {
        chrome.runtime.sendMessage({ action: 'getAllKeys' }, response => {
            if (response.status === 'error') {
                console.error('Error:', response.error);
                return;
            }

            const keys = response.keys;
            
            if ($.fn.DataTable.isDataTable('#table-keys')) {
                $('#table-keys').DataTable().destroy();
            }

            const tableBody = $('#table-keys tbody');
            tableBody.empty();

            keys.forEach((key, index) => {
                try {
                    const urlEndIndex = key.indexOf(' ');
                    const url = urlEndIndex !== -1 ? key.substring(0, urlEndIndex) : key;
                    const buttonId = `delete-${index}`;
                    
                    const row = document.createElement('tr');
                    
                    const keyCell = document.createElement('td');
                    keyCell.textContent = key;
                    row.appendChild(keyCell);
                    
                    const linkCell = document.createElement('td');
                    const originalLink = document.createElement('a');
                    originalLink.href = url;
                    originalLink.target = '_blank';
                    originalLink.textContent = 'Original';
                    originalLink.className = 'mr-2';
                    linkCell.appendChild(originalLink);
                    
                    linkCell.appendChild(document.createTextNode(' | '));
                    
                    const savedLink = document.createElement('a');
                    savedLink.href = '#';
                    savedLink.textContent = 'Saved';
                    savedLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        viewSavedHTML(key);
                    });
                    linkCell.appendChild(savedLink);
                    
                    row.appendChild(linkCell);
                    
                    const buttonCell = document.createElement('td');
                    const deleteButton = document.createElement('button');
                    deleteButton.id = buttonId;
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', () => deleteKey(key));
                    buttonCell.appendChild(deleteButton);
                    row.appendChild(buttonCell);
                    
                    tableBody[0].appendChild(row);
                    
                } catch (err) {
                    console.error('Error processing key:', err);
                }
            });

            $('#table-keys').DataTable({
                order: [[0, 'desc']],
                columnDefs: [
                    {
                        targets: 0,
                        width: '50%',
                        render: function(data, type, row) {
                            if (type === 'display') {
                                return `<div title="${data.replace(/"/g, '&quot;')}">${data}</div>`;
                            }
                            return data;
                        }
                    },
                    {
                        targets: 1,
                        width: '30%'
                    },
                    {
                        targets: 2,
                        width: '20%',
                        orderable: false
                    }
                ],
                dom: '<"top"f>rt<"bottom"ip>',
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
                scrollY: '400px',
                scrollCollapse: true,
                responsive: true,
                initComplete: function(settings, json) {
                    $('.dataTables_filter input').attr('placeholder', 'Type to search...');
                }
            });

            $(window).on('resize', function() {
                if ($.fn.DataTable.isDataTable('#table-keys')) {
                    $('#table-keys').DataTable().columns.adjust();
                }
            });
        });
    } catch (error) {
        console.error('Error in displayKeys:', error);
        const tableBody = $('#table-keys tbody');
        tableBody.html('<tr><td colspan="3">Error loading saved pages. Please try again.</td></tr>');
    }
}

function deleteKey(key) {
    if (!key) {
        console.error('No key provided for deletion');
        return;
    }

    if (confirm('Are you sure you want to delete this saved page?')) {
        chrome.runtime.sendMessage({ 
            action: 'deleteKey', 
            key: key 
        }, response => {
            if (response.status === 'success') {
                displayKeys();
            } else {
                console.error('Error deleting key:', response.error);
                alert('Error deleting the saved page. Please try again.');
            }
        });
    }
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    return false;
};