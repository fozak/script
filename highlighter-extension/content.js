// Text Annotator Extension - Enhanced Content Script with Hypothesis-style behavior
(function() {
    'use strict';

    // Constants
    const STORAGE_KEY = 'textAnnotations';
    const HIGHLIGHT_CLASS = 'text-annotator-highlight';
    const MENU_CLASS = 'text-annotator-menu';
    const TOOLTIP_CLASS = 'text-annotator-tooltip';
    
    // Global variables
    let annotations = {};
    let currentTooltip = null;
    let selectionMenu = null;
    let currentSelection = null;
    let menuTimeout = null;

    // Utility Functions
    function getPageKey() {
        return `${window.location.hostname}${window.location.pathname}`;
    }

    function getTextContent(node) {
        return node.textContent || node.innerText || '';
    }

    function getCharacterOffset(container, node, offset) {
        let charOffset = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode === node) {
                return charOffset + offset;
            }
            charOffset += currentNode.textContent.length;
        }
        return charOffset;
    }

    function findTextNodeAtOffset(container, targetOffset) {
        let currentOffset = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;
            if (currentOffset + nodeLength >= targetOffset) {
                return {
                    node: node,
                    offset: targetOffset - currentOffset
                };
            }
            currentOffset += nodeLength;
        }
        return null;
    }

    // Enhanced Anchor Creation (Multiple Strategies)
    function createRobustAnchor(range) {
        const selectedText = range.toString().trim();
        const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;

        // Strategy 1: Quote Selector with Context
        const containerText = getTextContent(container);
        const textStart = getCharacterOffset(container, range.startContainer, range.startOffset);
        const textEnd = getCharacterOffset(container, range.endContainer, range.endOffset);
        
        const prefixStart = Math.max(0, textStart - 50);
        const suffixEnd = Math.min(containerText.length, textEnd + 50);
        
        const prefix = containerText.substring(prefixStart, textStart);
        const suffix = containerText.substring(textEnd, suffixEnd);

        // Strategy 2: Position Selector
        const startPos = getCharacterOffset(document.body, range.startContainer, range.startOffset);
        const endPos = getCharacterOffset(document.body, range.endContainer, range.endOffset);

        // Strategy 3: XPath Selector
        const xpath = getXPath(container);

        return {
            // Quote selector
            quote: {
                exact: selectedText,
                prefix: prefix,
                suffix: suffix
            },
            // Range selector  
            range: {
                startContainer: xpath,
                startOffset: textStart,
                endContainer: xpath,
                endOffset: textEnd
            },
            // Position selector
            position: {
                start: startPos,
                end: endPos
            },
            // Metadata
            containerText: containerText,
            timestamp: Date.now(),
            url: window.location.href
        };
    }

    function getXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let hasFollowingSiblings = false;
            let hasPrecedingSiblings = false;
            
            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    hasPrecedingSiblings = true;
                    index++;
                }
            }
            
            for (let sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    hasFollowingSiblings = true;
                }
            }
            
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = (hasPrecedingSiblings || hasFollowingSiblings) ? `[${index + 1}]` : '';
            parts.unshift(tagName + pathIndex);
            
            element = element.parentNode;
        }
        
        return parts.length ? '/' + parts.join('/') : '';
    }

    // Text Restoration (Multi-Strategy Fallback)
    function restoreSelection(anchor) {
        // Strategy 1: Try quote selector first
        const quoteRange = findByQuoteSelector(anchor.quote);
        if (quoteRange) return quoteRange;

        // Strategy 2: Try range selector
        const rangeResult = findByRangeSelector(anchor.range, anchor.containerText);
        if (rangeResult) return rangeResult;

        // Strategy 3: Try position selector
        const positionRange = findByPositionSelector(anchor.position);
        if (positionRange) return positionRange;

        return null;
    }

    function findByQuoteSelector(quote) {
        const searchText = quote.prefix + quote.exact + quote.suffix;
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const parentText = getTextContent(node.parentElement);
            if (parentText.includes(searchText)) {
                const exactStart = parentText.indexOf(quote.exact);
                const prefixStart = parentText.indexOf(quote.prefix);
                
                if (exactStart !== -1 && prefixStart !== -1 && exactStart === prefixStart + quote.prefix.length) {
                    const range = document.createRange();
                    const textNode = findTextNodeAtOffset(node.parentElement, exactStart);
                    const endTextNode = findTextNodeAtOffset(node.parentElement, exactStart + quote.exact.length);
                    
                    if (textNode && endTextNode) {
                        range.setStart(textNode.node, textNode.offset);
                        range.setEnd(endTextNode.node, endTextNode.offset);
                        return range;
                    }
                }
            }
        }
        return null;
    }

    function findByRangeSelector(rangeSelector, containerText) {
        try {
            const container = document.evaluate(
                rangeSelector.startContainer,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (container && getTextContent(container) === containerText) {
                const startNode = findTextNodeAtOffset(container, rangeSelector.startOffset);
                const endNode = findTextNodeAtOffset(container, rangeSelector.endOffset);
                
                if (startNode && endNode) {
                    const range = document.createRange();
                    range.setStart(startNode.node, startNode.offset);
                    range.setEnd(endNode.node, endNode.offset);
                    return range;
                }
            }
        } catch (e) {
            console.warn('XPath selector failed:', e);
        }
        return null;
    }

    function findByPositionSelector(position) {
        const startNode = findTextNodeAtOffset(document.body, position.start);
        const endNode = findTextNodeAtOffset(document.body, position.end);
        
        if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode.node, startNode.offset);
            range.setEnd(endNode.node, endNode.offset);
            return range;
        }
        return null;
    }

    // Selection Detection (Hypothesis-style)
    function handleSelectionChange() {
        clearTimeout(menuTimeout);
        menuTimeout = setTimeout(() => {
            const selection = window.getSelection();
            
            if (selection.rangeCount === 0 || selection.isCollapsed) {
                hideSelectionMenu();
                return;
            }

            const range = selection.getRangeAt(0);
            const selectedText = range.toString().trim();
            
            if (!selectedText || selectedText.length < 3) {
                hideSelectionMenu();
                return;
            }

            // Check if selection is in excluded elements
            if (isExcludedElement(range.commonAncestorContainer)) {
                hideSelectionMenu();
                return;
            }

            currentSelection = range.cloneRange();
            showSelectionMenu(range);
        }, 150);
    }

    function isExcludedElement(node) {
        const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const excludedTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
        const excludedRoles = ['textbox', 'button', 'menuitem'];
        
        if (!element) return false;
        
        // Check tag names
        if (excludedTags.includes(element.tagName)) return true;
        
        // Check contenteditable
        if (element.contentEditable === 'true') return true;
        
        // Check roles
        const role = element.getAttribute('role');
        if (role && excludedRoles.includes(role.toLowerCase())) return true;
        
        // Check if inside our own components
        if (element.closest(`.${MENU_CLASS}`) || element.closest(`.${TOOLTIP_CLASS}`)) return true;
        
        return false;
    }

    // Selection Menu (Floating UI)
    function showSelectionMenu(range) {
        hideSelectionMenu();
        
        const rect = range.getBoundingClientRect();
        const menu = createSelectionMenu();
        
        document.body.appendChild(menu);
        
        // Position menu
        const menuRect = menu.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        let top = rect.top + scrollY - menuRect.height - 10;
        let left = rect.left + scrollX + (rect.width / 2) - (menuRect.width / 2);
        
        // Boundary checks
        if (top < scrollY + 10) {
            top = rect.bottom + scrollY + 10;
        }
        
        if (left < 10) {
            left = 10;
        } else if (left + menuRect.width > window.innerWidth - 10) {
            left = window.innerWidth - menuRect.width - 10;
        }
        
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        
        selectionMenu = menu;
        
        // Add click outside listener
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside, true);
        }, 100);
    }

    function createSelectionMenu() {
        const menu = document.createElement('div');
        menu.className = MENU_CLASS;
        menu.innerHTML = `
            <div class="menu-content">
                <button class="menu-btn annotate-btn" title="Add Annotation">
                    📝 Annotate
                </button>
                <button class="menu-btn highlight-btn" title="Quick Highlight">
                    🖍️ Highlight
                </button>
            </div>
        `;
        
        menu.style.cssText = `
            position: absolute;
            z-index: 999999;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
        `;
        
        menu.querySelector('.menu-content').style.cssText = `
            display: flex;
            gap: 0;
        `;
        
        menu.querySelectorAll('.menu-btn').forEach(btn => {
            btn.style.cssText = `
                padding: 8px 12px;
                border: none;
                background: transparent;
                cursor: pointer;
                transition: background-color 0.2s;
                white-space: nowrap;
            `;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.backgroundColor = '#f5f5f5';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.backgroundColor = 'transparent';
            });
        });
        
        // Event listeners
        menu.querySelector('.annotate-btn').addEventListener('click', handleAnnotateClick);
        menu.querySelector('.highlight-btn').addEventListener('click', handleHighlightClick);
        
        return menu;
    }

    function hideSelectionMenu() {
        if (selectionMenu) {
            selectionMenu.remove();
            selectionMenu = null;
            document.removeEventListener('mousedown', handleClickOutside, true);
        }
    }

    function handleClickOutside(event) {
        if (selectionMenu && !selectionMenu.contains(event.target)) {
            hideSelectionMenu();
        }
    }

    function handleAnnotateClick() {
        if (!currentSelection) return;
        
        const note = prompt('Enter your annotation:');
        if (!note) return;
        
        createAnnotation(currentSelection, note);
        hideSelectionMenu();
        window.getSelection().removeAllRanges();
    }

    function handleHighlightClick() {
        if (!currentSelection) return;
        
        createAnnotation(currentSelection, 'Highlighted text');
        hideSelectionMenu();
        window.getSelection().removeAllRanges();
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
                const range = restoreSelection(annotation.anchor);
                if (range) {
                    const annotationId = `${pageKey}_${index}`;
                    highlightRange(range, annotation.note, annotationId);
                }
            } catch (e) {
                console.error('Failed to restore highlight:', e);
            }
        });
    }

    // Annotation Functions
    function createAnnotation(range, note) {
        try {
            const anchor = createRobustAnchor(range);
            const pageKey = getPageKey();
            
            if (!annotations[pageKey]) {
                annotations[pageKey] = [];
            }
            
            const annotation = {
                anchor: anchor,
                note: note,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            annotations[pageKey].push(annotation);
            saveAnnotations(annotations);
            
            const annotationId = `${pageKey}_${annotations[pageKey].length - 1}`;
            highlightRange(range, note, annotationId);
            
        } catch (e) {
            console.error('Failed to create annotation:', e);
            alert('Failed to create annotation. Please try again.');
        }
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

    function editAnnotation(event) {
        const element = event.target;
        const annotationId = element.dataset.annotationId;
        const currentNote = element.dataset.note;
        
        const newNote = prompt('Edit your annotation:', currentNote);
        if (newNote === null) return;
        
        if (newNote === '') {
            if (confirm('Delete this annotation?')) {
                deleteAnnotation(annotationId, element);
            }
            return;
        }
        
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
        
        const parent = element.parentNode;
        parent.insertBefore(document.createTextNode(element.textContent), element);
        element.remove();
        parent.normalize();
    }

    // Event Listeners (Hypothesis-style)
    function setupEventListeners() {
        // Selection detection
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);
        
        // Hide menu on scroll/resize
        window.addEventListener('scroll', hideSelectionMenu);
        window.addEventListener('resize', hideSelectionMenu);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'A') {
                event.preventDefault();
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    handleAnnotateClick();
                }
            }
            
            // Escape to hide menu
            if (event.key === 'Escape') {
                hideSelectionMenu();
            }
        });
    }

    // Chrome Extension Integration
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "createAnnotation") {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                handleAnnotateClick();
            }
            sendResponse({success: true});
        }
        return true;
    });

    // Initialize
    async function initialize() {
        try {
            annotations = await loadAnnotations();
            setupEventListeners();
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', restoreHighlights);
            } else {
                restoreHighlights();
            }
            
            setTimeout(restoreHighlights, 1000);
            
        } catch (e) {
            console.error('Failed to initialize Text Annotator:', e);
        }
    }

    initialize();

    // Debug interface
    window.TextAnnotator = {
        annotations,
        createAnnotation,
        restoreHighlights,
        showMenu: showSelectionMenu,
        hideMenu: hideSelectionMenu
    };

})();