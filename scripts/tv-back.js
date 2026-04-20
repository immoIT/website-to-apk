// ==UserScript==
// @name         TV Back Button & Cursor Fix – Ultimate V2 (Hover Support)
// @run-at       document-idle
// ==/UserScript==

(function () {
    let lastBackTime = 0;
    let idleTimeout = null;
    let isHovering = false; // Check karega ki mouse/touch controls ke upar hai ya nahi

    /* =========================================================
       1. HISTORY TRAP & PLAYER STATES
       ========================================================= */
    function ensureHistoryTrap() {
        const playerModal = document.getElementById('playerModal');
        if (playerModal && playerModal.classList.contains('show')) {
            if (location.hash !== '#tv-trap') {
                history.pushState({ tvTrap: true }, "", location.href.split('#')[0] + '#tv-trap');
            }
        }
    }

    const pModal = document.getElementById('playerModal');
    if (pModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('show')) {
                    ensureHistoryTrap();
                    resetIdleTimer(); // Player khulte hi UI dikhao aur timer chalu karo
                } else if (location.hash === '#tv-trap') {
                    history.back(); 
                }
            });
        });
        observer.observe(pModal, { attributes: true, attributeFilter: ['class'] });
    }

    /* =========================================================
       2. SMART UI VISIBILITY CONTROLLER (3-SEC LOGIC)
       ========================================================= */
    function forceShowUI() {
        const els = ['controls', 'videoTitle', 'centerPlayBtn', 'closePlayerBtn'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('ui-hidden');
        });
        const wrapper = document.getElementById('wrapper');
        if (wrapper) wrapper.style.cursor = "default";
    }

    function forceHideUI() {
        const video = document.getElementById('video');
        
        // STRICT CONDITION: Agar video paused hai ya mouse controls ke upar hai, toh hide mat karo
        if ((video && video.paused) || isHovering) return;
        
        const els = ['controls', 'videoTitle', 'centerPlayBtn', 'closePlayerBtn'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('ui-hidden');
        });
        const wrapper = document.getElementById('wrapper');
        if (wrapper) wrapper.style.cursor = "none";
    }

    function resetIdleTimer() {
        forceShowUI(); // Movement hote hi UI show karo
        if (idleTimeout) clearTimeout(idleTimeout); // Purana timer cancel karo
        
        // Naya 3 second ka timer lagao
        idleTimeout = setTimeout(forceHideUI, 3000);
    }

    /* =========================================================
       3. BACK BUTTON LOGIC
       ========================================================= */
    function handlePlayerBackAction(e) {
        const now = Date.now();
        const timeDiff = now - lastBackTime;
        
        // Debounce: Android TV glitch roko
        if (timeDiff < 250) {
            if (e.type === 'popstate') ensureHistoryTrap();
            return;
        }

        // DOUBLE PRESS TO EXIT
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

        // Agar landscape hai toh pehle screen seedhi karo
        if (isRotated) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            ensureHistoryTrap();
            return;
        }

        // Agar controls chhupe hain toh show karo aur 3 second ka timer shuru karo
        if (isControlsHidden) {
            resetIdleTimer(); 
            ensureHistoryTrap();
            return;
        }
        
        // Agar controls dikh rahe hain, toh chupa do (unless hum hover kar rahe hain)
        if (!isControlsHidden) {
            if (!isHovering) forceHideUI();
            if (typeof showToast === 'function') {
                showToast('Double-press BACK button to exit video', 'warning');
            }
            ensureHistoryTrap();
            return;
        }
    }

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

    window.addEventListener("popstate", (e) => {
        const playerModal = document.getElementById('playerModal');
        if (playerModal && playerModal.classList.contains('show')) {
            handlePlayerBackAction(e);
        }
    });

    /* =========================================================
       4. VIRTUAL CURSOR, HOVER DETECTION & ANTI-HIDE HACK
       ========================================================= */
    const style = document.createElement("style");
    style.innerHTML = `
        *:focus { outline: none !important; box-shadow: none !important; }
        * { cursor: default !important; }
        #wrapper, .player-wrapper, video, body { cursor: default !important; }
    `;
    document.documentElement.appendChild(style);

    const virtualCursor = document.createElement("div");
    virtualCursor.id = "tv-virtual-cursor";
    virtualCursor.style.cssText = `
        position: fixed; top: 50%; left: 50%; width: 25px; height: 25px;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" stroke="black" stroke-width="1.5" d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.7z"/></svg>');
        background-size: contain; background-repeat: no-repeat;
        pointer-events: none; z-index: 2147483647; display: none;
        transform: translate(-2px, -2px); transition: none; 
    `;
    document.body.appendChild(virtualCursor);

    // Track Mouse/Touchpad Movement & Update Hover State
    window.addEventListener("mousemove", (e) => {
        const wrapper = document.getElementById("wrapper");
        const controls = document.getElementById("controls");
        const playerModal = document.getElementById('playerModal');
        
        // Agar cursor controls ke upar hai toh isHovering = true
        if (controls && controls.contains(e.target)) {
            isHovering = true;
        } else {
            isHovering = false;
        }

        // Kisi bhi movement par 3s ka timer reset karo
        if (playerModal && playerModal.classList.contains('show')) {
            resetIdleTimer();
        }

        // Virtual Cursor Render karna (Fullscreen/Landscape mein)
        const isFullscreen = document.fullscreenElement != null;
        const isRotated = wrapper && wrapper.classList.contains("player-landscape");

        if (isFullscreen || isRotated) {
            virtualCursor.style.display = "block";
            virtualCursor.style.left = e.clientX + "px";
            virtualCursor.style.top = e.clientY + "px";
        } else {
            virtualCursor.style.display = "none";
        }
    }, true);

    // Touch karne par bhi timer reset hoga
    window.addEventListener("touchstart", (e) => {
        const playerModal = document.getElementById('playerModal');
        if (playerModal && playerModal.classList.contains('show')) {
            resetIdleTimer();
        }
    }, true);

    window.addEventListener("mouseout", () => {
        virtualCursor.style.display = "none";
        isHovering = false; // Screen se cursor bahar, hover off
    });

    // ANTI-HIDE SAFETY LOOP:
    // Agar native `curl.js` ka timer hover ke bawajood controls chupane ki koshish kare, 
    // toh ye loop usey pakad kar turant wapas show kar dega (Bulletproof system).
    setInterval(() => {
        const playerModal = document.getElementById('playerModal');
        if (playerModal && playerModal.classList.contains('show')) {
            const video = document.getElementById('video');
            if (isHovering || (video && video.paused)) {
                forceShowUI();
            }
        }
    }, 500);

})();
