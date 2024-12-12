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
        // Position the popup to the right of the selected text
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate popup position
        const popupWidth = 300; // Fixed width of the popup
        const popupHeight = 250; // Estimated height of the popup
        
        // Position right of selection with some padding
        let left = rect.right + 15;
        let top = rect.top;
        
        // Adjust if popup would go off the right edge of the screen
        if (left + popupWidth > window.innerWidth) {
          left = rect.left - popupWidth - 15;
        }
        
        // Adjust if popup would go below the screen
        if (top + popupHeight > window.innerHeight) {
          top = window.innerHeight - popupHeight - 20;
        }
        
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
      }
    }
    
    saveNote() {
      const noteText = this.noteTextarea.value.trim();
      
      if (this.currentSelectedText && noteText) {
        const noteEntry = {
          text: this.currentSelectedText,
          note: noteText,
          timestamp: new Date()
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