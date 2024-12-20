// popup.js
async function displayKeys() {
    try {
      // Request keys from background script
      chrome.runtime.sendMessage({ action: 'getAllKeys' }, response => {
        if (response.status === 'error') {
          console.error('Error:', response.error);
          document.getElementById('keysList').innerHTML = '<p>Error loading saved webpages.</p>';
          return;
        }
  
        const keysList = document.getElementById('keysList');
        keysList.innerHTML = '';
        
        const keys = response.keys;
        if (keys.length === 0) {
          keysList.innerHTML = '<p>No saved webpages yet.</p>';
          return;
        }
  
        keys.forEach(key => {
          const div = document.createElement('div');
          div.className = 'saved-item';
          
          const deleteBtn = document.createElement('span');
          deleteBtn.className = 'delete-btn';
          deleteBtn.textContent = '×';
          deleteBtn.onclick = () => deleteKey(key);
          
          div.appendChild(deleteBtn);
          div.appendChild(document.createTextNode(key));
          keysList.appendChild(div);
        });
      });
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('keysList').innerHTML = '<p>Error accessing database.</p>';
    }
  }
  
  function deleteKey(key) {
    chrome.runtime.sendMessage({ action: 'deleteKey', key }, response => {
      if (response.status === 'success') {
        displayKeys(); // Refresh the list
      } else {
        console.error('Error deleting key:', response.error);
      }
    });
  }
  
  // Load keys when popup opens
  document.addEventListener('DOMContentLoaded', displayKeys);