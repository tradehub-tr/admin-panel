import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import tr from "../../../../i18n/locales/tr.js";
import { ALL_REGIONS, DEVICES } from "../../../../lib/media/simulator/index.js";

/**
 * T-114 — onay kapısı ve `previewed_placements` kaydı.
 *
 *   ÖLÇÜLDÜ  — kapının kapalı başlaması, hangi engelin kapıyı kapalı
 *              tuttuğu, uyarı kabulü olmadan açılmaması, kaydın şekli,
 *              `overrides` yoluna bağlanmayı reddetmesi, mevcut niyet
 *              alanlarını korumak zorunda oluşu, `IntersectionObserver`
 *              yokluğunda kendiliğinden AÇILMAMASI.
 *   ÖLÇÜLMEDİ — gerçek tarayıcıda %50/1 sn eşiğinin tutması, sunucunun
 *              eksik kayıtla gelen yayımı reddetmesi (öyle bir uç YOK),
 *              denetim kaydının gerçekten yazılması.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));

const GATE = "/src/components/media/simulator/SimApprovalGate.vue";
const COMPOSABLE = "/src/composables/useSimulatorApproval.js";

let server;
let mod;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  mod = await server.ssrLoadModule(COMPOSABLE);
});

after(async () => {
  await server?.close();
});

const i18n = () =>
  createI18n({
    legacy: false,
    locale: "tr",
    fallbackLocale: "tr",
    missingWarn: false,
    fallbackWarn: false,
    messages: { tr },
  });

async function render(path, props) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n());
  return renderToString(app);
}

/** Kapıyı sonuna kadar açar: her gerekliliği işaretler, her uyarıyı kabul eder. */
function openGate(gate) {
  for (const req of gate.requirements.value) gate.markSeen(req.region, req.devices[0], 1200);
  for (const w of gate.warningCodes.value) gate.acknowledge(w.code);
}

// ── 1. Kapı KAPALI başlar ─────────────────────────────────────────

test("hiçbir yerleşim görülmeden kapı kapalı ve sebebi adlandırılmış", () => {
  const gate = mod.useSimulatorApproval();
  assert.equal(gate.canPublish.value, false);
  const codes = gate.blockers.value.map((b) => b.code);
  assert.ok(codes.includes(mod.BLOCK_MISSING_PLACEMENT), "eksik yerleşim engeli yok");
});

test("zorunlu yerleşimler LCP adaylarından türer, ikinci liste tutulmaz", () => {
  const gate = mod.useSimulatorApproval();
  const beklenen = ALL_REGIONS.filter((r) => r.lcpCandidate).map((r) => r.key);
  assert.deepEqual(
    gate.requiredRegions.value.map((r) => r.key),
    beklenen
  );
  assert.deepEqual(gate.deviceClasses.value, ["phone", "tablet", "laptop", "desktop"]);
  assert.equal(gate.requirements.value.length, beklenen.length * 4);
});

test("gereklilik yoksa kapı kendiliğinden AÇILMAZ", () => {
  // LCP adayı olmayan bir bölge kümesi: kapı vakumda açılırsa kapı değildir.
  const regions = ALL_REGIONS.filter((r) => !r.lcpCandidate);
  const gate = mod.useSimulatorApproval({ regions });
  assert.equal(gate.requirements.value.length, 0);
  assert.equal(gate.canPublish.value, false);
  assert.ok(gate.blockers.value.some((b) => b.code === mod.BLOCK_NO_REQUIREMENTS));
});

// ── 2. Uyarı kabulü ───────────────────────────────────────────────

test("tüm yerleşimler görülse de kabul edilmemiş uyarı kapıyı kapalı tutar", () => {
  const gate = mod.useSimulatorApproval();
  for (const req of gate.requirements.value) gate.markSeen(req.region, req.devices[0], 1200);
  assert.equal(gate.missing.value.length, 0, "hepsi görülmüş olmalı");
  assert.ok(gate.warningCodes.value.length > 0, "bu kümede uyarı üreten kombinasyon olmalı");
  assert.equal(gate.canPublish.value, false);
  assert.ok(gate.blockers.value.some((b) => b.code === mod.BLOCK_UNACKNOWLEDGED_WARNING));
});

test("her koşul sağlanınca kapı açılır", () => {
  const gate = mod.useSimulatorApproval();
  openGate(gate);
  assert.deepEqual(gate.blockers.value, []);
  assert.equal(gate.canPublish.value, true);
  assert.equal(gate.previewedPlacements.value.length, gate.requirements.value.length);
});

// ── 3. Görünürlük takibi ──────────────────────────────────────────

test("daha kısa kalma, daha uzun kaydın üstüne YAZMAZ", () => {
  const gate = mod.useSimulatorApproval();
  const req = gate.requirements.value[0];
  gate.markSeen(req.region, req.devices[0], 4000);
  gate.markSeen(req.region, req.devices[0], 1000);
  assert.equal(gate.previewedPlacements.value[0].dwell_ms, 4000);
});

test("IntersectionObserver yoksa hiçbir yerleşim işaretlenmez", () => {
  const gate = mod.useSimulatorApproval();
  const req = gate.requirements.value[0];
  const stop = gate.observe({}, { region: req.region, device: req.devices[0] });
  assert.equal(typeof stop, "function");
  stop();
  assert.equal(gate.previewedPlacements.value.length, 0, "kapı kendiliğinden açılmamalı");
});

test("eşikler tek yerde tanımlı ve kaynak dokümandaki değerler", () => {
  assert.equal(mod.VISIBILITY_RATIO, 0.5);
  assert.equal(mod.DWELL_MS, 1000);
});

// ── 4. Kayıt şekli ────────────────────────────────────────────────

test("kayıt alan adı backend DocType'ı ile birebir aynı", () => {
  assert.equal(mod.PREVIEW_FIELD, "previewed_placements");
});

test("kayıt satırı sayfa, bölge, cihaz, cihaz sınıfı, zaman ve süre taşır", () => {
  const gate = mod.useSimulatorApproval({ now: () => 0 });
  const req = gate.requirements.value[0];
  gate.markSeen(req.region, req.devices[0], 1500);
  const row = gate.previewedPlacements.value[0];
  assert.deepEqual(Object.keys(row).sort(), [
    "device",
    "device_class",
    "dwell_ms",
    "page",
    "placement",
    "region",
    "ts",
  ]);
  assert.equal(row.ts, new Date(0).toISOString());
  assert.equal(row.dwell_ms, 1500);
});

test("denetim kaydı eşiği ve kabul edilen uyarıları taşır, kullanıcı adı UYDURMAZ", () => {
  const gate = mod.useSimulatorApproval();
  openGate(gate);
  const audit = gate.auditRecord.value;
  assert.deepEqual(audit.threshold, { ratio: 0.5, dwell_ms: 1000 });
  assert.ok(audit.acknowledged_warnings.length > 0);
  assert.ok(!("user" in audit), "kullanıcıyı sunucu bilir, istemci yazmaz");
});

// ── 5. Kırık `overrides` yoluna bağlanmıyor ───────────────────────

test("`overrides` taşıyan yük REDDEDİLİR — uç o yolda 417 dönüyor", () => {
  assert.throws(
    () => mod.withPreviewedPlacements({ asset: "MA-1", overrides: [] }, []),
    /overrides/
  );
});

test("mevcut niyet alanları korunur — yalnız `previewed_placements` gönderilmez", () => {
  const base = { asset: "MA-1", focal_x: 0.42, focal_y: 0.61 };
  const out = mod.withPreviewedPlacements(base, [{ placement: "listing/card_grid" }]);
  assert.equal(out.focal_x, 0.42);
  assert.equal(out.focal_y, 0.61);
  assert.equal(typeof out.previewed_placements, "string", "JSON dizgesi olmalı");
  assert.deepEqual(JSON.parse(out.previewed_placements), [{ placement: "listing/card_grid" }]);
});

test("`asset` olmadan kayıt üretilmez", () => {
  assert.throws(() => mod.withPreviewedPlacements({ focal_x: 0.5 }, []), /asset/);
});

test("kapı kapalıyken submit istek ATMAZ", async () => {
  const gate = mod.useSimulatorApproval();
  let called = 0;
  await assert.rejects(
    () => gate.submit({ asset: "MA-1" }, () => (called += 1)),
    /MEDIA_PREVIEW_REQUIRED/
  );
  assert.equal(called, 0);
});

test("kapı açıkken submit enjekte edilen yolu kullanır", async () => {
  const gate = mod.useSimulatorApproval();
  openGate(gate);
  let payload = null;
  await gate.submit({ asset: "MA-1", focal_x: 0.5 }, (p) => {
    payload = p;
    return { ok: true };
  });
  assert.equal(payload.asset, "MA-1");
  assert.ok(!("overrides" in payload));
  assert.ok(JSON.parse(payload.previewed_placements).length > 0);
});

// ── 6. Ekran ──────────────────────────────────────────────────────

test("kapı ekranı: ilerleme çubuğu, canlı sayaç ve PASİF yayımla düğmesi", async () => {
  const html = await render(GATE, { devices: DEVICES, regions: ALL_REGIONS });
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<button[^>]*disabled/, "koşullar sağlanmadan düğme pasif olmalı");
  assert.match(html, /yerleşim sınıfı henüz görülmedi/i, "engelin sebebi yazılmalı");
  assert.match(html, /aria-describedby="simgate-blockers"/, "sebep düğmeye bağlanmalı");
});

test("kapı ekranı sunucunun sınırını saklamıyor", async () => {
  // T-114 (2026-08-20): sunucu kapısı ARTIK VAR — kanıtsız onay uçta 417
  // MEDIA_PREVIEW_REQUIRED ile reddediliyor (docs/reports/65). Bu testin eski
  // hâli "YALNIZ istemcide" ifadesini arıyordu; o cümle artık YANLIŞ olurdu.
  // Niyet aynı kaldı: ekran, doğrulamanın sınırını saklamaz. Yeni sınır şu —
  // sunucu kanıt gövdesini zorlar ama görünürlük SÜRESİ istemci beyanıdır.
  const html = await render(GATE, { devices: DEVICES, regions: ALL_REGIONS });
  assert.match(html, /MEDIA_PREVIEW_REQUIRED/, "sunucu zorlaması ekranda anılmalı");
  assert.match(html, /istemci beyanı/i, "beyan sınırı saklanmamalı");
  assert.doesNotMatch(html, /YALNIZ istemcide/i, "bayat iddia geri dönmesin");
});

test("kapı ekranı ağ isteği atmıyor — kaydı sahibi olan ekran gönderir", () => {
  const src = readFileSync(`${HERE}../SimApprovalGate.vue`, "utf8");
  assert.doesNotMatch(src, /api\.|fetch\(|callMethod/);
  assert.match(src, /emit\("approve"/, "onay yukarı verilmeli");
});

test("her zorunlu yerleşim ekranda ayrı bir satır — sayısı gerekliliklerle aynı", async () => {
  const html = await render(GATE, { devices: DEVICES, regions: ALL_REGIONS });
  // `\b` sınırı `simgate__rowHead` gibi türev sınıfları dışarıda bırakır
  // (`_` sözcük karakteri olduğu için "row" ile "Head" arasında sınır yok).
  const rows = html.match(/class="[^"]*\bsimgate__row\b[^"]*"/g) || [];
  const gate = mod.useSimulatorApproval();
  assert.equal(rows.length, gate.requirements.value.length);
});
