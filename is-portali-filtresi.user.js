// ==UserScript==
// @name         İş Portalı Filtresi (Kariyer.net, Eleman.net, Indeed)
// @namespace    https://github.com/t4r1k255/is-portali-filtresi
// @version      2.0.0
// @description  İlgilenmediğin pozisyonları, şirketleri ve konumları Kariyer.net, Eleman.net ve Indeed'de otomatik gizler. Tek liste, tüm siteler.
// @author       t4r1k255
// @license      MIT
// @match        https://www.kariyer.net/*
// @match        https://www.eleman.net/*
// @match        https://*.indeed.com/*
// @exclude      https://secure.indeed.com/*
// @exclude      https://smartapply.indeed.com/*
// @exclude      https://apply.indeed.com/*
// @exclude      https://employers.indeed.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const ANAHTAR = 'ipf_ayarlar_v2';
  const LISTELER = ['pozisyon', 'istisna', 'sirket', 'konum'];

  // =====================================================================
  // 1. Metin eşleştirme (saf fonksiyonlar; test/eslestirme.test.js)
  // =====================================================================

  const HARF = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };

  // Karşılaştırma biçimi: küçük harf, Türkçe harfler ASCII'ye, noktalama boşluğa,
  // başta ve sonda birer boşluk (kelime başı aramayı kolaylaştırır).
  // "SOFTWARE ENGINEER" -> " software engineer ", "Satış Danışmanı (Kadıköy)" -> " satis danismani kadikoy "
  function sadelestir(s) {
    const t = String(s == null ? '' : s)
      .toLocaleLowerCase('tr')
      .replace(/[ışğüöçâîû]/g, (h) => HARF[h])
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9+#]+/g, ' ')
      .trim();
    return ' ' + t + ' ';
  }

  // Kullanıcının yazdığı ifadeyi kurala çevirir.
  // Normal: kelime başında aranır ("mühendis" -> "Yazılım Mühendisi" eşleşir, "garson" -> "Agarson" eşleşmez).
  // Tırnaklı ("satış"): yalnız tam kelime/ifade olarak aranır ("Satışçı" eşleşmez).
  function kuralDerle(ham) {
    const yazi = String(ham || '').trim();
    const tam = /^".+"$/.test(yazi);
    const govde = sadelestir(tam ? yazi.slice(1, -1) : yazi).trim();
    if (!govde) return null;
    return { ham: yazi, aranan: ' ' + govde + (tam ? ' ' : '') };
  }

  function kurallariDerle(liste) {
    return (liste || []).map(kuralDerle).filter(Boolean);
  }

  // metin sadelestir() çıktısı olmalı. İlk eşleşen kuralın ham yazısını döndürür.
  function ilkEslesen(metin, kurallar) {
    for (const k of kurallar) if (metin.includes(k.aranan)) return k.ham;
    return null;
  }

  // ilan: { baslik, sirket, konum, sponsorlu }. Gizleme nedeni ya da null döndürür.
  function karar(ilan, kurallar, ayar) {
    if (ayar.sponsorluGizle && ilan.sponsorlu) return 'Sponsorlu ilan';
    const s = ilan.sirket && ilkEslesen(sadelestir(ilan.sirket), kurallar.sirket);
    if (s) return 'Şirket: ' + s;
    const k = ilan.konum && ilkEslesen(sadelestir(ilan.konum), kurallar.konum);
    if (k) return 'Konum: ' + k;
    const baslik = sadelestir(ilan.baslik);
    const p = ilkEslesen(baslik, kurallar.pozisyon);
    if (p && !ilkEslesen(baslik, kurallar.istisna)) return 'Pozisyon: ' + p;
    return null;
  }

  // Depodan ya da içe aktarılan dosyadan gelen her şeyi güvenli biçime getirir.
  function temizle(o) {
    o = o && typeof o === 'object' ? o : {};
    const a = {
      sponsorluGizle: o.sponsorluGizle === true,
      soluk: o.soluk === true,
      aktif: o.aktif !== false,
      tasinan: o.tasinan && typeof o.tasinan === 'object' ? { ...o.tasinan } : {},
    };
    for (const ad of LISTELER) a[ad] = tekillestir(Array.isArray(o[ad]) ? o[ad] : []);
    return a;
  }

  function tekillestir(liste) {
    const gorulen = new Set();
    const sonuc = [];
    for (const x of liste) {
      if (typeof x !== 'string') continue;
      const yazi = x.trim().slice(0, 200);
      const k = kuralDerle(yazi);
      if (!k || gorulen.has(k.aranan)) continue;
      gorulen.add(k.aranan);
      sonuc.push(yazi);
    }
    return sonuc;
  }

  // "a\nb, c" -> ["a", "b", "c"]. Şirket adlarında virgül olabildiği için orada yalnız satır.
  function girdiyiBol(metin, liste) {
    const ayrac = liste === 'sirket' ? /\n/ : /[\n,]/;
    return String(metin || '').split(ayrac).map((s) => s.trim()).filter(Boolean);
  }

  // <span>Şirket<br>Konum</span> -> ["Şirket", "Konum"]. innerText gizli öğede <br>'i yok saydığı için.
  function brParcala(el) {
    if (!el) return [];
    const parcalar = [''];
    for (const n of el.childNodes) {
      if (n.nodeName === 'BR') parcalar.push('');
      else parcalar[parcalar.length - 1] += n.textContent;
    }
    return parcalar.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  const disa = { sadelestir, kuralDerle, kurallariDerle, ilkEslesen, karar, temizle, girdiyiBol, brParcala };
  if (typeof module === 'object' && module && module.exports) {
    module.exports = disa;
    return;
  }
  if (typeof document === 'undefined') return;

  // =====================================================================
  // 2. Site uyarlayıcıları
  // =====================================================================

  function yazi(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  // Kök kapsayıcı birden fazla ilan içeriyorsa (liste kapsayıcısı) iç öğeye dön.
  function tekIlanKoku(kok, ic, secici) {
    return kok && kok.querySelectorAll(secici).length <= 1 ? kok : ic;
  }

  const SITELER = {
    kariyer: {
      ad: 'Kariyer.net',
      renk: '#6c2eb5',
      eskiAnahtar: 'kn_pozisyon_blacklist_v1',
      uygun: (h) => /(^|\.)kariyer\.net$/.test(h),
      ilanLinki: 'a[href*="/is-ilani/"]',
      kartlar: () => Array.from(document.querySelectorAll('.job-list-card-item')),
      // İkinci seçiciler: ana sayfadaki "öne çıkan ilanlar" kutuları (.slick-item-jobs-box)
      bilgi: (kart) => ({
        baslik: yazi(kart.querySelector('[data-test="ad-card-title"], .promoted-job-item-body-title')),
        sirket: yazi(kart.querySelector('[data-test="subtitle"], .promoted-job-item-body-company')),
        konum: yazi(kart.querySelector('[data-test="location"], .promoted-job-item-body-location')),
        sponsorlu: !!kart.querySelector('[data-test="ad-card-sponsored-item-title"]'),
      }),
    },
    eleman: {
      ad: 'Eleman.net',
      renk: '#e2001a',
      eskiAnahtar: 'en_pozisyon_blacklist_v1',
      uygun: (h) => /(^|\.)eleman\.net$/.test(h),
      ilanLinki: 'a[href*="/is-ilani/"]',
      kartlar: () =>
        Array.from(document.querySelectorAll('.ilan_listeleme_bol')).map((b) =>
          tekIlanKoku(b.closest('.c-box'), b, '.ilan_listeleme_bol')
        ),
      bilgi: (kart) => {
        // Ana sayfa vitrini: <a title="Başlık - Şirket"><img alt="Başlık"><h6 class="c-showcase-box__vtitle">
        const vitrin = kart.querySelector('.c-showcase-box__vtitle');
        if (vitrin) {
          const b = yazi(vitrin);
          const t = ((kart.querySelector('a[title]') || kart).getAttribute('title') || '').trim();
          return { baslik: b, sirket: t.startsWith(b + ' - ') ? t.slice(b.length + 3) : '', konum: '', sponsorlu: false };
        }
        const h3 = kart.querySelector('h3');
        let baslik = h3
          ? Array.from(h3.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')
          : '';
        if (!baslik.trim()) baslik = yazi(h3 || kart.querySelector('.c-showcase-box__title'));
        const alt = brParcala(kart.querySelector('.c-showcase-box__subtitle'));
        const logo = kart.querySelector('img.c-brand-logo__img');
        return {
          baslik: baslik.replace(/\s+/g, ' ').trim(),
          sirket: alt[0] || (logo && logo.alt) || '',
          konum: alt[1] || '',
          sponsorlu: false,
        };
      },
    },
    // TAHMİN: Indeed seçicileri canlı sayfada henüz doğrulanmadı (Cloudflare doğrulaması
    // yüzünden). Bilinen düzen: .job_seen_beacon kartı, h2.jobTitle başlığı,
    // data-testid="company-name" / "text-location".
    indeed: {
      ad: 'Indeed',
      renk: '#2557a7',
      eskiAnahtar: null,
      uygun: (h) => /(^|\.)indeed\.com$/.test(h),
      ilanLinki: null,
      kartlar: () =>
        Array.from(document.querySelectorAll('.job_seen_beacon')).map((b) =>
          tekIlanKoku(b.closest('li'), tekIlanKoku(b.closest('.cardOutline'), b, '.job_seen_beacon'), '.job_seen_beacon')
        ),
      bilgi: (kart) => {
        const t = kart.querySelector('h2.jobTitle [title], a.jcs-JobTitle [title]');
        return {
          baslik: t ? t.getAttribute('title') : yazi(kart.querySelector('h2.jobTitle, a.jcs-JobTitle')),
          sirket: yazi(kart.querySelector('[data-testid="company-name"], .companyName')),
          konum: yazi(kart.querySelector('[data-testid="text-location"], .companyLocation')),
          sponsorlu:
            !!kart.querySelector('.sponsoredJob, .sponsoredGray, [data-testid*="sponsored" i]') ||
            kart.classList.contains('sponsoredJob'),
        };
      },
    },
  };

  const siteAdi = Object.keys(SITELER).find((k) => SITELER[k].uygun(location.hostname));
  if (!siteAdi) return;
  const SITE = SITELER[siteAdi];

  // Uyarlayıcının tanımadığı düzenlerdeki ilanlar (ör. Eleman.net ana sayfa vitrini):
  // ilan linkinden en fazla 3 adım yukarı çık; üst öğede başka bir link varsa (liste, slider,
  // reklam alanı) dur, yoksa ilanla birlikte başka içerik de gizlenir.
  function yedekKartlar(bilinenler) {
    if (!SITE.ilanLinki) return [];
    const sonuc = [];
    for (const a of document.querySelectorAll(SITE.ilanLinki)) {
      if (bilinenler.some((k) => k.contains(a))) continue;
      let el = a;
      for (let i = 0; i < 3 && el.parentElement && el.parentElement !== document.body; i++) {
        const ust = el.parentElement;
        if (Array.from(ust.querySelectorAll('a[href]')).some((x) => x !== a && !a.contains(x))) break;
        el = ust;
      }
      sonuc.push({ kart: el, link: a });
    }
    return sonuc;
  }

  const BASLIK_SECICILERI = ['[data-test="ad-card-title"]', 'h3', 'h2', 'h4', '[class*="__title"]', '[class*="card-title"]'];
  function linkBasligi(a) {
    for (const s of BASLIK_SECICILERI) {
      const t = yazi(a.querySelector(s));
      if (t) return t;
    }
    return yazi(a) || (a.getAttribute('title') || '').replace(/\s*iş ilanı$/i, '');
  }

  function kartlariTopla() {
    const bilinenler = SITE.kartlar().filter(Boolean);
    const adaylar = bilinenler.map((kart) => ({ kart, link: null })).concat(yedekKartlar(bilinenler));
    const sonuc = [];
    const gorulen = new Set();
    for (const { kart, link } of adaylar) {
      if (gorulen.has(kart)) continue;
      gorulen.add(kart);
      let ilan;
      try {
        ilan = SITE.bilgi(kart);
        if (link && !ilan.baslik) ilan.baslik = linkBasligi(link);
      } catch (e) {
        continue;
      }
      if (ilan.baslik || ilan.sirket) sonuc.push({ kart, ilan });
    }
    return sonuc;
  }

  // =====================================================================
  // 3. Depolama (Tampermonkey/Violentmonkey deposu: tüm sitelerde tek liste)
  // =====================================================================

  const gmVar = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

  function depoOku() {
    try {
      const v = gmVar ? GM_getValue(ANAHTAR, null) : localStorage.getItem(ANAHTAR);
      return temizle(typeof v === 'string' ? JSON.parse(v) : v);
    } catch (e) {
      return temizle(null);
    }
  }

  function depoYaz(a) {
    try {
      if (gmVar) GM_setValue(ANAHTAR, a);
      else localStorage.setItem(ANAHTAR, JSON.stringify(a));
    } catch (e) {
      bildir('Ayarlar kaydedilemedi: ' + e.message);
    }
  }

  let ayar = depoOku();
  let kurallar = null;

  function kurallariYenile() {
    kurallar = {};
    for (const ad of LISTELER) kurallar[ad] = kurallariDerle(ayar[ad]);
  }

  function kaydet() {
    ayar = temizle(ayar);
    depoYaz(ayar);
    kurallariYenile();
    uygula();
    panelCiz();
  }

  // Eski sürümlerin (v1) bu sitedeki localStorage listesini bir kez pozisyon listesine kat.
  function eskiListeyiTasi() {
    if (!SITE.eskiAnahtar || ayar.tasinan[siteAdi]) return;
    let eski = [];
    try {
      const ham = JSON.parse(localStorage.getItem(SITE.eskiAnahtar) || '[]');
      if (Array.isArray(ham)) eski = ham.filter((x) => typeof x === 'string');
    } catch (e) {
      /* bozuk eski kayıt: yok say */
    }
    ayar.pozisyon = ayar.pozisyon.concat(eski);
    ayar.tasinan[siteAdi] = true;
    ayar = temizle(ayar);
    depoYaz(ayar);
    if (eski.length) {
      bildir(
        SITE.ad + ' eski listesinden ' + eski.length + ' ifade Pozisyon sekmesine aktarıldı. ' +
          'Pozisyon artık yalnız başlığa bakar: şirket/şehir adlarını Şirket/Konum sekmesine taşı.',
        'Paneli aç',
        () => panelAcKapa(true),
        15000
      );
    }
  }

  function ekle(liste, metin) {
    const yeni = girdiyiBol(metin, liste);
    if (!yeni.length) return 0;
    const once = ayar[liste].length;
    ayar[liste] = ayar[liste].concat(yeni);
    kaydet();
    return ayar[liste].length - once;
  }

  function sil(liste, ham) {
    ayar[liste] = ayar[liste].filter((x) => x !== ham);
    kaydet();
  }

  // =====================================================================
  // 4. Sayfaya uygulama
  // =====================================================================

  let gizliSayisi = 0;
  const kartIlan = new WeakMap();

  function uygula() {
    if (!kurallar) kurallariYenile();
    const bulunan = kartlariTopla();
    const simdiki = new Set();
    let sayi = 0;
    for (const { kart, ilan } of bulunan) {
      simdiki.add(kart);
      kartIlan.set(kart, ilan);
      aracCubuguEkle(kart);
      const neden = ayar.aktif ? karar(ilan, kurallar, ayar) : null;
      if (neden) sayi++;
      isaretle(kart, neden);
    }
    // Artık ilan olmayan (yeniden kullanılmış) öğelerdeki eski işaretleri kaldır.
    document.querySelectorAll('.ipf-gizli, .ipf-soluk').forEach((el) => {
      if (!simdiki.has(el)) isaretle(el, null);
    });
    gizliSayisi = sayi;
    rozetCiz();
  }

  function isaretle(kart, neden) {
    const gizli = !!neden && !ayar.soluk;
    const soluk = !!neden && ayar.soluk;
    if (kart.classList.contains('ipf-gizli') !== gizli) kart.classList.toggle('ipf-gizli', gizli);
    if (kart.classList.contains('ipf-soluk') !== soluk) kart.classList.toggle('ipf-soluk', soluk);
    const etiket = kart.querySelector(':scope > .ipf-arac > .ipf-etiket');
    if (etiket && etiket.textContent !== (neden || '')) etiket.textContent = neden || '';
  }

  function aracCubuguEkle(kart) {
    kart.classList.add('ipf-kart');
    if (kart.querySelector(':scope > .ipf-arac')) return;
    const cubuk = document.createElement('div');
    cubuk.className = 'ipf-arac';
    const etiket = document.createElement('span');
    etiket.className = 'ipf-etiket';
    const sirketBtn = document.createElement('button');
    sirketBtn.type = 'button';
    sirketBtn.textContent = '🏢 Şirketi gizle';
    sirketBtn.title = 'Bu şirketin bütün ilanlarını gizle';
    sirketBtn.dataset.ipfIslem = 'sirket';
    const pozBtn = document.createElement('button');
    pozBtn.type = 'button';
    pozBtn.textContent = '📄 Pozisyonu gizle';
    pozBtn.title = 'Bu pozisyon adını içeren ilanları gizle';
    pozBtn.dataset.ipfIslem = 'pozisyon';
    cubuk.append(etiket, sirketBtn, pozBtn);
    kart.appendChild(cubuk);
  }

  // Tek dinleyici: kart içindeki düğmeler. Kartın kendi tıklamasını (ilanı açma) engeller.
  function aracTiklama(e) {
    const btn = e.target.closest && e.target.closest('.ipf-arac button[data-ipf-islem]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type !== 'click') return;
    const kart = btn.closest('.ipf-kart');
    const ilan = kart && kartIlan.get(kart);
    if (!ilan) return;
    if (btn.dataset.ipfIslem === 'sirket') {
      if (!ilan.sirket) return bildir('Bu ilanda şirket adı bulunamadı.');
      const once = ayar.sirket.slice();
      if (ekle('sirket', ilan.sirket)) {
        bildir('“' + ilan.sirket + '” gizlendi.', 'Geri al', () => {
          ayar.sirket = once;
          kaydet();
        });
      }
    } else {
      const ifade = window.prompt('Başlığında bu ifade geçen ilanlar gizlenecek (kısaltabilirsin):', ilan.baslik);
      if (ifade && ifade.trim()) {
        const once = ayar.pozisyon.slice();
        if (ekle('pozisyon', ifade.trim())) {
          bildir('“' + ifade.trim() + '” pozisyon listesine eklendi.', 'Geri al', () => {
            ayar.pozisyon = once;
            kaydet();
          });
        }
      }
    }
  }

  // =====================================================================
  // 5. Arayüz (Shadow DOM: sitenin CSS'i panele karışmaz)
  // =====================================================================

  const SAYFA_CSS = `
    .ipf-gizli { display: none !important; }
    .ipf-kart { position: relative !important; }
    .ipf-soluk { opacity: .35 !important; filter: grayscale(1) !important; }
    .ipf-soluk:hover { opacity: .8 !important; }
    .ipf-arac { position: absolute; top: 6px; right: 6px; z-index: 5; display: none; gap: 4px;
      align-items: center; font: 12px/1.2 system-ui, sans-serif; }
    .ipf-kart:hover > .ipf-arac, .ipf-soluk > .ipf-arac { display: flex; }
    .ipf-arac button { all: unset; cursor: pointer; background: rgba(255,255,255,.95); color: #222;
      border: 1px solid #ccc; border-radius: 6px; padding: 3px 7px; font: 12px/1.2 system-ui, sans-serif;
      box-shadow: 0 1px 3px rgba(0,0,0,.15); }
    .ipf-arac button:hover { background: ${SITE.renk}; color: #fff; border-color: ${SITE.renk}; }
    .ipf-soluk:not(:hover) > .ipf-arac button { display: none; }
    .ipf-etiket { background: #333; color: #fff; border-radius: 6px; padding: 3px 7px; }
    .ipf-etiket:empty { display: none; }
  `;

  const PANEL_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    .dugme { position: fixed; right: 20px; bottom: 20px; z-index: 2147483646; background: ${SITE.renk};
      color: #fff; border: 0; border-radius: 999px; padding: 10px 14px; font-size: 13px; cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,.3); }
    .dugme.kapali { background: #777; }
    .panel { position: fixed; right: 20px; bottom: 66px; z-index: 2147483647; width: 360px; max-width: calc(100vw - 40px);
      max-height: 75vh; display: none; flex-direction: column; background: #fff; color: #222;
      border: 1px solid #ddd; border-radius: 12px; box-shadow: 0 6px 28px rgba(0,0,0,.3); font-size: 13px; }
    .panel.acik { display: flex; }
    .bas { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px 8px; }
    .bas b { font-size: 14px; }
    .bas small { color: #888; }
    .kapat { border: 0; background: none; font-size: 18px; cursor: pointer; color: #888; }
    .secenek { padding: 0 14px 8px; display: grid; gap: 4px; }
    .secenek label { display: flex; gap: 6px; align-items: center; cursor: pointer; }
    .sekmeler { display: flex; border-bottom: 1px solid #eee; padding: 0 8px; }
    .sekmeler button { flex: 1; border: 0; background: none; padding: 8px 2px; cursor: pointer; color: #666;
      border-bottom: 2px solid transparent; font-size: 12px; }
    .sekmeler button.secili { color: ${SITE.renk}; border-bottom-color: ${SITE.renk}; font-weight: 600; }
    .govde { padding: 10px 14px; overflow-y: auto; }
    .aciklama { color: #666; margin-bottom: 8px; line-height: 1.4; }
    textarea { width: 100%; height: 64px; resize: vertical; border: 1px solid #ccc; border-radius: 6px; padding: 6px; font-size: 13px; }
    .ana { width: 100%; margin: 6px 0 10px; padding: 7px; background: ${SITE.renk}; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
    .ara { width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 5px 7px; margin-bottom: 6px; font-size: 12px; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f2f2f2; }
    li span { overflow-wrap: anywhere; }
    li button { border: 0; background: #eee; border-radius: 4px; padding: 2px 8px; cursor: pointer; flex: none; }
    li button:hover { background: #fdd; }
    .bos { color: #999; padding: 6px 0; }
    .alt { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 14px 12px; border-top: 1px solid #eee; align-items: center; }
    .alt button { border: 1px solid #ccc; background: #fafafa; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
    .alt .sayac { flex: 1 1 100%; color: #666; }
    .bildirim { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 2147483647;
      background: #222; color: #fff; padding: 9px 14px; border-radius: 8px; display: none; gap: 12px; align-items: center;
      box-shadow: 0 4px 16px rgba(0,0,0,.3); font-size: 13px; max-width: calc(100vw - 40px); }
    .bildirim.acik { display: flex; }
    .bildirim button { border: 0; background: none; color: #8cf; cursor: pointer; font-weight: 600; font-size: 13px; }
  `;

  const SEKMELER = {
    pozisyon: {
      ad: 'Pozisyon',
      aciklama:
        'Başlığında bu ifadelerden biri geçen ilanlar gizlenir. Kelime başında aranır: “mühendis” → “Yazılım Mühendisi”. ' +
        'Yalnız tam kelime için tırnak kullan: "satış". Her satıra bir tane ya da virgülle ayır.',
      ornek: 'örn:\nSatış Danışmanı\nCall Center, Kasiyer',
    },
    istisna: {
      ad: 'İstisna',
      aciklama:
        'Başlıkta bunlardan biri geçerse pozisyon kuralı uygulanmaz. Örn. Pozisyon’da “satış”, burada “satış mühendisi”. ' +
        '(Şirket ve konum kurallarını etkilemez.)',
      ornek: 'örn:\nSatış Mühendisi',
    },
    sirket: {
      ad: 'Şirket',
      aciklama: 'Şirket adında bu ifadelerden biri geçen ilanlar gizlenir. Her satıra bir şirket.',
      ornek: 'örn:\nGİ GROUP\nAdecco',
    },
    konum: {
      ad: 'Konum',
      aciklama: 'Konumunda bu ifadelerden biri geçen ilanlar gizlenir.',
      ornek: 'örn:\nAnkara\nİstanbul Anadolu',
    },
  };

  let ui = null;
  let seciliSekme = 'pozisyon';
  let aramaMetni = '';

  function el(etiket, ozellik, ...cocuklar) {
    const e = document.createElement(etiket);
    for (const [k, v] of Object.entries(ozellik || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    e.append(...cocuklar);
    return e;
  }

  function arayuzKur() {
    const stil = document.createElement('style');
    stil.textContent = SAYFA_CSS;
    (document.head || document.documentElement).appendChild(stil);

    const konak = document.createElement('div');
    konak.id = 'ipf-konak';
    const kok = konak.attachShadow({ mode: 'open' });
    const pstil = document.createElement('style');
    pstil.textContent = PANEL_CSS;

    const dugme = el('button', { class: 'dugme', type: 'button', onclick: () => panelAcKapa() });
    const panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'İş Portalı Filtresi' });
    const bildirim = el('div', { class: 'bildirim', role: 'status' });
    kok.append(pstil, dugme, panel, bildirim);
    document.body.appendChild(konak);

    const dosya = el('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', onchange: iceAktar });
    dosya.style.display = 'none';
    kok.appendChild(dosya);

    ui = { konak, kok, dugme, panel, bildirim, dosya };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ui.panel.classList.contains('acik')) panelAcKapa(false);
    });
    rozetCiz();
  }

  function panelAcKapa(ac) {
    const acilsin = typeof ac === 'boolean' ? ac : !ui.panel.classList.contains('acik');
    ui.panel.classList.toggle('acik', acilsin);
    if (acilsin) panelCiz();
  }

  function rozetCiz() {
    if (!ui) return;
    ui.dugme.classList.toggle('kapali', !ayar.aktif);
    ui.dugme.textContent = ayar.aktif
      ? '🚫 Filtre' + (gizliSayisi ? ' · ' + gizliSayisi : '')
      : '⏸ Filtre kapalı';
    ui.dugme.title = ayar.aktif ? 'Bu sayfada ' + gizliSayisi + ' ilan ' + (ayar.soluk ? 'soluklaştırıldı' : 'gizlendi') : 'Filtre kapalı';
  }

  function secenek(metin, anahtar) {
    return el(
      'label',
      {},
      el('input', {
        type: 'checkbox',
        checked: !!ayar[anahtar],
        onchange: (e) => {
          ayar[anahtar] = e.target.checked;
          kaydet();
        },
      }),
      metin
    );
  }

  function panelCiz() {
    if (!ui || !ui.panel.classList.contains('acik')) return;
    const odakArama = ui.kok.activeElement && ui.kok.activeElement.classList.contains('ara');
    const s = SEKMELER[seciliSekme];
    const liste = ayar[seciliSekme];

    const girdi = el('textarea', { placeholder: s.ornek });
    girdi.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ekleDugmesi.click();
    });
    const ekleDugmesi = el('button', {
      class: 'ana',
      type: 'button',
      textContent: 'Listeye ekle',
      onclick: () => {
        const n = ekle(seciliSekme, girdi.value);
        girdi.value = '';
        bildir(n ? n + ' ifade eklendi.' : 'Yeni ifade yok (zaten listede).');
      },
    });

    const ara = el('input', {
      class: 'ara',
      type: 'search',
      placeholder: 'Listede ara… (' + liste.length + ')',
      value: aramaMetni,
      oninput: (e) => {
        aramaMetni = e.target.value;
        panelCiz();
      },
    });

    const aranan = sadelestir(aramaMetni).trim();
    const gorunen = liste.filter((x) => !aranan || sadelestir(x).includes(aranan));
    const ul = el('ul');
    if (!gorunen.length) ul.append(el('li', { class: 'bos', textContent: liste.length ? 'Eşleşen yok.' : 'Liste boş.' }));
    for (const ham of gorunen.slice().reverse()) {
      ul.append(el('li', {}, el('span', { textContent: ham }), el('button', { type: 'button', textContent: 'Sil', onclick: () => sil(seciliSekme, ham) })));
    }

    const sekmeler = el(
      'div',
      { class: 'sekmeler', role: 'tablist' },
      ...LISTELER.map((ad) =>
        el('button', {
          type: 'button',
          role: 'tab',
          class: ad === seciliSekme ? 'secili' : '',
          textContent: SEKMELER[ad].ad + ' (' + ayar[ad].length + ')',
          onclick: () => {
            seciliSekme = ad;
            aramaMetni = '';
            panelCiz();
          },
        })
      )
    );

    ui.panel.replaceChildren(
      el(
        'div',
        { class: 'bas' },
        el('div', {}, el('b', { textContent: 'İş Portalı Filtresi ' }), el('small', { textContent: SITE.ad })),
        el('button', { class: 'kapat', type: 'button', textContent: '×', title: 'Kapat (Esc)', onclick: () => panelAcKapa(false) })
      ),
      el(
        'div',
        { class: 'secenek' },
        secenek('Filtre açık', 'aktif'),
        secenek('Sponsorlu ilanları gizle', 'sponsorluGizle'),
        secenek('Gizlemek yerine soluk göster (nedeniyle)', 'soluk')
      ),
      sekmeler,
      el('div', { class: 'govde' }, el('div', { class: 'aciklama', textContent: s.aciklama }), girdi, ekleDugmesi, ara, ul),
      el(
        'div',
        { class: 'alt' },
        el('span', { class: 'sayac', textContent: 'Bu sayfada ' + gizliSayisi + ' ilan ' + (ayar.soluk ? 'soluklaştırıldı.' : 'gizlendi.') + ' Liste tüm sitelerde ortak.' }),
        el('button', { type: 'button', textContent: 'Dışa aktar', onclick: disaAktar }),
        el('button', { type: 'button', textContent: 'İçe aktar', onclick: () => ui.dosya.click() }),
        el('button', {
          type: 'button',
          textContent: 'Bu sekmeyi temizle',
          onclick: () => {
            if (!ayar[seciliSekme].length) return;
            if (!window.confirm(s.ad + ' listesindeki ' + ayar[seciliSekme].length + ' ifadenin hepsi silinsin mi?')) return;
            const once = ayar[seciliSekme].slice();
            const sekme = seciliSekme;
            ayar[sekme] = [];
            kaydet();
            bildir(s.ad + ' listesi temizlendi.', 'Geri al', () => {
              ayar[sekme] = once;
              kaydet();
            });
          },
        })
      )
    );
    if (odakArama) {
      const yeni = ui.panel.querySelector('.ara');
      yeni.focus();
      yeni.setSelectionRange(yeni.value.length, yeni.value.length);
    }
  }

  function disaAktar() {
    const veri = { uygulama: 'is-portali-filtresi', surum: 2 };
    for (const ad of LISTELER) veri[ad] = ayar[ad];
    veri.sponsorluGizle = ayar.sponsorluGizle;
    const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'is-portali-filtresi-' + new Date().toISOString().slice(0, 10) + '.json' });
    ui.kok.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // JSON ise listelere eklenir (mevcutlar silinmez); düz metinse satırlar açık sekmeye eklenir.
  function iceAktar(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 1024 * 1024) return bildir('Dosya çok büyük (en fazla 1 MB).');
    f.text().then((metin) => {
      let veri = null;
      try {
        veri = JSON.parse(metin);
      } catch (_) {
        /* düz metin */
      }
      let eklenen = 0;
      if (veri && typeof veri === 'object' && !Array.isArray(veri)) {
        const gelen = temizle(veri);
        for (const ad of LISTELER) {
          const once = ayar[ad].length;
          ayar[ad] = tekillestir(ayar[ad].concat(gelen[ad]));
          eklenen += ayar[ad].length - once;
        }
      } else {
        const satirlar = Array.isArray(veri) ? veri.filter((x) => typeof x === 'string') : girdiyiBol(metin, seciliSekme);
        const once = ayar[seciliSekme].length;
        ayar[seciliSekme] = tekillestir(ayar[seciliSekme].concat(satirlar));
        eklenen = ayar[seciliSekme].length - once;
      }
      kaydet();
      bildir('İçe aktarıldı: ' + eklenen + ' yeni ifade.');
    });
  }

  let bildirimZamani = null;
  function bildir(metin, eylemAdi, eylem, sure) {
    if (!ui) return;
    const parcalar = [el('span', { textContent: metin })];
    if (eylemAdi) {
      parcalar.push(
        el('button', {
          type: 'button',
          textContent: eylemAdi,
          onclick: () => {
            ui.bildirim.classList.remove('acik');
            eylem();
          },
        })
      );
    }
    ui.bildirim.replaceChildren(...parcalar);
    ui.bildirim.classList.add('acik');
    clearTimeout(bildirimZamani);
    bildirimZamani = setTimeout(() => ui.bildirim.classList.remove('acik'), sure || (eylemAdi ? 6000 : 3000));
  }

  // =====================================================================
  // 6. Başlat
  // =====================================================================

  arayuzKur();
  eskiListeyiTasi();
  kurallariYenile();
  uygula();

  for (const tur of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup']) {
    document.addEventListener(tur, aracTiklama, true);
  }

  // Sayfa içeriği AJAX ile değişince (filtre, sonsuz kaydırma, yerinde güncellenen başlık) yeniden uygula.
  // Kendi işaretlerimiz (class) ve araç çubuğumuz tetiklemez.
  let bekleyen = null;
  const bizim = (n) => n.nodeType === 1 && (n.classList.contains('ipf-arac') || n === ui.konak);
  new MutationObserver((kayitlar) => {
    const ilgili = kayitlar.some((k) => {
      const hedef = k.target.nodeType === 1 ? k.target : k.target.parentElement;
      if (hedef && hedef.closest('.ipf-arac')) return false;
      if (k.type === 'characterData') return true;
      return Array.from(k.addedNodes).some((n) => !bizim(n)) || Array.from(k.removedNodes).some((n) => !bizim(n));
    });
    if (!ilgili) return;
    clearTimeout(bekleyen);
    bekleyen = setTimeout(uygula, 200);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  // Başka sekmede liste değişirse bu sekmeyi de güncelle.
  if (typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener(ANAHTAR, (_ad, _eski, yeni, uzaktan) => {
      if (!uzaktan) return;
      ayar = temizle(yeni);
      kurallariYenile();
      uygula();
      panelCiz();
    });
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Paneli aç/kapat', () => panelAcKapa());
    GM_registerMenuCommand('Filtreyi aç/kapat', () => {
      ayar.aktif = !ayar.aktif;
      kaydet();
    });
  }
})();
