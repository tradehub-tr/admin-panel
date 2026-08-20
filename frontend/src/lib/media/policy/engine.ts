/**
 * PolicyEngine — Python motorunun (`tradehub_core/tradehub_core/media/pipeline/
 * policy/engine.py`) TypeScript İKİZİ. T-033'ün "aynı motor client tarafında da
 * çalışır" yarısı.
 *
 * SÖZ: BU MOTOR KARAR VERMEZ, KARAR HIZLANDIRIR. Son söz sunucunun
 * (`upload_policy.check` + Python PolicyEngine). Bu ikizin varlık nedeni,
 * istemcinin ÖN İZLENİMİNİN sunucunun kararıyla asla çelişmemesi: aynı JSON
 * politikaları okur, aynı girdiye bit-bit aynı kararı üretir ve bu iddia her
 * `npm test`'te vendor'lanmış parite vektörleriyle ölçülür
 * (`__tests__/policyEngineParity.test.js`, üretici: `scripts/sync-policy-engine.mjs`).
 *
 * ÇEVİRİ KURALLARI (parite bunlara dayanıyor)
 * -------------------------------------------
 * 1. Python'ın TRUTHINESS'ı birebir: `0`, `""`, `None`, boş liste ve boş sözlük
 *    falsy — JS'te `[]` ve `{}` truthy olduğu için `truthy()` yardımcıları şart.
 * 2. Python'ın `round()`'u YARIYI ÇİFTE yuvarlar (banker's rounding):
 *    `round(2.5) == 2`, `round(0.125, 2) == 0.12`. `Math.round` YARIYI YUKARI
 *    yuvarlar; ikisini karıştırmak kadraj/mesaj sapması üretir. `pyRound()`
 *    CPython davranışını ondalık açılım üzerinden birebir uygular.
 * 3. Python `str(float)` tam sayı değerli float'a ".0" ekler (`str(2.0)="2.0"`),
 *    JS `String(2)="2"` der. JSON bu ayrımı taşıyamadığı için politika
 *    dosyalarındaki float değerlerin Python repr'ları senkron betiği tarafından
 *    `FLOAT_REPRS` yan dosyasına yazılır ve mesaj üretiminde oradan okunur.
 * 4. Mesaj katalogları (`MESSAGE_KEYS`, `FALLBACK`) Python kaynağından BAYT
 *    BAYT kopyadır; senkron betiği kaynak dosyanın sha256'sını manifest'e
 *    yazar, kaynak değişirse parite kapısı kırmızı yanar.
 *
 * KAPSAM: yalnız `evaluate(slot, probe, role) → Decision` yüzeyi (T-033 API'si).
 * Python tarafındaki 13 metotluk sözleşme yüzeyi (master_spec, rendition_specs,
 * validate…) sunucu üretim parametreleridir ve istemcide karşılığı yoktur —
 * onları kopyalamak ikinci bir doğruluk kaynağı üretirdi.
 */

// ── Tipler ──────────────────────────────────────────────────────────────

export type Action =
	| "pass"
	| "ignore"
	| "warn"
	| "auto_fix"
	| "review"
	| "manual_review"
	| "reject";

export interface ViolationDict {
	code: string;
	rule: string;
	block: string;
	action: string;
	message: { tr: string; en: string };
	hint: { tr: string; en: string };
	observed: unknown;
	expected: unknown;
	retryable: boolean;
	source: string;
}

export interface SkippedDict {
	rule: string;
	block: string;
	reason: string;
	missing_input: string;
}

export interface DecisionDict {
	allow: boolean;
	slot: string;
	role: string;
	action: string;
	violations: ViolationDict[];
	normalized_targets: Record<string, unknown>;
	skipped: SkippedDict[];
	policy_version: string;
	policy_status: string;
}

/** Ham slot politikası — JSON dosyasının olduğu gibi karşılığı. */
export type RawSlotPolicy = Record<string, unknown>;

/** MediaProbe alanlarının snake_case sözlük hâli (Python `evaluate(dict)` girdisiyle aynı). */
export type ProbeInput = Record<string, unknown>;

type Dict = Record<string, unknown>;

interface NormalizedProbe {
	filename: string;
	extension: string;
	byte_size: number;
	sha256: string;
	kind: string;
	detected: string;
	mime: string;
	fmt: string;
	width: number;
	height: number;
	exif_orientation: number | null;
	mode: string;
	has_alpha: boolean | null;
	animated: boolean | null;
	dpi: unknown;
	has_icc: boolean | null;
	readable: boolean | null;
	loadable: boolean | null;
	extension_matches_content: boolean | null;
	leading_marker: boolean | null;
	appended_payload: boolean | null;
	container_valid: boolean | null;
	is_data_uri: boolean | null;
	duration_s: number | null;
	bitrate_bps: number | null;
	frame_rate: number | null;
	has_audio: boolean | null;
	audio_codec: string;
	video_codec: string;
	existing_count: number | null;
	is_private: boolean | null;
	scan_clean: boolean | null;
	extra: Dict;
}

// ── Aksiyonlar (core/errors.py aynası) ─────────────────────────────────

export const ACTION_PASS = "pass";
export const ACTION_IGNORE = "ignore";
export const ACTION_WARN = "warn";
export const ACTION_AUTO_FIX = "auto_fix";
export const ACTION_REVIEW = "review";
export const ACTION_MANUAL_REVIEW = "manual_review";
export const ACTION_REJECT = "reject";

const ACTION_RANK: Record<string, number> = {
	[ACTION_PASS]: 0,
	[ACTION_IGNORE]: 0,
	[ACTION_WARN]: 1,
	[ACTION_AUTO_FIX]: 2,
	[ACTION_REVIEW]: 3,
	[ACTION_MANUAL_REVIEW]: 3,
	[ACTION_REJECT]: 4,
};

const BLOCKING_ACTIONS = new Set([ACTION_REVIEW, ACTION_MANUAL_REVIEW, ACTION_REJECT]);
const SILENT_ACTIONS = new Set([ACTION_PASS, ACTION_IGNORE]);

export function highestAction(actions: Iterable<string>): string {
	let best = ACTION_PASS;
	for (const a of actions) {
		if ((ACTION_RANK[a] ?? 0) > ACTION_RANK[best]) best = a;
	}
	return best;
}

// ── Python semantiği yardımcıları ───────────────────────────────────────

/** Python truthiness: 0, "", None, boş liste ve BOŞ SÖZLÜK falsy. NaN truthy. */
function truthy(v: unknown): boolean {
	if (v === null || v === undefined || v === false || v === "") return false;
	if (typeof v === "number") return v !== 0; // NaN !== 0 → truthy (Python ile aynı)
	if (Array.isArray(v)) return v.length > 0;
	if (typeof v === "object") return Object.keys(v as object).length > 0;
	return true;
}

function asDict(v: unknown): Dict {
	return v && typeof v === "object" && !Array.isArray(v) ? (v as Dict) : {};
}

function asList(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

/**
 * CPython `round(value, ndigits)` — ondalık açılım üzerinden YARIYI ÇİFTE.
 *
 * `toFixed(80)` bu alan aralığında (|x| < 1e16, |x| > 1e-7) değerin TAM ondalık
 * açılımını verir: bir double'ın açılımı `m·2^e` biçiminden ötürü sonludur ve
 * bu aralıkta 80 basamağı aşmaz. Tam açılım üzerinde kesme noktasındaki basamak
 * "5" ve gerisi sıfırsa GERÇEK yarıdır; CPython gibi çift komşuya gidilir.
 * Sonuç `parseFloat` ile en yakın double'a döner — CPython'ın yaptığı da budur.
 */
export function pyRound(value: number, ndigits = 0): number {
	if (!Number.isFinite(value)) return value;
	if (Number.isInteger(value)) return value;
	const neg = value < 0;
	const abs = Math.abs(value);
	if (abs >= 1e16) return value; // ulp > 1 → değer zaten tam sayı, üstteki dal yakalar
	const digits = pyRoundDigits(abs, ndigits);
	const out = parseFloat(digits);
	if (out === 0) return 0; // -0 üretme: JSON'da ve deepEqual'da ayrışır
	return neg ? -out : out;
}

/** `abs` değerinin `nd` basamağa yarı-çift yuvarlanmış ondalık dizgesi. */
function pyRoundDigits(abs: number, nd: number): string {
	const s = abs.toFixed(80);
	const dot = s.indexOf(".");
	const intPart = s.slice(0, dot);
	const frac = s.slice(dot + 1);
	const keep = frac.slice(0, nd);
	const rest = frac.slice(nd);
	const next = rest[0] ?? "0";
	const restAfter = rest.slice(1);
	let roundUp = false;
	if (next > "5") roundUp = true;
	else if (next === "5") {
		if (/[1-9]/.test(restAfter)) roundUp = true;
		else {
			const base = intPart + keep;
			const last = base[base.length - 1] ?? "0";
			roundUp = (last.charCodeAt(0) - 48) % 2 === 1; // yarı → çift komşu
		}
	}
	let arr = (intPart + keep).split("");
	if (roundUp) {
		let i = arr.length - 1;
		while (i >= 0) {
			if (arr[i] === "9") {
				arr[i] = "0";
				i -= 1;
			} else {
				arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
				break;
			}
		}
		if (i < 0) arr.unshift("1");
	}
	const joined = arr.join("");
	const ip = nd ? joined.slice(0, joined.length - nd) || "0" : joined;
	const fp = nd ? joined.slice(joined.length - nd) : "";
	return fp ? `${ip}.${fp}` : ip;
}

/** Python `f"{x:.3f}"` — yarı-çift, TAM `nd` ondalıkla dizge. Yalnız x ≥ 0. */
export function pyFixed(value: number, nd: number): string {
	if (!Number.isFinite(value)) return String(value);
	if (Number.isInteger(value) && Math.abs(value) < 1e16) {
		return nd ? `${value}.${"0".repeat(nd)}` : String(value);
	}
	return pyRoundDigits(Math.abs(value), nd);
}

/** Python `str(float)`: tam sayı değerli float ".0" taşır; gerisi en kısa repr. */
function pyFloatStr(x: number): string {
	return Number.isInteger(x) ? x.toFixed(1) : String(x);
}

/**
 * JSON'dan gelen sayının Python `str()` karşılığı. JSON int→int, float→float
 * okunduğu için tam sayılar `String()` ile doğru çıkar; tam sayı DEĞERLİ
 * float'lar (`2.0`) JS'te ayırt edilemez — onların repr'ı `FLOAT_REPRS` yan
 * dosyasından gelir (bkz. dosya başlığı, kural 3).
 */
function pyNum(v: number): string {
	return String(v);
}

/**
 * Python `str.format` + `_SafeDict`: bilinmeyen yer tutucu OLDUĞU GİBİ kalır.
 * Mesaj metinleri yalnız düz `{ad}` tutucuları kullanır (format spec yok).
 */
function fmt(text: string, params: Record<string, string>): string {
	return text.replace(/\{([A-Za-z0-9_]+)\}/g, (_m, key: string) =>
		Object.prototype.hasOwnProperty.call(params, key) ? params[key] : `{${key}}`
	);
}

/** '4:5' → 0.8. Bozuk girdide 0.0 — kural o zaman değerlendirilmez. (engine.py parse_ratio) */
export function parseRatio(text: unknown): number {
	const s = String(text ?? "");
	const idx = s.indexOf(":");
	if (idx < 0) return 0.0;
	const w = Number(s.slice(0, idx));
	const h = Number(s.slice(idx + 1));
	if (!Number.isFinite(w) || !Number.isFinite(h)) return 0.0;
	return h ? w / h : 0.0;
}

/** Python `f"{(w/h):.3f}".rstrip("0").rstrip(".")` */
function ratioStr(value: number): string {
	return pyFixed(value, 3).replace(/0+$/, "").replace(/\.$/, "");
}

// ── Mesaj çözümü (engine.py MESSAGE_KEYS + FALLBACK aynası) ────────────

const MESSAGE_KEYS: Record<string, string[]> = {
	short_edge_too_small: ["short_edge_too_small", "too_small", "cozunurluk_dusuk"],
	short_edge_too_large: ["short_edge_too_large"],
	long_edge_too_large: ["long_edge_too_large", "max_edge_exceeded"],
	area_too_small: ["area_too_small"],
	ratio_not_allowed: ["ratio_not_allowed", "oran_16_9_degil"],
	aspect_out_of_band: ["aspect_out_of_band"],
	too_many_pixels: ["too_many_pixels"],
	too_large_bytes: ["too_large_bytes", "too_large", "cok_buyuk"],
	format_not_supported: ["format_not_supported", "bicim_desteklenmiyor"],
	mime_not_supported: ["mime_not_supported", "format_not_supported"],
	extension_rejected: ["extension_rejected", "format_not_supported"],
	extension_conditional_closed: ["svg_dtd_forbidden", "format_not_supported"],
	animated: ["animated", "format_animated"],
	unreadable: ["unreadable", "ffprobe_okunamadi"],
	truncated: ["unreadable"],
	data_uri_forbidden: ["data_uri_forbidden"],
	content_type_mismatch: ["content_type_mismatch"],
	container_invalid: ["container_invalid"],
	executable_content: ["executable_content"],
	appended_payload: ["appended_payload"],
	low_resolution: ["low_resolution"],
	master_under_spec: ["master_under_spec"],
	too_many_items: ["too_many_items"],
	too_few_items: ["too_few_items"],
	duration_too_long: ["sure_uzun", "duration_too_long"],
	duration_too_short: ["duration_too_short"],
	bitrate_too_high: ["bitrate_isleniyor", "bitrate_too_high"],
	frame_rate_not_allowed: ["frame_rate_not_allowed"],
	role_not_allowed: ["role_not_allowed"],
};

interface CatalogEntry {
	tr: string;
	en: string;
	hint_tr?: string;
	hint_en?: string;
}

const FALLBACK: Record<string, CatalogEntry> = {
	short_edge_too_small: {
		tr: "Kısa kenar {kisa_kenar} piksel; en az {gerekli_kisa_kenar} piksel gerekiyor.",
		en: "Short edge is {kisa_kenar}px; at least {gerekli_kisa_kenar}px is required.",
		hint_tr: "Orijinal (kırpılmamış, sıkıştırılmamış) dosyayı yükleyin.",
		hint_en: "Upload the original file instead of a resized or messaging-app copy.",
	},
	short_edge_too_large: {
		tr: "Kısa kenar {kisa_kenar} piksel; üst sınır {gerekli_kisa_kenar} piksel.",
		en: "Short edge is {kisa_kenar}px; the maximum is {gerekli_kisa_kenar}px.",
		hint_tr: "Dosyayı yüklemeden önce küçültün.",
		hint_en: "Downscale the file before uploading.",
	},
	long_edge_too_large: {
		tr: "Uzun kenar {uzun_kenar} piksel; üst sınır {gerekli_uzun_kenar} piksel.",
		en: "Long edge is {uzun_kenar}px; the maximum is {gerekli_uzun_kenar}px.",
		hint_tr: "Uzun kenarı {gerekli_uzun_kenar} piksele indirip yeniden yükleyin.",
		hint_en: "Resize the long edge down to {gerekli_uzun_kenar}px and upload again.",
	},
	area_too_small: {
		tr: "Toplam piksel alanı {mp} MP; en az {max_mp} MP gerekiyor.",
		en: "Total pixel area is {mp} MP; at least {max_mp} MP is required.",
		hint_tr: "Ekran görüntüsü değil, orijinal fotoğraf dosyasını yükleyin.",
		hint_en: "Upload the original photo, not a screenshot or thumbnail.",
	},
	ratio_not_allowed: {
		tr: "En-boy oranı {oran}; kabul edilen oranlar {izinli_oranlar}.",
		en: "Aspect ratio is {oran}; accepted ratios are {izinli_oranlar}.",
		hint_tr:
			"Görseli izinli oranlardan birine kırpın; boşluğu düz renkle tamamlamak da geçerlidir.",
		hint_en: "Crop to one of the accepted ratios, or pad with a flat background colour.",
	},
	aspect_out_of_band: {
		tr: "Oran bandı dışında ({oran}); izinli bant {izinli_oranlar}.",
		en: "Aspect ratio {oran} is outside the accepted band {izinli_oranlar}.",
		hint_tr: "Geniş bir kelime markanız varsa kare (simge) sürümünü yükleyin.",
		hint_en: "If you have a wide wordmark, upload its square (icon) variant instead.",
	},
	too_many_pixels: {
		tr: "Görsel {mp} MP; işlenebilir üst sınır {max_mp} MP.",
		en: "Image is {mp} MP; the processable maximum is {max_mp} MP.",
		hint_tr: "Uzun kenarı {gerekli_uzun_kenar} piksele indirip yeniden yükleyin.",
		hint_en: "Downscale the long edge to {gerekli_uzun_kenar}px and upload again.",
	},
	too_large_bytes: {
		tr: "Dosya {mb} MB; bu slot için üst sınır {max_mb} MB.",
		en: "File is {mb} MB; the limit for this slot is {max_mb} MB.",
		hint_tr: "JPEG veya WebP olarak kaydedin; bu slotta {max_mb} MB altı beklenir.",
		hint_en: "Save as JPEG or WebP; this slot expects under {max_mb} MB.",
	},
	format_not_supported: {
		tr: "{bicim} biçimi bu slotta kabul edilmiyor. Kabul edilenler: {izinli_bicimler}.",
		en: "Format {bicim} is not accepted here. Accepted: {izinli_bicimler}.",
		hint_tr: "Dosyayı {izinli_bicimler} biçimlerinden birine dönüştürüp yükleyin.",
		hint_en: "Convert the file to one of {izinli_bicimler} and upload again.",
	},
	mime_not_supported: {
		tr: "Dosya türü ({bicim}) bu slotta kabul edilmiyor.",
		en: "Content type ({bicim}) is not accepted in this slot.",
		hint_tr: "Kabul edilen türler: {izinli_bicimler}.",
		hint_en: "Accepted types: {izinli_bicimler}.",
	},
	extension_rejected: {
		tr: "{bicim} uzantısı bu slotta açıkça reddediliyor.",
		en: "Extension {bicim} is explicitly rejected in this slot.",
		hint_tr: "Kabul edilen uzantılar: {izinli_bicimler}.",
		hint_en: "Accepted extensions: {izinli_bicimler}.",
	},
	extension_conditional_closed: {
		tr: "{bicim} uzantısı yalnız koşullu kabul ediliyor ve koşul bugün açık değil.",
		en: "Extension {bicim} is only conditionally accepted, and the condition is not met.",
		hint_tr: "Dosyayı PNG veya WebP olarak dışa aktarıp yükleyin.",
		hint_en: "Export the file as PNG or WebP and upload that instead.",
	},
	animated: {
		tr: "Hareketli görsel bu slotta kullanılamaz.",
		en: "Animated images are not allowed in this slot.",
		hint_tr: "Tek kareli bir görsel yükleyin; hareket için video alanını kullanın.",
		hint_en: "Upload a single-frame image; use the video field for motion.",
	},
	unreadable: {
		tr: "Dosya bir medya dosyası olarak açılamadı.",
		en: "The file could not be opened as a media file.",
		hint_tr: "Dosyayı açıp görüntülenebildiğini doğrulayın, 'Farklı kaydet' ile yeniden kaydedin.",
		hint_en: "Open the file to confirm it renders, then re-save it and upload again.",
	},
	truncated: {
		tr: "Dosya eksik aktarılmış; başlığı sağlam ama verisi kesik.",
		en: "The file is truncated: the header is intact but the pixel data is incomplete.",
		hint_tr: "Yüklemeyi tekrarlayın; sorun sürerse dosyayı yeniden dışa aktarın.",
		hint_en: "Retry the upload; if it persists, re-export the file.",
	},
	data_uri_forbidden: {
		tr: "Gömülü veri (data: URI) kabul edilmiyor; dosya olarak yükleyin.",
		en: "Embedded data (data: URI) is not accepted; upload an actual file.",
		hint_tr: "Görseli diske kaydedip dosya seçicisinden yükleyin.",
		hint_en: "Save the image to disk and upload it through the file picker.",
	},
	content_type_mismatch: {
		tr: "Dosya uzantısı içeriğiyle uyuşmuyor (uzantı {bicim}, içerik {gercek}).",
		en: "The extension does not match the content (extension {bicim}, content {gercek}).",
		hint_tr: "Dosyayı gerçek biçimine uygun uzantıyla yeniden kaydedin.",
		hint_en: "Re-save the file with the extension matching its real format.",
	},
	container_invalid: {
		tr: "Dosyanın içi beklenen belge yapısında değil.",
		en: "The file's internal structure is not the expected document format.",
		hint_tr: "Belgeyi kaynak programından yeniden dışa aktarın.",
		hint_en: "Re-export the document from its source application.",
	},
	executable_content: {
		tr: "Dosya çalıştırılabilir ya da betik içerik taşıyor.",
		en: "The file carries executable or script content.",
		hint_tr: "Yalnız görsel/belge dosyası yükleyin.",
		hint_en: "Upload an image or document file only.",
	},
	appended_payload: {
		tr: "Görselin sonuna dosya dışı içerik eklenmiş.",
		en: "Content has been appended after the end of the image data.",
		hint_tr: "Görseli bir düzenleyicide açıp 'Farklı kaydet' ile temiz bir kopya üretin.",
		hint_en: "Open the image in an editor and re-save it to produce a clean copy.",
	},
	low_resolution: {
		tr: "Çözünürlük düşük ({w}×{h}); önerilen en az {gerekli_kisa_kenar} piksel.",
		en: "Resolution is low ({w}×{h}); at least {gerekli_kisa_kenar}px is recommended.",
		hint_tr: "Bu bir engel değil — dosya kaydedildi.",
		hint_en: "This is not blocking — the file was saved.",
	},
	master_under_spec: {
		tr: "Uzun kenar {uzun_kenar} piksel; tam kalite için {gerekli_uzun_kenar} piksel öneriliyor.",
		en: "Long edge is {uzun_kenar}px; {gerekli_uzun_kenar}px is recommended for full quality.",
		hint_tr: "Görsel kabul edildi; büyütme yapılmaz, yakınlaştırmada yumuşak görünebilir.",
		hint_en: "Accepted as-is; no upscaling is performed, so zoom may look soft.",
	},
	too_many_items: {
		tr: "Bu slotta en fazla {max_adet} dosya olabilir; şu an {adet} var.",
		en: "This slot accepts at most {max_adet} files; {adet} are present.",
		hint_tr: "Önce mevcut dosyalardan silin.",
		hint_en: "Remove an existing file first.",
	},
	too_few_items: {
		tr: "Bu slot en az {min_adet} dosya ister; şu an {adet} var.",
		en: "This slot requires at least {min_adet} files; {adet} are present.",
		hint_tr: "Eksik dosyaları yükleyin.",
		hint_en: "Upload the missing files.",
	},
	duration_too_long: {
		tr: "Video {sure} saniye; üst sınır {max_sure} saniye.",
		en: "The video is {sure}s long; the maximum is {max_sure}s.",
		hint_tr: "Süreyi kısaltmak dosyayı küçültmenin en etkili yoludur.",
		hint_en: "Trimming the duration is the most effective way to shrink the file.",
	},
	duration_too_short: {
		tr: "Video {sure} saniye; en az {min_sure} saniye gerekiyor.",
		en: "The video is {sure}s long; at least {min_sure}s is required.",
		hint_tr: "Daha uzun bir çekim yükleyin.",
		hint_en: "Upload a longer clip.",
	},
	bitrate_too_high: {
		tr: "Bit hızı {bitrate} kbps; tavan {max_bitrate} kbps — sunucuda yeniden sıkıştırılacak.",
		en: "Bitrate is {bitrate} kbps; the cap is {max_bitrate} kbps — it will be re-encoded.",
		hint_tr: "Yükleme kabul edildi; işlem arka planda tamamlanıyor.",
		hint_en: "The upload was accepted; processing continues in the background.",
	},
	frame_rate_not_allowed: {
		tr: "Kare hızı {fps}; kabul edilenler {izinli_fps} — {max_fps} fps'e indirilecek.",
		en: "Frame rate is {fps}; accepted are {izinli_fps} — it will be capped at {max_fps} fps.",
		hint_tr: "Yükleme kabul edildi.",
		hint_en: "The upload was accepted.",
	},
	role_not_allowed: {
		tr: "'{rol}' rolü bu slota dosya yükleyemez.",
		en: "Role '{rol}' is not allowed to upload to this slot.",
		hint_tr: "Yetkili bir hesapla deneyin.",
		hint_en: "Try again with an authorised account.",
	},
	no_alpha_channel: {
		tr: "Dosya saydam zeminli değil.",
		en: "The file has no transparent background.",
		hint_tr: "Saydam zeminli PNG ya da WebP olarak yeniden kaydedip yükleyin; bu bir engel değil.",
		hint_en: "Re-save as PNG or WebP with transparency; this is a warning, not a block.",
	},
	frame_width: {
		tr: "Video genişliği {w} piksel; sunucu {max_genislik} piksele küçültecek.",
		en: "Video width is {w}px; the server will downscale it to {max_genislik}px.",
		hint_tr: "Yükleme kabul edildi; işlem arka planda tamamlanıyor.",
		hint_en: "The upload was accepted; processing continues in the background.",
	},
	bitrate_bps: {
		tr: "Bit hızı yüksek; sunucuda yeniden sıkıştırılacak.",
		en: "The bitrate is high; the file will be re-encoded on the server.",
		hint_tr: "Yükleme kabul edildi; hazır olunca sayfada görünecek.",
		hint_en: "The upload was accepted; it will appear once processing finishes.",
	},
	duration_seconds: {
		tr: "Video süresi uzun.",
		en: "The video duration is long.",
		hint_tr: "Süreyi kısaltmak dosyayı küçültmenin en etkili yoludur.",
		hint_en: "Trimming the duration is the most effective way to shrink the file.",
	},
	is_private: {
		tr: "Dosya gizli (private) kaydedildi; sunucu sıkıştırma adımı atlanır.",
		en: "The file was stored as private; the server compression step is skipped.",
		hint_tr: "Bu slota herkese açık (public) yükleyin.",
		hint_en: "Upload to this slot as public instead.",
	},
	ffprobe_readable: {
		tr: "Dosyanın teknik bilgileri okunamadı.",
		en: "The file's technical metadata could not be read.",
		hint_tr: "Dosya bozuk olabilir; kaynak programından yeniden dışa aktarın.",
		hint_en: "The file may be corrupt; re-export it from its source application.",
	},
	_default: {
		tr: "Kural ihlali: {kural}.",
		en: "Policy violation: {kural}.",
		hint_tr: "Ayrıntı için slot kurallarına bakın; dosyayı düzeltip yeniden yükleyin.",
		hint_en: "See the slot rules for details, then fix the file and upload again.",
	},
};

// ── Probe normalizasyonu (core/probe.py MediaProbe aynası) ─────────────

const PROBE_DEFAULTS: NormalizedProbe = {
	filename: "",
	extension: "",
	byte_size: 0,
	sha256: "",
	kind: "unknown",
	detected: "",
	mime: "",
	fmt: "",
	width: 0,
	height: 0,
	exif_orientation: null,
	mode: "",
	has_alpha: null,
	animated: null,
	dpi: null,
	has_icc: null,
	readable: false,
	loadable: null,
	extension_matches_content: null,
	leading_marker: null,
	appended_payload: null,
	container_valid: null,
	is_data_uri: null,
	duration_s: null,
	bitrate_bps: null,
	frame_rate: null,
	has_audio: null,
	audio_codec: "",
	video_codec: "",
	existing_count: null,
	is_private: null,
	scan_clean: null,
	extra: {},
};

const KIND_VIDEO = "video";

function normalizeProbe(input: ProbeInput): NormalizedProbe {
	const out = { ...PROBE_DEFAULTS } as Record<string, unknown>;
	for (const key of Object.keys(PROBE_DEFAULTS)) {
		if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
	}
	return out as unknown as NormalizedProbe;
}

/** EXIF rotasyonu UYGULANMIŞ ölçü (MediaProbe.display_size aynası). */
function displaySize(p: NormalizedProbe): [number, number] {
	if (p.exif_orientation !== null && [5, 6, 7, 8].includes(Number(p.exif_orientation))) {
		return [p.height, p.width];
	}
	return [p.width, p.height];
}

function megapixels(p: NormalizedProbe): number {
	return (p.width * p.height) / 1_000_000.0;
}

// ── İhlal / atlanan kural nesneleri ─────────────────────────────────────

function skipped(rule: string, block: string, missing: string): SkippedDict {
	return { rule, block, reason: "not_measurable", missing_input: missing };
}

// ── Kayıt defteri ───────────────────────────────────────────────────────

export class PolicyNotFoundError extends Error {}

export interface EngineOptions {
	/** slot_key → (noktalı politika yolu → Python float repr'ı). Senkron betiği üretir. */
	floatReprs?: Record<string, Record<string, string>>;
}

// content_rules kural adı → künye alanı (engine.py CONTENT_METRICS aynası).
const CONTENT_METRICS: Record<string, string> = {
	animated: "animated",
	unreadable: "_unreadable",
	ffprobe_readable: "readable",
	no_alpha_channel: "_no_alpha",
	frame_width: "width",
	bitrate_bps: "bitrate_bps",
	duration_seconds: "duration_s",
	is_private: "is_private",
};

export class PolicyEngine {
	private policies: Record<string, RawSlotPolicy>;
	private floatReprs: Record<string, Record<string, string>>;

	constructor(
		policies: Record<string, RawSlotPolicy> | RawSlotPolicy[],
		options: EngineOptions = {}
	) {
		this.policies = {};
		const list = Array.isArray(policies) ? policies : Object.values(policies);
		for (const p of list) {
			const key = String((p as Dict).slot_key ?? "");
			if (!key) throw new Error("slot_key yok: politika kayıt defterine giremez");
			if (key in this.policies) throw new Error(`slot_key iki kez: ${key}`);
			this.policies[key] = p;
		}
		this.floatReprs = options.floatReprs ?? {};
	}

	slots(): string[] {
		return Object.keys(this.policies).sort();
	}

	get(slot: string): RawSlotPolicy {
		const p = this.policies[slot];
		if (!p) {
			throw new PolicyNotFoundError(
				`Bilinmeyen slot: '${slot}'. Tanımlı slotlar: ${this.slots().join(", ")}`
			);
		}
		return p;
	}

	// ── genel yardımcılar ────────────────────────────────────────────

	private actionFor(policy: Dict, block: string): string {
		const ov = asDict(policy.on_violation);
		const v = truthy(ov[block]) ? ov[block] : truthy(ov.default) ? ov.default : ACTION_REJECT;
		return String(v);
	}

	private code(policy: Dict, rule: string): string {
		const ov = asDict(policy.on_violation);
		const prefix = truthy(ov.error_code_prefix) ? String(ov.error_code_prefix) : "media";
		return `${prefix}_${rule}`;
	}

	/**
	 * Politika değerinin Python `str()`/f-string karşılığı.
	 * `path` FLOAT_REPRS anahtarıdır (ör. "require.aspect_band.max_w_over_h").
	 */
	private polStr(slot: string, path: string, value: unknown): string {
		if (value === null || value === undefined) return "None";
		if (typeof value === "number") {
			const r = this.floatReprs[slot]?.[path];
			if (r !== undefined) return r;
			return pyNum(value);
		}
		return String(value);
	}

	/** Python `dict.get(key, "")` + format: anahtar YOKSA boş dizge. */
	private polParam(slot: string, block: Dict, key: string, path: string): string {
		if (!Object.prototype.hasOwnProperty.call(block, key)) return "";
		return this.polStr(slot, path, block[key]);
	}

	private message(
		policy: Dict,
		rule: string,
		params: Record<string, string>
	): [{ tr: string; en: string }, { tr: string; en: string }] {
		let tr = "";
		const policyTr = asDict(asDict(policy.messages).tr);
		for (const key of MESSAGE_KEYS[rule] ?? [rule]) {
			if (truthy(policyTr[key])) {
				tr = String(policyTr[key]);
				break;
			}
		}
		const cat = FALLBACK[rule] ?? FALLBACK._default;
		if (!tr) tr = cat.tr;
		const message = { tr: fmt(tr, params), en: fmt(cat.en, params) };
		const hint = {
			tr: fmt(cat.hint_tr ?? "", params),
			en: fmt(cat.hint_en ?? "", params),
		};
		return [message, hint];
	}

	private violation(
		policy: Dict,
		opts: {
			rule: string;
			block: string;
			params: Record<string, string>;
			observed?: unknown;
			expected?: unknown;
			action?: string | null;
			source?: string;
		}
	): ViolationDict {
		const params = { ...opts.params };
		if (!Object.prototype.hasOwnProperty.call(params, "kural")) params.kural = opts.rule;
		const [message, hint] = this.message(policy, opts.rule, params);
		return {
			code: this.code(policy, opts.rule),
			rule: opts.rule,
			block: opts.block,
			action: opts.action ?? this.actionFor(policy, opts.block),
			message,
			hint,
			observed: opts.observed ?? null,
			expected: opts.expected ?? null,
			retryable: false,
			source: opts.source ?? "",
		};
	}

	// ── giriş noktası ────────────────────────────────────────────────

	evaluate(slot: string, probeInput: ProbeInput, role = ""): DecisionDict {
		const probe = normalizeProbe(probeInput);
		const policy = this.get(slot) as Dict;
		const violations: ViolationDict[] = [];
		const skippedRules: SkippedDict[] = [];
		const p = this.params(slot, policy, probe, role);

		this.checkRole(policy, role, p, violations);
		this.checkSecurity(policy, probe, p, violations, skippedRules);
		this.checkAccept(slot, policy, probe, p, violations, skippedRules);
		this.checkRequire(slot, policy, probe, p, violations, skippedRules);
		this.checkVideo(slot, policy, probe, p, violations, skippedRules);
		this.checkMaster(slot, policy, probe, p, violations);
		this.checkContentRules(policy, probe, p, violations, skippedRules);

		const shown = violations.filter((v) => !SILENT_ACTIONS.has(v.action));
		const action = shown.length ? highestAction(shown.map((v) => v.action)) : ACTION_PASS;
		const allow = !shown.some((v) => BLOCKING_ACTIONS.has(v.action));
		const targets = allow ? this.normalizedTargets(policy, probe) : {};

		return {
			allow,
			slot,
			role,
			action,
			violations: shown,
			normalized_targets: targets,
			skipped: skippedRules,
			policy_version: String(policy.schema_version ?? ""),
			policy_status: String(policy.status ?? ""),
		};
	}

	// ── mesaj değişkenleri (engine.py _params aynası) ────────────────

	private params(
		slot: string,
		policy: Dict,
		probe: NormalizedProbe,
		role: string
	): Record<string, string> {
		const accept = asDict(policy.accept);
		const require = asDict(policy.require);
		const master = asDict(policy.master);
		const [w, h] = displaySize(probe);
		const izinli = asList(accept.extensions);
		const izinliOranlar = asList(require.allowed_ratios).map(String);
		const fr = probe.frame_rate;
		let fps = "-";
		if (truthy(fr)) {
			const v = pyRound(fr as number, 2);
			// JSON int → Python int → str "30"; JSON kesirli float → Python float →
			// round sonucu float kalır ve tam sayıya inerse ".0" taşır (str(30.0)).
			fps = Number.isInteger(fr) ? String(v) : pyFloatStr(v);
		}
		return {
			rol: role || "-",
			w: String(w),
			h: String(h),
			kisa_kenar: String(w && h ? Math.min(w, h) : 0),
			uzun_kenar: String(w && h ? Math.max(w, h) : 0),
			gerekli_kisa_kenar: this.polParam(slot, require, "min_short_edge", "require.min_short_edge"),
			gerekli_uzun_kenar: this.polParam(slot, master, "max_long_edge", "master.max_long_edge"),
			mp: pyFloatStr(pyRound(megapixels(probe), 2)),
			max_mp: this.polParam(slot, accept, "max_megapixels_hard", "accept.max_megapixels_hard"),
			mb: pyFloatStr(pyRound(probe.byte_size / 1_048_576, 2)),
			max_mb: pyFloatStr(
				pyRound((truthy(accept.max_bytes) ? (accept.max_bytes as number) : 0) / 1_048_576, 2)
			),
			oran: h ? ratioStr(w / h) : "-",
			izinli_oranlar: izinliOranlar.join(", ") || "-",
			bicim: probe.extension || probe.fmt || probe.detected || "-",
			gercek: probe.detected || "-",
			izinli_bicimler: izinli.map(String).join(", ") || "-",
			adet: probe.existing_count !== null && probe.existing_count !== undefined
				? String(probe.existing_count)
				: "-",
			max_adet: this.polParam(slot, require, "max_count", "require.max_count"),
			min_adet: this.polParam(slot, require, "min_count", "require.min_count"),
			sure:
				probe.duration_s !== null && probe.duration_s !== undefined
					? String(probe.duration_s)
					: "-",
			bitrate: truthy(probe.bitrate_bps)
				? String(Math.trunc((probe.bitrate_bps as number) / 1000))
				: "-",
			fps,
			max_genislik: this.polParam(slot, master, "max_long_edge", "master.max_long_edge"),
		};
	}

	// ── bloklar ──────────────────────────────────────────────────────

	private checkRole(
		policy: Dict,
		role: string,
		p: Record<string, string>,
		out: ViolationDict[]
	): void {
		const roles = asList(policy.roles).map(String);
		if (role && roles.length && !roles.includes(role)) {
			out.push(
				this.violation(policy, {
					rule: "role_not_allowed",
					block: "policy",
					params: p,
					observed: role,
					expected: roles,
					action: ACTION_REJECT,
					source: "policy.roles",
				})
			);
		}
	}

	private checkSecurity(
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[],
		skips: SkippedDict[]
	): void {
		const block = "accept";
		if (truthy(probe.leading_marker)) {
			out.push(
				this.violation(policy, {
					rule: "executable_content",
					block,
					params: p,
					observed: "leading_marker",
					action: ACTION_REJECT,
					source: "core/probe.py DANGEROUS_MARKERS (upload_policy.py:187 aynası)",
				})
			);
		}
		if (probe.detected === "executable") {
			out.push(
				this.violation(policy, {
					rule: "executable_content",
					block,
					params: p,
					observed: probe.detected,
					action: ACTION_REJECT,
					source: "core/probe.py sniff() MZ/ELF",
				})
			);
		}
		if (truthy(probe.appended_payload)) {
			out.push(
				this.violation(policy, {
					rule: "appended_payload",
					block,
					params: p,
					observed: "appended_payload",
					action: ACTION_REJECT,
					source: "ÜRETİMDE YOK: upload_policy.is_dangerous() yalnız dosya başına bakıyor",
				})
			);
		}
		if (probe.container_valid === false) {
			out.push(
				this.violation(policy, {
					rule: "container_invalid",
					block,
					params: p,
					observed: probe.detected,
					action: ACTION_REJECT,
					source: "kyb.py:46-53 referans uygulaması",
				})
			);
		}
		if (probe.scan_clean === false) {
			out.push(
				this.violation(policy, {
					rule: "executable_content",
					block,
					params: p,
					observed: "av_scan",
					action: ACTION_REJECT,
					source: "tradehub_core/media/av.py karantina sonucu",
				})
			);
		} else if (probe.scan_clean === null || probe.scan_clean === undefined) {
			skips.push(skipped("av_scan", block, "scan_clean"));
		}
	}

	private checkAccept(
		slot: string,
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[],
		skips: SkippedDict[]
	): void {
		const accept = asDict(policy.accept);
		const block = "accept";
		const ext = (probe.extension || "").toLowerCase();

		const rejected = asList(accept.rejected_extensions).map((e) => String(e).toLowerCase());
		const allowed = asList(accept.extensions).map((e) => String(e).toLowerCase());
		const conditional = asList(accept.conditional_extensions).map((e) =>
			String(e).toLowerCase()
		);

		if (ext && rejected.includes(ext)) {
			out.push(
				this.violation(policy, {
					rule: "extension_rejected",
					block,
					params: p,
					observed: ext,
					expected: allowed,
					action: ACTION_REJECT,
					source: "accept.rejected_extensions",
				})
			);
		} else if (ext && conditional.includes(ext) && !allowed.includes(ext)) {
			if (!conditionalOpen(policy, ext)) {
				out.push(
					this.violation(policy, {
						rule: "extension_conditional_closed",
						block,
						params: p,
						observed: ext,
						expected: allowed,
						action: ACTION_REJECT,
						source: "accept.conditional_extensions + logo.svg_policy.enabled",
					})
				);
			}
		} else if (ext && allowed.length && !allowed.includes(ext)) {
			out.push(
				this.violation(policy, {
					rule: "format_not_supported",
					block,
					params: p,
					observed: ext,
					expected: allowed,
					source: "accept.extensions",
				})
			);
		}

		const mimes = asList(accept.mime).map(String);
		if (probe.mime && mimes.length && !mimes.includes(probe.mime)) {
			out.push(
				this.violation(policy, {
					rule: "mime_not_supported",
					block,
					params: p,
					observed: probe.mime,
					expected: mimes,
					source: "accept.mime",
				})
			);
		} else if (!probe.mime && mimes.length) {
			skips.push(skipped("mime", block, "mime"));
		}

		if (probe.extension_matches_content === false) {
			out.push(
				this.violation(policy, {
					rule: "content_type_mismatch",
					block,
					params: p,
					observed: probe.detected,
					expected: ext,
					action: ACTION_REJECT,
					source: "FR-009 magic_byte_matches_extension",
				})
			);
		}

		// SVG'nin kendi bayt tavanı var; genel tavandan ayrı okunur.
		let maxBytes = accept.max_bytes as number | null | undefined;
		if (ext === ".svg" && truthy(accept.max_bytes_svg)) {
			maxBytes = accept.max_bytes_svg as number;
		}
		if (truthy(maxBytes) && probe.byte_size > (maxBytes as number)) {
			const pp = { ...p, max_mb: pyFloatStr(pyRound((maxBytes as number) / 1_048_576, 2)) };
			out.push(
				this.violation(policy, {
					rule: "too_large_bytes",
					block,
					params: pp,
					observed: probe.byte_size,
					expected: maxBytes,
					source: "accept.max_bytes",
				})
			);
		}

		const hardMp = accept.max_megapixels_hard as number | null | undefined;
		if (truthy(hardMp) && probe.width && probe.height && megapixels(probe) > (hardMp as number)) {
			out.push(
				this.violation(policy, {
					rule: "too_many_pixels",
					block,
					params: p,
					observed: pyRound(megapixels(probe), 3),
					expected: hardMp,
					source: "accept.max_megapixels_hard",
				})
			);
		}

		const allowAnimated = Object.prototype.hasOwnProperty.call(accept, "allow_animated")
			? accept.allow_animated
			: false;
		if (truthy(probe.animated) && !truthy(allowAnimated)) {
			out.push(
				this.violation(policy, {
					rule: "animated",
					block,
					params: p,
					observed: true,
					expected: false,
					source: "accept.allow_animated",
				})
			);
		}

		if (truthy(probe.is_data_uri) && accept.allow_data_uri === false) {
			out.push(
				this.violation(policy, {
					rule: "data_uri_forbidden",
					block,
					params: p,
					observed: true,
					expected: false,
					action: ACTION_REJECT,
					source: "accept.allow_data_uri",
				})
			);
		}

		// Okunabilirlik: başlık ve piksel ayrı iki soru (fixture truncated.jpg).
		if (!truthy(probe.readable)) {
			out.push(
				this.violation(policy, {
					rule: "unreadable",
					block,
					params: p,
					observed: false,
					expected: true,
					action: ACTION_REJECT,
					source: "engine.probe(readable=False)",
				})
			);
		} else if (probe.loadable === false) {
			out.push(
				this.violation(policy, {
					rule: "truncated",
					block,
					params: p,
					observed: false,
					expected: true,
					action: ACTION_REJECT,
					source: "ÖLÇÜLDÜ: engine.probe True der, optimize OSError ile düşer",
				})
			);
		}
	}

	private checkRequire(
		slot: string,
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[],
		skips: SkippedDict[]
	): void {
		const require = asDict(policy.require);
		const block = "require";
		const [w, h] = displaySize(probe);
		if (!(w && h)) {
			skips.push(skipped("geometry", block, "width/height"));
			this.checkCounts(policy, probe, p, out, skips);
			return;
		}

		const short = Math.min(w, h);
		const long = Math.max(w, h);

		if (truthy(require.min_short_edge) && short < (require.min_short_edge as number)) {
			out.push(
				this.violation(policy, {
					rule: "short_edge_too_small",
					block,
					params: p,
					observed: short,
					expected: require.min_short_edge,
					source: "require.min_short_edge",
				})
			);
		} else if (
			truthy(require.low_resolution_warn_below) &&
			short < (require.low_resolution_warn_below as number)
		) {
			const pp = {
				...p,
				gerekli_kisa_kenar: this.polStr(
					slot,
					"require.low_resolution_warn_below",
					require.low_resolution_warn_below
				),
			};
			out.push(
				this.violation(policy, {
					rule: "low_resolution",
					block,
					params: pp,
					observed: short,
					expected: require.low_resolution_warn_below,
					action: ACTION_WARN,
					source: "require.low_resolution_warn_below",
				})
			);
		}

		if (truthy(require.max_short_edge) && short > (require.max_short_edge as number)) {
			const pp = {
				...p,
				gerekli_kisa_kenar: this.polStr(slot, "require.max_short_edge", require.max_short_edge),
			};
			out.push(
				this.violation(policy, {
					rule: "short_edge_too_large",
					block,
					params: pp,
					observed: short,
					expected: require.max_short_edge,
					source: "require.max_short_edge",
				})
			);
		}

		if (truthy(require.max_edge) && long > (require.max_edge as number)) {
			const pp = {
				...p,
				gerekli_uzun_kenar: this.polStr(slot, "require.max_edge", require.max_edge),
			};
			out.push(
				this.violation(policy, {
					rule: "long_edge_too_large",
					block,
					params: pp,
					observed: long,
					expected: require.max_edge,
					source: "require.max_edge",
				})
			);
		}

		if (truthy(require.min_area) && w * h < (require.min_area as number)) {
			const pp = {
				...p,
				max_mp: pyFloatStr(pyRound((require.min_area as number) / 1_000_000, 3)),
			};
			out.push(
				this.violation(policy, {
					rule: "area_too_small",
					block,
					params: pp,
					observed: w * h,
					expected: require.min_area,
					source: "require.min_area",
				})
			);
		}

		const ratios = asList(require.allowed_ratios).map(String);
		if (ratios.length) {
			const tolRaw = require.ratio_tolerance;
			const tol = tolRaw === null || tolRaw === undefined ? 0.0 : Number(tolRaw);
			const gercek = w / h;
			let enYakin = Infinity;
			for (const r of ratios) {
				const v = parseRatio(r);
				if (v) enYakin = Math.min(enYakin, Math.abs(gercek - v) / v);
			}
			if (enYakin > tol) {
				out.push(
					this.violation(policy, {
						rule: "ratio_not_allowed",
						block,
						params: p,
						observed: pyRound(gercek, 4),
						expected: ratios,
						source: "require.allowed_ratios + ratio_tolerance",
					})
				);
			}
		}

		const band = asDict(require.aspect_band);
		if (truthy(band)) {
			const gercek = w / h;
			const alt = Object.prototype.hasOwnProperty.call(band, "min_w_over_h")
				? band.min_w_over_h
				: null;
			const ust = Object.prototype.hasOwnProperty.call(band, "max_w_over_h")
				? band.max_w_over_h
				: null;
			const altAsili = alt !== null && alt !== undefined && gercek < (alt as number);
			const ustAsili = ust !== null && ust !== undefined && gercek > (ust as number);
			if (altAsili || ustAsili) {
				const pp = {
					...p,
					izinli_oranlar: `${this.polStr(slot, "require.aspect_band.min_w_over_h", alt)}–${this.polStr(slot, "require.aspect_band.max_w_over_h", ust)}`,
				};
				out.push(
					this.violation(policy, {
						rule: "aspect_out_of_band",
						block,
						params: pp,
						observed: pyRound(gercek, 4),
						expected: [alt ?? null, ust ?? null],
						source: "require.aspect_band",
					})
				);
			}
		}

		this.checkCounts(policy, probe, p, out, skips);
	}

	private checkCounts(
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[],
		skips: SkippedDict[]
	): void {
		const require = asDict(policy.require);
		const block = "require";
		if (probe.existing_count === null || probe.existing_count === undefined) {
			if (truthy(require.max_count) || truthy(require.min_count)) {
				skips.push(skipped("count", block, "existing_count"));
			}
			return;
		}
		if (truthy(require.max_count) && probe.existing_count > (require.max_count as number)) {
			out.push(
				this.violation(policy, {
					rule: "too_many_items",
					block,
					params: p,
					observed: probe.existing_count,
					expected: require.max_count,
					source: "require.max_count",
				})
			);
		}
		if (truthy(require.min_count) && probe.existing_count < (require.min_count as number)) {
			out.push(
				this.violation(policy, {
					rule: "too_few_items",
					block,
					params: p,
					observed: probe.existing_count,
					expected: require.min_count,
					action: ACTION_WARN,
					source: "require.min_count",
				})
			);
		}
	}

	private checkVideo(
		slot: string,
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[],
		skips: SkippedDict[]
	): void {
		const video = asDict(policy.video);
		if (!truthy(video)) return;
		const block = "require";
		if (probe.kind !== KIND_VIDEO) return;

		if (probe.duration_s === null || probe.duration_s === undefined) {
			skips.push(skipped("duration", block, "duration_s"));
		} else {
			if (truthy(video.duration_max_s) && probe.duration_s > (video.duration_max_s as number)) {
				const pp = {
					...p,
					max_sure: this.polStr(slot, "video.duration_max_s", video.duration_max_s),
				};
				out.push(
					this.violation(policy, {
						rule: "duration_too_long",
						block,
						params: pp,
						observed: probe.duration_s,
						expected: video.duration_max_s,
						source: "video.duration_max_s",
					})
				);
			}
			if (truthy(video.duration_min_s) && probe.duration_s < (video.duration_min_s as number)) {
				const pp = {
					...p,
					min_sure: this.polStr(slot, "video.duration_min_s", video.duration_min_s),
				};
				out.push(
					this.violation(policy, {
						rule: "duration_too_short",
						block,
						params: pp,
						observed: probe.duration_s,
						expected: video.duration_min_s,
						source: "video.duration_min_s",
					})
				);
			}
		}

		const cap = video.bitrate_cap_kbps as number | null | undefined;
		if (truthy(cap) && truthy(probe.bitrate_bps)) {
			if ((probe.bitrate_bps as number) > (cap as number) * 1000) {
				const pp = { ...p, max_bitrate: this.polStr(slot, "video.bitrate_cap_kbps", cap) };
				out.push(
					this.violation(policy, {
						rule: "bitrate_too_high",
						block,
						params: pp,
						observed: probe.bitrate_bps,
						expected: (cap as number) * 1000,
						action: ACTION_AUTO_FIX,
						source: "video.bitrate_cap_kbps",
					})
				);
			}
		} else if (truthy(cap)) {
			skips.push(skipped("bitrate", block, "bitrate_bps"));
		}

		const fr = asDict(video.frame_rate);
		const kabul = asList(fr.accepted);
		if (kabul.length && truthy(probe.frame_rate)) {
			const eslesen = kabul.some(
				(k) => Math.abs((probe.frame_rate as number) - Number(k)) < 0.5
			);
			if (!eslesen) {
				const pp = {
					...p,
					izinli_fps: kabul
						.map((k, i) => this.polStr(slot, `video.frame_rate.accepted[${i}]`, k))
						.join(", "),
					max_fps: this.polParam(slot, fr, "output_cap", "video.frame_rate.output_cap"),
				};
				out.push(
					this.violation(policy, {
						rule: "frame_rate_not_allowed",
						block,
						params: pp,
						observed: probe.frame_rate,
						expected: kabul,
						action: ACTION_AUTO_FIX,
						source: "video.frame_rate.accepted",
					})
				);
			}
		}
	}

	private checkMaster(
		slot: string,
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[]
	): void {
		const master = asDict(policy.master);
		const [w, h] = displaySize(probe);
		if (!(w && h)) return;
		const minLong = master.min_long_edge as number | null | undefined;
		if (truthy(minLong) && Math.max(w, h) < (minLong as number) && !truthy(master.allow_upscale)) {
			const pp = {
				...p,
				gerekli_uzun_kenar: this.polStr(slot, "master.min_long_edge", minLong),
			};
			const af = this.actionFor(policy, "master");
			out.push(
				this.violation(policy, {
					rule: "master_under_spec",
					block: "master",
					params: pp,
					observed: Math.max(w, h),
					expected: minLong,
					action: af !== ACTION_REJECT ? af : ACTION_WARN,
					source: "master.min_long_edge (upscale yok)",
				})
			);
		}
	}

	private metricValue(probe: NormalizedProbe, name: string): unknown {
		if (name === "_unreadable") {
			return probe.readable !== null && probe.readable !== undefined ? !probe.readable : null;
		}
		if (name === "_no_alpha") {
			return probe.has_alpha !== null && probe.has_alpha !== undefined ? !probe.has_alpha : null;
		}
		const v = (probe as unknown as Dict)[name];
		return v === undefined ? null : v;
	}

	/** engine.py `_compare`: Python'ın TypeError'ı burada `false` — tip uyuşmazlığı kural tetiklemez. */
	private compare(value: unknown, comparator: string, threshold: unknown): boolean {
		const eq = (a: unknown, b: unknown): boolean => {
			if (Array.isArray(a) && Array.isArray(b)) {
				return a.length === b.length && a.every((x, i) => eq(x, b[i]));
			}
			// Python: True == 1, 1 == 1.0. JS ===, bool/num karışımı için Number() köprüsü.
			if (
				(typeof a === "number" || typeof a === "boolean") &&
				(typeof b === "number" || typeof b === "boolean")
			) {
				return Number(a) === Number(b);
			}
			return a === b;
		};
		const ordered = (a: unknown, b: unknown): [number, number] | [string, string] | null => {
			if (
				(typeof a === "number" || typeof a === "boolean") &&
				(typeof b === "number" || typeof b === "boolean")
			) {
				return [Number(a), Number(b)];
			}
			if (typeof a === "string" && typeof b === "string") return [a, b];
			return null; // Python TypeError → False
		};
		switch (comparator) {
			case "eq":
				return eq(value, threshold);
			case "ne":
				return !eq(value, threshold);
			case "gt": {
				const o = ordered(value, threshold);
				return o !== null && o[0] > o[1];
			}
			case "gte": {
				const o = ordered(value, threshold);
				return o !== null && o[0] >= o[1];
			}
			case "lt": {
				const o = ordered(value, threshold);
				return o !== null && o[0] < o[1];
			}
			case "lte": {
				const o = ordered(value, threshold);
				return o !== null && o[0] <= o[1];
			}
			default:
				return false;
		}
	}

	private checkContentRules(
		policy: Dict,
		probe: NormalizedProbe,
		p: Record<string, string>,
		out: ViolationDict[],
		skips: SkippedDict[]
	): void {
		const block = "content_rules";
		for (const ruleRaw of asList(policy.content_rules)) {
			const rule = asDict(ruleRaw);
			const name = rule.rule ? String(rule.rule) : "";
			if (!name) continue;
			const alan = CONTENT_METRICS[name];
			if (alan === undefined) {
				skips.push(
					skipped(name, block, "künyede karşılığı yok (piksel analizi gerekir)")
				);
				continue;
			}
			const value = this.metricValue(probe, alan);
			if (value === null || value === undefined) {
				skips.push(skipped(name, block, alan));
				continue;
			}
			const comparator = truthy(rule.comparator) ? String(rule.comparator) : "eq";
			if (!this.compare(value, comparator, rule.threshold)) continue;

			// `accept` bloğu bu kuralı zaten söylediyse tekrarlamayalım.
			const mesajKural = ({ animated: "animated", unreadable: "unreadable" } as Record<
				string,
				string
			>)[name];
			if (mesajKural && out.some((v) => v.rule === mesajKural)) continue;

			const pp = { ...p };
			const mk = truthy(rule.message_key) ? String(rule.message_key) : name;
			const policyTr = asDict(asDict(policy.messages).tr);
			const messageTr = policyTr[mk] ? String(policyTr[mk]) : "";
			const action = truthy(rule.action)
				? String(rule.action)
				: this.actionFor(policy, block);
			if (messageTr) {
				const cat = FALLBACK[mesajKural ?? name] ?? FALLBACK._default;
				const message = {
					tr: fmt(messageTr, pp),
					en: fmt(cat.en, { ...pp, kural: name }),
				};
				const hint = {
					tr: fmt(cat.hint_tr ?? "", pp),
					en: fmt(cat.hint_en ?? "", pp),
				};
				out.push({
					code: this.code(policy, name),
					rule: name,
					block,
					action,
					message,
					hint,
					observed: value,
					expected: rule.threshold ?? null,
					retryable: false,
					source: rule.source ? String(rule.source) : "",
				});
			} else {
				out.push(
					this.violation(policy, {
						rule: mesajKural ?? name,
						block,
						params: pp,
						observed: value,
						expected: rule.threshold ?? null,
						action,
						source: rule.source ? String(rule.source) : "",
					})
				);
			}
		}
	}

	// ── hedef üretimi (engine.py normalized_targets aynası) ──────────

	normalizedTargets(policy: Dict, probeInput: ProbeInput): Record<string, unknown> {
		const probe = normalizeProbe(probeInput);
		const master = asDict(policy.master);
		const [w, h] = displaySize(probe);
		const out: Record<string, unknown> = {
			slot: String(policy.slot_key ?? ""),
			master: {},
			derivatives: [],
		};
		if (!(w && h)) return out;

		let scale = 1.0;
		const cap = master.max_long_edge as number | null | undefined;
		if (truthy(cap) && Math.max(w, h) > (cap as number)) {
			scale = (cap as number) / Math.max(w, h);
		}
		const maxMp = master.max_megapixels as number | null | undefined;
		if (truthy(maxMp)) {
			const alan = w * scale * (h * scale);
			if (alan > (maxMp as number) * 1_000_000) {
				scale *= Math.sqrt(((maxMp as number) * 1_000_000) / alan);
			}
		}
		const allowUpscale = Object.prototype.hasOwnProperty.call(master, "allow_upscale")
			? master.allow_upscale
			: false;
		if (!truthy(allowUpscale)) scale = Math.min(scale, 1.0);

		let tw = Math.max(1, Math.trunc(pyRound(w * scale)));
		let th = Math.max(1, Math.trunc(pyRound(h * scale)));
		const fit = truthy(master.fit) ? String(master.fit) : "contain";
		const hedefOran = master.target_ratio;
		if (fit === "pad" && truthy(hedefOran)) {
			const r = parseRatio(hedefOran);
			if (r) {
				const kutu = Math.max(tw, th);
				if (r >= 1) {
					tw = kutu;
					th = Math.trunc(pyRound(kutu / r));
				} else {
					tw = Math.trunc(pyRound(kutu * r));
					th = kutu;
				}
			}
		}

		out.master = {
			width: tw,
			height: th,
			scale: pyRound(scale, 6),
			resize_needed: scale < 1.0,
			format: Object.prototype.hasOwnProperty.call(master, "format")
				? master.format
				: "preserve",
			encoding: Object.prototype.hasOwnProperty.call(master, "encoding")
				? master.encoding
				: "",
			colorspace: Object.prototype.hasOwnProperty.call(master, "colorspace")
				? master.colorspace
				: "preserve",
			dpi_out: master.dpi_out ?? null,
			fit,
			pad_color: master.pad_color ?? null,
			orientation: Object.prototype.hasOwnProperty.call(master, "orientation")
				? master.orientation
				: "apply_exif",
			strip_metadata: truthy(master.strip_metadata) ? master.strip_metadata : {},
			allow_upscale: truthy(allowUpscale),
			source_size: [w, h],
		};

		const derivatives: Record<string, unknown>[] = [];
		for (const profileRaw of asList(policy.profiles)) {
			const profile = asDict(profileRaw);
			const pw = profile.width as number | null | undefined;
			if (!truthy(pw)) continue;
			let ph = profile.height as number | null | undefined;
			if (!truthy(ph)) {
				const r =
					parseRatio(truthy(profile.target_ratio) ? profile.target_ratio : "") ||
					(th ? tw / th : 1.0);
				ph = r ? Math.trunc(pyRound((pw as number) / r)) : (pw as number);
			}
			derivatives.push({
				name: Object.prototype.hasOwnProperty.call(profile, "name")
					? profile.name
					: `w${pw}`,
				width: pw,
				height: ph,
				formats: truthy(profile.formats)
					? profile.formats
					: [
							Object.prototype.hasOwnProperty.call(master, "format")
								? master.format
								: "webp",
						],
				encoder_quality: truthy(profile.encoder_quality) ? profile.encoder_quality : {},
				fit: truthy(profile.fit) ? profile.fit : fit,
				pad_color: truthy(profile.pad_color) ? profile.pad_color : (master.pad_color ?? null),
				max_bytes: profile.max_bytes ?? null,
				upscale: (pw as number) > tw,
				serves: truthy(profile.serves) ? profile.serves : [],
			});
		}
		out.derivatives = derivatives;

		const video = asDict(policy.video);
		if (truthy(video)) {
			const fr = asDict(video.frame_rate);
			const ses = asDict(video.audio_policy);
			out.video = {
				max_width: master.max_long_edge ?? null,
				container: master.format ?? null,
				fps_cap: fr.output_cap ?? null,
				bitrate_cap_kbps: video.bitrate_cap_kbps ?? null,
				audio_codec: ses.codec ?? null,
				audio_bitrate_kbps: ses.bitrate_kbps ?? null,
				autoplay_mute_mandatory: ses.autoplay_mute_mandatory ?? null,
			};
		}
		return out;
	}
}

/** Koşullu uzantının koşulu açık mı — VERİDEN okunur (engine.py _conditional_open). */
function conditionalOpen(policy: Dict, ext: string): boolean {
	if (ext === ".svg" || ext === ".svgz") {
		return truthy(asDict(asDict(asDict(policy.logo).svg_policy)).enabled);
	}
	return false;
}
