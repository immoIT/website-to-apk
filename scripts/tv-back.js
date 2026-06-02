// ==UserScript==
// @name         Mobile View Optimizer (Firefox View)
// @description  Optimizes Web-to-APK view to match standard mobile browser rendering.
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Enforce strict Mobile Viewport (Like Firefox/Chrome Mobile)
    const enforceViewport = () => {
        let metaViewport = document.querySelector('meta[name="viewport"]');
        if (!metaViewport) {
            metaViewport = document.createElement('meta');
            metaViewport.name = "viewport";
            document.head.appendChild(metaViewport);
        }
        // Force the page to fit the screen width and disable unwanted pinch-to-zoom issues in APKs
        metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    };

    // 2. Override WebView styling to match mobile browser experience
    const injectMobileCSS = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            /* Reset cursor to auto (removes the TV pointer restrictions) */
            * {
                cursor: auto !important;
                -webkit-tap-highlight-color: transparent; /* Removes blue tap highlight */
            }
            
            /* Ensure text sizes don't artificially inflate on rotation or load */
            html, body {
                -webkit-text-size-adjust: 100%;
                -moz-text-size-adjust: 100%;
                text-size-adjust: 100%;
                overflow-x: hidden !important;
                width: 100%;
            }

            /* Optional: Hide scrollbars for a clean native app feel */
            ::-webkit-scrollbar {
                width: 0px;
                background: transparent;
            }
        `;
        
        // Append styles safely
        if (document.head || document.documentElement) {
            (document.head || document.documentElement).appendChild(style);
        }
    };

    // Execute immediately to prevent layout shifts
    enforceViewport();
    injectMobileCSS();

    // Re-ensure settings on DOM load in case dynamic content/framework overrides them
    document.addEventListener('DOMContentLoaded', () => {
        enforceViewport();
        injectMobileCSS();
    });

})();
