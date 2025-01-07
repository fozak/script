const USER_SCRIPT_ID = 'default';
const SAVE_BUTTON_ID = 'save-button';
const EXECUTE_BUTTON_ID = 'execute-button';

const FORM_ID = 'settings-form';
const FORM = document.getElementById(FORM_ID);

const TYPE_INPUT_NAME = 'type';
const SCRIPT_TEXTAREA_NAME = 'custom-script';

function isUserScriptsAvailable() {
  try {
    chrome.userScripts;
    return true;
  } catch {
    document.getElementById('warning').style.display = 'block';
    FORM.style.display = 'none';
    return false;
  }
}

async function updateUi() {
  if (!isUserScriptsAvailable()) return;

  const { type, script } = await chrome.storage.local.get({
    type: 'custom',
    script: "alert('Hello from UserScript!');"
  });

  FORM.elements[TYPE_INPUT_NAME].value = type;
  FORM.elements[SCRIPT_TEXTAREA_NAME].value = script;
}

async function onSave() {
  if (!isUserScriptsAvailable()) return;

  const type = FORM.elements[TYPE_INPUT_NAME].value;
  const script = FORM.elements[SCRIPT_TEXTAREA_NAME].value;

  await chrome.storage.local.set({ type, script });

  const existingScripts = await chrome.userScripts.getScripts({
    ids: [USER_SCRIPT_ID]
  });

  if (existingScripts.length > 0) {
    await chrome.userScripts.update([
      {
        id: USER_SCRIPT_ID,
        matches: ['<all_urls>'],
        js: type === 'file' ? [{ file: 'user-script.js' }] : [{ code: script }]
      }
    ]);
  } else {
    await chrome.userScripts.register([
      {
        id: USER_SCRIPT_ID,
        matches: ['<all_urls>'],
        js: type === 'file' ? [{ file: 'user-script.js' }] : [{ code: script }]
      }
    ]);
  }
}

async function executeOnCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const script = FORM.elements[SCRIPT_TEXTAREA_NAME].value;
  
  await chrome.userScripts.register([
    {
      id: 'temp-' + Date.now(),
      matches: [tab.url],
      js: [{ code: script }],
      runAt: 'document_idle'
    }
  ]);
}

updateUi();
chrome.storage.local.onChanged.addListener(updateUi);

document.getElementById(SAVE_BUTTON_ID).addEventListener('click', onSave);
document.getElementById(EXECUTE_BUTTON_ID).addEventListener('click', executeOnCurrentTab);
