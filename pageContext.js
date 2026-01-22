// Page Context Script for Edgenuity AI Solver
// This script runs in the page context (not content script sandbox)
// and has access to page globals like API.FrameChain, playerView, etc.

(function () {
    'use strict';

    // =========================================
    // API STATUS HELPERS
    // =========================================

    // Find the API object - it may be in different locations
    function getAPI() {
        // Check current window first
        if (window.API && window.API.FrameChain) {
            return window.API;
        }

        // Check stageFrame's contentWindow (common location)
        try {
            const stageFrame = document.querySelector('#stageFrame');
            if (stageFrame && stageFrame.contentWindow && stageFrame.contentWindow.API) {
                return stageFrame.contentWindow.API;
            }
        } catch (e) {
            // Cross-origin or not found
        }

        // Check parent window
        try {
            if (window.parent && window.parent.API) {
                return window.parent.API;
            }
        } catch (e) {
            // Cross-origin
        }

        // Check parent's stageFrame
        try {
            if (window.parent) {
                const stageFrame = window.parent.document.querySelector('#stageFrame');
                if (stageFrame && stageFrame.contentWindow && stageFrame.contentWindow.API) {
                    return stageFrame.contentWindow.API;
                }
            }
        } catch (e) {
            // Cross-origin
        }

        return null;
    }

    // Find playerView - may also be in different locations
    function getPlayerView() {
        if (window.playerView) return window.playerView;
        try {
            if (window.parent && window.parent.playerView) return window.parent.playerView;
        } catch (e) { }
        return null;
    }

    // Get jQuery if available (for direct DOM manipulation fallback)
    function get$() {
        if (window.$ && window.$.fn) return window.$;
        if (window.jQuery) return window.jQuery;
        try {
            if (window.parent && window.parent.$) return window.parent.$;
        } catch (e) { }
        return null;
    }

    // Get the current API state for debugging and decision making
    function getAPIState() {
        const API = getAPI();
        const playerView = getPlayerView();

        const state = {
            hasAPI: !!API,
            hasFrameChain: !!(API && API.FrameChain),
            hasFrame: !!(API && API.Frame),
            hasPlayerView: !!playerView,
            currentFrame: null,
            totalFrames: null,
            framesStatus: null,
            frameComplete: null,
            chainComplete: null,
            nextEnabled: null,
            activityStatus: null
        };

        try {
            if (API && API.FrameChain) {
                state.currentFrame = API.FrameChain.currentFrame;
                state.totalFrames = API.FrameChain.framesStatus?.length || null;
                state.framesStatus = API.FrameChain.framesStatus || null;
                state.chainComplete = typeof API.FrameChain.isComplete === 'function'
                    ? API.FrameChain.isComplete() : null;
            }
            if (API && API.Frame) {
                state.frameComplete = typeof API.Frame.isComplete === 'function'
                    ? API.Frame.isComplete() : null;
            }
            if (playerView) {
                state.nextEnabled = playerView.stageView?.().nextEnabled?.() ?? null;
                state.activityStatus = playerView.stageView?.().ActivityStatus?.() ?? null;
            }
        } catch (e) {
            console.log('[Edgenuity AI PageContext] Error getting API state:', e.message);
        }

        return state;
    }

    // =========================================
    // FRAME NAVIGATION
    // =========================================

    // Try to click FrameRight button using jQuery (like SheldonBot)
    function tryClickFrameRight() {
        const $ = get$();
        if ($) {
            try {
                // Try multiple approaches
                const frameRight = $("#stageFrame").contents().find(".FrameRight");
                if (frameRight.length > 0) {
                    console.log('[Edgenuity AI PageContext] Clicking .FrameRight via jQuery');
                    frameRight.click();
                    return { success: true, method: 'jQuery.FrameRight.click' };
                }

                // Also try in current document
                const localFrameRight = $(".FrameRight");
                if (localFrameRight.length > 0) {
                    console.log('[Edgenuity AI PageContext] Clicking local .FrameRight via jQuery');
                    localFrameRight.click();
                    return { success: true, method: 'jQuery.local.FrameRight.click' };
                }
            } catch (e) {
                console.log('[Edgenuity AI PageContext] jQuery click failed:', e.message);
            }
        }

        // Try vanilla JS as fallback
        try {
            const frameRight = document.querySelector('.FrameRight');
            if (frameRight) {
                console.log('[Edgenuity AI PageContext] Clicking .FrameRight via vanilla JS');
                frameRight.click();
                return { success: true, method: 'vanillaJS.FrameRight.click' };
            }
        } catch (e) { }

        return { success: false, reason: 'No FrameRight button found' };
    }

    // Try to advance to the next frame within the current activity
    function tryNextFrame() {
        const API = getAPI();
        try {
            if (API && API.FrameChain && typeof API.FrameChain.nextFrame === 'function') {
                console.log('[Edgenuity AI PageContext] Calling API.FrameChain.nextFrame()');
                API.FrameChain.nextFrame();
                return { success: true, method: 'FrameChain.nextFrame' };
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error calling nextFrame:', e);
            return { success: false, reason: e.message };
        }

        // Fallback: try clicking FrameRight button directly
        return tryClickFrameRight();
    }

    // Try to complete the current frame
    function tryCompleteFrame() {
        const API = getAPI();
        try {
            if (API && API.Frame && typeof API.Frame.complete === 'function') {
                console.log('[Edgenuity AI PageContext] Calling API.Frame.complete()');
                API.Frame.complete(function (success) {
                    window.dispatchEvent(new CustomEvent('eai-frame-complete-result', {
                        detail: { success: success }
                    }));
                });
                return { success: true, method: 'Frame.complete' };
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error calling Frame.complete:', e);
            return { success: false, reason: e.message };
        }
        return { success: false, reason: 'API.Frame.complete not available' };
    }

    // Try to complete the entire FrameChain (end of activity)
    function tryCompleteChain() {
        const API = getAPI();
        try {
            if (API && API.FrameChain && typeof API.FrameChain.complete === 'function') {
                console.log('[Edgenuity AI PageContext] Calling API.FrameChain.complete()');
                API.FrameChain.complete();
                return { success: true, method: 'FrameChain.complete' };
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error calling FrameChain.complete:', e);
            return { success: false, reason: e.message };
        }
        return { success: false, reason: 'API.FrameChain.complete not available' };
    }

    // =========================================
    // ACTIVITY NAVIGATION
    // =========================================

    // Try to navigate to the next activity
    function tryNextActivity() {
        const playerView = getPlayerView();
        const $ = get$();

        try {
            // Method 1: Use playerView.getNextActivity() - most reliable
            if (playerView && typeof playerView.getNextActivity === 'function') {
                // Check if next activity navigation is enabled
                const nextEnabled = playerView.stageView?.().nextEnabled?.();
                if (nextEnabled) {
                    console.log('[Edgenuity AI PageContext] Calling playerView.getNextActivity()');
                    playerView.getNextActivity();
                    return { success: true, method: 'playerView.getNextActivity' };
                } else {
                    console.log('[Edgenuity AI PageContext] Next activity not enabled yet');
                }
            }

            // Method 2: Try clicking .footnav.goRight (like SheldonBot)
            if ($) {
                const goRight = $(".footnav.goRight");
                if (goRight.length > 0) {
                    console.log('[Edgenuity AI PageContext] Clicking .footnav.goRight via jQuery');
                    goRight.click();
                    return { success: true, method: 'jQuery.goRight.click' };
                }
            }

            // Method 3: Try iFrameNotify if available
            if (window.iFrameNotify && typeof window.iFrameNotify.notify === 'function') {
                console.log('[Edgenuity AI PageContext] Using iFrameNotify for nextactivity');
                window.iFrameNotify.notify({
                    frame: window.parent,
                    message: 'nextactivity'
                });
                return { success: true, method: 'iFrameNotify' };
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error navigating to next activity:', e);
            return { success: false, reason: e.message };
        }
        return { success: false, reason: 'No activity navigation method available' };
    }

    // Try to open a specific frame by order
    function tryOpenFrame(order) {
        const API = getAPI();
        try {
            if (API && API.FrameChain && typeof API.FrameChain.openFrame === 'function') {
                console.log('[Edgenuity AI PageContext] Calling API.FrameChain.openFrame(' + order + ')');
                API.FrameChain.openFrame(order);
                return { success: true, method: 'FrameChain.openFrame', frame: order };
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error calling openFrame:', e);
            return { success: false, reason: e.message };
        }
        return { success: false, reason: 'API.FrameChain.openFrame not available' };
    }

    // Smart navigation - automatically determine best action
    function trySmartNavigation() {
        const state = getAPIState();
        const API = getAPI();
        console.log('[Edgenuity AI PageContext] Smart navigation - state:', JSON.stringify(state, null, 2));

        try {
            // Check if we have direct access to FrameChain
            if (API && API.FrameChain) {
                const fc = API.FrameChain;
                const currentFrame = fc.currentFrame;
                const framesStatus = fc.framesStatus || [];
                const totalFrames = framesStatus.length;

                console.log(`[Edgenuity AI PageContext] FrameChain: frame ${currentFrame}/${totalFrames}`);

                // Check if all frames are complete (use the actual isComplete method)
                if (typeof fc.isComplete === 'function' && fc.isComplete()) {
                    console.log('[Edgenuity AI PageContext] All frames complete, trying to complete chain or go to next activity');

                    // Try to submit/complete the chain first
                    if (typeof fc.complete === 'function') {
                        fc.complete();
                        return { success: true, method: 'FrameChain.complete' };
                    }

                    // Fallback to next activity
                    const result = tryNextActivity();
                    if (result.success) return result;
                }

                // If we have more frames to go, advance to next frame
                if (currentFrame < totalFrames) {
                    console.log('[Edgenuity AI PageContext] More frames available, going to next frame');

                    // Use nextFrame() which handles the logic internally
                    if (typeof fc.nextFrame === 'function') {
                        fc.nextFrame();
                        return { success: true, method: 'FrameChain.nextFrame' };
                    }

                    // Fallback: directly open next frame
                    const result = tryOpenFrame(currentFrame + 1);
                    if (result.success) return result;
                }

                // We're on the last frame but not complete - try to complete current frame first
                if (currentFrame >= totalFrames && API.Frame && typeof API.Frame.isComplete === 'function') {
                    if (!API.Frame.isComplete()) {
                        console.log('[Edgenuity AI PageContext] On last frame but not complete, trying to complete frame');
                        const result = tryCompleteFrame();
                        if (result.success) return result;
                    }
                }
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error in smart navigation:', e);
        }

        // Fallback: try the basic methods
        let result = tryNextFrame();
        if (result.success) return result;

        result = tryNextActivity();
        if (result.success) return result;

        return { success: false, reason: 'No navigation method worked' };
    }


    // =========================================
    // VIDEO CONTROL
    // =========================================

    // Try to speed up or skip video
    function tryVideoControl(action) {
        const API = getAPI();
        try {
            // Check for API.Video
            if (API && API.Video) {
                const video = API.Video;

                if (action === 'skip' && video.wrapper) {
                    // Try to skip to end
                    if (typeof video.wrapper.skipToEnd === 'function') {
                        video.wrapper.skipToEnd();
                        return { success: true, method: 'API.Video.wrapper.skipToEnd' };
                    }
                }

                if (action === 'speed' && video.wrapper && video.wrapper.theVideo) {
                    // Try to speed up video
                    const videoEl = video.wrapper.theVideo;
                    if (videoEl.playbackRate !== undefined) {
                        videoEl.playbackRate = 2.0;
                        return { success: true, method: 'playbackRate', rate: 2.0 };
                    }
                }
            }

            // Check for HTML5 video elements
            const videos = document.querySelectorAll('video');
            for (const video of videos) {
                if (action === 'skip') {
                    video.currentTime = video.duration || video.currentTime;
                    return { success: true, method: 'HTML5 video skip' };
                }
                if (action === 'speed') {
                    video.playbackRate = 2.0;
                    return { success: true, method: 'HTML5 playbackRate' };
                }
            }

            // Check in stageFrame
            const stageFrame = document.getElementById('stageFrame');
            if (stageFrame && stageFrame.contentDocument) {
                const iframeVideos = stageFrame.contentDocument.querySelectorAll('video');
                for (const video of iframeVideos) {
                    if (action === 'skip') {
                        video.currentTime = video.duration || video.currentTime;
                        return { success: true, method: 'iframe video skip' };
                    }
                    if (action === 'speed') {
                        video.playbackRate = 2.0;
                        return { success: true, method: 'iframe playbackRate' };
                    }
                }
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error with video control:', e);
            return { success: false, reason: e.message };
        }
        return { success: false, reason: 'No video found' };
    }

    // =========================================
    // AUDIO CONTROL
    // =========================================

    // Try to stop/skip audio
    function tryAudioControl(action) {
        const API = getAPI();
        try {
            if (API && API.Audio) {
                if (action === 'stop' && typeof API.Audio.stopAudio === 'function') {
                    API.Audio.stopAudio();
                    // Clear audio queue
                    if (API.Audio.soundQueue) API.Audio.soundQueue = [];
                    if (API.Audio.callBackQueue) API.Audio.callBackQueue = [];
                    API.Audio.playing = false;
                    return { success: true, method: 'API.Audio.stopAudio' };
                }
            }
        } catch (e) {
            console.error('[Edgenuity AI PageContext] Error with audio control:', e);
            return { success: false, reason: e.message };
        }
        return { success: false, reason: 'API.Audio not available' };
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================

    // Listen for next frame request
    window.addEventListener('eai-next-frame', function () {
        const result = tryNextFrame();
        window.dispatchEvent(new CustomEvent('eai-next-frame-result', { detail: result }));
    });

    // Listen for complete frame request
    window.addEventListener('eai-complete-frame', function () {
        const result = tryCompleteFrame();
        window.dispatchEvent(new CustomEvent('eai-complete-frame-result', { detail: result }));
    });

    // Listen for complete chain request
    window.addEventListener('eai-complete-chain', function () {
        const result = tryCompleteChain();
        window.dispatchEvent(new CustomEvent('eai-complete-chain-result', { detail: result }));
    });

    // Listen for next activity request
    window.addEventListener('eai-next-activity', function () {
        const result = tryNextActivity();
        window.dispatchEvent(new CustomEvent('eai-next-activity-result', { detail: result }));
    });

    // Listen for smart navigation request
    window.addEventListener('eai-smart-nav', function () {
        const result = trySmartNavigation();
        window.dispatchEvent(new CustomEvent('eai-smart-nav-result', { detail: result }));
    });

    // Listen for API state request
    window.addEventListener('eai-get-state', function () {
        const state = getAPIState();
        window.dispatchEvent(new CustomEvent('eai-get-state-result', { detail: state }));
    });

    // Listen for video control request
    window.addEventListener('eai-video-control', function (e) {
        const action = e.detail?.action || 'skip';
        const result = tryVideoControl(action);
        window.dispatchEvent(new CustomEvent('eai-video-control-result', { detail: result }));
    });

    // Listen for audio control request
    window.addEventListener('eai-audio-control', function (e) {
        const action = e.detail?.action || 'stop';
        const result = tryAudioControl(action);
        window.dispatchEvent(new CustomEvent('eai-audio-control-result', { detail: result }));
    });

    // =========================================
    // AUTO-MONITORING FOR COMPLETION
    // =========================================

    // Watch for activity completion and notify content script
    let lastKnownStatus = null;
    let completionWatcher = null;

    function startCompletionWatcher() {
        if (completionWatcher) return;

        completionWatcher = setInterval(() => {
            try {
                let currentStatus = null;

                // Check FrameChain completion
                if (window.API && window.API.FrameChain) {
                    if (typeof window.API.FrameChain.isComplete === 'function' && window.API.FrameChain.isComplete()) {
                        currentStatus = 'chain_complete';
                    }
                }

                // Check activity status via playerView
                if (window.playerView && window.playerView.stageView) {
                    const activityStatus = window.playerView.stageView().ActivityStatus?.();
                    if (activityStatus === 'Complete') {
                        currentStatus = 'activity_complete';
                    }
                }

                // Notify if status changed
                if (currentStatus && currentStatus !== lastKnownStatus) {
                    console.log('[Edgenuity AI PageContext] Completion detected:', currentStatus);
                    window.dispatchEvent(new CustomEvent('eai-completion-detected', {
                        detail: { status: currentStatus }
                    }));
                    lastKnownStatus = currentStatus;
                }
            } catch (e) {
                // Ignore errors in watcher
            }
        }, 2000);
    }

    // Start the completion watcher after a delay to let the page load
    setTimeout(startCompletionWatcher, 3000);

    console.log('[Edgenuity AI PageContext] Page context script loaded with enhanced API support');
})();
