// ============================================================================
// app.js - Main Application (Refactored v2.0)
// Version: 2.0.0
// ============================================================================

(function () {
  "use strict";

  console.log("🚀 Initializing application v2.0...");

  // Create namespace for components (keep compatibility)
  if (!window.pb) window.pb = {};
  if (!window.pb.components) pb.components = {};

  // ============================================================================
  // UNIVERSAL SEARCH INPUT
  // ============================================================================

  pb.components.UniversalSearchInput = function () {
    const { createElement: e, useState, useEffect, useRef } = React;
    const [searchText, setSearchText] = useState("");
    const [results, setResults] = useState([]);
    const [doctypes, setDoctypes] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // Get unique doctypes using coworker.run (cached globally)
    useEffect(() => {
      if (window.__DISCOVERED_DOCTYPES) {
        setDoctypes(window.__DISCOVERED_DOCTYPES);
        return;
      }

      coworker.run({
        operation: 'select',
        doctype: 'All',
        input: {},
        options: { includeSchema: false }
      })
        .then((result) => {
          if (result.success && result.output?.data) {
            const uniqueDoctypes = [
              ...new Set(
                result.output.data
                  .filter(item => item && item.doctype)
                  .map(item => item.doctype)
              )
            ].sort();

            console.log("✅ Discovered doctypes:", uniqueDoctypes);
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
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search function using coworker.run
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
              className: "position-absolute w-100 mt-1 bg-white border rounded shadow-lg",
              style: { maxHeight: "300px", overflowY: "auto", zIndex: 1050 },
            },
            [
              isSearching &&
                e("div", { key: "loading", className: "p-2 text-center text-muted small" }, "Searching..."),

              !isSearching && results.length === 0 && searchText.length >= 2 &&
                e("div", { key: "empty", className: "p-2 text-center text-muted small" }, "No results found"),

              !isSearching && results.length > 0 &&
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
                        onMouseEnter: (ev) => (ev.currentTarget.style.backgroundColor = "#f8f9fa"),
                        onMouseLeave: (ev) => (ev.currentTarget.style.backgroundColor = "white"),
                      },
                      [
                        e("div", { key: "name", className: "fw-bold small" }, result.name),
                        e("small", { key: "meta", className: "text-muted" },
                          `${result.doctype}${result.status ? ` • ${result.status}` : ""}`
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
  // APP COMPONENT (Main Application)
  // ============================================================================

  const App = function () {
    const { createElement: e, useState, useEffect } = React;
    const [currentRun, setCurrentRun] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState("list");
    const [showChatSidebar, setShowChatSidebar] = useState(false);

    // ✅ Subscribe to CoworkerState v2.0 with pre-computed views
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

    // Loading state
    if (isLoading) {
      return e(
        "div",
        { className: "container mt-5 text-center" },
        e("div", { className: "spinner-border text-primary" }),
        e("p", { className: "mt-3" }, "Loading...")
      );
    }

    // Home state
    if (!currentRun) {
      return e("div", { className: "container-fluid" }, [
        // Header with search
        e(
          "nav",
          { key: "header", className: "navbar navbar-light bg-light mb-4" },
          e(
            "div",
            { className: "container-fluid d-flex justify-content-between align-items-center" },
            [
              e("span", { key: "brand", className: "navbar-brand" }, "🚀 Coworker App v2.0"),
              e(pb.components.UniversalSearchInput, { key: "search" }),
              // Chat button on home page
              e(
                "button",
                {
                  key: "chat",
                  className: `btn btn-sm ${showChatSidebar ? 'btn-info' : 'btn-outline-info'}`,
                  onClick: () => setShowChatSidebar(!showChatSidebar),
                },
                `💬 Chat ${showChatSidebar ? '→' : '←'}`
              ),
            ]
          )
        ),

        // Home content
        e(
          "div",
          { key: "content", className: "container mt-5" },
          e(
            "div",
            { className: "card" },
            e(
              "div",
              { className: "card-body text-center" },
              [
                e("h1", { key: "title", className: "mb-4" }, "Choose a DocType"),
                e("div", { key: "buttons", className: "btn-group" }, [
                  e("button", { key: "task", className: "btn btn-primary", onClick: () => nav.list("Task") }, "📋 Tasks"),
                  e("button", { key: "user", className: "btn btn-success", onClick: () => nav.list("User") }, "👤 Users"),
                  e("button", { key: "customer", className: "btn btn-info", onClick: () => nav.list("Customer") }, "🏢 Customers"),
                ]),
              ]
            )
          )
        ),

        // Dialog overlay (always rendered)
        e(pb.components.DialogOverlay, { key: "dialogs" }),
        
        // Chat sidebar (always rendered)
        e(pb.components.ChatSidebar, { 
          key: "chat",
          isOpen: showChatSidebar,
          onToggle: () => setShowChatSidebar(!showChatSidebar)
        }),
      ]);
    }

    // Main view with persistent search in header
    return e("div", { className: "container-fluid" }, [
      // Header with breadcrumbs and search
      e(
        "nav",
        { key: "header", className: "navbar navbar-light bg-light mb-4" },
        e("div", { className: "container-fluid" }, [
          // Breadcrumbs
          e("ol", { key: "breadcrumb", className: "breadcrumb mb-0 me-3" }, [
            e(
              "li",
              { key: "home", className: "breadcrumb-item" },
              e(
                "a",
                {
                  href: "#",
                  onClick: (ev) => {
                    ev.preventDefault();
                    nav.home();
                  },
                },
                "Home"
              )
            ),
            currentRun.params?.doctype &&
              e(
                "li",
                {
                  key: "doctype",
                  className: "breadcrumb-item" + (view === "list" ? " active" : ""),
                },
                view === "list"
                  ? currentRun.params.doctype
                  : e(
                      "a",
                      {
                        href: "#",
                        onClick: (ev) => {
                          ev.preventDefault();
                          nav.list(currentRun.params.doctype);
                        },
                      },
                      currentRun.params.doctype
                    )
              ),
            view === "form" &&
              currentRun.data &&
              currentRun.data[0] &&
              e("li", { key: "item", className: "breadcrumb-item active" }, currentRun.data[0].name),
          ]),

          // Universal search (always visible)
          e("div", { key: "search", className: "flex-grow-1 mx-3" }, e(pb.components.UniversalSearchInput, {})),

          // Navigation buttons
          e("div", { key: "nav", className: "btn-group btn-group-sm" }, [
            e(
              "button",
              {
                key: "back",
                className: "btn btn-outline-secondary",
                onClick: () => nav.back(),
                disabled: !CoworkerState.canGoBack(),
              },
              "⬅️"
            ),
            e(
              "button",
              {
                key: "refresh",
                className: "btn btn-outline-primary",
                onClick: () => nav.refresh(),
              },
              "🔄"
            ),
            e(
              "button",
              {
                key: "chat",
                className: `btn ${showChatSidebar ? 'btn-info' : 'btn-outline-info'}`,
                onClick: () => setShowChatSidebar(!showChatSidebar),
              },
              `💬 ${showChatSidebar ? '→' : '←'}`
            ),
          ]),
        ])
      ),

      // Content
      e(
        "div",
        { key: "content", className: "row" },
        e(
          "div",
          { className: "col" },
          view === "list"
            ? e(pb.components.MainGrid, { doctype: currentRun.params.doctype })
            : e(
                "div",
                { className: "card m-3" },
                [
                  e("div", { key: "header", className: "card-header" },
                    e("h3", {}, currentRun.data[0]?.name || "Item View")
                  ),
                  e("div", { key: "body", className: "card-body" }, [
                    e("pre", { key: "data", className: "bg-light p-3" },
                      JSON.stringify(currentRun.data[0], null, 2)
                    ),
                    e(
                      "button",
                      {
                        key: "back",
                        className: "btn btn-secondary mt-3",
                        onClick: () => nav.list(currentRun.params.doctype),
                      },
                      "⬅️ Back to List"
                    ),
                  ]),
                ]
              )
        )
      ),

      // Dialog overlay (always rendered)
      e(pb.components.DialogOverlay, { key: "dialogs" }),
      
      // Chat sidebar (always rendered)
      e(pb.components.ChatSidebar, { 
        key: "chat",
        isOpen: showChatSidebar,
        onToggle: () => setShowChatSidebar(!showChatSidebar)
      }),
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
      home: () => nav.home(),
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
    console.log("   Try: testNav.tasks()");
    console.log("   Try: testNav.home()");
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