// Text Annotator Extension - Content Script (Hypothesis-style Overlay Highlights) https://chatgpt.com/c/68dada27-8b2c-8325-93a7-9f35a6957ae3
(function() {
    'use strict';

    // ===== Constants =====
    const STORAGE_KEY = 'textAnnotations';
    const HIGHLIGHT_CLASS = 'text-annotator-overlay';
    const MENU_CLASS = 'text-annotator-menu';
    const TOOLTIP_CLASS = 'text-annotator-tooltip';

    // ===== Globals =====
    let annotations = {};
    let currentSelection = null;
    let selectionMenu = null;
    let currentTooltip = null;
    let menuTimeout = null;
    const overlays = [];

    // ===== Utility Functions =====
    const getPageKey = () => `${window.location.hostname}${window.location.pathname}`;

    const getTextContent = (node) => node.textContent || node.innerText || '';

    function getCharacterOffset(container, node, offset) {
        let charOffset = 0;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode === node) return charOffset + offset;
            charOffset += currentNode.textContent.length;
        }
        return charOffset;
    }

    function findTextNodeAtOffset(container, targetOffset) {
        let currentOffset = 0;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;
            if (currentOffset + nodeLength >= targetOffset) {
                return { node, offset: targetOffset - currentOffset };
            }
            currentOffset += nodeLength;
        }
        return null;
    }

    function getXPath(element) {
        if (element.id) return `//*[@id="${element.id}"]`;
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) index++;
            }
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            parts.unshift(tagName + pathIndex);
            element = element.parentNode;
        }
        return '/' + parts.join('/');
    }

    // ===== Anchor Creation =====
    function createRobustAnchor(range) {
        const selectedText = range.toString().trim();
        const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? range.commonAncestorContainer.parentElement
            : range.commonAncestorContainer;
        const containerText = getTextContent(container);

        // Character offsets
        const textStart = getCharacterOffset(container, range.startContainer, range.startOffset);
        const textEnd = getCharacterOffset(container, range.endContainer, range.endOffset);

        const prefixStart = Math.max(0, textStart - 50);
        const suffixEnd = Math.min(containerText.length, textEnd + 50);

        const prefix = containerText.substring(prefixStart, textStart);
        const suffix = containerText.substring(textEnd, suffixEnd);

        // Position selectors
        const startPos = getCharacterOffset(document.body, range.startContainer, range.startOffset);
        const endPos = getCharacterOffset(document.body, range.endContainer, range.endOffset);

        // XPath
        const xpath = getXPath(container);

        return {
            quote: { exact: selectedText, prefix, suffix },
            range: { startContainer: xpath, startOffset: textStart, endContainer: xpath, endOffset: textEnd },
            position: { start: startPos, end: endPos },
            containerText,
            timestamp: Date.now(),
            url: window.location.href
        };
    }

    // ===== Overlay Highlights =====
    function highlightRangeOverlay(range, note, annotationId) {
        if (!range || range.collapsed) return null;

        const rects = range.getClientRects();
        const createdOverlays = [];

        Array.from(rects).forEach(rect => {
            const overlay = document.createElement('div');
            overlay.className = HIGHLIGHT_CLASS;
            overlay.dataset.annotationId = annotationId;
            overlay.dataset.note = note;
            overlay.style.cssText = `
                position: absolute;
                left: ${rect.left + window.scrollX}px;
                top: ${rect.top + window.scrollY}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                background-color: rgba(255, 235, 59, 0.4);
                pointer-events: auto;
                border-radius: 2px;
                cursor: pointer;
                z-index: 999999;
            `;

            overlay.addEventListener('mouseenter', showTooltip);
            overlay.addEventListener('mouseleave', hideTooltip);
            overlay.addEventListener('click', editAnnotation);

            document.body.appendChild(overlay);
            overlays.push(overlay);
            createdOverlays.push(overlay);
        });

        return createdOverlays;
    }

    function clearOverlays() {
        overlays.forEach(o => o.remove());
        overlays.length = 0;
    }

    // ===== Restore Highlights =====
    function restoreSelection(anchor) {
        const quoteRange = findByQuoteSelector(anchor.quote);
        if (quoteRange) return quoteRange;
        const rangeResult = findByRangeSelector(anchor.range, anchor.containerText);
        if (rangeResult) return rangeResult;
        const posRange = findByPositionSelector(anchor.position);
        if (posRange) return posRange;
        return null;
    }

    function restoreHighlights() {
        clearOverlays();
        const pageKey = getPageKey();
        const pageAnnotations = annotations[pageKey] || [];
        pageAnnotations.forEach((annotation, index) => {
            const range = restoreSelection(annotation.anchor);
            if (range) {
                highlightRangeOverlay(range, annotation.note, `${pageKey}_${index}`);
            }
        });
    }

    function findByQuoteSelector(quote) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const parentText = getTextContent(node.parentElement);
            const exactStart = parentText.indexOf(quote.exact);
            const prefixStart = parentText.indexOf(quote.prefix);
            if (exactStart !== -1 && prefixStart !== -1 && exactStart === prefixStart + quote.prefix.length) {
                const range = document.createRange();
                const startNode = findTextNodeAtOffset(node.parentElement, exactStart);
                const endNode = findTextNodeAtOffset(node.parentElement, exactStart + quote.exact.length);
                if (startNode && endNode) {
                    range.setStart(startNode.node, startNode.offset);
                    range.setEnd(endNode.node, endNode.offset);
                    return range;
                }
            }
        }
        return null;
    }

    function findByRangeSelector(rangeSelector, containerText) {
        try {
            const container = document.evaluate(rangeSelector.startContainer, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
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

    // ===== Annotation CRUD =====
    async function loadAnnotations() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise(resolve => chrome.storage.local.get([STORAGE_KEY], result => resolve(result[STORAGE_KEY] || {})));
        } else {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        }
    }

    async function saveAnnotations(annotations) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ [STORAGE_KEY]: annotations });
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
        }
    }

    function createAnnotation(range, note) {
        if (!range || range.collapsed) return;
        const anchor = createRobustAnchor(range);
        const pageKey = getPageKey();
        if (!annotations[pageKey]) annotations[pageKey] = [];
        const annotation = { anchor, note, timestamp: Date.now(), url: window.location.href };
        annotations[pageKey].push(annotation);
        saveAnnotations(annotations);
        highlightRangeOverlay(range, note, `${pageKey}_${annotations[pageKey].length - 1}`);
    }

    function editAnnotation(event) {
        const overlay = event.currentTarget;
        const annotationId = overlay.dataset.annotationId;
        const currentNote = overlay.dataset.note;
        const newNote = prompt('Edit your annotation:', currentNote);
        if (newNote === null) return;
        if (newNote === '') {
            if (confirm('Delete this annotation?')) deleteAnnotation(annotationId, overlay);
            return;
        }
        overlay.dataset.note = newNote;
        const [pageKey, idx] = annotationId.split('_');
        const index = parseInt(idx);
        if (annotations[pageKey] && annotations[pageKey][index]) {
            annotations[pageKey][index].note = newNote;
            saveAnnotations(annotations);
        }
    }

    function deleteAnnotation(annotationId, overlay) {
        const [pageKey, idx] = annotationId.split('_');
        const index = parseInt(idx);
        if (annotations[pageKey] && annotations[pageKey][index]) {
            annotations[pageKey].splice(index, 1);
            saveAnnotations(annotations);
        }
        overlay.remove();
    }

    // ===== Tooltip =====
    function showTooltip(event) {
        hideTooltip();
        const overlay = event.currentTarget;
        const note = overlay.dataset.note;
        if (!note) return;
        const tooltip = document.createElement('div');
        tooltip.className = TOOLTIP_CLASS;
        tooltip.style.position = 'absolute';
        tooltip.style.background = '#333';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.maxWidth = '250px';
        tooltip.style.zIndex = 10000;
        tooltip.style.pointerEvents = 'none';
        tooltip.style.wordWrap = 'break-word';
        tooltip.innerText = note;
        document.body.appendChild(tooltip);
        const rect = overlay.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        currentTooltip = tooltip;
    }

    function hideTooltip() {
        if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
        }
    }

    // ===== Selection Menu =====
    function showSelectionMenu(range) {
        hideSelectionMenu();
        const rect = range.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = MENU_CLASS;
        menu.innerHTML = `
            <div class="menu-content">
                <button class="annotate-btn">📝 Annotate</button>
                <button class="highlight-btn">🖍️ Highlight</button>
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
        const menuRect = menu.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        let top = rect.top + scrollY - menuRect.height - 10;
        let left = rect.left + scrollX + (rect.width / 2) - (menuRect.width / 2);
        if (top < scrollY + 10) top = rect.bottom + scrollY + 10;
        if (left < 10) left = 10;
        else if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        selectionMenu = menu;
        document.body.appendChild(menu);

        menu.querySelector('.annotate-btn').addEventListener('click', () => {
            const note = prompt('Enter annotation:');
            if (note) createAnnotation(currentSelection, note);
            hideSelectionMenu();
            window.getSelection().removeAllRanges();
        });
        menu.querySelector('.highlight-btn').addEventListener('click', () => {
            createAnnotation(currentSelection, 'Highlighted text');
            hideSelectionMenu();
            window.getSelection().removeAllRanges();
        });

        setTimeout(() => document.addEventListener('mousedown', handleClickOutside, true), 100);
    }

    function hideSelectionMenu() {
        if (selectionMenu) {
            selectionMenu.remove();
            selectionMenu = null;
            document.removeEventListener('mousedown', handleClickOutside, true);
        }
    }

    function handleClickOutside(event) {
        if (selectionMenu && !selectionMenu.contains(event.target)) hideSelectionMenu();
    }

    function isExcludedElement(node) {
        const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const excludedTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
        const excludedRoles = ['textbox', 'button', 'menuitem'];
        if (!element) return false;
        if (excludedTags.includes(element.tagName)) return true;
        if (element.contentEditable === 'true') return true;
        const role = element.getAttribute('role');
        if (role && excludedRoles.includes(role.toLowerCase())) return true;
        if (element.closest(`.${MENU_CLASS}`) || element.closest(`.${TOOLTIP_CLASS}`)) return true;
        return false;
    }

    function handleSelectionChange() {
        clearTimeout(menuTimeout);
        menuTimeout = setTimeout(() => {
            const selection = window.getSelection();
            if (selection.rangeCount === 0 || selection.isCollapsed) { hideSelectionMenu(); return; }
            const range = selection.getRangeAt(0);
            const text = range.toString().trim();
            if (!text || text.length < 3) { hideSelectionMenu(); return; }
            if (isExcludedElement(range.commonAncestorContainer)) { hideSelectionMenu(); return; }
            currentSelection = range.cloneRange();
            showSelectionMenu(range);
        }, 150);
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);
        window.addEventListener('scroll', hideSelectionMenu);
        window.addEventListener('resize', hideSelectionMenu);

        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                const selection = window.getSelection();
                if (selection.rangeCount && !selection.isCollapsed) {
                    const note = prompt('Enter annotation:');
                    if (note) createAnnotation(selection.getRangeAt(0), note);
                }
            }
            if (e.key === 'Escape') hideSelectionMenu();
        });
    }

    // ===== Chrome Runtime Integration =====
    if (chrome && chrome.runtime) {
        chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
            if (req.action === 'createAnnotation') {
                const sel = window.getSelection();
                if (sel.rangeCount && !sel.isCollapsed) {
                    const note = prompt('Enter annotation:');
                    if (note) createAnnotation(sel.getRangeAt(0), note);
                }
                sendResponse({ success: true });
            }
            return true;
        });
    }

    // ===== Initialize =====
    async function initialize() {
        annotations = await loadAnnotations();
        setupEventListeners();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', restoreHighlights);
        } else restoreHighlights();
        setTimeout(restoreHighlights, 1000);
        console.log('Text Annotator Initialized');
    }

    initialize();

    // ===== Expose for Debug =====
    window.TextAnnotator = {
        annotations,
        createAnnotation,
        restoreHighlights,
        clearOverlays
    };

})();
