import { clamp } from "./geometry.js";

/**
 * Otomatik odak ÖNERİSİ — **yer tutucu**, ve öyle işaretlenmiştir.
 *
 * `crop.py` zincirinin 4. seviyesi (`smartcrop`) `suggested_*` alanlarını okur
 * ve `confidence >= SMARTCROP_CONFIDENCE_THRESHOLD` ise kullanır. **Bugünkü
 * gerçek: saliency modeli YOK** (Faz 3 mimarisinde AI Worker (L5)). T-105
 * kapsamında model YAZILMAZ; yazılan şey arayüz ve ucuz bir taban öneridir.
 *
 * Yöntem: küçültülmüş gri tonlamalı bitmap üzerinde kenar enerjisi (Sobel'e
 * benzer, ayrık fark) ve enerjinin ağırlık merkezi. **Yüz/nesne tespiti
 * DEĞİLDİR** ve arayüzde öyle sunulmaz — rozet metni "otomatik öneri",
 * "yüz bulundu" değil.
 *
 * Güven değeri gerçekten hesaplanır (sabit `0.9` yazmak eşiği anlamsız
 * kılardı): enerjinin ne kadar toplandığının ölçüsü — ağırlık merkezinin
 * çevresindeki yarıçapta biriken enerji payı. Dağınık enerji → düşük güven.
 *
 * **KALİBRE EDİLMEDİ.** Eşiğin (`0.5`) bu ölçüyle ne kadar uyumlu olduğu
 * ölçülmedi; T-041'den devralınan not aynen geçerli.
 */

/** `crop.py::SMARTCROP_CONFIDENCE_THRESHOLD` ile aynı sayı. ÖLÇÜLMEDİ. */
export const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Eşik kalibre edildi mi. **Hayır** — ve bu bilgi kullanıcıdan GİZLENMEZ.
 *
 * Sunucu aynı gerçeği yanıtında `threshold_calibrated: false` alanıyla
 * taşıyor (`pipeline/api/crop.py::FocalSuggestion.calibrated`, varsayılan
 * `False`). Panel de aynı bayrağı taşır ve `cropWarnings` bunu bir INFO
 * uyarısına çevirir; "güven %89" yazan bir rozetin yanında eşiğin ölçülmemiş
 * olduğunu söylememek, sayıya hak etmediği bir yetke vermek olurdu.
 */
export const THRESHOLD_CALIBRATED = false;

/**
 * Öneri yöntemi etiketi. `algorithm` + `algorithm_version` alanlarına AYRILIR;
 * `Media Crop Intent.method` Select'i yalnız `manual|smartcrop|center` tanır.
 */
export const METHOD = "edge_energy_v1";

/**
 * `reason` sözlüğü — sunucununkiyle aynı dizgeler
 * (`pipeline/api/crop.py::REASON_*`). `SAMPLE_TOO_SMALL` yalnız istemcide
 * oluşur (küçültülmüş bitmap 3 pikselden dar); sunucuda karşılığı yok ve
 * uydurulmuş bir sunucu sebebi yerine kendi adıyla taşınır.
 */
export const REASON = {
  MEASURED: "measured",
  FLAT: "no_edge_energy",
  NO_SOURCE: "source_unavailable",
  PILLOW: "pillow_unavailable",
  SAMPLE_TOO_SMALL: "sample_too_small",
};

/** Öneriyi kimin ürettiği. İki üretici farklı sayı verir; provenans saklanmaz. */
export const SOURCE = { CLIENT: "client", SERVER: "server" };

/**
 * Sunucunun `suggest_focal` yanıtını stüdyonun öneri şekline çevirir.
 *
 * **Neden sunucu tercih edilir:** `focal_from_bytes` EXIF rotasyonunu uygular
 * ve 32×32 LANCZOS ızgarada ölçer; buradaki istemci yolu tarayıcının çözdüğü
 * bitmap üzerinde 96 px genişlikte çalışır. İki sayı aynı değildir ve hangisi
 * kullanıldıysa `source` alanında saklanır. İstemci yolu yalnız yedektir
 * (varlık kimliği yoksa ya da uç erişilemezse).
 *
 * **Algoritma sürümü uydurulmaz:** sunucu kendi algoritmasına isim vermiyor,
 * yalnız `grid` parametresini bildiriyor. Etiket o parametreden kurulur
 * (`edge_energy_grid32`); ızgara değişirse etiket kendiliğinden değişir.
 *
 * @param {object} body `tradehub_core.api.media_crop.suggest_focal` gövdesi.
 * @returns {object|null} Öneri ya da ölçüm okunamadıysa `null`.
 */
export function fromServerSuggestion(body) {
  const s = body?.suggestion ?? body;
  const x = Number(s?.focal_x);
  const y = Number(s?.focal_y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const grid = Number(s.grid) > 0 ? Math.round(Number(s.grid)) : 0;
  const threshold = Number(s.threshold);
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    confidence: clamp(Number(s.confidence) || 0, 0, 1),
    method: grid ? `edge_energy_grid${grid}_v1` : METHOD,
    algorithm: grid ? `edge_energy_grid${grid}` : "edge_energy",
    algorithmVersion: "v1",
    isSuggestion: true,
    measured: Boolean(s.measured),
    reason: String(s.reason || REASON.NO_SOURCE),
    threshold: Number.isFinite(threshold) ? threshold : CONFIDENCE_THRESHOLD,
    // Alan yoksa `false` varsayılır — eksik bilgiyi "kalibre edildi" diye
    // okumak, ölçülmemiş bir eşiği ölçülmüş göstermek olurdu.
    thresholdCalibrated: Boolean(s.threshold_calibrated),
    source: SOURCE.SERVER,
  };
}

/**
 * @param {ArrayLike<number>} gray Gri tonlama, satır satır, 0-255.
 * @param {number} w  Küçültülmüş bitmap genişliği (>= 3).
 * @param {number} h  Küçültülmüş bitmap yüksekliği (>= 3).
 * @returns {{x:number, y:number, confidence:number, method:string, isSuggestion:true}}
 *   `x`/`y` 0-1 normalize — kaynağın TAMAMINA göre (INV-10 ile aynı uzay).
 */
export function suggestFocal(gray, w, h) {
  if (!gray || w < 3 || h < 3 || gray.length < w * h) {
    // Ölçemediğimiz durumda merkez döner ve güven SIFIRDIR — "bilmiyorum"
    // demek, uydurulmuş bir 0,9'dan iyidir.
    return olcemedim(REASON.SAMPLE_TOO_SMALL);
  }

  const energy = new Float64Array(w * h);
  let total = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + w] - gray[i - w];
      const e = Math.abs(gx) + Math.abs(gy);
      energy[i] = e;
      total += e;
    }
  }

  if (total <= 0) {
    return olcemedim(REASON.FLAT);
  }

  let sx = 0;
  let sy = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const e = energy[y * w + x];
      if (!e) continue;
      sx += e * (x + 0.5);
      sy += e * (y + 0.5);
    }
  }
  const cx = sx / total;
  const cy = sy / total;

  // Güven: merkezin çevresinde, kısa kenarın dörtte biri yarıçapında biriken
  // enerji payı. Tekdüze dağılmış enerjide bu pay küçük kalır.
  const radius = Math.min(w, h) / 4;
  let near = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const e = energy[y * w + x];
      if (!e) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= radius * radius) near += e;
    }
  }

  // Referans: aynı yarıçapın kapladığı alan payı. Enerji tam tekdüze olsaydı
  // `near/total` bu paya eşit olurdu; güven, o tabanın ÜSTÜNDEKİ fazladır.
  const areaShare = (Math.PI * radius * radius) / ((w - 2) * (h - 2));
  const share = near / total;
  const confidence = clamp(areaShare >= 1 ? 0 : (share - areaShare) / (1 - areaShare), 0, 1);

  return {
    x: clamp(cx / w, 0, 1),
    y: clamp(cy / h, 0, 1),
    confidence,
    method: METHOD,
    algorithm: "edge_energy",
    algorithmVersion: "v1",
    isSuggestion: true,
    measured: true,
    reason: REASON.MEASURED,
    threshold: CONFIDENCE_THRESHOLD,
    thresholdCalibrated: THRESHOLD_CALIBRATED,
    source: SOURCE.CLIENT,
  };
}

/**
 * "Ölçemedim" bildirimi — öneri DEĞİL.
 *
 * Sunucunun `FocalSuggestion(reason=...)` varsayılanıyla aynı şekil: merkez,
 * güven 0, `measured: false`. Merkez döndürmek ile merkezi ÖNERMEK farklı
 * şeylerdir; ayrımı `measured` taşır ve arayüz rozeti ona bakar.
 */
function olcemedim(reason) {
  return {
    x: 0.5,
    y: 0.5,
    confidence: 0,
    method: METHOD,
    algorithm: "edge_energy",
    algorithmVersion: "v1",
    isSuggestion: true,
    measured: false,
    reason,
    threshold: CONFIDENCE_THRESHOLD,
    thresholdCalibrated: THRESHOLD_CALIBRATED,
    source: SOURCE.CLIENT,
  };
}

/**
 * Kaynak görselden gri tonlama örnek çıkar.
 *
 * Ayrı tutuldu: `suggestFocal` saf ve tarayıcısız test edilebilir kalsın,
 * `ImageData` bağımlılığı tek bir yerde dursun.
 *
 * @param {{data:Uint8ClampedArray, width:number, height:number}} imageData
 */
export function toGray(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i += 1, p += 4) {
    // Rec. 601 luma — insan gözünün parlaklık algısına yakın ve tamsayı.
    gray[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  }
  return { gray, width, height };
}
