//


//partly working v4
(() => {
  const canvas = document.querySelector(".drawing-container");
  if (!canvas) return console.error("⚠️ no drawing-container");

  let pass = false, active = null;

  const enable = (el) => {
    canvas.style.pointerEvents = "none";
    pass = true; active = el;
    console.log("🟢 Pass-through ON:", el.tagName);
  };

  const disable = () => {
    canvas.style.pointerEvents = "auto";
    pass = false; active = null;
    console.log("🔴 Pass-through OFF");
  };

  document.addEventListener("mousedown", (e) => {
    if (!pass) {
      canvas.style.pointerEvents = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      canvas.style.pointerEvents = "auto";
      if (el && el !== canvas) enable(el);
    } else if (active && !active.contains(e.target)) {
      disable();
    }
  });

  document.addEventListener("keydown", (e) => e.key === "Shift" && disable());
})();


// working function
(function() {
  if (!window.excalidrawAPI) {
    console.warn("Excalidraw API not found!");
    return;
  }

  const DB_NAME = "ExcalidrawAnnotations";
  const STORE_NAME = "annotations";

  // --- IndexedDB setup ---
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function saveAnnotation(a) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(a);
    tx.oncomplete = () => console.log("💾 Saved annotation:", a.id);
  }

  async function getAllAnnotations() {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  // --- Finished-element tracking ---
  const tracked = {};

  excalidrawAPI.onPointerUp(() => {
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();

    if (!elements.length) return;

    const el = elements[elements.length - 1]; // last element = just drawn
    if (!el || el.isDeleted || tracked[el.id]) return;
    tracked[el.id] = true;

    // Center in scene coordinates
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;

    // Map to DOM
    const zoom = appState.zoom.value;
    const scrollX = appState.scrollX;
    const scrollY = appState.scrollY;

    const vx = (centerX - scrollX) * zoom;
    const vy = (centerY - scrollY) * zoom;

    const canvasWrapper = document.querySelector(".drawing-container");
    if (!canvasWrapper) return;
    const prev = canvasWrapper.style.pointerEvents;
    canvasWrapper.style.pointerEvents = "none";
    const domNode = document.elementFromPoint(vx, vy);
    canvasWrapper.style.pointerEvents = prev;

    let relPos = null;
    let domAnchor = null;
    if (domNode) {
      const rect = domNode.getBoundingClientRect();
      relPos = { relX: (vx - rect.left)/rect.width, relY: (vy - rect.top)/rect.height };
      domAnchor = {
        selector: domNode.tagName.toLowerCase() +
                  (domNode.id ? `#${domNode.id}` : '') +
                  (domNode.className ? `.${domNode.className.split(' ').join('.')}` : ''),
        boundingRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      };
    }

    const annotation = { id: el.id, fullElement: el, domAnchor, relPos };
    saveAnnotation(annotation);
    console.log("🖊️ Finished element stored:", annotation);
  });

  // --- Restore annotations ---
  async function restoreAnnotations() {
    const annotations = await getAllAnnotations();
    if (!annotations.length) return;

    const appState = excalidrawAPI.getAppState();
    const currentElements = excalidrawAPI.getSceneElements();

    const restored = annotations.map(a => {
      if (!a.fullElement) return null;

      let newX = a.fullElement.x;
      let newY = a.fullElement.y;
      let newWidth = a.fullElement.width;
      let newHeight = a.fullElement.height;

      if (a.domAnchor && a.relPos) {
        const elem = document.querySelector(a.domAnchor.selector);
        if (elem) {
          const rect = elem.getBoundingClientRect();
          newX = rect.left + rect.width * a.relPos.relX;
          newY = rect.top + rect.height * a.relPos.relY;
          const zoom = appState.zoom.value;
          const scrollX = appState.scrollX;
          const scrollY = appState.scrollY;
          newX = newX / zoom + scrollX - a.fullElement.width/2;
          newY = newY / zoom + scrollY - a.fullElement.height/2;

          const orig = a.domAnchor.boundingRect;
          const scaleX = rect.width / orig.width;
          const scaleY = rect.height / orig.height;
          const scale = Math.min(scaleX, scaleY);
          newWidth = a.fullElement.width * scale;
          newHeight = a.fullElement.height * scale;
        }
      }

      return { ...a.fullElement, x: newX, y: newY, width: newWidth, height: newHeight };
    }).filter(Boolean);

    excalidrawAPI.updateScene({ elements: [...currentElements, ...restored] });
    console.log("🔄 Restored annotations:", restored.length);
  }

  restoreAnnotations();
  console.log("✅ Excalidraw annotation system fully initialized.");
})();


// temporarily pass through 

(function() {
    let isPassThrough = false;
    let knownIds = new Set();

    // Helpers
    const canvasWrapper = document.querySelector(".drawing-container");
    const enablePassThrough = () => {
        if (!isPassThrough && canvasWrapper) {
            canvasWrapper.style.pointerEvents = "none";
            isPassThrough = true;
        }
    };
    const disablePassThrough = () => {
        if (isPassThrough && canvasWrapper) {
            canvasWrapper.style.pointerEvents = "auto";
            isPassThrough = false;
        }
    };

    // Attach Excalidraw listener
    excalidrawAPI.onChange((elements, appState) => {
        for (const el of elements) {
            if (!knownIds.has(el.id) && !el.isDeleted) {
                // new element finished
                knownIds.add(el.id);

                const { x, y, width, height } = el;
                const centerX = x + width / 2;
                const centerY = y + height / 2;

                // scene → viewport coords
                const zoom = appState.zoom.value;
                const scrollX = appState.scrollX;
                const scrollY = appState.scrollY;
                const vx = (centerX - scrollX) * zoom;
                const vy = (centerY - scrollY) * zoom;

                // temporarily enable pass-through
                enablePassThrough();
                const target = document.elementFromPoint(vx, vy);
                disablePassThrough();

                console.log("=== Finished shape ===");
                console.log("ID:", el.id, "Type:", el.type);
                console.log("Underlying DOM node:", target);
            }
        }
    });

    console.log("✅ Shape-finish DOM probing active. Draw a shape to see logs.");
})();








//button v2 - disabling it
// ===== Pass-Through Toggle Button with Auto-Disable =====
let isPassThrough = false;
let previousActiveTool = null;

// Wait until Excalidraw API is available
const waitForAPI = setInterval(() => {
    const canvasWrapper = document.querySelector(".drawing-container");
    if (canvasWrapper && window.excalidrawAPI) {
        clearInterval(waitForAPI);
        
        // Create toggle button
        const btn = document.createElement("button");
        btn.textContent = "Toggle Pass-Through";
        btn.style.position = "absolute";
        btn.style.top = "10px";
        btn.style.right = "10px";
        btn.style.zIndex = 9999;
        btn.style.padding = "5px 10px";
        btn.style.background = "#1971c2";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "14px";
        
        // Function to disable pass-through
        const disablePassThrough = () => {
            if (isPassThrough) {
                canvasWrapper.style.pointerEvents = "auto";
                console.log("🔴 Pass-through OFF (auto-disabled by tool change)");
                btn.style.background = "#1971c2";
                btn.textContent = "Toggle Pass-Through";
                isPassThrough = false;
            }
        };
        
        // Function to enable pass-through
        const enablePassThrough = () => {
            canvasWrapper.style.pointerEvents = "none";
            console.log("🟢 Pass-through ON");
            btn.style.background = "#2f9e44";
            btn.textContent = "Pass-Through: ON";
            isPassThrough = true;
        };
        
        // Manual toggle button click
        btn.addEventListener("click", () => {
            if (!isPassThrough) {
                enablePassThrough();
            } else {
                disablePassThrough();
            }
        });
        
        document.body.appendChild(btn);
        
        // Monitor tool changes
        const monitorToolChanges = setInterval(() => {
            try {
                const appState = window.excalidrawAPI.getAppState();
                const currentTool = appState.activeTool?.type;
                
                // Detect tool change
                if (currentTool !== previousActiveTool) {
                    console.log(`🔧 Tool changed: ${previousActiveTool || 'none'} → ${currentTool}`);
                    
                    // Auto-disable pass-through when ANY drawing tool is activated
                    // (rectangle, arrow, line, text, ellipse, diamond, freedraw, etc.)
                    if (currentTool && currentTool !== "selection" && currentTool !== "hand") {
                        disablePassThrough();
                    }
                    
                    previousActiveTool = currentTool;
                }
            } catch (error) {
                console.error("Error monitoring tool changes:", error);
            }
        }, 100);
        
        console.log("✅ Pass-through toggle button added with auto-disable!");
        console.log("💡 Pass-through will auto-disable when you select any drawing tool");
    }
}, 100);

//button v1
// ===== Pass-Through Toggle Button =====
let isPassThrough = false;

// Wait until Excalidraw API is available
const waitForAPI = setInterval(() => {
    const canvasWrapper = document.querySelector(".drawing-container");
    if (canvasWrapper && window.excalidrawAPI) {
        clearInterval(waitForAPI);

        // Create toggle button
        const btn = document.createElement("button");
        btn.textContent = "Toggle Pass-Through";
        btn.style.position = "absolute";
        btn.style.top = "10px";
        btn.style.right = "10px";
        btn.style.zIndex = 9999;
        btn.style.padding = "5px 10px";
        btn.style.background = "#1971c2";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "14px";

        btn.addEventListener("click", () => {
            if (!isPassThrough) {
                canvasWrapper.style.pointerEvents = "none"; // allow clicks to go through
                console.log("🟢 Pass-through ON");
                btn.style.background = "#2f9e44";
                isPassThrough = true;
            } else {
                canvasWrapper.style.pointerEvents = "auto"; // restore interaction
                console.log("🔴 Pass-through OFF");
                btn.style.background = "#1971c2";
                isPassThrough = false;
            }
        });

        document.body.appendChild(btn);

        console.log("✅ Pass-through toggle button added!");
    }
}, 100);




// excalidraw-pass-through.js

(() => {
  const canvasWrapper = document.querySelector(".drawing-container");

  if (!canvasWrapper) {
    console.error("⚠️ drawing-container not found");
    return;
  }

  let isPassThrough = false;

  const enablePassThrough = () => {
    if (!isPassThrough) {
      canvasWrapper.style.pointerEvents = "none"; // allow clicks to go through
      console.log("🟢 Pass-through ON");
      isPassThrough = true;
    }
  };

  const disablePassThrough = () => {
    if (isPassThrough) {
      canvasWrapper.style.pointerEvents = "auto"; // restore interaction
      console.log("🔴 Pass-through OFF");
      isPassThrough = false;
    }
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Shift") enablePassThrough();
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") disablePassThrough();
  });

  console.log("✅ Shift-hold pass-through ready. Hold Shift to click through canvas.");
})();
