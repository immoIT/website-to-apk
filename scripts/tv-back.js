// ==UserScript==
// @name         TV Back Button – Custom Player (3s timeout)
// @run-at       document-start
// ==/UserScript==

(function () {
    let lastBackTime = 0;
    let hideTimer = null;

    function clearHideTimer() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function hideControls(video) {
        if (!video) return;
        // Most custom players hide on inactivity automatically,
        // we just stop sending interaction events
    }

    function showCustomPlayerControls() {
        const video = document.querySelector("video");
        if (!video) return false;

        // ❌ never show native controls
        video.controls = false;

        // Simulate interaction to show custom UI
        // Dispatching multiple events to ensure the player UI wakes up
        video.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("click", { bubbles: true }));

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

    // Ensure history stack exists for popstate fallback
    if (history.length < 2) {
        history.pushState(null, "", location.href);
    }

    // --- UPDATED BACK BUTTON HANDLING ---

    function handleBackAction(e) {
        const now = Date.now();

        // Check if it is a "Single Press" (more than 800ms since last press)
        if (now - lastBackTime > 800) {
            const handled = showCustomPlayerControls();
            
            if (handled) {
                lastBackTime = now;
                
                // IMPORTANT: Stop the immediate "Back" (Exit) action so controls can show
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }

                // Re-push state to keep the "trap" active for the next press
                history.pushState(null, "", location.href);
            }
        } 
        // If pressed again quickly (< 800ms), we do NOT preventDefault.
        // This allows the browser's native "Back" behavior (Exit) to happen.
    }

    // 1. Listen for Hardware Key Events (Crucial for TV Remotes)
    window.addEventListener("keydown", (e) => {
        // Key codes: 
        // 27 (Escape/Android Back)
        // 461 (LG WebOS Back)
        // 10009 (Samsung Tizen Return)
        // 8 (Backspace)
        if (e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 8 || e.key === "Escape" || e.key === "Back") {
            handleBackAction(e);
        }
    }, true); // Use capture phase to intercept before other scripts

    // 2. Keep popstate as a fallback for standard browser navigation
    window.addEventListener("popstate", (e) => {
        handleBackAction(e);
    });

    // --- END UPDATED HANDLING ---

    // Any user interaction resets the 3s timer
    ["click", "mousemove", "touchstart", "keydown"].forEach(evt => {
        document.addEventListener(evt, () => {
            const video = document.querySelector("video");
            if (!video) return;

            clearHideTimer();
            hideTimer = setTimeout(() => hideControls(video), 3000);
        }, true);
    });
})();
