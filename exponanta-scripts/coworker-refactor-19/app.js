// ============================================================================
// app.js - Refactored to use coworker.run() and CoworkerState
// Version: 2.0.0
// ============================================================================

(function () {
  "use strict";

  console.log("🚀 Initializing application...");

  // Create namespace for components (keep compatibility)
  if (!window.pb) window.pb = {};
  if (!window.pb.components) pb.components = {};

  // ============================================================================
  // UNIVERSAL SEARCH INPUT (Refactored with coworker.run)
  // ============================================================================

  pb.components.UniversalSearchInput = function () {
    const { createElement: e, useState, useEffect, useRef } = React;
    const [searchText, setSearchText] = useState("");
    const [results, setResults] = useState([]);
    const [doctypes, setDoctypes] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // ✅ Get unique doctypes using coworker.run (cached globally)
  // ✅ Get unique doctypes using coworker.run (cached globally)
useEffect(() => {
  // If cached, reuse
  if (window.__DISCOVERED_DOCTYPES) {
    setDoctypes(window.__DISCOVERED_DOCTYPES);
    return;
  }

  // First-time fetch using coworker.run
  coworker.run({
    operation: 'select',
    doctype: 'All',
    input: {},
    options: { includeSchema: false }
  })
    .then((result) => {
      if (result.success && result.output?.data) {
        // ✅ FIX: Filter out null/undefined items AND null doctypes
        const uniqueDoctypes = [
          ...new Set(
            result.output.data
              .filter(item => item && item.doctype)  // ← Filter nulls
              .map(item => item.doctype)
          )
        ].sort();

        console.log("✅ Discovered doctypes:", uniqueDoctypes);
        console.log(`   Found ${uniqueDoctypes.length} types from ${result.output.data.length} records`);

        // Cache globally
        window.__DISCOVERED_DOCTYPES = uniqueDoctypes;
        setDoctypes(uniqueDoctypes);
      }
    })
    .catch((err) => {
      console.error("Failed to load doctypes:", err);
    });
}, []);

    // Close dropdown on outside click
    useEffect(() => {
      function handleClickOutside(event) {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
          setShowDropdown(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ✅ Search function using coworker.run
    const performSearch = async (text) => {
      if (text.length < 2 || doctypes.length === 0) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);

      try {
        const searchPromises = doctypes.map(async (doctype) => {
          try {
            const result = await coworker.run({
              operation: 'select',
              doctype: doctype,
              input: {
                where: { name: { contains: text } },
                take: 5
              },
              options: { includeSchema: false }
            });
            return result.success && result.output?.data ? result.output.data : [];
          } catch (error) {
            return [];
          }
        });

        const allResults = await Promise.all(searchPromises);
        setResults(allResults.flat());
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounced search
    useEffect(() => {
      const timer = setTimeout(() => performSearch(searchText), 300);
      return () => clearTimeout(timer);
    }, [searchText, doctypes]);

    const handleResultClick = (result) => {
      nav.item(result.name, result.doctype);
      setShowDropdown(false);
      setSearchText("");
    };

    return e(
      "div",
      {
        ref: searchRef,
        className: "position-relative",
        style: { minWidth: "300px", maxWidth: "400px" },
      },
      [
        e("input", {
          key: "input",
          type: "text",
          className: "form-control form-control-sm",
          placeholder: `🔍 Search ${doctypes.length} types...`,
          value: searchText,
          onChange: (ev) => setSearchText(ev.target.value),
          onFocus: () => searchText.length >= 2 && setShowDropdown(true),
          disabled: doctypes.length === 0,
        }),

        showDropdown &&
          e(
            "div",
            {
              key: "dropdown",
              className:
                "position-absolute w-100 mt-1 bg-white border rounded shadow-lg",
              style: { maxHeight: "300px", overflowY: "auto", zIndex: 1050 },
            },
            [
              isSearching &&
                e(
                  "div",
                  {
                    key: "loading",
                    className: "p-2 text-center text-muted small",
                  },
                  "Searching..."
                ),

              !isSearching &&
                results.length === 0 &&
                searchText.length >= 2 &&
                e(
                  "div",
                  {
                    key: "empty",
                    className: "p-2 text-center text-muted small",
                  },
                  "No results found"
                ),

              !isSearching &&
                results.length > 0 &&
                e(
                  "div",
                  { key: "results" },
                  results.map((result, idx) =>
                    e(
                      "div",
                      {
                        key: `${result.doctype}-${result.name}-${idx}`,
                        className: "px-3 py-2 border-bottom",
                        style: { cursor: "pointer" },
                        onClick: () => handleResultClick(result),
                        onMouseEnter: (ev) =>
                          (ev.currentTarget.style.backgroundColor = "#f8f9fa"),
                        onMouseLeave: (ev) =>
                          (ev.currentTarget.style.backgroundColor = "white"),
                      },
                      [
                        e(
                          "div",
                          { key: "name", className: "fw-bold small" },
                          result.name
                        ),
                        e(
                          "small",
                          { key: "meta", className: "text-muted" },
                          `${result.doctype}${
                            result.status ? ` • ${result.status}` : ""
                          }`
                        ),
                      ]
                    )
                  )
                ),
            ]
          ),
      ]
    );
  };

  // ============================================================================
  // MAIN GRID (Refactored with CoworkerState)
  // ============================================================================

  pb.components.MainGrid = function ({ doctype }) {
    const { createElement: e, useState, useEffect } = React;
    const [currentRun, setCurrentRun] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // ✅ Subscribe to CoworkerState
    useEffect(() => {
      const unsubscribe = CoworkerState.subscribe((state) => {
        setCurrentRun(state.currentRun);
        setIsLoading(state.isLoading);
      });
      return unsubscribe;
    }, []);

    // Navigate to doctype if not current
    useEffect(() => {
      const current = CoworkerState.getCurrent();
      if (!current || current.params?.doctype !== doctype) {
        nav.list(doctype);
      }
    }, [doctype]);

    if (isLoading) {
      return e("div", { className: "p-4 text-center" }, "Loading...");
    }

    if (!currentRun) {
      return e("div", { className: "p-4" }, "No data");
    }

    const { data, schema } = currentRun;

    if (!schema) {
      return e("div", { className: "p-4 text-danger" }, "Schema not found");
    }

    if (!data || data.length === 0) {
      return e(
        "div",
        { className: "alert alert-info m-3" },
        `No ${doctype} records found. Use search above to find items.`
      );
    }

    const columns = Object.keys(data[0]).map((key) => ({
      accessorKey: key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      cell: ({ getValue, row }) => {
        const value = getValue();

        if (key === "name") {
          return e(
            pb.components.DocLink,
            {
              doctype: row.original.doctype,
              name: value,
            },
            value
          );
        }

        const schemaField = schema.fields?.find((f) => f.fieldname === key);
        if (schemaField) {
          const rendered = pb.renderField(schemaField, value, row.original);
          return e("span", {
            dangerouslySetInnerHTML: { __html: rendered },
          });
        }

        return value;
      },
    }));

    return e(pb.components.BaseTable, { data, columns });
  };

  // ============================================================================
  // APP COMPONENT (Refactored with CoworkerState)
  // ============================================================================

  const App = function () {
    const { createElement: e, useState, useEffect } = React;
    const [currentRun, setCurrentRun] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState("list");
    const [showChatSidebar, setShowChatSidebar] = useState(false);

    // ✅ Subscribe to CoworkerState v2.0
    useEffect(() => {
      const unsubscribe = CoworkerState.subscribe((snapshot) => {
        setCurrentRun(snapshot.currentRun);
        setIsLoading(snapshot.isLoading);

        if (snapshot.currentRun && snapshot.currentRun.data) {
          const isSingleItem =
            snapshot.currentRun.data.length === 1 && 
            snapshot.currentRun.params?.query?.take === 1;
          setView(isSingleItem ? "form" : "list");
        }
      });

      return unsubscribe;
    }, []);

    // ... rest of your App component code

    // Add chat toggle button to header
    const chatToggleButton = e(
      "button",
      {
        key: "chat",
        className: "btn btn-outline-info btn-sm",
        onClick: () => setShowChatSidebar(!showChatSidebar)
      },
      `💬 AI ${showChatSidebar ? '→' : '←'}`
    );

    return e("div", { className: "container-fluid" }, [
      // ... your existing header/nav code
      
      // ... your existing content code
      
      // ✅ Add dialog overlay (from pb.components)
      e(pb.components.DialogOverlay, { key: "dialogs" }),
      
      // ✅ Add chat sidebar (from pb.components)
      e(pb.components.ChatSidebar, { 
        key: "chat",
        isOpen: showChatSidebar,
        onToggle: () => setShowChatSidebar(!showChatSidebar)
      })
    ]);
  };

  // ============================================================================
  // INIT
  // ============================================================================

  function initApp() {
    const container = document.getElementById("app");
    if (!container) {
      console.error("❌ Missing #app container");
      return;
    }

    if (typeof coworker === 'undefined' || typeof CoworkerState === 'undefined') {
      console.error("❌ Missing coworker or CoworkerState");
      return;
    }

    console.log("✅ Mounting app v2.0");
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));

    // Test shortcuts
    window.testNav = {
      tasks: () => nav.list("Task"),
      users: () => nav.list("User"),
      customers: () => nav.list("Customer"),
      back: () => nav.back(),
      refresh: () => nav.refresh(),
      
      // ✅ Test dialog types
      testConfirm: () => {
        CoworkerState._updateFromRun({
          id: 'dialog-confirm-' + Date.now(),
          operation: 'dialog',
          status: 'running',
          input: {
            type: 'confirm',
            title: 'Confirm Action',
            message: 'Are you sure you want to proceed?'
          }
        });
      },
      
      testPrompt: () => {
        CoworkerState._updateFromRun({
          id: 'dialog-prompt-' + Date.now(),
          operation: 'dialog',
          status: 'running',
          input: {
            type: 'prompt',
            title: 'Enter Name',
            message: 'What is your name?',
            placeholder: 'John Doe'
          }
        });
      },
      
      testDestructive: () => {
        CoworkerState._updateFromRun({
          id: 'dialog-delete-' + Date.now(),
          operation: 'dialog',
          status: 'running',
          input: {
            type: 'confirm',
            title: 'Delete Item',
            message: 'This action cannot be undone!',
            buttons: ['Cancel', 'Delete'],
            destructive: true
          }
        });
      },
      
      // ✅ Test AI pipeline
      testAIPipeline: () => {
        const rootId = 'pipeline-' + Date.now();
        
        // Step 1: Dialog
        CoworkerState._updateFromRun({
          id: rootId,
          operation: 'dialog',
          status: 'running',
          input: {
            type: 'prompt',
            title: 'Create Task',
            message: 'What task do you want to create?'
          }
        });
        
        // Step 2: AI interpret (simulated)
        setTimeout(() => {
          CoworkerState._updateFromRun({
            id: rootId + '-interpret',
            operation: 'interpret',
            status: 'running',
            parentRun: rootId,
            output: { tokens: [] }
          });
          
          // Simulate token streaming
          let tokenCount = 0;
          const tokenInterval = setInterval(() => {
            tokenCount++;
            const run = CoworkerState.getActiveRun(rootId + '-interpret');
            if (run && tokenCount < 20) {
              CoworkerState.updateRunField(
                rootId + '-interpret',
                'output.tokens',
                [...(run.output?.tokens || []), `token-${tokenCount}`]
              );
            } else {
              clearInterval(tokenInterval);
              // Complete interpret
              CoworkerState._updateFromRun({
                id: rootId + '-interpret',
                operation: 'interpret',
                status: 'completed',
                parentRun: rootId,
                output: { 
                  tokens: run?.output?.tokens || [],
                  taskData: { subject: 'AI Generated Task', priority: 'High' }
                }
              });
              
              // Step 3: Create task
              setTimeout(() => {
                CoworkerState._updateFromRun({
                  id: rootId + '-create',
                  operation: 'create',
                  doctype: 'Task',
                  status: 'completed',
                  parentRun: rootId + '-interpret',
                  output: { name: 'TASK-001', subject: 'AI Generated Task' }
                });
              }, 500);
            }
          }, 100);
        }, 2000);
      }
    };

    console.log("✅ App mounted v2.0");
    console.log("   Try: testNav.testConfirm()");
    console.log("   Try: testNav.testPrompt()");
    console.log("   Try: testNav.testDestructive()");
    console.log("   Try: testNav.testAIPipeline()");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();

// ============================================================================
// END OF APP.JS
// ============================================================================
