// Background Service Worker for Edgenuity AI Solver

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Edgenuity AI] Extension installed');

        // Set default settings
        chrome.storage.sync.set({
            apiKey: '',
            selectedModel: 'balanced',
            autoDetectQuestionType: true,
            showExplanation: true,
            solvedCount: 0,
            lastSolvedDate: ''
        });
    }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SETTINGS') {
        chrome.storage.sync.get(null, (settings) => {
            sendResponse(settings);
        });
        return true; // Keep channel open for async response
    }

    if (message.type === 'UPDATE_STATS') {
        const today = new Date().toDateString();
        chrome.storage.sync.get({ solvedCount: 0, lastSolvedDate: '' }, (result) => {
            let count = result.solvedCount;
            if (result.lastSolvedDate !== today) {
                count = 0;
            }
            chrome.storage.sync.set({
                solvedCount: count + 1,
                lastSolvedDate: today
            });
        });
    }

    // Screenshot capture for vision-based solving
    if (message.type === 'CAPTURE_SCREENSHOT') {
        // Use the sender's window ID to capture the correct tab
        const windowId = sender.tab?.windowId || null;

        chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('[Edgenuity AI] Screenshot error:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, dataUrl: dataUrl });
            }
        });
        return true; // Keep channel open for async response
    }
});
