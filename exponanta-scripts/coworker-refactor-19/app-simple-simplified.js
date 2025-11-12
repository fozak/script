// ============================================================================
// app-simple.js - Main Application (Pure coworker.run() Architecture)
// ============================================================================
(function () {
  "use strict";

  console.log("🚀 Initializing application (Pure coworker Architecture)...");

  if (!window.pb) window.pb = {};
  window.pb.ui = {};
  window.app = {};

  const e = React.createElement;

  // ============================================================================
  // PART 1: UI PRIMITIVES (Pure Components - No Business Logic)
  // ============================================================================
  
  pb.ui.FieldDisplay = ({ field, value }) => {
    if (value == null || value === '') return null;
    
    if (field.fieldtype === 'Link' && field.options) {
      return e('a', {
        href: '#',
        className: 'text-primary fw-bold',
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          app.handleRun({
            operation: 'select',
            doctype: field.options,
            args: { where: { name: value } }
          });
        }
      }, value);
    }
    
    return String(value);
  };

  pb.ui.Table = ({ data, columns, doctype }) => {
    const { useReactTable, getCoreRowModel, flexRender } = window.TanStackTable;
    
    const tableColumns = React.useMemo(() => columns.map(col => ({
      accessorKey: col.accessorKey,
      header: col.header,
      cell: info => e(pb.ui.FieldDisplay, {
        field: col.field,
        value: info.getValue()
      }),
    })), [columns]);
    
    const table = useReactTable({
      data,
      columns: tableColumns,
      getCoreRowModel: getCoreRowModel()
    });

    return e('table', { className: 'table table-hover table-sm' }, [
      e('thead', { key: 'head' },
        table.getHeaderGroups().map(hg =>
          e('tr', { key: hg.id },
            hg.headers.map(h =>
              e('th', { key: h.id },
                flexRender(h.column.columnDef.header, h.getContext())
              )
            )
          )
        )
      ),
      e('tbody', { key: 'body' },
        table.getRowModel().rows.map(row =>
          e('tr', {
            key: row.id,
            className: 'cursor-pointer',
            onClick: () => app.handleRun({
              operation: 'select',
              doctype: doctype,
              args: { where: { name: row.original.name } }
            })
          },
            row.getVisibleCells().map(cell =>
              e('td', { key: cell.id },
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )
            )
          )
        )
      )
    ]);
  };

  // Layout components
  pb.ui.Container = props => e('div', { className: 'container-fluid p-4' }, props.children);
  pb.ui.Title = props => e('h2', { className: 'mb-4' }, props.text || props.children);
  pb.ui.Alert = props => e('div', { className: 'alert alert-info' }, props.message || props.children);
  pb.ui.Error = props => e('div', { className: 'alert alert-danger' }, `Error: ${props.message || props.children}`);
  pb.ui.Pre = props => e('pre', { className: 'bg-light p-3 rounded' }, JSON.stringify(props.data, null, 2));
  pb.ui.Button = props => e('button', {
    className: `btn ${props.className || 'btn-primary'}`,
    onClick: props.onClick
  }, props.text || props.children);
  pb.ui.ButtonGroup = props => e('div', { className: 'btn-group' }, props.children);

  // ============================================================================
  // PART 2: VIEW COMPONENTS (Render coworker results)
  // ============================================================================
  
  const ListView = ({ doctype, data, schema }) => {
    if (!data || data.length === 0) {
      return e(pb.ui.Container, {}, [
        e(pb.ui.Title, { key: 'title', text: doctype }),
        e(pb.ui.Alert, { key: 'alert', message: `No ${doctype} found.` }),
        e(pb.ui.Button, {
          key: 'back',
          className: 'btn-secondary',
          onClick: () => app.handleRun({ operation: 'navigate', view: 'home' }),
          text: '← Back'
        })
      ]);
    }

    const columns = schema.fields
      .filter(f => f.in_list_view)
      .map(field => ({
        header: field.label,
        accessorKey: field.fieldname,
        field: field
      }));

    return e(pb.ui.Container, {}, [
      e(pb.ui.Title, { key: 'title', text: doctype }),
      e(pb.ui.Table, {
        key: 'table',
        data: data,
        columns: columns,
        doctype: doctype
      })
    ]);
  };

  const FormView = ({ doctype, data, schema }) => {
    const doc = Array.isArray(data) ? data[0] : data;
    
    return e(pb.ui.Container, {}, [
      e(pb.ui.Title, { key: 'title', text: `${doctype}: ${doc.name}` }),
      e(pb.ui.Pre, { key: 'data', data: doc }),
      e(pb.ui.Button, {
        key: 'back',
        className: 'btn-secondary mt-3',
        onClick: () => app.handleRun({ operation: 'select', doctype: doctype }),
        text: '← Back to List'
      })
    ]);
  };

  const HomeView = () => {
    return e(pb.ui.Container, {}, [
      e(pb.ui.Title, { key: 'title', text: 'Choose a DocType' }),
      e(pb.ui.ButtonGroup, { key: 'buttons' }, [
        e(pb.ui.Button, {
          key: 'tasks',
          onClick: () => app.handleRun({ operation: 'select', doctype: 'Task' }),
          text: '📋 Tasks'
        }),
        e(pb.ui.Button, {
          key: 'projects',
          className: 'btn-info',
          onClick: () => app.handleRun({ operation: 'select', doctype: 'Project' }),
          text: '🏗️ Projects'
        })
      ])
    ]);
  };

  // ============================================================================
  // PART 3: MAIN APP COMPONENT (Dumb Renderer)
  // ============================================================================
  
  const App = () => {
    const [state, setState] = React.useState({ view: 'home' });
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    // Single execution point - coworker.run() controls everything
// In app-simple.js, update app.handleRun

app.handleRun = async (config) => {
  setIsLoading(true);
  setError(null);
  
  try {
    const result = await coworker.run(config);
    
    if (result.success) {
      console.log('📦 coworker.run() returned:', result);
      
      let output = result.output || result;
      
      // Extract view from viewConfig if it exists
      if (output.viewConfig?.view && !output.view) {
        output.view = output.viewConfig.view;
      }
      
      // Fallback: determine view if still not provided
      if (!output.view) {
        if (output.data && output.schema) {
          if (Array.isArray(output.data)) {
            if (output.data.length === 1 && config.args?.where?.name) {
              output.view = 'form';
            } else {
              output.view = 'list';
            }
          }
        } else if (config.operation === 'navigate') {
          output.view = config.view || 'home';
        } else {
          output.view = 'home';
        }
      }
      
      console.log('🎯 Final view:', output.view);
      setState(output);
    } else {
      throw new Error(result.error?.message || 'Operation failed');
    }
  } catch (err) {
    console.error('❌ Error in app.handleRun:', err);
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

    // Render current state
    if (isLoading) {
      return e(pb.ui.Alert, { message: 'Loading...' });
    }

    if (error) {
      return e(pb.ui.Container, {}, [
        e(pb.ui.Error, { key: 'error', message: error }),
        e(pb.ui.Button, {
          key: 'back',
          className: 'btn-secondary mt-3',
          onClick: () => app.handleRun({ operation: 'navigate', view: 'home' }),
          text: '← Back to Home'
        })
      ]);
    }

    // Simple switch based on what coworker returned
    switch (state.view) {
      case 'home':
        return e(HomeView);
      case 'list':
        return e(ListView, {
          doctype: state.doctype,
          data: state.data,
          schema: state.schema
        });
      case 'form':
        return e(FormView, {
          doctype: state.doctype,
          data: state.data,
          schema: state.schema
        });
      default:
        return e(pb.ui.Error, { message: `Unknown view type: ${state.view}` });
    }
  };

  // ============================================================================
  // PART 4: APP INITIALIZATION
  // ============================================================================
  
  function initApp() {
    const rootElement = document.getElementById("app");
    if (!rootElement) {
      console.error("❌ App root #app not found!");
      return;
    }
    const root = ReactDOM.createRoot(rootElement);
    root.render(e(App));
    console.log("✅ App mounted (Pure coworker Architecture)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();