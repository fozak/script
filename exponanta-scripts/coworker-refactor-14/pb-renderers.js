// pb-renderers.js - Field Renderers

pb.fieldRenderers = {
  
  // ============================================================================
  // LINK FIELD - Navigates using pb.nav.item()
  // ============================================================================
  
  Link: function(field, value, record) {
    if (!value) return '';
    
    const linkDoctype = field.options; // e.g., "Customer"
    
    // Build clickable link that uses pb.nav
    return `<a href="#" 
               data-doctype="${linkDoctype}"
               data-name="${value}"
               onclick="event.preventDefault(); pb.nav.item('${value}', '${linkDoctype}'); return false;"
               class="${pb.BS.text.primary} hover:underline">
              ${value}
            </a>`;
  },
  
  // ============================================================================
  // DYNAMIC LINK FIELD - Gets doctype from another field
  // ============================================================================
  
  DynamicLink: function(field, value, record) {
    if (!value) return '';
    
    // Get the doctype from the specified link field
    const linkDoctype = record.data[field.link_field];
    if (!linkDoctype) return value;
    
    return `<a href="#" 
               data-doctype="${linkDoctype}"
               data-name="${value}"
               onclick="event.preventDefault(); pb.nav.item('${value}', '${linkDoctype}'); return false;"
               class="${pb.BS.text.primary} hover:underline">
              ${value}
            </a>`;
  },
  
  // Other renderers...
  Data: function(field, value) { 
    return value || ''; 
  },
  
  Check: function(field, value) { 
    return value ? '✓' : ''; 
  },
  
  Date: function(field, value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
  },
  
  Select: function(field, value) {
    return value || '';
  }
};

pb.renderField = function(field, value, record) {
  const renderer = pb.fieldRenderers[field.fieldtype] || pb.fieldRenderers.Data;
  return renderer(field, value, record);
};