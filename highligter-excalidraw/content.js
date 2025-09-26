// Excalidraw Web Annotator Content Script
let excalidrawContainer = null;
let isVisible = false;
let excalidrawAPI = null;
let selectedText = '';
let selectionRect = null;

// Create Excalidraw overlay container
function createExcalidrawOverlay() {
  if (excalidrawContainer) return;
  
  excalidrawContainer = document.createElement('div');
  excalidrawContainer.id = 'excalidraw-web-overlay';
  excalidrawContainer.innerHTML = `
    <div class="excalidraw-header">
      <span>Excalidraw Annotator</span>
      <div class="excalidraw-controls">
        <button id="save-annotations">💾</button>
        <button id="load-annotations">📂</button>
        <button id="clear-canvas">🗑️</button>
        <button id="close-excalidraw">✕</button>
      </div>
    </div>
    <div id="excalidraw-canvas-container"></div>
  `;
  
  document.body.appendChild(excalidrawContainer);
  initializeExcalidraw();
  setupEventListeners();
}

// Initialize Excalidraw
async function initializeExcalidraw() {
  const canvasContainer = document.getElementById('excalidraw-canvas-container');
  
  // Load required scripts
  await loadScript('https://esm.sh/react@18.3.1/umd/react.production.min.js');
  await loadScript('https://esm.sh/react-dom@18.3.1/umd/react-dom.production.min.js');
  
  // Set up import map for Excalidraw
  window.EXCALIDRAW_ASSET_PATH = "https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/prod/";
  
  const ExcalidrawLib = await import('https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/dev/index.js?external=react,react-dom');
  
  const App = React.createElement(() => {
    const [api, setAPI] = React.useState(null);
    
    React.useEffect(() => {
      if (api) {
        excalidrawAPI = api;
        loadSavedAnnotations();
      }
    }, [api]);
    
    return React.createElement(ExcalidrawLib.Excalidraw, {
      onChange: saveAnnotations,
      excalidrawAPI: setAPI,
      initialData: { elements: [], appState: { viewBackgroundColor: "transparent" } }
    });
  });
  
  ReactDOM.render(App, canvasContainer);
}

// Load external script
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('close-excalidraw').onclick = toggleExcalidraw;
  document.getElementById('clear-canvas').onclick = clearCanvas;
  document.getElementById('save-annotations').onclick = saveAnnotationsToFile;
  document.getElementById('load-annotations').onclick = loadAnnotationsFromFile;
  
  // Text selection handler
  document.addEventListener('mouseup', handleTextSelection);
}

// Handle text selection for annotations
function handleTextSelection(e) {
  if (!isVisible || !excalidrawAPI) return;
  
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  if (selectedText && e.target.closest('#excalidraw-web-overlay') === null) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    selectionRect = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
    
    createAnnotationForSelection();
  }
}

// Create annotation for selected text
function createAnnotationForSelection() {
  if (!excalidrawAPI || !selectedText || !selectionRect) return;
  
  const annotation = {
    id: `annotation-${Date.now()}`,
    type: 'rectangle',
    x: selectionRect.x,
    y: selectionRect.y,
    width: selectionRect.width,
    height: selectionRect.height,
    strokeColor: '#ff6b6b',
    backgroundColor: '#ffe066',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 70,
    angle: 0,
    groupIds: [],
    roundness: { type: 2 },
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData: { selectedText, url: window.location.href }
  };
  
  const currentElements = excalidrawAPI.getSceneElements();
  excalidrawAPI.updateScene({ elements: [...currentElements, annotation] });
  
  // Clear selection
  window.getSelection().removeAllRanges();
}

// Toggle Excalidraw visibility
function toggleExcalidraw() {
  if (!excalidrawContainer) {
    createExcalidrawOverlay();
  }
  
  isVisible = !isVisible;
  excalidrawContainer.style.display = isVisible ? 'flex' : 'none';
  
  chrome.runtime.sendMessage({ action: 'updateIcon', isVisible });
}

// Clear canvas
function clearCanvas() {
  if (excalidrawAPI) {
    excalidrawAPI.updateScene({ elements: [] });
  }
}

// Save annotations to storage
function saveAnnotations(elements, appState) {
  const data = { elements, appState, url: window.location.href };
  const key = `annotations_${btoa(window.location.href).slice(0, 20)}`;
  chrome.storage.local.set({ [key]: data });
}

// Load saved annotations
function loadSavedAnnotations() {
  const key = `annotations_${btoa(window.location.href).slice(0, 20)}`;
  chrome.storage.local.get(key, (result) => {
    if (result[key] && excalidrawAPI) {
      excalidrawAPI.updateScene({
        elements: result[key].elements || [],
        appState: result[key].appState || {}
      });
    }
  });
}

// Save annotations to file
function saveAnnotationsToFile() {
  if (!excalidrawAPI) return;
  
  const elements = excalidrawAPI.getSceneElements();
  const data = { elements, url: window.location.href };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `annotations_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Load annotations from file
function loadAnnotationsFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file || !excalidrawAPI) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        excalidrawAPI.updateScene({ elements: data.elements || [] });
      } catch (error) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    toggleExcalidraw();
  }
  sendResponse({ isVisible });
});