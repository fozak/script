// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const providerSelect = document.getElementById('provider');
  const modelSelect = document.getElementById('model');
  const apiKeyInput = document.getElementById('api-key');
  const toggleVisibilityBtn = document.getElementById('toggle-visibility');
  const saveSettingsBtn = document.getElementById('save-settings');
  const toggleChatBtn = document.getElementById('toggle-chat');
  const statusDiv = document.getElementById('status');
  
  // Load saved settings
  chrome.storage.sync.get({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: ''
  }, function(items) {
    providerSelect.value = items.provider;
    modelSelect.value = items.model;
    apiKeyInput.value = items.apiKey;
  });
  
  // Toggle API key visibility
  toggleVisibilityBtn.addEventListener('click', function() {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleVisibilityBtn.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      toggleVisibilityBtn.textContent = '👁️';
    }
  });
  
  // Save settings
  saveSettingsBtn.addEventListener('click', function() {
    chrome.storage.sync.set({
      provider: providerSelect.value,
      model: modelSelect.value,
      apiKey: apiKeyInput.value
    }, function() {
      showStatus('Settings saved successfully!', 'success');
    });
  });
  
  // Toggle chat panel
  toggleChatBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleChat'}, function(response) {
        if (chrome.runtime.lastError) {
          showStatus('Error: Chat panel not available on this page', 'error');
        } else if (response && response.success) {
          window.close(); // Close popup after toggling
        }
      });
    });
  });
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
