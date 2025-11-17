// ============================================================
// COWORKER UTILS - Helper Functions
// ============================================================

// ============================================================
// PARSE LAYOUT
// ============================================================
function parseLayout(field_order, fields) {
  if (!field_order || !fields) {
    return {
      type: 'container',
      className: 'form.wrapper',
      children: []
    };
  }

  const sections = [];
  let currentSection = null;
  let currentColumn = null;

  field_order.forEach(item => {
    if (item.fieldtype === 'Section Break') {
      currentSection = {
        type: 'container',
        className: 'form.section',
        label: item.label,
        children: []
      };
      sections.push(currentSection);
      currentColumn = null;
      
    } else if (item.fieldtype === 'Column Break') {
      if (currentSection) {
        currentColumn = {
          type: 'container',
          className: 'form.column',
          children: []
        };
        // Add to section's row (which will be created below)
        if (!currentSection.columns) currentSection.columns = [];
        currentSection.columns.push(currentColumn);
      }
      
    } else {
      // Regular field
      if (!item.fieldname || !fields[item.fieldname]) return;
      
      const fieldConfig = {
        type: 'field',
        field: fields[item.fieldname],
        fieldname: item.fieldname
      };
      
      // Add to current column or section
      if (currentColumn) {
        currentColumn.children.push(fieldConfig);
      } else if (currentSection) {
        if (!currentSection.directFields) currentSection.directFields = [];
        currentSection.directFields.push(fieldConfig);
      } else {
        // No section yet - create default section
        if (!sections.length) {
          currentSection = {
            type: 'container',
            className: 'form.section',
            children: []
          };
          sections.push(currentSection);
        }
        if (!sections[0].directFields) sections[0].directFields = [];
        sections[0].directFields.push(fieldConfig);
      }
    }
  });

  // Build final structure with rows
  return {
    type: 'container',
    className: 'form.wrapper',
    children: sections.map(section => {
      const children = [];
      
      // Add section label
      if (section.label) {
        children.push({
          type: 'heading',
          level: 3,
          className: 'form.sectionLabel',
          content: section.label
        });
      }
      
      // Build row with columns
      const rowChildren = [];
      
      // Add columns if they exist
      if (section.columns && section.columns.length) {
        rowChildren.push(...section.columns);
      } else if (section.directFields && section.directFields.length) {
        // No columns - wrap direct fields in single column
        rowChildren.push({
          type: 'container',
          className: 'form.column',
          children: section.directFields
        });
      }
      
      if (rowChildren.length) {
        children.push({
          type: 'container',
          className: 'form.row',
          children: rowChildren
        });
      }
      
      return {
        type: 'container',
        className: 'form.section',
        children: children
      };
    })
  };
}

// ============================================================
// GENERATE ID
// ============================================================
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// DEBOUNCE
// ============================================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================
// DEEP CLONE
// ============================================================
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}