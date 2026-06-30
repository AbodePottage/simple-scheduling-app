// Minimal theme toggle with localStorage persistence. Mirrors the app it documents.
// Also renders any inline <pre class="mermaid"> diagrams via a pinned CDN, themed to match.
(function () {
  var KEY = "chronicle.theme";
  var saved = localStorage.getItem(KEY);
  if (saved) document.documentElement.setAttribute("data-theme", saved);

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  // ---- Mermaid: only loaded if this page actually has diagrams ----
  var mermaid = null;
  var blocks = [];

  function renderDiagrams() {
    if (!mermaid || !blocks.length) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: currentTheme() === "dark" ? "dark" : "default",
      fontFamily: "inherit"
    });
    blocks.forEach(function (el) {
      el.removeAttribute("data-processed");
      el.textContent = el.getAttribute("data-src");
    });
    mermaid.run({ nodes: blocks });
  }

  function initDiagrams() {
    blocks = Array.prototype.slice.call(document.querySelectorAll("pre.mermaid"));
    if (!blocks.length) return;
    // Stash each diagram's source once, so theme switches can re-render from scratch.
    blocks.forEach(function (el) { el.setAttribute("data-src", el.textContent); });
    import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs")
      .then(function (mod) { mermaid = mod.default; renderDiagrams(); })
      .catch(function () { /* offline: the source text stays visible as a fallback */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDiagrams);
  } else {
    initDiagrams();
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".theme-toggle");
    if (!btn) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(KEY, next);
    renderDiagrams();
  });
})();
