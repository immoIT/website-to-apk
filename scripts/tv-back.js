// ==UserScript==
// @name         TV Back Button – Custom Player Only
// @run-at       document-start
// ==/UserScript==

(function () {
    let lastBackTime = 0;

    function showCustomPlayerControls() {
        const video = document.querySelector("video");
        if (!video) return false;

        // ❌ NEVER enable native controls
        video.controls = false;

        // Simulate user interaction to show custom UI
        video.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        return true;
    }

    // Ensure history stack exists so BACK can be intercepted
    if (history.length < 2) {
        history.pushState(null, "", location.href);
    }

    window.addEventListener("popstate", () => {
        const now = Date.now();

        // First BACK → show custom controls
        if (now - lastBackTime > 800) {
            const handled = showCustomPlayerControls();
            lastBackTime = now;

            if (handled) {
                // Stop WebView navigation
                history.pushState(null, "", location.href);
            }
        }
        // Second BACK → app exits (handled by requireDoubleBackToExit)
    });
})();
