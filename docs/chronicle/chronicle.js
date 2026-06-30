// Minimal theme toggle with localStorage persistence. Mirrors the app it documents.
// Also renders inline <pre class="mermaid"> diagrams and syntax-highlights code blocks,
// both via pinned CDNs and only when the page actually needs them.
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

  // ---- Syntax highlighting: highlight.js from a pinned CDN ----
  // The deck's code blocks are dark in both themes (editor style), so we always
  // use a dark token theme; only the token colors are added, the background stays.
  function initHighlight() {
    var codes = Array.prototype.slice.call(document.querySelectorAll("pre > code"));
    codes = codes.filter(function (c) { return !c.classList.contains("nohighlight"); });
    if (!codes.length) return;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css";
    document.head.appendChild(css);

    var lib = document.createElement("script");
    lib.src = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js";
    lib.onload = function () {
      if (!window.hljs) return;
      // Restrict auto-detection to languages this deck actually uses, so a TS
      // snippet never gets mistaken for PHP/Ruby/etc.
      var subset = ["typescript", "javascript", "json", "bash", "xml", "css", "dockerfile", "yaml"];
      codes.forEach(function (c) {
        var explicit = (c.className.match(/language-(\w+)/) || [])[1];
        var result = explicit
          ? window.hljs.highlight(c.textContent, { language: explicit })
          : window.hljs.highlightAuto(c.textContent, subset);
        c.innerHTML = result.value;
        c.classList.add("hljs");
      });
    };
    document.head.appendChild(lib);
  }

  function init() { initDiagrams(); initHighlight(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
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
