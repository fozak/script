// ============================================================================
// app-simple.js - Main Application (Clean coworker.run() Architecture)
// ============================================================================
(function () {
  "use strict";

  console.log("🚀 Initializing application (Simple Architecture)...");

  if (!window.pb) window.pb = {};
  window.pb.ui = {};
  window.app = {};

  const e = React.createElement;

  // ============================================================================
  // PART 1: UI PRIMITIVES (Pure Components)
  // ============================================================================
  
  pb.ui.FieldDisplay = ({ field, value, onClick }) => {
    if (value == null || value === '') return null;
    
    if (field.fieldtype === 'Link' && field.options && onClick) {
      return e('a', {
        href: '#',
        className: 'text-primary fw-bold',
        onClick: (ev) => {
          ev.preventDefault();
          onClick(field.options, value);
        }
      }, value);
    }
    
    return String(value);
  };

  pb.ui.Table = ({ data, columns, onRowClick }) => {
    const { useReactTable, getCoreRowModel, flexRender } = window.TanStackTable;
    
    const tableColumns = React.useMemo(() => columns.map(col => ({
      accessorKey: col.accessorKey,
      header: col.header,
      cell: info => e(pb.ui.FieldDisplay, {
        field: col.field,
        value: info.getValue(),
        onClick: (doctype, name) => app.navigateToForm(doctype, name)
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
            onClick: () => onRowClick && onRowClick(row.original)
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
  // PART 2: VIEW COMPONENTS (Direct React)
  // ============================================================================
  
  const ListView = ({ doctype, data, schema }) => {
    if (!data || data.length === 0) {
      return e(pb.ui.Container, {}, [
        e(pb.ui.Title, { key: 'title', text: doctype }),
        e(pb.ui.Alert, { key: 'alert', message: `No ${doctype} found.` }),
        e(pb.ui.Button, {
          key: 'back',
          className: 'btn-secondary',
          onClick: () => app.navigateToHome(),
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
        onRowClick: (row) => app.navigateToForm(doctype, row.name)
      })
    ]);
  };

  const FormView = ({ doctype, doc, schema }) => {
    return e(pb.ui.Container, {}, [
      e(pb.ui.Title, { key: 'title', text: `${doctype}: ${doc.name}` }),
      e(pb.ui.Pre, { key: 'data', data: doc }),
      e(pb.ui.Button, {
        key: 'back',
        className: 'btn-secondary mt-3',
        onClick: () => app.navigateToList(doctype),
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
          onClick: () => app.navigateToList('Task'),
          text: '📋 Tasks'
        }),
        e(pb.ui.Button, {
          key: 'projects',
          className: 'btn-info',
          onClick: () => app.navigateToList('Project'),
          text: '🏗️ Projects'
        })
      ])
    ]);
  };

  // ============================================================================
  // PART 3: MAIN APP COMPONENT
  // ============================================================================
  
  const App = () => {
    const [view, setView] = React.useState({ type: 'home' });
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    // Navigation functions
    app.navigateToHome = () => {
      setView({ type: 'home' });
      setError(null);
    };

    app.navigateToList = async (doctype) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await coworker.run({
          operation: 'select',
          doctype: doctype
        });

        if (result.success) {
          setView({
            type: 'list',
            doctype: doctype,
            data: result.output.data,
            schema: result.output.schema
          });
        } else {
          throw new Error(result.error?.message || 'Failed to load list');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    app.navigateToForm = async (doctype, name) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await coworker.run({
          operation: 'select',
          doctype: doctype,
          args: { where: { name: name }, take: 1 }
        });

        if (result.success && result.output.data.length > 0) {
          setView({
            type: 'form',
            doctype: doctype,
            doc: result.output.data[0],
            schema: result.output.schema
          });
        } else {
          throw new Error('Record not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Render current view
    if (isLoading) {
      return e(pb.ui.Alert, { message: 'Loading...' });
    }

    if (error) {
      return e(pb.ui.Container, {}, [
        e(pb.ui.Error, { key: 'error', message: error }),
        e(pb.ui.Button, {
          key: 'back',
          className: 'btn-secondary mt-3',
          onClick: () => app.navigateToHome(),
          text: '← Back to Home'
        })
      ]);
    }

    switch (view.type) {
      case 'home':
        return e(HomeView);
      case 'list':
        return e(ListView, {
          doctype: view.doctype,
          data: view.data,
          schema: view.schema
        });
      case 'form':
        return e(FormView, {
          doctype: view.doctype,
          doc: view.doc,
          schema: view.schema
        });
      default:
        return e(pb.ui.Error, { message: 'Unknown view type' });
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
    console.log("✅ App mounted (Simple Architecture)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();