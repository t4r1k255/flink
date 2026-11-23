// Çalıştırma: node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const f = require(path.join(__dirname, '..', 'is-portali-filtresi.user.js'));

const AYAR = { sponsorluGizle: false };
function kural(o) {
  return {
    pozisyon: f.kurallariDerle(o.pozisyon),
    istisna: f.kurallariDerle(o.istisna),
    sirket: f.kurallariDerle(o.sirket),
    konum: f.kurallariDerle(o.konum),
  };
}
const ilan = (baslik, sirket = '', konum = '', sponsorlu = false) => ({ baslik, sirket, konum, sponsorlu });

test('sadelestir: Türkçe harfler ve büyük harf', () => {
  assert.equal(f.sadelestir('SATIŞ DANIŞMANI'), ' satis danismani ');
  assert.equal(f.sadelestir('İstanbul(Avr.)'), ' istanbul avr ');
  assert.equal(f.sadelestir('SOFTWARE ENGINEER'), ' software engineer ');
  assert.equal(f.sadelestir('Gİ GROUP'), ' gi group ');
  assert.equal(f.sadelestir('C# / C++ Developer'), ' c# c++ developer ');
  assert.equal(f.sadelestir(null), '  ');
});

test('büyük harfli başlık küçük harfli ifadeyle eşleşir (eski sürümde I/ı hatası)', () => {
  const k = kural({ pozisyon: ['engineer'] });
  assert.equal(f.karar(ilan('SOFTWARE ENGINEER'), k, AYAR), 'Pozisyon: engineer');
});

test('Türkçe karaktersiz yazılan ifade de eşleşir', () => {
  const k = kural({ pozisyon: ['satis danismani'] });
  assert.ok(f.karar(ilan('Kıdemli Satış Danışmanı'), k, AYAR));
});

test('kelime başı eşleşme: ek alabilir, kelime ortası eşleşmez', () => {
  const k = kural({ pozisyon: ['mühendis', 'garson'] });
  assert.ok(f.karar(ilan('Yazılım Mühendisi'), k, AYAR));
  assert.ok(f.karar(ilan('Garson - Servis Elemanı'), k, AYAR));
  assert.equal(f.karar(ilan('Agarsonlar Kulübü Müdürü'), k, AYAR), null);
});

test('README örneği: "Satış Danışmanı" Satış Temsilcisi ile eşleşmez', () => {
  const k = kural({ pozisyon: ['Satış Danışmanı'] });
  assert.ok(f.karar(ilan('Mağaza Satış Danışmanı'), k, AYAR));
  assert.equal(f.karar(ilan('Satış Temsilcisi'), k, AYAR), null);
});

test('tırnaklı ifade yalnız tam kelime', () => {
  const k = kural({ pozisyon: ['"satış"'] });
  assert.ok(f.karar(ilan('Satış Elemanı'), k, AYAR));
  assert.equal(f.karar(ilan('Satışçı'), k, AYAR), null);
});

test('istisna pozisyon kuralını iptal eder', () => {
  const k = kural({ pozisyon: ['satış'], istisna: ['satış mühendisi'] });
  assert.ok(f.karar(ilan('Saha Satış Danışmanı'), k, AYAR));
  assert.equal(f.karar(ilan('Satış Mühendisi'), k, AYAR), null);
});

test('istisna şirket kuralını iptal etmez', () => {
  const k = kural({ sirket: ['Gİ GROUP'], istisna: ['mühendis'] });
  assert.equal(f.karar(ilan('Mekanik Mühendis', 'Gİ GROUP'), k, AYAR), 'Şirket: Gİ GROUP');
});

test('pozisyon kuralı şirket/konum metnine bakmaz (eski sürüm bakıyordu)', () => {
  const k = kural({ pozisyon: ['kadıköy', 'migros'] });
  assert.equal(f.karar(ilan('Kasiyer', 'Migros', 'İstanbul Anadolu - Kadıköy'), k, AYAR), null);
});

test('konum kuralı', () => {
  const k = kural({ konum: ['istanbul anadolu'] });
  assert.equal(f.karar(ilan('Kasiyer', 'X', 'İstanbul Anadolu - Kadıköy'), k, AYAR), 'Konum: istanbul anadolu');
  assert.equal(f.karar(ilan('Kasiyer', 'X', 'İstanbul Avrupa - Beşiktaş'), k, AYAR), null);
});

test('sponsorlu yalnız seçenek açıkken gizlenir', () => {
  const k = kural({});
  assert.equal(f.karar(ilan('A', 'B', 'C', true), k, AYAR), null);
  assert.equal(f.karar(ilan('A', 'B', 'C', true), k, { sponsorluGizle: true }), 'Sponsorlu ilan');
});

test('boş liste hiçbir şeyi gizlemez', () => {
  assert.equal(f.karar(ilan('Her Şey'), kural({}), AYAR), null);
});

test('kuralDerle: boş ve yalnız noktalama ifadeleri yok sayılır', () => {
  assert.equal(f.kuralDerle(''), null);
  assert.equal(f.kuralDerle('  - / '), null);
  assert.equal(f.kuralDerle('""'), null);
});

test('temizle: bozuk veri, tekrarlar ve tür hataları', () => {
  const a = f.temizle({ pozisyon: ['Kasiyer', 'KASİYER', ' kasiyer ', 5, null, ''], sirket: 'x', aktif: 0 });
  assert.deepEqual(a.pozisyon, ['Kasiyer']);
  assert.deepEqual(a.sirket, []);
  assert.equal(a.aktif, true);
  assert.equal(a.soluk, false);
  assert.deepEqual(f.temizle(null).konum, []);
  assert.deepEqual(f.temizle('çöp').istisna, []);
});

test('girdiyiBol: şirkette virgül bölmez', () => {
  assert.deepEqual(f.girdiyiBol('a\nb, c\n\n', 'pozisyon'), ['a', 'b', 'c']);
  assert.deepEqual(f.girdiyiBol('ABC Gıda, Tekstil A.Ş.\nXYZ', 'sirket'), ['ABC Gıda, Tekstil A.Ş.', 'XYZ']);
});

test('brParcala: <br> ile ayrılmış şirket ve konum', () => {
  const metin = (t) => ({ nodeName: '#text', textContent: t });
  const br = { nodeName: 'BR', textContent: '' };
  const icon = { nodeName: 'I', textContent: '' };
  const el = { childNodes: [icon, metin(' Gİ GROUP '), br, icon, metin('  İstanbul Anadolu - Kadıköy')] };
  assert.deepEqual(f.brParcala(el), ['Gİ GROUP', 'İstanbul Anadolu - Kadıköy']);
  assert.deepEqual(f.brParcala(null), []);
});
