# Vibe Event — web sitesi

Kırıkkale merkezli etkinlik oluşumu **Vibe Event** için marka sitesi + bilet sayfası.
Statik HTML/CSS/JS; derleme adımı yok, herhangi bir statik barındırmaya (GitHub Pages dahil) olduğu gibi yüklenir.

## Dosyalar

- `index.html` — ana sayfa (etkinlik, biletler, nasıl alınır, hakkında, kurallar, SSS, iletişim)
- `bilet.html` — bilet formu (mevcut Google Apps Script arka ucuna bağlı; adres `assets/js/bilet.js` içinde `APPS_SCRIPT_URL`)
- `assets/css/site.css` — tüm stiller (renk ve ölçü değişkenleri dosyanın başında)
- `assets/js/site.js` — menü, geri sayım (etkinlik tarihi burada), yıl
- `assets/js/bilet.js` — form doğrulama, IBAN kopyalama, dekont yükleme, Apps Script protokolü
- `assets/img/` — logo türevleri, afiş, OG görseli, favicon'lar
- `assets/brand/vibe-logo-master-4000.png` — logonun orijinal yüksek çözünürlüklü hâli (sitede doğrudan kullanılmaz)
- `assets/fonts/` — Syne ve Manrope (Türkçe alt küme, değişken ağırlık)

## Yeni etkinlik eklerken

1. `index.html` içinde etkinlik bölümünü (`#etkinlik`), bilet fiyatlarını (`#biletler`) ve JSON-LD bloğunu güncelle.
2. `bilet.html` içindeki bilet seçeneklerini (`data-tutar`, `data-kisi`) ve IBAN bilgisini güncelle.
3. `assets/js/site.js` içindeki geri sayım tarihini değiştir.
4. Afişi `assets/img/` altına koy, `<picture>` kaynaklarını ve OG görselini değiştir.

## Alan adı değişince

`index.html` ve `bilet.html` içindeki `og:image` ve JSON-LD adresleri mutlak URL ister; yeni alan adıyla değiştir.
