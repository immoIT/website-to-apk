// ==UserScript==
// @name         TV Back Button – Custom Player Deep Fix (3s timeout)
// @run-at       document-start
// ==/UserScript==

(function () {
    let lastBackTime = 0;
    let hideTimer = null;
    
    // Deep Configuration Thresholds
    const DOUBLE_PRESS_TIMEOUT = 800; // ms to trigger Exit
    const DEBOUNCE_TIMEOUT = 250;     // ms to ignore TV double-firing glitches

    function clearHideTimer() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function hideControls(video) {
        if (!video) return;
        // The custom player's native inactive timer will take over
    }

    function showCustomPlayerControls() {
        const video = document.querySelector("video");
        if (!video) return false;

        // Never show raw HTML5 controls
        video.controls = false;

        // DEEP FIX: Find the actual UI wrapper layer on top of the video
        const rect = video.getBoundingClientRect();
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        
        // Target the overlay, fallback to video parent, fallback to body
        const targetElement = document.elementFromPoint(centerX, centerY) || video.parentElement || document.body;

        const eventOpts = { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY };

        // 1. Dispatch pointer events to the overlay to wake up the UI
        targetElement.dispatchEvent(new MouseEvent("mousemove", eventOpts));
        targetElement.dispatchEvent(new PointerEvent("pointermove", eventOpts));
        targetElement.dispatchEvent(new MouseEvent("mouseover", eventOpts));

        // 2. Dispatch a harmless keystroke (Shift) - highly effective for TV players
        document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Shift", code: "ShiftLeft", keyCode: 16 }));

        // Reset hide timer to 3 seconds
        clearHideTimer();
        hideTimer = setTimeout(() => hideControls(video), 3000);

        return true;
    }

    // Remove focus / outline / outer highlight lines globally
    const style = document.createElement("style");
    style.innerHTML = `
        *:focus {
            outline: none !important;
            box-shadow: none !important;
        }
        video::-webkit-media-controls {
            display: none !important;
        }
    `;
    document.documentElement.appendChild(style);

    // DEEP FIX: Robust History Trap Management
    function ensureHistoryTrap() {
        if (!history.state || history.state.tvTrap !== true) {
            history.pushState({ tvTrap: true }, "", location.href);
        }
    }
    
    // Set initial trap
    ensureHistoryTrap();

    function handleBackAction(e) {
        const now = Date.now();
        const timeDiff = now - lastBackTime;

        // 1. DEBOUNCE: Ignore duplicate events from Android TV (keydown + popstate firing together)
        if (timeDiff < DEBOUNCE_TIMEOUT) {
            if (e.type === "popstate") ensureHistoryTrap(); // Restore trap if popstate consumed it natively
            if (e.type !== "popstate" && e.preventDefault) {
                e.preventDefault();
                e.stopPropagation();
            }
            return; // Exit early, don't update lastBackTime
        }

        // 2. DOUBLE PRESS: Exit the player
        if (timeDiff <= DOUBLE_PRESS_TIMEOUT) {
            // If the trap is currently active, we need to manually bypass it to force exit
            if (e.type === "popstate") {
                history.back(); // Popstate already consumed the trap, go back once more to exit
            } else {
                history.back(); // Consume trap
                setTimeout(() => history.back(), 50); // Execute actual exit
            }
            return;
        }

        // 3. SINGLE PRESS: Show Controls
        const handled = showCustomPlayerControls();
        if (handled) {
            lastBackTime = now;
            
            if (e.type === "popstate") {
                // If popstate fired, the browser consumed our trap. We must put it back.
                ensureHistoryTrap();
            } else {
                // If keydown caught it, prevent the browser from executing popstate natively.
                if (e.preventDefault) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        }
    }

    // Listeners for TV Remote Hardware Keys
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 8 || e.key === "Escape" || e.key === "Back") {
            handleBackAction(e);
        }
    }, true);

    // Fallback for native browser back navigation 
    window.addEventListener("popstate", (e) => {
        handleBackAction(e);
    });

    // Reset the 3s timer on standard user interaction
    ["click", "mousemove", "touchstart", "keydown"].forEach(evt => {
        document.addEventListener(evt, (e) => {
            // Ignore if it's the back button triggering this
            if (e.type === 'keydown' && (e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 8)) return;
            
            const video = document.querySelector("video");
            if (video) {
                clearHideTimer();
                hideTimer = setTimeout(() => hideControls(video), 3000);
            }
        }, true);
    });
})();
