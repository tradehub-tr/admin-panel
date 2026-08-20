import { computed, ref } from "vue";

import { cropWarnings, hasBlocker } from "@/lib/media/crop/cropWarnings";
import {
  applyRatioKeepingCenter,
  arrowDelta,
  moveWindow,
  resizeWindow,
} from "@/lib/media/crop/cropHandles";
import {
  clamp,
  clampWindow,
  cropWindow,
  focalFromWindow,
  rect,
  roundWindow,
  zoomBase,
  zoomFromBase,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/lib/media/crop/geometry";
import { CONFIDENCE_THRESHOLD } from "@/lib/media/crop/focusSuggest";
import { ratioOptions, slotProfiles } from "@/lib/media/crop/slotProfiles";
import { useCropHistory } from "@/composables/useCropHistory";

/** `api/media_crop.py::INTENT_METHODS` — şema Select'i, pencere sözlüğü DEĞİL. */
export const INTENT_METHODS = ["manual", "smartcrop", "center"];

/**
 * `Media Crop Intent` sözleşmesinin panel tarafındaki **birebir yazımı**.
 *
 * Kaynak kurallar (uydurulmadı, üç dosyadan okundu):
 *
 * | Kural | Sunucudaki yeri |
 * |---|---|
 * | `focal_x/y`, `safe_area.*`, `overrides[].*`, `confidence` 0-1 dışıysa **400** | `pipeline/api/envelope.py::require_unit` |
 * | `focal_x` ve `focal_y` BİRLİKTE verilir | `pipeline/api/crop.py::save_intent` |
 * | `method` yalnız `manual\|smartcrop\|center` | `api/media_crop.py::INTENT_METHODS` |
 * | `overrides[].profile` slotun TANIMLI profillerinden biri olmalı | `pipeline/api/crop.py::_parse_overrides` |
 * | aynı profil iki kez override alamaz | aynı yer |
 * | kutu `w<=0 \|\| h<=0 \|\| x+w>1+1e-6 \|\| y+h>1+1e-6` ise **400** | `_parse_overrides` / `_parse_safe_area` |
 *
 * **Sunucu yetkilidir, bu bir ikinci doğruluk kaynağı DEĞİLDİR.** Kontrol
 * kasıtlı olarak sunucunun ALT KÜMESİDİR: burada geçen bir yükün sunucuda
 * reddedilmesi mümkündür (kiracı sınırı, bilinmeyen varlık, `If-Match`), ama
 * tersi olmamalıdır — burada reddedilen bir yük sunucuda da reddedilir.
 * Varlık sebebi tek: aralık dışı bir yükü "kaydedildi" sanıp göndermek yerine
 * gönderilmeden durdurmak, ve reddin sebebini kullanıcının çizdiği kadraj hâlâ
 * ekrandayken söylemek.
 *
 * @param {object} payload `savePayload` çıktısı (`asset` ile ya da onsuz).
 * @param {object} [opts]
 * @param {string} [opts.slotKey] Verilirse `overrides[].profile` slotun profil
 *   listesine karşı doğrulanır. Verilmezse profil adı yalnız boş olmadığı için
 *   kontrol edilir — bilinmeyen slotta "tanımlı değil" demek yanlış olurdu.
 * @returns {string[]} Bulgular; boş dizi = sözleşmeye uygun.
 */
export function validateIntentPayload(payload, { slotKey = "" } = {}) {
  const hatalar = [];
  if (!payload || typeof payload !== "object") return ["yük boş"];

  const birim = (deger, alan) => {
    const n = Number(deger);
    if (!Number.isFinite(n)) hatalar.push(`${alan} bir sayı olmalı`);
    else if (n < 0 || n > 1) hatalar.push(`${alan} 0 ile 1 arasında olmalı (INV-10): ${n}`);
  };

  const kutu = (r, ad) => {
    birim(r?.x, `${ad}.x`);
    birim(r?.y, `${ad}.y`);
    birim(r?.w, `${ad}.w`);
    birim(r?.h, `${ad}.h`);
    const { x, y, w, h } = r || {};
    if ([x, y, w, h].every((v) => Number.isFinite(Number(v)))) {
      if (Number(w) <= 0 || Number(h) <= 0) hatalar.push(`${ad} sıfır alanlı`);
      else if (Number(x) + Number(w) > 1 + 1e-6 || Number(y) + Number(h) > 1 + 1e-6) {
        hatalar.push(`${ad} kaynağın dışına taşıyor`);
      }
    }
  };

  const varX = payload.focal_x !== undefined && payload.focal_x !== null;
  const varY = payload.focal_y !== undefined && payload.focal_y !== null;
  if (varX !== varY) hatalar.push("`focal_x` ve `focal_y` birlikte verilmeli");
  if (varX && varY) {
    birim(payload.focal_x, "focal_x");
    birim(payload.focal_y, "focal_y");
  }

  // Zoom üçlüsü — sunucu kuralları `pipeline/api/crop.py::save_intent`:
  // üçü birlikte verilir; zoom [ZOOM_MIN, ZOOM_MAX] dışıysa 400.
  const varZ = payload.zoom !== undefined && payload.zoom !== null;
  const varCX = payload.center_x !== undefined && payload.center_x !== null;
  const varCY = payload.center_y !== undefined && payload.center_y !== null;
  if (varZ !== varCX || varZ !== varCY) {
    hatalar.push("`zoom`, `center_x` ve `center_y` birlikte verilmeli");
  }
  if (varZ) {
    const z = Number(payload.zoom);
    if (!Number.isFinite(z)) hatalar.push("zoom bir sayı olmalı");
    else if (z < ZOOM_MIN || z > ZOOM_MAX) {
      hatalar.push(`zoom ${ZOOM_MIN} ile ${ZOOM_MAX} arasında olmalı: ${z}`);
    }
  }
  if (varCX) birim(payload.center_x, "center_x");
  if (varCY) birim(payload.center_y, "center_y");

  if (payload.confidence !== undefined && payload.confidence !== null) {
    birim(payload.confidence, "confidence");
  }

  if (payload.method && !INTENT_METHODS.includes(payload.method)) {
    hatalar.push(
      `bilinmeyen kırpma yöntemi: ${payload.method} (izin verilenler: ${INTENT_METHODS.join(", ")})`
    );
  }

  // Boş sözlük "sil" demektir ve geçerlidir; dolu sözlük kutu kurallarına tabi.
  const guvenli = payload.safe_area;
  if (guvenli && Object.keys(guvenli).length) kutu(guvenli, "safe_area");

  const bilinen = slotKey ? new Set(slotProfiles(slotKey).map((p) => p.name)) : null;
  const gorulen = new Set();
  for (const satir of payload.overrides || []) {
    const profil = satir?.profile;
    if (!profil || typeof profil !== "string") {
      hatalar.push("`overrides[].profile` zorunlu (Link → Media Profile)");
      continue;
    }
    if (bilinen && bilinen.size && !bilinen.has(profil)) {
      hatalar.push(`\`${profil}\` bu slotta tanımlı bir profil değil`);
    }
    if (gorulen.has(profil)) hatalar.push(`aynı profil için iki kırpım verildi: ${profil}`);
    gorulen.add(profil);
    kutu(satir, `overrides[${profil}]`);
  }

  return hatalar;
}

/**
 * Crop Studio durumu — üç koordinat uzayının buluştuğu tek yer.
 *
 * | Uzay | Birim | Kim sahibi |
 * |---|---|---|
 * | Kaynak pikseli | px, tam çözünürlük | `crop_geometry` girdi/çıktısı |
 * | Ekran pikseli  | px, CSS/DPR çarpanlı | bileşen (burada DEĞİL) |
 * | Normalize 0-1  | oransız | kaydedilen niyet (INV-10) |
 *
 * **Bu composable ekran pikseli görmez.** Bileşen fareyi kaynak pikseline
 * çevirir, buraya öyle verir. Karıştırılırsa hata sessizdir.
 *
 * ### Pencere niçin saklanmıyor
 *
 * `base = zoomBase(zoom, center)` ve `win = cropWindow(base, targetAR, focal)`
 * her ikisi de TÜRETİLMİŞ. Saklanan yedi sayı: zoom, center×2, focal×2,
 * lockedAR, overrideRect. Geçmiş yığınına giren de tam olarak bunlar.
 *
 * ### Tutamak çekmesi ikiye ayrılır
 *
 * - **Oran kilitliyken** pencere `cropWindow`'un çıktısıdır; küçültmek
 *   zoom'u artırmakla aynı şeydir. Tutamak çekmesi zoom + odak olarak geri
 *   yazılır, override GEREKMEZ.
 * - **Serbest kırpmada** kullanıcı profilin oranını bozan bir kadraj çizmiş
 *   olur; bu odakla ifade edilemez ve `crop.py` zincirinin **1. seviyesi**
 *   (`Media Crop Override`) devreye girer. `overrideRect` normalize saklanır.
 */

/**
 * @param {object} opts
 * @param {{width:number, height:number}} opts.source Kaynak pikseli.
 * @param {string} opts.slotKey
 * @param {object} [opts.probe]  `{ mode, hasAlpha }` — yoksa ilgili uyarı üretilmez.
 * @param {boolean} [opts.slotMismatch]
 * @param {function} [opts.now]  Saat — testler enjekte eder.
 * @param {string} [opts.asset]  `Media Asset` adı. Boşsa kaydetme kapalıdır.
 * @param {function} [opts.saveIntent]  Kaydetme çağrısı — testler enjekte eder;
 *   verilmezse `lib/media/crop/cropIntentApi.js` dinamik olarak yüklenir.
 */
export function useCropStudio({
  source,
  slotKey,
  probe = null,
  slotMismatch = false,
  now,
  asset = "",
  saveIntent = null,
}) {
  const sourceW = Number(source?.width) || 0;
  const sourceH = Number(source?.height) || 0;
  const usable = sourceW > 0 && sourceH > 0;

  const options = ratioOptions(slotKey);

  const zoom = ref(1);
  const centerX = ref(0.5);
  const centerY = ref(0.5);
  const focalX = ref(0.5);
  const focalY = ref(0.5);
  /** Profilden gelen hedef oran; `null` = serbest. Etiketten DEĞİL, sayıdan. */
  const lockedAR = ref(options[0]?.targetAR ?? null);
  const overrideRect = ref(null);

  /** Öneri rozeti — kullanıcı kadraja dokununca düşer (`approved_by_user=1`). */
  const suggestion = ref(null);
  const approvedByUser = ref(false);

  /**
   * Ayarlama kipi — arayüzde AÇIK seçici (T-105 kullanıcı isteği).
   *
   * - `"manual"` (varsayılan): kullanıcı tutamakla/oranla/zoom'la kadrajı
   *   kendi kurar. Herhangi bir elle jest kipi buraya çeker (`touched`).
   * - `"auto"`: otomatik odak önerisi (smartcrop) uygulanır. `applySuggestion`
   *   kipi buraya çeker.
   *
   * Kip ayrı bir durum: `savePayload.method` zaten önerinin VARLIĞINDAN
   * türüyor (`smartcrop`/`manual`); bu bayrak o türetmeyi bozmadan arayüzdeki
   * seçicinin hangi kipte olduğunu tutar ve iki üreticinin (öneri / elle)
   * hangisinin son sözü söylediğini görünür kılar.
   */
  const mode = ref("manual");
  function setMode(value) {
    if (value === "auto" || value === "manual") mode.value = value;
  }

  const snapshotState = () => ({
    zoom: zoom.value,
    centerX: centerX.value,
    centerY: centerY.value,
    focalX: focalX.value,
    focalY: focalY.value,
    lockedAR: lockedAR.value,
    overrideRect: overrideRect.value,
  });

  const history = useCropHistory(snapshotState(), now ? { now } : undefined);

  function restore(snap) {
    if (!snap) return;
    zoom.value = snap.zoom;
    centerX.value = snap.centerX;
    centerY.value = snap.centerY;
    focalX.value = snap.focalX;
    focalY.value = snap.focalY;
    lockedAR.value = snap.lockedAR;
    overrideRect.value = snap.overrideRect;
  }

  // ── Türetilmiş geometri ────────────────────────────────────────

  const base = computed(() =>
    usable ? zoomBase(sourceW, sourceH, zoom.value, centerX.value, centerY.value) : null
  );

  const win = computed(() => {
    if (!base.value) return null;
    const o = overrideRect.value;
    if (o) {
      // Normalize → kaynak pikseli. Küçültülmüş bir kopyada da aynı yere düşsün
      // diye override normalize saklanır (INV-10 ile aynı gerekçe).
      return clampWindow(
        rect(o.x * sourceW, o.y * sourceH, o.w * sourceW, o.h * sourceH),
        base.value
      );
    }
    return cropWindow(sourceW, sourceH, base.value, lockedAR.value, focalX.value, focalY.value);
  });

  /** Tam piksel kutusu — sunucunun keseceği kutunun ta kendisi. */
  const pixelBox = computed(() => (win.value ? roundWindow(win.value, sourceW, sourceH) : null));

  // ── ÖNCE / SONRA — oran zorlamasını kaydetmeden ÖNCE göster ─────────
  //
  // Rapor 65'in "C/E sapması": kullanıcı SERBEST bir dikdörtgen çizer,
  // sunucu ise profilin oranına (kare/1:1 vb.) ZORLAR
  // (`pipeline/api/crop.py::_fit_ratio_keeping_center`, T-041). Panel serbest
  // kutuyu gösterip sunucu oran-uyumlu kutuyu üretince kullanıcı kaydettikten
  // SONRA sürprizle karşılaşıyordu. Oran zorunlu kalır (ürün kararı, T-105),
  // ama sonucu ÖNCEDEN göstermek bu kaybı kapatır.
  //
  // "Sonra" ikinci bir uygulama DEĞİLDİR: `applyRatioKeepingCenter` yalnız
  // `ratioFit`/`clampWindow` (yani `crop_geometry` vendor'ı) çağırır ve
  // merkezi koruyarak oranı oturtur — sunucunun `_fit_ratio_keeping_center`
  // adımının aynısı. Vendor'a DOKUNULMAZ, yalnız çağrılır.

  /**
   * Sunucunun bu kadraja dayatacağı hedef oran.
   *
   * Oran kilitliyse o oran; serbest kırpmada slotun İLK kırpılabilir
   * profilinin oranı (kaydedince override o profilleri bağlar ve sunucu bu
   * oranı zorlar). Hiç kırpılabilir profil yoksa `null` — zorlama yok.
   */
  const effectiveTargetAR = computed(() => {
    if (lockedAR.value !== null && lockedAR.value !== undefined) return lockedAR.value;
    const first = options.find((o) => o.targetAR !== null && o.targetAR !== undefined);
    return first ? first.targetAR : null;
  });

  /**
   * "Sonra" penceresi — sunucunun oran zorlamasından SONRAKİ kadraj.
   *
   * Kilitli kipte `win` zaten oran-uyumludur, dolayısıyla `afterWin ≈ win`
   * (before = after, sürpriz yok). Serbest kipte kullanıcının çizdiği
   * dikdörtgen oran-uyumlu değilse merkez korunarak oturtulur ve ikisi
   * görünür biçimde ayrışır.
   */
  const afterWin = computed(() => {
    if (!win.value || !base.value) return null;
    const ar = effectiveTargetAR.value;
    if (ar === null || ar === undefined) return win.value;
    return applyRatioKeepingCenter(win.value, base.value, ar);
  });

  /** "Sonra" kutusunun tam piksel karşılığı — sunucunun keseceği kutu. */
  const afterPixelBox = computed(() =>
    afterWin.value ? roundWindow(afterWin.value, sourceW, sourceH) : null
  );

  /**
   * Oran zorlaması "önce" ile "sonra"yı gerçekten ayırıyor mu.
   *
   * 1 kaynak pikselinden büyük her fark önemli sayılır: `roundWindow` bunu
   * zaten tam piksele yuvarlıyor, altındaki gürültü kadrajı kaydırmaz. Fark
   * yoksa arayüz "önce = sonra" der ve gereksiz bir uyarı basmaz.
   */
  const ratioForced = computed(() => {
    const a = afterPixelBox.value;
    const b = pixelBox.value;
    if (!a || !b) return false;
    return a.some((v, i) => Math.abs(v - b[i]) > 1);
  });

  /**
   * Güvenli alan — kadrajın içinden çıkarılacağı bölge, 0-1 normalize.
   *
   * **Bu, stüdyonun `base` bölgesinin ta kendisidir** ve keşif değil ölçüm:
   * stüdyo pencereyi `cropWindow(sw, sh, base, targetAR, focal)` ile kuruyor,
   * sunucu ise 2. seviyede `_cover_window(safe, target_ratio, src_ratio,
   * focal)` ile. İki fonksiyonun yapısı aynı (T-100 çapraz tutarlılık testi
   * ikisinin aynı pencerede buluştuğunu 1500 girdide ölçtü), yani
   * `safe = base / (sourceW, sourceH)` yazmak sunucunun kullanıcının GÖRDÜĞÜ
   * pencereyi yeniden üretmesi demektir.
   *
   * **Bugüne kadarki kayıp:** yük yalnız odak taşıyordu; sunucu 3. seviyeye
   * (odak, taban = tam kare) düşüyordu ve kullanıcının yakınlaştırması
   * sessizce ATILIYORDU. Yakınlaştırılmış bir kadraj kaydedilip tam kare
   * olarak geri geliyordu. Bugün yük zoom üçlüsünü de taşıyor (aşağıda,
   * `savePayload`) ve sunucu ikisi de varken üçlüyü tercih ediyor; bu kutu
   * eski istemciler/okuyucular için türetilmiş yazım olarak kalır.
   *
   * `null` = tam kare. `safe_region_of` tam kadrajı "belirtilmemiş" sayıyor
   * (dokümanı: "her yer güvenli" ile "güvenli alan yok" aynı kapıya çıkar);
   * panel de aynı ayrımı yapar ki 1× yakınlaştırmada 2. ve 3. seviye aynı
   * pencereyi versin.
   */
  const safeArea = computed(() => {
    const b = base.value;
    if (!b) return null;
    const r = normalize(b);
    const tamKare =
      Math.abs(r.x) < 1e-6 &&
      Math.abs(r.y) < 1e-6 &&
      Math.abs(r.w - 1) < 1e-6 &&
      Math.abs(r.h - 1) < 1e-6;
    return tamKare ? null : r;
  });

  const warnings = computed(() =>
    cropWarnings({
      sourceW,
      sourceH,
      win: win.value,
      slotKey,
      probe,
      slotMismatch,
      focal: { x: focalX.value, y: focalY.value },
      suggestion: suggestion.value,
    })
  );
  const blocked = computed(() => hasBlocker(warnings.value));

  // ── Jestler ────────────────────────────────────────────────────
  // Hepsi kaynak pikseli konuşur. Geçmişe yazma `endGesture`'da, jest başına bir kez.

  function touched() {
    if (suggestion.value && !approvedByUser.value) approvedByUser.value = true;
    // Elle bir jest oldu: seçici bunu "Manuel" olarak yansıtmalı, aksi hâlde
    // "Otomatik" yazan bir düğmenin altında kullanıcı kendi kadrajını çizerdi.
    mode.value = "manual";
  }

  function dragBody(dx, dy) {
    if (!win.value) return;
    const moved = moveWindow({ win: win.value, base: base.value, dx, dy });
    if (overrideRect.value) {
      overrideRect.value = normalize(moved);
    } else {
      // Saklanan pencere değil ODAKTIR. Kenar sıkıştırma devredeyken birden
      // çok odak aynı pencereyi verir; merkez tek kararlı seçimdir.
      const f = focalFromWindow(moved, sourceW, sourceH);
      focalX.value = f.x;
      focalY.value = f.y;
    }
    touched();
  }

  function dragHandle(handle, dx, dy) {
    if (!win.value) return;
    const next = resizeWindow({
      win: win.value,
      base: base.value,
      handle,
      dx,
      dy,
      targetAR: lockedAR.value,
    });

    if (lockedAR.value === null || lockedAR.value === undefined) {
      // Serbest: oran bozulabilir, odak bunu ifade edemez → override.
      overrideRect.value = normalize(next);
      touched();
      return;
    }

    // Kilitli: küçültmek = yakınlaştırmak. Pencere/taban oranı sabit olduğu
    // için yeni taban genişliği doğrudan orantıdan gelir, ardından
    // `zoomFromBase` kaydırıcıyı senkronlar.
    const impliedBaseW = (next.w * base.value.w) / win.value.w;
    zoom.value = zoomFromBase(sourceW, sourceH, rect(0, 0, impliedBaseW, 1));
    const f = focalFromWindow(next, sourceW, sourceH);
    focalX.value = f.x;
    focalY.value = f.y;
    centerX.value = f.x;
    centerY.value = f.y;
    touched();
  }

  /** Odak ayrı bir tutamaktır; pencere ona göre yeniden merkezlenir. */
  function dragFocal(nx, ny) {
    focalX.value = clamp(nx, 0, 1);
    focalY.value = clamp(ny, 0, 1);
    overrideRect.value = null;
    touched();
  }

  /** Pan — boşlukta sürükleme. Taban bölge kayar, kadraj niyeti değişmez. */
  function pan(dx, dy) {
    if (!usable) return;
    centerX.value = clamp(centerX.value + dx / sourceW, 0, 1);
    centerY.value = clamp(centerY.value + dy / sourceH, 0, 1);
    touched();
  }

  function setZoom(value) {
    zoom.value = clamp(Number(value) || ZOOM_MIN, ZOOM_MIN, ZOOM_MAX);
    touched();
  }

  /**
   * Klavye ince ayarı. Ok tuşları 1 px, `Shift` 10 px — KAYNAK pikseli.
   * @returns {boolean} Tuş tüketildi mi.
   */
  function nudge(handle, key, fast = false) {
    const d = arrowDelta(key, fast);
    if (!d) return false;
    if (handle === "body") dragBody(d.dx, d.dy);
    else if (handle === "focal")
      dragFocal(focalX.value + d.dx / sourceW, focalY.value + d.dy / sourceH);
    else dragHandle(handle, d.dx, d.dy);
    // Ok tuşları birleşir: 20 adımlık geçmiş 20 piksellik ince ayara gitmesin.
    history.commit(snapshotState(), `nudge:${handle}:${key}`);
    return true;
  }

  function toggleLock() {
    if (lockedAR.value === null || lockedAR.value === undefined) {
      const ar = options[0]?.targetAR ?? null;
      lockedAR.value = ar;
      if (ar !== null && overrideRect.value && win.value) {
        // Kilit kapanırken pencere SIÇRAMASIN: merkez korunarak oturtulur.
        overrideRect.value = null;
        const fitted = applyRatioKeepingCenter(win.value, base.value, ar);
        const f = focalFromWindow(fitted, sourceW, sourceH);
        focalX.value = f.x;
        focalY.value = f.y;
      }
    } else {
      lockedAR.value = null;
    }
    endGesture("lock");
  }

  function setRatio(targetAR) {
    lockedAR.value = targetAR ?? null;
    overrideRect.value = null;
    endGesture("ratio");
  }

  function applySuggestion(s) {
    if (!s) return;
    suggestion.value = s;
    approvedByUser.value = false;
    overrideRect.value = null;
    focalX.value = clamp(s.x, 0, 1);
    focalY.value = clamp(s.y, 0, 1);
    // Öneri uygulandı: seçici "Otomatik" konumuna geçer. `endGesture` sonra
    // gelir çünkü `touched` çağrılmıyor — öneri elle bir jest değildir.
    mode.value = "auto";
    endGesture("suggest");
  }

  function reset() {
    zoom.value = 1;
    centerX.value = 0.5;
    centerY.value = 0.5;
    focalX.value = 0.5;
    focalY.value = 0.5;
    lockedAR.value = options[0]?.targetAR ?? null;
    overrideRect.value = null;
    suggestion.value = null;
    approvedByUser.value = false;
    mode.value = "manual";
    history.reset(snapshotState());
  }

  /** Jest sonu — geçmişe TAM BİR adım yazılır. */
  function endGesture(label = null) {
    return history.commit(snapshotState(), label);
  }

  function undo() {
    restore(history.undo());
  }
  function redo() {
    restore(history.redo());
  }

  function normalize(r) {
    return { x: r.x / sourceW, y: r.y / sourceH, w: r.w / sourceW, h: r.h / sourceH };
  }

  // ── Kaydetme ───────────────────────────────────────────────────

  /**
   * Öneri yöntem etiketini şemanın iki alanına ayırır.
   *
   * `focusSuggest.METHOD` = `"edge_energy_v1"`. Bu bir **algoritma adıdır**,
   * `Media Crop Intent.method` değeri DEĞİL: spec'in Select'i yalnız
   * `manual | smartcrop | center` tanır ve alan "niyetin kaynağı"nı söyler.
   * Algoritmanın kimliği için spec'te ayrı iki alan var — `algorithm` ve
   * `algorithm_version`. Etiketi olduğu gibi `method`e yazmak, sunucudan 400
   * almak demekti (uç şema vokabülerine göre doğruluyor).
   */
  function splitAlgorithm(s) {
    // Öneri kendi künyesini taşıyorsa (sunucu yanıtı ya da yeni istemci yolu)
    // etiket ayrıştırılmaz — ayrıştırma yalnız eski/çıplak `method` etiketi
    // için kalan bir yedektir.
    if (s?.algorithm) {
      return { algorithm: String(s.algorithm), version: String(s.algorithmVersion || "") };
    }
    const m = /^(.+)_(v\d+)$/.exec(String(s?.method || ""));
    return m
      ? { algorithm: m[1], version: m[2] }
      : { algorithm: String(s?.method || ""), version: "" };
  }

  /**
   * Override'ın uygulanacağı profiller.
   *
   * `Media Crop Override.profile` bir Link'tir (→ `Media Profile`) ve sunucu
   * bilinmeyen profili REDDEDİYOR (`pipeline/api/crop.py::_parse_overrides`).
   * Panel eskiden buraya `slot_key` yazıyordu — slot bir profil değildir, o
   * yük hiçbir zaman kabul edilmezdi.
   *
   * Oran kilitliyken override yalnız O oranı paylaşan profilleri bağlar.
   * Serbest kırpmada kullanıcı hiçbir profilin oranına uymayan bir kadraj
   * çizmiştir; niyeti "gördüğüm her yerde bu kadraj" olduğu için slotun tüm
   * kırpılabilir profilleri bağlanır.
   */
  const overrideProfiles = computed(() => {
    const opt = options.find((o) => o.targetAR === lockedAR.value);
    return opt ? opt.profiles : options.flatMap((o) => o.profiles);
  });

  /**
   * `Media Crop Intent` sözleşmesine göre yük. **Yeni alan icat edilmez.**
   *
   * Koordinatlar 0-1 normalize (INV-10); sunucu aralık dışını REDDEDER,
   * kelepçelemez.
   */
  const savePayload = computed(() => {
    if (!win.value) return null;
    const s = suggestion.value;
    const alg = s ? splitAlgorithm(s) : null;
    const o = overrideRect.value;
    return {
      focal_x: Number(focalX.value.toFixed(6)),
      focal_y: Number(focalY.value.toFixed(6)),
      // Boş sözlük "güvenli alanı SİL" demektir (`_parse_safe_area`), `null`
      // ise "dokunma". Panel niyetin tamamının sahibi olduğu için tam karede
      // SİLER: eski bir yakınlaştırmadan kalan güvenli alan, kullanıcının
      // şimdi çizdiği kadrajı sessizce daraltırdı.
      safe_area: safeArea.value ? kutuYuvarla(safeArea.value) : {},
      // Zoom üçlüsü — kadrajın NİYETİ. `safe_area` bu üçlüden TÜRETİLMİŞ
      // kutudur ve 6 basamağa yuvarlanır; sunucu ikisi de varken üçlüyü
      // tercih eder (`core/crop.py::resolve_crop`) ve pencereyi stüdyonun
      // `cropWindow(zoomBase(zoom, center), AR, focal)` kurulumuyla birebir
      // yeniden kurar. Yalnız odak göndermenin bedeli ölçülmüştü:
      // `cropPixelParity` B sınıfı 119/120 sapıyordu (7391 px'e kadar).
      // 6 basamak: 1e-6'lık zoom hatası 8688 px kaynakta bile ~0,005 px.
      zoom: Number(zoom.value.toFixed(6)),
      center_x: Number(centerX.value.toFixed(6)),
      center_y: Number(centerY.value.toFixed(6)),
      // Öneri devredeyse niyetin kaynağı smartcrop'tur; algoritma adı AYRI alanda.
      method: s ? "smartcrop" : "manual",
      algorithm: alg ? alg.algorithm : "",
      algorithm_version: alg ? alg.version : "",
      confidence: s ? Number(s.confidence.toFixed(4)) : 1,
      approved_by_user: s ? (approvedByUser.value ? 1 : 0) : 1,
      overrides: o ? overrideProfiles.value.map((profile) => ({ profile, ...kutuYuvarla(o) })) : [],
    };
  });

  /**
   * Normalize kutuyu 6 basamağa yuvarlar ve kaynağın DIŞINA taşırmaz.
   *
   * Yuvarlamanın kendisi `x + w`yi 1'in birkaç ULP'si kadar aşırabilir; sunucu
   * `x + w > 1 + 1e-6` durumunu reddediyor ve haklı olarak reddediyor. Burada
   * kelepçelenen şey KULLANICININ GİRDİSİ DEĞİL, yuvarlama artığıdır: değer
   * zaten aralıktaydı, `toFixed` onu çıkardı. Aralık dışı gerçek bir girdi
   * `validateIntentPayload`'da yakalanır ve gönderilmez.
   */
  function kutuYuvarla(r) {
    const x = Number(clamp(r.x, 0, 1).toFixed(6));
    const y = Number(clamp(r.y, 0, 1).toFixed(6));
    return {
      x,
      y,
      w: Number(Math.min(clamp(r.w, 0, 1), 1 - x).toFixed(6)),
      h: Number(Math.min(clamp(r.h, 0, 1), 1 - y).toFixed(6)),
    };
  }

  /**
   * Kaydetme mümkün mü.
   *
   * Üç koşul: kaydedilecek bir varlık kimliği var, kaynak ölçülebildi ve
   * politika engeli yok. Engelli kadrajı kaydetmek, profilin isteyeceği
   * pikselden küçük bir kutuyu kalıcılaştırmak olurdu.
   */
  /**
   * Yükün sözleşmeye aykırı yanları. Boş dizi = gönderilebilir.
   *
   * Ayrı bir computed olması bilinçli: kaydet düğmesi kapalıyken kullanıcı
   * SEBEBİNİ görebilmeli. "Kaydet çalışmıyor" ile "odak 1,4 — piksel
   * göndermişsin" arasındaki fark, kullanıcının sorunu çözebilmesidir.
   */
  const payloadIssues = computed(() =>
    savePayload.value ? validateIntentPayload(savePayload.value, { slotKey }) : ["kadraj yok"]
  );

  const saveAvailable = computed(
    () => Boolean(asset) && usable && !blocked.value && payloadIssues.value.length === 0
  );

  const saving = ref(false);
  const saveError = ref(null);
  const savedAt = ref(null);

  /** Kaydetme ucu — panelin sunucuya dokunduğu tek çağrı. */
  const endpoint = {
    doctype: "Media Crop Intent",
    method: "tradehub_core.api.media_crop.save_intent",
    fields: [
      "asset (Link → Media Asset)",
      "focal_x, focal_y (Float, 0-1)",
      // Uç parametresi bir KUTU (`safe_area: {x,y,w,h}`); DocType kolonları
      // `safe_x/y/w/h`. `safe_top/right/bottom/left` diye bir şey YOK — kutu
      // ile kenar boşluğu farklı gösterimlerdir (bkz. rapor 37 §2.1).
      "safe_area = {x, y, w, h} (Float, 0-1) → safe_x/safe_y/safe_w/safe_h",
      // Zoom üçlüsü birlikte gider; safe_area bu üçlünün türetilmiş kutusudur.
      "zoom (Float, 1-16), center_x, center_y (Float, 0-1)",
      "method (Select: manual/smartcrop/center), algorithm, algorithm_version",
      "confidence (Float), approved_by_user (Check)",
      "overrides (Table → Media Crop Override: profile, x, y, w, h)",
    ],
  };

  /**
   * Niyeti kaydeder. Çağıran `saveAvailable` false iken çağırmamalı.
   *
   * Hata YUTULMAZ: `saveError` doldurulur ve istisna yeniden fırlatılır ki
   * kabuk kullanıcıya gerçek sebebi gösterebilsin. Sessiz başarısızlık,
   * kullanıcının kaydettiğini sanıp kaydetmemesi demektir.
   */
  async function save(ek = null) {
    if (!asset || !usable || blocked.value || !savePayload.value) return null;

    // Sözleşme kapısı ÇAĞRIDAN ÖNCE: aralık dışı bir koordinat ya da bu
    // slotta tanımlı olmayan bir profil sunucuya hiç gitmez. Sunucu bunları
    // zaten 400 ile reddediyor (`require_unit`, `_parse_overrides`); burada
    // durdurmanın kazancı, reddin sebebini kullanıcının kadrajı hâlâ
    // ekrandayken ve tek bir cümlede söyleyebilmek.
    const bulgular = payloadIssues.value;
    if (bulgular.length) {
      saveError.value = bulgular.join(" · ");
      throw new Error(saveError.value);
    }

    saving.value = true;
    saveError.value = null;
    try {
      const gonder =
        saveIntent || (await import("@/lib/media/crop/cropIntentApi.js")).saveCropIntent;
      // `ek` — kadrajın kendisine ait OLMAYAN, aynı niyet kaydına yazılan
      // alanlar (T-114 `previewed_placements`). Ayrı bir çağrı yapılmaz:
      // `save_intent` gönderilmeyen alanı `None` yazdığı için ikinci bir
      // yazma, ilkinin odak noktasını silerdi.
      const sonuc = await gonder({ asset, ...savePayload.value, ...(ek || {}) });
      savedAt.value = Date.now();
      return sonuc;
    } catch (err) {
      saveError.value = err?.message || String(err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  return {
    // durum
    zoom,
    centerX,
    centerY,
    focalX,
    focalY,
    lockedAR,
    overrideRect,
    suggestion,
    approvedByUser,
    mode,
    setMode,
    // türetilmiş
    base,
    win,
    pixelBox,
    effectiveTargetAR,
    afterWin,
    afterPixelBox,
    ratioForced,
    warnings,
    blocked,
    options,
    usable,
    sourceW,
    sourceH,
    // geçmiş
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyDepth: history.depth,
    undo,
    redo,
    endGesture,
    // jestler
    dragBody,
    dragHandle,
    dragFocal,
    pan,
    setZoom,
    nudge,
    toggleLock,
    setRatio,
    applySuggestion,
    reset,
    // kalıcılaştırma
    safeArea,
    savePayload,
    payloadIssues,
    saveAvailable,
    save,
    saving,
    saveError,
    savedAt,
    endpoint,
    overrideProfiles,
    CONFIDENCE_THRESHOLD,
  };
}
