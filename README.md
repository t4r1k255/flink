# İş Portalı Filtresi · Job Board Filter

Kariyer.net, Eleman.net ve Indeed'de ilgilenmediğin pozisyonları, şirketleri ve konumları otomatik gizleyen tek bir userscript. Liste bütün sitelerde ortaktır.

A single userscript that hides job listings you don't care about on Kariyer.net, Eleman.net and Indeed. One shared list for all sites.

**[Türkçe](#türkçe) · [English](#english)**

> Bu script, ayrı ayrı tutulan [Kariyer.net Pozisyon Filtresi](https://github.com/t4r1k255/kariyer-net-filtreleme-araci) ve [Eleman.net Pozisyon Filtresi](https://github.com/t4r1k255/Eleman.net-Pozisyon-Filtresi)'nin yerini alır.

---

## Türkçe

### Kurulum

1. Tarayıcına [Tampermonkey](https://www.tampermonkey.net/) veya [Violentmonkey](https://violentmonkey.github.io/) kur.
2. `is-portali-filtresi.user.js` dosyasını aç ve **Install / Yükle**'ye bas.
3. Eski Kariyer.net / Eleman.net filtreleri kuruluysa onları kapat (ikisi aynı anda çalışmasın).

### Kullanım

- Sağ alttaki **🚫 Filtre** düğmesi paneli açar. Düğmedeki sayı, bu sayfada gizlenen ilan sayısıdır.
- Panelde dört liste var:

| Sekme | Neye bakar | Örnek |
|---|---|---|
| **Pozisyon** | İlan başlığı | `Satış Danışmanı`, `Call Center` |
| **İstisna** | İlan başlığı; eşleşirse pozisyon kuralı uygulanmaz | Pozisyon'da `satış`, burada `satış mühendisi` |
| **Şirket** | Şirket adı | `Gİ GROUP` |
| **Konum** | Konum | `Ankara`, `İstanbul Anadolu` |

- Her satıra bir ifade yaz (Pozisyon, İstisna ve Konum'da virgülle de ayırabilirsin). `Ctrl+Enter` ekler.
- Fareyle bir ilanın üzerine gelince **🏢 Şirketi gizle** ve **📄 Pozisyonu gizle** düğmeleri çıkar. Yanlışlıkla gizlersen alttaki bildirimde **Geri al** var.
- **Sponsorlu ilanları gizle**: Kariyer.net ve Indeed'deki sponsorlu ilanlar.
- **Gizlemek yerine soluk göster**: ilanlar kaybolmaz, gri görünür ve köşede nedeni yazar ("Şirket: Gİ GROUP"). Kuralları denerken işe yarar.
- **Dışa aktar / İçe aktar**: listeyi JSON dosyası olarak kaydet, başka tarayıcıya taşı. İçe aktarma mevcut listeyi silmez, üstüne ekler.
- Tampermonkey menüsünde: "Paneli aç/kapat", "Filtreyi aç/kapat".

### Eşleştirme nasıl çalışır?

- Büyük/küçük harf ve Türkçe karakter fark etmez: `satis danismani` = `SATIŞ DANIŞMANI`.
- İfade **kelime başında** aranır, sonuna ek gelebilir: `mühendis` → *Yazılım Mühendisi* eşleşir; `garson` → *Agarsonlar* eşleşmez.
- **Tam kelime** için tırnak: `"satış"` → *Satış Elemanı* eşleşir, *Satışçı* eşleşmez.
- Pozisyon listesi yalnız başlığa bakar. Şirket ya da şehir gizlemek için Şirket / Konum sekmesini kullan.

### Eski sürümden (v1) geçiş

- Kariyer.net ve Eleman.net'teki eski listen, o siteyi ilk açtığında bir kez **Pozisyon** listesine aktarılır. Eski kayıt silinmez.
- **Değişiklik:** v1 ifadeleri başlık + şirket + konum metninin tamamında arıyordu. v2'de Pozisyon listesi yalnız başlığa bakar. Eski listende şirket ya da şehir adı varsa onları **Şirket** / **Konum** sekmesine taşı.

### Notlar

- Liste Tampermonkey/Violentmonkey deposunda tutulur: üç sitede ortaktır, açık sekmeler arasında anında eşitlenir. Başka tarayıcıya taşımak için Dışa/İçe aktar.
- **Indeed desteği deneme aşamasında:** Indeed'in sayfa yapısı Cloudflare doğrulaması yüzünden henüz canlı sayfada denenmedi. Çalışmazsa bir issue aç.
- Bağımsız bir topluluk aracıdır; Kariyer.net, Eleman.net ve Indeed ile bağlantısı yoktur.

---

## English

### Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open `is-portali-filtresi.user.js` and click **Install**.
3. Disable the old Kariyer.net / Eleman.net filters if you had them.

### Usage

- The **🚫 Filtre** button (bottom right) opens the panel; the number is how many listings are hidden on this page.
- Four lists: **Pozisyon** (job title), **İstisna** (title exceptions that override Pozisyon), **Şirket** (company), **Konum** (location).
- Hover a listing for one-click **hide company** / **hide position** buttons, with **Undo** in the toast.
- Options: hide sponsored listings; dim instead of hide (shows the reason on each card).
- Export / import the list as JSON. Import merges; it never deletes.

### Matching

- Case- and Turkish-diacritic-insensitive (`satis` = `SATIŞ`).
- Phrases match at the **start of a word**, suffixes allowed (`mühendis` matches *Mühendisi*). Wrap in quotes for whole words only (`"satış"`).
- Pozisyon only checks the title; use Şirket / Konum for companies and places.

### Upgrading from v1

Your old per-site list is imported once into **Pozisyon**. v1 matched against title + company + location; v2's Pozisyon checks the title only, so move company or city names to the Şirket / Konum tabs.

### Notes

- Stored in the userscript manager's storage, shared across all three sites and synced between open tabs.
- **Indeed support is experimental**: its selectors are not yet verified on a live page.
- Independent community tool, not affiliated with Kariyer.net, Eleman.net or Indeed.

### Development

```bash
node --test test/
```

## Lisans · License

[MIT](LICENSE)
