// ==UserScript==
// @name         TV Back Button & Cursor Fix – Ultimate
// @run-at       document-idle
// ==/UserScript==

(function () {
    /* =========================================================
       1. TV BACK BUTTON & HISTORY MANAGEMENT
       ========================================================= */

    let lastBackTime = 0;

    // ULTIMATE HISTORY TRAP: Uses URL Hash to force Android WebViews to respect back navigation
    function ensureHistoryTrap() {
        const playerModal = document.getElementById('playerModal');
        // Trap sirf tab lagayenge jab player screen par actively open ho
        if (playerModal && playerModal.classList.contains('show')) {
            if (location.hash !== '#tv-trap') {
                history.pushState({ tvTrap: true }, "", location.href.split('#')[0] + '#tv-trap');
            }
        }
    }

    // Auto-trap listener: Jab bhi video play hogi, trap lag jayega
    const pModal = document.getElementById('playerModal');
    if (pModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('show')) {
                    ensureHistoryTrap();
                } else if (location.hash === '#tv-trap') {
                    // Jab player native close button se band ho, toh URL saaf kar do
                    history.back(); 
                }
            });
        });
        observer.observe(pModal, { attributes: true, attributeFilter: ['class'] });
    }

    function handlePlayerBackAction(e) {
        const now = Date.now();
        const timeDiff = now - lastBackTime;
        
        // 1. DEBOUNCE FIX: Android TV ke double-fire glitch (ek sath 2 events) ko roko
        if (timeDiff < 250) {
            if (e.type === 'popstate') ensureHistoryTrap();
            return;
        }

        // 2. DOUBLE PRESS TO EXIT: Agar jaldi se 2 baar dabaya toh exit karo
        if (timeDiff <= 800) {
            lastBackTime = now;
            const closeBtn = document.getElementById('closePlayerBtn');
            if (closeBtn) closeBtn.click();
            return;
        }

        lastBackTime = now;

        const controls = document.getElementById('controls');
        const wrapper = document.getElementById('wrapper');
        const isControlsHidden = controls && controls.classList.contains('ui-hidden');
        const isRotated = wrapper && wrapper.classList.contains('player-landscape');

        // SCENARIO A: Agar video rotated (landscape) hai -> Pehle usey normal karo
        if (isRotated) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            ensureHistoryTrap();
            return;
        }

        // SCENARIO B: Agar UI chupa hua hai -> Wapas show karo
        if (isControlsHidden) {
            if (wrapper) {
                wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
                wrapper.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
            }
            ensureHistoryTrap();
            return;
        }
        
        // SCENARIO C: Agar UI pehle se dikh raha hai -> Usey HIDE karo (Exit mat karo)
        if (!isControlsHidden) {
            // Zabardasti UI chupao
            controls.classList.add('ui-hidden');
            const videoTitle = document.getElementById('videoTitle');
            const centerPlayBtn = document.getElementById('centerPlayBtn');
            const closePlayerBtn = document.getElementById('closePlayerBtn');
            
            if (videoTitle) videoTitle.classList.add('ui-hidden');
            if (centerPlayBtn) centerPlayBtn.classList.add('ui-hidden');
            if (closePlayerBtn) closePlayerBtn.classList.add('ui-hidden');
            
            // Screen par message show karo ki double press se exit hota hai
            if (typeof showToast === 'function') {
                showToast('Double-press BACK button to exit video', 'warning');
            }
            
            ensureHistoryTrap();
            return;
        }
    }

    // EVENT LISTENER: TV Remote ke Hardware Button ko intercept karna
    window.addEventListener("keydown", (e) => {
        if (!e.isTrusted) return;

        const isBackKey = e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 8 || e.key === "Escape" || e.key === "Back";
        
        if (isBackKey) {
            const playerModal = document.getElementById('playerModal');
            if (playerModal && playerModal.classList.contains('show')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                handlePlayerBackAction(e);
            }
        }
    }, true); 

    // EVENT LISTENER: Android WebView ki forced History Navigation ko intercept karna
    window.addEventListener("popstate", (e) => {
        const playerModal = document.getElementById('playerModal');
        if (playerModal && playerModal.classList.contains('show')) {
            handlePlayerBackAction(e);
        }
    });


    /* =========================================================
       2. VIRTUAL CURSOR & CSS OVERRIDES FOR ANDROID TV
       ========================================================= */

    // CSS Inject: Focus hatane aur Cursor force dikhane ke liye
    const style = document.createElement("style");
    style.innerHTML = `
        *:focus {
            outline: none !important;
            box-shadow: none !important;
        }
        * {
            cursor: default !important;
        }
        #wrapper, .player-wrapper, video, body {
            cursor: default !important;
        }
    `;
    document.documentElement.appendChild(style);

    // Nakli (Virtual) Cursor banayein Android TV ke liye
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
        pointer-events: none; /* Mouse clicks iske aar-paar ja sakein */
        z-index: 2147483647; /* Sabse upar dikhe */
        display: none;
        transform: translate(-2px, -2px);
        transition: none; 
    `;
    document.body.appendChild(virtualCursor);

    // Cursor Movement track karna
    window.addEventListener("mousemove", (e) => {
        const wrapper = document.getElementById("wrapper");
        const isFullscreen = document.fullscreenElement != null;
        const isRotated = wrapper && wrapper.classList.contains("player-landscape");

        // Jab Native Cursor kaam na kare (Fullscreen/Landscape), tab virtual cursor show karein
        if (isFullscreen || isRotated) {
            virtualCursor.style.display = "block";
            virtualCursor.style.left = e.clientX + "px";
            virtualCursor.style.top = e.clientY + "px";
        } else {
            virtualCursor.style.display = "none";
        }
    }, true);

    // Agar mouse screen se bahar chala jaye toh chup jaye
    window.addEventListener("mouseout", () => {
        virtualCursor.style.display = "none";
    });

})();
