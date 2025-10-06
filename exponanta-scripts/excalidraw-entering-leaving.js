(() => {
  if (!window.excalidrawAPI) return console.error("⚠️ excalidrawAPI not found");
  const canvasWrapper = document.querySelector(".drawing-container");
  if (!canvasWrapper) return console.error("⚠️ drawing-container not found");
  
  // Import the utility from Excalidraw
  const { viewportCoordsToSceneCoords } = window.ExcalidrawLib;
  
  let hoveredElement = null;
  
  canvasWrapper.addEventListener("mousemove", (evt) => {
    const appState = excalidrawAPI.getAppState();
    const sceneCoords = viewportCoordsToSceneCoords(
      { clientX: evt.clientX, clientY: evt.clientY },
      appState
    );
    
    const elements = excalidrawAPI.getSceneElements();
    
    const currentlyHovered = elements.find(el => 
      sceneCoords.x >= el.x && sceneCoords.x <= el.x + el.width &&
      sceneCoords.y >= el.y && sceneCoords.y <= el.y + el.height
    );
    
    if (currentlyHovered !== hoveredElement) {
      if (hoveredElement) {
        console.log(`🔴 Left: ${hoveredElement.id} (${hoveredElement.type})`);
      }
      if (currentlyHovered) {
        console.log(`🟢 Entered: ${currentlyHovered.id} (${currentlyHovered.type})`, currentlyHovered);
      }
      hoveredElement = currentlyHovered;
    }
  });
  
  canvasWrapper.addEventListener("mouseleave", () => {
    if (hoveredElement) {
      console.log(`🔴 Left: ${hoveredElement.id} (${hoveredElement.type})`);
      hoveredElement = null;
    }
  });
})();