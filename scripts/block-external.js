// ==UserScript==
// @name         Block External Links
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function () {
  const ALLOWED_HOST = "osr-qjr7.onrender.com";

  function isAllowed(url) {
    try {
      const u = new URL(url, location.href);
      return u.hostname === ALLOWED_HOST || u.hostname.endsWith("." + ALLOWED_HOST);
    } catch (e) {
      return false;
    }
  }

  // Block <a> clicks
  document.addEventListener("click", function (e) {
    const a = e.target.closest("a");
    if (!a || !a.href) return;

    if (!isAllowed(a.href)) {
      e.preventDefault();
      e.stopPropagation();
      console.warn("Blocked external link:", a.href);
    }
  }, true);

  // Block window.open
  const _open = window.open;
  window.open = function (url) {
    if (isAllowed(url)) {
      return _open.apply(window, arguments);
    }
    console.warn("Blocked window.open:", url);
    return null;
  };
})();
