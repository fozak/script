const App = () => {
    const [excalidrawAPI, setExcalidrawAPI] = React.useState(null);

    React.useEffect(() => {
        if (excalidrawAPI) {
            window.excalidrawAPI = excalidrawAPI;
            console.log("✅ Excalidraw API now available globally!");
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
            viewBackgroundColor: "transparent",
            scrollX: 0,
            scrollY: 0,
        }
    };

    return React.createElement(
        React.Fragment,
        null,
        React.createElement(
            "div",
            { style: { height: "100%", width: "100%" } },
            React.createElement(ExcalidrawLib.Excalidraw, {
                initialData: initialData,
                // Disable scroll detection
                detectScroll: false,
                onChange: (elements, appState, files) => {
                    console.log("Canvas updated - elements count:", elements.length);
                },
                onScrollChange: (scrollX, scrollY) => {
                    // Lock scroll position immediately when it changes
                    if (excalidrawAPI && (scrollX !== 0 || scrollY !== 0)) {
                        requestAnimationFrame(() => {
                            excalidrawAPI.updateScene({
                                appState: { scrollX: 0, scrollY: 0 }
                            });
                        });
                    }
                },
                excalidrawAPI: (api) => {
                    console.log("🎯 excalidrawAPI callback triggered!");
                    setExcalidrawAPI(api);
                }
            })
        )
    );
};