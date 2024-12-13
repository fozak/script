// Text Annotator Script
class TextAnnotator {
  constructor() {
    // Store notes in an array
    this.textNotes = [];
    
    // Create popup container
    this.popupContainer = document.createElement('div');
    this.popupContainer.style.cssText = `
      display: none;
      position: absolute;
      background-color: white;
      border: 1px solid #ccc;
      padding: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      width: 250px;
    `;
    
    // Create textarea for notes
    this.noteTextarea = document.createElement('textarea');
    this.noteTextarea.placeholder = 'Enter your note here...';
    this.noteTextarea.style.cssText = `
      width: 100%;
      height: 100px;
      margin-bottom: 10px;
      resize: vertical;
    `;
    
    // Create add note button
    this.addNoteButton = document.createElement('button');
    this.addNoteButton.textContent = 'Add Note';
    this.addNoteButton.style.cssText = `
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
    `;
    
    // Create close button
    this.closeButton = document.createElement('button');
    this.closeButton.textContent = '×';
    this.closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    `;
    
    // Setup event listeners
    this.init();
  }
  
  init() {
    // Append elements to popup container
    this.popupContainer.appendChild(this.closeButton);
    this.popupContainer.appendChild(this.noteTextarea);
    this.popupContainer.appendChild(this.addNoteButton);
    document.body.appendChild(this.popupContainer);
    
    // Add event listeners
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    this.closeButton.addEventListener('click', this.hidePopup.bind(this));
    this.addNoteButton.addEventListener('click', this.saveNote.bind(this));
  }
  
  handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Only show popup if text is selected
    if (selectedText) {
      // Get the range of the selection
      const range = selection.getRangeAt(0);
      
      // Get the bounding rectangle of the range, accounting for scroll
      const rect = range.getBoundingClientRect();
      
      // Calculate absolute positions accounting for scroll
      const scrollLeft = window.pageXOffset;
      const scrollTop = window.pageYOffset;
      
      const popupWidth = 300; // Fixed width of the popup
      const popupHeight = 250; // Estimated height of the popup
      
      // Calculate absolute left and top positions
      let left = scrollLeft + rect.right + 15;
      let top = scrollTop + rect.top;
      
      // Adjust if popup would go off the right edge of the screen
      if (left + popupWidth > scrollLeft + window.innerWidth) {
        left = scrollLeft + rect.left - popupWidth - 15;
      }
      
      // Adjust if popup would go below the screen
      if (top + popupHeight > scrollTop + window.innerHeight) {
        top = scrollTop + window.innerHeight - popupHeight - 20;
      }
      
      // Ensure top is not negative
      top = Math.max(scrollTop, top);
      
      // Apply styles
      this.popupContainer.style.position = 'absolute';
      this.popupContainer.style.display = 'block';
      this.popupContainer.style.left = `${left}px`;
      this.popupContainer.style.top = `${top}px`;
      this.popupContainer.style.width = `${popupWidth}px`;
      
      // Store the selected text for later use
      this.currentSelectedText = selectedText;
      
      // Populate textarea with selected text as default note
      this.noteTextarea.value = selectedText;
      
      // Focus on the textarea
      this.noteTextarea.focus();
      
      // Ensure popup is on top of other elements
      this.popupContainer.style.zIndex = '10000';
    }
  }
  
  saveNote() {
    const noteText = this.noteTextarea.value.trim();
    
    if (this.currentSelectedText && noteText) {
      // Text extraction function
      let fullText = ''; 
      try {
        // Step 1: Get the current page URL
        const currentPageUrl = window.location.href;
        console.log('Current page URL:', currentPageUrl);
        
        // Step 2: Clone the body
        let clonedBody = document.body.cloneNode(true); // Clone the body with all its children
        
        // Step 3: Define the tags you want to remove
        const tagsToRemove = ['head', 'header', 'code', 'footer', 'script', 'style', 'img', 'svg', 'meta', 'title', 'link', 'button'];
        
        // Step 4: Remove the specified tags from the cloned body
        tagsToRemove.forEach(tag => {
          const elements = clonedBody.getElementsByTagName(tag);
          while (elements.length > 0) {
            elements[0].parentNode.removeChild(elements[0]); // Remove each element found
          }
        });
        
        // Step 5: Iterate through <a> elements in clone and append new spans
        const links = clonedBody.querySelectorAll('a');
        links.forEach(link => {
          const href = link.getAttribute('href');
          
          // Create a new <span> element
          const newSpan = document.createElement('span');
          
          newSpan.textContent = ` ${href || '(no link available)'}`;  // Set the content
          
          // Append the new span to the current link
          link.appendChild(newSpan);
        });
        
        // Step 6: Extract the full text from the temporary container and clean it up
        fullText = clonedBody.innerText.trim();
        fullText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' '); // Replace multiple newlines and spaces with a single space
        
        // Step 7: Remove strings that start with ? up to the first space
        fullText = fullText.replace(/\?[^ ]*/g, '');
        
        // Step 8: Final cleanup to remove extra spaces
        fullText = fullText.replace(/\s+/g, ' ').trim();
        
        // Step 9: Define cut words
        const cutWords = ['InterestsInterests', 'Are these results helpful?','How your profile and resume fit this job','Set alert for similar jobs'];
        
        // Step 10: Find the first occurrence of any cut word
        let cutIndex = -1;
        cutWords.forEach(word => {
          const index = fullText.indexOf(word);
          if (index !== -1 && (cutIndex === -1 || index < cutIndex)) {
            cutIndex = index; // Update cutIndex to the first occurring cut word
          }
        });
        
        // Step 11: Cut fullText after the first occurring cut word
        if (cutIndex !== -1) {
          fullText = fullText.slice(0, cutIndex + cutWords.find(word => fullText.startsWith(word, cutIndex)).length);
        }
        
        console.log('Resulting text:', fullText);
      } catch (error) {
        console.error('Error processing the document:', error);
      }
      
      const noteEntry = {
        text: this.currentSelectedText,
        note: noteText,
        timestamp: new Date(),
        pageContext: fullText
      };
      
      // Save to notes array
      this.textNotes.push(noteEntry);
      
      // Log to console
      console.log('Saved Text Note:', noteEntry);
      
      // Hide popup
      this.hidePopup();
    }
  }
  
  hidePopup() {
    this.popupContainer.style.display = 'none';
    this.currentSelectedText = null;
  }
}

// Initialize the annotator immediately
window.textAnnotator = new TextAnnotator();