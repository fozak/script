// ============================================================================
// POCKETBASE CORE - Client initialization and utilities
// ============================================================================

globalThis.pb = globalThis.pb || new PocketBase("http://143.198.29.88:8090/");
// DISABLE auto-cancellation properly in UMD build
globalThis.pb.autoCancellation(false);

// Global config
globalThis.MAIN_COLLECTION = globalThis.MAIN_COLLECTION || 'item';
globalThis.currentUser = pb.authStore.model;

// ============================================================================
// CONNECTION
// ============================================================================

async function connectToPocketBase() {
  const statusDiv = document.getElementById('status');
  try {
    // Test connection
    await pb.collection('item').getList(1, 1);

    if (statusDiv) {
      statusDiv.textContent = 'Connected';
      statusDiv.className = 'mt-2 p-2 rounded text-sm bg-green-100 text-green-800';
    }

    await loadRenderCode();
    setupSearch();

  } catch (error) {
    if (statusDiv) {
      statusDiv.textContent = 'Failed to connect';
      statusDiv.className = 'mt-2 p-2 rounded text-sm bg-red-100 text-red-800';
    }
  }
}
