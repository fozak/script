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

  async function deleteAnnotation(id) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => console.log("🗑️ Deleted annotation:", id);
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

  // --- Sync onPointerUp ---
  excalidrawAPI.onPointerUp(async () => {
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    if (!elements.length) return;

    const annotations = await getAllAnnotations();
    const dbIDs = new Set(annotations.map(a => a.id));
    const sceneIDs = new Set(elements.map(e => e.id));

    // --- Handle new or updated elements ---
    for (const el of elements) {
      if (el.isDeleted) continue;

      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      const zoom = appState.zoom.value;
      const scrollX = appState.scrollX;
      const scrollY = appState.scrollY;
      const vx = (centerX - scrollX) * zoom;
      const vy = (centerY - scrollY) * zoom;

      const canvasWrapper = document.querySelector(".drawing-container");
      let relPos = null;
      let domAnchor = null;
      if (canvasWrapper) {
        const prev = canvasWrapper.style.pointerEvents;
        canvasWrapper.style.pointerEvents = "none";
        const domNode = document.elementFromPoint(vx, vy);
        canvasWrapper.style.pointerEvents = prev;

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
      }

      const annotation = { id: el.id, fullElement: el, domAnchor, relPos };
      await saveAnnotation(annotation);
      dbIDs.delete(el.id); // remove from deletion list
    }

    // --- Handle deletions ---
    for (const id of dbIDs) {
      await deleteAnnotation(id);
    }

    console.log("✅ IndexedDB synced onPointerUp. Scene IDs:", sceneIDs.size);
  });

  // --- Restore annotations on load ---
  async function restoreAnnotations() {
    const annotations = await getAllAnnotations();
    if (!annotations.length) return;

    const appState = excalidrawAPI.getAppState();
    const currentElements = excalidrawAPI.getSceneElements();

    const restored = annotations.map(a => {
      if (!a.fullElement) return null;
      let { x: newX, y: newY, width: newWidth, height: newHeight } = a.fullElement;

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
  console.log("✅ Excalidraw annotation system fully initialized (onPointerUp sync).");
})();
