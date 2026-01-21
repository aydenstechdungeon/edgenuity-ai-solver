// Popup Script for Edgenuity AI Solver

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('api-key');
    const toggleKeyBtn = document.getElementById('toggle-key');
    const humanizerKeyInput = document.getElementById('humanizer-api-key');
    const toggleHumanizerKeyBtn = document.getElementById('toggle-humanizer-key');
    const modelGrid = document.getElementById('model-grid');
    const showSolveButtonToggle = document.getElementById('show-solve-button');
    const autoDetectToggle = document.getElementById('auto-detect');
    const showExplanationToggle = document.getElementById('show-explanation');
    const autoSkipOnFinishToggle = document.getElementById('auto-skip-on-finish');
    const autoPlayVideoToggle = document.getElementById('auto-play-video');
    const autoSolveToggle = document.getElementById('auto-solve');
    const saveBtn = document.getElementById('save-btn');
    const solvedCountEl = document.getElementById('solved-count');
    const solveNowBtn = document.getElementById('solve-now-btn');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const historyPanel = document.getElementById('history-panel');
    const historyList = document.getElementById('history-list');
    const historyCountEl = document.getElementById('history-count');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    let selectedModel = 'balanced';
    let solveHistory = [];

    // Populate model grid
    function populateModels() {
        const models = window.EDGENUITY_CONFIG.MODELS;
        modelGrid.innerHTML = '';

        Object.entries(models).forEach(([key, model]) => {
            // Skip vision model - it's auto-selected when screenshots are needed
            if (model.supportsVision) return;

            const option = document.createElement('div');
            option.className = `model-option ${key === selectedModel ? 'selected' : ''}`;
            option.dataset.model = key;
            option.innerHTML = `
        <span class="model-icon">${model.icon}</span>
        <span class="model-name">${model.name}</span>
        <span class="model-desc">${model.description}</span>
      `;
            option.addEventListener('click', () => selectModel(key));
            modelGrid.appendChild(option);
        });
    }

    // Select a model
    function selectModel(key) {
        selectedModel = key;
        document.querySelectorAll('.model-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.model === key);
        });
    }

    // Load saved settings
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(window.EDGENUITY_CONFIG.DEFAULT_SETTINGS, (result) => {
                apiKeyInput.value = result.apiKey || '';
                humanizerKeyInput.value = result.humanizerApiKey || '';
                selectedModel = result.selectedModel || 'balanced';
                showSolveButtonToggle.checked = result.showSolveButton !== false;
                autoDetectToggle.checked = result.autoDetectQuestionType !== false;
                showExplanationToggle.checked = result.showExplanation !== false;
                autoSkipOnFinishToggle.checked = result.autoSkipOnFinish === true;
                autoPlayVideoToggle.checked = result.autoPlayVideo === true;
                autoSolveToggle.checked = result.autoSolve === true;
                resolve();
            });
        });
    }

    // Load stats
    async function loadStats() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ solvedCount: 0, lastSolvedDate: '' }, (result) => {
                const today = new Date().toDateString();
                if (result.lastSolvedDate === today) {
                    solvedCountEl.textContent = result.solvedCount;
                } else {
                    solvedCountEl.textContent = '0';
                }
                resolve();
            });
        });
    }

    // Load history
    async function loadHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get({ solveHistory: [] }, (result) => {
                solveHistory = result.solveHistory || [];
                historyCountEl.textContent = solveHistory.length;
                resolve();
            });
        });
    }

    // Render history list
    function renderHistory() {
        if (solveHistory.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No history yet</div>';
            return;
        }

        historyList.innerHTML = solveHistory
            .slice()
            .reverse()
            .slice(0, 10) // Show last 10
            .map(entry => `
                <div class="history-item" data-id="${entry.id}">
                    <div class="history-item-time">${formatTime(entry.timestamp)} • ${entry.model || 'AI'}</div>
                    <div class="history-item-question">${escapeHtml(entry.question)}</div>
                </div>
            `)
            .join('');

        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                const entry = solveHistory.find(h => h.id === id);
                if (entry) {
                    showHistoryAnswer(entry);
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
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Answer modal elements
    const answerModal = document.getElementById('answer-modal');
    const modalQuestion = document.getElementById('modal-question');
    const modalAnswer = document.getElementById('modal-answer');
    const modalModelInfo = document.getElementById('modal-model-info');
    const modalTime = document.getElementById('modal-time');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Current answer for copy functionality
    let currentAnswer = '';

    // Show history answer in modal overlay
    function showHistoryAnswer(entry) {
        modalQuestion.textContent = entry.question;
        modalAnswer.innerHTML = formatResponse(entry.answer);
        modalModelInfo.textContent = entry.model || 'AI';
        modalTime.textContent = formatTime(entry.timestamp);
        currentAnswer = entry.answer;

        answerModal.classList.add('visible');
    }

    // Hide answer modal
    function hideAnswerModal() {
        answerModal.classList.remove('visible');
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

    // Copy answer from modal
    async function copyModalAnswer() {
        try {
            await navigator.clipboard.writeText(currentAnswer);
            modalCopyBtn.textContent = '✓';
            modalCopyBtn.classList.add('copied');
            setTimeout(() => {
                modalCopyBtn.textContent = '📋';
                modalCopyBtn.classList.remove('copied');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    // Modal close button
    modalCloseBtn.addEventListener('click', hideAnswerModal);

    // Modal copy button
    modalCopyBtn.addEventListener('click', copyModalAnswer);

    // Click outside modal to close
    answerModal.addEventListener('click', (e) => {
        if (e.target === answerModal) {
            hideAnswerModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && answerModal.classList.contains('visible')) {
            hideAnswerModal();
        }
    });

    // Clear history
    async function clearHistory() {
        if (confirm('Clear all history?')) {
            solveHistory = [];
            await chrome.storage.local.set({ solveHistory: [] });
            historyCountEl.textContent = '0';
            renderHistory();
        }
    }

    // Save settings
    function saveSettings() {
        const settings = {
            apiKey: apiKeyInput.value.trim(),
            humanizerApiKey: humanizerKeyInput.value.trim(),
            selectedModel: selectedModel,
            showSolveButton: showSolveButtonToggle.checked,
            autoDetectQuestionType: autoDetectToggle.checked,
            showExplanation: showExplanationToggle.checked,
            autoSkipOnFinish: autoSkipOnFinishToggle.checked,
            autoPlayVideo: autoPlayVideoToggle.checked,
            autoSolve: autoSolveToggle.checked
        };

        chrome.storage.sync.set(settings, () => {
            // Show success state
            saveBtn.classList.add('saved');
            setTimeout(() => {
                saveBtn.classList.remove('saved');
            }, 1500);
        });
    }

    // Save button click
    saveBtn.addEventListener('click', saveSettings);

    // Toggle API key visibility
    toggleKeyBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
    });

    // Toggle Humanizer API key visibility
    toggleHumanizerKeyBtn.addEventListener('click', () => {
        const isPassword = humanizerKeyInput.type === 'password';
        humanizerKeyInput.type = isPassword ? 'text' : 'password';
        toggleHumanizerKeyBtn.textContent = isPassword ? '🙈' : '👁️';
    });

    // Toggle history panel
    viewHistoryBtn.addEventListener('click', () => {
        historyPanel.classList.toggle('visible');
        if (historyPanel.classList.contains('visible')) {
            renderHistory();
        }
    });

    // Clear history button
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Solve Now button click - send message to content script
    solveNowBtn.addEventListener('click', async () => {
        // Save settings first
        saveSettings();

        solveNowBtn.classList.add('loading');
        solveNowBtn.querySelector('.solve-text').textContent = 'Solving';

        try {
            // Get active tab and send message to content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'SOLVE_QUESTION' }, (response) => {
                    solveNowBtn.classList.remove('loading');
                    solveNowBtn.querySelector('.solve-text').textContent = 'Solve Current Question';

                    if (chrome.runtime.lastError) {
                        console.error('Error:', chrome.runtime.lastError);
                        alert('Please navigate to an Edgenuity page first!');
                    }
                });
            }
        } catch (err) {
            console.error('Error solving:', err);
            solveNowBtn.classList.remove('loading');
            solveNowBtn.querySelector('.solve-text').textContent = 'Solve Current Question';
        }
    });

    // Initialize
    await loadSettings();
    populateModels();
    await loadStats();
    await loadHistory();
});
