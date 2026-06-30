// Minimal theme toggle with localStorage persistence. Mirrors the app it documents.
(function () {
  var KEY = "chronicle.theme";
  var saved = localStorage.getItem(KEY);
  if (saved) document.documentElement.setAttribute("data-theme", saved);

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".theme-toggle");
    if (!btn) return;
    var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(KEY, next);
  });
})();
