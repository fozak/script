// Standalone content script that handles everything
let config = null;

// Create floating button
function createFloatingButton() {
  const existingButton = document.getElementById('job-matcher-btn');
  if (existingButton) {
    existingButton.remove();
  }

  const button = document.createElement('button');
  button.id = 'job-matcher-btn';
  button.innerHTML = '🎯 Check Job Match';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 10px 15px;
    background: #007cba;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;

  button.addEventListener('click', handleButtonClick);
  document.body.appendChild(button);
}

// Handle button click
function handleButtonClick() {
  chrome.storage.local.get(['apiKey', 'model', 'maxTokens', 'cvText'], function(result) {
    if (!result.apiKey || !result.cvText) {
      showConfigModal();
    } else {
      const config = {
        apiKey: result.apiKey,
        model: result.model || 'gpt-3.5-turbo',
        maxTokens: result.maxTokens || 500,
        cvText: result.cvText
      };
      checkJobMatch(config);
    }
  });
}

// Show configuration modal
function showConfigModal() {
  // Remove existing modal
  const existingModal = document.getElementById('job-config-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
  `;

  const modal = document.createElement('div');
  modal.id = 'job-config-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 500px;
    min-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
  `;

  modal.innerHTML = `
    <h3 style="margin-top:0; color: #007cba;">🎯 Job Matcher Configuration</h3>
    
    <div style="margin: 15px 0;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">OpenAI API Key:</label>
      <input type="password" id="config-api-key" placeholder="sk-..." style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    
    <div style="margin: 15px 0;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Model:</label>
      <select id="config-model" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Recommended)</option>
        <option value="gpt-4">GPT-4</option>
        <option value="gpt-4-turbo">GPT-4 Turbo</option>
        <option value="gpt-4o">GPT-4o</option>
        <option value="gpt-4o-mini">GPT-4o Mini</option>
      </select>
    </div>
    
    <div style="margin: 15px 0;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Tokens:</label>
      <input type="number" id="config-max-tokens" value="500" min="100" max="4000" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    
    <div style="margin: 15px 0;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Your CV (short):</label>
      <textarea id="config-cv-text" placeholder="Enter your CV/resume text here..." style="width: 100%; height: 120px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
    </div>
    
    <div style="text-align: right; margin-top: 20px;">
      <button id="config-cancel" style="padding: 8px 15px; margin-right: 10px; background: #ccc; color: black; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button id="config-save" style="padding: 8px 15px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">Save & Check Job</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // Load existing config
  chrome.storage.local.get(['apiKey', 'model', 'maxTokens', 'cvText'], function(result) {
    if (result.apiKey) document.getElementById('config-api-key').value = result.apiKey;
    if (result.model) document.getElementById('config-model').value = result.model;
    if (result.maxTokens) document.getElementById('config-max-tokens').value = result.maxTokens;
    if (result.cvText) document.getElementById('config-cv-text').value = result.cvText;
  });

  // Event listeners
  function closeModal() {
    modal.remove();
    overlay.remove();
  }

  document.getElementById('config-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  document.getElementById('config-save').addEventListener('click', function() {
    const apiKey = document.getElementById('config-api-key').value.trim();
    const model = document.getElementById('config-model').value;
    const maxTokens = parseInt(document.getElementById('config-max-tokens').value) || 500;
    const cvText = document.getElementById('config-cv-text').value.trim();

    if (!apiKey || !cvText) {
      alert('Please fill in both API key and CV text');
      return;
    }

    // Save configuration
    chrome.storage.local.set({
      apiKey: apiKey,
      model: model,
      maxTokens: maxTokens,
      cvText: cvText
    }, function() {
      closeModal();
      
      // Now check the job
      const config = { apiKey, model, maxTokens, cvText };
      checkJobMatch(config);
    });
  });
}

// Show result modal
function showResult(message, isMatch) {
  const existingModal = document.getElementById('job-match-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'job-match-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 500px;
    max-height: 70vh;
    overflow-y: auto;
    border: 2px solid ${isMatch === null ? '#007cba' : isMatch ? '#28a745' : '#dc3545'};
  `;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
  `;

  const icon = isMatch === null ? '⏳' : isMatch ? '✅' : '❌';
  const color = isMatch === null ? '#007cba' : isMatch ? '#28a745' : '#dc3545';

  modal.innerHTML = `
    <h3 style="margin-top:0; color: ${color};">
      ${icon} Job Match Result
    </h3>
    <div style="line-height: 1.6; white-space: pre-wrap;">${message}</div>
    <button id="close-modal" style="
      padding: 8px 15px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      float: right;
      margin-top: 15px;
    ">Close</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  function closeModal() {
    modal.remove();
    overlay.remove();
  }

  document.getElementById('close-modal').addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
}

// Check job match using OpenAI API
async function checkJobMatch(config) {
  try {
    showResult('🔍 Analyzing job match...\nPlease wait while I compare your CV with this job description.', null);
    
    const jobDescription = document.body.innerText;
    
    if (jobDescription.length < 100) {
      showResult('⚠️ Warning: The page content seems too short to be a job description. Make sure you\'re on a job posting page.', false);
      return;
    }
    
    const prompt = `Compare this CV with the job description and determine if there's a 70%+ match:

CV:
${config.cvText}

Job Description:
${jobDescription.substring(0, 3000)} // Limit job description length

Respond with:
1. MATCH: YES/NO (based on 70%+ compatibility)  
2. PERCENTAGE: Your estimated match percentage
3. REASONING: Brief explanation of key matching and missing skills

Keep the response concise but informative.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: config.maxTokens,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    // Parse result to determine match
    const isMatch = result.toLowerCase().includes('match: yes') || 
                   result.toLowerCase().includes('70%') ||
                   /\b([7-9]\d|\d{3,})%/.test(result);

    showResult(result, isMatch);

  } catch (error) {
    console.error('Error checking job match:', error);
    showResult(`❌ Error: ${error.message}\n\nPlease check:\n- Your API key is valid\n- You have credits in your OpenAI account\n- Your internet connection is stable`, false);
  }
}

// Initialize
createFloatingButton();

// Recreate button on page changes
const observer = new MutationObserver(function(mutations) {
  if (!document.getElementById('job-matcher-btn')) {
    setTimeout(createFloatingButton, 1000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });