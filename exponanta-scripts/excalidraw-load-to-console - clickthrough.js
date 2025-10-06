(async function () {
    // Set asset path FIRST
    window.EXCALIDRAW_ASSET_PATH = "https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/prod/";

    // Inject CSS if not already present
    if (!document.querySelector('link[href*="excalidraw"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/dev/index.css';
        document.head.appendChild(link);
    }

    // Load React and ReactDOM together using esm.sh with pinned versions
    const React = await import('https://esm.sh/react@18.3.1');
    const ReactDOM = await import('https://esm.sh/react-dom@18.3.1');
    const ReactDOMClient = await import('https://esm.sh/react-dom@18.3.1/client');

    // Make React available globally
    window.React = React;
    window.ReactDOM = ReactDOM;

    console.log("✅ React loaded and set globally");

    // Load Excalidraw with deps parameter to use the same React version
    const ExcalidrawLib = await import('https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@18.3.1,react-dom@18.3.1');

    window.ExcalidrawLib = ExcalidrawLib;
    console.log("✅ Excalidraw library loaded:", ExcalidrawLib);

    // Create or get root element version 2 https://claude.ai/chat/a1f9270c-de58-41f2-8dd1-994488f12b51
    let rootDiv = document.getElementById('root');
    if (!rootDiv) {
        rootDiv = document.createElement('div');
        rootDiv.id = 'root';
        rootDiv.style.cssText = 'width: 100vw; height: 100vh; margin: 0; padding: 0;';
        document.body.insertBefore(rootDiv, document.body.firstChild); // Insert at top
    }

    // Clear and setup DOM
    rootDiv.innerHTML = `
        <div class="header" style="background: #f8f9fa; padding: 10px 20px; border-bottom: 1px solid #e9ecef; text-align: center; font-size: 18px; font-weight: 600; color: #495057;">
            Excalidraw - Browser-Only Implementation
        </div>
        <div class="drawing-container" style="height: calc(100vh - 60px); position: relative;">
            <div id="excalidraw-container" style="height: 100%; width: 100%;"></div>
        </div>
    `;

const App = () => {
  const [excalidrawAPI, setExcalidrawAPI] = React.useState(null);

  React.useEffect(() => {
    if (excalidrawAPI) {
      window.excalidrawAPI = excalidrawAPI;
      console.log("✅ Excalidraw API available:", excalidrawAPI);
    }
  }, [excalidrawAPI]);

  const initialData = {
    elements: [
      {
        id: "welcome-text",
        type: "text",
        x: 100,
        y: 100,
        width: 300,
        height: 25,
        text: "Welcome to Excalidraw!",
        fontSize: 20,
        fontFamily: 1,
        textAlign: "left",
        verticalAlign: "top",
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "hachure",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        angle: 0,
        groupIds: [],
        roundness: null,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false
      }
    ],
    appState: {
      gridSize: null,
      viewBackgroundColor: "transparent"
    }
  };

  const handlePointerDown = (event) => {
    // If user clicks on an Excalidraw element → let Excalidraw handle it
    if (event.nativeEvent.target.closest(".excalidraw")) {
      return; // normal canvas behavior
    }
    // Otherwise → let underlying HTML receive the event
    event.nativeEvent.stopImmediatePropagation();
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { style: { height: "100%", width: "100%" } },
      React.createElement(ExcalidrawLib.Excalidraw, {
        initialData: initialData,
        onPointerDown: handlePointerDown,
        onChange: (elements, appState, files) => {
          console.log("Canvas updated - elements count:", elements.length);
        },
        excalidrawAPI: (api) => {
          console.log("🎯 excalidrawAPI callback triggered!", api);
          setExcalidrawAPI(api);
        }
      })
    )
  );
};


    /* Make Excalidraw canvas pass through clicks but keep UI interactive*/
/*const excalidrawStyle = document.createElement('style');
excalidrawStyle.textContent = `
    #root, 
    #root > *:not(.excalidraw) {
        pointer-events: none !important;
    }
    .excalidraw,
    .excalidraw * {
        pointer-events: auto !important;
    }
    .excalidraw .excalidraw-canvas {
        background: transparent !important;
    }
`;
document.head.appendChild(excalidrawStyle);*/

    // Render the app
    const container = document.getElementById('excalidraw-container');
    const root = ReactDOMClient.createRoot(container);
    root.render(createElement(App));

    console.log("🚀 Excalidraw initialized successfully!");
})();

//load then widget TIMEOUT
setTimeout(async function() {
    // Check if excalidrawAPI is available
    if (!window.excalidrawAPI) {
        console.error('❌ excalidrawAPI not available yet! Wait for Excalidraw to fully load.');
        return;
    }
    
    let widgetRoot, widgetContainer;
    
    const Widget = () => {
        const [pos, setPos] = React.useState(null);
        const [value, setValue] = React.useState('');
        
        React.useEffect(() => {
            if (!window.excalidrawAPI) {
                console.error('❌ excalidrawAPI not available in useEffect');
                return;
            }
            
            console.log('Setting up onChange listener...');
            
            const unsubscribe = window.excalidrawAPI.onChange((elements, appState) => {
                console.log('onChange triggered', { elements: elements.length, appState });
                
                const selected = appState.selectedElementIds;
                const selectedIds = Object.keys(selected);
                
                console.log('Selected IDs:', selectedIds);
                
                if (selectedIds.length > 0) {
                    const selectedId = selectedIds[0];
                    const el = elements.find(e => e.id === selectedId);
                    
                    if (el) {
                        console.log('Found element:', el);
                        const zoom = appState.zoom.value;
                        const scrollX = appState.scrollX || 0;
                        const scrollY = appState.scrollY || 0;
                        
                        const x = (el.x + scrollX) * zoom;
                        const y = (el.y + scrollY) * zoom + 60; // offset for header
                        
                        console.log('Setting position:', { x, y, zoom });
                        setPos({ x, y, zoom });
                        setValue(el.text || el.type || '');
                    }
                } else {
                    console.log('No selection, hiding widget');
                    setPos(null);
                }
            });
            
            console.log('✅ onChange listener registered');
            return unsubscribe;
        }, []);
        
        if (!pos) {
            console.log('Widget hidden - no position');
            return null;
        }
        
        console.log('Rendering widget at:', pos);
        
        return React.createElement('input', {
            value,
            onChange: (e) => setValue(e.target.value),
            style: {
                position: 'fixed',
                left: pos.x + 'px',
                top: pos.y + 'px',
                transform: `scale(${pos.zoom})`,
                transformOrigin: 'top left',
                padding: '8px',
                border: '2px solid #1971c2',
                borderRadius: '4px',
                fontSize: '16px',
                zIndex: 99999,
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }
        });
    };
    
    if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        widgetContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 99999;';
        document.body.appendChild(widgetContainer);
        
        const { createRoot } = await import('https://esm.sh/react-dom@18.3.1/client');
        widgetRoot = createRoot(widgetContainer);
    }
    
    // Make input interactive
    const style = document.createElement('style');
    style.textContent = `
        input[style*="position: fixed"] {
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);
    
    widgetRoot.render(React.createElement(Widget));
    console.log('✅ Widget active! Select any element to see the input.');
    console.log('Current API:', window.excalidrawAPI);
}, 3000); // 3 second delay

console.log('⏳ Widget will load in 3 seconds...');