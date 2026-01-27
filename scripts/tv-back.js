// ==UserScript==
// @name         TV Unified Controls + Dark Mode Fix
// @run-at       document-start
// ==/UserScript==

(function () {

    /* -------------------------------
       STATE
    --------------------------------*/
    let lastBackTime = 0;
    let hideTimer = null;
    let navigationActive = false;
    let navTimeout = null;

    /* -------------------------------
       UTILITIES
    --------------------------------*/
    function clearHideTimer() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function scheduleHide() {
        clearHideTimer();
        hideTimer = setTimeout(() => {
            if (!navigationActive) {
                // custom players auto-hide on inactivity
            }
        }, 3000);
    }

    function getVideo() {
        return document.querySelector("video");
    }

    /* -------------------------------
       PLAYER CONTROLS
    --------------------------------*/
    function showCustomPlayerControls() {
        const video = getVideo();
        if (!video) return false;

        // NEVER allow native controls
        video.controls = false;

        // Simulate user interaction for custom UI
        ["mousemove", "mousedown", "mouseup", "click"].forEach(evt =>
            video.dispatchEvent(new MouseEvent(evt, { bubbles: true }))
        );

        scheduleHide();
        return true;
    }

    /* -------------------------------
       STYLE FIXES (NO OUTLINES)
    --------------------------------*/
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

    /* -------------------------------
       BACK BUTTON HANDLING
    --------------------------------*/
    if (history.length < 2) {
        history.pushState(null, "", location.href);
    }

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
        // Second BACK → app exits (handled by APK)
    });

    /* -------------------------------
       NAVIGATION (TV REMOTE)
    --------------------------------*/
    document.addEventListener("keydown", e => {
        const navKeys = [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Enter",
            "OK"
        ];

        if (!navKeys.includes(e.key)) return;

        navigationActive = true;
        scheduleHide();

        clearTimeout(navTimeout);
        navTimeout = setTimeout(() => {
            navigationActive = false;
        }, 3000);
    }, true);

    /* -------------------------------
       INTERACTION RESETS TIMER
    --------------------------------*/
    ["click", "mousemove", "touchstart"].forEach(evt => {
        document.addEventListener(evt, () => {
            scheduleHide();
        }, true);
    });

    /* -------------------------------
       DARK MODE TOGGLE FIX
    --------------------------------*/
    function applyDarkMode(forceDark) {
        document.documentElement.classList.toggle("dark", forceDark);
        document.body.classList.toggle("dark", forceDark);
        localStorage.setItem("theme", forceDark ? "dark" : "light");
    }

    document.addEventListener("click", e => {
        const toggle = e.target.closest(
            "[data-theme-toggle], .theme-toggle, .dark-toggle"
        );
        if (!toggle) return;

        e.preventDefault();
        const isDark = document.documentElement.classList.contains("dark");
        applyDarkMode(!isDark);
    }, true);

})();
