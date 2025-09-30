

(async function() {
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

    // Create or get root element
    let rootDiv = document.getElementById('root');
    if (!rootDiv) {
        rootDiv = document.createElement('div');
        rootDiv.id = 'root';
        rootDiv.style.cssText = 'width: 100vw; height: 100vh; margin: 0; padding: 0;';
        document.body.appendChild(rootDiv);
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

    // Use React directly
    const { useState, useEffect, createElement, Fragment } = React;

    const App = () => {
        const [excalidrawAPI, setExcalidrawAPI] = useState(null);

        useEffect(() => {
            if (excalidrawAPI) {
                window.excalidrawAPI = excalidrawAPI;
                console.log("✅ Excalidraw API now available globally!", excalidrawAPI);
                console.log("Available API methods:", Object.keys(excalidrawAPI));

                setTimeout(() => {
                    console.log("Testing API...");
                    try {
                        const elements = excalidrawAPI.getSceneElements();
                        console.log("Current elements count:", elements.length);
                    } catch (error) {
                        console.error("API test failed:", error);
                    }
                }, 500);
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
                viewBackgroundColor: "#ffffff"
            }
        };

        return createElement(
            Fragment,
            null,
            createElement(
                "div",
                { style: { height: "100%", width: "100%" } },
                createElement(ExcalidrawLib.Excalidraw, {
                    initialData: initialData,
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

    // Render the app
    const container = document.getElementById('excalidraw-container');
    const root = ReactDOMClient.createRoot(container);
    root.render(createElement(App));

    console.log("🚀 Excalidraw initialized successfully!");
})();