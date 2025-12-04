// ============================================================
// COWORKER NAVIGATION - coworker-navigation.js Timestamp-based navigation
// ============================================================

// Get all Main* runs in chronological order
function getMainRuns() {
  return Object.values(CoworkerState.runs)
    .filter(r => r.component?.startsWith('Main'))
    .sort((a, b) => a.creation - b.creation);
}

// Get current run index in Main* runs
function getCurrentIndex() {
  const mainRuns = getMainRuns();
  return mainRuns.findIndex(r => r.name === CoworkerState.current_run);
}

// Navigate back
function navigateBack() {
  const mainRuns = getMainRuns();
  const currentIndex = getCurrentIndex();
  
  if (currentIndex > 0) {
    const prevRun = mainRuns[currentIndex - 1];
    if (typeof coworker._render === 'function') {
      coworker._render(prevRun);
    }
    CoworkerState.current_run = prevRun.name;
    return true;
  }
  return false;
}

// Navigate forward
function navigateForward() {
  const mainRuns = getMainRuns();
  const currentIndex = getCurrentIndex();
  
  if (currentIndex < mainRuns.length - 1) {
    const nextRun = mainRuns[currentIndex + 1];
    if (typeof coworker._render === 'function') {
      coworker._render(nextRun);
    }
    CoworkerState.current_run = nextRun.name;
    return true;
  }
  return false;
}

// Check if can navigate back
function canNavigateBack() {
  return getCurrentIndex() > 0;
}

// Check if can navigate forward
function canNavigateForward() {
  const mainRuns = getMainRuns();
  const currentIndex = getCurrentIndex();
  return currentIndex >= 0 && currentIndex < mainRuns.length - 1;
}

// Get breadcrumbs for current run
function getBreadcrumbs() {
  const currentRun = CoworkerState.getCurrentRun();
  
  if (!currentRun?.component?.startsWith('Main')) {
    return ['Home'];
  }
  
  // MainGrid: Home > Doctype
  if (currentRun.component === 'MainGrid') {
    return ['Home', currentRun.source_doctype || 'List'];
  }
  
  // MainForm: Home > Doctype > Docname
  if (currentRun.component === 'MainForm') {
    const doctype = currentRun.source_doctype || currentRun.target_doctype;
    const docname = currentRun.output?.data?.[0]?.name || 'New';
    return ['Home', doctype, docname];
  }
  
  // MainChat or other
  return ['Home', currentRun.component?.replace('Main', '')];
}

// Update navigation UI
function updateNavUI() {
  const backBtn = document.getElementById('back_btn');
  const forwardBtn = document.getElementById('forward_btn');
  const breadcrumbs = document.getElementById('breadcrumbs');
  
  if (backBtn) backBtn.disabled = !canNavigateBack();
  if (forwardBtn) forwardBtn.disabled = !canNavigateForward();
  if (breadcrumbs) breadcrumbs.textContent = getBreadcrumbs().join(' > ');
}

// Button handlers
function handleBack() {
  if (navigateBack()) {
    updateNavUI();
  }
}

function handleForward() {
  if (navigateForward()) {
    updateNavUI();
  }
}

// Listen for state changes
window.addEventListener('coworker:state:change', updateNavUI);

// Initial update on load
window.addEventListener('load', updateNavUI);