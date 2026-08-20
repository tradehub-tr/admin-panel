// Geçiş haritasının Python otoritesiyle aynı kaldığını zorlar.
//
// `shipmentTransitions.js` bilinçli bir kopya (gerekçesi o dosyada). Kopyanın
// tek gerçek riski SESSİZ KAYMA: backend'de bir geçiş açılır/kapanır, panel
// eski haritayla çizmeye devam eder ve kullanıcıya reddedilecek bir seçenek
// sunar — ya da geçerli bir seçeneği gizler. Bu test o kaymayı gürültülü
// hâle getiriyor.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ALLOWED_TRANSITIONS, SELLER_ALLOWED_TRANSITIONS } from "../shipmentTransitions.js";

// __tests__ → logistics → components → src → frontend → admin-panel → kök
const PY_SOURCE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../../tradehub_core/tradehub_core/logistics/constants.py"
);

/**
 * `constants.py`'den haritayı çıkarır.
 *
 * Python'u çalıştırmıyoruz — test koşucusunun bench/Frappe ortamına ihtiyacı
 * olmasın diye kaynak metin okunuyor. `ShipmentStatus.X` referansları önce
 * enum'un kendi `X = "değer"` satırlarından çözülüyor; yani karşılaştırma
 * sabit adlarla değil GERÇEK DEĞERLERLE yapılıyor.
 */
function parsePythonTransitions(source, mapName = "ALLOWED_TRANSITIONS") {
  const enumValues = {};
  for (const [, key, value] of source.matchAll(/^\t([A-Z_]+)\s*=\s*"([^"]+)"/gm)) {
    enumValues[key] = value;
  }

  // `^` çapası ŞART: "ALLOWED_TRANSITIONS" araması "SELLER_ALLOWED_..."
  // adının içine de düşer; tanım her zaman satır başında.
  const block = source.match(new RegExp(`^${mapName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  assert.ok(block, `${mapName} bloğu bulunamadı — constants.py biçimi değişmiş`);

  const parsed = {};
  for (const [, sourceKey, body] of block[1].matchAll(
    /ShipmentStatus\.([A-Z_]+):\s*\{([^}]*)\}/g
  )) {
    const from = enumValues[sourceKey];
    assert.ok(from, `ShipmentStatus.${sourceKey} enum'da yok`);
    parsed[from] = [...body.matchAll(/ShipmentStatus\.([A-Z_]+)/g)]
      .map(([, key]) => {
        assert.ok(enumValues[key], `ShipmentStatus.${key} enum'da yok`);
        return enumValues[key];
      })
      .sort();
  }
  return parsed;
}

test("geçiş haritası constants.py ile birebir aynı", (t) => {
  if (!existsSync(PY_SOURCE)) {
    // NEREDE KOŞUYOR: iki repo yan yana duran geliştirici makinesinde.
    // `lint.yml` YALNIZ admin-panel'i checkout ediyor, yani CI'da bu test
    // ATLANIR — bekçi olarak lokal koşuya bağlı. Zayıf tarafı bu; kalıcı
    // çözüm haritayı `gen_logistics_types.py` ile üretip `--check` kapısına
    // bağlamak (YOL-HARITASI §6.1'de kayıtlı).
    t.skip("tradehub_core kaynağı yok — bu makinede tek repo var");
    return;
  }

  const fromPython = parsePythonTransitions(readFileSync(PY_SOURCE, "utf8"));
  assert.ok(Object.keys(fromPython).length > 0, "Python'dan hiç geçiş çıkarılamadı");

  const fromJs = Object.fromEntries(
    Object.entries(ALLOWED_TRANSITIONS).map(([from, targets]) => [from, [...targets].sort()])
  );

  assert.deepEqual(
    fromJs,
    fromPython,
    "JS kopyası constants.py ile ayrışmış — biri güncellenmiş, diğeri değil"
  );
});

test("satıcı geçiş haritası constants.py ile birebir aynı", (t) => {
  if (!existsSync(PY_SOURCE)) {
    t.skip("tradehub_core kaynağı yok — bu makinede tek repo var");
    return;
  }

  const fromPython = parsePythonTransitions(
    readFileSync(PY_SOURCE, "utf8"),
    "SELLER_ALLOWED_TRANSITIONS"
  );
  const fromJs = Object.fromEntries(
    Object.entries(SELLER_ALLOWED_TRANSITIONS).map(([from, targets]) => [from, [...targets].sort()])
  );

  assert.deepEqual(fromJs, fromPython, "satıcı kopyası constants.py ile ayrışmış");
});

test("satıcı haritası genel haritanın alt kümesi", () => {
  // Satıcıya genel motorun reddedeceği bir geçiş sunmak, butonu backend
  // hatasıyla sonuçlandırır (backend'deki test_seller_subset_of_allowed eşi).
  for (const [from, targets] of Object.entries(SELLER_ALLOWED_TRANSITIONS)) {
    for (const to of targets) {
      assert.ok(
        (ALLOWED_TRANSITIONS[from] ?? []).includes(to),
        `satıcıya açık ama genel haritada yok: ${from} -> ${to}`
      );
    }
  }
});

test("terminal durumlardan ileri geçiş tanımlı değil", () => {
  // Delivered / Returned / Cancelled haritada KAYNAK olarak bulunmamalı;
  // bulunursa arayüz terminal bir sevkiyata "durum güncelle" sunar.
  for (const terminal of ["Delivered", "Returned", "Cancelled"]) {
    assert.equal(
      ALLOWED_TRANSITIONS[terminal],
      undefined,
      `${terminal} terminal ama ileri geçişi var`
    );
  }
});
