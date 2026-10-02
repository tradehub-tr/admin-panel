// Lojistik mock kapısı — MOGEM-685 F-03.
//
// Ürün kararı: Alpha/Beta/RC'de sahte veri OLABİLİR, PROD'da HİÇ olmamalı.
// "Canlıda açılmaz" iddiası yorum satırıyla korunamaz; burada üç şey sınanıyor:
//   1. sunucu adı kapısı gerçek alan adlarıyla,
//   2. her mock dalının İKİ kapıyı da taşıdığı (kaynaktan — derleyici yalnız
//      `__LOJISTIK_MOCK__` yazılan dalı atabiliyor, bkz. kapının başlığı),
//   3. derleme anında okunan MOCK haritalarının gerçek haritalarla aynı olduğu.
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { mockHaritalari, bekleyenModuller } from "../../../scripts/lojistik-mock-haritasi.mjs";
import { mockBekliyor, mockCalisiyor, onizlemeSunucusuMu } from "../logisticsMockGate.js";

const API_DIZINI = fileURLToPath(new URL("..", import.meta.url));

/** Global'i geçici olarak değiştirip geri alır — testler birbirini kirletmesin. */
function globalIle(ad, deger, fn) {
  const vardi = Object.prototype.hasOwnProperty.call(globalThis, ad);
  const eski = globalThis[ad];
  globalThis[ad] = deger;
  try {
    return fn();
  } finally {
    if (vardi) globalThis[ad] = eski;
    else delete globalThis[ad];
  }
}

// ── 1. Sunucu adı kapısı ───────────────────────────────────────────────

test("önizleme sunucuları: yerel, Alpha, Beta, RC", () => {
  for (const host of [
    "localhost",
    "127.0.0.1",
    "::1",
    "[::1]",
    "tradehub.localhost",
    "panel.local",
    "alpha.istoc.com",
    "beta.istoc.com",
    "rc.istoc.com",
    "ALPHA.ISTOC.COM",
  ]) {
    assert.equal(onizlemeSunucusuMu(host), true, host);
  }
});

test("PROD ve backend adresleri önizleme DEĞİL", () => {
  // Ön yüz: istoc.com (PROD). Backend: *.cronbi.com
  // (kök CLAUDE.md §2 — parantez içindekiler backend siteleri).
  for (const host of [
    "istoc.com",
    "www.istoc.com",
    "rcistoc.cronbi.com",
    "istoc.cronbi.com",
    "betaistoc.cronbi.com",
    "",
    undefined,
  ]) {
    assert.equal(onizlemeSunucusuMu(host), false, String(host));
  }
});

test("beyaz listeye önek/sonek eklenmiş sahte adlar önizleme DEĞİL", () => {
  // Tam eşleşme ve nokta ile başlayan son ek: `evil-localhost.com` ya da
  // `alpha.istoc.com.evil.com` listeye takılmamalı.
  for (const host of [
    "alpha.istoc.com.evil.com",
    "evilalpha.istoc.com",
    "beta.istoc.com.evil.com",
    "rc.istoc.com.evil.com",
    "xrc.istoc.com",
    "evil-localhost.com",
    "localhost.evil.com",
    "notlocalhost",
    "local",
  ]) {
    assert.equal(onizlemeSunucusuMu(host), false, host);
  }
});

test("mockCalisiyor: window yoksa (node --test) açık, tarayıcıda sunucu adına bağlı", () => {
  globalIle("window", undefined, () => assert.equal(mockCalisiyor(), true));
  globalIle("window", { location: { hostname: "rc.istoc.com" } }, () =>
    assert.equal(mockCalisiyor(), true)
  );
  globalIle("window", { location: { hostname: "istoc.com" } }, () =>
    assert.equal(mockCalisiyor(), false)
  );
  globalIle("window", { location: { hostname: "beta.istoc.com" } }, () =>
    assert.equal(mockCalisiyor(), true)
  );
});

// ── 2. Her mock dalı iki kapıyı taşıyor ────────────────────────────────

/** Yorumları at: satır sonu yorumu ve blok yorum — belge metnindeki `MOCK.x` sayılmasın. */
const yorumsuz = (kaynak) => kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const HARITALI = readdirSync(API_DIZINI)
  .filter((ad) => ad.endsWith(".js"))
  .filter((ad) => readFileSync(join(API_DIZINI, ad), "utf8").includes("export const MOCK = {"));

test("MOCK haritası taşıyan api dosyaları bulunuyor (tarama boş değil)", () => {
  // Boş tarama aşağıdaki testleri sessizce yeşil bırakırdı.
  assert.ok(HARITALI.length >= 10, `yalnız ${HARITALI.length} dosya bulundu`);
});

for (const ad of HARITALI) {
  test(`${ad}: her MOCK dalı __LOJISTIK_MOCK__ && mockCalisiyor() ile başlıyor`, () => {
    const kod = yorumsuz(readFileSync(join(API_DIZINI, ad), "utf8"));
    const harita = mockHaritalari(API_DIZINI)[ad.replace(/\.js$/, "")];

    // `MOCK.<uç>` okunan her yer (harita tanımı hariç).
    const okumalar = [...kod.matchAll(/(.{0,60})\bMOCK\.(\w+)/g)];
    assert.ok(okumalar.length > 0, "hiç MOCK okuması yok");
    for (const [, once, uc] of okumalar) {
      assert.ok(uc in harita, `MOCK.${uc} haritada yok`);
      assert.match(
        once,
        /__LOJISTIK_MOCK__ && mockCalisiyor\(\) && $/,
        `MOCK.${uc} iki kapısız okunuyor — derleyici bu dalı PROD'dan atamaz: "${once}MOCK.${uc}"`
      );
    }
    // Haritadaki her uç en az bir dalda kullanılıyor (bayat satır yok).
    const kullanilan = new Set(okumalar.map((m) => m[2]));
    for (const uc of Object.keys(harita)) assert.ok(kullanilan.has(uc), `MOCK.${uc} hiç okunmuyor`);

    // `USE_MOCK` varsa o da iki kapılı.
    const useMock = /export const USE_MOCK =([^;]+);/.exec(kod);
    if (useMock) assert.match(useMock[1], /^\s*__LOJISTIK_MOCK__ && mockCalisiyor\(\) && /);
  });
}

// ── 3. Derleme anında okunan haritalar ──────────────────────────────────

test("kaynaktan okunan haritalar, aynı literalin JS değerlendirmesiyle birebir aynı", () => {
  // Okuyucu satır satır ayrıştırıyor. Gerçek modülleri içe aktarıp karşılaştırmak
  // mümkün değil (ölçüldü: 10 modülün hiçbiri Node'dan yüklenmiyor — alias'lı ve
  // uzantısız içe aktarım). Onun yerine aynı nesne literalini JS'e değerlendirtip
  // karşılaştırıyoruz: ayrıştırıcı bir satırı kaçırır ya da yanlış okursa kırmızı.
  const okunan = mockHaritalari(API_DIZINI);
  for (const ad of HARITALI) {
    const kaynak = readFileSync(join(API_DIZINI, ad), "utf8");
    const bas = kaynak.indexOf("export const MOCK = {") + "export const MOCK = ".length;
    const literal = kaynak.slice(bas, kaynak.indexOf("\n};", bas) + 2);
    const gercek = new Function(`return (${literal});`)();
    assert.deepEqual(okunan[ad.replace(/\.js$/, "")], gercek, ad);
  }
});

test("okunan her harita kaynaktaki anahtar sayısıyla aynı", () => {
  const okunan = mockHaritalari(API_DIZINI);
  for (const ad of HARITALI) {
    const kaynak = readFileSync(join(API_DIZINI, ad), "utf8");
    const blok = kaynak.slice(kaynak.indexOf("export const MOCK = {"));
    const anahtar = [...yorumsuz(blok.slice(0, blok.indexOf("\n};"))).matchAll(/^\s{2}(\w+):/gm)];
    assert.equal(Object.keys(okunan[ad.replace(/\.js$/, "")]).length, anahtar.length, ad);
  }
});

test("literal olmayan MOCK değeri derlemeyi DURDURUR", () => {
  // Sessizce "bekleyen yok" demek, ucu yazılmamış ekranları PROD'da açardı.
  const dizin = mkdtempSync(join(tmpdir(), "lojistik-mock-"));
  writeFileSync(
    join(dizin, "ornek.js"),
    "export const MOCK = {\n  a: true,\n  b: import.meta.env.X === '1',\n};\n"
  );
  assert.throws(() => mockHaritalari(dizin), /true\/false literali değil/);
});

test("bekleyen modül: en az bir ucu true olan; hepsi false olan bekleyen DEĞİL", () => {
  const dizin = mkdtempSync(join(tmpdir(), "lojistik-mock-"));
  writeFileSync(join(dizin, "acik.js"), "export const MOCK = {\n  a: false,\n  b: true,\n};\n");
  writeFileSync(join(dizin, "bitti.js"), "export const MOCK = {\n  a: false, // uç yazıldı\n};\n");
  writeFileSync(join(dizin, "haritasiz.js"), "export const X = 1;\n");
  assert.deepEqual(bekleyenModuller(dizin), ["acik"]);
});

test("mockBekliyor: mock çalışıyorsa hiçbir şey gizlenmez; çalışmıyorsa bekleyen gizlenir", () => {
  globalIle("__LOJISTIK_MOCK_BEKLEYEN__", ["pod"], () => {
    globalIle("__LOJISTIK_MOCK__", true, () => {
      assert.equal(mockBekliyor(["pod"]), false, "önizlemede ekran açık");
    });
    globalIle("__LOJISTIK_MOCK__", false, () => {
      assert.equal(mockBekliyor(["pod"]), true, "PROD'da mock bekleyen ekran gizli");
      assert.equal(mockBekliyor(["returns"]), false, "ucu yazılmış modül gizlenmez");
      assert.equal(mockBekliyor([]), false);
      assert.equal(mockBekliyor(undefined), false);
    });
    // Anahtar açık ama sunucu PROD: yine gizli (ikinci kapı).
    globalIle("__LOJISTIK_MOCK__", true, () =>
      globalIle("window", { location: { hostname: "istoc.com" } }, () =>
        assert.equal(mockBekliyor(["pod"]), true)
      )
    );
  });
});
