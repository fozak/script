// ============================================================
// COWORKER RENDERER - Universal Rendering Engine
// ============================================================

// ============================================================
// ENRICH CONFIG
// ============================================================
coworker._enrichConfig = function(config, doc, doctype) {
  if (!config) return null;
  
  // Handle arrays
  if (Array.isArray(config)) {
    return config.map(item => this._enrichConfig(item, doc, doctype));
  }
  
  // Enrich field nodes
  if (config.type === 'field' && config.fieldname) {
    return {
      ...config,
      value: doc[config.fieldname],
      docname: doc.name,
      doctype: doctype
    };
  }
  
  // Recurse into children
  if (config.children) {
    return {
      ...config,
      children: this._enrichConfig(config.children, doc, doctype)
    };
  }
  
  return config;
};

// ============================================================
// RENDER FROM CONFIG
// ============================================================
coworker._renderFromConfig = function(config, parentStyles = window.CWStyles) {
  if (!config) return null;
  
  // Handle arrays
  if (Array.isArray(config)) {
    return config.map((item, i) => 
      this._renderFromConfig({ ...item, key: i }, parentStyles)
    );
  }
  
  const rule = this._config.render_map[config.type];
  if (!rule) {
    console.warn('Unknown config type:', config.type);
    return null;
  }
  
  // Handler delegation
  if (rule.handler) {
    return this[rule.handler]({ ...config, parentStyles });
  }
  
  // Element creation
  const element = typeof rule.element === 'function' 
    ? rule.element(config) 
    : rule.element;
    
  const { type, className, children, content, component, props, key, dangerouslySetInnerHTML, ...rest } = config;
  
  // Resolve className from CWStyles path (e.g., 'form.wrapper' → 'cw-form')
  const resolvedClass = className 
    ? className.split('.').reduce((obj, k) => obj?.[k], parentStyles)
    : null;
  
  const commonProps = { 
    className: resolvedClass, 
    key, 
    ...rest 
  };
  
  // Add dangerouslySetInnerHTML if present
  if (dangerouslySetInnerHTML) {
    commonProps.dangerouslySetInnerHTML = dangerouslySetInnerHTML;
  }
  
  return React.createElement(
    element,
    commonProps,
    content || (children && this._renderFromConfig(children, parentStyles))
  );
};

// ============================================================
// RENDER COMPONENT
// ============================================================
coworker._renderComponent = function({ component, props, parentStyles, key }) {
  const Comp = window[component];
  if (!Comp) {
    console.warn('Component not found:', component);
    return null;
  }
  
  return React.createElement(Comp, { key, ...props });
};

// ============================================================
// RENDER FIELD
// ============================================================
coworker._renderField = function({ field, value, docname, doctype, parentStyles }) {
  if (!field) return null;
  
  const config = this._config.field_handlers[field.fieldtype];
  if (!config) {
    console.warn('No handler for fieldtype:', field.fieldtype);
    return null;
  }
  
  // Custom handler
  if (config._handler) {
    const handler = this[config._handler];
    return handler?.({ field, value, docname, doctype, parentStyles });
  }
  
  // Standard component - return config
  return {
    type: 'container',
    className: 'form.fieldWrapper',
    children: [
      {
        type: 'label',
        className: 'form.label',
        content: field.label
      },
      {
        type: 'component',
        component: config.component,
        props: { field, value, docname, doctype }
      }
    ]
  };
};