/* Mindbrake landing — GSAP ScrollTrigger + interacciones.
   Reglas de movimiento (ui-ux-pro-max): solo transform/opacity, stagger 40ms,
   ease-out al entrar, todo respeta prefers-reduced-motion. El contenido es
   visible por defecto: sin JS la página se ve completa (tweens "from"). */
(function () {
  "use strict";

  /* ── Idioma → screenshots ───────────────────────────────────────
     lang.js pone lang en <html>; aquí solo intercambiamos las capturas
     es/en. Un MutationObserver evita tocar lang.js (compartido con las
     páginas legales). */
  var SHOT_BASE = "assets/img/shots/";

  function currentLang() {
    return document.documentElement.getAttribute("lang") === "en" ? "en" : "es";
  }

  function applyShot(img, name) {
    var base = SHOT_BASE + currentLang() + "/" + name;
    img.srcset = base + "-600.webp 600w, " + base + ".webp 760w";
    img.src = base + ".webp";
  }

  function syncShots() {
    document.querySelectorAll("img[data-shot]").forEach(function (img) {
      applyShot(img, img.dataset.shotCurrent || img.dataset.shot);
    });
    preloadHowShots();
  }

  new MutationObserver(syncShots).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  /* ── Dynamic Island: countdown vivo ─────────────────────────────── */
  function startIslandClock() {
    var el = document.querySelector("[data-island-time]");
    if (!el) return;
    var seconds = 24 * 60 + 57;
    setInterval(function () {
      seconds = seconds <= 0 ? 25 * 60 : seconds - 1;
      var m = String(Math.floor(seconds / 60));
      var s = String(seconds % 60).padStart(2, "0");
      el.textContent = m + ":" + s;
    }, 1000);
  }

  /* ── Nav: sombra al scrollear ───────────────────────────────────── */
  function navShadow() {
    var nav = document.querySelector(".nav");
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ── Cómo funciona: paso activo ↔ pantalla del teléfono ────────
     El paso activo se elige por cercanía a una "línea de foco" del
     viewport (no por rangos onEnter/onEnterBack, que se desincronizaban
     al subir y en móvil dejaban siempre el último paso). La línea baja
     al 74% en móvil, donde el teléfono va sticky arriba y los pasos
     desfilan por debajo. */
  var HOW = { stage: null, layers: [], top: 0, index: -1, steps: [], pi: null, bar: null };
  var STEP_ACCENTS = [
    "rgba(111, 72, 246, 0.34)",
    "rgba(114, 201, 255, 0.40)",
    "rgba(25, 199, 111, 0.30)"
  ];
  var PI_POSES = ["mascot_phone", "mascot_thinking", "mascot_celebrate"];

  function preloadHowShots() {
    if (!HOW.steps.length || !HOW.layers.length) return;
    var sizes = HOW.layers[0].getAttribute("sizes") || "";
    HOW.steps.forEach(function (step) {
      var base = SHOT_BASE + currentLang() + "/" + step.dataset.shotName;
      var pre = new Image();
      pre.sizes = sizes;
      pre.srcset = base + "-600.webp 600w, " + base + ".webp 760w";
      pre.src = base + ".webp";
    });
  }

  function setStep(index, immediate) {
    var active = HOW.steps[index];
    if (!active || index === HOW.index) return;
    HOW.index = index;

    HOW.steps.forEach(function (s, i) { s.classList.toggle("is-active", i === index); });
    if (HOW.stage) HOW.stage.style.setProperty("--step-accent", STEP_ACCENTS[index % STEP_ACCENTS.length]);
    if (HOW.bar) HOW.bar.style.width = ((index + 1) / HOW.steps.length * 100) + "%";

    var current = HOW.layers[HOW.top];
    var next = HOW.layers[1 - HOW.top];
    var pose = "assets/img/pi/" + PI_POSES[index % PI_POSES.length] + ".webp";
    applyShot(next, active.dataset.shotName);
    next.dataset.shotCurrent = active.dataset.shotName;
    HOW.top = 1 - HOW.top;

    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (immediate || reduce || !window.gsap) {
      next.style.opacity = "1";
      current.style.opacity = "0";
      if (HOW.pi) HOW.pi.src = pose;
      return;
    }

    /* Se espera a que la capa entrante esté decodificada: el crossfade
       nunca muestra un hueco ni un frame a medio cargar. */
    var play = function () {
      if (HOW.index !== index) return;      /* el scroll ya siguió de largo */
      gsap.killTweensOf([current, next]);
      gsap.fromTo(next,
        { opacity: 0, scale: 1.055, yPercent: 1.4, filter: "blur(7px)" },
        { opacity: 1, scale: 1, yPercent: 0, filter: "blur(0px)", duration: 0.62, ease: "power3.out" });
      gsap.to(current, { opacity: 0, scale: 0.975, duration: 0.4, ease: "power2.inOut" });
      if (HOW.pi) {
        gsap.to(HOW.pi, {
          opacity: 0, y: 14, scale: 0.9, duration: 0.16, ease: "power2.in",
          onComplete: function () {
            HOW.pi.src = pose;
            gsap.fromTo(HOW.pi,
              { opacity: 0, y: 18, scale: 0.88, rotate: -5 },
              { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.6, ease: "back.out(1.6)" });
          }
        });
      }
    };
    if (next.decode) next.decode().then(play, play);
    else play();
  }

  function initHowSync() {
    var grid = document.querySelector(".how-grid");
    HOW.steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
    HOW.layers = Array.prototype.slice.call(document.querySelectorAll("[data-how-shot]"));
    HOW.stage = document.querySelector("[data-how-stage]");
    HOW.pi = document.querySelector("[data-how-pi]");
    HOW.bar = document.querySelector("[data-how-progress]");
    if (!grid || HOW.steps.length < 2 || HOW.layers.length < 2) return;

    preloadHowShots();
    setStep(0, true);

    var queued = false;
    var pick = function () {
      queued = false;
      var box = grid.getBoundingClientRect();
      var vh = window.innerHeight;
      if (box.bottom < 0 || box.top > vh) return;
      var line = vh * (window.innerWidth < 768 ? 0.74 : 0.5);
      var best = 0;
      var bestDist = Infinity;
      HOW.steps.forEach(function (step, i) {
        var r = step.getBoundingClientRect();
        var dist = Math.abs(r.top + r.height / 2 - line);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setStep(best);
    };
    var request = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(pick);
    };

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    request();
  }

  /* ── GSAP ───────────────────────────────────────────────────────── */
  function initGSAP() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", function () {
      /* Hero: entrada escalonada estilo onboarding de la app */
      gsap.from("[data-hero]", {
        opacity: 0, y: 26, duration: 0.7, ease: "power3.out",
        stagger: 0.08, delay: 0.05
      });
      gsap.from("[data-hero-visual]", {
        opacity: 0, y: 40, scale: 0.96, duration: 0.9, ease: "power3.out", delay: 0.25
      });

      /* Pi y chips flotando (loops suaves, solo transform) */
      gsap.to("[data-pi]", { y: -10, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.utils.toArray("[data-chip]").forEach(function (chip, i) {
        gsap.to(chip, {
          y: i % 2 ? -12 : 10,
          duration: 2.2 + i * 0.45,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
      });

      /* Parallax sutil del teléfono del hero */
      gsap.to("[data-float-phone]", {
        y: -36,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      });

      /* Reveals genéricos */
      gsap.utils.toArray("[data-reveal]").forEach(function (el) {
        gsap.from(el, {
          opacity: 0, y: 24, duration: 0.65, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        });
      });

      /* Contadores */
      gsap.utils.toArray("[data-count]").forEach(function (el) {
        var target = parseInt(el.dataset.count, 10);
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: target > 100 ? 1.6 : 1.1,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: function () {
            el.textContent = Math.round(obj.v).toLocaleString();
          }
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncShots();
    initHowSync();
    navShadow();
    startIslandClock();
    /* GSAP llega con defer después de este script; espera al load si falta. */
    if (window.gsap) initGSAP();
    else window.addEventListener("load", initGSAP);
  });
})();
