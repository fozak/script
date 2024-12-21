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