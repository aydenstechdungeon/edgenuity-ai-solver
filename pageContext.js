// Page Context Script for Edgenuity AI Solver
// This script runs in the page context (not content script sandbox)
// and has access to page globals like API.FrameChain

(function () {
    'use strict';

    // Listen for messages from the content script
    window.addEventListener('eai-next-frame', function () {
        try {
            if (window.API && window.API.FrameChain && typeof window.API.FrameChain.nextFrame === 'function') {
                console.log('[Edgenuity AI PageContext] Calling API.FrameChain.nextFrame()');
                window.API.FrameChain.nextFrame();
                window.dispatchEvent(new CustomEvent('eai-next-frame-result', { detail: { success: true } }));
            } else {
                console.log('[Edgenuity AI PageContext] API.FrameChain.nextFrame not available');
                window.dispatchEvent(new CustomEvent('eai-next-frame-result', { detail: { success: false, reason: 'API not available' } }));
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error calling nextFrame:', e);
            window.dispatchEvent(new CustomEvent('eai-next-frame-result', { detail: { success: false, reason: e.message } }));
        }
    });

    console.log('[Edgenuity AI PageContext] Page context script loaded');
})();
