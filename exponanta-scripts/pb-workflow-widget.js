(function() {
  if (!pb || !selectedTarget) {
    console.error('PocketBase or selectedTarget not found');
    return;
  }

  pb.autoCancellation(false);

  // Disable AMD temporarily
  const prevDefine = window.define;
  window.define = undefined;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadReact() {
    if (window.React && window.ReactDOM) {
      return { React: window.React, ReactDOM: window.ReactDOM };
    }

    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js');
      
      if (!window.React || !window.ReactDOM) {
        throw new Error('React libraries failed to load properly');
      }
      
      return { React: window.React, ReactDOM: window.ReactDOM };
    } finally {
      if (prevDefine) window.define = prevDefine;
    }
  }

  async function initWorkflowWidget() {
    const { React, ReactDOM } = await loadReact();
    const { useState, useEffect } = React;

    function WorkflowWidget({ docName, doctype }) {
      const [workflowState, setWorkflowState] = useState('');
      const [availableActions, setAvailableActions] = useState([]);
      const [loading, setLoading] = useState(false);

      const refresh = async () => {
        const state = await pb.getWorkflowState(docName);
        const roles = await pb.getCurrentUserRoles();
        const actions = await pb.getAvailableTransitions(doctype, state, roles);
        setWorkflowState(state);
        setAvailableActions(actions);
      };

      useEffect(() => { refresh(); }, [docName, doctype]);

      const handleAction = async (action) => {
        setLoading(true);
        try {
          await pb.executeWorkflowTransition(docName, action);
          await refresh();
        } catch (err) {
          console.error('Workflow transition failed', err);
        } finally {
          setLoading(false);
        }
      };

      return (
        React.createElement('div', { className: 'workflow-widget' },
          React.createElement('div', null, `Current State: ${workflowState}`),
          React.createElement('div', { style: { marginTop: '10px' } },
            availableActions.map(action =>
              React.createElement('button', {
                key: action,
                className: 'btn btn-sm btn-primary',
                onClick: () => handleAction(action),
                disabled: loading
              }, action)
            )
          )
        )
      );
    }

    ReactDOM.render(
      React.createElement(WorkflowWidget, { docName: selectedTarget.name, doctype: selectedTarget.doctype }),
      document.getElementById('workflow-widget-root')
    );
  }

  initWorkflowWidget();
})();
