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

// Navigate to specific run
function navigateTo(runName) {
  const run = CoworkerState.runs[runName];
  if (run && typeof coworker._render === 'function') {
    coworker._render(run);
    CoworkerState.current_run = runName;
    updateNavUI();
    return true;
  }
  return false;
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

// Find most recent MainGrid for a doctype (before current run)
function findGridRunForDoctype(doctype) {
  const mainRuns = getMainRuns();
  const currentIndex = getCurrentIndex();
  
  // Search backwards from current position
  for (let i = currentIndex - 1; i >= 0; i--) {
    const run = mainRuns[i];
    if (run.component === 'MainGrid' && run.source_doctype === doctype) {
      return run.name;
    }
  }
  
  // If not found before, search all
  const gridRun = mainRuns.find(r => 
    r.component === 'MainGrid' && r.source_doctype === doctype
  );
  return gridRun?.name;
}

// Get breadcrumbs for current run
function getBreadcrumbs() {
  const currentRun = CoworkerState.getCurrentRun();
  const mainRuns = getMainRuns();
  const homeRun = mainRuns[0]?.name; // First Main* run as home
  
  if (!currentRun?.component?.startsWith('Main')) {
    return [{ text: 'Home', runName: homeRun }];
  }
  
  // MainGrid: Home > Doctype
  if (currentRun.component === 'MainGrid') {
    return [
      { text: 'Home', runName: homeRun },
      { text: currentRun.source_doctype || 'List', runName: null } // current
    ];
  }
  
  // MainForm: Home > Doctype > Docname
  if (currentRun.component === 'MainForm') {
    const doctype = currentRun.source_doctype || currentRun.target_doctype;
    const docname = currentRun.output?.data?.[0]?.name || 'New';
    const gridRun = findGridRunForDoctype(doctype);
    
    return [
      { text: 'Home', runName: homeRun },
      { text: doctype, runName: gridRun },
      { text: docname, runName: null } // current
    ];
  }
  
  // MainChat or other
  return [
    { text: 'Home', runName: homeRun },
    { text: currentRun.component?.replace('Main', ''), runName: null }
  ];
}

// Update navigation UI
function updateNavUI() {
  const backBtn = document.getElementById('back_btn');
  const forwardBtn = document.getElementById('forward_btn');
  const breadcrumbsEl = document.getElementById('breadcrumbs');
  
  if (backBtn) backBtn.disabled = !canNavigateBack();
  if (forwardBtn) forwardBtn.disabled = !canNavigateForward();
  
  if (breadcrumbsEl) {
    const breadcrumbs = getBreadcrumbs();
    breadcrumbsEl.innerHTML = breadcrumbs.map((crumb, i) => {
      const isLast = i === breadcrumbs.length - 1;
      
      if (crumb.runName && !isLast) {
        return `<a href="#" onclick="navigateTo('${crumb.runName}'); return false;" style="color: #0066cc; text-decoration: none;">${crumb.text}</a>`;
      } else {
        return `<span style="${isLast ? 'font-weight: 500;' : ''}">${crumb.text}</span>`;
      }
    }).join(' <span style="color: #999;">/</span> ');
  }
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