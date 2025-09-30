(function() {
    let widgetRoot, widgetContainer;
    
    const Widget = () => {
        const [pos, setPos] = React.useState(null);
        const [value, setValue] = React.useState('');
        
        React.useEffect(() => {
            const unsubscribe = excalidrawAPI.onChange((elements, appState) => {
                const selected = appState.selectedElementIds;
                const selectedId = Object.keys(selected)[0];
                if (selectedId) {
                    const el = elements.find(e => e.id === selectedId);
                    if (el) {
                        const zoom = appState.zoom.value;
                        const x = (el.x + appState.scrollX) * zoom;
                        const y = (el.y + appState.scrollY) * zoom + 60; // offset for header
                        setPos({ x, y, zoom });
                        setValue(el.text || el.type);
                    }
                } else {
                    setPos(null);
                }
            });
            return unsubscribe;
        }, []);
        
        if (!pos) return null;
        
        return React.createElement('input', {
            value,
            onChange: (e) => setValue(e.target.value),
            style: {
                position: 'absolute',
                left: pos.x + 'px',
                top: pos.y + 'px',
                transform: `scale(${pos.zoom})`,
                transformOrigin: 'top left',
                padding: '8px',
                border: '2px solid #1971c2',
                borderRadius: '4px',
                fontSize: '16px',
                zIndex: 9999
            }
        });
    };
    
    if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        document.body.appendChild(widgetContainer);
        widgetRoot = createRoot(widgetContainer);
    }
    
    widgetRoot.render(React.createElement(Widget));
    console.log('✅ Widget active! Select any element to see the input.');
})();