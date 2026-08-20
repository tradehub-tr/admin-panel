import { computed, reactive, toValue } from "vue";

import { ALL_REGIONS, DEFAULT_SOURCE_WIDTH, DEVICES, simulateMatrix } from "@/lib/media/simulator";

/**
 * T-114 — onay kapısı ve `previewed_placements` kaydı.
 *
 * ## Kapının ne olduğu (ve ne OLMADIĞI)
 *
 * Bu kapı **beyan** toplar, kanıt değil. Görünürlük takibi istemcidedir ve
 * kandırılabilir: DevTools'ta bir `IntersectionObserver` geri çağrısı elle
 * tetiklenebilir. Kapının gücü teknik zorlamadan değil, "gördüm" beyanının
 * kullanıcı + zaman damgasıyla denetim kaydına yazılmasından gelir. Kaynak
 * plan bu sınırı açıkça istiyor (`docs/ui/faz11-simulator.md` §4 "Risk").
 *
 * ## Sunucu tarafı kapı ARTIK VAR — ölçüldü (2026-08-20, T-114)
 *
 * İki katman: uç deposu (`api/media_crop.py`, `MEDIA_PREVIEW_REQUIRED`) ve
 * DocType `validate` (ORM yüzeyi). Gerçek HTTP ölçümü: kanıtsız
 * `approved_by_user=1` → **417** + MEDIA_PREVIEW_REQUIRED; kanıtlıyla → 200.
 * Ayara bağlı değil. Ayrıntı: docs/reports/65-be3-zoom-kapi.md.
 *
 * Sunucunun DOĞRULAYAMADIĞI şey hâlâ var ve bu composable'ın sınırı orası:
 * `dwell_ms`/görünürlük İSTEMCİ BEYANIDIR — sunucu yalnız kanıt gövdesinin
 * şeklini ve zorunlu (bölge × cihaz sınıfı) kapsamasını zorlayabilir, sürenin
 * gerçekten geçtiğini kanıtlayamaz. "Görünürlük takibi kanıt değil beyandır"
 * cümlesi bu yüzden ekranda durmaya devam ediyor.
 *
 * ## `overrides` yoluna BAĞLANMAZ — bilinçli
 *
 * `save_intent`'in `overrides` yolu ölçüldü ve **her zaman 417** dönüyor:
 * `Media Crop Override.profile` bir `Link → Media Profile`tır ve
 * `product.image:w384` biçiminde adlandırılmış docname bekler; kütüphane ise
 * slot içi kısa adı (`w384`) bekler — iki katman AYRI sözlük konuşuyor
 * (`docs/reports/41-t080-api-sozlesme.md` §4). Bu yüzden buradan gönderilen
 * yükte `overrides` anahtarı **bulunmaz**; varsa `withPreviewedPlacements()`
 * hata fırlatır. Kırık yolu sessizce kullanmak, kapının kendisini 417'ye
 * bağlamak olurdu.
 */

/** Görünürlük eşiği — kutunun en az bu oranı ekranda olmalı. */
export const VISIBILITY_RATIO = 0.5;

/** Kalma eşiği — kutu bu süre boyunca eşiğin üstünde kalmalı. */
export const DWELL_MS = 1000;

/** `Media Crop Intent`'teki alan adı. Panelde ikinci bir ad uydurulmaz. */
export const PREVIEW_FIELD = "previewed_placements";

/** Kapının kullanıcıya söylediği engel türleri. */
export const BLOCK_NO_REQUIREMENTS = "gereklilik_yok";
export const BLOCK_MISSING_PLACEMENT = "yerlesim_gorulmedi";
export const BLOCK_UNACKNOWLEDGED_WARNING = "uyari_kabul_edilmedi";

const reqId = (regionKey, deviceClass) => `${regionKey}|${deviceClass}`;

/**
 * Kırpma niyeti yüküne `previewed_placements` ekler. **Saf fonksiyon.**
 *
 * @param {object} base `asset` ve mevcut niyet alanlarını taşıyan yük.
 *   Alan **eksiltilmez**: `save_intent` gönderilmeyen alanı `None` yazar, yani
 *   yalnız `previewed_placements` göndermek kayıtlı odak noktasını SİLERDİ.
 * @param {Array} placements `previewedPlacements` çıktısı.
 * @returns {object} Form-encode edilmeye hazır yük.
 */
export function withPreviewedPlacements(base, placements) {
  if (!base || typeof base !== "object") {
    throw new TypeError("previewed_placements tek başına gönderilemez: mevcut niyet yükü gerekli.");
  }
  if (!base.asset) {
    throw new TypeError("previewed_placements yükünde `asset` zorunlu.");
  }
  if ("overrides" in base) {
    // Bkz. modül başlığı: `overrides` yolu uçtan uca 417 dönüyor.
    throw new TypeError("`overrides` bu yola bağlanmaz — uç 417 döndürüyor (rapor 41 §4).");
  }
  return { ...base, [PREVIEW_FIELD]: JSON.stringify(placements) };
}

/**
 * Onay kapısının durumu.
 *
 * @param {object} [options]
 * @param {Array|Function} [options.devices] Cihaz listesi (varsayılan 13 cihaz).
 * @param {Array|Function} [options.regions] Bölge listesi (varsayılan 15 bölge).
 * @param {number|Function} [options.sourceWidth] Kaynak genişliği (FR-028).
 * @param {Function} [options.now] Zaman kaynağı — testte enjekte edilir.
 */
export function useSimulatorApproval(options = {}) {
  const devices = computed(() => toValue(options.devices) || DEVICES);
  const regions = computed(() => toValue(options.regions) || ALL_REGIONS);
  const sourceWidth = computed(() => toValue(options.sourceWidth) || DEFAULT_SOURCE_WIDTH);
  const now = options.now || (() => Date.now());

  /**
   * Zorunlu bölgeler: `lcp_candidate` işaretli olanlar.
   *
   * Ayrı bir liste TUTULMAZ — bayrak `placements.json`'da zaten var
   * (`docs/ui/faz11-simulator.md` §4). İkinci bir liste, CSS değişince
   * sessizce bayatlardı.
   */
  const requiredRegions = computed(() => regions.value.filter((r) => r.lcpCandidate));

  /** Yerleşim SINIFLARI = cihaz sınıfları (phone / tablet / laptop / desktop). */
  const deviceClasses = computed(() => {
    const out = [];
    for (const d of devices.value)
      if (d.deviceClass && !out.includes(d.deviceClass)) out.push(d.deviceClass);
    return out;
  });

  /** Zorunlu (bölge × cihaz sınıfı) çiftleri. */
  const requirements = computed(() =>
    requiredRegions.value.flatMap((region) =>
      deviceClasses.value.map((deviceClass) => ({
        id: reqId(region.key, deviceClass),
        region,
        deviceClass,
        devices: devices.value.filter((d) => d.deviceClass === deviceClass),
      }))
    )
  );

  /** Görülen kayıtlar — anahtar `bölge|cihazSınıfı`. */
  const seen = reactive({});

  /** Kabul edilen uyarı kodları. */
  const acknowledged = reactive({});

  /**
   * Bir yerleşimi "görüldü" say.
   *
   * Aynı çift için ikinci kayıt gelirse **daha uzun kalma** kazanır: kullanıcı
   * kutuya geri döndüğünde denetim kaydındaki süre kısalmamalı.
   */
  function markSeen(region, device, dwellMs = DWELL_MS) {
    if (!region || !device) return null;
    const id = reqId(region.key, device.deviceClass);
    const prev = seen[id];
    if (prev && prev.dwell_ms >= dwellMs) return prev;
    seen[id] = {
      page: region.page,
      region: region.region,
      placement: region.key,
      device: device.id,
      device_class: device.deviceClass,
      ts: new Date(now()).toISOString(),
      dwell_ms: Math.round(dwellMs),
    };
    return seen[id];
  }

  /**
   * Görünürlük takibi: kutu `%50` görünür VE `1 sn` ekranda kalırsa "görüldü".
   *
   * `IntersectionObserver` yoksa (SSR, Node koşucusu) **hiçbir şey işaretlenmez**
   * ve sessizce boş bir durdurucu döner: kapının yokluğunda kendiliğinden
   * açılması, kapıyı olmamasından daha kötü yapardı.
   *
   * @returns {Function} Gözlemi durduran fonksiyon.
   */
  function observe(el, { region, device }) {
    const w = typeof window === "undefined" ? null : window;
    if (!el || !w || typeof w.IntersectionObserver !== "function") return () => {};
    let timer = null;
    let start = 0;
    const io = new w.IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry.intersectionRatio >= VISIBILITY_RATIO) {
          if (timer) return;
          start = now();
          timer = w.setTimeout(() => {
            timer = null;
            markSeen(region, device, now() - start);
          }, DWELL_MS);
          return;
        }
        if (timer) {
          w.clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, VISIBILITY_RATIO, 1] }
    );
    io.observe(el);
    return () => {
      if (timer) w.clearTimeout(timer);
      io.disconnect();
    };
  }

  /** Uyarı üreten kombinasyonlar — zorunlu bölgelerin tamamı taranır. */
  const warnedSelections = computed(() =>
    simulateMatrix(devices.value, requiredRegions.value, sourceWidth.value).filter(
      (s) => s.warnings.length > 0
    )
  );

  /** Açık kabul isteyen uyarı kodları ve kaç kombinasyonda çıktığı. */
  const warningCodes = computed(() => {
    const counts = new Map();
    for (const s of warnedSelections.value) {
      for (const code of s.warnings) counts.set(code, (counts.get(code) || 0) + 1);
    }
    return [...counts.entries()].map(([code, count]) => ({
      code,
      count,
      acknowledged: !!acknowledged[code],
    }));
  });

  function acknowledge(code, value = true) {
    acknowledged[code] = !!value;
  }

  const missing = computed(() => requirements.value.filter((r) => !seen[r.id]));

  const progress = computed(() => ({
    done: requirements.value.length - missing.value.length,
    total: requirements.value.length,
  }));

  /** Kapının açılmasını engelleyen her şey — düğme sebebini SÖYLER. */
  const blockers = computed(() => {
    const out = [];
    if (requirements.value.length === 0) {
      // Vakumda açılan bir kapı, kapı değildir.
      out.push({ code: BLOCK_NO_REQUIREMENTS, count: 0 });
    }
    if (missing.value.length) {
      out.push({ code: BLOCK_MISSING_PLACEMENT, count: missing.value.length });
    }
    const pending = warningCodes.value.filter((w) => !w.acknowledged);
    if (pending.length) {
      out.push({
        code: BLOCK_UNACKNOWLEDGED_WARNING,
        count: pending.length,
        codes: pending.map((w) => w.code),
      });
    }
    return out;
  });

  const canPublish = computed(() => blockers.value.length === 0);

  /** `previewed_placements` alanının değeri — sunucuya giden şekil. */
  const previewedPlacements = computed(() =>
    requirements.value.map((r) => seen[r.id]).filter(Boolean)
  );

  /**
   * Denetim kaydı. Kullanıcı adı BURADA YAZILMAZ — oturumu sunucu bilir;
   * istemcinin yazdığı bir kullanıcı alanı denetimde kanıt sayılmaz.
   */
  const auditRecord = computed(() => ({
    ts: new Date(now()).toISOString(),
    threshold: { ratio: VISIBILITY_RATIO, dwell_ms: DWELL_MS },
    previewed_placements: previewedPlacements.value,
    acknowledged_warnings: Object.keys(acknowledged).filter((c) => acknowledged[c]),
  }));

  /** Sunucuya gidecek yükün önizlemesi — ekran bunu `<details>` içinde gösterir. */
  function buildPayload(base) {
    return withPreviewedPlacements(base, previewedPlacements.value);
  }

  /**
   * Kaydı gönderir. Kapı kapalıysa **istek atılmaz**.
   *
   * `saveIntent` enjekte edilebilir: testler ağ katmanına hiç girmez
   * (`cropIntentApi.js` başlığındaki aynı gerekçe — `@/utils/api` modül
   * düzeyinde `import.meta.env` okuyor, Node koşucusunda import edilemez).
   */
  async function submit(base, saveIntent) {
    if (!canPublish.value) {
      const err = new Error("MEDIA_PREVIEW_REQUIRED");
      err.blockers = blockers.value;
      throw err;
    }
    const payload = buildPayload(base);
    if (saveIntent) return saveIntent(payload);
    const [{ SAVE_METHOD }, { default: apiClient }] = await Promise.all([
      import("@/lib/media/crop/cropIntentApi.js"),
      import("@/utils/api"),
    ]);
    const res = await apiClient.callMethod(SAVE_METHOD, payload);
    return res?.message ?? res;
  }

  return {
    // gereklilikler
    requiredRegions,
    deviceClasses,
    requirements,
    missing,
    progress,
    // izleme
    seen,
    markSeen,
    observe,
    // uyarılar
    warnedSelections,
    warningCodes,
    acknowledge,
    acknowledged,
    // karar
    blockers,
    canPublish,
    // kayıt
    previewedPlacements,
    auditRecord,
    buildPayload,
    submit,
  };
}
