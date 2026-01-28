// ============================================================
// COWORKER NAVIGATION - Simplified & Fixed
// ============================================================

// Get all Main* navigation runs
function getMainRuns() {
  return Object.values(CoworkerState.runs)
    .filter(r => r.component?.startsWith('Main') && r.options?.render !== false)
    .sort((a, b) => a.creation - b.creation);
}

// Get current index
function getCurrentIndex() {
  return getMainRuns().findIndex(r => r.name === CoworkerState.current_run);
}

// Generic navigation function
function navigate(direction) {
  const mainRuns = getMainRuns();
  const currentIndex = getCurrentIndex();
  const targetIndex = direction === 'back' ? currentIndex - 1 : currentIndex + 1;
  
  if (targetIndex >= 0 && targetIndex < mainRuns.length) {
    const targetRun = mainRuns[targetIndex];
    CoworkerState.current_run = targetRun.name;  // ✅ Update before render
    coworker._render(targetRun);
    updateNavUI();
    return true;
  }
  return false;
}

// Navigate to specific run
function navigateTo(runName) {
  const run = CoworkerState.runs[runName];
  if (run) {
    CoworkerState.current_run = runName;  // ✅ Update before render
    coworker._render(run);
    updateNavUI();
    return true;
  }
  return false;
}

// Navigate to grid (create if needed)
async function navigateToGrid(doctype) {
  await coworker.run({
    operation: 'select',
    doctype: doctype,
    component: 'MainGrid',
    container: 'main_container',
    query: { take: 10 }
  });
}

// Find grid for doctype (search backwards from current)
function findGridRunForDoctype(doctype) {
  const mainRuns = getMainRuns();
  const currentIndex = getCurrentIndex();
  
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (mainRuns[i].component === 'MainGrid' && mainRuns[i].source_doctype === doctype) {
      return mainRuns[i].name;
    }
  }
  return null;
}

// Get breadcrumbs
function getBreadcrumbs() {
  const current = CoworkerState.getCurrentRun();
  const home = getMainRuns()[0]?.name;
  
  if (!current?.component?.startsWith('Main')) {
    return [{ text: 'Home', runName: home }];
  }
  
  if (current.component === 'MainGrid') {
    return [
      { text: 'Home', runName: home },
      { text: current.source_doctype || 'List', runName: null }
    ];
  }
  
  if (current.component === 'MainForm') {
    const doctype = current.source_doctype || current.target_doctype;
    const docname = current.target?.data?.[0]?.name || 'New';
    const gridRun = findGridRunForDoctype(doctype);
    
    return [
      { text: 'Home', runName: home },
      { text: doctype, runName: gridRun, doctype: doctype },
      { text: docname, runName: null }  // ✅ Explicit null for consistency
    ];
  }
  
  return [
    { text: 'Home', runName: home },
    { text: current.component?.replace('Main', ''), runName: null }
  ];
}

// Update UI
function updateNavUI() {
  const currentIndex = getCurrentIndex();
  const mainRuns = getMainRuns();
  
  // Back/Forward buttons
  const backBtn = document.getElementById('back_btn');
  const forwardBtn = document.getElementById('forward_btn');
  if (backBtn) backBtn.disabled = currentIndex <= 0;
  if (forwardBtn) forwardBtn.disabled = currentIndex >= mainRuns.length - 1;
  
  // Breadcrumbs
  const breadcrumbsEl = document.getElementById('breadcrumbs');
  if (breadcrumbsEl) {
    breadcrumbsEl.innerHTML = getBreadcrumbs().map((crumb, i, arr) => {
      const isLast = i === arr.length - 1;
      
      // Last crumb (never clickable)
      if (isLast) {
        return `<span style="font-weight: 500;">${crumb.text}</span>`;
      }
      
      // Has existing run to navigate to
      if (crumb.runName) {
        return `<a href="#" onclick="navigateTo('${crumb.runName}'); return false;">${crumb.text}</a>`;
      }
      
      // Has doctype but no run (create grid on click)
      if (crumb.doctype) {
        return `<a href="#" onclick="navigateToGrid('${crumb.doctype}'); return false;">${crumb.text}</a>`;
      }
      
      // Fallback (should not happen)
      return `<span>${crumb.text}</span>`;
      
    }).join(' <span style="color: #999;">/</span> ');
  }
}

// Listeners
window.addEventListener('coworker:state:change', updateNavUI);
window.addEventListener('load', updateNavUI);