/**
 * Yükleme öncesi slot kontrolü — T-091'in "preflight" kapısı.
 *
 * **Bu dosya SAF.** Ne DOM'a ne ağa dokunuyor: girdisi ölçülmüş bir dosya
 * tarifi, çıktısı bulgu listesi. Ölçüm `probe.js`'in işi (tarayıcı/işçi),
 * karar burada — böylece kural `node --test` altında tarayıcı kurmadan
 * koşabiliyor ve ölçüm katmanı değişse bile kural sabit kalıyor.
 *
 * **Sebep kodları UYDURULMADI.** `tradehub_core/media/pipeline/contracts/
 * errors.py` içindeki `SEBEP_*` sabitlerinin aynısı kullanılıyor
 * (`megapixel_bomb`, `short_edge_too_small`, `ratio_not_allowed`…). Ekranda
 * gösterilen sebeple sunucunun döndüğü sebep aynı kelime olsun diye; ayrı bir
 * sözlük uydurmak, iki tarafın aynı reddi iki farklı isimle anlatması demekti.
 *
 * **Eşik karşılaştırmaları referans uygulamayla birebir.**
 * `tradehub_core/media/pipeline/fakes/policy.py` `check_image` / `check_video`
 * neyi nasıl karşılaştırıyorsa aynısı: megapiksel `>` ile reddedilir, kısa
 * kenar `<` ile (eşitlik GEÇERLİ — FR-015), oran sapması en yakın hedefe göre
 * `> tolerans`, bit hızı tavanı REDDETMEZ yalnız UYARIR (transcode zaten
 * düşürüyor).
 *
 * **Ölçülemeyen ne reddedilir ne sessizce geçer.** Tarayıcı dosyayı
 * çözemediyse (bozuk, desteklenmeyen codec, AVIF/HEIC) karar `manual_review`
 * olur ve bulgu listesine `probe_unavailable` düşer. "Ölçemedim" ile "kural
 * sağlandı" aynı şey değil; ikisini birbirine karıştırmak ön kontrolü
 * yalancı yapardı — sunucu yine bakacak.
 */

import { SLOT_POLICIES, VENDOR_MANIFEST } from "./vendor/slotPolicy.js";

export { VENDOR_MANIFEST };

/** Bulgunun ağırlığı. `block` yüklemeyi başlatmaz. */
export const SEVERITY = {
  BLOCK: "block",
  WARN: "warn",
  INFO: "info",
};

/** Slot kararı — `tradehub_core/.../contracts/errors.py` ACTION_* karşılığı. */
export const ACTION = {
  ACCEPT: "accept",
  REJECT: "reject",
  MANUAL_REVIEW: "manual_review",
};

/**
 * Sebep kodları — sunucudaki `SEBEP_*` sabitlerinin AYNISI.
 * Kaynak: `tradehub_core/media/pipeline/contracts/errors.py:41-69`.
 */
export const REASON = {
  MIME_NOT_ALLOWED: "mime_not_allowed",
  EXT_NOT_ALLOWED: "ext_not_allowed",
  EXT_CONTENT_MISMATCH: "ext_content_mismatch",
  TOO_LARGE: "too_large",
  EMPTY: "empty",
  DANGEROUS_CONTENT: "dangerous_content",
  MEGAPIXEL_BOMB: "megapixel_bomb",
  ANIMATED_NOT_ALLOWED: "animated_not_allowed",
  SHORT_EDGE_TOO_SMALL: "short_edge_too_small",
  AREA_TOO_SMALL: "area_too_small",
  RATIO_NOT_ALLOWED: "ratio_not_allowed",
  COUNT_EXCEEDED: "count_exceeded",
  ALPHA_LOST: "alpha_lost",
  UNDER_SPEC: "under_spec",
  DURATION_OUT_OF_RANGE: "duration_out_of_range",
  BITRATE_EXCEEDED: "bitrate_exceeded",
  DECODE_FAILED: "decode_failed",
  PROBE_UNAVAILABLE: "probe_unavailable",
  POLICY_NOT_FOUND: "policy_not_found",
};

const KATALOG = new Map(SLOT_POLICIES.map((s) => [s.slotKey, s]));

/** Bilinen slot anahtarları. */
export function slotKeys() {
  return SLOT_POLICIES.map((s) => s.slotKey);
}

/** Slot politikası — bilinmiyorsa `null`. */
export function getSlotPolicy(slotKey) {
  return KATALOG.get(slotKey) || null;
}

/** Rolün kullanabileceği slotlar — yükleyicideki slot seçicisi bunu kullanır. */
export function slotsForRole(role) {
  if (!role) return SLOT_POLICIES.slice();
  return SLOT_POLICIES.filter((s) => s.roles.includes(role));
}

/** "16:9" → 1.777… ; çözülemezse `null`. */
export function ratioValue(label) {
  const m = String(label || "").match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!h) return null;
  return w / h;
}

/**
 * En yakın izinli orana göre bağıl sapma.
 *
 * Sunucudaki formülün aynısı: `min(|ar - hedef| / hedef)`. Mutlak fark
 * kullanılsaydı 1:1 için 0,02 ile 3:1 için 0,02 aynı şeyi ifade etmezdi.
 */
export function ratioDeviation(aspectRatio, labels) {
  const hedefler = (labels || []).map(ratioValue).filter((v) => v && v > 0);
  if (!aspectRatio || !hedefler.length) return null;
  return Math.min(...hedefler.map((h) => Math.abs(aspectRatio - h) / h));
}

function bulgu(reason, severity, params = {}) {
  return { reason, severity, params };
}

/** Ölçüm nesnesini eksiksizleştir — türetilebilenleri türet. */
export function normalizeMeasure(measure = {}) {
  const m = { ...measure };
  const w = Number(m.width) || 0;
  const h = Number(m.height) || 0;
  if (w > 0 && h > 0) {
    m.width = w;
    m.height = h;
    m.shortEdge = Math.min(w, h);
    m.longEdge = Math.max(w, h);
    m.area = w * h;
    m.aspectRatio = w / h;
    m.megapixels = (w * h) / 1_000_000;
  } else {
    m.width = null;
    m.height = null;
    m.shortEdge = null;
    m.longEdge = null;
    m.area = null;
    m.aspectRatio = null;
    m.megapixels = null;
  }
  const boyut = Number(m.size) || 0;
  const sure = Number(m.durationS) || 0;
  // Bit hızı ÖLÇÜLMÜYOR, kestiriliyor: dosya boyutu ses dâhil her şeyi
  // kapsıyor, bu yüzden gerçek video bit hızından yüksek çıkar. Uyarı için
  // yeterli, ret için değil — zaten ret sebebi değil.
  m.bitrateBps = boyut && sure ? Math.round((boyut * 8) / sure) : null;
  m.ext = String(m.ext || "").toLowerCase();
  return m;
}

/**
 * Ölçülmüş dosyayı slot politikasına vur.
 *
 * @param {object} measure `probe.js` çıktısı (ya da testte elle kurulmuş eş şekil).
 * @param {object} opts `{ slotKey, count }` — `count` bu slota giden TOPLAM
 *   dosya sayısı (kuyruktakiler + kayıtlı olanlar), `max_count` için.
 * @returns {{action: string, findings: Array, slot: object|null, measure: object}}
 */
export function evaluate(measure, { slotKey = "", count = 1 } = {}) {
  const m = normalizeMeasure(measure);
  const slot = getSlotPolicy(slotKey);
  const findings = [];

  if (!slot) {
    // Slotsuz yükleme geçerli bir kullanım: medya kütüphanesine serbest
    // yükleme slot seçmiyor. O yolda sunucunun genel politikası (uzantı +
    // bayt + tehlikeli içerik) `utils/uploadPolicy.js` üzerinden uygulanıyor;
    // burada yalnız ölçümün kendisi raporlanır.
    if (slotKey) findings.push(bulgu(REASON.POLICY_NOT_FOUND, SEVERITY.INFO, { slotKey }));
    return { action: ACTION.ACCEPT, findings, slot: null, measure: m };
  }

  const { accept, require: req, video } = slot;

  // ── accept katmanı: dosyaya bakmadan bilinenler ────────────────────

  if (!m.size) findings.push(bulgu(REASON.EMPTY, SEVERITY.BLOCK));

  if (m.ext && accept.rejectedExtensions.includes(m.ext)) {
    findings.push(bulgu(REASON.EXT_NOT_ALLOWED, SEVERITY.BLOCK, { ext: m.ext }));
  } else if (m.ext && accept.conditionalExtensions.includes(m.ext)) {
    // Koşullu uzantı (bugün yalnız `.svg`, logo slotlarında): sunucu ek
    // koşullar arıyor, istemci onları göremiyor. Reddetmek yanlış olurdu,
    // sessizce geçirmek de — uyarı bırakılıyor.
    findings.push(bulgu(REASON.EXT_NOT_ALLOWED, SEVERITY.WARN, { ext: m.ext, conditional: true }));
  } else if (m.ext && accept.extensions.length && !accept.extensions.includes(m.ext)) {
    findings.push(
      bulgu(REASON.EXT_NOT_ALLOWED, SEVERITY.BLOCK, {
        ext: m.ext,
        allowed: accept.extensions.join(", "),
      })
    );
  }

  // MIME yalnız tarayıcı bir tür verdiyse bakılır. Boş `type` sık görülür
  // (bilinmeyen uzantı, bazı işletim sistemlerinden sürükle-bırak) ve boşluğu
  // ihlal saymak geçerli dosyaları keserdi.
  if (m.mime && accept.mime.length && !accept.mime.includes(m.mime)) {
    findings.push(
      bulgu(REASON.MIME_NOT_ALLOWED, SEVERITY.BLOCK, {
        mime: m.mime,
        allowed: accept.mime.join(", "),
      })
    );
  }

  const baytSiniri = m.ext === ".svg" && accept.maxBytesSvg ? accept.maxBytesSvg : accept.maxBytes;
  if (baytSiniri && m.size > baytSiniri) {
    findings.push(
      bulgu(REASON.TOO_LARGE, SEVERITY.BLOCK, {
        size: m.size,
        limit: baytSiniri,
        sizeMb: (m.size / 1048576).toFixed(1),
        limitMb: (baytSiniri / 1048576).toFixed(1),
      })
    );
  }

  if (m.dangerous) findings.push(bulgu(REASON.DANGEROUS_CONTENT, SEVERITY.BLOCK));

  // Uzantı ile imza uyuşmazlığı REDDETMEZ — sunucu da reddetmiyor
  // (`upload_policy.check`, "zararsız uyuşmazlık" notu). Yalnız iz bırakır.
  if (m.sniffed && m.ext && !signatureMatches(m.ext, m.sniffed)) {
    findings.push(
      bulgu(REASON.EXT_CONTENT_MISMATCH, SEVERITY.WARN, { ext: m.ext, sniffed: m.sniffed })
    );
  }

  // ── ölçüm katmanı ──────────────────────────────────────────────────

  const olculdu = m.decoded === true && m.width && m.height;
  if (!olculdu) {
    // Ölçemedik. Ne "geçti" ne "kaldı" — sunucu bakacak.
    findings.push(
      bulgu(m.decodeFailed ? REASON.DECODE_FAILED : REASON.PROBE_UNAVAILABLE, SEVERITY.WARN, {
        kind: slot.kind,
      })
    );
    return { action: karar(findings, ACTION.MANUAL_REVIEW), findings, slot, measure: m };
  }

  if (accept.maxMegapixelsHard && m.megapixels > accept.maxMegapixelsHard) {
    findings.push(
      bulgu(REASON.MEGAPIXEL_BOMB, SEVERITY.BLOCK, {
        measured: Number(m.megapixels.toFixed(2)),
        limit: accept.maxMegapixelsHard,
      })
    );
  }

  if (m.animated === true && accept.allowAnimated === false) {
    findings.push(bulgu(REASON.ANIMATED_NOT_ALLOWED, SEVERITY.BLOCK, {}));
  }

  if (slot.kind === "video") {
    videoBulgulari(m, video, findings);
  } else {
    goreselBulgulari(m, req, findings);
  }

  if (req.maxCount && count > req.maxCount) {
    findings.push(bulgu(REASON.COUNT_EXCEEDED, SEVERITY.BLOCK, { count, limit: req.maxCount }));
  }

  return { action: karar(findings, ACTION.ACCEPT), findings, slot, measure: m };
}

function goreselBulgulari(m, req, findings) {
  // `>=` geçerli — FR-015. `<` ile reddediliyor, sunucudaki karşılaştırmanın aynısı.
  if (req.minShortEdge && m.shortEdge < req.minShortEdge) {
    findings.push(
      bulgu(REASON.SHORT_EDGE_TOO_SMALL, SEVERITY.BLOCK, {
        measured: m.shortEdge,
        limit: req.minShortEdge,
      })
    );
  }
  if (req.maxShortEdge && m.shortEdge > req.maxShortEdge) {
    findings.push(
      bulgu(REASON.UNDER_SPEC, SEVERITY.BLOCK, { measured: m.shortEdge, limit: req.maxShortEdge })
    );
  }
  if (req.minArea && m.area < req.minArea) {
    findings.push(
      bulgu(REASON.AREA_TOO_SMALL, SEVERITY.BLOCK, { measured: m.area, limit: req.minArea })
    );
  }
  if (req.maxEdge && m.longEdge > req.maxEdge) {
    findings.push(
      bulgu(REASON.UNDER_SPEC, SEVERITY.BLOCK, { measured: m.longEdge, limit: req.maxEdge })
    );
  }

  if (req.allowedRatios.length) {
    const sapma = ratioDeviation(m.aspectRatio, req.allowedRatios);
    const tolerans = req.ratioTolerance ?? 0.02;
    if (sapma !== null && sapma > tolerans) {
      findings.push(
        bulgu(REASON.RATIO_NOT_ALLOWED, SEVERITY.BLOCK, {
          measured: `${m.width}:${m.height}`,
          allowed: req.allowedRatios.join(", "),
        })
      );
    }
  }

  if (req.aspectBand) {
    const oran = m.width / m.height;
    const { minWOverH: alt, maxWOverH: ust } = req.aspectBand;
    if ((alt && oran < alt) || (ust && oran > ust)) {
      findings.push(
        bulgu(REASON.RATIO_NOT_ALLOWED, SEVERITY.BLOCK, {
          measured: oran.toFixed(2),
          allowed: `${alt}–${ust}`,
        })
      );
    }
  }

  // Düşük çözünürlük REDDETMEZ. Politika bunu ayrı bir eşik olarak veriyor
  // (`low_resolution_warn_below`) — kabul sınırının üstünde ama önerilenin
  // altında kalan logo bulanık basılır; kullanıcı bunu bilmeli.
  if (req.lowResolutionWarnBelow && m.shortEdge < req.lowResolutionWarnBelow) {
    findings.push(
      bulgu(REASON.UNDER_SPEC, SEVERITY.WARN, {
        measured: m.shortEdge,
        recommended: req.recommendedEdge || req.lowResolutionWarnBelow,
      })
    );
  }

  // Alfa: politikada bugün hepsi `optional`. `required` gelirse blok olur.
  if (req.alphaChannel === "required" && m.hasAlpha === false) {
    findings.push(bulgu(REASON.ALPHA_LOST, SEVERITY.BLOCK, {}));
  } else if (req.alphaChannel === "optional" && m.hasAlpha === false) {
    findings.push(bulgu(REASON.ALPHA_LOST, SEVERITY.INFO, {}));
  }
}

function videoBulgulari(m, video, findings) {
  if (!video) return;

  if (m.durationS == null) {
    findings.push(bulgu(REASON.PROBE_UNAVAILABLE, SEVERITY.WARN, { field: "duration" }));
  } else {
    const alt = video.durationMinS;
    const ust = video.durationMaxS;
    if ((alt && m.durationS < alt) || (ust && m.durationS > ust)) {
      findings.push(
        bulgu(REASON.DURATION_OUT_OF_RANGE, SEVERITY.BLOCK, {
          measured: Math.round(m.durationS),
          min: alt || 0,
          max: ust || 0,
        })
      );
    }
  }

  const asgari = video.resolutionMin;
  if (asgari && (m.width < asgari.width || m.height < asgari.height)) {
    findings.push(
      bulgu(REASON.SHORT_EDGE_TOO_SMALL, SEVERITY.BLOCK, {
        measured: `${m.width}×${m.height}`,
        limit: `${asgari.width}×${asgari.height}`,
      })
    );
  }
  const azami = video.resolutionMax;
  if (azami && (m.width > azami.width || m.height > azami.height)) {
    findings.push(
      bulgu(REASON.UNDER_SPEC, SEVERITY.BLOCK, {
        measured: `${m.width}×${m.height}`,
        limit: `${azami.width}×${azami.height}`,
      })
    );
  }

  // Bit hızı tavanı REDDETMEZ: sunucudaki transcode zaten düşürüyor
  // (`fakes/policy.py` ACTION_WARN, "transcode zaten düşürecek — ret değil").
  if (video.bitrateCapKbps && m.bitrateBps && m.bitrateBps > video.bitrateCapKbps * 1000) {
    findings.push(
      bulgu(REASON.BITRATE_EXCEEDED, SEVERITY.WARN, {
        measured: Math.round(m.bitrateBps / 1000),
        limit: video.bitrateCapKbps,
      })
    );
  }

  if (video.frameRateAccepted.length && m.frameRate) {
    const yakin = video.frameRateAccepted.some((f) => Math.abs(f - m.frameRate) < 1);
    if (!yakin) {
      findings.push(
        bulgu(REASON.UNDER_SPEC, SEVERITY.WARN, {
          measured: Math.round(m.frameRate),
          allowed: video.frameRateAccepted.join(", "),
        })
      );
    }
  }
}

/**
 * Uzantı ile imza uyumu — `upload_policy._UYUM` tablosunun aynısı.
 * Tabloda olmayan uzantı (AVIF/HEIC) uyuşmazlık SAYILMAZ.
 */
const IMZA_UYUM = {
  ".jpg": ["jpeg"],
  ".jpeg": ["jpeg"],
  ".png": ["png"],
  ".gif": ["gif"],
  ".bmp": ["bmp"],
  ".webp": ["webp"],
  ".tif": ["tiff"],
  ".tiff": ["tiff"],
  ".pdf": ["pdf"],
  ".zip": ["zip"],
  ".mp4": ["mp4"],
  ".m4v": ["mp4"],
  ".mov": ["mp4"],
  ".webm": ["webm"],
};

export function signatureMatches(ext, sniffed) {
  const beklenen = IMZA_UYUM[ext];
  return !beklenen || beklenen.includes(sniffed);
}

function karar(findings, varsayilan) {
  if (findings.some((f) => f.severity === SEVERITY.BLOCK)) return ACTION.REJECT;
  return varsayilan;
}

/** Bulgu listesinde yüklemeyi durduran var mı. */
export function hasBlocker(findings) {
  return (findings || []).some((f) => f.severity === SEVERITY.BLOCK);
}
