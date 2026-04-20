// ==UserScript==
// @name         TV Back Button – Curl.js Deep Integration
// @run-at       document-idle
// ==/UserScript==

(function () {
    // 1. HISTORY TRAP: Catches aggressive Android TV hardware back navigation
    function ensureHistoryTrap() {
        if (!history.state || history.state.tvTrap !== true) {
            history.pushState({ tvTrap: true }, "", location.href);
        }
    }

    // Initialize trap on load
    ensureHistoryTrap();

    // 2. CORE LOGIC: Reads curl.js state to decide what to do
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

    // 3. EVENT LISTENER: Hardware Key Interception (Capture Phase)
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

    // 4. EVENT LISTENER: Popstate Interception (For WebViews that force history nav)
    window.addEventListener("popstate", (e) => {
        const playerModal = document.getElementById('playerModal');
        
        // If the player is open and the browser forced a history back action, stop it
        if (playerModal && playerModal.classList.contains('show')) {
            handlePlayerBackAction(e);
        }
    });

    // 5. GLOBAL STYLE CLEANUP: Removes TV focus rings
    const style = document.createElement("style");
    style.innerHTML = `
        *:focus {
            outline: none !important;
            box-shadow: none !important;
        }
    `;
    document.documentElement.appendChild(style);
})();
