// ==UserScript==
// @name         TV Back Button & Cursor Fix – Seamless V3
// @run-at       document-idle
// ==/UserScript==

(function () {
    let lastBackTime = 0;
    let isHovering = false; // TV Virtual Cursor hover check

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
                    // Naye curl.js ko trigger karo UI show karne ke liye (native timer start hoga)
                    const wrapper = document.getElementById('wrapper');
                    if (wrapper) wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
                } else if (location.hash === '#tv-trap') {
                    history.back(); 
                }
            });
        });
        observer.observe(pModal, { attributes: true, attributeFilter: ['class'] });
    }

    /* =========================================================
       2. BACK BUTTON LOGIC
       ========================================================= */
    function handlePlayerBackAction(e) {
        const now = Date.now();
        const timeDiff = now - lastBackTime;
        
        // Debounce: Android TV glitch protection
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

        // SCENARIO 1: Agar landscape hai, pehle usey normal karo
        if (isRotated) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            ensureHistoryTrap();
            return;
        }

        // SCENARIO 2: Agar controls chhupe hain -> Native curl.js ko event bhej kar UI dikhao
        if (isControlsHidden) {
            if (wrapper) {
                // Ye direct curl (4).js ka 5-second native timer start kar dega
                wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
            }
            ensureHistoryTrap();
            return;
        }
        
        // SCENARIO 3: Agar controls dikh rahe hain aur hum hover NAHI kar rahe -> Force Hide karo
        if (!isControlsHidden) {
            if (!isHovering) {
                const video = document.getElementById('video');
                // Video paused hone par manually chupaane ki zaroorat nahi
                if (video && !video.paused) {
                    const els = ['controls', 'videoTitle', 'centerPlayBtn', 'closePlayerBtn'];
                    els.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.add('ui-hidden');
                    });
                    if (wrapper) wrapper.style.cursor = "none";
                }
            }
            if (typeof showToast === 'function') {
                showToast('Double-press BACK to exit video', 'warning');
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
       3. VIRTUAL CURSOR & HOVER DETECTION
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

    // Track Movement & Update Hover State
    window.addEventListener("mousemove", (e) => {
        const wrapper = document.getElementById("wrapper");
        const controls = document.getElementById("controls");
        
        // Update TV hover state seamlessly
        if (controls && controls.contains(e.target)) {
            isHovering = true;
        } else {
            isHovering = false;
        }

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

    window.addEventListener("mouseout", () => {
        virtualCursor.style.display = "none";
        isHovering = false;
    });

})();
