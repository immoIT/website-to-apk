// ==UserScript==
// @name         TV Back Button & Cursor Fix – Curl.js Deep Integration
// @run-at       document-idle
// ==/UserScript==

(function () {
    /* =========================================================
       1. TV BACK BUTTON & HISTORY MANAGEMENT
       ========================================================= */

    // HISTORY TRAP: Catches aggressive Android TV hardware back navigation
    function ensureHistoryTrap() {
        if (!history.state || history.state.tvTrap !== true) {
            history.pushState({ tvTrap: true }, "", location.href);
        }
    }

    // Initialize trap on load
    ensureHistoryTrap();

    // CORE LOGIC: Reads curl.js state to decide what to do
    function handlePlayerBackAction(e) {
        const controls = document.getElementById('controls');
        const wrapper = document.getElementById('wrapper');
        
        // Read native curl.js states
        const isControlsHidden = controls && controls.classList.contains('ui-hidden');
        const isRotated = wrapper && wrapper.classList.contains('player-landscape');

        // SCENARIO 1: Controls are hidden -> SINGLE PRESS: Show Controls
        if (isControlsHidden) {
            // Wake up curl.js native controls by simulating a mousemove on its wrapper
            if (wrapper) {
                wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
                wrapper.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
            }
            ensureHistoryTrap(); // Keep the trap alive for the next press
            return;
        }

        // SCENARIO 2: Controls are visible, but player is in Landscape/Rotation mode
        if (isRotated) {
            // Exit rotation first (don't close the player yet)
            // Dispatch a non-trusted Escape key so curl.js's native listener handles the un-rotation
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true
            }));
            ensureHistoryTrap(); 
            return;
        }

        // SCENARIO 3: Controls are visible, normal orientation -> DOUBLE PRESS: Exit Player
        const closeBtn = document.getElementById('closePlayerBtn');
        if (closeBtn) {
            closeBtn.click(); // Triggers curl.js native closePlayer() function cleanly
        }
        
        // Note: We do NOT re-arm the trap here. The player is closed, 
        // allowing the TV back button to return to normal dashboard navigation.
    }

    // EVENT LISTENER: Hardware Key Interception (Capture Phase)
    window.addEventListener("keydown", (e) => {
        // Prevent infinite loops if our script dispatches an artificial keystroke
        if (!e.isTrusted) return;

        const isBackKey = e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 8 || e.key === "Escape" || e.key === "Back";
        
        if (isBackKey) {
            const playerModal = document.getElementById('playerModal');
            
            // Only intercept the back button if the curl.js Player Modal is actively open
            if (playerModal && playerModal.classList.contains('show')) {
                
                // Stop curl.js or Bootstrap from acting immediately
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                handlePlayerBackAction(e);
            }
        }
    }, true); 

    // EVENT LISTENER: Popstate Interception (For WebViews that force history nav)
    window.addEventListener("popstate", (e) => {
        const playerModal = document.getElementById('playerModal');
        
        // If the player is open and the browser forced a history back action, stop it
        if (playerModal && playerModal.classList.contains('show')) {
            handlePlayerBackAction(e);
        }
    });


    /* =========================================================
       2. VIRTUAL CURSOR & CSS OVERRIDES FOR ANDROID TV
       ========================================================= */

    // GLOBAL STYLE CLEANUP: Removes TV focus rings and forces cursor visibility
    const style = document.createElement("style");
    style.innerHTML = `
        /* Remove TV Focus Rings globally */
        *:focus {
            outline: none !important;
            box-shadow: none !important;
        }
        /* Override curl.js 'cursor: none' and force it to be visible */
        * {
            cursor: default !important;
        }
        #wrapper, .player-wrapper, video, body {
            cursor: default !important;
        }
    `;
    document.documentElement.appendChild(style);

    // Create a Virtual Hardware Cursor for Android TV Fullscreen/Landscape
    const virtualCursor = document.createElement("div");
    virtualCursor.id = "tv-virtual-cursor";
    virtualCursor.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 25px;
        height: 25px;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" stroke="black" stroke-width="1.5" d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.7z"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        pointer-events: none; /* Let clicks pass through to buttons */
        z-index: 2147483647; /* Force to absolute top above everything */
        display: none;
        transform: translate(-2px, -2px); /* Adjust clicking hotspot */
        transition: none; /* Must be instant for smooth tracking */
    `;
    document.body.appendChild(virtualCursor);

    // Track Mouse Movement and Force Arrow
    window.addEventListener("mousemove", (e) => {
        const wrapper = document.getElementById("wrapper");
        const isFullscreen = document.fullscreenElement != null;
        const isRotated = wrapper && wrapper.classList.contains("player-landscape");

        // Android TV WebView hides native cursor in fullscreen/landscape.
        // We force our virtual cursor to show up in these states.
        if (isFullscreen || isRotated) {
            virtualCursor.style.display = "block";
            virtualCursor.style.left = e.clientX + "px";
            virtualCursor.style.top = e.clientY + "px";
        } else {
            // Normal mode - let native cursor take over
            virtualCursor.style.display = "none";
        }
    }, true); // Use capture phase

    // Hide virtual cursor if mouse leaves screen entirely
    window.addEventListener("mouseout", () => {
        virtualCursor.style.display = "none";
    });

})();
