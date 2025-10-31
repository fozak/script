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

    // ✅ Subscribe to CoworkerState
    useEffect(() => {
      const unsubscribe = CoworkerState.subscribe((state) => {
        setCurrentRun(state.currentRun);
        setIsLoading(state.isLoading);

        if (state.currentRun && state.currentRun.data) {
          const isSingleItem =
            state.currentRun.data.length === 1 && 
            state.currentRun.params?.query?.take === 1;
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
          {
            key: "header",
            className: "navbar navbar-light bg-light mb-4",
          },
          e(
            "div",
            {
              className:
                "container-fluid d-flex justify-content-between align-items-center",
            },
            [
              e(
                "span",
                { key: "brand", className: "navbar-brand" },
                "🚀 Coworker App"
              ),
              e(pb.components.UniversalSearchInput, { key: "search" }),
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
              e("h1", { className: "mb-4" }, "Choose a DocType"),
              e("div", { className: "btn-group" }, [
                e(
                  "button",
                  {
                    key: "task",
                    className: "btn btn-primary",
                    onClick: () => nav.list("Task"),
                  },
                  "📋 Tasks"
                ),
                e(
                  "button",
                  {
                    key: "user",
                    className: "btn btn-success",
                    onClick: () => nav.list("User"),
                  },
                  "👤 Users"
                ),
                e(
                  "button",
                  {
                    key: "customer",
                    className: "btn btn-info",
                    onClick: () => nav.list("Customer"),
                  },
                  "🏢 Customers"
                ),
              ])
            )
          )
        ),
      ]);
    }

    // Main view with persistent search in header
    return e("div", { className: "container-fluid" }, [
      // Header with breadcrumbs and search
      e(
        "nav",
        {
          key: "header",
          className: "navbar navbar-light bg-light mb-4",
        },
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
                    window.location.href = window.location.pathname;
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
                  className:
                    "breadcrumb-item" + (view === "list" ? " active" : ""),
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
              e(
                "li",
                {
                  key: "item",
                  className: "breadcrumb-item active",
                },
                currentRun.data[0].name
              ),
          ]),

          // Universal search (always visible)
          e(
            "div",
            { key: "search", className: "flex-grow-1 mx-3" },
            e(pb.components.UniversalSearchInput, {})
          ),

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
                e(
                  "div",
                  { className: "card-header" },
                  e("h3", null, currentRun.data[0]?.name || "Item View")
                ),
                e(
                  "div",
                  { className: "card-body" },
                  e(
                    "pre",
                    { className: "bg-light p-3" },
                    JSON.stringify(currentRun.data[0], null, 2)
                  ),
                  e(
                    "button",
                    {
                      className: "btn btn-secondary mt-3",
                      onClick: () => nav.list(currentRun.params.doctype),
                    },
                    "⬅️ Back to List"
                  )
                )
              )
        )
      ),
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

    console.log("✅ Mounting app");
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));

    // Test shortcuts
    window.testNav = {
      tasks: () => nav.list("Task"),
      users: () => nav.list("User"),
      customers: () => nav.list("Customer"),
      back: () => nav.back(),
      refresh: () => nav.refresh(),
    };

    console.log("✅ App mounted. Try: testNav.tasks()");
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
