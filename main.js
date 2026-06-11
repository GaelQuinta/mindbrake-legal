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

  /* ── Cómo funciona: paso activo ↔ screenshot del teléfono ───────── */
  function setStep(index) {
    var steps = document.querySelectorAll(".step");
    var img = document.querySelector("[data-how-shot]");
    var pi = document.querySelector("[data-how-pi]");
    if (!steps.length || !img) return;

    var active = steps[index];
    if (!active || active.classList.contains("is-active")) return;
    steps.forEach(function (s) { s.classList.remove("is-active"); });
    active.classList.add("is-active");

    var name = active.dataset.shotName;
    var poses = ["mascot_phone", "mascot_thinking", "mascot_celebrate"];
    var swap = function () {
      img.dataset.shotCurrent = name;
      applyShot(img, name);
      if (pi) pi.src = "assets/img/pi/" + poses[index] + ".webp";
    };

    if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.to([img, pi], {
        opacity: 0, y: 14, duration: 0.16, ease: "power2.in",
        onComplete: function () {
          swap();
          gsap.to([img, pi], { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
        }
      });
    } else {
      swap();
    }
  }

  /* ── GSAP ───────────────────────────────────────────────────────── */
  function initGSAP() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    /* Los pasos activan su screenshot al cruzar el centro del viewport —
       corre también con reduced-motion (es estado, no decoración). */
    document.querySelectorAll(".step").forEach(function (step, i) {
      ScrollTrigger.create({
        trigger: step,
        start: "top 58%",
        end: "bottom 42%",
        onEnter: function () { setStep(i); },
        onEnterBack: function () { setStep(i); }
      });
    });

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
    navShadow();
    startIslandClock();
    /* GSAP llega con defer después de este script; espera al load si falta. */
    if (window.gsap) initGSAP();
    else window.addEventListener("load", initGSAP);
  });
})();
