Perfect! Create a separate persistence module that hooks into browser events:
javascript// ============================================================================
// COWORKER-PERSISTENCE.JS - Auto-save state before tab close
// Version: 1.0.0
// ============================================================================

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    const globalScope = typeof self !== 'undefined' ? self :
                       typeof window !== 'undefined' ? window :
                       typeof global !== 'undefined' ? global :
                       globalThis;
    globalScope.CoworkerPersistence = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const VERSION = '1.0.0';
  const STORAGE_KEY = 'coworker_state_backup';

  // ==========================================================================
  // SAVE STATE
  // ==========================================================================

  function saveState() {
    try {
      if (typeof CoworkerState === 'undefined') {
        console.warn('⚠️ CoworkerState not available');
        return false;
      }

      const currentState = CoworkerState.getState();
      
      const toSave = {
        version: VERSION,
        timestamp: Date.now(),
        currentRun: currentState.currentRun,
        url: window.location.href
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      console.log('💾 State saved before unload');
      return true;
    } catch (error) {
      console.error('❌ Failed to save state:', error);
      return false;
    }
  }

  // ==========================================================================
  // LOAD STATE
  // ==========================================================================

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        console.log('ℹ️ No saved state found');
        return null;
      }

      const parsed = JSON.parse(saved);
      
      // Version check
      if (parsed.version !== VERSION) {
        console.warn('⚠️ State version mismatch');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Age check (optional - don't restore if > 1 hour old)
      const age = Date.now() - parsed.timestamp;
      const MAX_AGE = 60 * 60 * 1000; // 1 hour
      if (age > MAX_AGE) {
        console.warn('⚠️ Saved state too old, ignoring');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      console.log('✅ Loaded saved state:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ Failed to load state:', error);
      return null;
    }
  }

  // ==========================================================================
  // RESTORE STATE (Navigate to saved location)
  // ==========================================================================

  function restoreState() {
    const saved = loadState();
    
    if (!saved || !saved.currentRun) {
      console.log('ℹ️ No state to restore');
      return false;
    }

    try {
      if (typeof CoworkerState === 'undefined' || typeof nav === 'undefined') {
        console.warn('⚠️ CoworkerState or nav not available');
        return false;
      }

      // Navigate to the saved location
      const params = saved.currentRun.params;
      if (params && params.doctype) {
        console.log('🔄 Restoring navigation to:', params);
        nav.navigate(params, true); // replaceState = true
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to restore state:', error);
      return false;
    }
  }

  // ==========================================================================
  // CLEAR SAVED STATE
  // ==========================================================================

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Saved state cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear state:', error);
      return false;
    }
  }

  // ==========================================================================
  // AUTO-SETUP: Hook into browser events
  // ==========================================================================

  function init(options = {}) {
    const {
      autoRestore = true,
      maxAge = 60 * 60 * 1000 // 1 hour
    } = options;

    // Save before tab close
    window.addEventListener('beforeunload', (event) => {
      saveState();
      // Note: Don't prevent default or show confirmation
      // Modern browsers ignore custom messages anyway
    });

    // Save on visibility change (when tab goes to background)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        saveState();
      }
    });

    // Save periodically (every 30 seconds)
    setInterval(saveState, 30000);

    // Auto-restore on load
    if (autoRestore) {
      // Wait for CoworkerState to be ready
      if (typeof CoworkerState !== 'undefined') {
        restoreState();
      } else {
        // Retry after a short delay
        setTimeout(() => {
          if (typeof CoworkerState !== 'undefined') {
            restoreState();
          }
        }, 500);
      }
    }

    console.log('✅ CoworkerPersistence initialized');
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  return {
    version: VERSION,
    init,
    saveState,
    loadState,
    restoreState,
    clearState
  };
}));
Usage in Your HTML
html<!-- Load order -->
<script src="coworker-state.js"></script>
<script src="coworker-persistence.js"></script>

<script>
  // Initialize persistence
  CoworkerPersistence.init({
    autoRestore: true,  // Automatically restore last view on page load
    maxAge: 3600000     // 1 hour in milliseconds
  });

  // That's it! Now:
  // - State saves before tab close
  // - State saves when tab goes to background
  // - State saves every 30 seconds
  // - State restores automatically on page load
</script>
Manual Control (Optional)
javascript// Manually save state
CoworkerPersistence.saveState();

// Manually restore state
CoworkerPersistence.restoreState();

// Check what's saved
const saved = CoworkerPersistence.loadState();
console.log(saved);

// Clear saved state
CoworkerPersistence.clearState();
What Gets Saved
javascript{
  version: '1.0.0',
  timestamp: 1234567890,
  url: 'https://yourapp.com/?p=...',
  currentRun: {
    params: { doctype: 'Project', query: {...}, options: {...} },
    data: [...],
    schema: {...},
    viewConfig: {...}
  }
}
Behavior

Before tab close → State saves to localStorage
Tab goes to background → State saves
Every 30 seconds → State saves (in case of crash)
Page reload → State restores automatically
After 1 hour → Old state is ignored

Benefits
✅ No CoworkerState modification - Completely separate module
✅ Browser hook - Uses beforeunload event
✅ Auto-restore - User comes back to where they were
✅ Safety net - Periodic saves in case of crash
✅ Clean separation - Can enable/disable easily
Perfect for your architecture! 🎯