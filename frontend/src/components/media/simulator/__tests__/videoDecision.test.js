import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import tr from "../../../../i18n/locales/tr.js";
import VIDEO_DECISION from "../../../../lib/media/simulator/vendor/video_decision.js";

/**
 * T-071 — video karar tablosunun gerekçesi.
 *
 *   ÖLÇÜLDÜ  — vendor'lanmış tablonun canlı `video_decision.json` ile birebir
 *              olması; vendor'lanmış künyelerin `live-probe.json`'daki ölçümle
 *              birebir olması; panelin JavaScript yorumlayıcısının 23 vektörün
 *              tamamında REFERANS MOTORLA aynı kararı vermesi; her kuralın en
 *              az bir vektörle tetiklenmesi; bozuk tablonun sessizce
 *              "eşleşmedi"ye dönüşmemesi; ekranda basılan eşik, kapı ve künye
 *              sayılarının vendor'lanmış dosyadan gelmesi; vendor'lanamayan
 *              alanların ekranda AÇIK AÇIK yazması.
 *   ÖLÇÜLMEDİ — gerçek bir video dosyasının hatta ne olduğu (ffmpeg bu testte
 *               koşmaz), fayda kapısının gerçek çıktı baytıyla tutması, VMAF
 *               (üretim imajında libvmaf YOK — tablo bunu kendi söylüyor),
 *               tarayıcıdaki görsel yerleşim.
 */

const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const CORE_REPO = join(frontendRoot, "../../tradehub_core");
const LIVE_TABLE = join(CORE_REPO, "tradehub_core/media/pipeline/policy/video_decision.json");
const LIVE_PROBE = join(CORE_REPO, "tradehub_core/tests/fixtures/media/live-probe.json");

const CARD = "/src/components/media/simulator/SimVideoDecisionCard.vue";

let server;
let card;

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
  card = await server.ssrLoadModule(CARD);
});

after(async () => {
  await server?.close();
});

// Eksik çeviri anahtarı ekranda yol olarak basılır; bu görevde `i18n/locales/*`
// dokunulmaz listesinde olduğu için bileşen `t(key, {}, "varsayılan")` deseniyle
// yazıldı ve testler o varsayılan METNİ arıyor.
const i18n = () =>
  createI18n({
    legacy: false,
    locale: "tr",
    fallbackLocale: "tr",
    missingWarn: false,
    fallbackWarn: false,
    messages: { tr },
  });

async function render(props = {}) {
  const app = createSSRApp({ render: () => h(card.default, props) });
  app.use(i18n());
  return decode(await renderToString(app));
}

/**
 * SSR çıktısı `'` ve `>` gibi karakterleri varlık olarak yazar. Testin aradığı
 * şey İŞARETLEME değil METİN olduğu için çözülüyor — aksi hâlde "VENDOR'LANMADI"
 * araması, ekranda yazsa bile başarısız olur.
 */
const decode = (html) =>
  html
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");

const vectorsOf = (kind) => VIDEO_DECISION.vectors.filter((v) => v.kind === kind);
const byName = (kind, name) => vectorsOf(kind).find((v) => v.name === name);

// Eşik-TETİKLİ ölçülmüş künye: kararı SKALER eşikli bir kurala (leaf `when.value`,
// bugün `width_over_cap` → `width > 1280`) düşen ilk ölçüm.
//
// Bu testler eskiden `vectorsOf("measured")[0]`'ı kullanıyordu; o künye
// alfabetik sırada ilk gelen `video_16x9_1080p.mp4`'tü ve width_over_cap'te
// TRANSCODE'a düşüyordu. W9'da (2026-08-20) live-probe.json'a 4 GERÇEK video
// künyesi eklendi; üçü (`real_*`) alfabetik sıralamada `video_*` setinin ÖNÜNE
// geçti, böylece measured[0] artık PASSTHROUGH `real_satici_720x720_28s.mp4`.
// Bu testlerin NİYETİ "eşik-tetikli bir ölçüm"dür — o künyeyi kırılgan indeksle
// değil, kararının skaler eşikli bir kurala düşmesiyle seçiyoruz (yine aynı
// `video_16x9_1080p.mp4`).
const firstThresholdMeasured = () =>
  vectorsOf("measured").find(
    (v) => VIDEO_DECISION.rules.find((r) => r.id === v.decision.rule_id)?.when?.value !== undefined
  );

// ── 1. Vendor ↔ kaynak senkronu ───────────────────────────────────
//
// Vendor'lanan veri BAYATLAR. `vendor.manifest.json` kaynak hash'lerini tutuyor
// (srcsetParity.test.js onu doğruluyor) ama manifest tazelenmeden de bu iki
// test kaynağı doğrudan okuyup içerik karşılaştırması yapar.

test("vendor'lanmış kural tablosu canlı video_decision.json ile birebir", (t) => {
  if (!existsSync(LIVE_TABLE)) {
    t.skip("ÖLÇÜLMEDİ: tradehub_core bu ortamda yok — kaynak karşılaştırılamadı");
    return;
  }
  const live = JSON.parse(readFileSync(LIVE_TABLE, "utf8"));

  assert.equal(VIDEO_DECISION.rules.length, live.rules.length, "kural sayısı sapmış");
  live.rules.forEach((kaynak, i) => {
    const v = VIDEO_DECISION.rules[i];
    assert.equal(v.id, kaynak.id, `${i}. kuralın sırası ya da adı sapmış`);
    assert.equal(v.action, kaynak.action, `${kaynak.id}: aksiyon sapmış`);
    assert.equal(v.code, kaynak.code || "", `${kaynak.id}: kod sapmış`);
    assert.equal(v.reason, kaynak.reason || "", `${kaynak.id}: gerekçe sapmış`);
    assert.deepEqual(v.when, kaynak.when, `${kaynak.id}: EŞİK sapmış`);
  });

  assert.deepEqual(VIDEO_DECISION.fallbackRule, live.default);
  assert.deepEqual(VIDEO_DECISION.benefitGate, live.targets.benefit_gate);
  assert.deepEqual(VIDEO_DECISION.qualityGate, live.targets.quality_gate);
  assert.deepEqual(VIDEO_DECISION.actions, live.actions);
  assert.deepEqual(VIDEO_DECISION.operators, live.operators);
  assert.equal(VIDEO_DECISION.target.maxrateKbps, live.targets.h264_primary.maxrate_kbps);
  assert.equal(VIDEO_DECISION.target.minMaxrateKbps, live.targets.h264_primary.min_maxrate_kbps);
});

test("vendor'lanmış künyeler live-probe.json'daki ÖLÇÜMLE birebir", (t) => {
  if (!existsSync(LIVE_PROBE)) {
    t.skip("ÖLÇÜLMEDİ: künye korpusu bu ortamda yok");
    return;
  }
  const live = JSON.parse(readFileSync(LIVE_PROBE, "utf8"));
  const olculen = vectorsOf("measured");
  assert.equal(olculen.length, Object.keys(live.ffprobe).length, "künye sayısı sapmış");

  for (const v of olculen) {
    const f = live.ffprobe[v.name];
    assert.ok(f, `${v.name} canlı korpusta yok`);
    const vars = v.variables;
    assert.equal(vars.width, f.width);
    assert.equal(vars.height, f.height);
    assert.equal(vars.duration_s, f.duration_s);
    assert.equal(vars.size_bytes, f.bytes);
    assert.equal(vars.video_codec, f.video_codec);
    assert.equal(vars.pix_fmt, f.pix_fmt);
    assert.equal(vars.has_audio, f.has_audio);
    assert.equal(vars.audio_codec, f.audio_codec || "");
    assert.equal(vars.container, f.container);
    // kbps → bps. Kaynak kbps'e YUVARLANMIŞ ölçüdür; panel bunu büyütmez.
    assert.equal(vars.video_bitrate_bps, f.video_bitrate_kbps * 1000);
    assert.equal(vars.format_bitrate_bps, f.bitrate_kbps * 1000);
    const [pay, bolen] = String(f.fps).split("/");
    assert.equal(vars.fps, Number(pay) / Number(bolen || 1), `${v.name}: fps çözümü sapmış`);
    assert.equal(v.today_needs_transcode, live.needs_transcode[v.name]);
  }
});

// ── 2. Panelin yorumlayıcısı ↔ referans motor ─────────────────────

test("panel yorumlayıcısı 23 vektörün tamamında referans motorla AYNI kararı veriyor", () => {
  assert.ok(VIDEO_DECISION.vectors.length >= 23, "vektör sayısı beklenenden az");
  for (const v of VIDEO_DECISION.vectors) {
    const p = card.evaluateDecision(v.variables);
    assert.equal(p.action, v.decision.action, `${v.name}: aksiyon sapması`);
    assert.equal(p.ruleId, v.decision.rule_id, `${v.name}: kural sapması`);
    assert.equal(p.code, v.decision.code, `${v.name}: kod sapması`);
    assert.deepEqual(
      p.trace.map((x) => [x.id, x.matched]),
      v.decision.trace,
      `${v.name}: kural izi sapması`
    );
  }
});

test("sentetik künyeler hedefledikleri kuralı gerçekten tetikliyor", () => {
  const sentetik = vectorsOf("synthetic");
  assert.ok(sentetik.length > 0, "kural örneği vendor'lanmamış");
  for (const v of sentetik) {
    assert.equal(v.decision.rule_id, v.expects_rule, `${v.name}: beklenen kural tetiklenmedi`);
    assert.ok(v.mutation_why, `${v.name}: değişikliğin gerekçesi yazılmamış`);
  }
});

test("tablodaki HER kural en az bir vektörle tetikleniyor — açıklanamayan kural yok", () => {
  const tetiklenen = new Set(VIDEO_DECISION.vectors.map((v) => v.decision.rule_id));
  const eksik = VIDEO_DECISION.rules.map((r) => r.id).filter((id) => !tetiklenen.has(id));
  assert.deepEqual(eksik, [], `şu kurallar hiçbir künyede gösterilemiyor: ${eksik.join(", ")}`);
  assert.ok(tetiklenen.has("default"), "varsayılan karar hiç gösterilemiyor");
});

test("ölçülen korpusta REMUX ve verimlilik kuralları TETİKLENMİYOR — kartın sentetik künyeye ihtiyacı bu", () => {
  const olculenKurallar = new Set(vectorsOf("measured").map((v) => v.decision.rule_id));
  for (const id of ["container_not_mp4", "moov_at_end", "extra_streams", "fps_over_cap"]) {
    assert.equal(olculenKurallar.has(id), false, `${id} ölçülen korpusta tetikleniyormuş`);
  }
});

// ── 3. Yorumlayıcı sessizce yanlış cevap vermiyor ─────────────────

test("bilinmeyen değişken sessizce 'eşleşmedi'ye dönüşmüyor, hata atıyor", () => {
  const vars = { ...vectorsOf("measured")[0].variables };
  delete vars.width;
  assert.throws(() => card.evaluateDecision(vars), card.DecisionTableError);
});

test("bilinmeyen operatör hata atıyor", () => {
  const vars = vectorsOf("measured")[0].variables;
  assert.throws(
    () => card.evalCondition({ var: "width", op: "yaklasik", value: 1 }, vars),
    card.DecisionTableError
  );
});

test("tip uyuşmazlığı hata atıyor — JavaScript'in sessiz false'u kuralı ÖLDÜRÜR", () => {
  const vars = vectorsOf("measured")[0].variables;
  assert.throws(
    () => card.evalCondition({ var: "video_codec", op: "gt", value: 1280 }, vars),
    card.DecisionTableError
  );
});

test("İLK EŞLEŞEN kazanır — sonraki kurallara bakılmaz", () => {
  // 4K üstü VE 1280 üstü: iki kural da eşleşir, sıradaki ÖNCE gelen kazanır.
  const vars = { ...byName("synthetic", "resolution_over_max").variables };
  const p = card.evaluateDecision(vars);
  assert.equal(p.ruleId, "resolution_over_max");
  assert.equal(p.action, "REJECT");
  assert.equal(
    p.trace.some((x) => x.id === "width_over_cap"),
    false,
    "eşleşmeden sonraki kurala bakılmış"
  );
});

test("koşul ağacındaki her yaprak GERÇEK değerle açıklanıyor", () => {
  const v = byName("synthetic", "inefficient_encoding");
  const rule = VIDEO_DECISION.rules.find((r) => r.id === "inefficient_encoding");
  const lines = card.explainCondition(rule.when, v.variables).filter((l) => l.kind === "leaf");
  assert.equal(lines.length, 2, "iki koşullu kural iki yaprakla açıklanmalı");
  const bpp = lines.find((l) => l.name === "bpp");
  assert.equal(bpp.actual, v.variables.bpp, "açıklamadaki ölçü künyeden gelmeli");
  assert.equal(bpp.expected, rule.when.all[0].value, "açıklamadaki eşik tablodan gelmeli");
  assert.equal(bpp.ok, true);
});

// ── 4. Ekran ──────────────────────────────────────────────────────

test("karar, kural adı ve gerekçe ekranda basılıyor", async () => {
  const html = await render();
  const ilk = vectorsOf("measured")[0];
  assert.match(html, new RegExp(ilk.decision.action), "aksiyon basılmamış");
  assert.match(html, new RegExp(ilk.decision.rule_id), "kural adı basılmamış");
  assert.match(html, new RegExp(ilk.decision.code), "hata/karar kodu basılmamış");
  assert.ok(html.includes(ilk.decision.reason), "kararın gerekçesi basılmamış");
});

test("eşik ekranda GERÇEK ölçü ile yan yana: bu girdi → bu karar, çünkü şu eşik", async () => {
  const ilk = firstThresholdMeasured();
  const html = await render({ initialKind: "measured", initialName: ilk.name });
  const rule = VIDEO_DECISION.rules.find((r) => r.id === ilk.decision.rule_id);
  const esik = rule.when.value;
  const olcu = ilk.variables[rule.when.var];
  assert.ok(html.includes(olcu.toLocaleString("tr-TR")), "künyedeki ölçü basılmamış");
  assert.ok(html.includes(esik.toLocaleString("tr-TR")), "tablodaki eşik basılmamış");
  assert.match(html, /&gt;|>/, "karşılaştırma işareti basılmamış");
});

test("fayda kapısı sayıları VENDOR'DAN geliyor — ekranda uydurma bayt yok", async () => {
  const html = await render();
  const gate = vectorsOf("measured")[0].benefit_gate;
  assert.ok(html.includes(gate.rate_ceiling_kbps.toLocaleString("tr-TR")), "hız tavanı basılmamış");
  assert.ok(html.includes(fmtBytes(gate.max_output_bytes)), "kapının bayt tavanı basılmamış");
  assert.ok(html.includes(fmtBytes(gate.src_bytes)), "kaynak baytı basılmamış");
  assert.ok(html.includes(VIDEO_DECISION.benefitGate.id), "kapının kimliği basılmamış");
  assert.ok(html.includes(gate.remux_fallback_reason), "geri çekilme hükmü basılmamış");
});

test("fayda kapısının REDDİ ekranda anlatılıyor — 'çıktı atılır, kaynak korunur'", async () => {
  const ilk = firstThresholdMeasured();
  const html = await render({ initialKind: "measured", initialName: ilk.name });
  assert.equal(ilk.decision.action, "TRANSCODE", "önkoşul: kapı işlemeli");
  assert.match(html, /çıktı ATILIR/i);
  assert.match(html, /kaynak korunur/i);
});

test("vendor'lanmayan alanlar gizlenmiyor: adı, varsayılanı ve etkilediği kural yazılı", async () => {
  const html = await render();
  const eksik = vectorsOf("measured")[0].defaulted;
  assert.ok(eksik.length > 0, "önkoşul: bu künyede vendor'lanmamış alan olmalı");
  assert.match(html, /VENDOR'LANMADI/);
  for (const ad of eksik) assert.ok(html.includes(ad), `${ad} ekranda listelenmemiş`);
  assert.match(html, /VideoFacts varsayılanı/);
  // moov_at_end ölçülmediği için REMUX kuralı varsayılanla değerlendirildi.
  assert.match(html, /moov_at_end/);
});

test("karar vendor'lanmamış alana dayanmıyorsa 'KESİN DEĞİL' uyarısı BASILMAZ", async () => {
  // Eşik-tetikli ölçülen künye `width_over_cap`'te eşleşiyor; ondan önceki
  // kuralların hiçbiri vendor'lanmamış alana bakmıyor, yani karar gerçekten kesin.
  const ilk = firstThresholdMeasured();
  const bakilan = ilk.decision.trace.map(([id]) => id);
  const supheli = VIDEO_DECISION.rules
    .filter((r) => bakilan.includes(r.id))
    .filter((r) => card.conditionVars(r.when).some((v) => ilk.defaulted.includes(v)));
  assert.deepEqual(supheli, [], "önkoşul: bu künyede varsayılana dayanan kural olmamalı");
  const html = await render({ initialKind: "measured", initialName: ilk.name });
  assert.doesNotMatch(html, /Karar KESİN DEĞİL/);
});

test("varsayılana dayanan karar 'KESİN DEĞİL' diye işaretleniyor", async () => {
  // PASSTHROUGH künyesinde tablonun TAMAMINA bakılır; REMUX kuralları
  // `moov_at_end` / `nb_streams` gibi VENDOR'LANMAMIŞ alanları okur.
  const gecen = vectorsOf("measured").find((v) => v.decision.rule_id === "default");
  assert.ok(gecen, "önkoşul: varsayılana düşen ölçülmüş bir künye olmalı");
  const html = await render({ initialKind: "measured", initialName: gecen.name });
  assert.match(html, /Karar KESİN DEĞİL/);
  assert.match(html, /VARSAYILAN/);
  assert.match(html, /moov_at_end/);
});

test("çıktı üretmeyen kararda fayda kapısının İŞLEMEDİĞİ yazıyor", async () => {
  const gecen = vectorsOf("measured").find((v) => v.decision.action === "PASSTHROUGH");
  const html = await render({ initialKind: "measured", initialName: gecen.name });
  assert.match(html, /yeni dosya üretmez/);
  assert.match(html, /fayda kapısı işlemez/);
});

test("hiçbir kural eşleşmeyince varsayılan satırı EŞLEŞTİ olarak basılıyor", async () => {
  const gecen = vectorsOf("measured").find((v) => v.decision.rule_id === "default");
  const html = await render({ initialKind: "measured", initialName: gecen.name });
  assert.match(html, /kuralın hiçbiri eşleşmedi/);
  assert.ok(html.includes(VIDEO_DECISION.fallbackRule.reason), "varsayılanın gerekçesi basılmamış");
});

test("sentetik kural örneği seçilince ekran ÖLÇÜM DEĞİL diye uyarıyor", async () => {
  const html = await render({ initialKind: "synthetic", initialName: "moov_at_end" });
  assert.match(html, /SENTETİK künye — ölçüm DEĞİL/);
  assert.match(html, /REMUX/);
  assert.ok(html.includes("moov atomu"), "kuralın gerekçesi basılmamış");
});

test("kural izi 15 kuralı da sırayla basıyor ve eşleşmeden sonrasını 'bakılmadı' diyor", async () => {
  const ilk = firstThresholdMeasured();
  const html = await render({ initialKind: "measured", initialName: ilk.name });
  for (const r of VIDEO_DECISION.rules) assert.ok(html.includes(r.id), `${r.id} izde yok`);
  assert.match(html, /EŞLEŞTİ/);
  assert.match(html, /bakılmadı/);
});

test("panel referans motorla aynı karardayken SAPMA uyarısı BASILMIYOR", async () => {
  const html = await render();
  assert.doesNotMatch(html, /simvd__note--bad/, "sapma uyarısı yokken basılmış");
});

test("künyenin kökeni ekranda: ölçüm mü, türetme mi, vendor'lanmamış mı", async () => {
  const html = await render();
  assert.match(html, /ÖLÇÜM/);
  assert.match(html, /TÜRETİLDİ/);
  assert.ok(html.includes(VIDEO_DECISION.source.kunyeOrtami), "ölçüm ortamı yazılmamış");
  assert.ok(html.includes(VIDEO_DECISION.source.kunyeKorpusu), "künye dosyası yazılmamış");
});

test("kalite kapısı notu vendor'dan BİREBİR basılıyor — sahte VMAF yok", async () => {
  // 2026-08-20 (W7) öncesi bu test /ÖLÇÜLEMEZ/ arıyordu: imajdaki ffmpeg
  // libvmaf'sızdı ve not bunu söylüyordu. Yeni imaj libvmaf'LI, VMAF artık
  // GERÇEKTEN ölçülüyor ve not buna göre güncellendi (sync:simulator) —
  // "ölçülemez" iddiasını aramak artık eski gerçekliği dayatmak olurdu.
  // Kalıcı iddia şudur: not vendor'dan birebir basılır ve "sahte VMAF
  // üretilmez" taahhüdü ekranda durur (libvmaf'sız imaj yolunda da
  // 'VMAF OLCULEMEDI' yazılacağını notun kendisi söylüyor).
  const html = await render();
  assert.ok(html.includes(VIDEO_DECISION.qualityGate.vmaf_note), "vmaf notu basılmamış");
  assert.match(html, /sahte VMAF üretilmez/);
});

/** `utils/mediaFormat.js` `formatBytes` ile birebir — beklenti orada değil burada üretilmeli. */
function fmtBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace(".", ",")} ${units[unit]}`;
}
