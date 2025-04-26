// content.js
let aiChatContainer = null;
let isMinimized = false;

// Function to create and inject the chat UI
function createChatUI() {
  // Check if container already exists
  if (document.getElementById('ai-chat-container')) {
    return;
  }
  
  // Create container
  aiChatContainer = document.createElement('div');
  aiChatContainer.id = 'ai-chat-container';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'ai-chat-header';
  
  const title = document.createElement('span');
  title.textContent = 'AI Assistant';
  
  const btnContainer = document.createElement('div');
  
  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'ai-chat-btn';
  minimizeBtn.textContent = '—';
  minimizeBtn.addEventListener('click', toggleMinimize);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ai-chat-btn';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closeChat);
  
  btnContainer.appendChild(minimizeBtn);
  btnContainer.appendChild(closeBtn);
  
  header.appendChild(title);
  header.appendChild(btnContainer);
  
  // Create chat area
  const chatArea = document.createElement('div');
  chatArea.className = 'ai-chat-area';
  chatArea.id = 'ai-chat-messages';
  
  // Create input area
  const inputArea = document.createElement('div');
  inputArea.className = 'ai-chat-input-area';
  
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Ask me anything about this page...';
  textarea.id = 'ai-chat-input';
  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  const sendBtn = document.createElement('button');
  sendBtn.textContent = '→';
  sendBtn.className = 'ai-chat-send-btn';
  sendBtn.addEventListener('click', sendMessage);
  
  inputArea.appendChild(textarea);
  inputArea.appendChild(sendBtn);
  
  // Assemble components
  aiChatContainer.appendChild(header);
  aiChatContainer.appendChild(chatArea);
  aiChatContainer.appendChild(inputArea);
  
  // Add to document
  document.body.appendChild(aiChatContainer);
}

// Function to toggle minimize/maximize
function toggleMinimize() {
  if (!aiChatContainer) return;
  
  if (isMinimized) {
    aiChatContainer.classList.remove('minimized');
  } else {
    aiChatContainer.classList.add('minimized');
  }
  
  isMinimized = !isMinimized;
}

// Function to close chat
function closeChat() {
  if (aiChatContainer) {
    aiChatContainer.remove();
    aiChatContainer = null;
  }
}

// Function to add a message to the chat
function addMessage(text, isUser = false) {
  const chatArea = document.getElementById('ai-chat-messages');
  if (!chatArea) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = isUser ? 'ai-chat-message user-message' : 'ai-chat-message ai-message';
  
  // Create avatar div
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'ai-chat-avatar';
  avatarDiv.textContent = isUser ? 'U' : 'AI';
  
  // Create content div
  const contentDiv = document.createElement('div');
  contentDiv.className = 'ai-chat-content';
  contentDiv.textContent = text;
  
  // Assemble message
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Function to get page content
function getPageContent() {
  // Try to get cur_frm.doc first (for web apps using this structure)
  let pageData = '';
  
  try {
    if (typeof cur_frm !== 'undefined' && cur_frm.doc) {
      pageData = JSON.stringify(cur_frm.doc);
      console.log('Successfully accessed cur_frm.doc:', cur_frm.doc);
      console.log('Stringified data:', pageData.substring(0, 500) + '... (truncated for console)');
    } else {
      // Fallback to document body text
      pageData = document.body.innerText;
      console.log('cur_frm.doc not found, using document.body.innerText');
      // Limit to reasonable size
      if (pageData.length > 10000) {
        pageData = pageData.substring(0, 10000) + '... (content truncated)';
      }
    }
  } catch (e) {
    // Fallback in case of errors
    pageData = document.body.innerText;
    if (pageData.length > 10000) {
      pageData = pageData.substring(0, 10000) + '... (content truncated)';
    }
  }
  
  return pageData;
}

// Function to send message to AI service
async function sendMessage() {
  const inputElement = document.getElementById('ai-chat-input');
  if (!inputElement || !inputElement.value.trim()) return;
  
  const userMessage = inputElement.value.trim();
  addMessage(userMessage, true);
  inputElement.value = '';
  
  // Add loading message
  const loadingMsgId = 'loading-msg-' + Date.now();
  const chatArea = document.getElementById('ai-chat-messages');
  const loadingDiv = document.createElement('div');
  loadingDiv.id = loadingMsgId;
  loadingDiv.className = 'ai-chat-message ai-message';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'ai-chat-avatar';
  avatarDiv.textContent = 'AI';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'ai-chat-content';
  contentDiv.textContent = 'Thinking...';
  
  loadingDiv.appendChild(avatarDiv);
  loadingDiv.appendChild(contentDiv);
  chatArea.appendChild(loadingDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  // Get page content
  const pageContent = getPageContent();
  
  // Get API settings
  chrome.storage.sync.get(
    { 
      provider: 'openai', 
      model: 'gpt-4o-mini',
      apiKey: ''
    }, 
    async function(settings) {
      try {
        const aiResponse = await callAIApi(userMessage, pageContent, settings);
        
        // Remove loading message
        const loadingMsg = document.getElementById(loadingMsgId);
        if (loadingMsg) loadingMsg.remove();
        
        // Add AI response
        addMessage(aiResponse, false);
      } catch (error) {
        // Remove loading message
        const loadingMsg = document.getElementById(loadingMsgId);
        if (loadingMsg) loadingMsg.remove();
        
        // Show error
        addMessage('Error: ' + error.message, false);
      }
    }
  );
}

// Function to call AI API based on provider
async function callAIApi(userMessage, pageContent, settings) {
  const { provider, model, apiKey } = settings;
  
  if (!apiKey) {
    throw new Error('API key not configured. Please set it in the extension options.');
  }
  
  // Prepare prompt with context
  const prompt = `User query: ${userMessage}\n\nPage content: ${pageContent}`;
  
  // Handle different providers
  if (provider.toLowerCase() === 'openai') {
    return await callOpenAI(prompt, model, apiKey);
  } else {
    throw new Error(`Provider ${provider} not supported yet.`);
  }
}

// Function to call OpenAI API
async function callOpenAI(prompt, model, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that answers questions about the current webpage.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Error calling OpenAI API');
  }
  
  return data.choices[0].message.content;
}

// Initialize when loaded
createChatUI();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleChat') {
    if (aiChatContainer) {
      closeChat();
    } else {
      createChatUI();
    }
    sendResponse({success: true});
  }
});