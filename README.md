# Vibe Event — web sitesi (v2)

Kırıkkale merkezli etkinlik oluşumu **Vibe Event** için marka sitesi + bilet sayfası.
Statik HTML/CSS/JS; derleme adımı yok, herhangi bir statik barındırmaya (GitHub Pages dahil) olduğu gibi yüklenir.

## Dosyalar

- `index.html` — ana sayfa: tam ekran likit-krom shader hero, DJ TINA, biletler, marquee + kural özeti, iletişim
- `bilet.html` — bilet formu (mevcut Google Apps Script arka ucuna bağlı; adres `assets/js/bilet.js` içinde `APPS_SCRIPT_URL`) + nasıl alınır, kurallar, SSS
- `assets/css/site.css` — tüm stiller (renk/ölçü değişkenleri dosyanın başında)
- `assets/js/hero-shader.js` — WebGL hero sahnesi (`window.VIBE_HERO` API'si; WebGL yoksa `assets/img/hero-fallback.jpg`)
- `assets/js/site.js` — yükleyici, Lenis smooth scroll, üst bar, kaydırma → shader, marquee, reveal, menü
- `assets/js/bilet.js` — form doğrulama, IBAN kopyalama, dekont yükleme, Apps Script protokolü
- `assets/js/lenis.min.js` — Lenis 1.3.4 (yerel kopya)
- `assets/fonts/` — Panchang 500/700/800 (Fontshare, ITF Free Font License) + JetBrains Mono (OFL), Türkçe alt küme
- `assets/brand/` — logo: `vibe-logo-master-4000.png` (orijinal), `vibe-logo-lockup*` (göz + yazı, şeffaf — her yerde bu kullanılır), `vibe-logo-goz*` (yalnız göz — favicon ve madalyon için)
- `assets/img/` — afiş, OG görseli, favicon'lar, hero yedek karesi

## Yeni etkinlik eklerken

1. `index.html`: hero HUD etiketleri, DJ TINA bölümü, bilet fiyatları, marquee metni, JSON-LD bloğu.
2. `bilet.html`: bilet seçenekleri (`data-tutar`, `data-kisi`), IBAN, sayfa başı HUD'u.
3. Afişi `assets/img/` altına koy; `<picture>` kaynaklarını ve OG görselini değiştir.

## Alan adı değişince

`index.html` ve `bilet.html` içindeki `og:image` ve JSON-LD adresleri mutlak URL ister; yeni alan adıyla değiştir.
