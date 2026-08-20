import data from "./vendor/simulator_data.js";

/**
 * Yerleşim çözümü — bir bölgenin bir cihazdaki **CSS kutu genişliği**.
 *
 * Kural seti burada TANIMLI DEĞİL: `devices.json` ve `placements.json`
 * `tradehub_core`'dan birebir vendor'lanır (`npm run sync:simulator`), bu
 * dosya yalnız o veriyi çözer. Sayfa adı, kırılım noktası, sütun sayısı —
 * hiçbiri kodda geçmez.
 *
 * Çözüm sırası `srcset.py::box_width` ile birebir aynıdır ve sapma her
 * `npm test`'te ölçülür (`__tests__/srcsetParity.test.js`).
 *
 * **Görev numarası.** Bu iki dosyanın kaynağı T-110'dur ve kaynak dokümanda
 * T-110 **tek** görevdir: *"Cihaz **ve yerleşim** kataloğunun veri olarak
 * tanımı."* İç kayıt bunu bir ara "cihaz kataloğu" ve "yerleşim kataloğu"
 * diye ikiye bölmüştü; burada ve `sync-simulator.mjs` manifestinde kaynağın
 * numarası kullanılıyor (bkz. `docs/reports/31-gorev-numara-hizalama.md`).
 */

export class SimulatorDataError extends Error {
  constructor(message) {
    super(message);
    this.name = "SimulatorDataError";
  }
}

/** 13 referans cihaz — ÖLÇÜLMEDİ, emülasyon değerleri (devices.json §note). */
export const DEVICES = Object.freeze(
  data.devices.devices.map((d) =>
    Object.freeze({
      id: d.id,
      label: d.label,
      deviceClass: d.class || "",
      cssWidth: d.css_viewport.width,
      cssHeight: d.css_viewport.height,
      dpr: d.dpr,
      physicalWidth: d.physical?.width ?? 0,
      physicalHeight: d.physical?.height ?? 0,
      scrollbarPx: d.scrollbar_px ?? 0,
      source: d.source || "",
      why: d.why || "",
    })
  )
);

/** Cihaz verisinin ölçüm durumu — ekran bunu kullanıcıya yazar. */
export const DEVICE_MEASUREMENT = Object.freeze({
  status: data.devices.measurement_status || "",
  note: data.devices.measurement_note || "",
});

export const PLACEMENT_MEASUREMENT = Object.freeze({
  status: data.placements.measurement_status || "",
  note: data.placements.measurement_note || "",
});

export const BREAKPOINTS = Object.freeze({ ...(data.placements.breakpoints || {}) });

/** Ham kapsayıcı tanımları — `sizes` üretimi bunlara ihtiyaç duyar. */
export const CONTAINERS = Object.freeze(data.placements.containers || {});

/** 5 sayfa; her sayfanın bölgeleri ve birincil bölgesi. */
export const PAGES = Object.freeze(
  (data.placements.pages || []).map((p) =>
    Object.freeze({
      page: p.page,
      title: p.title || p.page,
      url: p.url || "",
      primaryRegion: p.primary_region || p.regions?.[0]?.region || "",
      layoutSwitchVw: p.layout_switch_vw ?? null,
      regions: Object.freeze(
        (p.regions || []).map((r) =>
          Object.freeze({
            page: p.page,
            region: r.region,
            key: `${p.page}/${r.region}`,
            title: r.title || r.region,
            slotKey: r.slot_key,
            renderPoint: r.render_point || "",
            lcpCandidate: !!r.lcp_candidate,
            box: r.box || [],
            demandMultiplier: r.demand_multiplier || [],
            derivedFrom: r.derived_from || "",
            multiplierReason: r.multiplier_reason || "",
            anomaly: r.anomaly || "",
            reportDelta: r.report_delta || "",
            codeCommentConflict: r.code_comment_conflict || "",
          })
        )
      ),
    })
  )
);

/** 15 bölgenin tamamı, `placements.json`'daki sırayla. */
export const ALL_REGIONS = Object.freeze(PAGES.flatMap((p) => p.regions));

/** Her sayfanın birincil bölgesi — 5 tane. 13 × 5 = 65 kombinasyon. */
export const PRIMARY_REGIONS = Object.freeze(
  PAGES.map((p) => p.regions.find((r) => r.region === p.primaryRegion)).filter(Boolean)
);

/** Kutusu statik CSS'ten ÇIKARILAMAYAN bölgeler — ekranda gizlenmez, yazılır. */
export const EXCLUDED_REGIONS = Object.freeze(data.placements.excluded_regions || []);

export function deviceById(id) {
  return DEVICES.find((d) => d.id === id) || null;
}

export function regionByKey(key) {
  return ALL_REGIONS.find((r) => r.key === key) || null;
}

// ── Kırılım adımları ──────────────────────────────────────────────────

/**
 * Viewport'a uyan adımların EN BÜYÜK `min_vw`'lisi; yoksa `undefined`.
 *
 * Dışa açık, çünkü çerçeve motoru (`frame.js`) **hangi** adımın kazandığını
 * da göstermek zorunda: ekranda "1024px bandı" yazacaksa o bandı burada
 * seçilen adımdan okumalı, kendi eşleştirmesini yazmamalı. İkinci bir
 * eşleştirme yazmak, kutu genişliğiyle ekranda yazan bandın sessizce
 * ayrışabileceği anlamına gelirdi.
 */
export function matchingStep(steps, viewportPx) {
  let winner;
  for (const s of steps || []) {
    const min = Number(s.min_vw || 0);
    if (viewportPx < min) continue;
    if (!winner || min >= Number(winner.min_vw || 0)) winner = s;
  }
  return winner;
}

function stepValue(steps, viewportPx, key, fallback) {
  const s = matchingStep(steps, viewportPx);
  if (!s) return fallback;
  return s[key] === undefined ? fallback : s[key];
}

function requiredStep(steps, viewportPx) {
  const s = matchingStep(steps, viewportPx);
  if (!s) {
    throw new SimulatorDataError(`${viewportPx}px için eşleşen adım yok (min_vw=0 adımı eksik)`);
  }
  return s;
}

// ── Kapsayıcı ─────────────────────────────────────────────────────────

/**
 * `[maxWidth, düşülenToplam]`. Zincirdeki `base` kapsayıcılar düzleştirilir;
 * iki max-width çakışırsa KÜÇÜK olan bağlayıcıdır.
 */
export function flattenContainer(name, viewportPx) {
  const c = CONTAINERS[name];
  if (!c) throw new SimulatorDataError(`Tanımsız kapsayıcı: ${name}`);
  let mw = null;
  let deduct = 0;
  if (c.base) [mw, deduct] = flattenContainer(c.base, viewportPx);
  else mw = c.max_width ?? null;
  if (c.max_width !== undefined && c.max_width !== null) {
    mw = mw === null ? c.max_width : Math.min(mw, c.max_width);
  }
  deduct += Number(stepValue(c.padding, viewportPx, "px", 0));
  deduct += Number(stepValue(c.subtract, viewportPx, "px", 0));
  return [mw, deduct];
}

/** Kapsayıcının İÇERİK genişliği (padding ve rezerve sütunlar düşülmüş). */
export function containerWidth(name, viewportPx) {
  const [mw, deduct] = flattenContainer(name, viewportPx);
  const w = mw ? Math.min(mw, viewportPx) : viewportPx;
  return Math.max(0, w - deduct);
}

// ── Kutu genişliği ────────────────────────────────────────────────────

/**
 * Bölgenin bu cihazdaki CSS kutu genişliği (px).
 *
 * Desteklenen adım türleri — hepsi VERİDEN gelir:
 *   `px` sabit · `vw_pct` kapsayıcı yüzdesi · `vh_pct` viewport YÜKSEKLİĞİ
 *   yüzdesi (`cap_px` tavanı, `minus_px` düşümü) · `grid` · `slider`.
 */
export function boxWidth(region, device) {
  const step = requiredStep(region.box, device.cssWidth);
  const vw = device.cssWidth;
  let value;

  if ("px" in step) {
    value = Number(step.px);
  } else if ("vw_pct" in step) {
    value = (containerWidth(step.container || "viewport", vw) * Number(step.vw_pct)) / 100;
  } else if ("vh_pct" in step) {
    let raw = (device.cssHeight * Number(step.vh_pct)) / 100;
    if (step.cap_px !== undefined && step.cap_px !== null) raw = Math.min(raw, Number(step.cap_px));
    // `vh_pct` dalı tavanı BURADA uygular ve erken döner — `minus_px` tavandan
    // SONRA düşülür (srcset.py ile aynı sıra).
    return Math.max(0, raw - Number(step.minus_px || 0));
  } else if ("grid" in step) {
    const g = step.grid;
    const box = containerWidth(g.container || "viewport", vw);
    const cols = Number(g.cols);
    value = (box - Number(g.subtract_px || 0) - Number(g.gap || 0) * (cols - 1)) / cols;
  } else if ("slider" in step) {
    const s = step.slider;
    const box = containerWidth(s.container || "viewport", vw);
    const per = Number(s.per_view);
    value = (box - Number(s.subtract_px || 0) - Number(s.space || 0) * (per - 1)) / per;
  } else {
    throw new SimulatorDataError(
      `${region.key}: tanınmayan kutu adımı ${Object.keys(step).sort()}`
    );
  }

  if (step.cap_px !== undefined && step.cap_px !== null)
    value = Math.min(value, Number(step.cap_px));
  return Math.max(0, value);
}

/** Bölgenin bu viewport'taki talep çarpanı (hover-zoom vb.). Yoksa 1. */
export function demandMultiplier(region, device) {
  if (!region.demandMultiplier?.length) return 1;
  return Number(stepValue(region.demandMultiplier, device.cssWidth, "value", 1));
}
