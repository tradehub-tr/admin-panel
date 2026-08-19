// PANEL STİL DİLİ KİLİDİ — lojistik ekranları tek estetik konuşur.
//
// NEDEN BU TEST VAR:
//   Panel iki stil ailesi biriktirdi: eski `th-btn-*` + `slate-*` ve panelin
//   standardı `hdr-btn-*` + `card`/`form-*`/`tbl-*` + `gray-*`. İki geliştirici
//   birbirinden habersiz iki dilde ekran yazınca kullanıcı "lojistik panelden
//   farklı görünüyor" diye geri geldi (2026-08-18) ve 8 canlı ekran elle
//   çevrildi. Kural yalnız belgede (scss.md §8) dursaydı ilk acelede yine
//   aşılırdı — burada makine okur biçimde duruyor.
//
// SÖZLEŞME:
//   * YENİ dosya eski dilde yazılamaz — anında kırmızı.
//   * ESKİ dosyalar aşağıdaki LEGACY listesinde bekler; ÇEVİRDİĞİN dosyanın
//     satırını listeden SİL (silmezsen "listeden düşür" hatası alırsın —
//     liste bayatlayamaz). Liste boşaldığında bu test sıfır toleranstır.
//   * Herkes yalnız KENDİ çevirdiği dosyanın satırını siler (append-only
//     kuralının tersi ama aynı ruh: başkasının satırına dokunma).
//
// Dönüşüm tablosu ve referans ekranlar: docs/LOGISTICS-FE-SKELETON.md +
// CatalogListScreen/CatalogFormScreen (çevrilmiş kanonik örnekler).

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Taranan kökler — lojistiğin yaşadığı iki ağaç. */
const ROOTS = ["views/logistics", "components/logistics"];

/**
 * Yasak desenler.
 *
 * `slate-` için negatif geri-bakış ŞART: `-translate-y-1/2` gibi utility'ler
 * "slate-" alt dizisini içeriyor ve düz arama yanlış pozitif veriyordu
 * (önceki turlarda grep -v translate ile elleniyordu).
 */
const FORBIDDEN = [
  { name: "th-btn-*", pattern: /th-btn-/ },
  { name: "slate-*", pattern: /(?<![a-zA-Z])slate-/ },
];

/**
 * ESKİ DİLDE BEKLEYEN DOSYALAR (2026-08-18 envanteri, 41 dosya).
 *
 * 29'u Faz D'nin `ready:false` ekranları (açılırken çevrilecekler),
 * 12'si 13-FE paketleme/etiket paketi (Ali — koordine edildi).
 * ÇEVİRDİĞİN DOSYANIN SATIRINI SİL.
 */
const LEGACY = new Set([
  "components/logistics/BulkResultSummary.vue",
  "components/logistics/ConnectionTestScreen.vue",
  "components/logistics/CostReportScreen.vue",
  "components/logistics/CsvImportScreen.vue",
  "components/logistics/EventTimeline.vue",
  "components/logistics/IntegrationLogScreen.vue",
  "components/logistics/LegOperationScreen.vue",
  "components/logistics/LegTimelineScreen.vue",
  "components/logistics/NotificationPreferenceScreen.vue",
  "components/logistics/NotificationTemplateScreen.vue",
  "components/logistics/OperationAlertScreen.vue",
  "components/logistics/PerformanceReportScreen.vue",
  "components/logistics/PriceSimulationScreen.vue",
  "components/logistics/PricingRuleScreen.vue",
  "components/logistics/ReportCenterScreen.vue",
  "components/logistics/ReturnClosureScreen.vue",
  "components/logistics/ReturnDecisionScreen.vue",
  "components/logistics/ReturnInspectionScreen.vue",
  "components/logistics/ReturnQueueScreen.vue",
  "components/logistics/ShippingRateScreen.vue",
  "components/logistics/SplitShipmentScreen.vue",
  "views/logistics/labels/LabelPrintView.vue",
  "views/logistics/labels/components/LabelPreview.vue",
  "views/logistics/labels/components/ReprintReasonDialog.vue",
  "views/logistics/packages/PackingQueueView.vue",
  "views/logistics/packages/PackingWorkspaceView.vue",
  "views/logistics/packages/PalletPlanView.vue",
  "views/logistics/packages/components/ItemPickList.vue",
  "views/logistics/packages/components/MockDevPanel.vue",
  "views/logistics/packages/components/PackageCard.vue",
  "views/logistics/packages/components/PackageEditorDrawer.vue",
  "views/logistics/packages/components/PackingSummaryPanel.vue",
  "views/logistics/packages/components/ScanInput.vue",
]);

function vueFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return vueFilesUnder(full);
    return entry.name.endsWith(".vue") && !entry.name.endsWith(".stories.vue") ? [full] : [];
  });
}

/**
 * Yorumlar denetim DIŞI: "eskiden bg-white dark:bg-slate-800 yazınca şöyle
 * kırılıyordu" gibi GEREKÇE anlatan yorumlar yasak deseni sözcük olarak
 * geçirebiliyor (PopMenu.vue'da yaşandı, 2026-08-18). Kilit sınıf ATTRIBUTE'ını
 * kilitliyor, tarihçe anlatımını değil. `//` için `:` geri-bakışı `https://`
 * URL'lerini satır yorumu sanmayı önlüyor.
 */
function stripComments(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(?<!:)\/\/[^\n]*/g, "");
}

function violationsIn(source) {
  const code = stripComments(source);
  return FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ name }) => name);
}

test("YENİ lojistik dosyası eski stil dilinde yazılamaz", () => {
  for (const root of ROOTS) {
    for (const file of vueFilesUnder(join(SRC_DIR, root))) {
      const rel = relative(SRC_DIR, file);
      if (LEGACY.has(rel)) continue;
      const found = violationsIn(readFileSync(file, "utf8"));
      assert.equal(
        found.length,
        0,
        `${rel}: eski stil dili (${found.join(", ")}) — panel standardı hdr-btn-*/card/form-*/tbl-*/gray-*. ` +
          `Dönüşüm tablosu: docs/LOGISTICS-FE-SKELETON.md; kanonik örnek: CatalogListScreen.vue`
      );
    }
  }
});

test("temizlenen dosya LEGACY listesinden düşürülmüş", () => {
  // Liste tek yönlü erimeli: dosya temizlendiyse satırı silinir, silinmezse
  // burada kırmızı olur — böylece liste hiçbir zaman gerçeğin gerisine düşmez
  // ve boşaldığında sıfır tolerans kendiliğinden devreye girer.
  for (const rel of LEGACY) {
    const source = readFileSync(join(SRC_DIR, rel), "utf8"); // dosya yoksa da kırmızı: satırı sil
    assert.ok(
      violationsIn(source).length > 0,
      `${rel} artık temiz — LEGACY listesinden satırını sil (sıfır tolerans yaklaşsın)`
    );
  }
});
