#!/usr/bin/env node
/**
 * T-115 — Simülatörün GERÇEK sayfayla doğrulanması (drift ölçümü).
 *
 * `srcsetParity.test.js` "hesap paritesini" ölçer: panelin JavaScript'i ile
 * `srcset.py`'nin aynı sayıyı ürettiğini. Bu betik BAŞKA bir şeyi ölçer:
 * kataloğun (`placements.json`) hesapladığı kutu, **gerçek storefront
 * sayfasındaki** kutuyla aynı mı? İki hesap birbiriyle tam uyuşup ikisi de
 * gerçeğe göre yanlış olabilir; drift testi tam olarak bu boşluğu kapatır.
 *
 * Ölçüm gerçek bir tarayıcıda, gerçek yerleşim motoruyla, gerçek
 * `getBoundingClientRect()` ile yapılır — kaynak CSS'ten türetme YOKTUR.
 *
 * Yeni npm bağımlılığı EKLENMEDİ: Node'un yerleşik `WebSocket`'i + makinede
 * kurulu Chrome, ham CDP ile sürülüyor (`drift-cdp.mjs`).
 *
 * Kullanım:
 *   node scripts/drift-measure.mjs                    # ölç, karşılaştır, yaz
 *   node scripts/drift-measure.mjs --base http://...  # başka bir storefront
 *   node scripts/drift-measure.mjs --devices iphone-14,desktop-1080p
 *   node scripts/drift-measure.mjs --no-write         # fixture'ı güncelleme
 *   node scripts/drift-measure.mjs --headful          # görünür tarayıcı
 *
 * Çıkış kodu: kutu farkı eşiği (varsayılan 2px) aşan bölge varsa 1.
 * GECELİK koşum içindir — PR başına değil (kaynak kabul ölçütü §T-115.4).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { launchBrowser, newPage, closePage, emulate, goto, evaluate } from "./drift-cdp.mjs";
import { startDistServer } from "./drift-serve.mjs";
import { PAGES as PAGE_DEFS, TARGET_BY_KEY, TARGETS, FIXTURES } from "./drift-targets.mjs";
import { DEVICES, boxWidth, regionByKey } from "../src/lib/media/simulator/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_PATH = join(
  HERE,
  "../src/lib/media/simulator/__tests__/fixtures/drift-measurements.json"
);

/** Kaynak kabul ölçütü: "Kutu ölçülerinde 2 px üzeri sapma CI'da kırmızı." */
export const DRIFT_THRESHOLD_PX = 2;

// ── CLI ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { base: process.env.DRIFT_BASE || "http://istoc.localhost", write: true, headless: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") o.base = argv[++i];
    else if (a === "--devices") o.devices = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--regions") o.regions = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--no-write") o.write = false;
    else if (a === "--headful") o.headless = false;
    else if (a === "--settle") o.settleMs = Number(argv[++i]);
    else if (a === "--dist") o.dist = argv[++i];
    else if (a === "--out") o.out = argv[++i];
    else throw new Error(`Bilinmeyen argüman: ${a}`);
  }
  o.settleMs ??= 3500;
  return o;
}

const pagePath = (page) => (typeof page.path === "function" ? page.path() : page.path);

/**
 * Bir seçiciyi ölçer. GÖRÜNÜR ilk eşleşme alınır — `x-show` ile gizlenen
 * Alpine düğümleri sayfada DURUYOR ama genişlikleri 0'dır; onları ölçmek
 * sessizce yanlış bir "0px drift" üretirdi.
 */
const MEASURE_JS = (selector) => `(() => {
  const sel = ${JSON.stringify(selector)};
  const all = [...document.querySelectorAll(sel)];
  const visible = all.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  });
  const el = visible[0];
  if (!el) return { found: false, total: all.length, visible: 0 };
  const r = el.getBoundingClientRect();
  return {
    found: true, total: all.length, visible: visible.length,
    width: r.width, height: r.height,
    tag: el.tagName.toLowerCase(),
    cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || "")).slice(0, 140),
    // "hangi CSS sapmaya yol açtı" — kutuyu belirleyen hesaplanmış değerler.
    css: (() => { const c = getComputedStyle(el); return {
      width: c.width, maxWidth: c.maxWidth, minWidth: c.minWidth,
      paddingInline: c.paddingLeft + " / " + c.paddingRight,
      boxSizing: c.boxSizing, aspectRatio: c.aspectRatio, flexBasis: c.flexBasis,
    }; })(),
    // Zincirdeki ilk 4 ata: drift bir üst kapsayıcıdan geliyorsa orada görünür.
    ancestors: (() => {
      const out = []; let n = el.parentElement;
      for (let i = 0; i < 4 && n; i++, n = n.parentElement) {
        const c = getComputedStyle(n); const rr = n.getBoundingClientRect();
        out.push({
          tag: n.tagName.toLowerCase(), id: n.id || "",
          cls: String(n.className || "").slice(0, 110),
          width: rr.width, maxWidth: c.maxWidth,
          padding: c.paddingLeft + "/" + c.paddingRight,
          display: c.display, gridCols: c.gridTemplateColumns.slice(0, 120), gap: c.columnGap,
        });
      }
      return out;
    })(),
  };
})()`;

const ENV_JS = `({
  innerWidth: window.innerWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollbarPx: window.innerWidth - document.documentElement.clientWidth,
  dpr: window.devicePixelRatio,
  ua: navigator.userAgent.slice(0, 60),
})`;

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  const devices = opt.devices ? DEVICES.filter((d) => opt.devices.includes(d.id)) : DEVICES;
  if (!devices.length) throw new Error(`Eşleşen cihaz yok: ${opt.devices}`);

  // Ölçülecek hedefleri sayfaya göre grupla — sayfa başına tek gidiş.
  const wanted = TARGETS.filter(
    (t) => !t.unmeasured && (!opt.regions || opt.regions.includes(t.key))
  );
  const byPage = new Map();
  for (const t of wanted) {
    const page = t.key.split("/")[0];
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(t);
  }

  // `--dist` verilirse ölçüm hedefi yayındaki imaj değil, o klasörden servis
  // edilen GÜNCEL derlemedir; `--base` yalnız veri proxy'si olarak kullanılır.
  let dist = null;
  if (opt.dist) {
    dist = await startDistServer({ distDir: opt.dist, backend: opt.base });
    process.stderr.write(`dist sunucusu: ${dist.base}  (kaynak: ${opt.dist}, veri: ${opt.base})\n`);
  }
  const target = dist ? dist.base : opt.base;

  const { cdp, kill, binary } = await launchBrowser({ headless: opt.headless });
  const rows = [];
  const env = {};
  try {
    for (const device of devices) {
      const { sessionId, targetId } = await newPage(cdp);
      await emulate(cdp, sessionId, {
        width: device.cssWidth, height: device.cssHeight, dpr: device.dpr,
        mobile: device.deviceClass === "phone" || device.deviceClass === "tablet",
      });
      for (const [page, targets] of byPage) {
        const def = PAGE_DEFS[page];
        const url = target + pagePath(def);
        try {
          await goto(cdp, sessionId, url);
          if (def.seed) {
            await evaluate(cdp, sessionId, def.seed);
            await goto(cdp, sessionId, url);
          }
        } catch (err) {
          for (const t of targets) {
            rows.push({ device: device.id, key: t.key, status: "GIDILEMEDI", detail: String(err.message) });
          }
          continue;
        }
        await new Promise((r) => setTimeout(r, opt.settleMs));
        if (def.after) {
          await evaluate(cdp, sessionId, def.after).catch(() => {});
          await new Promise((r) => setTimeout(r, def.afterWaitMs || 1000));
        }
        if (!env[device.id]) env[device.id] = await evaluate(cdp, sessionId, ENV_JS);

        for (const t of targets) {
          const useAlt = t.selectorMinVw !== undefined && device.cssWidth < t.selectorMinVw;
          const selector = useAlt ? t.altSelector : t.selector;
          if (!selector) {
            rows.push({
              device: device.id, key: t.key, status: "OLCULMEDI",
              detail: `${device.cssWidth}px bandı için seçici tanımlı değil (selectorMinVw=${t.selectorMinVw})`,
            });
            continue;
          }
          if (t.prepare) {
            try {
              await evaluate(cdp, sessionId, t.prepare);
              await new Promise((r) => setTimeout(r, t.prepareWaitMs || 600));
            } catch { /* hazırlık başarısızsa aşağıda BULUNAMADI olarak düşer */ }
          }
          let m;
          try {
            m = await evaluate(cdp, sessionId, MEASURE_JS(selector));
          } catch (err) {
            rows.push({ device: device.id, key: t.key, status: "HATA", selector, detail: String(err.message) });
            continue;
          }
          if (!m.found) {
            rows.push({
              device: device.id, key: t.key, status: "BULUNAMADI", selector,
              detail: `DOM'da ${m.total} eşleşme, görünür 0`,
              optional: !!t.optional,
            });
            continue;
          }
          rows.push({
            device: device.id, key: t.key, status: "OK", selector,
            measuredWidth: m.width, measuredHeight: m.height,
            matchCount: m.total, visibleCount: m.visible,
            tag: m.tag, cls: m.cls, css: m.css, ancestors: m.ancestors,
            expectSquare: !!t.expectSquare,
            squareOk: t.expectSquare ? Math.abs(m.width - m.height) <= 1 : null,
          });
          // Lightbox açık kaldıysa kapat — sonraki ölçüm kirlenmesin.
          if (t.cleanup) {
            await evaluate(cdp, sessionId, t.cleanup).catch(() => {});
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }
      await closePage(cdp, targetId);
      process.stderr.write(`· ${device.id} bitti\n`);
    }
  } finally {
    kill();
    if (dist) await dist.close();
  }

  const report = buildReport({
    rows, env, base: target, binary, fixtures: FIXTURES,
    buildSource: opt.dist ? `yerel dist: ${opt.dist} (veri proxy: ${opt.base})` : `yayındaki imaj: ${opt.base}`,
  });
  printReport(report);
  if (opt.write) {
    const outPath = opt.out ? resolve(process.cwd(), opt.out) : FIXTURE_PATH;
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
    process.stderr.write(`\nYazıldı: ${outPath}\n`);
  }
  process.exit(report.summary.driftCount > 0 ? 1 : 0);
}

/** Ölçüm satırlarını katalog hesabıyla karşılaştırır. Testle ORTAK mantık. */
export function buildReport({ rows, env, base, binary, fixtures, buildSource }) {
  const deviceById = new Map(DEVICES.map((d) => [d.id, d]));
  const out = [];
  for (const r of rows) {
    if (r.status !== "OK") { out.push(r); continue; }
    const region = regionByKey(r.key);
    const device = deviceById.get(r.device);
    const expected = boxWidth(region, device);
    const delta = r.measuredWidth - expected;
    out.push({
      ...r,
      catalogWidth: expected,
      delta,
      absDelta: Math.abs(delta),
      drift: Math.abs(delta) > DRIFT_THRESHOLD_PX,
      renderPoint: region.renderPoint,
      selectorSource: TARGET_BY_KEY.get(r.key)?.source || "",
    });
  }
  const ok = out.filter((r) => r.status === "OK");
  const drifted = ok.filter((r) => r.drift);
  const unmeasured = TARGETS.filter((t) => t.unmeasured).map((t) => ({
    key: t.key, status: "OLCULMEDI", reason: t.unmeasured,
  }));
  return {
    generatedAt: new Date().toISOString(),
    base, browser: binary, fixtures, buildSource,
    thresholdPx: DRIFT_THRESHOLD_PX,
    env,
    note:
      "Kutu genişlikleri GERÇEK tarayıcıda getBoundingClientRect() ile ölçüldü. " +
      "Katalog değeri src/lib/media/simulator/layout.js::boxWidth ile hesaplandı — " +
      "yani panelin ekranda gösterdiği sayının ta kendisi.",
    rows: out,
    unmeasuredRegions: unmeasured,
    summary: {
      devices: [...new Set(rows.map((r) => r.device))].length,
      regionsAttempted: [...new Set(rows.map((r) => r.key))].length,
      regionsUnmeasured: unmeasured.length,
      measured: ok.length,
      notFound: out.filter((r) => r.status === "BULUNAMADI").length,
      driftCount: drifted.length,
      maxAbsDeltaPx: ok.length ? Math.max(...ok.map((r) => r.absDelta)) : null,
      maxAbsDeltaAt: ok.length
        ? ok.reduce((a, b) => (b.absDelta > a.absDelta ? b : a)).device +
          " " + ok.reduce((a, b) => (b.absDelta > a.absDelta ? b : a)).key
        : null,
      squareMismatch: ok.filter((r) => r.squareOk === false).length,
    },
  };
}

function printReport(rep) {
  const w = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`\nDRIFT ÖLÇÜMÜ — ${rep.base}   eşik: ${rep.thresholdPx}px`);
  console.log(`tarayıcı: ${rep.browser}`);
  console.log(`derleme : ${rep.buildSource}`);
  console.log(
    `\n${w("Cihaz", 22)}| ${w("Bölge", 30)}| ${w("Katalog", 9)}| ${w("Ölçülen", 9)}| ${w("Fark", 8)}| Durum`
  );
  console.log("-".repeat(100));
  for (const r of rep.rows) {
    if (r.status !== "OK") {
      console.log(`${w(r.device, 22)}| ${w(r.key, 30)}| ${w("-", 9)}| ${w("-", 9)}| ${w("-", 8)}| ${r.status}${r.optional ? " (opsiyonel)" : ""}`);
      continue;
    }
    console.log(
      `${w(r.device, 22)}| ${w(r.key, 30)}| ${w(r.catalogWidth.toFixed(2), 9)}| ` +
        `${w(r.measuredWidth.toFixed(2), 9)}| ${w(r.delta.toFixed(2), 8)}| ${r.drift ? "DRIFT" : "ok"}`
    );
  }
  console.log("\nÖLÇÜLMEYEN BÖLGELER (gizlenmedi):");
  for (const u of rep.unmeasuredRegions) console.log(`  ${u.key}: ${u.reason}`);
  console.log("\nÖZET:", JSON.stringify(rep.summary, null, 2));

  const drifted = rep.rows.filter((r) => r.drift);
  if (drifted.length) {
    console.log("\nSAPMA KÖKENİ — kutuyu belirleyen hesaplanmış CSS:");
    for (const r of drifted.slice(0, 12)) {
      console.log(`\n  ${r.device} · ${r.key}  (katalog ${r.catalogWidth.toFixed(2)} → ölçülen ${r.measuredWidth.toFixed(2)}, fark ${r.delta.toFixed(2)}px)`);
      console.log(`    katalog kaynağı : ${r.renderPoint}`);
      console.log(`    ölçülen eleman  : <${r.tag} class="${r.cls}">`);
      console.log(`    css             : ${JSON.stringify(r.css)}`);
      for (const a of r.ancestors) {
        console.log(`    ata <${a.tag}${a.id ? "#" + a.id : ""}> w=${a.width.toFixed(1)} maxW=${a.maxWidth} pad=${a.padding} cols=${a.gridCols} gap=${a.gap}`);
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(2); });
}
