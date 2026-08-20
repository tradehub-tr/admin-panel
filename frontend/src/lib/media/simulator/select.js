import { slotProfiles } from "../crop/slotProfiles.js";

import {
  boxWidth,
  CONTAINERS,
  demandMultiplier,
  flattenContainer,
  SimulatorDataError,
} from "./layout.js";

/**
 * Tarayıcının `srcset` seçiminin simülasyonu.
 *
 * **Taklit edilen davranış** (`srcset.py` ve
 * `media/pipeline/contracts/delivery.py::DeliveryManifest.pick` ile aynı):
 *
 *   1. `sizes` çözülür → efektif kutu genişliği (CSS px),
 *   2. kutu × DPR = gereken piksel genişliği,
 *   3. gerekeni KARŞILAYAN EN KÜÇÜK aday seçilir,
 *   4. hiçbiri karşılamıyorsa EN BÜYÜĞÜ seçilir.
 *
 * **Şartname sapması (kasıtlı):** HTML şartnamesi tarayıcıya takdir hakkı
 * verir — ağ durumu, veri tasarrufu, önbellekte duran daha büyük aday seçimi
 * değiştirebilir. Burası "ideal koşulda hangi basamak" sorusunu yanıtlar,
 * gerçek dağılımı DEĞİL.
 */

export const WARN_SOURCE_INSUFFICIENT = "kaynak_yetersiz";
export const WARN_OVERSHOOT = "asiri_servis";
export const WARN_ZOOM_INSUFFICIENT = "zoom_yetersiz";
export const WARN_NO_PROFILE = "profil_yok";

/** Ölçümün alındığı varsayılan kaynak genişliği (FR-028 upscale yasağı). */
export const DEFAULT_SOURCE_WIDTH = 2160;

/**
 * Slot merdiveni → aday listesi.
 *
 * Profil listesi BURADA TANIMLI DEĞİL: `@/lib/media/crop/slotProfiles.js`
 * kataloğundan okunur, o da `tradehub_core/media/pipeline/policy/slots/*.json`'dan
 * türetilir. `sourceWidth` verilirse kaynaktan geniş basamaklar kaynağa
 * **kelepçelenir** (FR-028) ve aynı genişliğe düşenler tekilleştirilir;
 * kelepçelenen basamak `clampedFrom` taşır — "istendi ama üretilemedi"
 * bilgisi kaybolmasın.
 */
export function renditionsFor(slotKey, sourceWidth = 0) {
  const steps = [];
  for (const p of slotProfiles(slotKey)) {
    if (!p.width) continue;
    let width = Number(p.width);
    let clampedFrom = 0;
    if (sourceWidth && width > sourceWidth) {
      clampedFrom = width;
      width = Math.trunc(sourceWidth);
    }
    steps.push({
      name: p.name,
      width,
      formats: p.formats || [],
      maxOvershoot: p.maxOvershoot ?? null,
      clampedFrom,
      clamped: clampedFrom > 0,
    });
  }
  steps.sort((a, b) => a.width - b.width || a.clampedFrom - b.clampedFrom);
  const unique = [];
  for (const s of steps) {
    if (unique.length && unique[unique.length - 1].width === s.width) continue;
    unique.push(Object.freeze(s));
  }
  return unique;
}

/** Gerekeni karşılayan EN KÜÇÜK aday; yoksa EN BÜYÜĞÜ. Boşsa `null`. */
export function selectRendition(renditions, requiredPx) {
  if (!renditions?.length) return null;
  const sorted = [...renditions].sort((a, b) => a.width - b.width);
  for (const r of sorted) if (r.width >= requiredPx) return r;
  return sorted[sorted.length - 1];
}

/**
 * Tek (cihaz × bölge) kombinasyonu.
 *
 * @returns {object} Ekranın ve parite testinin okuduğu TEK sonuç şekli.
 */
export function simulate(device, region, renditions) {
  const cssBoxPx = boxWidth(region, device);
  const requiredPx = Math.ceil(cssBoxPx * device.dpr);
  const multiplier = demandMultiplier(region, device);
  const chosen = selectRendition(renditions, requiredPx);
  const zoomRequiredPx = Math.ceil(cssBoxPx * device.dpr * multiplier);

  const warnings = [];
  if (!chosen) {
    warnings.push(WARN_NO_PROFILE);
  } else {
    if (chosen.width < requiredPx) warnings.push(WARN_SOURCE_INSUFFICIENT);
    const cap = chosen.maxOvershoot;
    if (cap && requiredPx > 0 && chosen.width / requiredPx > cap) warnings.push(WARN_OVERSHOOT);
    if (multiplier > 1 && chosen.width < zoomRequiredPx) warnings.push(WARN_ZOOM_INSUFFICIENT);
  }

  return {
    key: `${device.id}×${region.key}`,
    device,
    region,
    cssBoxPx,
    dpr: device.dpr,
    requiredPx,
    chosen,
    candidates: renditions,
    demandMultiplier: multiplier,
    zoomRequiredPx,
    zoomSufficient: !!chosen && chosen.width >= zoomRequiredPx,
    sufficient: !!chosen && chosen.width >= requiredPx,
    deficitPx: Math.max(0, requiredPx - (chosen?.width ?? 0)),
    overshoot: chosen && requiredPx > 0 ? chosen.width / requiredPx : 0,
    warnings,
  };
}

/** Tüm (cihaz × bölge) çarpımı. Merdiven slot başına bir kez okunur. */
export function simulateMatrix(devices, regions, sourceWidth = DEFAULT_SOURCE_WIDTH) {
  const cache = new Map();
  const out = [];
  for (const region of regions) {
    if (!cache.has(region.slotKey)) {
      cache.set(region.slotKey, renditionsFor(region.slotKey, sourceWidth));
    }
    const ladder = cache.get(region.slotKey);
    for (const device of devices) out.push(simulate(device, region, ladder));
  }
  return out;
}

/** Toplu sayım — ekranın üst şeridi ve parite raporu bunu okur. */
export function summarize(selections) {
  const pick = (code) => selections.filter((s) => s.warnings.includes(code));
  const insufficient = pick(WARN_SOURCE_INSUFFICIENT);
  const overshoot = pick(WARN_OVERSHOOT);
  const zoom = pick(WARN_ZOOM_INSUFFICIENT);
  const ratios = selections.map((s) => s.overshoot).filter(Boolean);
  const dist = {};
  for (const s of selections) {
    const n = s.chosen?.name ?? "-";
    dist[n] = (dist[n] || 0) + 1;
  }
  return {
    total: selections.length,
    sourceInsufficient: insufficient.length,
    sourceInsufficientKeys: insufficient.map((s) => s.key),
    overshoot: overshoot.length,
    overshootKeys: overshoot.map((s) => s.key),
    zoomInsufficient: zoom.length,
    zoomInsufficientKeys: zoom.map((s) => s.key),
    meanOvershoot: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0,
    maxOvershoot: ratios.length ? Math.max(...ratios) : 0,
    distribution: Object.fromEntries(Object.entries(dist).sort((a, b) => b[1] - a[1])),
  };
}

// ── `sizes` / `srcset` dizgeleri ──────────────────────────────────────

/**
 * Python `f"{x:g}"` ile BİREBİR aynı sayı biçimi.
 *
 * Gerekçe: `12 × (1.4 − 1)` her iki dilde de 4.799999999999999 çıkar. Python
 * `%g` bunu 6 anlamlı haneye indirip "4.8" basar, JS `String()` ham double'ı
 * basar. Aynı `sizes` dizgesini üretmek için biçim de aynı olmalı — sapma
 * parite testinde ölçülür.
 */
function num(x) {
  const f = Number(x);
  return Number.isInteger(f) ? String(f) : String(Number(f.toPrecision(6)));
}

function containerEdges(name, containers) {
  const c = containers[name];
  if (!c) return new Set([0]);
  const edges = new Set();
  for (const s of c.padding || []) edges.add(Number(s.min_vw || 0));
  for (const s of c.subtract || []) edges.add(Number(s.min_vw || 0));
  if (c.base) for (const e of containerEdges(c.base, containers)) edges.add(e);
  return edges.size ? edges : new Set([0]);
}

function containerCss(name, viewportPx, flatten) {
  const [mw, deduct] = flatten(name, viewportPx);
  const base = mw === null ? "100vw" : `min(100vw, ${num(mw)}px)`;
  return deduct ? `${base} - ${num(deduct)}px` : base;
}

function cssLength(step, viewportPx, flatten) {
  let body;
  if ("px" in step) {
    body = `${num(step.px)}px`;
  } else if ("vh_pct" in step) {
    let inner = `${num(step.vh_pct)}vh`;
    if (step.cap_px !== undefined && step.cap_px !== null) {
      inner = `min(${inner}, ${num(step.cap_px)}px)`;
    }
    const minus = Number(step.minus_px || 0);
    return minus ? `calc(${inner} - ${num(minus)}px)` : inner;
  } else if ("vw_pct" in step) {
    const box = containerCss(step.container || "viewport", viewportPx, flatten);
    const ratio = Number(step.vw_pct) / 100;
    if (ratio === 1) {
      // `calc(100vw)` yerine `100vw`: aritmetik yoksa calc sarmalamak gürültü.
      body = !box.includes("-") && !box.includes("+") ? box : `calc(${box})`;
    } else {
      body = `calc((${box}) * ${num(ratio)})`;
    }
  } else if ("grid" in step) {
    const g = step.grid;
    const box = containerCss(g.container || "viewport", viewportPx, flatten);
    const cols = Number(g.cols);
    const cut = Number(g.subtract_px || 0) + Number(g.gap || 0) * (cols - 1);
    body = `calc((${box} - ${num(cut)}px) / ${cols})`;
  } else if ("slider" in step) {
    const s = step.slider;
    const box = containerCss(s.container || "viewport", viewportPx, flatten);
    const per = Number(s.per_view);
    const cut = Number(s.subtract_px || 0) + Number(s.space || 0) * (per - 1);
    body = `calc((${box} - ${num(cut)}px) / ${num(per)})`;
  } else {
    throw new SimulatorDataError(`CSS'e çevrilemeyen adım: ${Object.keys(step).sort()}`);
  }

  if (step.cap_px !== undefined && step.cap_px !== null && !("vh_pct" in step)) {
    body = `min(${num(step.cap_px)}px, ${body})`;
  }
  return body;
}

/** Bölgenin `sizes` dizgesi — kapsayıcı bağlamını kendisi kurar. */
export function sizesFor(region) {
  return sizesAttribute(region, { containers: CONTAINERS, flatten: flattenContainer });
}

/**
 * Bölgenin `sizes` dizgesi — **elle yazılmaz**, kutu kuralından üretilir.
 *
 * Elle yazılmış `sizes`, kırılım noktaları değişince sessizce yanlışa döner.
 * Buradaki dizge CSS'in tek kaynağı olan `placements.json`'dan çıkar.
 * Ardışık bantlar aynı ifadeyi veriyorsa BİRLEŞTİRİLİR.
 *
 * @param {object} region `layout.js`'ten bölge
 * @param {{containers: object, flatten: Function}} ctx
 */
export function sizesAttribute(region, ctx) {
  const { containers, flatten } = ctx;
  const edges = new Set([0]);
  for (const step of region.box) {
    edges.add(Number(step.min_vw || 0));
    for (const key of ["grid", "slider"]) {
      if (key in step) {
        for (const e of containerEdges(step[key].container || "viewport", containers)) edges.add(e);
      }
    }
    if ("vw_pct" in step) {
      for (const e of containerEdges(step.container || "viewport", containers)) edges.add(e);
    }
  }

  const parts = [];
  for (const edge of [...edges].sort((a, b) => a - b)) {
    // `min_vw: 0` bandı 1px'te ölçülür: 0px viewport hiçbir adıma uymaz.
    const probe = Math.max(edge, 1);
    let step;
    for (const s of region.box) {
      const min = Number(s.min_vw || 0);
      if (probe < min) continue;
      if (!step || min >= Number(step.min_vw || 0)) step = s;
    }
    if (!step) throw new SimulatorDataError(`${region.key}: ${probe}px için adım yok`);
    const expr = cssLength(step, probe, flatten);
    if (parts.length && parts[parts.length - 1][1] === expr) continue;
    parts.push([edge, expr]);
  }

  return parts
    .sort((a, b) => b[0] - a[0])
    .map(([edge, expr]) => (edge === 0 ? expr : `(min-width: ${edge}px) ${expr}`))
    .join(", ");
}

/**
 * `<url> <width>w` girdileri. Gerçek URL üretimi bu modülün işi DEĞİL —
 * `media/pipeline/contracts/delivery.py::derivative_key` tek kaynaktır;
 * şablon yalnız çıktıyı okunur kılar.
 */
export function srcsetAttribute(renditions, urlTemplate = "{name}.webp") {
  return [...renditions]
    .sort((a, b) => a.width - b.width)
    .map(
      (r) =>
        `${urlTemplate.replace("{name}", r.name).replace("{width}", String(r.width))} ${r.width}w`
    )
    .join(", ");
}
