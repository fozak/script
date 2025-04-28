/**
 * Trims unnecessary HTML elements and attributes, keeping only semantic information
 * Run this in your browser console when viewing the page with your HTML
 */
function trimHTMLForAI() {
    // Get all elements in the page
    const elements = document.querySelectorAll('*');
    
    // Attributes to keep (semantic ones)
    const keepAttributes = [
      'class', 'id', 'type', 'name', 'data-fieldtype', 
      'data-fieldname', 'data-target', 'data-doctype', 
      'placeholder', 'value', 'required', 'href'
    ];
    
    // Elements to clean up
    elements.forEach(el => {
      // Remove style attributes
      el.removeAttribute('style');
      
      // Remove aria attributes
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (attr.name.startsWith('aria-') || 
            attr.name.startsWith('role') || 
            attr.name.startsWith('autocomplete') || 
            attr.name.startsWith('maxlength') ||
            attr.name.startsWith('hidden')) {
          el.removeAttribute(attr.name);
          i--; // Adjust for removed attribute
        }
      }
      
      // Keep only useful attributes
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (!keepAttributes.includes(attr.name) && 
            !attr.name.startsWith('data-field')) { // Preserve data-field* attributes
          el.removeAttribute(attr.name);
          i--; // Adjust for removed attribute
        }
      }
      
      // Remove empty class attributes
      if (el.getAttribute('class') === '') {
        el.removeAttribute('class');
      }
      
      // Remove empty helper text
      if (el.classList.contains('help') && !el.textContent.trim()) {
        el.remove();
      }
      
      // Remove icons and SVGs
      if (el.tagName === 'SVG' || el.tagName === 'USE') {
        el.remove();
      }
      
      // Remove empty paragraphs and help boxes
      if (el.classList.contains('help-box') && !el.textContent.trim()) {
        el.remove();
      }
    });
    
    // Clean up empty divs that only contain whitespace
    document.querySelectorAll('div').forEach(div => {
      if (!div.textContent.trim() && !div.querySelector('input, select, textarea')) {
        div.remove();
      }
    });
    
    // Get the cleaned HTML
    const container = document.body; //document.querySelector('.form-column') || document.body;
    const cleanedHTML = container.outerHTML;
    
    // Output the cleaned HTML to console
    console.log(cleanedHTML);
    
    // Create a downloadable version
    const blob = new Blob([cleanedHTML], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned-html.html';
    a.click();
    
    return cleanedHTML;
  }
  
  // Execute the function
  trimHTMLForAI();