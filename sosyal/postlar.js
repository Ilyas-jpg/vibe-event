/* Vibe Event — Instagram seti verisi. sablon.html?post=<anahtar> ile render edilir. */
window.POSTLAR = {
  "01-duyuru": {
    tip: "feed", sayfa: "01 / 05", seed: 3.7, scroll: 0.15, duzen: "duyuru",
    baslik: ["Hazır ol,", "gözlerin", "açılsın."],
    hud: [["Tarih", "22.09.2026 Salı"], ["Mekân", "Terapi Cafe, Kırıkkale"], ["Kapılar", "19:00 · Sahne 19:30"], ["Bilet", "380₺'den · Erken dönem"]],
    cta: "Bilet · Link bio'da"
  },
  "02-djtina": {
    tip: "feed", sayfa: "02 / 05", seed: 5.1, scroll: 0.45, duzen: "dj",
    dev: "DJ TINA", alt: "Open Your Eyes",
    hud: [["Tarih", "22.09.2026 Salı"], ["Saat", "Kapı 19:00 · Sahne 19:30"], ["Mekân", "Terapi Cafe, Kırıkkale"], ["Format", "Alkolsüz etkinlik"]],
    cta: "Bilet · Link bio'da", foto: "dj-portre.jpg"
  },
  "03-biletler": {
    tip: "feed", sayfa: "03 / 05", seed: 7.9, scroll: 0.6, duzen: "bilet",
    baslik: ["Erken dönem", "biletler"],
    satirlar: [["Tek Tabanca", "1 kişi", "380₺"], ["Ayrılmaz İkili", "2 kişi · kişi başı 350₺", "700₺"], ["Üçlü Kampanya", "3 kişi · kişi başı 333₺", "1.000₺"]],
    cta: "Bilet · Link bio'da"
  },
  "04-nasil": {
    tip: "feed", sayfa: "04 / 05", seed: 2.3, scroll: 0.3, duzen: "adimlar",
    baslik: ["Bilet nasıl", "alınır?"],
    adimlar: ["Profildeki linkten forma gir, kaç kişi geleceğini seç.", "Ücreti formdaki IBAN'a gönder.", "Açıklamaya ad-soyad ve telefon numaranı yaz.", "Dekontunu forma yükle.", "Onaylanınca QR kodlu biletin e-postana gelsin."],
    cta: "Form · Link bio'da"
  },
  "05-alkolsuz": {
    tip: "feed", sayfa: "05 / 05", seed: 9.4, scroll: 0.8, duzen: "ifade",
    baslik: ["Tamamen", "alkolsüz."],
    satirlar: ["Kapı 19:00'da açılır; kimliğini yanında bulundur.", "Kesici, yanıcı nesne ve açık paket sigara alana giremez.", "Alanda yeme-içme stantları var; dışarıdan yok."],
    cta: "Bilet · Link bio'da"
  },
  "story-01-duyuru": {
    tip: "story", seed: 3.7, scroll: 0.2, duzen: "duyuru",
    baslik: ["Hazır ol,", "gözlerin", "açılsın."],
    hud: [["Tarih", "22.09.2026 Salı"], ["Mekân", "Terapi Cafe, Kırıkkale"], ["Kapılar", "19:00 · Sahne 19:30"], ["Bilet", "380₺'den · Erken dönem"]],
    cta: "Bilet · Profildeki link"
  },
  "story-02-biletler": {
    tip: "story", seed: 7.9, scroll: 0.5, duzen: "bilet",
    baslik: ["Erken dönem", "biletler"],
    satirlar: [["Tek Tabanca", "1 kişi", "380₺"], ["Ayrılmaz İkili", "2 kişi · kişi başı 350₺", "700₺"], ["Üçlü Kampanya", "3 kişi · kişi başı 333₺", "1.000₺"]],
    cta: "Bilet · Profildeki link"
  }
};
