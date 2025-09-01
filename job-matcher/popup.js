document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const maxTokensInput = document.getElementById('maxTokens');
  const cvTextArea = document.getElementById('cvText');
  const saveButton = document.getElementById('saveConfig');
  const checkButton = document.getElementById('checkMatch');
  const statusDiv = document.getElementById('status');

  // Load saved data
  chrome.storage.local.get(['apiKey', 'model', 'maxTokens', 'cvText'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.model) {
      modelSelect.value = result.model;
    } else {
      modelSelect.value = 'gpt-3.5-turbo'; // default
    }
    if (result.maxTokens) {
      maxTokensInput.value = result.maxTokens;
    } else {
      maxTokensInput.value = 500; // default
    }
    if (result.cvText) {
      cvTextArea.value = result.cvText;
    }
  });

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (isError ? 'error' : 'success');
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }

  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const maxTokens = parseInt(maxTokensInput.value) || 500;
    const cvText = cvTextArea.value.trim();

    if (!apiKey || !cvText) {
      showStatus('Please fill in both API key and CV text', true);
      return;
    }

    if (maxTokens < 100 || maxTokens > 4000) {
      showStatus('Max tokens should be between 100 and 4000', true);
      return;
    }

    chrome.storage.local.set({
      apiKey: apiKey,
      model: model,
      maxTokens: maxTokens,
      cvText: cvText
    }, function() {
      showStatus('Configuration saved successfully!');
    });
  });

  checkButton.addEventListener('click', function() {
    chrome.storage.local.get(['apiKey', 'model', 'maxTokens', 'cvText'], function(result) {
      if (!result.apiKey || !result.cvText) {
        showStatus('Please save your configuration first', true);
        return;
      }

      // Send message to content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'checkJobMatch',
          config: {
            apiKey: result.apiKey,
            model: result.model || 'gpt-3.5-turbo',
            maxTokens: result.maxTokens || 500,
            cvText: result.cvText
          }
        }, function(response) {
          if (response && response.success) {
            showStatus('Check completed! See page for results.');
          } else {
            showStatus('Error checking job match', true);
          }
        });
      });
    });
  });
});