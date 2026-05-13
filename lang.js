(function () {
  const STORAGE_KEY = "mindbrake_legal_lang";
  const supported = ["en", "es"];

  function detect() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && supported.includes(stored)) return stored;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("es")) return "es";
    return "en";
  }

  function apply(lang) {
    if (!supported.includes(lang)) lang = "en";
    document.documentElement.setAttribute("lang", lang);
    document.querySelectorAll(".lang-switch button").forEach((b) => {
      b.classList.toggle("active", b.dataset.setLang === lang);
    });
    localStorage.setItem(STORAGE_KEY, lang);
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(detect());
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.addEventListener("click", function () {
        apply(btn.dataset.setLang);
      });
    });
  });
})();
