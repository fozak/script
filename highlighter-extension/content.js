// Text Annotator Extension - Single Content Script
(function() {
    'use strict';

    // Constants
    const STORAGE_KEY = 'textAnnotations';
    const HIGHLIGHT_CLASS = 'text-annotator-highlight';
    const TOOLTIP_CLASS = 'text-annotator-tooltip';
    
    // Global variables
    let annotations = {};
    let currentTooltip = null;

    // Utility Functions
    function getPageKey() {
        return `${window.location.hostname}${window.location.pathname}`;
    }

    function generateSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        let selector = element.tagName.toLowerCase();
        
        // Add classes if available
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(c => c && !c.startsWith('text-annotator'));
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }
        
        // Add position among siblings if needed
        const siblings = Array.from(element.parentNode?.children || []).filter(el => 
            el.tagName === element.tagName && 
            el.className === element.className
        );
        
        if (siblings.length > 1) {
            const index = siblings.indexOf(element);
            selector += `:nth-of-type(${index + 1})`;
        }
        
        return selector;
    }

    function createReliableSelector(range) {
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        
        const selector = generateSelector(element);
        const text = range.toString().trim();
        const textStart = range.startOffset;
        const textEnd = range.endOffset;
        
        return {
            selector,
            text,
            textStart,
            textEnd,
            fullText: element.textContent
        };
    }

    function findTextInElement(element, targetText, fullText) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        let currentOffset = 0;
        
        while (node = walker.nextNode()) {
            const nodeText = node.textContent;
            const startIndex = nodeText.indexOf(targetText);
            
            if (startIndex !== -1) {
                const range = document.createRange();
                range.setStart(node, startIndex);
                range.setEnd(node, startIndex + targetText.length);
                return range;
            }
            currentOffset += nodeText.length;
        }
        return null;
    }

    // Storage Functions
    async function loadAnnotations() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                return new Promise((resolve) => {
                    chrome.storage.local.get([STORAGE_KEY], (result) => {
                        resolve(result[STORAGE_KEY] || {});
                    });
                });
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored ? JSON.parse(stored) : {};
            }
        } catch (e) {
            console.error('Failed to load annotations:', e);
            return {};
        }
    }

    async function saveAnnotations(annotations) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ [STORAGE_KEY]: annotations });
            } else {
                // Fallback to localStorage
                localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
            }
        } catch (e) {
            console.error('Failed to save annotations:', e);
        }
    }

    // Highlighting Functions
    function highlightRange(range, note, annotationId) {
        try {
            const span = document.createElement('span');
            span.className = HIGHLIGHT_CLASS;
            span.dataset.annotationId = annotationId;
            span.dataset.note = note;
            span.style.cssText = `
                background-color: #ffeb3b !important;
                padding: 1px 2px !important;
                border-radius: 2px !important;
                cursor: pointer !important;
                position: relative !important;
            `;
            
            span.addEventListener('mouseenter', showTooltip);
            span.addEventListener('mouseleave', hideTooltip);
            span.addEventListener('click', editAnnotation);
            
            range.surroundContents(span);
            return span;
        } catch (e) {
            console.error('Failed to highlight range:', e);
            return null;
        }
    }

    function restoreHighlights() {
        const pageKey = getPageKey();
        const pageAnnotations = annotations[pageKey] || [];
        
        pageAnnotations.forEach((annotation, index) => {
            try {
                const element = document.querySelector(annotation.selector);
                if (element && element.textContent.includes(annotation.text)) {
                    const range = findTextInElement(element, annotation.text, annotation.fullText);
                    if (range) {
                        highlightRange(range, annotation.note, `${pageKey}_${index}`);
                    }
                }
            } catch (e) {
                console.error('Failed to restore highlight:', e);
            }
        });
    }

    // Tooltip Functions
    function showTooltip(event) {
        hideTooltip();
        
        const element = event.target;
        const note = element.dataset.note;
        
        if (!note) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = TOOLTIP_CLASS;
        tooltip.innerHTML = `
            <div style="
                position: absolute;
                background: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                max-width: 250px;
                z-index: 10000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                pointer-events: none;
                word-wrap: break-word;
            ">
                ${note}
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.firstElementChild.getBoundingClientRect();
        
        tooltip.firstElementChild.style.left = `${rect.left + window.scrollX}px`;
        tooltip.firstElementChild.style.top = `${rect.bottom + window.scrollY + 5}px`;
        
        currentTooltip = tooltip;
    }

    function hideTooltip() {
        if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
        }
    }

    // Annotation Functions
    function createAnnotation() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            alert('Please select some text first.');
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            alert('Please select some text first.');
            return;
        }

        const note = prompt('Enter your note:');
        if (!note) return;

        try {
            const selectorData = createReliableSelector(range);
            const pageKey = getPageKey();
            
            if (!annotations[pageKey]) {
                annotations[pageKey] = [];
            }
            
            const annotation = {
                ...selectorData,
                note,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            annotations[pageKey].push(annotation);
            saveAnnotations(annotations);
            
            const annotationId = `${pageKey}_${annotations[pageKey].length - 1}`;
            highlightRange(range, note, annotationId);
            
            selection.removeAllRanges();
        } catch (e) {
            console.error('Failed to create annotation:', e);
            alert('Failed to create annotation. Please try again.');
        }
    }

    function editAnnotation(event) {
        const element = event.target;
        const annotationId = element.dataset.annotationId;
        const currentNote = element.dataset.note;
        
        const newNote = prompt('Edit your note:', currentNote);
        if (newNote === null) return;
        
        if (newNote === '') {
            // Delete annotation
            if (confirm('Delete this annotation?')) {
                deleteAnnotation(annotationId, element);
            }
            return;
        }
        
        // Update annotation
        element.dataset.note = newNote;
        
        const [pageKey, indexStr] = annotationId.split('_');
        const index = parseInt(indexStr);
        
        if (annotations[pageKey] && annotations[pageKey][index]) {
            annotations[pageKey][index].note = newNote;
            saveAnnotations(annotations);
        }
    }

    function deleteAnnotation(annotationId, element) {
        const [pageKey, indexStr] = annotationId.split('_');
        const index = parseInt(indexStr);
        
        if (annotations[pageKey] && annotations[pageKey][index]) {
            annotations[pageKey].splice(index, 1);
            saveAnnotations(annotations);
        }
        
        // Remove highlight
        const parent = element.parentNode;
        parent.insertBefore(document.createTextNode(element.textContent), element);
        element.remove();
        parent.normalize();
    }

    // Context Menu (for non-extension environments)
    function setupContextMenu() {
        document.addEventListener('contextmenu', (event) => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                // Add a small delay to allow context menu, then add our option
                setTimeout(() => {
                    if (confirm('Add annotation to selected text?')) {
                        createAnnotation();
                    }
                }, 100);
            }
        });
    }

    // Chrome Extension Integration - Content Script Only
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "createAnnotation") {
            createAnnotation();
            sendResponse({success: true});
        }
        return true; // Keep message channel open for async response
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'A') {
            event.preventDefault();
            createAnnotation();
        }
    });

    // Initialize
    async function initialize() {
        try {
            annotations = await loadAnnotations();
            
            // Wait for page to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', restoreHighlights);
            } else {
                restoreHighlights();
            }
            
            // Also restore after a short delay to handle dynamic content
            setTimeout(restoreHighlights, 1000);
            
        } catch (e) {
            console.error('Failed to initialize Text Annotator:', e);
        }
    }

    // Start the extension
    initialize();

    // Export for debugging
    window.TextAnnotator = {
        annotations,
        createAnnotation,
        restoreHighlights,
        loadAnnotations,
        saveAnnotations
    };

})();