// Content Script for Edgenuity AI Solver
// Injects the solve button and handles question extraction

(function () {
    'use strict';

    let api = null;
    let settings = {};
    let solveButton = null;
    let responseOverlay = null;
    let historyPanel = null;
    let chatPanel = null;
    let solveHistory = [];
    let chatMessages = [];

    // Initialize the extension
    async function init() {
        // Only run full initialization in the top frame
        // Iframes should not create UI elements (buttons, overlays)
        const isTopFrame = window === window.top;

        console.log(`[Edgenuity AI] Initializing... (isTopFrame: ${isTopFrame})`);

        // Load settings from storage
        await loadSettings();

        // Load history from storage (only in top frame)
        if (isTopFrame) {
            await loadHistory();
        }

        // Create API instance
        api = new window.OpenRouterAPI(settings.apiKey, settings.humanizerApiKey);

        // Set up interaction handler for tool calls
        api.setInteractionHandler({
            clickElement: async (selector) => await clickElement(selector),
            selectOption: async (selector, value) => await selectOption(selector, value),
            typeText: async (selector, text) => await fillInput(selector, text)
        });

        // Only create UI elements in the top frame
        if (isTopFrame) {
            // Inject the floating solve button (if enabled)
            if (settings.showSolveButton !== false) {
                createSolveButton();
            }

            // Create response overlay
            createResponseOverlay();

            // Create history panel
            createHistoryPanel();

            // Set up auto-skip functionality if enabled
            if (settings.autoSkipOnFinish) {
                setupAutoSkip();
                // Pre-inject the page context script so it's ready for auto-skip
                injectPageContextScript();
            }

            // Set up auto-play functionality if enabled
            if (settings.autoPlayVideo) {
                setupAutoPlay();
            }

            // Set up auto-solve functionality if enabled
            if (settings.autoSolve) {
                setupAutoSolve();
            }

            // Watch for page changes (Edgenuity uses dynamic content)
            observePageChanges();
        } else {
            // In iframe: listen for auto-skip commands from parent
            setupIframeAutoSkipListener();
        }

        console.log('[Edgenuity AI] Ready!');
    }

    // Load settings from Chrome storage
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(window.EDGENUITY_CONFIG.DEFAULT_SETTINGS, (result) => {
                settings = result;
                resolve();
            });
        });
    }

    // Create the floating solve button
    function createSolveButton() {
        if (solveButton) {
            solveButton.style.display = '';
            return;
        }

        solveButton = document.createElement('div');
        solveButton.id = 'edgenuity-ai-solve-btn';
        solveButton.innerHTML = `
      <div class="eai-btn-content">
        <span class="eai-icon">🤖</span>
        <span class="eai-text">Solve</span>
        <span class="eai-last-history-btn" title="View last answer">📚</span>
        <span class="eai-chat-btn" title="Chat with AI">💬</span>
        <span class="eai-hide-btn" title="Hide button">✕</span>
      </div>
      <div class="eai-loading">
        <div class="eai-spinner"></div>
      </div>
    `;

        solveButton.addEventListener('click', handleSolveClick);
        solveButton.querySelector('.eai-hide-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            hideSolveButton();
        });
        solveButton.querySelector('.eai-last-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showLastHistoryEntry();
        });
        solveButton.querySelector('.eai-chat-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showChatPanel();
        });
        document.body.appendChild(solveButton);
    }

    // Hide the solve button
    function hideSolveButton() {
        if (solveButton) {
            solveButton.style.display = 'none';
        }
    }

    // Create the response overlay
    function createResponseOverlay() {
        if (responseOverlay) return;

        responseOverlay = document.createElement('div');
        responseOverlay.id = 'edgenuity-ai-overlay';
        responseOverlay.innerHTML = `
      <div class="eai-overlay-content">
        <div class="eai-overlay-header">
          <span class="eai-overlay-title">🤖 AI Answer</span>
          <div class="eai-overlay-actions">
            <button class="eai-history-btn" title="View History">📚</button>
            <button class="eai-copy-btn" title="Copy answer">📋</button>
            <button class="eai-close-btn" title="Close">✕</button>
          </div>
        </div>
        <div class="eai-overlay-body">
          <div class="eai-answer"></div>
        </div>
        <div class="eai-overlay-footer">
          <span class="eai-model-info"></span>
          <button class="eai-scroll-bottom-btn" title="Scroll to bottom">⬇️</button>
        </div>
      </div>
    `;

        // Close button handler
        responseOverlay.querySelector('.eai-close-btn').addEventListener('click', hideOverlay);

        // Copy button handler
        responseOverlay.querySelector('.eai-copy-btn').addEventListener('click', copyAnswer);

        // History button handler
        responseOverlay.querySelector('.eai-history-btn').addEventListener('click', toggleHistoryPanel);

        // Scroll to bottom button handler
        const scrollBtn = responseOverlay.querySelector('.eai-scroll-bottom-btn');
        scrollBtn.addEventListener('click', scrollToBottom);

        // Show/hide scroll button based on scroll position
        const overlayBody = responseOverlay.querySelector('.eai-overlay-body');
        overlayBody.addEventListener('scroll', () => {
            const isAtBottom = overlayBody.scrollHeight - overlayBody.scrollTop <= overlayBody.clientHeight + 50;
            scrollBtn.classList.toggle('hidden', isAtBottom);
        });

        // Click outside to close
        responseOverlay.addEventListener('click', (e) => {
            if (e.target === responseOverlay) hideOverlay();
        });

        document.body.appendChild(responseOverlay);
    }

    // Create history panel
    function createHistoryPanel() {
        if (historyPanel) return;

        historyPanel = document.createElement('div');
        historyPanel.id = 'edgenuity-ai-history';
        historyPanel.innerHTML = `
      <div class="eai-history-content">
        <div class="eai-history-header">
          <span class="eai-history-title">📚 Solve History</span>
          <div class="eai-history-actions">
            <button class="eai-clear-history-btn" title="Clear History">🗑️</button>
            <button class="eai-close-history-btn" title="Close">✕</button>
          </div>
        </div>
        <div class="eai-history-body">
          <div class="eai-history-list"></div>
        </div>
      </div>
    `;

        // Close button handler
        historyPanel.querySelector('.eai-close-history-btn').addEventListener('click', hideHistoryPanel);

        // Clear history button
        historyPanel.querySelector('.eai-clear-history-btn').addEventListener('click', clearHistory);

        // Click outside to close
        historyPanel.addEventListener('click', (e) => {
            if (e.target === historyPanel) hideHistoryPanel();
        });

        document.body.appendChild(historyPanel);
    }

    // Scroll to bottom of answer
    function scrollToBottom() {
        const overlayBody = responseOverlay.querySelector('.eai-overlay-body');
        overlayBody.scrollTo({
            top: overlayBody.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Toggle history panel
    function toggleHistoryPanel() {
        if (historyPanel.classList.contains('visible')) {
            hideHistoryPanel();
        } else {
            showHistoryPanel();
        }
    }

    // Show history panel
    function showHistoryPanel() {
        renderHistory();
        historyPanel.classList.add('visible');
    }

    // Hide history panel
    function hideHistoryPanel() {
        historyPanel.classList.remove('visible');
    }

    // Load history from storage
    async function loadHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get({ solveHistory: [] }, (result) => {
                solveHistory = result.solveHistory || [];
                resolve();
            });
        });
    }

    // Save history to storage
    async function saveHistory() {
        // Keep only last 50 entries
        if (solveHistory.length > 50) {
            solveHistory = solveHistory.slice(-50);
        }
        return new Promise((resolve) => {
            chrome.storage.local.set({ solveHistory }, resolve);
        });
    }

    // Add entry to history
    async function addToHistory(question, answer, model, chatConversation = null) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            question: question.substring(0, 200) + (question.length > 200 ? '...' : ''),
            answer,
            model,
            url: window.location.href,
            isChat: !!chatConversation,
            chatConversation: chatConversation // Store full conversation for chat entries
        };
        solveHistory.push(entry);
        await saveHistory();
    }

    // Clear all history
    async function clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            solveHistory = [];
            await saveHistory();
            renderHistory();
        }
    }

    // Show the last history entry
    function showLastHistoryEntry() {
        if (solveHistory.length === 0) {
            // No history, show a notification
            showOverlay('No history available yet. Solve a question first!', true);
            return;
        }

        // Get the most recent entry (last in array)
        const lastEntry = solveHistory[solveHistory.length - 1];

        // If it's a chat entry, open it in the chat modal
        if (lastEntry.isChat && lastEntry.chatConversation) {
            restoreChatConversation(lastEntry.chatConversation);
        } else {
            showOverlay(lastEntry.answer, false, lastEntry.model);
        }
    }

    // Restore a chat conversation from history
    function restoreChatConversation(conversation) {
        chatMessages = [...conversation]; // Restore the full conversation
        if (!chatPanel) createChatPanel();
        renderChatMessages();
        showChatPanel();
    }

    // Render history list
    function renderHistory() {
        const listEl = historyPanel.querySelector('.eai-history-list');

        if (solveHistory.length === 0) {
            listEl.innerHTML = '<div class="eai-history-empty">No history yet. Solve some questions to see them here!</div>';
            return;
        }

        listEl.innerHTML = solveHistory
            .slice()
            .reverse()
            .map(entry => `
                <div class="eai-history-item ${entry.isChat ? 'eai-history-chat' : ''}" data-id="${entry.id}">
                    <div class="eai-history-item-header">
                        <span class="eai-history-time">${formatTime(entry.timestamp)}</span>
                        <span class="eai-history-model">${entry.model}</span>
                    </div>
                    <div class="eai-history-question">${escapeHtml(entry.question)}</div>
                    <div class="eai-history-actions-row">
                        <button class="eai-view-answer-btn" data-id="${entry.id}" data-is-chat="${entry.isChat || false}">
                            ${entry.isChat ? '💬 Continue Chat' : 'View Answer'}
                        </button>
                    </div>
                </div>
            `)
            .join('');

        // Add click handlers for view buttons
        listEl.querySelectorAll('.eai-view-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const isChat = e.target.dataset.isChat === 'true';
                const entry = solveHistory.find(h => h.id === id);
                if (entry) {
                    hideHistoryPanel();
                    if (isChat && entry.chatConversation) {
                        // Restore chat conversation and open chat modal
                        restoreChatConversation(entry.chatConversation);
                    } else {
                        showOverlay(entry.answer, false, entry.model);
                    }
                }
            });
        });
    }

    // Format timestamp
    function formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // =========================================
    // CHAT PANEL FUNCTIONALITY
    // =========================================

    // Create the chat panel
    function createChatPanel() {
        if (chatPanel) return;

        chatPanel = document.createElement('div');
        chatPanel.id = 'edgenuity-ai-chat';
        chatPanel.innerHTML = `
      <div class="eai-chat-content">
        <div class="eai-chat-header">
          <span class="eai-chat-title">💬 AI Chat</span>
          <div class="eai-chat-actions">
            <button class="eai-chat-clear-btn" title="Clear chat">🗑️</button>
            <button class="eai-chat-close-btn" title="Close">✕</button>
          </div>
        </div>
        <div class="eai-chat-messages">
          <div class="eai-chat-welcome">
            <div class="eai-chat-welcome-icon">🤖</div>
            <div class="eai-chat-welcome-text">Hi! I'm here to help with your questions. Type a message below or include a screenshot for additional context.</div>
          </div>
        </div>
        <div class="eai-chat-input-area">
          <div class="eai-chat-options">
            <label class="eai-chat-toggle" title="Include screenshot of current page">
              <input type="checkbox" id="eai-chat-screenshot-toggle" checked>
              <span class="eai-chat-toggle-slider"></span>
              <span class="eai-chat-toggle-label">📸 Include Screenshot</span>
            </label>
          </div>
          <div class="eai-chat-input-row">
            <textarea class="eai-chat-input" placeholder="Type your message..." rows="1"></textarea>
            <button class="eai-chat-send-btn" title="Send message">
              <span class="eai-chat-send-icon">➤</span>
              <span class="eai-chat-send-loading">
                <div class="eai-chat-spinner"></div>
              </span>
            </button>
          </div>
        </div>
      </div>
    `;

        // Close button handler
        chatPanel.querySelector('.eai-chat-close-btn').addEventListener('click', hideChatPanel);

        // Clear chat button
        chatPanel.querySelector('.eai-chat-clear-btn').addEventListener('click', clearChat);

        // Click outside to close
        chatPanel.addEventListener('click', (e) => {
            if (e.target === chatPanel) hideChatPanel();
        });

        // Auto-resize textarea
        const textarea = chatPanel.querySelector('.eai-chat-input');
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });

        // Send on Enter (Shift+Enter for newline)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });

        // Send button handler
        chatPanel.querySelector('.eai-chat-send-btn').addEventListener('click', sendChatMessage);

        document.body.appendChild(chatPanel);
    }

    // Show chat panel
    function showChatPanel() {
        if (!chatPanel) createChatPanel();
        chatPanel.classList.add('visible');
        const textarea = chatPanel.querySelector('.eai-chat-input');
        setTimeout(() => textarea.focus(), 100);
    }

    // Hide chat panel
    function hideChatPanel() {
        if (chatPanel) chatPanel.classList.remove('visible');
    }

    // Clear chat messages
    function clearChat() {
        chatMessages = [];
        renderChatMessages();
    }

    // Render chat messages
    function renderChatMessages() {
        const messagesEl = chatPanel.querySelector('.eai-chat-messages');

        if (chatMessages.length === 0) {
            messagesEl.innerHTML = `
              <div class="eai-chat-welcome">
                <div class="eai-chat-welcome-icon">🤖</div>
                <div class="eai-chat-welcome-text">Hi! I'm here to help with your questions. Type a message below or include a screenshot for additional context.</div>
              </div>
            `;
            return;
        }

        messagesEl.innerHTML = chatMessages.map(msg => `
            <div class="eai-chat-message ${msg.role}">
                <div class="eai-chat-message-avatar">${msg.role === 'user' ? '👤' : '🤖'}</div>
                <div class="eai-chat-message-content">
                    ${msg.hasScreenshot ? '<div class="eai-chat-screenshot-badge">📸 Screenshot included</div>' : ''}
                    <div class="eai-chat-message-text">${formatChatResponse(msg.content)}</div>
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Format chat response (parse markdown-like formatting)
    function formatChatResponse(text) {
        return escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Send a chat message
    async function sendChatMessage() {
        const textarea = chatPanel.querySelector('.eai-chat-input');
        const message = textarea.value.trim();

        if (!message) return;

        const includeScreenshot = chatPanel.querySelector('#eai-chat-screenshot-toggle').checked;
        const sendBtn = chatPanel.querySelector('.eai-chat-send-btn');

        // Disable input and show loading
        textarea.disabled = true;
        sendBtn.disabled = true;
        sendBtn.classList.add('loading');

        let screenshot = null;

        // Capture screenshot if enabled
        if (includeScreenshot) {
            try {
                // Temporarily hide the chat panel to capture clean screenshot
                chatPanel.classList.add('hidden-for-screenshot');
                await sleep(300); // Give time for the UI to fully hide

                screenshot = await captureScreenshot();

                // Show chat panel again
                chatPanel.classList.remove('hidden-for-screenshot');
            } catch (err) {
                console.error('[Edgenuity AI] Failed to capture screenshot:', err);
                chatPanel.classList.remove('hidden-for-screenshot');
            }
        }

        // Add user message to chat
        chatMessages.push({
            role: 'user',
            content: message,
            hasScreenshot: !!screenshot
        });
        renderChatMessages();

        // Clear input
        textarea.value = '';
        textarea.style.height = 'auto';

        try {
            // Build conversation for API
            const conversationMessages = chatMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Get AI response
            const response = await api.chatWithContext(
                conversationMessages,
                screenshot,
                getModelId()
            );

            // Add AI response to chat
            chatMessages.push({
                role: 'assistant',
                content: response,
                hasScreenshot: false
            });
            renderChatMessages();

            // Save to history (user question + AI answer + full conversation)
            const modelName = settings.selectedModel ? `Chat (${settings.selectedModel})` : 'Chat';
            await addToHistory(message, response, modelName, [...chatMessages]);

        } catch (err) {
            console.error('[Edgenuity AI] Chat error:', err);
            chatMessages.push({
                role: 'assistant',
                content: `Error: ${err.message || 'Failed to get response. Please try again.'}`,
                hasScreenshot: false
            });
            renderChatMessages();
        } finally {
            // Re-enable input
            textarea.disabled = false;
            sendBtn.disabled = false;
            sendBtn.classList.remove('loading');
            textarea.focus();
        }
    }

    // Capture screenshot helper
    async function captureScreenshot() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.dataUrl);
                } else {
                    reject(new Error(response?.error || 'Screenshot failed'));
                }
            });
        });
    }

    // Get current model ID based on settings
    function getModelId() {
        const modelMapping = {
            'balanced': 'google/gemini-2.5-flash-lite',
            'writing': 'anthropic/claude-sonnet-4',
            'reasoning': 'openai/gpt-4o',
            'deep': 'google/gemini-2.5-pro',
            'math': 'qwen/qwen3-235b-a22b',
            'fast': 'meta-llama/llama-4-maverick'
        };
        return modelMapping[settings.selectedModel] || modelMapping['balanced'];
    }

    // =========================================
    // DOM INTERACTION UTILITIES (TOOL CALLS)
    // =========================================

    // Get the stageFrame iframe document (where Edgenuity content lives)
    function getStageFrameDoc() {
        const iframeSelectors = ['#stageFrame', 'iframe[name="stageFrame"]', 'iframe.stage-frame'];
        for (const selector of iframeSelectors) {
            try {
                const iframe = document.querySelector(selector);
                if (iframe) {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (doc) return doc;
                }
            } catch (e) {
                console.log('[Edgenuity AI] Cannot access iframe:', selector, e.message);
            }
        }
        return null;
    }

    // Get document to search in (prefers stageFrame, falls back to main document)
    function getTargetDoc() {
        return getStageFrameDoc() || document;
    }

    // Sleep/delay utility - returns a promise that resolves after ms milliseconds
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Find an element by various selectors (ID, name, CSS selector, or text content)
    function findElement(selectorOrText, doc = null) {
        const targetDoc = doc || getTargetDoc();

        // Try as CSS selector first
        try {
            const el = targetDoc.querySelector(selectorOrText);
            if (el) return el;
        } catch (e) {
            // Invalid selector, try other methods
        }

        // Try by ID
        const byId = targetDoc.getElementById(selectorOrText);
        if (byId) return byId;

        // Try by name
        const byName = targetDoc.querySelector(`[name="${CSS.escape(selectorOrText)}"]`);
        if (byName) return byName;

        // Try finding by text content (for buttons, labels, etc.)
        const allElements = targetDoc.querySelectorAll('button, a, label, span, div, option');
        for (const el of allElements) {
            if (el.textContent?.trim().toLowerCase() === selectorOrText.toLowerCase()) {
                return el;
            }
        }

        return null;
    }

    // Click an element by selector, ID, name, or text content
    async function clickElement(selectorOrText, delayAfter = 100) {
        const el = findElement(selectorOrText);
        if (!el) {
            console.error(`[Edgenuity AI] Element not found: ${selectorOrText}`);
            return false;
        }

        try {
            // Scroll into view if needed
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(50);

            // Focus and click
            el.focus();
            el.click();

            // Also dispatch events for stubborn elements
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            console.log(`[Edgenuity AI] Clicked: ${selectorOrText}`);
            await sleep(delayAfter);
            return true;
        } catch (e) {
            console.error(`[Edgenuity AI] Failed to click: ${selectorOrText}`, e);
            return false;
        }
    }

    // Select a dropdown option by value or text
    async function selectOption(selectSelectorOrId, optionValueOrText, delayAfter = 100) {
        const targetDoc = getTargetDoc();

        // Find the select element
        let select = findElement(selectSelectorOrId, targetDoc);
        if (!select || select.tagName !== 'SELECT') {
            // Try finding a select with matching ID pattern
            select = targetDoc.querySelector(`select[id*="${CSS.escape(selectSelectorOrId)}"]`);
        }

        if (!select) {
            console.error(`[Edgenuity AI] Select not found: ${selectSelectorOrId}`);
            return false;
        }

        try {
            // Find the option - try by value first, then by text
            let optionToSelect = null;
            const options = Array.from(select.options);

            // Try exact value match
            optionToSelect = options.find(opt => opt.value === optionValueOrText);

            // Try text match (case-insensitive)
            if (!optionToSelect) {
                const searchText = optionValueOrText.toString().toLowerCase().trim();
                optionToSelect = options.find(opt =>
                    opt.textContent?.toLowerCase().trim() === searchText ||
                    opt.textContent?.toLowerCase().trim().includes(searchText)
                );
            }

            if (!optionToSelect) {
                console.error(`[Edgenuity AI] Option not found: ${optionValueOrText} in ${selectSelectorOrId}`);
                return false;
            }

            // Select the option
            select.value = optionToSelect.value;
            optionToSelect.selected = true;

            // Dispatch change event to trigger any listeners
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));

            console.log(`[Edgenuity AI] Selected "${optionToSelect.textContent?.trim()}" in ${selectSelectorOrId}`);
            await sleep(delayAfter);
            return true;
        } catch (e) {
            console.error(`[Edgenuity AI] Failed to select option:`, e);
            return false;
        }
    }

    // Fill a text input or textarea
    async function fillInput(selectorOrId, value, delayAfter = 100) {
        const el = findElement(selectorOrId);
        if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) {
            console.error(`[Edgenuity AI] Input not found: ${selectorOrId}`);
            return false;
        }

        try {
            el.focus();
            el.value = value;

            // Dispatch events
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

            console.log(`[Edgenuity AI] Filled input ${selectorOrId} with: ${value}`);
            await sleep(delayAfter);
            return true;
        } catch (e) {
            console.error(`[Edgenuity AI] Failed to fill input:`, e);
            return false;
        }
    }

    // Check or uncheck a checkbox
    async function setCheckbox(selectorOrId, checked = true, delayAfter = 100) {
        const el = findElement(selectorOrId);
        if (!el || el.type !== 'checkbox') {
            console.error(`[Edgenuity AI] Checkbox not found: ${selectorOrId}`);
            return false;
        }

        try {
            if (el.checked !== checked) {
                el.checked = checked;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.click(); // Some handlers only respond to click
            }

            console.log(`[Edgenuity AI] Set checkbox ${selectorOrId} to: ${checked}`);
            await sleep(delayAfter);
            return true;
        } catch (e) {
            console.error(`[Edgenuity AI] Failed to set checkbox:`, e);
            return false;
        }
    }

    // Select a radio button by name and value
    async function selectRadio(name, value, delayAfter = 100) {
        const targetDoc = getTargetDoc();

        // Find radio by name and value
        const radio = targetDoc.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`);

        if (!radio) {
            // Try finding by partial match or label text
            const radios = targetDoc.querySelectorAll(`input[type="radio"][name*="${CSS.escape(name)}"]`);
            for (const r of radios) {
                const label = findElement(`label[for="${r.id}"]`, targetDoc) || r.closest('label');
                if (label?.textContent?.toLowerCase().includes(value.toLowerCase())) {
                    r.checked = true;
                    r.dispatchEvent(new Event('change', { bubbles: true }));
                    r.click();
                    console.log(`[Edgenuity AI] Selected radio by label: ${label.textContent?.trim()}`);
                    await sleep(delayAfter);
                    return true;
                }
            }
            console.error(`[Edgenuity AI] Radio not found: name=${name}, value=${value}`);
            return false;
        }

        try {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.click();

            console.log(`[Edgenuity AI] Selected radio: ${name}=${value}`);
            await sleep(delayAfter);
            return true;
        } catch (e) {
            console.error(`[Edgenuity AI] Failed to select radio:`, e);
            return false;
        }
    }

    // Auto-fill answers based on AI response (parses structured answer format)
    async function autoFillAnswers(answers) {
        /*
         * Expected format:
         * {
         *   dropdowns: [{ selector: "...", value: "..." }, ...],
         *   inputs: [{ selector: "...", value: "..." }, ...],
         *   checkboxes: [{ selector: "...", checked: true/false }, ...],
         *   radios: [{ name: "...", value: "..." }, ...]
         * }
         */
        let filledCount = 0;

        // Fill dropdowns
        if (answers.dropdowns) {
            for (const dd of answers.dropdowns) {
                if (await selectOption(dd.selector || dd.id, dd.value)) {
                    filledCount++;
                }
                await sleep(150); // Small delay between actions
            }
        }

        // Fill text inputs
        if (answers.inputs) {
            for (const input of answers.inputs) {
                if (await fillInput(input.selector || input.id, input.value)) {
                    filledCount++;
                }
                await sleep(150);
            }
        }

        // Set checkboxes
        if (answers.checkboxes) {
            for (const cb of answers.checkboxes) {
                if (await setCheckbox(cb.selector || cb.id, cb.checked !== false)) {
                    filledCount++;
                }
                await sleep(150);
            }
        }

        // Select radios
        if (answers.radios) {
            for (const radio of answers.radios) {
                if (await selectRadio(radio.name, radio.value)) {
                    filledCount++;
                }
                await sleep(150);
            }
        }

        console.log(`[Edgenuity AI] Auto-filled ${filledCount} answer(s)`);
        return filledCount;
    }

    // =========================================
    // ENHANCED QUESTION & ELEMENT EXTRACTION
    // =========================================

    // Extract all interactive elements from a document (page or iframe)
    function extractInteractiveElements(doc) {
        const elements = {
            dropdowns: [],
            checkboxes: [],
            radioButtons: [],
            textInputs: [],
            textareas: [],
            buttons: [],
            images: [],
            graphs: [],
            tables: [],
            sliders: []
        };

        try {
            // === DROPDOWNS / SELECT ELEMENTS ===
            doc.querySelectorAll('select').forEach((select, idx) => {
                // Skip toolbar dropdowns (audio speed, highlighter, etc.)
                if (select.closest('.toolbar') ||
                    select.closest('.audio') ||
                    select.closest('[class*="tools-"]') ||
                    select.closest('li.dropdown') ||
                    select.getAttribute('data-bind')?.includes('audioSpeed') ||
                    select.getAttribute('tabindex') === '-1') {
                    return; // Skip this dropdown
                }

                // Clean option text - remove <br> tags and normalize whitespace
                const options = Array.from(select.options).map(opt => ({
                    value: opt.value,
                    text: (opt.textContent || '').replace(/\s+/g, ' ').trim(),
                    selected: opt.selected
                })).filter(opt => opt.text); // Filter out empty options

                // Get label with context for inline dropdowns
                let label = findLabelFor(doc, select);
                let sentenceContext = '';

                // If no explicit label found, try to extract inline context from parent paragraph/text
                if (!label) {
                    sentenceContext = getDropdownContext(select);
                    label = sentenceContext || `Dropdown ${idx + 1}`;
                }

                elements.dropdowns.push({
                    id: select.id || `dropdown-${idx}`,
                    name: select.name || '',
                    label: label,
                    options: options,
                    selectedValue: select.value,
                    selectedText: (select.options[select.selectedIndex]?.textContent || '').replace(/\s+/g, ' ').trim(),
                    context: sentenceContext // Store full sentence context
                });
            });

            // === CHECKBOXES ===
            doc.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
                const label = findLabelFor(doc, cb) || cb.closest('label')?.textContent?.trim() || `Checkbox ${idx + 1}`;
                elements.checkboxes.push({
                    id: cb.id || `checkbox-${idx}`,
                    name: cb.name || '',
                    label: label.replace(cb.value || '', '').trim(),
                    value: cb.value,
                    checked: cb.checked
                });
            });

            // === RADIO BUTTONS ===
            const radioGroups = {};
            doc.querySelectorAll('input[type="radio"]').forEach((radio, idx) => {
                const groupName = radio.name || `radio-group-${idx}`;
                if (!radioGroups[groupName]) {
                    radioGroups[groupName] = {
                        name: groupName,
                        options: [],
                        selectedValue: null
                    };
                }
                const label = findLabelFor(doc, radio) || radio.closest('label')?.textContent?.trim() || radio.value;
                radioGroups[groupName].options.push({
                    value: radio.value,
                    label: label,
                    id: radio.id,
                    checked: radio.checked
                });
                if (radio.checked) {
                    radioGroups[groupName].selectedValue = radio.value;
                }
            });
            elements.radioButtons = Object.values(radioGroups);

            // === TEXT INPUTS (fill in the blank) ===
            doc.querySelectorAll('input[type="text"], input[type="number"], input:not([type])').forEach((input, idx) => {
                // Skip hidden or very small inputs
                if (input.type === 'hidden' || input.offsetWidth < 10) return;
                const label = findLabelFor(doc, input) || input.placeholder || `Input ${idx + 1}`;
                const contextText = getInputContext(input);
                elements.textInputs.push({
                    id: input.id || `input-${idx}`,
                    name: input.name || '',
                    label: label,
                    placeholder: input.placeholder || '',
                    value: input.value || '',
                    type: input.type || 'text',
                    context: contextText
                });
            });

            // === TEXTAREAS (essay/long answer) ===
            doc.querySelectorAll('textarea').forEach((textarea, idx) => {
                const label = findLabelFor(doc, textarea) || textarea.placeholder || `Text Area ${idx + 1}`;
                elements.textareas.push({
                    id: textarea.id || `textarea-${idx}`,
                    name: textarea.name || '',
                    label: label,
                    placeholder: textarea.placeholder || '',
                    value: textarea.value || '',
                    rows: textarea.rows,
                    cols: textarea.cols
                });
            });

            // === IMAGES (may contain graphs, diagrams, etc) ===
            doc.querySelectorAll('img').forEach((img, idx) => {
                if (img.offsetWidth < 50 || img.offsetHeight < 50) return; // Skip tiny images/icons
                elements.images.push({
                    src: img.src || '',
                    alt: img.alt || '',
                    title: img.title || '',
                    width: img.naturalWidth || img.offsetWidth,
                    height: img.naturalHeight || img.offsetHeight,
                    parentText: img.closest('div, figure, p')?.textContent?.trim().substring(0, 100) || ''
                });
            });

            // === CANVAS ELEMENTS (often used for graphs) ===
            doc.querySelectorAll('canvas').forEach((canvas, idx) => {
                const parentEl = canvas.closest('div, figure');
                const labels = extractGraphLabels(parentEl || canvas.parentElement);
                elements.graphs.push({
                    type: 'canvas',
                    id: canvas.id || `canvas-${idx}`,
                    width: canvas.width,
                    height: canvas.height,
                    ...labels,
                    parentText: parentEl?.textContent?.trim().substring(0, 200) || ''
                });
            });

            // === SVG ELEMENTS (also used for graphs/charts) ===
            doc.querySelectorAll('svg').forEach((svg, idx) => {
                if (svg.offsetWidth < 100 || svg.offsetHeight < 50) return;
                const parentEl = svg.closest('div, figure');
                const labels = extractGraphLabels(parentEl || svg.parentElement);
                elements.graphs.push({
                    type: 'svg',
                    id: svg.id || `svg-${idx}`,
                    width: svg.getAttribute('width') || svg.offsetWidth,
                    height: svg.getAttribute('height') || svg.offsetHeight,
                    ...labels,
                    parentText: parentEl?.textContent?.trim().substring(0, 200) || ''
                });
            });

            // === TABLES ===
            doc.querySelectorAll('table').forEach((table, idx) => {
                const headers = [];
                const rows = [];
                table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td').forEach(th => {
                    headers.push(th.textContent?.trim() || '');
                });
                table.querySelectorAll('tbody tr, tr:not(:first-child)').forEach((tr, rowIdx) => {
                    if (rowIdx >= 10) return; // Limit rows
                    const row = [];
                    tr.querySelectorAll('td, th').forEach(cell => {
                        row.push(cell.textContent?.trim() || '');
                    });
                    if (row.length > 0) rows.push(row);
                });
                if (headers.length > 0 || rows.length > 0) {
                    elements.tables.push({
                        id: table.id || `table-${idx}`,
                        headers: headers,
                        rows: rows.slice(0, 10), // Limit to first 10 rows
                        caption: table.querySelector('caption')?.textContent?.trim() || ''
                    });
                }
            });

            // === SLIDERS / RANGE INPUTS ===
            doc.querySelectorAll('input[type="range"]').forEach((slider, idx) => {
                const label = findLabelFor(doc, slider) || `Slider ${idx + 1}`;
                elements.sliders.push({
                    id: slider.id || `slider-${idx}`,
                    label: label,
                    min: slider.min,
                    max: slider.max,
                    value: slider.value,
                    step: slider.step
                });
            });

            // === INTERACTIVE BUTTONS (may indicate actions like "Walk", "Reset", etc) ===
            doc.querySelectorAll('button, input[type="button"], .btn, [role="button"]').forEach((btn, idx) => {
                const text = btn.textContent?.trim() || btn.value || '';
                if (text && text.length < 50 && !text.toLowerCase().includes('submit')) {
                    elements.buttons.push({
                        text: text,
                        id: btn.id || '',
                        disabled: btn.disabled || false
                    });
                }
            });

        } catch (e) {
            console.error('[Edgenuity AI] Error extracting interactive elements:', e);
        }

        return elements;
    }

    // Find label associated with an input element
    function findLabelFor(doc, element) {
        if (element.id) {
            const label = doc.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent?.trim();
        }
        // Check parent label
        const parentLabel = element.closest('label');
        if (parentLabel) {
            // Remove the input text from label
            const clone = parentLabel.cloneNode(true);
            clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
            return clone.textContent?.trim();
        }
        // Check previous sibling
        const prev = element.previousElementSibling;
        if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
            return prev.textContent?.trim();
        }
        return null;
    }

    // Get context around an input (surrounding text)
    function getInputContext(input) {
        const parent = input.closest('p, div, span, td, li');
        if (!parent) return '';
        const text = parent.textContent?.trim() || '';
        // Replace the input placeholder with [___] for context
        return text.substring(0, 150);
    }

    // Get context around a dropdown (extract full sentence with blank placeholder)
    function getDropdownContext(select) {
        // Try to find the most specific parent containing this dropdown
        // Prioritize paragraph-level containers first (each sentence usually has its own <p>)
        let parent = select.closest('p');

        // If no paragraph, try other containers but be careful with form/div (may contain multiple dropdowns)
        if (!parent) {
            parent = select.closest('td, li, span.Practice_Question_Body');
        }

        // Last resort: try larger containers but try to find the specific sentence
        if (!parent) {
            parent = select.closest('div, form');
        }

        if (!parent) return '';

        // Clone to manipulate without affecting page
        const clone = parent.cloneNode(true);

        // Find THIS specific select in the clone using its unique identifiers
        let selectInClone = null;

        // Try to match by ID first (most reliable)
        if (select.id) {
            selectInClone = clone.querySelector(`#${CSS.escape(select.id)}`);
        }

        // Try by name
        if (!selectInClone && select.name) {
            selectInClone = clone.querySelector(`select[name="${CSS.escape(select.name)}"]`);
        }

        // Fallback: if parent is paragraph-level, there's likely only one select
        if (!selectInClone) {
            const selects = clone.querySelectorAll('select');
            if (selects.length === 1) {
                selectInClone = selects[0];
            }
        }

        if (selectInClone) {
            // Replace the select with a visible placeholder
            const placeholder = document.createElement('span');
            placeholder.textContent = '[BLANK]';
            selectInClone.replaceWith(placeholder);
        }

        // Replace any remaining selects with placeholders too (for context)
        clone.querySelectorAll('select').forEach(otherSelect => {
            const placeholder = document.createElement('span');
            placeholder.textContent = '[___]';
            otherSelect.replaceWith(placeholder);
        });

        // Clean up the text - remove extra whitespace and normalize
        let text = (clone.textContent || '').replace(/\s+/g, ' ').trim();

        // If text is too long, try to extract just the sentence containing the blank
        if (text.length > 200) {
            // Split by sentences and find the one with [BLANK]
            const sentences = text.split(/[.!?]+/).filter(s => s.trim());
            const sentenceWithBlank = sentences.find(s => s.includes('[BLANK]'));
            if (sentenceWithBlank) {
                text = sentenceWithBlank.trim();
            } else {
                // Just truncate
                text = text.substring(0, 200);
            }
        }

        return text;
    }

    // Extract graph axis labels and other visual information
    function extractGraphLabels(container) {
        if (!container) return {};

        const info = {
            xAxisLabel: '',
            yAxisLabel: '',
            title: '',
            legendItems: [],
            dataPoints: [],
            description: ''
        };

        try {
            const text = container.textContent || '';
            const parentText = container.parentElement?.textContent || '';
            const combinedText = text + ' ' + parentText;

            // Common Edgenuity graph axis patterns
            const xAxisPatterns = [
                /x[:\-\s]*axis[:\s]*([^\n,]+)/i,
                /horizontal[:\s]*([^\n]+)/i,
                /time\s*\(([^)]+)\)/i,
                /time\s+in\s+(\w+)/i,
                /(\w+)\s+\(seconds?\)/i,
                /(\w+)\s+\(s\)/i
            ];
            const yAxisPatterns = [
                /y[:\-\s]*axis[:\s]*([^\n,]+)/i,
                /vertical[:\s]*([^\n]+)/i,
                /distance\s*\(([^)]+)\)/i,
                /distance\s+in\s+(\w+)/i,
                /(\w+)\s+\(centimeters?\)/i,
                /(\w+)\s+\(cm\)/i,
                /(\w+)\s+\(meters?\)/i,
                /(\w+)\s+\(m\)/i
            ];

            // Try explicit axis patterns first
            for (const pattern of xAxisPatterns) {
                const match = combinedText.match(pattern);
                if (match && !info.xAxisLabel) {
                    info.xAxisLabel = match[1]?.trim() || match[0];
                    break;
                }
            }

            for (const pattern of yAxisPatterns) {
                const match = combinedText.match(pattern);
                if (match && !info.yAxisLabel) {
                    info.yAxisLabel = match[1]?.trim() || match[0];
                    break;
                }
            }

            // Try to find labeled elements
            container.querySelectorAll('.x-axis-label, .y-axis-label, [class*="axis"], [class*="label"], text').forEach(el => {
                const labelText = el.textContent?.trim() || '';
                if (labelText.length < 50) {
                    if ((labelText.toLowerCase().includes('time') || labelText.toLowerCase().includes('second')) && !info.xAxisLabel) {
                        info.xAxisLabel = labelText;
                    } else if ((labelText.toLowerCase().includes('distance') || labelText.toLowerCase().includes('meter') || labelText.toLowerCase().includes('cm')) && !info.yAxisLabel) {
                        info.yAxisLabel = labelText;
                    }
                }
            });

            // Default labels based on content patterns
            if (!info.xAxisLabel && combinedText.toLowerCase().includes('second')) {
                info.xAxisLabel = 'Time (seconds)';
            }
            if (!info.yAxisLabel && combinedText.toLowerCase().includes('centimeter')) {
                info.yAxisLabel = 'Distance (centimeters)';
            }

            // Look for title
            const titleEl = container.querySelector('h1, h2, h3, h4, .title, .chart-title, [class*="title"]');
            if (titleEl) {
                info.title = titleEl.textContent?.trim().substring(0, 100) || '';
            }

            // Look for legend items
            container.querySelectorAll('.legend-item, .legend, [class*="legend"]').forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length < 50) {
                    info.legendItems.push(text);
                }
            });

            // Try to extract numbers that might be data points from visible text
            // Focus on numbers that appear in sequence (likely axis labels or data)
            const numbers = combinedText.match(/\b\d+\.?\d*\b/g) || [];
            info.dataPoints = [...new Set(numbers)].slice(0, 25).map(n => parseFloat(n));

            // Look for description or instructions near the graph
            const nearbyText = container.parentElement?.querySelector('p, .description, .instruction, .prompt');
            if (nearbyText) {
                info.description = nearbyText.textContent?.trim().substring(0, 200) || '';
            }

            // Also capture any text that might describe the graph context
            const descPatterns = [
                /walk the turtle/i,
                /analyze the.*graph/i,
                /observe the.*relationship/i,
                /the graph shows/i,
                /based on the graph/i
            ];
            for (const pattern of descPatterns) {
                const match = combinedText.match(new RegExp('.*' + pattern.source + '.*', 'i'));
                if (match && !info.description) {
                    info.description = match[0].trim().substring(0, 200);
                    break;
                }
            }

        } catch (e) {
            console.error('[Edgenuity AI] Error extracting graph labels:', e);
        }

        return info;
    }

    // Format interactive elements into readable context for AI
    function formatInteractiveContext(elements) {
        let context = '';

        // Dropdowns
        if (elements.dropdowns.length > 0) {
            context += '\n\n📋 DROPDOWN MENUS (fill in the blank):\n';
            elements.dropdowns.forEach((dd, idx) => {
                const optionsList = dd.options.map(o => o.text).filter(t => t).join(', ');

                // If we have sentence context, show the full sentence with the blank
                if (dd.context && dd.context.includes('[BLANK]')) {
                    context += `• Dropdown (ID: "${dd.id}") "${dd.context}"\n`;
                    context += `  Available options: [${optionsList}]`;
                } else {
                    context += `• "${dd.label}" (ID: "${dd.id}"): Options are [${optionsList}]`;
                }

                if (dd.selectedText) context += ` (currently selected: "${dd.selectedText}")`;
                context += '\n';
            });
        }

        // Radio buttons
        if (elements.radioButtons.length > 0) {
            context += '\n📻 MULTIPLE CHOICE OPTIONS:\n';
            elements.radioButtons.forEach(group => {
                context += `• ${group.name}:\n`;
                group.options.forEach((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const marker = opt.checked ? '●' : '○';
                    context += `  ${marker} ${letter}) ${opt.label} (ID: "${opt.id}"${!opt.id ? ', use label' : ''})\n`;
                });
            });
        }

        // Checkboxes
        if (elements.checkboxes.length > 0) {
            context += '\n☑️ CHECKBOXES (select all that apply):\n';
            elements.checkboxes.forEach(cb => {
                const marker = cb.checked ? '☑' : '☐';
                context += `  ${marker} ${cb.label} (ID: "${cb.id}")\n`;
            });
        }

        // Text inputs (fill in the blank)
        if (elements.textInputs.length > 0) {
            context += '\n✏️ FILL IN THE BLANK:\n';
            elements.textInputs.forEach(input => {
                context += `• ${input.label || input.context || 'Input field'} (ID: "${input.id}")`;
                if (input.value) context += ` (current: "${input.value}")`;
                if (input.placeholder) context += ` [hint: ${input.placeholder}]`;
                context += '\n';
            });
        }

        // Textareas (essay/long answer)
        if (elements.textareas.length > 0) {
            context += '\n📝 ESSAY/LONG ANSWER:\n';
            elements.textareas.forEach(ta => {
                context += `• ${ta.label || 'Text area'} (ID: "${ta.id}")`;
                if (ta.placeholder) context += ` [hint: ${ta.placeholder}]`;
                context += '\n';
            });
        }

        // Tables
        if (elements.tables.length > 0) {
            context += '\n📊 TABLES:\n';
            elements.tables.forEach(table => {
                if (table.caption) context += `Table: ${table.caption}\n`;
                if (table.headers.length > 0) {
                    context += `Headers: ${table.headers.join(' | ')}\n`;
                }
                table.rows.slice(0, 5).forEach(row => {
                    context += `Row: ${row.join(' | ')}\n`;
                });
            });
        }

        // Graphs/Charts
        if (elements.graphs.length > 0) {
            context += '\n📈 GRAPHS/CHARTS:\n';
            elements.graphs.forEach(graph => {
                context += `• Graph type: ${graph.type}`;
                if (graph.title) context += `, Title: "${graph.title}"`;
                context += '\n';
                if (graph.description) context += `  Description: ${graph.description}\n`;
                if (graph.xAxisLabel) context += `  X-axis: ${graph.xAxisLabel}\n`;
                if (graph.yAxisLabel) context += `  Y-axis: ${graph.yAxisLabel}\n`;
                if (graph.legendItems?.length > 0) {
                    context += `  Legend: ${graph.legendItems.join(', ')}\n`;
                }
                if (graph.dataPoints?.length > 0) {
                    // Sort and show more data points for better context
                    const sortedPoints = [...graph.dataPoints].sort((a, b) => a - b);
                    context += `  Visible values on graph: ${sortedPoints.slice(0, 15).join(', ')}`;
                    if (sortedPoints.length > 15) context += '...';
                    context += '\n';
                }
                if (graph.parentText && !graph.description) {
                    context += `  Context: ${graph.parentText}\n`;
                }
            });
        }

        // Images (may contain diagrams)
        if (elements.images.length > 0) {
            context += '\n🖼️ IMAGES/DIAGRAMS:\n';
            elements.images.forEach(img => {
                if (img.alt || img.title) {
                    context += `• ${img.alt || img.title}`;
                } else {
                    context += `• Image (${img.width}x${img.height})`;
                }
                if (img.parentText) context += `: ${img.parentText}`;
                context += '\n';
            });
        }

        // Interactive buttons
        if (elements.buttons.length > 0) {
            const actionButtons = elements.buttons.filter(b =>
                !['next', 'previous', 'back', 'close', 'cancel'].includes(b.text.toLowerCase())
            );
            if (actionButtons.length > 0) {
                context += '\n🔘 INTERACTIVE BUTTONS:\n';
                actionButtons.forEach(btn => {
                    context += `• [${btn.text}]${btn.disabled ? ' (disabled)' : ''}\n`;
                });
            }
        }

        // Sliders
        if (elements.sliders.length > 0) {
            context += '\n🎚️ SLIDERS:\n';
            elements.sliders.forEach(slider => {
                context += `• ${slider.label}: range ${slider.min}-${slider.max}, current: ${slider.value}\n`;
            });
        }

        return context;
    }

    // UI elements to exclude from extraction (Edgenuity navigation/chrome)
    const EXCLUDED_SELECTORS = [
        '#eNotesBox', '.enotes-panel', '#enotes-container',
        '#glossaryBox', '.glossary-panel', '#glossary-container',
        '#transcriptBox', '.transcript-panel', '#transcript-container',
        '#chatBox', '.chat-panel', '.tutor-chat',
        '#toolbarBox', '.toolbar-container', '.top-toolbar',
        '.nav-panel', '.navigation', '#navigation',
        '.header-container', '.footer-container',
        '.progress-bar', '.progress-container',
        '.close-button', '.minimize-button',
        '#video-player', '.video-container:not(.question-container)',
        '.side-panel', '.sidebar',
        '[class*="menu"]', '[class*="Menu"]',
        '.modal', '.popup', '.overlay:not(.solve-overlay)',
        '[role="navigation"]', '[role="toolbar"]',
        '.breadcrumb', '.tabs-container',
        '#edgenuity-ai-solve-btn', '#edgenuity-ai-overlay'
    ];

    // Common UI text patterns to remove
    const UI_TEXT_PATTERNS = [
        /^\s*eNotes?\s*$/gim,
        /^\s*Glossary\s*$/gim,
        /^\s*Transcript\s*$/gim,
        /^\s*Chat with a Tutor\s*$/gim,
        /^\s*(Save|Delete|Close|Cancel|Next|Previous|Back|Done|Submit)\s*$/gim,
        /^\s*Intro\s*$/gim,
        /^\s*Final\s*$/gim,
        /^\s*Hint\s*$/gim,
        /^\s*(Mark as Complete|Instruction|Warm-?Up|Summary)\s*$/gim,
        /^\s*\d+%\s*$/gm,
        /Click here to/gi,
        /Tap here to/gi,
        /^\s*◀.*▶\s*$/gm,
        /^\s*← →\s*$/gm
    ];

    // Clean question text by removing UI noise
    function cleanQuestionText(text) {
        let cleaned = text;

        // Remove UI text patterns
        UI_TEXT_PATTERNS.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });

        // Remove multiple consecutive newlines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        // Remove leading/trailing whitespace from each line
        cleaned = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

        // Remove very short lines that are likely UI elements
        cleaned = cleaned.split('\n').filter(line => {
            const trimmed = line.trim();
            // Keep lines that are longer than 3 chars OR contain question marks/numbers
            return trimmed.length > 3 || /[?0-9]/.test(trimmed);
        }).join('\n');

        return cleaned.trim();
    }

    // Extract question from the page with enhanced element recognition
    function extractQuestion() {
        // Priority selectors for Edgenuity content (most specific first)
        const contentSelectors = [
            '#stageFrame',                    // Main content iframe
            'iframe[name="stageFrame"]',
            'iframe.stage-frame',
            '#contentFrame',
            '.stage-content',
            '.activity-container',
            '.assessment-player-question',
            '.question-container',
            '.question-content',
            '.question-stem',
            '.prompt-container',
            '.instruction-content',
            '.activity-content',
            '[class*="question"]',
            '.ql-editor'
        ];

        let questionText = '';
        let allElements = {
            dropdowns: [],
            checkboxes: [],
            radioButtons: [],
            textInputs: [],
            textareas: [],
            buttons: [],
            images: [],
            graphs: [],
            tables: [],
            sliders: []
        };

        // Function to check if element should be excluded
        function shouldExcludeElement(el) {
            // Check if element matches any excluded selector
            for (const excludeSelector of EXCLUDED_SELECTORS) {
                if (el.matches && el.matches(excludeSelector)) return true;
                if (el.closest && el.closest(excludeSelector)) return true;
            }
            return false;
        }

        // Function to extract content from a document, excluding UI elements
        function extractContentFromDoc(doc, isIframe = false) {
            let content = '';

            // First, try to find specific content containers
            for (const selector of contentSelectors) {
                if (selector.includes('iframe') || selector.includes('Frame')) continue;

                try {
                    const elements = doc.querySelectorAll(selector);
                    for (const el of elements) {
                        if (!shouldExcludeElement(el)) {
                            const text = el.innerText || el.textContent || '';
                            if (text.length > content.length) {
                                content = text;
                            }
                        }
                    }
                } catch (e) {
                    console.log('[Edgenuity AI] Error with selector:', selector, e);
                }
            }

            // If no specific container found, try to get body content minus excluded elements
            if (!content || content.length < 20) {
                // Clone the body to avoid modifying the actual page
                const bodyClone = doc.body?.cloneNode(true);
                if (bodyClone) {
                    // Remove excluded elements from the clone
                    EXCLUDED_SELECTORS.forEach(selector => {
                        try {
                            const excludeEls = bodyClone.querySelectorAll(selector);
                            excludeEls.forEach(el => el.remove());
                        } catch (e) {
                            // Invalid selector, skip
                        }
                    });
                    content = bodyClone.innerText || bodyClone.textContent || '';
                }
            }

            return content;
        }

        // First, try to access iframes (prioritize stageFrame)
        const iframeSelectors = ['#stageFrame', 'iframe[name="stageFrame"]', 'iframe.stage-frame', '#contentFrame', 'iframe'];
        let foundIframeContent = false;

        for (const selector of iframeSelectors) {
            const iframes = document.querySelectorAll(selector);
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        const iframeContent = extractContentFromDoc(iframeDoc, true);
                        if (iframeContent && iframeContent.length > 50) {
                            questionText = iframeContent;
                            foundIframeContent = true;

                            // Extract interactive elements from iframe
                            const iframeElements = extractInteractiveElements(iframeDoc);
                            mergeElements(allElements, iframeElements);

                            console.log('[Edgenuity AI] Extracted content from iframe:', selector);
                            break;
                        }
                    }
                } catch (e) {
                    console.log('[Edgenuity AI] Cannot access iframe (cross-origin):', selector, e.message);
                }
            }
            if (foundIframeContent) break;
        }

        // Also extract from main document but only interactive elements (not text to avoid noise)
        const mainElements = extractInteractiveElements(document);

        // Only include main document elements if they seem relevant (not navigation)
        ['dropdowns', 'checkboxes', 'radioButtons', 'textInputs', 'graphs', 'tables', 'sliders'].forEach(key => {
            mainElements[key]?.forEach(el => {
                // Filter out dropdown items that look like navigation (eNotes, glossary options, etc)
                if (key === 'dropdowns') {
                    const navLabels = ['notes', 'glossary', 'transcript', 'font', 'size', 'theme'];
                    if (!navLabels.some(nav => (el.label || '').toLowerCase().includes(nav))) {
                        allElements[key].push(el);
                    }
                } else if (key === 'buttons') {
                    // Skip navigation buttons
                    const navButtons = ['save', 'delete', 'close', 'minimize', 'maximize', 'next', 'previous', 'back'];
                    if (!navButtons.some(nav => (el.text || '').toLowerCase().includes(nav))) {
                        allElements[key].push(el);
                    }
                } else {
                    allElements[key].push(el);
                }
            });
        });

        // If no iframe content found, extract from main document
        if (!foundIframeContent || questionText.length < 50) {
            const mainContent = extractContentFromDoc(document, false);
            if (mainContent && mainContent.length > questionText.length) {
                questionText = mainContent;
            }
        }

        // Fallback: if still too short, try specific content areas
        if (!questionText || questionText.length < 30) {
            const fallbackSelectors = [
                'main', '.main-content', '#main-content',
                '.content', '#content',
                '.player-content', '.lesson-content'
            ];
            for (const selector of fallbackSelectors) {
                const el = document.querySelector(selector);
                if (el && !shouldExcludeElement(el)) {
                    const text = el.innerText || '';
                    if (text.length > questionText.length) {
                        questionText = text;
                    }
                }
            }
        }

        // Clean up the question text
        questionText = cleanQuestionText(questionText);

        // Limit length
        questionText = questionText.substring(0, 3000);

        // Add interactive elements context
        const interactiveContext = formatInteractiveContext(allElements);
        if (interactiveContext) {
            questionText += '\n\n=== INTERACTIVE ELEMENTS ON PAGE ===' + interactiveContext;
        }

        // Add instruction for how to respond
        questionText += '\n\n=== INSTRUCTIONS ===\n';
        questionText += 'Based on the question and interactive elements above, provide:\n';
        questionText += '1. The correct answer(s) for each input field, dropdown, or checkbox\n';
        questionText += '2. Brief explanation of why\n';
        questionText += '3. If there are graphs, describe what you observe and how it relates to the answer\n';

        return questionText;
    }


    // Helper to merge element objects
    function mergeElements(target, source) {
        for (const key of Object.keys(target)) {
            if (source[key] && Array.isArray(source[key])) {
                target[key].push(...source[key]);
            }
        }
    }

    // Detect if question should use screenshot-based solving
    // Returns true if the question has significant visual/interactive elements
    function shouldUseScreenshot(elements, questionText) {
        // Count interactive elements
        const interactiveCount =
            elements.dropdowns.length +
            elements.graphs.length +
            elements.images.length +
            elements.sliders.length;

        // Check for canvas/SVG elements (often graphs)
        const hasCanvasOrSvg = elements.graphs.some(g => g.type === 'canvas' || g.type === 'svg');

        // Check if question text is mostly UI noise (short with lots of elements)
        const textLength = questionText.replace(/=== .* ===/g, '').trim().length;
        const isMostlyInteractive = textLength < 200 && interactiveCount > 0;

        // Use screenshot if:
        // 1. Has dropdowns, graphs, or sliders
        // 2. Has canvas/SVG elements
        // 3. Has images that might be diagrams
        // 4. Question text is very short but has interactive elements
        const hasSignificantImages = elements.images.filter(img =>
            img.width > 100 && img.height > 100 &&
            !img.src.includes('icon') && !img.src.includes('button')
        ).length > 0;

        const shouldUse =
            elements.dropdowns.length > 0 ||
            hasCanvasOrSvg ||
            elements.sliders.length > 0 ||
            hasSignificantImages ||
            isMostlyInteractive;

        console.log(`[Edgenuity AI] Screenshot detection: dropdowns=${elements.dropdowns.length}, graphs=${elements.graphs.length}, images=${elements.images.length}, sliders=${elements.sliders.length}, textLen=${textLength}, useScreenshot=${shouldUse}`);

        return shouldUse;
    }

    // Capture screenshot via background script
    async function captureScreenshot() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.dataUrl);
                } else {
                    reject(new Error(response?.error || 'Failed to capture screenshot'));
                }
            });
        });
    }

    // Handle solve button click
    async function handleSolveClick() {
        await solveCurrentQuestion(false);
    }

    // Solve the current question (auto or manual)
    async function solveCurrentQuestion(isAuto = false) {
        if (!settings.apiKey) {
            if (!isAuto) {
                showOverlay('⚠️ Please set your OpenRouter API key in the extension popup!', true);
            }
            return;
        }

        // Show loading state
        if (solveButton) solveButton.classList.add('loading');

        // If auto-solving, show overlay immediately with loading state
        if (isAuto) {
            showOverlay('🤖 Analyze & Identifying Question...', false, 'Auto-solving...');
        }

        try {
            // First, extract elements to determine solving method
            const elements = {
                dropdowns: [],
                checkboxes: [],
                radioButtons: [],
                textInputs: [],
                textareas: [],
                buttons: [],
                images: [],
                graphs: [],
                tables: [],
                sliders: []
            };

            // Extract from iframes
            const iframes = document.querySelectorAll('#stageFrame, iframe[name="stageFrame"], iframe');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        const iframeElements = extractInteractiveElements(iframeDoc);
                        mergeElements(elements, iframeElements);
                    }
                } catch (e) {
                    // Cross-origin iframe
                }
            }

            // Also extract from main document
            const mainElements = extractInteractiveElements(document);
            // Filter out navigation elements
            ['dropdowns', 'graphs', 'images', 'sliders'].forEach(key => {
                mainElements[key]?.forEach(el => {
                    const navLabels = ['notes', 'glossary', 'transcript', 'font', 'size', 'theme'];
                    const isNav = key === 'dropdowns' && navLabels.some(nav => (el.label || '').toLowerCase().includes(nav));
                    if (!isNav) {
                        elements[key].push(el);
                    }
                });
            });

            // Extract full question text for context
            const questionText = extractQuestion();

            if (!questionText || questionText.length < 10) {
                showOverlay('❌ Could not find a question on this page. Try scrolling to the question first.', true);
                return;
            }

            // Determine solving method
            const useScreenshot = shouldUseScreenshot(elements, questionText);
            let result;
            let modelInfo;

            if (useScreenshot) {
                console.log('[Edgenuity AI] Using screenshot-based solving (visual/interactive content detected)');

                // Hide overlay momentarily so it doesn't block the screenshot
                if (responseOverlay) responseOverlay.classList.remove('visible');
                await sleep(100); // Give it a moment to disappear

                // Capture screenshot
                const screenshotDataUrl = await captureScreenshot();

                // Restore overlay (if auto-solving)
                if (isAuto) {
                    showOverlay('🤖 Analyze & Identifying Question...', false, 'Auto-solving...');
                } else if (solveButton) {
                    // If manual, we still want to show something is happening
                    showOverlay('📸 Screenshot captured. Analyzing...', false, 'Vision Processing...');
                }

                // Build additional context from interactive elements
                let additionalContext = 'Please analyze this Edgenuity question screenshot.\n\n';

                // Include dropdown info so AI knows available options
                if (elements.dropdowns.length > 0) {
                    additionalContext += 'DROPDOWN FILL-IN-THE-BLANK QUESTIONS:\n';
                    elements.dropdowns.forEach((dd, idx) => {
                        const opts = dd.options.map(o => o.text).filter(t => t).join(', ');
                        // Include sentence context if available
                        if (dd.context && dd.context.includes('[BLANK]')) {
                            additionalContext += `• Dropdown ${idx + 1}: "${dd.context}"\n`;
                            additionalContext += `  Options: [${opts}]\n`;
                        } else {
                            additionalContext += `• "${dd.label}": [${opts}]\n`;
                        }
                    });
                    additionalContext += '\n';
                }

                // Include any detected table data
                if (elements.tables.length > 0) {
                    additionalContext += 'TABLE DATA:\n';
                    elements.tables.forEach(table => {
                        if (table.headers.length > 0) {
                            additionalContext += `Headers: ${table.headers.join(' | ')}\n`;
                        }
                        table.rows.slice(0, 5).forEach(row => {
                            additionalContext += `${row.join(' | ')}\n`;
                        });
                    });
                    additionalContext += '\n';
                }

                additionalContext += 'Provide the correct answer(s) and explain why.';

                result = await api.solveWithScreenshot(screenshotDataUrl, additionalContext);

                const visionModel = window.EDGENUITY_CONFIG.MODELS.vision;
                modelInfo = `${visionModel.icon} ${visionModel.name} (Screenshot)`;
            } else {
                console.log('[Edgenuity AI] Using text-based solving (mostly text content)');

                // Detect question type for auto-selection
                let questionType = 'default';
                let modelKey = settings.selectedModel || 'balanced';

                if (settings.autoDetectQuestionType) {
                    questionType = api.detectQuestionType(questionText);
                    // Auto-select best model for question type
                    if (questionType === 'math') modelKey = 'math';
                    else if (questionType === 'writing') modelKey = 'writing';
                    else if (questionType === 'science') modelKey = 'reasoning';
                }

                console.log(`[Edgenuity AI] Solving with model: ${modelKey}, type: ${questionType}`);

                result = await api.solveQuestion(questionText, questionType, modelKey);

                const model = window.EDGENUITY_CONFIG.MODELS[modelKey];
                modelInfo = `${model.icon} ${model.name}`;
                if (result.wasHumanized) {
                    modelInfo += ' ✨ Humanized';
                }
            }

            if (result.success) {
                showOverlay(result.content, false, modelInfo);

                // Add to history
                const historyQuestion = useScreenshot ? '[Screenshot Question]' : questionText;
                await addToHistory(historyQuestion, result.content, modelInfo);

                // Update stats
                updateStats();

                // If auto-solving, try to auto-fill (future enhancement)
                // For now, just having the answer visible is enough
            } else {
                showOverlay(`❌ Error: ${result.error}`, true);
            }
        } catch (error) {
            console.error('[Edgenuity AI] Error:', error);
            showOverlay(`❌ Error: ${error.message}`, true);
        } finally {
            if (solveButton) solveButton.classList.remove('loading');
        }
    }

    // Show the response overlay
    function showOverlay(content, isError = false, modelInfo = '') {
        if (!responseOverlay) {
            console.warn('[Edgenuity AI] Cannot show overlay - UI not initialized (likely running in iframe)');
            return;
        }

        const answerDiv = responseOverlay.querySelector('.eai-answer');
        const modelDiv = responseOverlay.querySelector('.eai-model-info');

        answerDiv.innerHTML = formatResponse(content);
        answerDiv.classList.toggle('error', isError);
        modelDiv.textContent = modelInfo;

        responseOverlay.classList.add('visible');
    }

    // Hide the overlay
    function hideOverlay() {
        responseOverlay.classList.remove('visible');
    }

    // Format the AI response with markdown-like styling
    function formatResponse(text) {
        return text
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Line breaks
            .replace(/\n/g, '<br>')
            // Lists
            .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
            // Numbered lists
            .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    }

    // Copy answer to clipboard
    async function copyAnswer() {
        const answerDiv = responseOverlay.querySelector('.eai-answer');
        const text = answerDiv.innerText || answerDiv.textContent;

        try {
            await navigator.clipboard.writeText(text);
            const copyBtn = responseOverlay.querySelector('.eai-copy-btn');
            copyBtn.textContent = '✓';
            setTimeout(() => copyBtn.textContent = '📋', 1500);
        } catch (err) {
            console.error('[Edgenuity AI] Failed to copy:', err);
        }
    }

    // Update solved questions stats
    function updateStats() {
        chrome.storage.sync.get({ solvedCount: 0, lastSolvedDate: '' }, (result) => {
            const today = new Date().toDateString();
            let count = result.solvedCount;

            if (result.lastSolvedDate !== today) {
                count = 0; // Reset daily count
            }

            chrome.storage.sync.set({
                solvedCount: count + 1,
                lastSolvedDate: today
            });
        });
    }

    // Auto-skip functionality
    let autoSkipEnabled = false;
    let videoEndCheckInterval = null;
    let lastVideoState = null;
    let isSkipping = false;
    let lastSkipAttemptTime = 0;
    const SKIP_COOLDOWN = 5000;

    function setupAutoSkip() {
        if (autoSkipEnabled) return;
        autoSkipEnabled = true;
        console.log('[Edgenuity AI] Auto-skip enabled');
        console.log('[Edgenuity AI] Setting up auto-skip...');
        setupVideoMonitor();
        setupIframeMonitor();
        setupKnockoutMonitor();
        setupActivityCompletionMonitor();
    }

    // Auto-solve functionality
    let autoSolveEnabled = false;
    let autoSolveObserver = null;
    let lastSolvedTextHash = '';

    function setupAutoSolve() {
        if (autoSolveEnabled) return;
        autoSolveEnabled = true;
        console.log('[Edgenuity AI] Auto-solve enabled');

        // Monitor for new questions
        setupAutoSolveMonitor();
    }

    // Hash function for text to detect duplicates
    function hashText(text) {
        let hash = 0;
        if (text.length === 0) return hash;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    // Check if the current activity is already completed
    function isActivityCompleted() {
        // Check 1: Activity status element (Most reliable)
        // If it explicitly says "Active", then it is NOT completed (regardless of grade bar)
        const activityStatusEl = document.querySelector('#activity-status');
        if (activityStatusEl) {
            const statusText = (activityStatusEl.innerText || activityStatusEl.textContent || '').toLowerCase().trim();
            if (statusText === 'active' || statusText === 'in progress') {
                return false;
            }
            if (statusText === 'completed' || statusText === 'submitted') {
                return true;
            }
        }

        // Check 2: Check within stage frame for completion text (High reliability)
        const stageFrame = document.querySelector('#stageFrame');
        if (stageFrame) {
            try {
                const frameDoc = stageFrame.contentDocument || stageFrame.contentWindow?.document;
                if (frameDoc) {
                    const bodyText = (frameDoc.body?.innerText || '').toLowerCase();
                    // Be more specific to avoid false matching on instructions
                    if (bodyText.includes('you have completed the') ||
                        bodyText.includes('activity complete') ||
                        bodyText.includes('lesson complete')) {
                        return true;
                    }
                }
            } catch (e) { }
        }

        // Check 3: Grade bar status (Lowest reliability, can be "Completed" while reviewing)
        // We only check this if status is NOT "Active"
        const gradeSpan = document.querySelector('.gradebar .grade');
        if (gradeSpan) {
            const gradeText = (gradeSpan.innerText || gradeSpan.textContent || '').toLowerCase().trim();
            if (gradeText === 'completed' || gradeText === '100% complete') {
                // If we didn't find "Active" above, we assume it's done
                return true;
            }
        }

        return false;
    }

    function setupAutoSolveMonitor() {
        // Use MutationObserver to detect when question content changes
        if (autoSolveObserver) return;

        let debounceTimeout = null;

        const checkForQuestion = async () => {
            if (!settings.autoSolve) return;

            // Check if activity is completed
            if (isActivityCompleted()) {
                console.log('[Edgenuity AI] Activity appears completed, skipping auto-solve');
                return;
            }

            // Wait a moment for dynamic content to settle
            await sleep(1000);

            const questionText = extractQuestion();
            if (questionText && questionText.length > 20) {
                const currentHash = hashText(questionText);

                // Only solve if it's a new question
                if (currentHash !== lastSolvedTextHash) {
                    console.log('[Edgenuity AI] New question detected for auto-solve');
                    lastSolvedTextHash = currentHash;
                    // Wait a bit more to ensure full load
                    await sleep(1000);
                    solveCurrentQuestion(true);
                }
            }
        };

        autoSolveObserver = new MutationObserver((mutations) => {
            // Filter out trivial mutations
            const meaningful = mutations.some(m =>
                m.target.id !== 'edgenuity-ai-solve-btn' &&
                m.target.id !== 'edgenuity-ai-overlay' &&
                !m.target.classList?.contains('eai-loading')
            );

            if (meaningful) {
                if (debounceTimeout) clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(checkForQuestion, 2000);
            }
        });

        // Observe the body or specific content containers
        const target = document.querySelector('#stageFrame') || document.body;
        if (target) {
            autoSolveObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log('[Edgenuity AI] Auto-solve monitor started');
        }

        // Also check immediately
        checkForQuestion();
    }

    function teardownAutoSkip() {
        if (videoEndCheckInterval) clearInterval(videoEndCheckInterval);
        // We can't easily remove anonymous event listeners or observers without storing references
        // simpler to just let them run but have them check settings.autoSkipOnFinish
        console.log('[Edgenuity AI] Auto-skip disabled');
    }

    // Setup listener for auto-skip commands in iframes
    function setupIframeAutoSkipListener() {
        console.log('[Edgenuity AI] Setting up iframe auto-skip listener');

        // Listen for messages from parent frame
        window.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'eai-click-next') {
                console.log('[Edgenuity AI] Received click-next message in iframe');

                // Try to find and click next button locally
                const clicked = await clickNextButtonLocal();

                if (clicked) {
                    console.log('[Edgenuity AI] Successfully clicked next button in iframe');
                }
            }
        });

        // Also try to call API.FrameChain if the iframe has access to it
        // Some Edgenuity frames expose this API
    }

    // Click next button within the current frame only (for iframe use)
    async function clickNextButtonLocal() {
        // Check for FrameChain API first using page context injection
        if (await injectFrameChainCall()) {
            return true;
        }

        // Look for next button in this frame
        const nextButtonSelectors = [
            '.FrameRight',
            'li.FrameRight',
            '[onclick*="nextFrame"]',
            '[onclick*="FrameChain.nextFrame"]',
            '#footerNextActivity',
            '.footerNextActivity',
            'button[aria-label="Next"]',
            '.next-button',
            '.nav-next'
        ];

        for (const selector of nextButtonSelectors) {
            try {
                const btn = document.querySelector(selector);
                if (btn && isVisibleElement(btn)) {
                    console.log('[Edgenuity AI] Found next button in iframe:', selector);
                    btn.click();
                    return true;
                }
            } catch (e) { }
        }

        // Search by text content
        const allButtons = document.querySelectorAll('button, a, li[onclick], [role="button"]');
        for (const btn of allButtons) {
            if (!isVisibleElement(btn)) continue;
            const text = (btn.innerText || btn.textContent || '').toLowerCase().trim();
            if (text === 'next' || text === 'go right' || text === 'next >' || text === 'continue') {
                console.log('[Edgenuity AI] Found next button by text in iframe:', text);
                btn.click();
                return true;
            }
        }

        return false;
    }

    // Setup video completion monitoring
    function setupVideoMonitor() {
        // Check for HTML5 video elements
        const checkVideos = () => {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (!video.dataset.eaiMonitored) {
                    video.dataset.eaiMonitored = 'true';
                    video.addEventListener('ended', handleVideoEnded);
                    console.log('[Edgenuity AI] Monitoring video element');
                }
            });
        };

        // Initial check
        checkVideos();

        // Periodically check for new videos (Edgenuity loads dynamically)
        videoEndCheckInterval = setInterval(checkVideos, 5000);
    }

    // Setup iframe monitoring for embedded video players
    function setupIframeMonitor() {
        const checkIframes = () => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc && !iframe.dataset.eaiMonitored) {
                        iframe.dataset.eaiMonitored = 'true';

                        // Check for videos inside iframe
                        const iframeVideos = iframeDoc.querySelectorAll('video');
                        iframeVideos.forEach(video => {
                            if (!video.dataset.eaiMonitored) {
                                video.dataset.eaiMonitored = 'true';
                                video.addEventListener('ended', handleVideoEnded);
                                console.log('[Edgenuity AI] Monitoring iframe video');
                            }
                        });

                        // Listen for video additions in iframe
                        const iframeObserver = new MutationObserver(() => {
                            const newVideos = iframeDoc.querySelectorAll('video');
                            newVideos.forEach(video => {
                                if (!video.dataset.eaiMonitored) {
                                    video.dataset.eaiMonitored = 'true';
                                    video.addEventListener('ended', handleVideoEnded);
                                }
                            });
                        });

                        iframeObserver.observe(iframeDoc.body || iframeDoc, {
                            childList: true,
                            subtree: true
                        });
                    }
                } catch (e) {
                    // Cross-origin iframe, can't access
                }
            });
        };

        checkIframes();
        setInterval(checkIframes, 5000);
    }

    // Setup Knockout.js viewmodel monitoring for Edgenuity
    function setupKnockoutMonitor() {
        // Edgenuity uses Knockout.js - we can try to subscribe to their viewmodel
        const checkKnockout = () => {
            try {
                // Check if Knockout is available
                const ko = window.ko;
                if (!ko) return;

                // Try to get the root viewmodel from #activity-status or similar bound element
                const activityStatusEl = document.querySelector('#activity-status');
                if (activityStatusEl) {
                    const context = ko.contextFor(activityStatusEl);
                    if (context && context.$root) {
                        const root = context.$root;

                        // Subscribe to stageView().ActivityName or similar observables
                        if (root.stageView && typeof root.stageView === 'function') {
                            const stageView = root.stageView();
                            if (stageView && stageView.ActivityStatus && !stageView._eaiSubscribed) {
                                stageView._eaiSubscribed = true;

                                // If ActivityStatus is a ko.observable, subscribe to it
                                if (ko.isObservable(stageView.ActivityStatus)) {
                                    stageView.ActivityStatus.subscribe((newValue) => {
                                        const status = (newValue || '').toLowerCase();
                                        console.log('[Edgenuity AI] Knockout ActivityStatus changed to:', status);
                                        if (status.includes('complete') || status.includes('submitted') || status.includes('finished')) {
                                            handleActivityComplete();
                                        }
                                    });
                                    console.log('[Edgenuity AI] Subscribed to Knockout ActivityStatus observable');
                                }
                            }
                        }

                        // Also try to subscribe to gradebar if available
                        if (root.gradebar && typeof root.gradebar === 'function') {
                            const gradebar = root.gradebar();
                            if (gradebar && gradebar.GradeString && !gradebar._eaiSubscribed) {
                                gradebar._eaiSubscribed = true;

                                if (ko.isObservable(gradebar.GradeString)) {
                                    gradebar.GradeString.subscribe((newValue) => {
                                        const grade = (newValue || '').toLowerCase();
                                        console.log('[Edgenuity AI] Knockout GradeString changed to:', grade);
                                        if (grade.includes('complete')) {
                                            handleActivityComplete();
                                        }
                                    });
                                    console.log('[Edgenuity AI] Subscribed to Knockout GradeString observable');
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Knockout not available or context inaccessible
                console.log('[Edgenuity AI] Knockout monitoring error:', e.message);
            }
        };

        // Try immediately and then periodically (in case Knockout loads later)
        setTimeout(checkKnockout, 1000);
        setTimeout(checkKnockout, 3000);
        setTimeout(checkKnockout, 5000);
    }

    // Setup activity/question completion monitoring
    function setupActivityCompletionMonitor() {
        let lastActivityStatus = null;
        let completionTriggered = false;
        let initialCheckDone = false;

        // Watch for completion indicators
        const checkCompletion = () => {
            // Skip if we already triggered completion for this activity
            if (completionTriggered) return;

            // Initial check: If the grade already shows "Completed" when we first check, trigger skip
            // This handles the case where the page loads with an already-completed activity
            if (!initialCheckDone) {
                initialCheckDone = true;
                const gradeSpan = document.querySelector('.gradebar .grade');
                if (gradeSpan) {
                    const gradeText = (gradeSpan.innerText || gradeSpan.textContent || '').toLowerCase().trim();
                    if (gradeText.includes('complete') && gradeText !== 'completed') {
                        // Skip if it just says "Completed" as that's the common waiting state
                        // We want to catch things like "100% Complete" or "Activity Complete"
                    } else if (gradeText === 'completed') {
                        // Check if the activity status is NOT "Active" - if it says "Active", wait
                        const activityStatusEl = document.querySelector('#activity-status');
                        const statusText = (activityStatusEl?.innerText || activityStatusEl?.textContent || '').toLowerCase().trim();
                        // Only auto-skip if status isn't showing the activity is still running
                        if (statusText !== 'active' && statusText !== 'in progress') {
                            console.log('[Edgenuity AI] Initial completion detected - grade shows completed');
                            completionTriggered = true;
                            handleActivityComplete();
                            setTimeout(() => { completionTriggered = false; }, 5000);
                            return;
                        }
                    }
                }
            }

            // 1. Check #activity-status element (Edgenuity specific)
            const activityStatusEl = document.querySelector('#activity-status');
            if (activityStatusEl) {
                const statusText = (activityStatusEl.innerText || activityStatusEl.textContent || '').toLowerCase().trim();

                // Detect transition from non-complete to complete status
                if (statusText.includes('complete') || statusText.includes('submitted') || statusText.includes('finished')) {
                    if (lastActivityStatus && lastActivityStatus !== statusText) {
                        console.log('[Edgenuity AI] Activity status changed to:', statusText);
                        completionTriggered = true;
                        handleActivityComplete();
                        // Reset after a delay for next activity
                        setTimeout(() => { completionTriggered = false; lastActivityStatus = null; }, 5000);
                        return;
                    }
                }
                lastActivityStatus = statusText;
            }

            // 2. Check .grade span in gradebar (shows "Completed" when done)
            // Note: Check even if gradebar-wrap is hidden, as the completion status may still be valid
            const gradeSpan = document.querySelector('.gradebar .grade');
            if (gradeSpan) {
                const gradeText = (gradeSpan.innerText || gradeSpan.textContent || '').toLowerCase().trim();
                if (gradeText.includes('complete') && !gradeSpan.dataset.eaiHandled) {
                    gradeSpan.dataset.eaiHandled = 'true';
                    console.log('[Edgenuity AI] Gradebar shows completed:', gradeText);
                    completionTriggered = true;
                    handleActivityComplete();
                    setTimeout(() => { completionTriggered = false; gradeSpan.dataset.eaiHandled = ''; }, 5000);
                    return;
                }
            }

            // 2b. Also check the activity type label and status combination
            // Sometimes #activity-status shows something like "Active" but the underlying data shows completion
            const activityTitle = document.querySelector('#activity-title');
            if (activityTitle) {
                const titleText = (activityTitle.innerText || activityTitle.textContent || '').toLowerCase().trim();
                // If this is an "Instruction" activity type, check if content has loaded and completed
                if (titleText.includes('instruction') || titleText.includes('warmup') || titleText.includes('summary')) {
                    // For instruction types, look for the stageFrame having completed its content
                    const stageFrame = document.querySelector('#stageFrame');
                    if (stageFrame && !stageFrame.dataset.eaiInstructionChecked) {
                        try {
                            const frameDoc = stageFrame.contentDocument || stageFrame.contentWindow?.document;
                            if (frameDoc) {
                                // Check for any "complete" or "done" indicators in iframe
                                const bodyText = (frameDoc.body?.innerText || '').toLowerCase();
                                if (bodyText.includes('you have completed') ||
                                    bodyText.includes('activity complete') ||
                                    bodyText.includes('lesson complete')) {
                                    stageFrame.dataset.eaiInstructionChecked = 'true';
                                    console.log('[Edgenuity AI] Instruction/content completion detected in iframe');
                                    completionTriggered = true;
                                    handleActivityComplete();
                                    setTimeout(() => { completionTriggered = false; stageFrame.dataset.eaiInstructionChecked = ''; }, 5000);
                                    return;
                                }
                            }
                        } catch (e) {
                            // Cross-origin iframe
                        }
                    }
                }
            }

            // 3. Check for common completion indicators
            const completionSelectors = [
                '.activity-complete',
                '.completed-indicator',
                '.quiz-submitted',
                '.assignment-submitted',
                '.activity-status-complete',
                '[data-bind*="ActivityStatus"]'
            ];

            for (const selector of completionSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        const text = (el.innerText || el.textContent || '').toLowerCase();
                        if ((text.includes('complete') || text.includes('submitted') || text.includes('finished')) &&
                            !el.dataset.eaiHandled) {
                            el.dataset.eaiHandled = 'true';
                            console.log('[Edgenuity AI] Activity completion detected via:', selector);
                            completionTriggered = true;
                            handleActivityComplete();
                            setTimeout(() => { completionTriggered = false; }, 5000);
                            return;
                        }
                    });
                } catch (e) {
                    // Invalid selector
                }
            }

            // 4. Check iframes for completion indicators
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        // Look for completion messages in iframe
                        const completionTexts = iframeDoc.querySelectorAll('.complete, .success, .submitted, [class*="complete"]');
                        for (const el of completionTexts) {
                            const text = (el.innerText || el.textContent || '').toLowerCase();
                            if ((text.includes('complete') || text.includes('correct') || text.includes('submitted')) &&
                                !el.dataset.eaiHandled) {
                                el.dataset.eaiHandled = 'true';
                                console.log('[Edgenuity AI] Completion detected in iframe');
                                completionTriggered = true;
                                handleActivityComplete();
                                setTimeout(() => { completionTriggered = false; }, 5000);
                                return;
                            }
                        }
                    }
                } catch (e) {
                    // Cross-origin iframe
                }
            }
        };

        // Watch for "Next" button becoming enabled (indicates completion)
        let observerTimeout = null;
        const watchNextButton = new MutationObserver(() => {
            if (observerTimeout) return;

            observerTimeout = setTimeout(() => {
                observerTimeout = null;
                const nextBtn = findNextButton();
                if (nextBtn && !nextBtn.disabled && nextBtn.dataset.eaiWasDisabled === 'true') {
                    console.log('[Edgenuity AI] Next button became enabled - activity may be complete');
                    // Trigger completion if button just became enabled
                    if (!completionTriggered) {
                        completionTriggered = true;
                        handleActivityComplete();
                        setTimeout(() => { completionTriggered = false; }, 5000);
                    }
                }
                if (nextBtn && nextBtn.disabled) {
                    nextBtn.dataset.eaiWasDisabled = 'true';
                }
            }, 1000); // 1 second debounce
        });

        // Also observe changes to #activity-status specifically
        const activityStatusEl = document.querySelector('#activity-status');
        if (activityStatusEl) {
            const statusObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'characterData' || mutation.type === 'childList') {
                        const text = (activityStatusEl.innerText || activityStatusEl.textContent || '').toLowerCase();
                        if (text.includes('complete') && !completionTriggered) {
                            console.log('[Edgenuity AI] Activity status mutation detected: complete');
                            completionTriggered = true;
                            handleActivityComplete();
                            setTimeout(() => { completionTriggered = false; }, 5000);
                        }
                    }
                }
            });
            statusObserver.observe(activityStatusEl, {
                characterData: true,
                childList: true,
                subtree: true
            });
        }

        if (document.body) {
            watchNextButton.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['disabled', 'class']
            });
        }

        // Periodic check (less frequent since we have observers)
        setInterval(checkCompletion, 5000);
    }

    // Attempt auto-skip with retries (4 times)
    async function attemptAutoSkipWithRetries() {
        if (isSkipping) {
            console.log('[Edgenuity AI] Skip already in progress, ignoring request');
            return;
        }

        const now = Date.now();
        if (now - lastSkipAttemptTime < SKIP_COOLDOWN) {
            console.log('[Edgenuity AI] Skip cooldown active, ignoring request');
            return;
        }

        isSkipping = true;
        lastSkipAttemptTime = now;

        try {
            for (let i = 1; i <= 4; i++) {
                // Double check if we should still skip (user might have disabled it)
                if (!settings.autoSkipOnFinish) break;

                console.log(`[Edgenuity AI] Auto-skip attempt ${i}/4`);
                // Suppress notification for first 3 attempts
                const success = await clickNextButton(i < 4);
                if (success) {
                    console.log('[Edgenuity AI] Auto-skip successful on attempt', i);
                    break;
                }
                if (i < 4) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        } finally {
            // Reset flag after a delay to ensure navigation has time to start
            setTimeout(() => {
                isSkipping = false;
            }, 2000);
        }
    }

    // Handle video ended event
    function handleVideoEnded() {
        if (!settings.autoSkipOnFinish) return;
        console.log('[Edgenuity AI] Video ended - attempting auto-skip');
        showAutoSkipNotification('Video completed! Moving to next...');
        setTimeout(() => attemptAutoSkipWithRetries(), 1500);
    }

    // Handle activity/question completion
    function handleActivityComplete() {
        if (!settings.autoSkipOnFinish) return;
        if (isSkipping) return;

        console.log('[Edgenuity AI] Activity complete - attempting auto-skip');
        showAutoSkipNotification('Activity completed! Moving to next...');
        setTimeout(() => attemptAutoSkipWithRetries(), 2000);
    }

    // Find the next button
    function findNextButton() {
        // Various selectors used by Edgenuity for the Next button (prioritized)
        const nextButtonSelectors = [
            // Edgenuity FrameChain navigation (within activities)
            '.FrameRight',
            'li.FrameRight',
            '[onclick*="nextFrame"]',
            '[onclick*="FrameChain.nextFrame"]',
            // Edgenuity specific selectors (higher priority)
            '#footerNextActivity',
            '.footerNextActivity',
            '#footer-next',
            '.footer-next',
            '.activity-footer-next',
            '#next-activity-btn',
            '[data-bind*="nextActivity"]',
            '[data-bind*="goToNext"]',
            // Standard navigation selectors
            '#next-btn',
            '#NextButton',
            '.next-button',
            '.navButton.next',
            '.nav-next',
            '.activity-nav-next',
            'button[aria-label="Next"]',
            'button[title="Next"]',
            '[class*="next-btn"]',
            '[class*="nextBtn"]',
            '[class*="NextBtn"]',
            'a.next',
            // LTI/iframe navigation
            '.lti-next',
            '.player-next',
            '.lesson-next'
        ];

        // First check main document
        for (const selector of nextButtonSelectors) {
            try {
                const btn = document.querySelector(selector);
                if (btn && isVisibleElement(btn)) return btn;
            } catch (e) {
                // Invalid selector, skip
            }
        }

        // Try to find by text content in main document
        const allButtons = document.querySelectorAll('button, a.btn, a.button, .nav-button, [role="button"], input[type="button"], input[type="submit"], li[onclick], a');
        for (const btn of allButtons) {
            if (!isVisibleElement(btn)) continue;
            const text = (btn.innerText || btn.textContent || btn.value || '').toLowerCase().trim();
            if (text === 'next' || text === 'next >' || text === '>' || text === 'next activity' ||
                text === 'continue' || text === 'go to next' || text === 'go right' ||
                text.match(/^next\s*$/i)) {
                return btn;
            }
        }

        // Check outer parent frames (Edgenuity often nests content)
        try {
            if (window.parent && window.parent !== window) {
                const parentDoc = window.parent.document;
                for (const selector of nextButtonSelectors) {
                    try {
                        const btn = parentDoc.querySelector(selector);
                        if (btn && isVisibleElement(btn)) return btn;
                    } catch (e) { }
                }
            }
        } catch (e) {
            // Cross-origin parent
        }

        // Check iframes (stageFrame and others)
        const iframes = document.querySelectorAll('#stageFrame, iframe[name="stageFrame"], iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    for (const selector of nextButtonSelectors) {
                        try {
                            const btn = iframeDoc.querySelector(selector);
                            if (btn && isVisibleElement(btn)) return btn;
                        } catch (e) { }
                    }
                    // Also search by text in iframe (including li elements with onclick)
                    const iframeButtons = iframeDoc.querySelectorAll('button, a.btn, a.button, [role="button"], li[onclick], a');
                    for (const btn of iframeButtons) {
                        if (!isVisibleElement(btn)) continue;
                        const text = (btn.innerText || btn.textContent || '').toLowerCase().trim();
                        if (text === 'next' || text === 'next >' || text === 'next activity' ||
                            text === 'go right' || text === 'continue') {
                            return btn;
                        }
                    }
                }
            } catch (e) {
                // Cross-origin iframe
            }
        }

        return null;
    }

    // Helper to check if element is visible
    function isVisibleElement(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            el.offsetWidth > 0 &&
            el.offsetHeight > 0;
    }

    // Flag to track if page context script is injected
    let pageContextInjected = false;

    // Inject the page context script (runs in page context, not sandbox)
    function injectPageContextScript() {
        if (pageContextInjected) return true;

        try {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('pageContext.js');
            script.onload = function () {
                console.log('[Edgenuity AI] Page context script loaded');
                pageContextInjected = true;
                this.remove();
            };
            script.onerror = function () {
                console.error('[Edgenuity AI] Failed to load page context script');
            };
            (document.head || document.documentElement).appendChild(script);
            return true;
        } catch (e) {
            console.error('[Edgenuity AI] Failed to inject page context script:', e);
            return false;
        }
    }

    // Call API.FrameChain.nextFrame() via page context
    function injectFrameChainCall() {
        return new Promise((resolve) => {
            try {
                // Ensure page context script is loaded
                if (!injectPageContextScript()) {
                    resolve(false);
                    return;
                }

                // Setup listener for result
                const handler = (e) => {
                    window.removeEventListener('eai-next-frame-result', handler);
                    if (e.detail && e.detail.success) {
                        console.log('[Edgenuity AI] API call successful');
                        resolve(true);
                    } else {
                        console.log('[Edgenuity AI] API call failed:', e.detail?.reason);
                        resolve(false);
                    }
                };

                window.addEventListener('eai-next-frame-result', handler);

                // Timeout safety (short timeout so we don't delay fallback too long)
                setTimeout(() => {
                    window.removeEventListener('eai-next-frame-result', handler);
                    resolve(false);
                }, 500);

                // Dispatch event to trigger nextFrame in page context
                console.log('[Edgenuity AI] Dispatching eai-next-frame event');
                window.dispatchEvent(new CustomEvent('eai-next-frame'));
            } catch (e) {
                console.log('[Edgenuity AI] Failed to dispatch nextFrame event:', e);
                resolve(false);
            }
        });
    }

    // Click the next button
    async function clickNextButton(suppressNotification = false) {
        // Check if navigation is blocked by a disabled Next button
        // If we see a Next button but it's disabled, we shouldn't force skip with the API
        const nextBtn = findNextButton();
        if (nextBtn) {
            const isAbled = !nextBtn.disabled &&
                !nextBtn.classList.contains('disabled') &&
                nextBtn.getAttribute('aria-disabled') !== 'true';

            if (!isAbled) {
                console.log('[Edgenuity AI] Next button found but disabled - activity not advancable');
                return false;
            }
        }

        // Prioritize using API.FrameChain.nextFrame() - more reliable for Edgenuity
        // Content scripts can't access page globals directly, so we inject a script
        console.log('[Edgenuity AI] Attempting API.FrameChain.nextFrame()');
        if (await injectFrameChainCall()) {
            return true;
        }

        // Fallback: try to find and click button directly
        // We already found it above
        if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('disabled')) {
            console.log('[Edgenuity AI] Clicking next button as fallback');
            nextBtn.click();
            return true;
        }

        // Try injecting into iframes (already falls through from here)
        console.log('[Edgenuity AI] Main page API not available, trying iframes');

        // Try to inject into iframes as well
        const iframes = document.querySelectorAll('#stageFrame, iframe[name="stageFrame"], iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    // Inject external script into iframe (CSP-compliant)
                    const script = iframeDoc.createElement('script');
                    script.src = chrome.runtime.getURL('pageContext.js');
                    script.onload = function () {
                        console.log('[Edgenuity AI] Page context script loaded in iframe');
                        // Dispatch event in iframe context
                        iframe.contentWindow.dispatchEvent(new CustomEvent('eai-next-frame'));
                        this.remove();
                    };
                    (iframeDoc.head || iframeDoc.documentElement).appendChild(script);
                    console.log('[Edgenuity AI] Injecting page context script into iframe');
                    return true;
                }
            } catch (e) {
                // Cross-origin iframe
                console.log('[Edgenuity AI] Cannot inject into iframe (cross-origin)');
            }
        }

        // Last resort: send message to iframes
        let messageSent = false;
        for (const iframe of iframes) {
            try {
                iframe.contentWindow.postMessage({ type: 'eai-click-next' }, '*');
                messageSent = true;
                console.log('[Edgenuity AI] Sent click-next message to iframe');
            } catch (e) {
                // Cross-origin, can't postMessage
            }
        }

        if (messageSent) {
            return true;
        }

        console.log('[Edgenuity AI] Next button not found or disabled');
        if (!suppressNotification) {
            showAutoSkipNotification('⚠️ Could not find Next button', true);
        }
        return false;
    }

    // Show auto-skip notification
    function showAutoSkipNotification(message, isWarning = false) {
        // Remove existing notification
        const existing = document.getElementById('eai-auto-skip-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'eai-auto-skip-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: ${isWarning ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 999998;
            animation: eai-slide-in 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        notification.innerHTML = `<span>⏭️</span><span>${message}</span>`;

        // Add animation keyframes
        if (!document.getElementById('eai-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'eai-notification-styles';
            style.textContent = `
                @keyframes eai-slide-in {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes eai-slide-out {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'eai-slide-out 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Observe page changes (Edgenuity loads content dynamically)
    function observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            // Re-check if button is still in DOM and should be visible
            if (settings.showSolveButton !== false) {
                if (!document.getElementById('edgenuity-ai-solve-btn')) {
                    createSolveButton();
                }
            }
            if (!document.getElementById('edgenuity-ai-overlay')) {
                createResponseOverlay();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // =========================================
    // AUTO-PLAY FUNCTIONALITY
    // =========================================

    function setupAutoPlay() {
        if (window.eaiAutoPlaySetup) return;
        window.eaiAutoPlaySetup = true;

        console.log('[Edgenuity AI] Setting up auto-play...');
        setupVideoAutoPlayer();
        setupIframeAutoPlayer();

        // Also watch for big play buttons
        setInterval(clickBigPlayButtons, 2000);
    }

    function setupVideoAutoPlayer() {
        const checkVideos = () => {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => attemptAutoPlay(video));
        };
        checkVideos();
        setInterval(checkVideos, 2000);
    }

    function setupIframeAutoPlayer() {
        const checkIframes = () => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        const videos = iframeDoc.querySelectorAll('video');
                        videos.forEach(video => attemptAutoPlay(video));
                    }
                } catch (e) { }
            });
        };
        checkIframes();
        setInterval(checkIframes, 2000);
    }

    async function attemptAutoPlay(video) {
        if (!settings.autoPlayVideo) return;
        if (video.dataset.eaiAutoPlayed) return;

        // Don't auto-play if it's already playing
        if (!video.paused && !video.ended && video.readyState > 2) {
            video.dataset.eaiAutoPlayed = 'true';
            return;
        }

        console.log('[Edgenuity AI] Attempting to auto-play video');

        try {
            video.muted = true; // Mute to allow autoplay
            await video.play();
            video.dataset.eaiAutoPlayed = 'true';
            console.log('[Edgenuity AI] Auto-play successful');
        } catch (e) {
            // User interaction might be required
        }
    }

    function clickBigPlayButtons() {
        if (!settings.autoPlayVideo) return;

        // Common selectors for overlay play buttons
        const playSelectors = [
            '.vjs-big-play-button',
            '.jw-display-icon-container',
            '.play-button-overlay',
            '[aria-label="Play"]',
            'button.play',
            '.video-play-button'
        ];

        // Search in main doc and iframes
        const docs = [document];
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentDocument) docs.push(iframe.contentDocument);
            } catch (e) { }
        });

        docs.forEach(doc => {
            playSelectors.forEach(selector => {
                const btns = doc.querySelectorAll(selector);
                btns.forEach(btn => {
                    if (isVisibleElement(btn)) {
                        console.log('[Edgenuity AI] Clicking big play button:', selector);
                        btn.click();
                    }
                });
            });
        });
    }

    // Listen for settings updates from popup
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.apiKey) {
                settings.apiKey = changes.apiKey.newValue;
                if (api) api.setApiKey(settings.apiKey);
            }
            if (changes.humanizerApiKey) {
                settings.humanizerApiKey = changes.humanizerApiKey.newValue;
                if (api) api.setHumanizerApiKey(settings.humanizerApiKey);
            }
            if (changes.selectedModel) {
                settings.selectedModel = changes.selectedModel.newValue;
            }
            if (changes.autoDetectQuestionType !== undefined) {
                settings.autoDetectQuestionType = changes.autoDetectQuestionType.newValue;
            }
            if (changes.showSolveButton !== undefined) {
                settings.showSolveButton = changes.showSolveButton.newValue;
                if (settings.showSolveButton) {
                    createSolveButton();
                } else {
                    hideSolveButton();
                }
            }
            if (changes.autoSkipOnFinish !== undefined) {
                settings.autoSkipOnFinish = changes.autoSkipOnFinish.newValue;
                if (settings.autoSkipOnFinish) {
                    setupAutoSkip();
                } else {
                    teardownAutoSkip();
                }
            }
            if (changes.autoPlayVideo !== undefined) {
                settings.autoPlayVideo = changes.autoPlayVideo.newValue;
                if (settings.autoPlayVideo) {
                    setupAutoPlay();
                }
            }
        }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SOLVE_QUESTION') {
            handleSolveClick();
            sendResponse({ success: true });
        }
        return true;
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
