/* Vibe Event v2 — site.js
   Yükleyici · Lenis smooth scroll · üst bar · hero scroll → shader · madalyon/rozet · marquee (hız kaydırmaya bağlı) · reveal · afiş eğimi · menü */
(function () {
  'use strict';

  var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kaba = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var vh = function () { return window.innerHeight; };

  /* ---------- Lenis ---------- */
  var lenis = null;
  if (!azalt && window.Lenis) {
    try {
      lenis = new window.Lenis({ smoothWheel: true, syncTouch: false, lerp: 0.085, wheelMultiplier: 1 });
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  function scrollY() { return lenis ? lenis.scroll : (window.scrollY || window.pageYOffset || 0); }

  // Çapa bağlantıları
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var hedef = document.querySelector(id);
      if (!hedef) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(hedef, { offset: -64, duration: 1.4 });
      else hedef.scrollIntoView({ behavior: azalt ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- Yükleyici ---------- */
  var yk = document.getElementById('yukleme');
  var body = document.body;
  if (yk) {
    var goz = yk.querySelector('.yukleme-goz');
    var sayac = document.getElementById('sayac');
    var kisa = azalt || (function () { try { return sessionStorage.getItem('vibeYuklendi') === '1'; } catch (e) { return false; } })();
    if (lenis) lenis.stop();
    if (!kisa && goz.animate) {
      goz.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 950, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    } else { goz.style.transform = 'scale(1)'; goz.style.opacity = '1'; }
    var n = 0;
    var sayacInt = setInterval(function () {
      n = Math.min(97, n + 1 + Math.floor(Math.random() * 6));
      if (sayac) sayac.textContent = (n < 10 ? '0' : '') + n;
    }, 55);
    var minSure = new Promise(function (r) { setTimeout(r, kisa ? 250 : 1500); });
    var shaderHazir = window.VIBE_HERO ? window.VIBE_HERO.ready : Promise.resolve();
    var emniyet = new Promise(function (r) { setTimeout(r, 4000); });
    var fontHazir = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([Promise.all([minSure, shaderHazir, fontHazir]), emniyet]).then(function () {
      clearInterval(sayacInt);
      if (sayac) sayac.textContent = '100';
      setTimeout(function () {
        yk.classList.add('bitti');
        body.classList.remove('kilit');
        body.classList.add('hazir');
        if (lenis) lenis.start();
        try { sessionStorage.setItem('vibeYuklendi', '1'); } catch (e) {}
        setTimeout(function () { yk.classList.add('gizle'); }, 950);
      }, kisa ? 60 : 220);
    });
  } else {
    body.classList.remove('kilit');
    body.classList.add('hazir');
  }

  /* ---------- Üst bar + menü ---------- */
  var ust = document.getElementById('ust');
  var nav = document.getElementById('nav');
  var menuBtn = document.getElementById('menuBtn');
  var navKapat = document.getElementById('navKapat');
  function menuKapa() { if (!nav) return; nav.classList.remove('acik'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); body.classList.remove('kilit'); if (lenis) lenis.start(); }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var acik = nav.classList.toggle('acik');
      menuBtn.setAttribute('aria-expanded', acik ? 'true' : 'false');
      body.classList.toggle('kilit', acik);
      if (lenis) { if (acik) lenis.stop(); else lenis.start(); }
    });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', menuKapa); });
    if (navKapat) navKapat.addEventListener('click', menuKapa);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menuKapa(); });
  }

  /* ---------- Kaydırmaya bağlı: shader, üst bar, rozet ---------- */
  var hero = document.getElementById('hero');
  var rozet = document.getElementById('rozet');
  var sonHiz = 0;
  function kaydirmaGuncelle(y, hiz) {
    if (ust) ust.classList.toggle('dolu', y > 40);
    if (hero) {
      var aralik = Math.max(1, hero.offsetHeight - vh());
      var p = Math.min(1, Math.max(0, y / aralik));
      if (window.VIBE_HERO) window.VIBE_HERO.setScroll(p);
      if (rozet) rozet.classList.toggle('gor', y > aralik + vh() * 0.35);
    } else if (rozet) {
      rozet.classList.toggle('gor', y > vh() * 0.6);
    }
    sonHiz = hiz || 0;
  }
  if (lenis) {
    lenis.on('scroll', function (e) { kaydirmaGuncelle(e.scroll, e.velocity); });
  } else {
    var onceki = scrollY(), oncekiT = performance.now();
    window.addEventListener('scroll', function () {
      var y = scrollY(), t = performance.now();
      var v = (y - onceki) / Math.max(1, t - oncekiT) * 16;
      onceki = y; oncekiT = t;
      kaydirmaGuncelle(y, v);
    }, { passive: true });
  }
  kaydirmaGuncelle(scrollY(), 0);

  /* ---------- Marquee ---------- */
  var mq = document.getElementById('marquee');
  if (mq && !azalt) {
    var x = 0, yarim = 0, sonT = performance.now(), mqGorunur = false, mqPlanli = false;
    function olc() { yarim = mq.scrollWidth / 2; }
    olc(); window.addEventListener('resize', olc, { passive: true });
    function dongu(t) {
      mqPlanli = false;
      if (!mqGorunur || document.hidden) { sonT = t; return; }
      var dt = Math.min(64, t - sonT); sonT = t;
      var hiz = 0.55 + Math.min(4, Math.abs(sonHiz) * 0.06);
      x -= hiz * dt / 16;
      if (yarim > 0 && -x >= yarim) x += yarim;
      mq.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      mqPlanla();
    }
    function mqPlanla() { if (mqPlanli) return; mqPlanli = true; requestAnimationFrame(dongu); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { mqGorunur = es[0].isIntersecting; if (mqGorunur) { sonT = performance.now(); mqPlanla(); } }, { threshold: 0 }).observe(mq);
    } else { mqGorunur = true; mqPlanla(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && mqGorunur) { sonT = performance.now(); mqPlanla(); } });
  }

  /* ---------- Reveal (bir kez) ---------- */
  var rvler = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !azalt) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('gor'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    rvler.forEach(function (el) { io.observe(el); });
  } else { rvler.forEach(function (el) { el.classList.add('gor'); }); }

  /* ---------- Afiş eğimi (fare) ---------- */
  var afis = document.getElementById('afis');
  if (afis && !kaba && !azalt) {
    afis.addEventListener('pointermove', function (e) {
      var r = afis.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      afis.style.transform = 'perspective(1200px) rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 9).toFixed(2) + 'deg)';
    });
    afis.addEventListener('pointerleave', function () { afis.style.transform = ''; });
  }

  /* ---------- Yıl ---------- */
  document.querySelectorAll('.yil').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
