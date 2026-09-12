/* Vibe Event — bilet.js (v3: çift kayıt + kuyruk + taslak)
   1) Kayıt önce Supabase'e yazılır (bağımsız yedek: tablo + özel dekont deposu; anon yalnız ekler, okuyamaz).
   2) Sonra mevcut Google Apps Script akışı (QR bilet + e-posta) — protokol değişmedi:
      gizli form POST → iframe "appsScriptResponse" → postMessage({source:"VIBE_EVENT", success, ticketId, message}).
   3) Supabase yazılamazsa kayıt tarayıcıda kuyruğa alınır, bağlantı gelince tekrar denenir.
   4) Form taslağı sayfa yenilense de kaybolmaz (sessionStorage). */
(function () {
  'use strict';

  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7g1JW4MXqF7hMDC1THQNIu5N-YDXWtAXCtgYMDpvLRQjRhaKdhiBB0QeLnETUZEGQ/exec';
  var SUPA_URL = 'https://woifxwgqjgxhceaqrear.supabase.co';
  var SUPA_KEY = 'sb_publishable_K4GyGa1jup3US9Q-ZPQlGA_OiZpAyvc'; // public anahtar; sınır RLS + kolon yetkisi (yalnız INSERT)
  var MAKS_BOYUT = 10 * 1024 * 1024;
  var ZAMAN_ASIMI_MS = 90000;
  var KUYRUK = 'vibeBiletKuyruk';
  var TASLAK = 'vibeBiletTaslak';

  var form = document.getElementById('mainTicketForm');
  if (!form) return;

  var fileInput = document.getElementById('fileInput');
  var dosyaAdi = document.getElementById('selectedFileName');
  var dekontAlani = document.getElementById('dekontAlani');
  var submitButton = document.getElementById('submitButton');
  var loadingOverlay = document.getElementById('loadingOverlay');
  var anaSayfa = document.getElementById('anaSayfa');
  var successScreen = document.getElementById('successScreen');
  var successTicketId = document.getElementById('successTicketId');
  var basariBaslik = document.getElementById('basariBaslik');
  var basariEtiket = document.getElementById('basariEtiket');
  var basariNot = document.getElementById('basariNot');
  var errorBox = document.getElementById('errorBox');
  var tutarCikti = document.getElementById('tutar');
  var alanAd2 = document.getElementById('alanAd2');
  var alanAd3 = document.getElementById('alanAd3');
  var ad2 = document.getElementById('adSoyad2');
  var ad3 = document.getElementById('adSoyad3');
  var ibanBtn = document.getElementById('ibanKopyala');
  var kvkkCheck = document.getElementById('kvkkCheck');
  var rulesCheck = document.getElementById('rulesCheck');
  var tuzak = document.getElementById('websiteAlani');
  var zamanlayici = null;

  function tl(n) { return n.toLocaleString('tr-TR') + '₺'; }
  function depo(tip) { try { return tip === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; } }
  function jsonOku(tip, k) { var d = depo(tip); if (!d) return null; try { return JSON.parse(d.getItem(k) || 'null'); } catch (e) { return null; } }
  function jsonYaz(tip, k, v) { var d = depo(tip); if (!d) return; try { if (v == null) d.removeItem(k); else d.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function hataTemizle() {
    errorBox.textContent = '';
    errorBox.classList.remove('acik');
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }
  function zamanlayiciDurdur() { if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; } }
  function yuklemeGoster(acik) { loadingOverlay.classList.toggle('acik', acik); submitButton.disabled = acik; }
  function hataGoster(mesaj, alan) {
    zamanlayiciDurdur(); yuklemeGoster(false);
    errorBox.textContent = mesaj; errorBox.classList.add('acik');
    if (alan) { alan.setAttribute('aria-invalid', 'true'); alan.focus(); }
    else errorBox.scrollIntoView({ block: 'center' });
  }

  /* ---------- Bilet seçimi ---------- */
  function secimiUygula() {
    var secili = form.querySelector('input[name="bilet"]:checked');
    if (!secili) return;
    var kisi = Number(secili.getAttribute('data-kisi'));
    var tutar = Number(secili.getAttribute('data-tutar'));
    tutarCikti.textContent = tl(tutar);
    alanAd2.hidden = kisi < 2; alanAd3.hidden = kisi < 3;
    ad2.required = kisi >= 2; ad3.required = kisi >= 3;
    if (kisi < 2) ad2.value = ''; if (kisi < 3) ad3.value = '';
  }
  form.querySelectorAll('input[name="bilet"]').forEach(function (r) { r.addEventListener('change', function () { hataTemizle(); secimiUygula(); taslakKaydet(); }); });

  /* ---------- Taslak: sayfa yenilense de kaybolmasın ---------- */
  var taslakAlanlar = ['adSoyad', 'adSoyad2', 'adSoyad3', 'email', 'telefon'];
  function taslakKaydet() {
    var t = {}; taslakAlanlar.forEach(function (n) { t[n] = form[n] ? form[n].value : ''; });
    var secili = form.querySelector('input[name="bilet"]:checked'); t.bilet = secili ? secili.value : '1';
    jsonYaz('session', TASLAK, t);
  }
  (function taslakYukle() {
    var t = jsonOku('session', TASLAK); if (!t) return;
    var r = form.querySelector('input[name="bilet"][value="' + (t.bilet || '1') + '"]'); if (r) r.checked = true;
    taslakAlanlar.forEach(function (n) { if (form[n] && t[n]) form[n].value = t[n]; });
  })();
  secimiUygula();
  form.querySelectorAll('input').forEach(function (input) {
    input.addEventListener('input', function () { hataTemizle(); taslakKaydet(); });
  });

  /* ---------- IBAN kopyala ---------- */
  if (ibanBtn) {
    var ibanEtiket = ibanBtn.innerHTML;
    ibanBtn.addEventListener('click', function () {
      var iban = ibanBtn.getAttribute('data-iban');
      var bitti = function () { ibanBtn.textContent = 'Kopyalandı'; setTimeout(function () { ibanBtn.innerHTML = ibanEtiket; }, 1800); };
      var secerek = function () {
        var ta = document.createElement('textarea'); ta.value = iban; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); bitti(); } catch (e) {} document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(iban).then(bitti, secerek); else secerek();
    });
  }

  /* ---------- Dekont dosyası ---------- */
  function dosyaSec(file) {
    hataTemizle();
    if (!file) { dosyaAdi.textContent = ''; dosyaAdi.classList.remove('acik'); return; }
    if (file.size > MAKS_BOYUT) { fileInput.value = ''; dosyaAdi.textContent = ''; dosyaAdi.classList.remove('acik'); hataGoster('Dekont dosyası en fazla 10 MB olabilir.'); return; }
    dosyaAdi.textContent = '✓ ' + file.name; dosyaAdi.classList.add('acik');
  }
  fileInput.addEventListener('change', function () { dosyaSec(fileInput.files && fileInput.files[0]); });
  if (dekontAlani) {
    ['dragenter', 'dragover'].forEach(function (ev) { dekontAlani.addEventListener(ev, function (e) { e.preventDefault(); dekontAlani.classList.add('surukle'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dekontAlani.addEventListener(ev, function (e) { e.preventDefault(); dekontAlani.classList.remove('surukle'); }); });
    dekontAlani.addEventListener('drop', function (e) { var dt = e.dataTransfer; if (dt && dt.files && dt.files.length) { try { fileInput.files = dt.files; } catch (err) {} dosyaSec(dt.files[0]); } });
  }

  function base64Oku(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('Dekont dosyası seçilmedi.')); return; }
      if (file.size === 0) { reject(new Error('Seçtiğin dosya boş.')); return; }
      var reader = new FileReader();
      reader.onload = function (ev) { var r = ev.target.result; if (typeof r !== 'string' || r.indexOf(',') === -1) { reject(new Error('Dekont dosyası okunamadı.')); return; } var b64 = r.substring(r.indexOf(',') + 1); if (!b64) { reject(new Error('Dekont verisi alınamadı.')); return; } resolve(b64); };
      reader.onerror = function () { reject(new Error('Dekont okunurken hata oluştu.')); };
      reader.readAsDataURL(file);
    });
  }

  function gonderimKimligi() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var s = ''; for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' + s.slice(16, 20) + '-' + s.slice(20);
  }

  /* ---------- Supabase (yedek kayıt) ---------- */
  function supaIstek(yol, secenekler, sn) {
    var kontrol = ('AbortController' in window) ? new AbortController() : null;
    var t = setTimeout(function () { if (kontrol) kontrol.abort(); }, (sn || 15) * 1000);
    secenekler = secenekler || {};
    secenekler.headers = Object.assign({ 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }, secenekler.headers || {});
    if (kontrol) secenekler.signal = kontrol.signal;
    return fetch(SUPA_URL + yol, secenekler).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  function dekontYukle(file, gid) {
    var ad = (file.name || 'dekont').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'dekont';
    var yol = gid + '/' + ad;
    return supaIstek('/storage/v1/object/dekontlar/' + yol, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }, 45)
      .then(function (r) { return r.ok ? yol : null; }).catch(function () { return null; });
  }
  function kayitYaz(kayit) {
    return supaIstek('/rest/v1/bilet_kayitlari', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(kayit) }, 15)
      .then(function (r) { return r.status === 201 || r.status === 409; }).catch(function () { return false; });
  }
  function durumBildir(gid, durum, biletNo) {
    return supaIstek('/rest/v1/rpc/bilet_apps_durum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_gonderim: gid, p_durum: durum, p_bilet_no: biletNo || '' }) }, 10)
      .then(function () { return true; }).catch(function () { return false; });
  }
  function kuyrukEkle(kayit) { var k = jsonOku('local', KUYRUK) || []; k.push(kayit); jsonYaz('local', KUYRUK, k.slice(-20)); }
  var kuyrukMesgul = false;
  function kuyrukDene() {
    if (kuyrukMesgul || !navigator.onLine) return;
    var k = jsonOku('local', KUYRUK) || []; if (!k.length) return;
    kuyrukMesgul = true;
    var kalan = [];
    (function sirayla(i) {
      if (i >= k.length) { jsonYaz('local', KUYRUK, kalan.length ? kalan : null); kuyrukMesgul = false; return; }
      kayitYaz(k[i]).then(function (ok) { if (!ok) kalan.push(k[i]); sirayla(i + 1); });
    })(0);
  }
  window.addEventListener('online', kuyrukDene);
  setTimeout(kuyrukDene, 1500);

  /* ---------- Doğrulama ---------- */
  function dogrula() {
    if (tuzak && tuzak.value) return 'tuzak';
    var adSoyad = form.adSoyad, email = form.email, telefon = form.telefon;
    if (!adSoyad.value.trim()) { hataGoster('Adını ve soyadını yaz.', adSoyad); return false; }
    if (!alanAd2.hidden && !ad2.value.trim()) { hataGoster('İkinci kişinin adını ve soyadını yaz.', ad2); return false; }
    if (!alanAd3.hidden && !ad3.value.trim()) { hataGoster('Üçüncü kişinin adını ve soyadını yaz.', ad3); return false; }
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { hataGoster('Geçerli bir e-posta adresi yaz; biletin oraya gelecek.', email); return false; }
    if (telefon.value.replace(/\D/g, '').length < 10) { hataGoster('Geçerli bir telefon numarası yaz.', telefon); return false; }
    if (!fileInput.files || fileInput.files.length === 0) { hataGoster('Ödeme dekontunu yükle.'); return false; }
    if (fileInput.files[0].size > MAKS_BOYUT) { hataGoster('Dekont dosyası en fazla 10 MB olabilir.'); return false; }
    if (kvkkCheck && !kvkkCheck.checked) { hataGoster('Devam etmek için aydınlatma metnini onaylaman gerekiyor.'); return false; }
    if (!rulesCheck.checked) { hataGoster('Devam etmek için etkinlik kurallarını kabul etmen gerekiyor.'); return false; }
    return true;
  }

  /* ---------- Sonuç ekranları ---------- */
  function basariEkrani(tip, no) {
    zamanlayiciDurdur(); yuklemeGoster(false);
    if (tip === 'tam') {
      if (basariBaslik) basariBaslik.textContent = 'Aramıza hoş geldin';
      if (basariEtiket) basariEtiket.textContent = 'Bilet numaran';
      if (basariNot) basariNot.textContent = 'Biletin ve QR kodun e-posta adresine gönderildi. Gelmediyse spam klasörünü kontrol et. Dans pistinde görüşürüz.';
    } else {
      if (basariBaslik) basariBaslik.textContent = 'Kaydın alındı';
      if (basariEtiket) basariEtiket.textContent = 'Kayıt numaran';
      if (basariNot) basariNot.textContent = 'Bilgilerin ve dekontun bize ulaştı. Ödemen kontrol edilip QR kodlu biletin e-posta adresine gönderilecek. Bir sorun olursa bu kayıt numarasıyla Instagram’dan yaz.';
    }
    successTicketId.textContent = no || '-';
    jsonYaz('session', TASLAK, null);
    anaSayfa.hidden = true;
    successScreen.classList.add('acik');
    window.scrollTo(0, 0);
  }

  /* ---------- Gönderim ---------- */
  var aktifGid = null, aktifDbOk = false;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hataTemizle(); zamanlayiciDurdur();
    var d = dogrula();
    if (d === 'tuzak') { basariEkrani('tam', 'VE-OK'); return; }
    if (!d) return;

    var file = fileInput.files[0];
    var secili = form.querySelector('input[name="bilet"]:checked');
    var gid = gonderimKimligi();
    aktifGid = gid; aktifDbOk = false;
    var kayit = {
      gonderim_id: gid,
      ad_soyad: form.adSoyad.value.trim().slice(0, 120),
      ad_soyad_2: ad2.value.trim().slice(0, 120) || null,
      ad_soyad_3: ad3.value.trim().slice(0, 120) || null,
      eposta: form.email.value.trim().slice(0, 254),
      telefon: form.telefon.value.trim().slice(0, 24),
      bilet: Number(secili.value),
      tutar: Number(secili.getAttribute('data-tutar')),
      kurallar_kabul: true,
      kvkk_onay: !!(kvkkCheck && kvkkCheck.checked),
      dekont_adi: (file.name || '').slice(0, 200),
      kaynak: 'site'
    };
    yuklemeGoster(true);

    Promise.all([base64Oku(file), dekontYukle(file, gid)]).then(function (sonuc) {
      var base64 = sonuc[0];
      kayit.dekont_yolu = sonuc[1];
      return kayitYaz(kayit).then(function (ok) {
        aktifDbOk = ok;
        if (!ok) kuyrukEkle(kayit);
        return base64;
      });
    }).then(function (base64) {
      var postForm = document.createElement('form');
      postForm.method = 'POST'; postForm.action = APPS_SCRIPT_URL; postForm.target = 'appsScriptResponse';
      postForm.enctype = 'application/x-www-form-urlencoded';
      postForm.style.cssText = 'position:fixed;width:2px;height:2px;left:-100px;bottom:-100px;opacity:0.01;pointer-events:none';
      function alanEkle(ad, deger) { var i = document.createElement('input'); i.type = 'hidden'; i.name = ad; i.value = deger == null ? '' : String(deger); postForm.appendChild(i); }
      alanEkle('adSoyad', kayit.ad_soyad); alanEkle('adSoyad2', kayit.ad_soyad_2 || ''); alanEkle('adSoyad3', kayit.ad_soyad_3 || '');
      alanEkle('email', kayit.eposta); alanEkle('telefon', kayit.telefon);
      alanEkle('bilet', secili.value); alanEkle('biletSayisi', secili.value);
      alanEkle('kabul', 'KABUL'); alanEkle('rulesAccepted', 'true');
      alanEkle('submissionId', gid);
      alanEkle('dekontBase64', base64); alanEkle('dekontMimeType', file.type || 'application/octet-stream'); alanEkle('dekontFileName', file.name);
      document.body.appendChild(postForm);
      setTimeout(function () {
        try {
          postForm.submit();
          zamanlayici = setTimeout(function () {
            if (!loadingOverlay.classList.contains('acik')) return;
            if (aktifDbOk) { durumBildir(gid, 'zaman-asimi', ''); basariEkrani('kismi', gid.slice(0, 8).toUpperCase()); }
            else hataGoster('İşlem zaman aşımına uğradı. İnternet bağlantını kontrol edip tekrar dene; bilgilerin formda duruyor.');
          }, ZAMAN_ASIMI_MS);
        } catch (err) {
          if (aktifDbOk) basariEkrani('kismi', gid.slice(0, 8).toUpperCase());
          else hataGoster('Bilet gönderilirken bir hata oluştu: ' + err.message);
        }
      }, 50);
      setTimeout(function () { if (postForm.parentNode) postForm.remove(); }, 120000);
    }).catch(function (err) {
      hataGoster((err && err.message) || 'Bir hata oluştu. Lütfen tekrar dene.');
    });
  });

  window.addEventListener('message', function (event) {
    var sonuc = event.data;
    if (!sonuc || typeof sonuc !== 'object' || sonuc.source !== 'VIBE_EVENT') return;
    zamanlayiciDurdur();
    var gid = aktifGid || '';
    if (sonuc.success === true) {
      var no = sonuc.ticketId || '';
      if (gid) durumBildir(gid, 'ok', no);
      if (!no) { if (aktifDbOk) basariEkrani('kismi', gid.slice(0, 8).toUpperCase()); else hataGoster('Bilet oluşturuldu ancak bilet numarası alınamadı.'); return; }
      basariEkrani('tam', no);
      return;
    }
    var mesaj = sonuc.message || 'Bilinmeyen bir hata oluştu.';
    if (gid) durumBildir(gid, 'hata: ' + String(mesaj).slice(0, 30), '');
    if (aktifDbOk) basariEkrani('kismi', gid.slice(0, 8).toUpperCase());
    else hataGoster('Bilet sistemi hata verdi: ' + mesaj);
  });
})();
