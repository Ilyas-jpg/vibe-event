/* Vibe Event — bilet.js
   Bilet formu. Arka uç: mevcut Google Apps Script (değişmedi).
   Protokol: gizli form POST → iframe "appsScriptResponse" → Apps Script sayfası
   window.parent.postMessage({source:"VIBE_EVENT", success, ticketId, message}) */
(function () {
  'use strict';

  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7g1JW4MXqF7hMDC1THQNIu5N-YDXWtAXCtgYMDpvLRQjRhaKdhiBB0QeLnETUZEGQ/exec';
  var MAKS_BOYUT = 10 * 1024 * 1024;
  var ZAMAN_ASIMI_MS = 90000;

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
  var errorBox = document.getElementById('errorBox');
  var tutarCikti = document.getElementById('tutar');
  var alanAd2 = document.getElementById('alanAd2');
  var alanAd3 = document.getElementById('alanAd3');
  var ad2 = document.getElementById('adSoyad2');
  var ad3 = document.getElementById('adSoyad3');
  var ibanBtn = document.getElementById('ibanKopyala');
  var zamanlayici = null;

  function tl(n) { return n.toLocaleString('tr-TR') + '₺'; }

  function hataTemizle() {
    errorBox.textContent = '';
    errorBox.classList.remove('acik');
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function zamanlayiciDurdur() {
    if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; }
  }

  function yuklemeGoster(acik) {
    loadingOverlay.classList.toggle('acik', acik);
    submitButton.disabled = acik;
  }

  function hataGoster(mesaj, alan) {
    zamanlayiciDurdur();
    yuklemeGoster(false);
    errorBox.textContent = mesaj;
    errorBox.classList.add('acik');
    if (alan) {
      alan.setAttribute('aria-invalid', 'true');
      alan.focus();
    } else {
      errorBox.scrollIntoView({ block: 'center' });
    }
  }

  // Bilet seçimi → tutar + ek isim alanları
  function secimiUygula() {
    var secili = form.querySelector('input[name="bilet"]:checked');
    if (!secili) return;
    var kisi = Number(secili.getAttribute('data-kisi'));
    var tutar = Number(secili.getAttribute('data-tutar'));
    tutarCikti.textContent = tl(tutar);
    alanAd2.hidden = kisi < 2;
    alanAd3.hidden = kisi < 3;
    ad2.required = kisi >= 2;
    ad3.required = kisi >= 3;
    if (kisi < 2) ad2.value = '';
    if (kisi < 3) ad3.value = '';
  }
  form.querySelectorAll('input[name="bilet"]').forEach(function (r) {
    r.addEventListener('change', function () { hataTemizle(); secimiUygula(); });
  });
  secimiUygula();

  form.querySelectorAll('input').forEach(function (input) {
    input.addEventListener('input', hataTemizle);
  });

  // IBAN kopyala
  if (ibanBtn) {
    var ibanEtiket = ibanBtn.innerHTML;
    ibanBtn.addEventListener('click', function () {
      var iban = ibanBtn.getAttribute('data-iban');
      var bitti = function () {
        ibanBtn.textContent = 'Kopyalandı';
        setTimeout(function () { ibanBtn.innerHTML = ibanEtiket; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(iban).then(bitti, function () { secerekKopyala(); });
      } else {
        secerekKopyala();
      }
      function secerekKopyala() {
        var ta = document.createElement('textarea');
        ta.value = iban; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); bitti(); } catch (e) { /* kopyalanamadı, sessiz */ }
        document.body.removeChild(ta);
      }
    });
  }

  // Dekont dosyası
  function dosyaSec(file) {
    hataTemizle();
    if (!file) {
      dosyaAdi.textContent = '';
      dosyaAdi.classList.remove('acik');
      return;
    }
    if (file.size > MAKS_BOYUT) {
      fileInput.value = '';
      dosyaAdi.textContent = '';
      dosyaAdi.classList.remove('acik');
      hataGoster('Dekont dosyası en fazla 10 MB olabilir.');
      return;
    }
    dosyaAdi.textContent = '✓ ' + file.name;
    dosyaAdi.classList.add('acik');
  }
  fileInput.addEventListener('change', function () {
    dosyaSec(fileInput.files && fileInput.files[0]);
  });
  if (dekontAlani) {
    ['dragenter', 'dragover'].forEach(function (ev) {
      dekontAlani.addEventListener(ev, function (e) { e.preventDefault(); dekontAlani.classList.add('surukle'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dekontAlani.addEventListener(ev, function (e) { e.preventDefault(); dekontAlani.classList.remove('surukle'); });
    });
    dekontAlani.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) {
        try { fileInput.files = dt.files; } catch (err) { /* eski tarayıcı */ }
        dosyaSec(dt.files[0]);
      }
    });
  }

  function base64Oku(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('Dekont dosyası seçilmedi.')); return; }
      if (file.size === 0) { reject(new Error('Seçtiğin dosya boş.')); return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var r = ev.target.result;
        if (typeof r !== 'string' || r.indexOf(',') === -1) { reject(new Error('Dekont dosyası okunamadı.')); return; }
        var b64 = r.substring(r.indexOf(',') + 1);
        if (!b64) { reject(new Error('Dekont verisi alınamadı.')); return; }
        resolve(b64);
      };
      reader.onerror = function () { reject(new Error('Dekont okunurken hata oluştu.')); };
      reader.readAsDataURL(file);
    });
  }

  function gonderimKimligi() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 14);
  }

  function dogrula() {
    var adSoyad = form.adSoyad;
    var email = form.email;
    var telefon = form.telefon;
    if (!adSoyad.value.trim()) { hataGoster('Adını ve soyadını yaz.', adSoyad); return false; }
    if (!alanAd2.hidden && !ad2.value.trim()) { hataGoster('İkinci kişinin adını ve soyadını yaz.', ad2); return false; }
    if (!alanAd3.hidden && !ad3.value.trim()) { hataGoster('Üçüncü kişinin adını ve soyadını yaz.', ad3); return false; }
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { hataGoster('Geçerli bir e-posta adresi yaz; biletin oraya gelecek.', email); return false; }
    var tel = telefon.value.replace(/\D/g, '');
    if (tel.length < 10) { hataGoster('Geçerli bir telefon numarası yaz.', telefon); return false; }
    if (!fileInput.files || fileInput.files.length === 0) { hataGoster('Ödeme dekontunu yükle.'); return false; }
    if (fileInput.files[0].size > MAKS_BOYUT) { hataGoster('Dekont dosyası en fazla 10 MB olabilir.'); return false; }
    if (!document.getElementById('rulesCheck').checked) { hataGoster('Devam etmek için etkinlik kurallarını kabul etmen gerekiyor.'); return false; }
    return true;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    hataTemizle();
    zamanlayiciDurdur();
    if (!dogrula()) return;

    var file = fileInput.files[0];
    var secili = form.querySelector('input[name="bilet"]:checked');

    try {
      yuklemeGoster(true);
      var base64 = await base64Oku(file);

      var postForm = document.createElement('form');
      postForm.method = 'POST';
      postForm.action = APPS_SCRIPT_URL;
      postForm.target = 'appsScriptResponse';
      postForm.enctype = 'application/x-www-form-urlencoded';
      postForm.style.cssText = 'position:fixed;width:2px;height:2px;left:-100px;bottom:-100px;opacity:0.01;pointer-events:none';

      function alanEkle(ad, deger) {
        var i = document.createElement('input');
        i.type = 'hidden'; i.name = ad; i.value = deger == null ? '' : String(deger);
        postForm.appendChild(i);
      }
      alanEkle('adSoyad', form.adSoyad.value.trim());
      alanEkle('adSoyad2', ad2.value.trim());
      alanEkle('adSoyad3', ad3.value.trim());
      alanEkle('email', form.email.value.trim());
      alanEkle('telefon', form.telefon.value.trim());
      alanEkle('bilet', secili.value);
      alanEkle('biletSayisi', secili.value);
      alanEkle('kabul', 'KABUL');
      alanEkle('rulesAccepted', 'true');
      alanEkle('submissionId', gonderimKimligi());
      alanEkle('dekontBase64', base64);
      alanEkle('dekontMimeType', file.type || 'application/octet-stream');
      alanEkle('dekontFileName', file.name);
      document.body.appendChild(postForm);

      setTimeout(function () {
        try {
          postForm.submit();
          zamanlayici = setTimeout(function () {
            if (loadingOverlay.classList.contains('acik')) {
              hataGoster('İşlem zaman aşımına uğradı. İnternet bağlantını kontrol edip tekrar dene.');
            }
          }, ZAMAN_ASIMI_MS);
        } catch (err) {
          hataGoster('Bilet gönderilirken bir hata oluştu: ' + err.message);
        }
      }, 50);
      setTimeout(function () { if (postForm.parentNode) postForm.remove(); }, 120000);
    } catch (err) {
      hataGoster(err.message || 'Bir hata oluştu. Lütfen tekrar dene.');
    }
  });

  window.addEventListener('message', function (event) {
    var sonuc = event.data;
    if (!sonuc || typeof sonuc !== 'object' || sonuc.source !== 'VIBE_EVENT') return;
    zamanlayiciDurdur();
    if (sonuc.success === true) {
      if (!sonuc.ticketId) { hataGoster('Bilet oluşturuldu ancak bilet numarası alınamadı.'); return; }
      successTicketId.textContent = sonuc.ticketId;
      yuklemeGoster(false);
      anaSayfa.hidden = true;
      successScreen.classList.add('acik');
      window.scrollTo(0, 0);
      return;
    }
    hataGoster('Bilet sistemi hata verdi: ' + (sonuc.message || 'Bilinmeyen bir hata oluştu.'));
  });
})();
