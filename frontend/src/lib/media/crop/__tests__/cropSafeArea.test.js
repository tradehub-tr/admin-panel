import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { rect } from "../geometry.js";
import { SAFE_BAND, cropWarnings, focalInWindow, safeBandFor } from "../cropWarnings.js";
import { CONFIDENCE_THRESHOLD, THRESHOLD_CALIBRATED, fromServerSuggestion } from "../focusSuggest.js";

/**
 * Güvenli alan ve kırpma sözleşmesinin **kaynağa bağlılığı**.
 *
 *   ÖLÇÜLÜR  — panelde yazılı her sayının `tradehub_core`daki karşılığıyla
 *              eşleştiği: güvenli alan eşikleri politikanın `content_rules`
 *              bloğundan, `INTENT_METHODS` uçtan, güven eşiği ve
 *              "kalibre edilmedi" bayrağı kütüphaneden.
 *   ÖLÇÜLMEZ  — sunucunun canlı yanıtı. Uç bu depodan oturum açamıyor
 *              (HTTP 403 = uç var, yetki istiyor); ölçülen şey yükün
 *              SÖZLEŞMEYE uygunluğu, sunucunun cevabı değil.
 *
 * Kaynak deposu ortamda yoksa bu testler **"geçti" demez**, sebebini yazarak
 * atlar — `cropGeometryParity.test.js` ile aynı disiplin.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const CORE = join(HERE, "../../../../../../../tradehub_core/tradehub_core");
const SLOTS = join(CORE, "media/pipeline/policy/slots");

const coreVar = existsSync(SLOTS);
const ATLA = {
  skip: coreVar
    ? false
    : `kardeş depo yok (${CORE}) — canlı kaynakla karşılaştırma ÖLÇÜLMEDİ, sahte geçilmedi`,
};

/** Politikalardaki güvenli alan kuralları: `{slotKey: {rule, threshold}}`. */
function canliBantlar() {
  const out = {};
  for (const dosya of readdirSync(SLOTS).filter((f) => f.endsWith(".json") && !f.startsWith("."))) {
    const p = JSON.parse(readFileSync(join(SLOTS, dosya), "utf8"));
    for (const kural of p.content_rules || []) {
      if (!String(kural.rule || "").startsWith("safe_area")) continue;
      out[p.slot_key] = { rule: kural.rule, threshold: kural.threshold, action: kural.action };
    }
  }
  return out;
}

// ── 1. Eşikler politikadan, hesaptan değil ────────────────────────

test("[FR-023][FR-024] güvenli alan eşikleri canlı politikayla birebir", ATLA, () => {
  const canli = canliBantlar();

  assert.deepEqual(
    Object.keys(SAFE_BAND).sort(),
    Object.keys(canli).sort(),
    "güvenli alan kuralı olan slot kümesi ayrışmış — uydurulmuş ya da unutulmuş eşik var"
  );

  for (const [slot, bant] of Object.entries(SAFE_BAND)) {
    assert.equal(bant.rule, canli[slot].rule, `${slot}: kural adı`);
    assert.equal(bant.fraction, canli[slot].threshold, `${slot}: eşik`);
    // Politika "warn" diyor; panel de engellemiyor. Engel olsaydı kullanıcı
    // kendi görselinden kilitlenirdi.
    assert.equal(canli[slot].action, "warn", `${slot}: politika eylemi`);
  }
});

test("[FR-023][FR-024] kuralı olmayan slotta bant YOK — eşik uydurulmuyor", () => {
  for (const slot of ["brand.logo", "product.image", "user.avatar", "seller.logo"]) {
    assert.equal(safeBandFor(slot), null, slot);
  }
  assert.equal(safeBandFor("company.cover_image").axis, "x");
  // `category.banner` kutusu hem 0,82:1 hem 4,68:1 olabiliyor; kırpma yöne
  // göre değiştiği için garanti edilen kesit her iki eksende geçerli.
  assert.equal(safeBandFor("category.banner").axis, "both");
});

// ── 2. Odağın kadraj içindeki yeri ────────────────────────────────

test("odak kadrajın dışına düşerse göreli konum KELEPÇELENMEZ", () => {
  const win = rect(1000, 500, 1000, 563);
  const rel = focalInWindow({ x: 0, y: 0.5 }, win, 4000, 3000);
  assert.ok(rel.x < 0, "kadrajın solundaki odak negatif okunmalı — uyarının kendisi bu");
});

test("[FR-023] kadrajın merkezindeki odak bandın içindedir", () => {
  const win = rect(1000, 500, 1000, 563);
  const rel = focalInWindow({ x: 1500 / 4000, y: (500 + 563 / 2) / 3000 }, win, 4000, 3000);
  assert.ok(Math.abs(rel.x - 0.5) < 1e-9);
  assert.ok(Math.abs(rel.y - 0.5) < 1e-9);
  assert.equal(
    cropWarnings({ sourceW: 4000, sourceH: 3000, win, slotKey: "company.cover_image",
      focal: { x: 1500 / 4000, y: (500 + 563 / 2) / 3000 } }).some((w) => w.id === "safeBand"),
    false
  );
});

test("odak yoksa güvenli alan uyarısı ÜRETİLMEZ — konum bilinmeden ihlal denemez", () => {
  const uyarilar = cropWarnings({
    sourceW: 4000,
    sourceH: 3000,
    win: rect(0, 0, 1000, 563),
    slotKey: "company.cover_image",
  });
  assert.equal(uyarilar.some((w) => w.id === "safeBand"), false);
  // Bilgi rozeti yine de çıkar: slotta güvenli alan TANIMLI.
  assert.equal(uyarilar.some((w) => w.id === "safeBandActive"), true);
});

// ── 3. Sözleşme sabitleri kaynakla eşleşiyor ──────────────────────

test("`INTENT_METHODS` uçtaki kümeyle aynı", ATLA, () => {
  const kaynak = readFileSync(join(CORE, "api/media_crop.py"), "utf8");
  const m = /INTENT_METHODS: frozenset\[str\] = frozenset\(\{([^}]*)\}\)/.exec(kaynak);
  assert.ok(m, "uçta INTENT_METHODS bulunamadı — sözleşme taşınmış olabilir");
  const canli = [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]).sort();

  // `useCropStudio.js` `@/` alias'ı kullanıyor ve düz Node'da import edilemez
  // (Vite gerekir; `cropStudio.test.js` bunun için sunucu kaldırıyor). Sabit
  // burada KAYNAKTAN okunuyor — ölçülen şey iki dosyadaki iki liste.
  const panel = readFileSync(new URL("../../../../composables/useCropStudio.js", import.meta.url), "utf8");
  const pm = /export const INTENT_METHODS = \[([^\]]*)\]/.exec(panel);
  assert.ok(pm, "panelde INTENT_METHODS bulunamadı");
  const panelListe = [...pm[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]).sort();

  assert.deepEqual(panelListe, canli);
});

test("0-1 dışı girdi sunucuda REDDEDİLİYOR — kelepçelenmiyor", ATLA, () => {
  const kaynak = readFileSync(join(CORE, "media/pipeline/api/envelope.py"), "utf8");
  const govde = kaynak.slice(kaynak.indexOf("def require_unit"), kaynak.indexOf("def page_params"));
  assert.match(govde, /if not \(0\.0 <= sayi <= 1\.0\)/, "aralık kontrolü değişmiş");
  assert.match(govde, /raise BadRequest/, "aralık dışı DEĞER kelepçelenmemeli, reddedilmeli");
  assert.doesNotMatch(govde, /min\(|max\(/, "koordinatta kelepçeleme belirdi — sözleşme değişti");
});

test("güvenli alan ve override kutu kuralları kaynakla aynı", ATLA, () => {
  const kaynak = readFileSync(join(CORE, "media/pipeline/api/crop.py"), "utf8");
  // Kutu: sıfır alan yasak, kaynağın dışına taşma yasak (1e-6 tolerans).
  assert.match(kaynak, /if w <= 0 or h <= 0/);
  assert.match(kaynak, /x \+ w > 1\.0 \+ 1e-6 or y \+ h > 1\.0 \+ 1e-6/);
  // Bilinmeyen profil sessizce atlanmıyor, reddediliyor.
  assert.match(kaynak, /bu slotta tanımlı bir profil değil/);
  assert.match(kaynak, /Aynı profil için iki kırpım verildi/);
  // `safe_area` alan adları KUTU; `safe_top/right/bottom/left` yok.
  assert.match(kaynak, /"safe_x": x, "safe_y": y, "safe_w": w, "safe_h": h/);
  assert.doesNotMatch(kaynak, /safe_top|safe_bottom|safe_left|safe_right/);
});

test("güven eşiği ve 'kalibre edilmedi' bayrağı kaynakla aynı", ATLA, () => {
  const cekirdek = readFileSync(join(CORE, "media/pipeline/core/crop.py"), "utf8");
  const m = /SMARTCROP_CONFIDENCE_THRESHOLD[^=]*=\s*([0-9.]+)/.exec(cekirdek);
  assert.ok(m, "eşik sabiti bulunamadı");
  assert.equal(Number(m[1]), CONFIDENCE_THRESHOLD, "panel eşiği kaynaktan ayrışmış");

  const api = readFileSync(join(CORE, "media/pipeline/api/crop.py"), "utf8");
  assert.match(api, /calibrated: bool = False/, "sunucu 'kalibre edilmedi' varsayılanını bıraktı mı");
  assert.equal(THRESHOLD_CALIBRATED, false, "panel eşiği kalibre sanmamalı");
});

// ── 4. Sunucu yanıtının çevrilmesi ────────────────────────────────

test("sunucu öneri şekli `to_dict` ile aynı alanları konuşuyor", ATLA, () => {
  const api = readFileSync(join(CORE, "media/pipeline/api/crop.py"), "utf8");
  const govde = api.slice(api.indexOf("def to_dict"), api.indexOf("def focal_from_bytes"));
  for (const alan of ["focal_x", "focal_y", "confidence", "measured", "reason", "grid",
    "threshold", "threshold_calibrated"]) {
    assert.ok(govde.includes(`"${alan}"`), `${alan} yanıttan kalkmış — çeviri güncellenmeli`);
  }
});

test("ölçülmüş sunucu önerisi panel şekline kayıpsız çevriliyor", () => {
  // Rapor 37 §5.4'teki gerçek ölçüm (800×400 JPEG).
  const oneri = fromServerSuggestion({
    suggestion: {
      focal_x: 0.178523,
      focal_y: 0.21707,
      confidence: 0.891147,
      measured: true,
      reason: "measured",
      grid: 32,
      threshold: 0.5,
      threshold_calibrated: false,
      above_threshold: true,
    },
  });
  assert.equal(oneri.x, 0.178523);
  assert.equal(oneri.y, 0.21707);
  assert.equal(oneri.measured, true);
  assert.equal(oneri.thresholdCalibrated, false);
  assert.equal(oneri.source, "server");
  // Izgara parametresi etikete taşınır; uydurulmuş bir sürüm adı yok.
  assert.equal(oneri.algorithm, "edge_energy_grid32");
});

test("bozuk yanıt öneri ÜRETMEZ — merkeze düşüp güven uydurmaz", () => {
  assert.equal(fromServerSuggestion(null), null);
  assert.equal(fromServerSuggestion({ suggestion: {} }), null);
  assert.equal(fromServerSuggestion({ suggestion: { focal_x: "abc", focal_y: 0.5 } }), null);
});
