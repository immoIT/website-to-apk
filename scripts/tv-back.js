// ==UserScript==
// @name         TV Back Button & Cursor Fix – Seamless V3 (With Splash & Perms)
// @run-at       document-idle
// @grant        GM_setClipboard
// @grant        GM_getClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      *
// ==/UserScript==

(function () {
    /* =========================================================
       0. SPLASH SCREEN LOGIC (FIRST TIME LOAD)
       ========================================================= */
    function showSplashScreen() {
        // Only show once per session to prevent annoyance on every page navigation
        if (sessionStorage.getItem('tvAppSplashShown')) return;
        sessionStorage.setItem('tvAppSplashShown', 'true');

        // Attempt to find the site's favicon, fallback to root favicon.ico
        const faviconUrl = document.querySelector("link[rel*='icon']")?.href || '/favicon.ico';

        // Create the full-screen overlay
        const splash = document.createElement('div');
        splash.id = 'tv-splash-screen';
        splash.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #0a0a0a; z-index: 2147483647;
            display: flex; justify-content: center; align-items: center;
            opacity: 1; transition: opacity 0.8s ease-out;
        `;

        // Create the pulsing favicon image
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.style.cssText = `
            width: 120px; height: 120px; border-radius: 20%;
            box-shadow: 0 0 20px rgba(255,255,255,0.1);
            animation: tv-splash-pulse 1s infinite alternate;
        `;

        // Inject animation keyframes
        const animStyle = document.createElement('style');
        animStyle.innerHTML = `
            @keyframes tv-splash-pulse {
                0% { transform: scale(1); box-shadow: 0 0 15px rgba(255,255,255,0.1); }
                100% { transform: scale(1.15); box-shadow: 0 0 40px rgba(255,255,255,0.4); }
            }
        `;
        document.head.appendChild(animStyle);

        splash.appendChild(img);
        document.body.appendChild(splash);

        // Handle Image Fallback (if favicon fails to load, remove splash early)
        img.onerror = () => { splash.remove(); };

        // Fade out and remove after 2 seconds
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                if (splash.parentNode) splash.remove();
            }, 800); // wait for fade transition to finish
        }, 2000);
    }

    // Trigger splash screen on init
    showSplashScreen();

    /* =========================================================
       1. HISTORY TRAP & PLAYER STATES
       ========================================================= */
    let lastBackTime = 0;
    let isHovering = false; // TV Virtual Cursor hover check

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
        
        if (timeDiff < 250) {
            if (e.type === 'popstate') ensureHistoryTrap();
            return;
        }

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

        if (isRotated) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            ensureHistoryTrap();
            return;
        }

        if (isControlsHidden) {
            if (wrapper) {
                wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
            }
            ensureHistoryTrap();
            return;
        }
        
        if (!isControlsHidden) {
            if (!isHovering) {
                const video = document.getElementById('video');
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

    window.addEventListener("mousemove", (e) => {
        const wrapper = document.getElementById("wrapper");
        const controls = document.getElementById("controls");
        
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
