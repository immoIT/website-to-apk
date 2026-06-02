// ==UserScript==
// @name         Firefox Mobile View Enforcer
// @description  Forces the website to render exactly as it does on Firefox Mobile by spoofing the User-Agent.
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Spoof User-Agent to Firefox Mobile (Android)
    // Yeh website ko bata dega ki user Firefox Mobile use kar raha hai
    const firefoxMobileUA = "Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0";
    
    try {
        Object.defineProperty(navigator, 'userAgent', {
            get: function() { return firefoxMobileUA; }
        });
        // Chrome me vendor "Google Inc." hota hai, Firefox me blank hota hai
        Object.defineProperty(navigator, 'vendor', {
            get: function() { return ""; } 
        });
    } catch (e) {
        console.warn("User-Agent spoofing issue:", e);
    }

    // 2. Enforce Mobile Viewport for perfect scaling
    const enforceFirefoxViewport = () => {
        let metaViewport = document.querySelector('meta[name="viewport"]');
        if (!metaViewport) {
            metaViewport = document.createElement('meta');
            metaViewport.name = "viewport";
            document.head.appendChild(metaViewport);
        }
        // Prevents zooming and ensures it fits the mobile screen perfectly
        metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    };

    // 3. Optional: CSS tweaks to enforce native Firefox behavior
    const injectFirefoxCSS = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            * {
                -webkit-tap-highlight-color: transparent; /* Removes unwanted tap colors */
                cursor: auto !important; /* Removes TV pointer rules */
            }
            html, body {
                overflow-x: hidden !important; /* Prevents horizontal scrolling */
                width: 100%;
            }
        `;
        if (document.head || document.documentElement) {
            (document.head || document.documentElement).appendChild(style);
        }
    };

    // Execute functions immediately to apply before the page fully loads
    enforceFirefoxViewport();
    injectFirefoxCSS();

    // Re-apply on DOM load in case dynamic elements override it
    document.addEventListener('DOMContentLoaded', () => {
        enforceFirefoxViewport();
        injectFirefoxCSS();
    });

})();
