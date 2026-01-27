// ==UserScript==
// @name         TV Back Button Player Control
// @run-at       document-start
// ==/UserScript==

(function () {
    let lastBackTime = 0;

    function showPlayerControls() {
        // Try common video players
        const video = document.querySelector("video");
        if (!video) return false;

        // Trigger user interaction
        video.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
        video.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        // If controls are hidden, force show
        video.controls = true;

        return true;
    }

    // Listen for history change (BACK button in WebView)
    window.addEventListener("popstate", () => {
        const now = Date.now();

        // First BACK press
        if (now - lastBackTime > 800) {
            const handled = showPlayerControls();
            lastBackTime = now;

            if (handled) {
                // Prevent navigation
                history.pushState(null, "", location.href);
            }
        }
        // Second BACK press → app will exit
    });

    // Ensure history stack exists
    history.pushState(null, "", location.href);
})();
