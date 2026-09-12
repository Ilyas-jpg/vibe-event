/* Vibe Event — site.js: menü, geri sayım, yıl */
(function () {
  'use strict';

  // Mobil menü
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var acik = nav.classList.toggle('acik');
      menuBtn.setAttribute('aria-expanded', acik ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('acik');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Menüyü aç');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('acik')) {
        nav.classList.remove('acik');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
      }
    });
  }

  // Geri sayım (etkinlik: 22 Eylül 2026, 19:30, Türkiye saati)
  var gs = document.getElementById('geri-sayim');
  if (gs) {
    var baslangic = new Date('2026-09-22T19:30:00+03:00');
    var bitis = new Date('2026-09-22T22:30:00+03:00');
    var simdi = new Date();
    var bugun = Date.UTC(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
    var hedefGun = Date.UTC(2026, 8, 22);
    var gun = Math.round((hedefGun - bugun) / 86400000);
    var metin;
    if (simdi > bitis) {
      metin = 'Bu gece geride kaldı; yeni etkinlik duyuruları Instagram’da.';
    } else if (simdi >= baslangic) {
      metin = 'Gece şu an sürüyor.';
    } else if (gun <= 0) {
      metin = 'Bu gece! Kapılar 19:00’da açılıyor.';
    } else if (gun === 1) {
      metin = 'Yarın gece! Kapılar 19:00’da açılıyor.';
    } else {
      metin = 'Etkinliğe ' + gun + ' gün kaldı.';
    }
    gs.textContent = metin;
  }

  // Yıl
  document.querySelectorAll('.yil').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
