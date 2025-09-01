// Create floating button
function createFloatingButton() {
  // Remove existing button if any
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

  button.addEventListener('click', function() {
    chrome.storage.local.get(['apiKey', 'model', 'maxTokens', 'cvText'], function(result) {
      if (!result.apiKey || !result.cvText) {
        showResult('Please set up your configuration in the extension popup first!', false);
        return;
      }
      
      const config = {
        apiKey: result.apiKey,
        model: result.model || 'gpt-3.5-turbo',
        maxTokens: result.maxTokens || 500,
        cvText: result.cvText
      };
      
      checkJobMatch(config);
    });
  });

  document.body.appendChild(button);
}

// Show result modal
function showResult(message, isMatch) {
  // Remove existing modal if any
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
    border: 2px solid ${isMatch ? '#28a745' : '#dc3545'};
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

  modal.innerHTML = `
    <h3 style="margin-top:0; color: ${isMatch ? '#28a745' : '#dc3545'};">
      ${isMatch ? '✅ Job Match Result' : '❌ Job Match Result'}
    </h3>
    <p style="line-height: 1.5;">${message}</p>
    <button id="close-modal" style="
      padding: 8px 15px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      float: right;
    ">Close</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // Close modal functionality
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
    showResult('Analyzing job match... Please wait.', null);
    
    const jobDescription = document.body.innerText;
    
    const prompt = `
    Compare this CV with the job description and determine if there's a 70%+ match:

    CV:
    ${config.cvText}

    Job Description:
    ${jobDescription}

    Respond with:
    1. MATCH: YES/NO (based on 70%+ compatibility)
    2. PERCENTAGE: Your estimated match percentage
    3. REASONING: Brief explanation of key matching and missing skills
    
    Keep the response concise but informative.
    `;

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
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    // Simple parsing to determine if it's a match
    const isMatch = result.toLowerCase().includes('match: yes') || 
                   result.toLowerCase().includes('70%') ||
                   /\b([7-9]\d|\d{3,})%/.test(result);

    showResult(result, isMatch);

  } catch (error) {
    console.error('Error checking job match:', error);
    showResult(`Error: ${error.message}. Please check your configuration and try again.`, false);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkJobMatch') {
    checkJobMatch(request.config);
    sendResponse({success: true});
  }
});

// Create button when page loads
createFloatingButton();

// Recreate button if page content changes (for SPAs)
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && !document.getElementById('job-matcher-btn')) {
      setTimeout(createFloatingButton, 1000);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});