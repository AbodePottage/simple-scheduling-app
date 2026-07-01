// Minimal theme toggle + text-zoom with localStorage persistence.
// Also renders inline <pre class="mermaid"> diagrams and syntax-highlights code blocks,
// both via pinned CDNs and only when the page actually needs them.
(function () {
  // ── Apply persisted preferences immediately, before first paint ──────────
  var THEME_KEY = "chronicle.theme";
  var ZOOM_KEY  = "chronicle.zoom";
  var ZOOM_STEPS = [13, 15, 17, 19, 22]; // root px values
  var ZOOM_DEFAULT = 1; // index into ZOOM_STEPS

  var savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  var savedZoom = parseInt(localStorage.getItem(ZOOM_KEY), 10);
  if (savedZoom && ZOOM_STEPS.indexOf(savedZoom) >= 0) {
    document.documentElement.style.fontSize = savedZoom + "px";
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function currentZoomIdx() {
    var px = parseInt(document.documentElement.style.fontSize, 10);
    if (isNaN(px)) px = ZOOM_STEPS[ZOOM_DEFAULT];
    var idx = ZOOM_STEPS.indexOf(px);
    return idx >= 0 ? idx : ZOOM_DEFAULT;
  }

  // ── Mermaid: only loaded if this page actually has diagrams ──────────────
  var mermaid = null;
  var blocks = [];

  var HL_BASE = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/";
  var hlCss = null;

  function renderDiagrams() {
    if (!mermaid || !blocks.length) return;
    var dark = currentTheme() === "dark";
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      themeVariables: dark ? {
        // Dark palette — lifted straight from the chronicle's CSS variables
        primaryColor:        "#172033",  // --surface-strong: node fills
        primaryTextColor:    "#e5e7eb",  // --text
        primaryBorderColor:  "#334155",  // --border-strong
        lineColor:           "#9ca3af",  // --muted: arrows
        mainBkg:             "#172033",
        nodeBorder:          "#334155",
        clusterBkg:          "#111827",  // --surface: subgraph bg
        clusterBorder:       "#60a5fa",  // --accent: subgraph outline
        titleColor:          "#e5e7eb",
        edgeLabelBackground: "#111827",
        background:          "#0f172a"   // --surface-soft
      } : {
        // Light palette
        primaryColor:        "#f8fafc",  // --surface-soft
        primaryTextColor:    "#1f2937",  // --text
        primaryBorderColor:  "#d1d5db",  // --border-strong
        lineColor:           "#4b5563",  // --muted
        mainBkg:             "#f8fafc",
        nodeBorder:          "#d1d5db",
        clusterBkg:          "#ffffff",  // --surface
        clusterBorder:       "#1d4ed8",  // --accent
        titleColor:          "#1f2937",
        edgeLabelBackground: "#ffffff",
        background:          "#ffffff"
      }
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
    blocks.forEach(function (el) { el.setAttribute("data-src", el.textContent); });
    import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs")
      .then(function (mod) { mermaid = mod.default; renderDiagrams(); })
      .catch(function () { /* offline: source text stays visible */ });
  }

  // ── Syntax highlighting: highlight.js from a pinned CDN ──────────────────
  function initHighlight() {
    var codes = Array.prototype.slice.call(document.querySelectorAll("pre > code"));
    codes = codes.filter(function (c) { return !c.classList.contains("nohighlight"); });
    if (!codes.length) return;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = HL_BASE + (currentTheme() === "dark" ? "github-dark.min.css" : "github.min.css");
    document.head.appendChild(css);
    hlCss = css;

    var lib = document.createElement("script");
    lib.src = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js";
    lib.onload = function () {
      if (!window.hljs) return;
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

  // ── Zoom buttons ─────────────────────────────────────────────────────────
  function initZoom() {
    var outBtn = document.querySelector(".zoom-out");
    var inBtn  = document.querySelector(".zoom-in");
    if (!outBtn || !inBtn) return;

    function sync() {
      var idx = currentZoomIdx();
      outBtn.disabled = idx <= 0;
      inBtn.disabled  = idx >= ZOOM_STEPS.length - 1;
    }

    sync();

    outBtn.addEventListener("click", function () {
      var idx = currentZoomIdx();
      if (idx <= 0) return;
      idx--;
      document.documentElement.style.fontSize = ZOOM_STEPS[idx] + "px";
      localStorage.setItem(ZOOM_KEY, ZOOM_STEPS[idx]);
      sync();
    });

    inBtn.addEventListener("click", function () {
      var idx = currentZoomIdx();
      if (idx >= ZOOM_STEPS.length - 1) return;
      idx++;
      document.documentElement.style.fontSize = ZOOM_STEPS[idx] + "px";
      localStorage.setItem(ZOOM_KEY, ZOOM_STEPS[idx]);
      sync();
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function init() { initDiagrams(); initHighlight(); initZoom(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── Global click handler (theme toggle) ──────────────────────────────────
  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".theme-toggle");
    if (!btn) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    if (hlCss) hlCss.href = HL_BASE + (next === "dark" ? "github-dark.min.css" : "github.min.css");
    renderDiagrams();
  });
})();
