// K5 TATBİKATI — "mock kapatılınca ekran çalışır mı?" (MOCK-SÖZ, MOGEM-560)
//
// NEDEN VAR:
//   Sözleşmenin doğruluğunu birim testi kanıtlamaz. Gerçek sınav şudur:
//   `MOCK.<uç> = false` yapıldığında backend'in SÖZLEŞMEYE GÖRE döndüreceği
//   yük, mock'un bugün döndürdüğüyle aynı ŞEKLE sahip mi? Değilse ekran uç
//   yazıldığı gün bozulur — ve bunu kimse fark etmez, çünkü mock'lu testler
//   yeşil kalır.
//
//   Tatbikat yazılırken iki gerçek kusur buldu:
//     · `get_pod_queue` sözleşmede `items[]` diyordu, mock ve ekran `rows`
//       kullanıyor → uç yazılsa POD kuyruğu BOŞ görünürdü
//     · mock `rows[].delivered_package_count` / `total_package_count` üretiyor
//       ve `PodQueueView` bunları 6 yerde okuyor, sözleşmede yoklardı →
//       kısmi teslim göstergesi boşalırdı
//
// NE DEĞİL:
//   Gerçek HTTP çağrısı değil. Uç henüz yazılmadı; sınanan şey sözleşme ile
//   mock'un ŞEKİL uyumu — yani "backend sözleşmeyi uygularsa ekran beslenir mi".

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE = src/api/__tests__ → beş seviye yukarısı repo kökünün komşusu.
const SEMA = join(HERE, "../../../../../tradehub_core/docs/logistics-api.schema.json");

/** Sözleşmedeki `rows[].x` / `buckets[].y` yollarını ağaca çevirir. */
function sozlesmeSekli(fields) {
  const kok = new Set();
  const dizi = {};
  for (const yol of fields) {
    const [bas, ...kalan] = yol.split(/\[\]\.?|\./);
    kok.add(bas);
    if (kalan.length && kalan[0]) (dizi[bas] ??= new Set()).add(kalan[0]);
  }
  return { kok, dizi };
}

test("K5 · mock'un ürettiği şekil sözleşmeyle örtüşüyor", async () => {
  if (!existsSync(SEMA)) {
    console.warn("  ⚠ kardeş repo yok, K5 tatbikatı ATLANDI");
    return;
  }
  const sema = JSON.parse(readFileSync(SEMA, "utf8"));

  // Mock fonksiyonu → sözleşmedeki uç. Yalnız ÇAĞRILABİLİR olanlar; yazma
  // uçları yan etki bıraktığı için tatbikata girmiyor.
  const { podMock } = await import("../podMock.js");
  const DENEKLER = [
    {
      modul: "pod",
      uc: "get_pod_queue",
      cagir: () => podMock.getPodQueue({}),
      // Mock ÜRETİYOR ama sözleşmede yok VE ekran okumuyor — 14-FE §2.1
      // yükünde de geçmiyorlar. Sözleşmeye eklemek, backend'e kimsenin
      // kullanmadığı alanı yazdırmak olurdu; mock'tan silmek de bu görevin
      // işi değil (14-FE'nin mock'u). Fazlalık olarak kayda geçiyor.
      mockFazlaligi: ["exception_code", "pod_source"],
    },
  ];

  for (const { modul, uc, cagir, mockFazlaligi = [] } of DENEKLER) {
    const tanim = sema.endpoints[modul].endpoints.find((e) => e.name === uc);
    assert.ok(tanim, `${modul}.${uc} sözleşmede yok`);

    const yuk = await cagir();
    const { kok, dizi } = sozlesmeSekli(tanim.returns.fields ?? []);

    // 1. Sözleşmenin vaat ettiği her üst düzey anahtar mock'ta VAR MI?
    //    Yoksa: backend onu döndürecek ama ekran hiç beklemiyor demektir.
    const eksik = [...kok].filter((k) => !(k in yuk));
    assert.deepEqual(
      eksik,
      [],
      `${uc}: sözleşme bu anahtarları vaat ediyor, mock üretmiyor — ` +
        `ekran uç yazılınca bunları görmezden gelir`
    );

    // 2. Mock'un ürettiği her dizi elemanı alanı sözleşmede VAR MI?
    //    Yoksa: ekran bugün çalışıyor ama uç yazıldığı gün o alan kaybolur.
    for (const [ad, alanlar] of Object.entries(dizi)) {
      const ornek = Array.isArray(yuk[ad]) ? yuk[ad][0] : null;
      if (!ornek) continue;
      const sozlesmesiz = Object.keys(ornek).filter(
        (k) => !alanlar.has(k) && !mockFazlaligi.includes(k)
      );
      assert.deepEqual(
        sozlesmesiz,
        [],
        `${uc}.${ad}[]: mock bu alanları üretiyor ama sözleşmede yok — ` +
          `uç yazıldığı gün ekrandan kaybolurlar`
      );
    }

    // Fazlalık listesi BAYATLAMAZ: alan sözleşmeye girdiği ya da mock'tan
    // çıktığı gün burası kırmızı olur ve liste güncellenmek zorunda kalır.
    const ornekSatir = Object.entries(dizi)
      .map(([ad]) => (Array.isArray(yuk[ad]) ? yuk[ad][0] : null))
      .find(Boolean);
    if (ornekSatir) {
      const gereksiz = mockFazlaligi.filter(
        (k) => !(k in ornekSatir) || [...Object.values(dizi)].some((s) => s.has(k))
      );
      assert.deepEqual(
        gereksiz,
        [],
        `${uc}: bu alanlar artık fazlalık değil — listeden düş`
      );
    }
  }
});
