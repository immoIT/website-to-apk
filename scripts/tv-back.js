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

    // Ensure history stack exists
    if (history.length < 2) {
        history.pushState(null, "", location.href);
    }

    // BACK button handling
    window.addEventListener("popstate", () => {
        const now = Date.now();

        // First BACK → show controls
        if (now - lastBackTime > 800) {
            const handled = showCustomPlayerControls();
            lastBackTime = now;

            if (handled) {
                history.pushState(null, "", location.href);
            }
        }
        // Second BACK → app exits (handled by requireDoubleBackToExit)
    });

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
