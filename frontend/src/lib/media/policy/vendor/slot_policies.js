// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/.../media/pipeline/policy/slots/*.json
// Yeniden üret: npm run sync:policy
//
// HAM politikalar — upload/vendor/slotPolicy.js'in damıtılmış ön kontrol
// alt kümesinin AKSİNE, ikiz motor Python'la aynı ham sözlükleri okur.
// FLOAT_REPRS: JSON'da float yazılmış tam sayı değerlerin Python repr'ları
// (str(2.0)="2.0") — mesaj paritesi bunlarsız kurulamaz.

export const FLOAT_REPRS = {
	"brand.logo": {
		"require.aspect_band.max_w_over_h": "2.0",
		"content_rules[2].threshold[1]": "2.0"
	},
	"category.banner": {
		"master.max_megapixels": "2.0"
	},
	"company.cover_image": {
		"profiles[1].max_overshoot": "1.0",
		"profiles[2].max_overshoot": "1.0",
		"profiles[3].max_overshoot": "1.0",
		"profiles[4].max_overshoot": "1.0"
	},
	"company.cover_video": {
		"profiles[2].max_overshoot": "1.0",
		"video.render_box.computed_sizes_css_px[2].box_h": "315.0",
		"video.render_box.computed_sizes_css_px[3].box_h": "387.0",
		"video.render_box.thumbnail_box.horizontal_crop_of_16x9_poster_pct": "25.0",
		"video.safe_area.overlay_share_of_height_pct.viewport_360.bar": "24.0"
	},
	"document.attachment": {},
	"product.image": {
		"content_rules[2].threshold": "2.0"
	},
	"product.video": {},
	"seller.logo": {
		"require.aspect_band.max_w_over_h": "2.0",
		"content_rules[2].threshold[1]": "2.0"
	},
	"user.avatar": {}
};

export const SLOT_POLICIES = {
	"brand.logo": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.2.0",
		"status": "draft",
		"slot_key": "brand.logo",
		"title": "Marka logosu",
		"description": "Marka sayfası logosu — marka hero'su ve ürün filtre kenar çubuğu marka satırı. 3 render noktası ölçüldü; en büyük piksel talebi 312 px (marka hero 104 CSS px @ DPR3). seller.logo ile TÜM kurallar aynı; tek fark master alt sınırı (384 vs 512) ve raster bayt tavanı (576 vs 1024 KiB). Standart: docs/standards/logo.md",
		"roles": [
			"admin"
		],
		"bound_to": [
			{
				"doctype": "Brand",
				"field": "logo",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 Tablo A satır `brand.logo`. media/usage.py:32-41 LIVE_SOURCES'ta KAYITLI DEĞİL → docs/reports/00-upload-slot-envanteri.md §7-B6: kayıtlı olmayan bir görsel 'kullanılmıyor' görünür ve silme adayı olur."
			}
		],
		"accept": {
			"mime": [
				"image/png",
				"image/webp",
				"image/jpeg"
			],
			"extensions": [
				".png",
				".webp",
				".jpg",
				".jpeg"
			],
			"conditional_extensions": [
				".svg"
			],
			"rejected_extensions": [
				".gif",
				".tif",
				".tiff",
				".bmp",
				".heic",
				".avif",
				".svgz"
			],
			"format_priority": [
				"svg",
				"png_with_alpha",
				"webp_lossless",
				"jpeg_opaque"
			],
			"max_bytes": 589824,
			"max_bytes_svg": 32768,
			"allow_animated": false,
			"allow_data_uri": false
		},
		"require": {
			"min_short_edge": 256,
			"recommended_edge": 384,
			"low_resolution_warn_below": 384,
			"max_edge": 4096,
			"aspect_band": {
				"min_w_over_h": 0.5,
				"max_w_over_h": 2
			},
			"alpha_channel": "optional",
			"alpha_accepted_pil_modes": [
				"RGBA",
				"LA",
				"P_with_transparency"
			],
			"max_count": 1
		},
		"master": {
			"target_ratio": "1:1",
			"fit": "pad",
			"pad_color": "transparent",
			"allow_crop": false,
			"allow_upscale": false,
			"max_long_edge": 4096,
			"min_long_edge": 256,
			"format": "webp",
			"encoding": "lossless",
			"colorspace": "srgb",
			"orientation": "apply_exif",
			"in_file_safe_area_percent": 0,
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "bit_exact",
			"lossless_required": true,
			"reason": "Logo düz renk + keskin kenar. Kayıplı encode halkalanma (ringing) üretir; SSIM bu artefaktı logoda güvenilir ölçmez.",
			"reencode_floor_saving_ratio": null
		},
		"profiles": [
			{
				"name": "w64",
				"width": 64,
				"height": 64,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 4096,
				"serves": [
					"B2 filtre kenar çubuğu marka satırı @1x-3x"
				],
				"derived_from": "hesap: B2 16px @3x = 48 → üst basamak 64. Kutu: FilterSidebar.ts:698 (w-4 h-4)",
				"max_overshoot": 1.33,
				"byte_reference": "tradehubfront/icons/icon-48.webp 1332 B, icon-72.webp 2021 B (stat -f %z; file → gerçekte PNG) → 64 px ara değer ≈ 1700 B"
			},
			{
				"name": "w128",
				"width": 128,
				"height": 128,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 8192,
				"serves": [
					"B1 marka hero (<640px) @1x",
					"B1b marka hero (≥640px) @1x"
				],
				"derived_from": "hesap: max(B1 72px @1x = 72; B1b 104px @1x = 104) = 104 → üst basamak 128. Kutu: brand.ts:101 (w-24 h-24 / md:w-32 md:h-32, p-3)",
				"max_overshoot": 1.23,
				"byte_reference": "tradehubfront/icons/icon-128.webp 3600 B (file → gerçekte PNG 128×128 RGBA)"
			},
			{
				"name": "w256",
				"width": 256,
				"height": 256,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 16384,
				"serves": [
					"B1 @2x-3x",
					"B1b @2x"
				],
				"derived_from": "hesap: max(B1 72px @3x = 216; B1b 104px @2x = 208) = 216 → üst basamak 256. Kutu: brand.ts:101",
				"max_overshoot": 1.19,
				"byte_reference": "tradehubfront/icons/icon-256.webp 9159 B (file → gerçekte PNG 256×256 RGBA)"
			},
			{
				"name": "w384",
				"width": 384,
				"height": 384,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 23040,
				"serves": [
					"S1 @2x (280 kutu)",
					"348 ve 360 px talepleri"
				],
				"derived_from": "K3 kararı (logo.md §13-K3) ÖLÇÜMLE B'ye çevrildi, 2026-08-19. Tetik: 512 rung'unun gerçek baytı 40 KiB tavanına yaklaşırsa 5 rung. Ölçüm (18 gerçek logo, kayıpsız WebP): p50 27.162 B ≈ referans 27.128 B, p90 83.522 B, max 109.172 B; 9/18 referanstan ağır, 5/18 tavanı AŞIYOR. Tetik ateşledi. Bu rung en kötü aşırı-servisi 1,83× → 1,37× indirir.",
				"max_overshoot": 1.37
			},
			{
				"name": "w512",
				"width": 512,
				"height": 512,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 40960,
				"serves": [
					"B1b @3x"
				],
				"derived_from": "hesap: B1b 104px @3x = 312 → üst basamak 512 (1,64× aşırı-servis). Kutu: brand.ts:101 md:w-32 md:h-32 + p-3; bu projede md: = 640px (style.css:256-260, Tailwind varsayılanı EZİLMİŞ)",
				"max_overshoot": 1.64,
				"conditional": "recommended_edge=384 olduğu için 512 rung'u YALNIZ 384'ten büyük master'lardan doğar (engine.py:117 upscale yapmaz). 384 master'da en büyük rung 384'e kırpılır ve B1b @3x (312) yine karşılanır.",
				"byte_reference": "tradehubfront/public/icons/icon-512.png 27128 B (stat -f %z; file → PNG 512×512 RGBA kayıpsız)"
			},
			{
				"name": "og1200x630",
				"width": 1200,
				"height": 630,
				"formats": [
					"jpeg"
				],
				"encoder_quality": {
					"jpeg": 85
				},
				"fit": "pad",
				"target_ratio": "1200:630",
				"pad_color": "#FFFFFF",
				"max_bytes": 122880,
				"max_content_height": 453,
				"serves": [
					"og:image",
					"twitter:image"
				],
				"derived_from": "seo/og_image.py:20-21 OG_WIDTH=1200, OG_HEIGHT=630. Bağlanma: seo/meta_builder.py:282 og_image_resolver=lambda r: ensure_og_image(r, source_field='logo'). max_content_height = 630 × 0,72 = 453,6 → 453.",
				"fixes": "seo/og_image.py:45-49 bugün COVER-CROP yapıyor: 1:1 logo için top=(1200−630)//2=285 → logonun yüksekliğinin %47,5'i kesiliyor. :34 img.convert('RGB') alfayı belirsiz zemine düşürüyor, :51 JPEG q85 kayıplı. Bu profil üçünü de düzeltir.",
				"byte_reference": "tradehubfront/public/images/og-default.jpg 47649 B (file → JPEG 1200×630)"
			}
		],
		"content_rules": [
			{
				"rule": "animated",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "animated",
				"source": "media/engine.py:111-112 animasyonluyu atlıyor (reason='animated'); api/seller_media.py:245-247 .gif'i WebP dönüşümünden bilinçli dışarıda tutuyor."
			},
			{
				"rule": "no_alpha_channel",
				"threshold": true,
				"comparator": "eq",
				"action": "warn",
				"message_key": "format_no_alpha",
				"source": "3 render noktasının 2'si (B1, B1b) bg-white plaka koyuyor (brand.ts:101) ve bu plaka MARKA HERO'SUNUN KOYU GRADYANI içinde (brand.ts:145-147 linear-gradient(rgba(17,24,39,0.55), rgba(17,24,39,0.75))). Opak beyaz zeminli bir logo, beyaz plakayla aynı renk olup görünmez bir kutu bırakır. B2 (FilterSidebar.ts:698) beyaz filtre satırında — aynı sorun. ACTION=WARN (RET DEĞİL) — K1 ölçümle çözüldü: docs/reports/08-canli-olcum.md §2.1 (2026-08-18), Admin Seller Profile.logo + Brand.logo birleşik kümesinde diskte gerçek dosya olan 18 logonun 9'u JPEG = %50, §13-K1 tetiği (%10) aşıldı → seçenek B (kabul + uyarı + geçiş penceresi). DİKKAT — ÖLÇÜLEMEDİ: rapor JPEG payını slot bazında AYIRMIYOR (§4 'Slot bazında dağılım' kapatılmayanlar listesinde), yani Brand.logo'nun kendi JPEG oranı bilinmiyor. Karar yine de bu slota da uygulanıyor: seller.logo ile TEK kod yolu paylaşıldığı için (notes[1]) iki slotta farklı alfa yaptırımı tutmak sanitize/doğrulama hattını ikiye böler. Görsel gerekçe (beyaz plaka + koyu gradyan) geçerliliğini KORUYOR; değişen tek şey yaptırımın sertliği."
			},
			{
				"rule": "aspect_out_of_band",
				"threshold": [
					0.5,
					2
				],
				"comparator": "outside",
				"action": "reject",
				"message_key": "aspect_out_of_band",
				"source": "seller.logo ile AYNI band. Marka tarafında en küçük kutu B2 = 16×16 (FilterSidebar.ts:698); 2:1'de 16×8 px çizilir — satıcıdaki 32 px tabanından SIKIŞIK. Kabul gerekçesi: B2 dekoratif bir liste rozeti, marka adı metni yanında; tek başına tanıyıcı değil. Belirleyici nokta B1 (72 px içerik kutusu): 2:1'de 72×36 px, rahat. K2 ÖLÇÜMLE ONAYLANDI (docs/reports/08-canli-olcum.md §2.1, 2026-08-18): 18 gerçek logonun 16'sı (%89) 1:2…2:1 bandının içinde, band dışı 2 dosya (%11; ikisi de w/h = 2,876). §13-K2 tetiği (%20) aşılmadı → band DEĞİŞMEDİ."
			},
			{
				"rule": "aspect_normalize_to_square",
				"threshold": "1:1",
				"comparator": "pad_to",
				"action": "auto_fix",
				"message_key": null,
				"source": "Marka tarafında 3 render noktasının 3'ü de object-contain (brand.ts:101, FilterSidebar.ts:698) — kırpma YOK. Yine de master 1:1'e padlenir: (a) seller.logo ile aynı motor yolu kullanılır, iki kod yolu tutmanın maliyeti yok; (b) ileride eklenecek bir object-cover kutusuna karşı bağışıklık sağlar (satıcı tarafında bu tam olarak 5 yerde olmuş — docs/standards/logo.md §11-F4)."
			},
			{
				"rule": "data_uri_value",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "data_uri_forbidden",
				"source": "seed_demo_data.py:4209 doc.logo = _demo_logo(seller_code, brand_name, sector_key) → :287 _write_asset() → :231-245 data:image/svg+xml;base64 DB'ye yazılıyor, File kaydı AÇILMIYOR. Sonuç: utils/security.py:29-30 ve upload_policy.py:190 kapılarının ikisi de devre dışı; seo/og_image.py:59-69 data: URI'yi çözemediği için marka og:image'i sessizce site varsayılanına düşüyor."
			},
			{
				"rule": "svg_dtd_or_entity",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "svg_dtd_forbidden",
				"source": "XXE / billion-laughs. Parser defusedxml olmalı. docs/standards/logo.md §6.2 SVG-5."
			},
			{
				"rule": "svg_node_count",
				"threshold": 256,
				"comparator": "gt",
				"action": "reject",
				"message_key": "svg_too_complex",
				"measured_on": "sanitize çıktısı",
				"source": "Ölçüm (regex `<([a-zA-Z][\\w:-]*)`): amex.svg 2, public/vite.svg 11, ta-logo.svg 20, O1CN..tps-222-221.svg 32, svgviewer-output.svg 75 (otomatik trace), public/icons/ui.svg 463 (sprite). İKİNCİL savunma — bayt tavanı birincil (svgviewer-output.svg 75 düğüm ama 137695 bayt)."
			},
			{
				"rule": "svg_empty_after_sanitize",
				"threshold": 0,
				"comparator": "eq",
				"action": "reject",
				"message_key": "svg_empty_after_sanitize",
				"source": "Allowlist temizliği sonrası çizim elementi kalmadıysa dosya işlevsiz."
			},
			{
				"rule": "derivative_oversize",
				"threshold": "profiles[].max_bytes",
				"comparator": "gt",
				"action": "warn",
				"message_key": "derivative_oversize",
				"source": "Tavan aşılırsa üretim başarısız sayılmaz; uyarıyla yazılır ve envantere düşer."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "reject",
			"master": "warn",
			"quality": "warn",
			"content_rules": "reject",
			"error_code_prefix": "logo",
			"retryable": false,
			"retryable_reason": "upload_policy.py:98-100 kuralı: kullanıcının dosyasıyla ilgili hatalar tekrar denenmez"
		},
		"messages": {
			"tr": {
				"too_small": "Marka logosu en az 256×256 piksel olmalı; yüklediğiniz {w}×{h}. Bu boyutta logo marka sayfası hero'sunda (128 piksel kutu) yüksek çözünürlüklü ekranda bulanık çıkar. Markanın basın kitinden (press kit) veya vektör dosyasından 384×384 PNG olarak dışa aktarın.",
				"low_resolution": "Marka logosu yüksek çözünürlüklü ekranlarda bulanık görünebilir ({w}×{h}). Önerilen: 384×384 piksel. Bu bir engel değil — logo kaydedildi.",
				"aspect_out_of_band": "Logo oranı 1:2 ile 2:1 arasında olmalı; yüklediğiniz {w}:{h}. Marka logosu ürün filtrelerinde 16 piksellik satır rozetine kadar küçülüyor. Geniş bir kelime markası için onun kare (simge) sürümünü kullanın.",
				"format_no_alpha": "Marka logosu saydam zeminli değil. Marka sayfası hero'su koyu bir gradyan üzerine beyaz bir plaka koyuyor; opak beyaz zeminli bir logo o plakayla aynı renk olup görünmez hâle gelir. Logo kaydedildi — bu bir engel değil, uyarı. Düzeltmek için saydam zeminli PNG veya WebP olarak yeniden kaydedip yükleyin.",
				"format_animated": "Marka logosu animasyonlu olamaz. Tek kareli bir PNG veya WebP yükleyin.",
				"format_not_supported": "{bicim} biçimi marka logosu için kabul edilmiyor. Kabul edilen biçimler: PNG, WebP, JPEG — JPEG saydamlık taşımadığı için kabul edilir ama uyarı üretir.",
				"too_large": "Marka logosu dosyası çok büyük ({mb} MB); üst sınır {max_mb} MB. Bir logo, 384×384 pikselde normalde 20 KB'ın altında kalır.",
				"svg_dtd_forbidden": "SVG dosyası desteklenmeyen bir yapı içeriyor. Tasarım programınızdan 'sade SVG' / 'optimize SVG' seçeneğiyle yeniden dışa aktarın.",
				"svg_too_complex": "SVG çok karmaşık ({dugum} öğe; üst sınır 256). Logo olarak tasarlanmış, sadeleştirilmiş bir dosya yükleyin.",
				"svg_empty_after_sanitize": "SVG dosyasında güvenli olmayan içerik temizlendikten sonra çizilecek bir şey kalmadı. PNG olarak yükleyin.",
				"data_uri_forbidden": "Marka logosu bir dosya olarak yüklenmeli; gömülü veri (data: URI) kabul edilmiyor.",
				"derivative_oversize": "Logo kaydedildi, ancak bazı boyutları beklenenden büyük çıktı. Görüntülenmeyi etkilemez."
			}
		},
		"logo": {
			"svg_policy": {
				"enabled": false,
				"identical_to": "seller-logo.json svg_policy — TÜM maddeler birebir aynı. İki slotta farklı SVG kuralı tutmak, sanitize'in iki kod yolu olması demektir; bu güvenlik açığının klasik doğuş yeri.",
				"enable_requires": "docs/standards/logo.md §6.2 SVG-1…SVG-10 maddelerinin TÜMÜ.",
				"gate_1": "tradehub_core/utils/security.py:27-44 _DENIED_EXTENSIONS içinde '.svg' (:29) ve '.svgz' (:30)",
				"gate_2": "tradehub_core/media/upload_policy.py:190 _DANGEROUS_MARKERS içinde b'<svg'",
				"gate_3_open": "seed_demo_data.py:4209 → :287 → :231-245 data: URI kanalı. MARKA logoları da bu kanaldan geçmiş.",
				"both_gates_must_open_together": true,
				"scope": "slot-kapsamlı; yalnız seller.logo ve brand.logo. Global açılış YASAK. Ön koşul: slot kayıt defteri (bugün yok — docs/reports/00-upload-slot-envanteri.md §1 'L3 yok').",
				"sanitize_location": "sunucu, File kaydı yazılmadan ÖNCE",
				"stored_content": "sanitize edilmiş sürüm; orijinal DEĞİL",
				"pipeline_order": [
					"1. slot_key logo slotu mu — değilse RET",
					"2. uzantı .svg mi — .svgz ise RET",
					"3. XML iyi biçimli mi (defusedxml) — değilse RET",
					"4. DTD / ENTITY var mı — varsa RET",
					"5. sanitize (allowlist) çalıştır",
					"6. düğüm sayısı <= 256 mı — değilse RET",
					"7. çıktı <= 32768 B mi — değilse RET",
					"8. is_dangerous() ATLA — 'sanitize edildi' bayrağına bağlı",
					"9. File kaydını SANITIZE EDİLMİŞ içerikle aç"
				],
				"allowed_elements": [
					"svg",
					"g",
					"path",
					"rect",
					"circle",
					"ellipse",
					"line",
					"polyline",
					"polygon",
					"defs",
					"linearGradient",
					"radialGradient",
					"stop",
					"clipPath",
					"mask",
					"use",
					"title",
					"desc",
					"symbol"
				],
				"allowed_attributes": [
					"viewBox",
					"xmlns",
					"width",
					"height",
					"d",
					"x",
					"y",
					"x1",
					"y1",
					"x2",
					"y2",
					"cx",
					"cy",
					"r",
					"rx",
					"ry",
					"points",
					"transform",
					"fill",
					"fill-rule",
					"fill-opacity",
					"stroke",
					"stroke-width",
					"stroke-linecap",
					"stroke-linejoin",
					"stroke-dasharray",
					"stroke-opacity",
					"opacity",
					"offset",
					"stop-color",
					"stop-opacity",
					"gradientUnits",
					"gradientTransform",
					"clip-path",
					"mask",
					"id",
					"class"
				],
				"stripped_with_reason": {
					"script, handler": "doğrudan kod çalıştırma",
					"foreignObject": "içine HTML gömülebilir",
					"image": "dış kaynak isteği (SSRF / iz sürme)",
					"style elementi ve style attribute": "background:url(...), @import ile dış istek",
					"animate, animateTransform, animateMotion, set, discard": "logo animasyonlu olmaz; SMIL XSS vektörü",
					"on* attribute'larının tamamı": "allowlist otomatik siler + isim-öneki kuralıyla ikinci tarama",
					"filter, feImage, fe*": "feImage dış kaynak çekebiliyor",
					"XML PI, yorum, <!DOCTYPE>, <!ENTITY>": "silinir / RET"
				},
				"href_rule": "yalnız '#' ile başlayan değer korunur; http/https/data/javascript/protokol-relatif/göreli → attribute silinir",
				"svgz_allowed": false,
				"viewbox_required": true,
				"serving": {
					"img_src_only": true,
					"dom_inline_forbidden": true,
					"dom_inline_reason": "Marka logosu bugün de yalnız <img src> ile basılıyor (brand.ts:101, FilterSidebar.ts:698 — 3 render noktasının 3'ü). <img> ile yüklenen SVG script çalıştırmaz — ikinci savunma hattı.",
					"content_type": "image/svg+xml",
					"x_content_type_options": "nosniff",
					"content_security_policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
					"verification_note": "docs/standards/logo.md §12-D6 doğrulanmadan svg_policy.enabled=true yapılamaz."
				}
			},
			"dark_theme": {
				"variant_required": false,
				"reason": "3 render noktasının 2'si (B1, B1b) bg-white plaka koyuyor (brand.ts:101) ve bu plaka dark: varyantı TAŞIMIYOR — koyu temada da beyaz kalıyor. B2 beyaz filtre satırında. Satıcı slotundaki S1 riski (plakasız kutu, arka plan kullanıcı görseli) markada YOK: marka hero'sunun koyu gradyanı logonun altına gelmiyor, beyaz plaka araya giriyor.",
				"rule": "logo her zaman açık bir plaka üzerinde render edilir",
				"violating_render": null
			},
			"css_safe_area": {
				"standard_percent": 8,
				"scope": "yalnız YENİ render noktaları",
				"in_file_percent": 0,
				"measured_existing": "brand.ts:101 p-3 = 12 px → 96 px kutuda %12,50; 128 px kutuda %9,375. Bu iki değer, seller.logo tarafındaki 5 ölçümle birlikte medyanı %8,33 yapan yedi ölçümün ikisi.",
				"reason": "Padding CSS'te ZATEN uygulanıyor. Dosyaya gömmek çift padding üretir."
			},
			"render_points": [
				{
					"id": "B1",
					"where": "Marka hero logosu (<640px)",
					"file": "tradehubfront/src/pages/brand.ts:101",
					"outer_box_px": 96,
					"padding_px": 12,
					"content_box_px": 72,
					"fit": "contain",
					"plate": "bg-white",
					"dpr": [
						72,
						144,
						216
					],
					"note": "w-24 h-24 + p-3; plaka marka hero'sunun koyu gradyanı içinde (brand.ts:145-147)"
				},
				{
					"id": "B1b",
					"where": "Marka hero logosu (≥640px md:)",
					"file": "tradehubfront/src/pages/brand.ts:101",
					"outer_box_px": 128,
					"padding_px": 12,
					"content_box_px": 104,
					"fit": "contain",
					"plate": "bg-white",
					"dpr": [
						104,
						208,
						312
					],
					"note": "md:w-32 md:h-32 + p-3 — EN BÜYÜK TALEP (312 px). Bu projede md: = 640px (style.css:256-260, Tailwind varsayılanı EZİLMİŞ; docs/reports/03-render-envanteri.md §1.1)"
				},
				{
					"id": "B2",
					"where": "Ürün filtre kenar çubuğu — marka satırı",
					"file": "tradehubfront/src/components/products/FilterSidebar.ts:698",
					"outer_box_px": 16,
					"padding_px": 0,
					"content_box_px": 16,
					"fit": "contain",
					"plate": "beyaz satır",
					"dpr": [
						16,
						32,
						48
					],
					"note": "w-4 h-4 — EN KÜÇÜK kutu. Dekoratif rozet: marka adı metni yanında, tek başına tanıyıcı değil"
				}
			],
			"unmeasured": [
				{
					"where": "Arama önerileri — marka satırı",
					"evidence": "tradehub_core/api/search.py:81 (.select(Brand.name, Brand.brand_name, Brand.slug, Brand.logo)) ve :93 ('logo': r.logo or ''); tradehub_core/api/tailored.py:721 (fields=[..., 'logo'])",
					"status": "Backend logoyu GÖNDERİYOR, storefront'ta bu veriyi <img>'e bağlayan bir bileşen BULUNAMADI (grep -rn 'logo' src/ | grep -iE '<img|:src=' çıktısında arama öneri bileşeni yok).",
					"impact": "Boşa network + boşa alan. docs/standards/logo.md §11-F6."
				}
			]
		},
		"sources": {
			"require.min_short_edge=256": "B1 (72 CSS px, brand.ts:101) DPR3 talebi 216; 256 bunu karşılar. seller.logo ile AYNI eşik — iki slot arasında farklı sert-ret eşiği tutmak, tek bir upload_policy dalında iki kod yolu demek olurdu.",
			"require.recommended_edge=384": "B1b DPR3 talebi 104 × 3 = 312. 384, 312'yi %23 payla karşılayan pratik ölçü. 512'ye çıkarmak 512 rung'unu doğururdu; B1b onu ASLA kullanmaz (312 < 512), yani her marka logosu için ölü bir rung üretilirdi. seller.logo'da 512 seçildi çünkü orada gerçek talep 480 (admin dropzone 160 px @3x, ProfileImageDropzone.vue:135).",
			"require.max_edge=4096": "media/presets.py:15-17 max_dim değerlerinden (2560/2000/1600) büyük.",
			"require.aspect_band": "content_rules[aspect_out_of_band].source. ÖLÇÜMLE ONAYLANDI (K2): docs/reports/08-canli-olcum.md §2.1 — 16/18 = %89 band içinde, %11 dışında; §13-K2 tetiği %20 → band 1:2…2:1 olarak KALDI. Slot bazında ayrıştırma ÖLÇÜLEMEDİ (rapor §4).",
			"require.alpha_channel=optional": "docs/reports/08-canli-olcum.md §2.1 (2026-08-18): birleşik kümede 9/18 = %50 JPEG → docs/standards/logo.md §13-K1 tetiği (%10) aşıldı; değer 'required'dan 'optional'a indirildi, yaptırım content_rules[no_alpha_channel].action='warn' oldu. 'optional' 'fark etmez' demek DEĞİL: alfasızlık ölçülür, uyarı gösterilir, envantere yazılır. Görsel gerekçe: content_rules[no_alpha_channel].source. Motor bu üç modu ZATEN doğru ayırt ediyor: engine.py:169-176; tests/test_engine_webp.py:54 alfanın korunduğunu doğruluyor.",
			"accept.mime += image/jpeg": "docs/reports/08-canli-olcum.md §2.2 K1 (2026-08-18): ölçüm %50 JPEG → §13-K1 seçenek B. .jpg/.jpeg rejected_extensions'tan çıkarıldı, mime'a image/jpeg eklendi, format_priority'de EN SONA ('jpeg_opaque') konuldu — kabul edilir ama tavsiye edilmez. seller-logo.json ile birebir aynı değişiklik: iki logo slotu tek kod yolu paylaşır (notes[1]).",
			"accept.max_bytes=589824": "384 × 384 × 4 (RGBA) = 589824 B — depolanan en büyük master'ın SIKIŞTIRILMAMIŞ boyutu. seller.logo'daki aynı kural (1048576 = 512×512×4) 384 master'a uyarlanmış. Kendi ham raster'ından büyük dosya tanım gereği logo değil.",
			"accept.max_bytes_svg=32768": "Ölçüm: ta-logo.svg = 12379 B (gerçek kelime markası, 20 düğüm) × 2,65. Karşı örnek: ta-shield-pattern.svg 105516 B, svgviewer-output.svg 137695 B — ikisi de reddedilir.",
			"accept.mime": "seller.logo ile aynı daraltma. DÜZELTME 2026-08-18 (K1): .jpg/.jpeg ARTIK DIŞARIDA DEĞİL — alfa yokluğu uyarıya indi (bkz. accept.mime += image/jpeg girdisi). Hâlâ dışarıda bırakılanlar: .gif (engine.py:111-112 animasyonlu atlanıyor); .tif/.tiff/.bmp/.heic (tarayıcı render etmez, iki yol ayrışıyor: api/seller_media.py:245 WebP'ye çevirir, engine.py:126-131 TIFF'i TIFF bırakır); .avif (upload_policy.py:59 izinli AMA engine.py:21 SUPPORTED_FORMATS içinde değil → engine.py:109 'unsupported_format').",
			"accept.allow_data_uri=false": "content_rules[data_uri_value].source",
			"master.pad_color=transparent": "Ürün görseli slotu #FFFFFF padliyor (product-image.json). Marka logosunda beyaz pad de çalışırdı (3 plakanın 3'ü beyaz/beyaz-satır) AMA saydam seçildi: seller.logo ile aynı motor yolu, ve ileride gri plakalı bir render eklenirse beyaz pad orada görünür kutu bırakırdı.",
			"master.allow_upscale=false": "engine.py:97 docstring 'Yalnız downscale — upscale yok' + :117 im.thumbnail().",
			"master.encoding=lossless": "api/seller_media.py:292 → media/engine.py:148 to_webp(data, quality: int = 80) → :180 im.save(buf,'WEBP',quality=quality,method=4) KAYIPLI. Karşılaştırma: engine.py:120-122 PNG yolu kayıpsız. İki yol ayrışıyor (docs/standards/logo.md §11-F5).",
			"master.in_file_safe_area_percent=0": "css_safe_area.reason",
			"profiles[].width": "docs/standards/logo.md §4.2 piksel tablosu; her profilin derived_from alanı kendi hesabını taşıyor. Marka talepleri: 3 kutu × DPR 1/2/3 = 9 talep.",
			"profiles[].max_bytes": "Her profilin byte_reference alanı ölçülen dosyayı gösteriyor (stat -f %z + file). Ölçülen B/px eğrisi: 0,103 (icon-512.png) → 0,220 (icon-128) → 0,578 (icon-48).",
			"profiles_ladder_identical_to_seller": "seller.logo ile AYNI merdiven (64/128/256/384/512 — w384, K3'ün 2026-08-19 ölçümüyle İKİ slota birden eklendi, docs/standards/logo.md §13-K3). Marka için ayrı merdiven (64/128/256/384) tutmanın bakım maliyeti, ölçülen fark (312 vs 480 px talep) karşılığında haklı değil — ve 384 rung'u zaten seller tarafında da tartışmalı (docs/standards/logo.md §13-K3).",
			"profiles[og1200x630]": "profiles[og1200x630].derived_from ve .fixes",
			"dpr_range=[1,2,3]": "capacitor.config.ts:22 appId 'com.istoc.app', :35 preferredContentMode 'mobile'. DPR 4 desteklenmiyor.",
			"breakpoints": "tradehubfront/src/style.css:256-260 — bu projede Tailwind varsayılanları EZİLMİŞ: sm=480, md=640, lg=768, xl=1024. B1b'nin md: kırılımı 768 DEĞİL 640. Çapraz kontrol: docs/reports/03-render-envanteri.md §1.1",
			"profiles[w384]": "docs/standards/logo.md §13-K3 (2026-08-19 ölçümle kapandı, seçenek B). max_bytes 23040 = hesap: 40960 × 384² / 512². Markada bu rung B1b @3x (312) talebini 1,23× payla karşılar (512 rung'unda 1,64×).",
			"status=draft": "docs/reports/16-t029-politika-aktivasyonu.md — K1–K6 kapandı ama open_questions boş değil: tradehub_core/media/usage.py:32-41 LIVE_SOURCES'ta tabBrand.logo yok."
		},
		"open_questions": [
			"Brand.logo LIVE_SOURCES'ta KAYITLI DEĞİL — 2026-08-19'da YENİDEN DOĞRULANDI, hâlâ eksik (tradehub_core/media/usage.py:32-41, 8 satır, tabBrand yok). Bu politika 'active' YAPILAMAZ: kayıt eklenmeden uygulanırsa marka logoları 'kullanılmıyor' görünüp silme adayı olur (docs/reports/00-upload-slot-envanteri.md §7-B6). Çözümü media/usage.py değişikliğidir, bu politikanın değil."
		],
		"production_verification_required": [
			"D1 — Gerçek marka logosu dosyalarının piksel/oran/PIL-mode/bayt dağılımı. require.min_short_edge=256 sert reddi bu çıktı olmadan üretime alınamaz. Tam betik: docs/standards/logo.md §12-D1 (döngüde ('Brand','logo') zaten var).",
			"D2 — Brand.logo alanında data: URI sayısı. seed_demo_data.py:4209 kaynaklı; üretimde 0 olmalı. Tam betik: §12-D2",
			"D3 — Tarayıcıda hesaplanmış kutu ölçüleri. render_points[].content_box_px değerleri Tailwind sınıfından TÜRETİLDİ, ÖLÇÜLMEDİ. Özellikle B1b: md: kırılımının bu projede 640px olduğu style.css:256-260'tan OKUNDU, tarayıcıda doğrulanmadı. Tam betik: §12-D3, /marka/<slug> sayfasında.",
			"D4 — Türev baytlarının gerçek ölçümü. profiles[].max_bytes tavanlarını onaylar ya da düzeltir. Tam betik: §12-D4",
			"D5 — og:image kırpma hasarının GÖRSEL doğrulaması (%47,5 kesilme beklenir), doctype 'Brand' ile. Tam betik: §12-D5",
			"D6 — SVG servis başlıkları. svg_policy.enabled=true'nun ön koşulu. Tam betik: §12-D6",
			"D7 — Depolama etkisi. Logolu marka sayısı bilinmiyor: frappe.db.count('Brand', {'logo': ['is','set']}). Tam betik: §12-D7",
			"Arama önerisi bulgusu (unmeasured[0]) — api/search.py:93'ün gönderdiği 'logo' alanını tüketen bir istemci gerçekten yok mu? Canlı sitede /arama?q=<marka> yazarken DevTools Network'te öneri yanıtını aç, Sources'ta 'logo' alanını kimin okuduğunu ara. Bulunmazsa §11-F6 onaylanır."
		],
		"notes": [
			"KARAR K1 — KAPANDI (2026-08-18, ölçümle). 'JPEG logo RET mi, uyarıyla kabul mü?' → UYARIYLA KABUL + geçiş penceresi (seçenek B). Tetik §13-K1'de önceden yazılıydı: 'JPEG payı %10'u geçerse B'. docs/reports/08-canli-olcum.md §2.1 ölçtü: Admin Seller Profile.logo (27) + Brand.logo (11) = 38 referanstan diskte gerçek dosya olan 18'inin 9'u JPEG = %50, alfalı 4/18 = %22. Öneri A (ret) düştü. ÖLÇÜLEMEDİ: bu payın slot bazında dağılımı (rapor §4) — Brand.logo'nun kendi oranı bilinmiyor, karar birleşik küme üzerinden verildi. Değişen alanlar: accept.mime, accept.extensions, accept.rejected_extensions, accept.format_priority, require.alpha_channel (required → optional), content_rules[no_alpha_channel].action (reject → warn), messages.tr.format_no_alpha, messages.tr.format_not_supported.",
			"KARAR K2 — KAPANDI (2026-08-18, ölçümle). 'Oran bandı 1:2…2:1 mi, 1:4…4:1 + kare mark varyantı mı?' → 1:2…2:1 KALDI (seçenek A). Ölçüm: 16/18 = %89 band içinde, %11 dışında (2 dosya, ikisi de w/h = 2,876); tetik %20 aşılmadı. Bu politikada DEĞİŞEN SAYI YOK — require.aspect_band = {0.5, 2.0} aynen kaldı, yalnız kaynak referansları güncellendi.",
			"KARAR K3 — KAPANDI (2026-08-19, ölçümle). 'Merdiven 4 rung mu, 5 rung mu (+384)?' → 5 RUNG (seçenek B). Öneri A (4 rung) ölçümle DÜŞTÜ. Tetik §13-K3'te önceden yazılıydı: '512 rung'unun gerçek baytı 40 KiB tavanına yaklaşıyorsa B'. §12-D4 koşuldu (18 gerçek logo, kayıpsız WebP): p50 27.162 B ≈ referans icon-512.png 27.128 B, p90 83.522 B, max 109.172 B = tavanın 2,7 katı; 9/18 referanstan ağır, 5/18 tavanı AŞIYOR. Bu politikada değişen: profiles[] dizisine w384 eklendi (max_bytes 23.040). Marka tarafında 384 zaten B1b @3x (312) için ideal rung'du (1,23× vs 1,64×); iki slot AYNI merdiveni taşımaya devam ediyor, URL sözleşmesi bölünmedi. docs/standards/logo.md §13-K3",
			"KARAR K4 — KAPANDI (2026-08-19, varsayılanda onaylandı). 'PNG yedeği üretilsin mi?' → HAYIR, yalnız kayıpsız WebP (seçenek A). Bu politikada değişen sayı YOK. docs/standards/logo.md 'VARSAYILANDA ONAYLANAN KARARLAR — 2026-08-19'",
			"KARAR K5 — KAPANDI (2026-08-19, varsayılanda onaylandı). 'Panelin ölçü tavsiyesi' → 512×512 (seçenek A). MARKA TARAFINDA UYGULANAMAZ DURUMDA: Brand.logo alanı için panelde HİÇBİR ölçü tavsiyesi metni yok (seller.logo'da en az '400×400' var — DocTypeFormView.vue:448). Kararın marka karşılığı 'recommended_edge=384 bir yere yazılsın' işidir ve hangi ekrana yazılacağı (generic Attach dalı mı, Brand'e özel dropzone mu) hâlâ AÇIK — ayrı görev, admin-panel deposunda. docs/standards/logo.md 'VARSAYILANDA ONAYLANAN KARARLAR — 2026-08-19'",
			"KARAR K6 — KAPANDI (2026-08-19, varsayılanda onaylandı). 'min_short_edge=256 sert reddi GEÇMİŞE dönük uygulanacak mı?' → YALNIZ YENİ YÜKLEMELERE (seçenek A). Ölçüm: kısa kenarı 256'nın altında olan 1/18 = %5,5. Markada risk satıcıdan düşük: alanı yalnız admin yazıyor. Bu politikada değişen sayı YOK. docs/standards/logo.md 'VARSAYILANDA ONAYLANAN KARARLAR — 2026-08-19'",
			"STATUS = DRAFT KALDI (2026-08-19, T-029). K1–K6'nın altısı da kapandı ve encoder_quality null YOK; buna rağmen bu politika 'active' YAPILMADI. TEK ENGEL, bu dosyanın kendi open_questions maddesidir ve DOĞRULANDI: Brand.logo hâlâ media/usage.py LIVE_SOURCES içinde KAYITLI DEĞİL (2026-08-19'da okundu: LIVE_SOURCES 8 satır — tabListing ×2, tabListing Image, tabListing Variant Item ×2, tabStorefront Layout, tabSeller Gallery Image, tabAdmin Seller Profile.logo; tabBrand YOK). Politika bu kaydı kendi ön koşulu olarak yazmış: kayıt eklenmeden politika uygulanırsa marka logoları 'kullanılmıyor' görünüp SİLME ADAYI olur (docs/reports/00-upload-slot-envanteri.md §7-B6). Kaydın eklenmesi media/usage.py değişikliğidir — T-029'un kapsamı DIŞINDA. docs/reports/16-t029-politika-aktivasyonu.md",
			"Bu politika bugün HİÇBİR kod yolu tarafından okunmuyor. tradehub_core/media/pipeline/ altında bu görevden önce hiçbir dosya yoktu. upload_policy.check() imzasında slot parametresi YOK (media/upload_policy.py:306-312) — docs/reports/00-upload-slot-envanteri.md §1: 'L3 — Slot semantiği: Sistemde hiç yok'.",
			"brand.logo, seller.logo'nun DAR bir kopyasıdır: aynı motor yolu, aynı merdiven, aynı formatlar, aynı oran bandı, aynı SVG politikası. Tek farklar: recommended_edge (384 vs 512), accept.max_bytes (576 vs 1024 KiB), roller (yalnız admin), ve dark_theme.violating_render (markada yok). İki ayrı standart tutmanın bakım maliyeti ölçülen fark karşılığında haklı değil.",
			"Marka logosunun satıcıdan ÖNEMLİ bir avantajı: alanı yalnız admin yazıyor. Yani ihlal oranı düşük ve düzeltme kontrollü. Dezavantajı: panelde HİÇBİR ölçü tavsiyesi yok — satıcıda en az '400×400' metni var (DocTypeFormView.vue:448), markada o bile yok (open_questions[4]).",
			"Marka hero BANNER'ı (Brand.hero_banner) bu slotun DIŞINDA: brand.ts:145-148 CSS background-image ile basılıyor, <img> değil → loading/decoding/srcset uygulanamıyor (docs/reports/00-upload-slot-envanteri.md §7-B4). Ayrı bir slot politikası gerekiyor.",
			"Uygulama sırası: 1) slot kayıt defteri → 2) logo doğrulama kodları → 3) oran normalizasyonu → 4) türev merdiveni → 5) og:image düzeltmesi → 6) srcset → 7) SVG kabulü. docs/standards/logo.md §10",
			"ŞEMA NOTU: bu dosya tradehub_core/media/pipeline/policy/slots/ altındaki çoğunluk şemasına (product-image.json, product-video.json, company-cover-image.json, category-banner.json) hizalandı. Kardeş dosyalarda 4 farklı şema var — kayıt defteri yazılmadan önce tek şemaya indirilmeli."
		]
	},
	"category.banner": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.0.0",
		"status": "draft",
		"slot_key": "category.banner",
		"title": "Kategori bandı / kategori vitrin görseli",
		"description": "Kategori tanıtım görseli. DİKKAT: 'kategori banner' bu kod tabanında ÜÇ AYRI KAVRAM olarak dağılmış ve banner biçimindeki tek render ÖLÜ koddur. Bugün canlı olan tek kategori medyası ana sayfanın bento döşemesidir (Category Showcase Tile.image) ve o da banner değil, değişken oranlı bir hücre: aynı dosya 3 span'a (1x1, 2x1, 2x2) ve 8 viewport'a kırpılıyor, kutu oranı 0,82:1 ile 4,68:1 arasında geziniyor. Bu politika kuralı bento gerçeğine göre yazar, hayali bandın üzerine değil.",
		"roles": [
			"admin",
			"seller"
		],
		"bound_to": [
			{
				"doctype": "Category Showcase Tile",
				"field": "image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `category_showcase.tile_image`; render tradehubfront/src/components/category/CategoryShowcase.ts:152-154, grid :245. BUGÜN CANLI OLAN TEK KATEGORİ GÖRSELİ. LIVE_SOURCES'ta YOK (§7-B B6)."
			},
			{
				"doctype": "Brand",
				"field": "hero_banner",
				"fieldtype": "Attach Image",
				"source": "tradehub_core/tradehub_core/doctype/brand/brand.json:107 — alan açıklaması 'önerilen 1920×400'; render tradehubfront/src/pages/brand.ts:145-148 (CSS background, <img> DEĞİL). Kategori değil marka bandı ama banner geometrisi aynı sınıf."
			},
			{
				"doctype": "Seller Category",
				"field": "image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller_category.image` — satıcının kendi kategori görseli; storefront render'ı BULUNAMADI. Product Category ile ayrı kavram."
			}
		],
		"accept": {
			"mime": [
				"image/jpeg",
				"image/png",
				"image/webp"
			],
			"extensions": [
				".jpg",
				".jpeg",
				".png",
				".webp"
			],
			"max_bytes": 5242880,
			"max_megapixels_hard": 80,
			"allow_animated": false
		},
		"require": {
			"min_short_edge": 480,
			"min_area": 460800,
			"allowed_ratios": [
				"5:4",
				"3:2",
				"16:9",
				"2:1",
				"5:2",
				"3:1"
			],
			"ratio_tolerance": 0.12,
			"max_count": 1
		},
		"master": {
			"max_long_edge": 2000,
			"min_long_edge": 1920,
			"max_megapixels": 2,
			"dpi_out": 72,
			"colorspace": "srgb",
			"format": "webp",
			"orientation": "apply_exif",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"target_ssim_per_class": {
				"photo": 0.96,
				"graphic": 0.98,
				"text": 0.99
			},
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "catbanner_480",
				"width": 480,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "2:1",
				"serves": [
					"bento 1x1 döşemesi 360-430px telefonlarda @2x",
					"bento 1x1 döşemesi 640px viewport @1x"
				],
				"derived_from": "hesap: 1x1 hücre 430px viewport'ta 195 CSS px (container 398 − gap 8, ÷2) → @2x = 390; 640px viewport'ta 296 CSS px @1x. max(390, 296) = 390 → üst basamak 480. Kutu formülü: docs/reports/03-render-envanteri.md §1.2 container-boxed + tradehubfront/src/components/category/CategoryShowcase.ts:245 (grid-cols-2, gap-2 sm:gap-4, auto-rows-[85px] sm:145px lg:210px)",
				"max_overshoot": 1.23
			},
			{
				"name": "catbanner_960",
				"width": 960,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "2:1",
				"serves": [
					"bento 2x1 döşemesi 360-640px @1x-@1.5x",
					"bento 1x1 döşemesi 1920px viewport @2x",
					"bento 2x2 döşemesi 1024px viewport @2x"
				],
				"derived_from": "hesap: max(1x1 @1920 viewport = 432 CSS px @2x = 864; 2x2 @1024 viewport = 488 CSS px @2x = 976 → 960'a yuvarlandı, %1,7 eksik) = 960. Kutular: CategoryShowcase.ts:245 + docs/reports/03-render-envanteri.md §1.2",
				"max_overshoot": 1.11
			},
			{
				"name": "catbanner_1920",
				"width": 1920,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "2:1",
				"serves": [
					"bento 2x1 döşemesi 1920px viewport @2x",
					"master / arşiv"
				],
				"derived_from": "hesap: en büyük hücre 2x1 @1920 viewport = 880 CSS px (container 1776 − padding hesabı, 4 sütun, gap 16) → @2x = 1760 → üst basamak 1920. Kutu: CategoryShowcase.ts:245, container formülü docs/reports/03-render-envanteri.md §1.2",
				"max_overshoot": 1.09
			}
		],
		"content_rules": [
			{
				"rule": "safe_area_center_fraction",
				"threshold": 0.42,
				"comparator": "lt",
				"action": "warn",
				"message_key": "guvenli_alan_disi",
				"source": "hesap: bento kutu oranı 0,82:1 (768px viewport, 1x1 hücre 172×210) ile 4,68:1 (430px viewport, 2x1 hücre 398×85) arasında. object-cover ile oranı R olan görselin görünen kesiti min(B/R, R/B). En kötü durumu minimize eden R = sqrt(0,82 × 4,68) = sqrt(3,838) = 1,96; bu R'de en kötü kesit her iki eksende eşit: 0,82/1,96 = 0,418 ve 1,96/4,68 = 0,419 → %42. Kutular: CategoryShowcase.ts:245 (auto-rows + grid-cols) ve docs/reports/03-render-envanteri.md §1.2."
			},
			{
				"rule": "tile_span_declared",
				"threshold": false,
				"comparator": "eq",
				"action": "review",
				"message_key": "span_bilinmiyor",
				"source": "tradehubfront/src/components/category/CategoryShowcase.ts:137 (spanClasses) ve :142-148 — render tarafı span'ı biliyor ve etiket boyutunu ona göre değiştiriyor, ama YÜKLEME ekranı span'ı hiç göstermiyor. docs/reports/00-upload-slot-envanteri.md §7-B B2."
			},
			{
				"rule": "long_edge",
				"threshold": 960,
				"comparator": "lt",
				"action": "reject",
				"message_key": "cok_kucuk",
				"source": "hesap: en büyük hücre 880 CSS px (2x1 @1920 viewport); 960 bunun üstündeki ilk yuvarlak değer ve @1x'i kesin karşılar."
			},
			{
				"rule": "rendered_as_css_background",
				"threshold": true,
				"comparator": "eq",
				"action": "review",
				"message_key": "css_background_kisiti",
				"source": "tradehubfront/src/pages/brand.ts:145-148 — Brand.hero_banner inline `background: url(...) center/cover` ile basılıyor; loading/decoding/srcset/fetchpriority uygulanamaz. docs/reports/00-upload-slot-envanteri.md §7-B B4."
			},
			{
				"rule": "bottom_third_text_overlap",
				"threshold": true,
				"comparator": "eq",
				"action": "ignore",
				"message_key": "alt_serit_gradient_var",
				"source": "tradehubfront/src/components/category/CategoryShowcase.ts:154 — `bg-gradient-to-t from-black/75 via-black/25 to-transparent` scrim'i ZATEN VAR ve etiketi her görselde okunur kılıyor. Yani 'görselin alt kısmına önemli şey koyma' kuralı çözülmüş; ölç ama uyarı üretme."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "warn",
			"master": "auto_fix",
			"content_rules": "warn",
			"error_code_prefix": "upload",
			"retryable": false
		},
		"messages": {
			"tr": {
				"bicim_desteklenmiyor": "Bu görsel biçimi kategori görseli için kabul edilmiyor ({bicim}). JPG, PNG veya WebP olarak kaydedip yükleyin ({izinli_bicimler}).",
				"cok_buyuk": "Dosya {mb} MB; sınır {max_mb} MB. Kategori görselini 1920 piksel genişliğe küçültmek boyutu genelde yeterince düşürür.",
				"cok_kucuk": "Kategori görseli {kisa_kenar} piksel; en az {gerekli_kisa_kenar} piksel gerekiyor. Geniş döşemelerde bu ölçünün altı bulanık çıkar.",
				"oran_uygun_degil": "Görselin oranı {oran}; önerilen 2:1 ({izinli_oranlar}). Vitrin döşemeleri ekran boyutuna göre hem yatay hem dikey şekle girdiği için 2:1 en az kırpılan orandır.",
				"guvenli_alan_disi": "Önemli içerik görselin kenarlarında kalmış. Vitrin döşemesi bazı ekranlarda dikey, bazılarında çok geniş olduğu için yalnız ortadaki %42 × %42'lik alan her zaman görünür.",
				"span_bilinmiyor": "Bu görselin hangi döşeme boyutunda (1x1, 2x1, 2x2) gösterileceği yükleme sırasında belli değil. Döşeme boyutunu seçtikten sonra görseli kontrol edin.",
				"css_background_kisiti": "Bu görsel CSS arka planı olarak basılıyor; tarayıcı ekran boyutuna göre farklı boy seçemez. Teknik ekibin bu alanı <img> etiketine taşıması gerekir.",
				"alt_serit_gradient_var": "Görselin alt kısmına kategori adı basılıyor; koyu bir geçiş katmanı otomatik ekleniyor, ayrıca bir şey yapmanız gerekmez."
			}
		},
		"sources": {
			"accept.mime": "Standart daraltma: panelde bugün `accept=\"image/*\"` var (admin-panel/frontend/src/views/products/CategoryManagementView.vue:924-928) — bu listeden çok geniş ve zaten doğrulama değil (docs/MEDYA-YUKLEME-SOZLESMESI.md §1). Liste tradehub_core/media/upload_policy.py:60-62 KIND_IMAGE kümesinden ekranda kullanılan 3 biçime indirildi.",
			"accept.extensions": "tradehub_core/media/upload_policy.py:60-62 (KIND_IMAGE) ∩ yukarıdaki MIME listesi",
			"accept.max_bytes": "Kod tabanında görsel slotlarında fiilen uygulanan tavan: admin-panel/frontend/src/components/upload/ProfileImageDropzone.vue:123 (5 MB), tradehub_core/api/v1/identity.py:952 (5 MB), tradehubfront/src/components/product/WriteReviewModal.ts:23-26 (5 MB). Kategori görselinde bugün HİÇ kontrol yok (CategoryManagementView.vue:924-928; docs/reports/00-upload-slot-envanteri.md §7-A) — 5 MB mevcut desene uyum, yeni sayı değil.",
			"accept.max_megapixels_hard": "tradehub_core/media/pipeline/policy/slots/product-image.json ile aynı (80 MP). Kod tabanında karşılığı YOK (grep 'MAX_IMAGE_PIXELS' tradehub_core/ → 0 sonuç).",
			"require.min_short_edge": "hesap: en büyük hücre 2x2 @1920 viewport = 880×436 CSS px; kısa kenar 436 → 480'e yuvarlandı. Kutu: tradehubfront/src/components/category/CategoryShowcase.ts:245 (auto-rows-[210px] lg, gap-4) + container formülü docs/reports/03-render-envanteri.md §1.2.",
			"require.min_area": "hesap: 960 × 480 = 460.800 piksel (min_short_edge ile 2:1 oranda tutarlı).",
			"require.allowed_ratios": "hesap: bento kutu oranı 0,82:1 … 4,68:1 arasında değişiyor (aşağıda ölçüldüğü gibi). En kötü kırpmayı minimize eden oran sqrt(0,82 × 4,68) = 1,96 ≈ 2:1. Band 5:4 (1,25) … 3:1 (3,0) basamaklarıyla tarandı; bu, önerilen 1,96'nın ±%40'lık pratik toleransıdır.",
			"require.ratio_tolerance": "hesap: ±%12 — 6 basamak ±%12 ile 1,10 … 3,36 aralığını boşluksuz kaplar.",
			"require.max_count": "docs/reports/00-upload-slot-envanteri.md §2 — her Category Showcase Tile tek `image` alanı taşıyor; toplam adet döşeme sayısıyla belirlenir, dosya başına 1.",
			"master.max_long_edge": "tradehub_core/media/presets.py:15 — `balanced` (varsayılan) preset max_dim = 2000; tradehub_core/media/pipeline.py:117 uzun kenarı bu değere indiriyor. Yeni sayı üretilmedi.",
			"master.min_long_edge": "hesap: en büyük hücre 880 CSS px @2x = 1760 → 1920.",
			"master.max_megapixels": "hesap: 1920 × 960 / 1e6 = 1,843 → tavan 2,0. Şema invaryantı: 2000² / 1e6 = 4,0 ≥ 2,0.",
			"master.dpi_out": "Ekran medyası — 72 dpi metadata normalizasyonu.",
			"master.colorspace": "srgb SEÇİMİ (mevcut davranış 'preserve', tradehub_core/media/pipeline.py:114-116). Bento döşemeleri yan yana duruyor; farklı gamut'lardan gelen görsellerin birbirine göre soluk/doygun görünmesi burada en görünür.",
			"master.format": "tradehub_core/media/pipeline.py:147-181 to_webp() — sunucu tarafı garanti-WebP zaten var.",
			"master.strip_metadata.gps": "KVKK: kategori görselleri sık sık üretim/depo fotoğrafı; GPS konum sızdırır. Bugün silinmiyor.",
			"master.strip_metadata.icc": "false — engine.py:11-13 ve :114-116 ICC'yi bilinçli koruyor.",
			"profiles[0].width": "hesap: max(1x1 @430 viewport 195 @2x = 390; 1x1 @640 viewport 296 @1x) = 390 → 480",
			"profiles[1].width": "hesap: max(1x1 @1920 viewport 432 @2x = 864; 2x2 @1024 viewport 488 @2x = 976) → 960 (976'nın %1,7 altında, kabul edilen sapma)",
			"profiles[2].width": "hesap: 2x1 @1920 viewport 880 @2x = 1760 → 1920",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139",
			"on_violation.retryable": "tradehub_core/media/upload_policy.py:97-100"
		},
		"open_questions": [
			"KATEGORİ BANDI İÇİN BACKEND ALANI YOK. tradehubfront/src/components/seller/CategoryProductListing.ts:88-90 `category.bannerImage` okuyor; bu isim yalnız tradehubfront/src/types/seller/types.ts:119 (tip) ve src/data/seller/mockData.ts:286,411 (mock veri) içinde geçiyor. Bileşen HİÇBİR SAYFADA çağrılmıyor (grep 'CategoryProductListing' → yalnız components/seller/index.ts:11). Ürün kararı gerekiyor: alan yaratılacak mı, bileşen silinecek mi?",
			"`Product Category` doctype'ında banner alanı yok — doğrulandı: product_category.json fields listesinde dosya tutan tek alan `image` (Attach Image), o da daire ikon olarak render ediliyor (tradehubfront/src/components/categories/CategoryGrid.ts:14-18, 68/96/112/128 px rounded-full). Bu AYRI bir slot (`category.icon`) ve ayrı standart gerektirir.",
			"Category Showcase Tile kaç kayıt ve hangi span dağılımıyla? Doğrulama: `frappe.db.sql(\"select col_span, row_span, count(*) from \\`tabCategory Showcase Tile\\` group by 1,2\")`. Span dağılımı bilinmeden profil basamaklarının israfı ölçülemez.",
			"Yüklenmiş kategori görsellerinin gerçek oran dağılımı ölçülmedi. Doğrulama: docs/reports/00-upload-slot-envanteri.md §9-M5 betiği, `attached_to_doctype='Category Showcase Tile'` filtresiyle.",
			"`Seller Category.image` gerçekten kullanılıyor mu? docs/reports/00-upload-slot-envanteri.md §9-M3 betiği bu alanı da sayıyor.",
			"profiles[].encoder_quality.avif değerleri null — kalibrasyon yapılmadı; şema kuralı gereği status 'active' olamaz."
		],
		"notes": [
			"ÜÇ AYRI KAVRAM (docs/reports/00-upload-slot-envanteri.md §5 'Kategori banner' satırı): (a) `Product Category.image` = daire ikon, banner değil; (b) `Category Showcase Tile.image` = bento döşeme, CANLI; (c) `Brand.hero_banner` = marka bandı, CSS background. Ek olarak (d) `CategoryProductListing.bannerImage` = banner biçimli ama ölü ve backend'siz.",
			"ÖLÇÜLEN BENTO KUTULARI (columns=4, container-boxed formülü + CategoryShowcase.ts:245): 360px viewport → 1x1 160×85 / 2x1 328×85 / 2x2 328×178. 430px → 195×85 / 398×85 / 398×178. 640px → 296×145 / 608×145 / 608×306. 768px → 172×210 / 360×210 / 360×436. 1024px → 236×210 / 488×210 / 488×436. 1280px → 300×210 / 616×210 / 616×436. 1536px → 356×210 / 728×210 / 728×436. 1920px → 432×210 / 880×210 / 880×436. Kırılımlar bu projede sm=480, md=640, lg=768, xl=1024 (tradehubfront/src/style.css:256-260) — Tailwind varsayılanı DEĞİL.",
			"768px'te 1x1 döşeme DİKEY oluyor (172×210), 430px'te aynı döşeme YATAY (195×85). Yani tek bir dosya hem portre hem manzara kutuya sokuluyor. Bu, oranın niçin zorlanamayıp güvenli alanla yönetildiğinin gerekçesi.",
			"ZATEN ÇÖZÜLMÜŞ — yeniden tasarlanmayacak: (1) gradient scrim ile etiket okunabilirliği (CategoryShowcase.ts:154); (2) görsel yoksa tonal gri + koyu metin fallback'i (CategoryShowcase.ts:157-158); (3) CLS koruması — width/height attr 400×400 + sabit auto-rows yüksekliği (docs/reports/03-render-envanteri.md §5, R12 'risk YOK'); (4) 2xl'de sütun sayısı yalnız tam bölünme varsa artıyor, aksi hâlde boş hücre bırakmıyor (CategoryShowcase.ts:229-232).",
			"Bu politika dosyası bugün kod tarafından OKUNMUYOR (tradehub_core/media/upload_policy.py:307-313)."
		]
	},
	"company.cover_image": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.0.0",
		"status": "draft",
		"slot_key": "company.cover_image",
		"title": "Şirket / mağaza kapak görseli",
		"description": "Mağaza sayfasının üst bandı. Sistemdeki en zor geometri problemi burada: bandın CSS kutusu TAM VIEWPORT genişliğinde ama yüksekliği sabit px olduğu için kutu oranı 2,00:1 (360px telefon) ile 4,80:1 (1920px masaüstü) arasında değişiyor. Tek bir dosya bu iki ucu birlikte karşılayamaz; bu politikanın asıl katkısı güvenli alanı sayıyla tanımlamaktır.",
		"roles": [
			"seller",
			"admin"
		],
		"bound_to": [
			{
				"doctype": "Admin Seller Profile",
				"field": "banner_image",
				"fieldtype": "Attach Image",
				"source": "tradehub_core/tradehub_core/doctype/admin_seller_profile/admin_seller_profile.json:129 — doğrulandı: bu doctype'ta dosya tutan alan yalnız `logo` ve `banner_image`."
			},
			{
				"doctype": "Storefront Layout",
				"field": "sections",
				"fieldtype": "Long Text",
				"source": "docs/reports/00-upload-slot-envanteri.md §4 satır `panel.layout_slide`; render tradehubfront/src/utils/seller/section-registry.ts:117-222; yükleme admin-panel/frontend/src/components/seller/LayoutSectionCard.vue:195-199. CANLI RENDER BUDUR — slayt URL'i JSON dizisinde string, Attach taramasıyla bulunamaz."
			},
			{
				"doctype": "Seller Gallery Image",
				"field": "poster_image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller.gallery_poster` — şirket tanıtım videosunun kapak görseli; geometrisi StoreHeader.ts:296 aspect-video kutusundan gelir. LIVE_SOURCES'ta YOK."
			}
		],
		"accept": {
			"mime": [
				"image/jpeg",
				"image/png",
				"image/webp"
			],
			"extensions": [
				".jpg",
				".jpeg",
				".png",
				".webp"
			],
			"max_bytes": 5242880,
			"max_megapixels_hard": 80,
			"allow_animated": false
		},
		"require": {
			"min_short_edge": 400,
			"min_area": 768000,
			"allowed_ratios": [
				"2:1",
				"5:2",
				"3:1",
				"7:2",
				"4:1",
				"24:5"
			],
			"ratio_tolerance": 0.12,
			"min_count": 1,
			"max_count": 5
		},
		"master": {
			"max_long_edge": 2560,
			"min_long_edge": 1920,
			"max_megapixels": 1.64,
			"dpi_out": 72,
			"colorspace": "srgb",
			"format": "webp",
			"orientation": "apply_exif",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"target_ssim_per_class": {
				"photo": 0.96,
				"graphic": 0.98,
				"text": 0.99
			},
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "cover_768",
				"width": 768,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "24:5",
				"serves": [
					"mağaza bandı 360-430px telefonlarda @2x",
					"640px viewport @1x"
				],
				"derived_from": "hesap: 360 CSS px @2x = 720 → üst basamak 768; 640 viewport @1x = 640 de kapsanır. Kutu: tam viewport genişliği (tradehubfront/src/utils/seller/section-registry.ts:795 sarmalayıcıda max-width YOK) × section-registry.ts:103 yükseklikleri",
				"max_overshoot": 1.2
			},
			{
				"name": "cover_1280",
				"width": 1280,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "24:5",
				"serves": [
					"768px tablet @1x",
					"1024px @1x",
					"1280px @1x",
					"640px viewport @2x"
				],
				"derived_from": "hesap: max(640 @2x = 1280; 1280 @1x = 1280) = 1280. Kutu: section-registry.ts:103 (h-[180px] sm:220 md:320 lg:400) × tam viewport",
				"max_overshoot": 1
			},
			{
				"name": "cover_1920",
				"width": 1920,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "24:5",
				"serves": [
					"1440/1536/1920px masaüstü @1x",
					"768px tablet @2x"
				],
				"derived_from": "hesap: max(1920 @1x = 1920; 768 @2x = 1536) = 1920. Kutu: 1920×400 = en büyük gerçek kutu (section-registry.ts:103 lg:h-[400px], lg=768 tradehubfront/src/style.css:256-260)",
				"max_overshoot": 1
			},
			{
				"name": "cover_2560",
				"width": 2560,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "24:5",
				"serves": [
					"1280px viewport @2x",
					"master / arşiv"
				],
				"derived_from": "hesap: 1280 CSS px @2x = 2560. Üst sınır olarak seçilme gerekçesi: tradehub_core/media/presets.py:14 `safe` preset max_dim = 2560 — kod tabanında zaten var olan en büyük eşik, yeni sayı değil.",
				"max_overshoot": 1
			},
			{
				"name": "cover_16x9_1000",
				"width": 1000,
				"height": 563,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "16:9",
				"serves": [
					"StoreHeader ana medya alanı (kapak görseli veya video poster'ı)"
				],
				"derived_from": "hesap: ≥768px viewport'ta kutu sabit 500 CSS px (tradehubfront/src/components/seller/StoreHeader.ts:203 `w-full lg:w-[500px]`, :296 `aspect-video`); 500 @2x = 1000, yükseklik 1000×9/16 = 562,5 → 563. 640px viewport'ta kutu 608 CSS px (kapsayıcı max-w-[1200px] px-4 lg:px-8, StoreHeader.ts:46) → @1x karşılanır.",
				"max_overshoot": 1
			}
		],
		"content_rules": [
			{
				"rule": "safe_area_center_width_fraction",
				"threshold": 0.417,
				"comparator": "lt",
				"action": "warn",
				"message_key": "guvenli_alan_disi",
				"source": "hesap: object-cover ile oranı R olan görsel, oranı B olan kutuda gösterilirken R>B ise yatayda kırpılır ve görünen genişlik oranı = B/R. Canlı render kutusunun en dar oranı B=360/180=2,00 (360px viewport), önerilen R=24:5=4,80 → 2,00/4,80 = 0,417. Kutu oranları: tradehubfront/src/utils/seller/section-registry.ts:103 + style.css:256-260."
			},
			{
				"rule": "is_private",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "gizli_yuklendi",
				"source": "admin-panel/frontend/src/views/doctype/DocTypeFormView.vue:2306 — panel jenerik yükleyicisi HER dosyayı is_private=1 yapıyor; mağaza bandı /private/files/ altına düşerse oturumsuz ziyaretçide görünmez. docs/reports/00-upload-slot-envanteri.md §9-M4."
			},
			{
				"rule": "long_edge",
				"threshold": 1920,
				"comparator": "lt",
				"action": "warn",
				"message_key": "tavsiye_altinda",
				"source": "hesap: en büyük gerçek kutu 1920 CSS px genişliğinde (tam viewport, section-registry.ts:103). Panelin bugünkü tavsiye metni 1600×400 (admin-panel/frontend/src/views/doctype/DocTypeFormView.vue:448) → 1920px ekranda 1,2× büyütülür."
			},
			{
				"rule": "long_edge",
				"threshold": 960,
				"comparator": "lt",
				"action": "reject",
				"message_key": "cok_kucuk",
				"source": "hesap: 1920 / 2 = 960. 2× büyütme görünür bozulma eşiği; bunun altı bantta bulanıklık üretir."
			},
			{
				"rule": "rendered_as_css_background",
				"threshold": true,
				"comparator": "eq",
				"action": "review",
				"message_key": "css_background_kisiti",
				"source": "tradehubfront/src/pages/seller-shop.ts:118-119 — `seller?.header_bg_image` inline `background-image` ile basılıyor, `<img>` değil. loading/decoding/srcset/fetchpriority uygulanamaz. docs/reports/00-upload-slot-envanteri.md §7-B B4 ile aynı sınıf sorun."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "warn",
			"master": "auto_fix",
			"content_rules": "warn",
			"error_code_prefix": "upload",
			"retryable": false
		},
		"messages": {
			"tr": {
				"bicim_desteklenmiyor": "Bu görsel biçimi kapak için kabul edilmiyor ({bicim}). JPG, PNG veya WebP olarak kaydedip tekrar yükleyin ({izinli_bicimler}).",
				"cok_buyuk": "Dosya {mb} MB; sınır {max_mb} MB. Kapak görselini JPG olarak %80 kalitede kaydetmek boyutu genelde yeterince düşürür.",
				"cok_kucuk": "Kapak görseli {kisa_kenar} piksel; en az {gerekli_kisa_kenar} piksel gerekiyor. Bu ölçünün altında bant geniş ekranlarda bulanık çıkar.",
				"tavsiye_altinda": "Kapak görselinin genişliği 1920 pikselden az. Kabul edildi, ama geniş masaüstü ekranlarda büyütüleceği için hafif bulanıklaşabilir; 2560×534 önerilir.",
				"oran_uygun_degil": "Kapak oranı {oran}; beklenen aralık 2:1 ile 4,8:1 arası ({izinli_oranlar}). Bu aralığın dışındaki görseller mobilde ya da masaüstünde ağır kırpılır.",
				"guvenli_alan_disi": "Logo veya yazı görselin kenarlarında kalmış. Mobilde bandın yalnız orta %42'lik dikey şeridi görünür; kritik içeriği o şeride taşıyın.",
				"gizli_yuklendi": "Kapak görseli gizli (private) olarak kaydedilmiş; bu hâliyle mağazanızı ziyaret edenler göremez. Görseli herkese açık olarak yeniden yükleyin.",
				"css_background_kisiti": "Bu kapak alanı CSS arka planı olarak basılıyor; tarayıcı ölçüye göre farklı boy seçemez. Teknik ekibin bu alanı <img> etiketine taşıması gerekir."
			}
		},
		"sources": {
			"accept.mime": "admin-panel/frontend/src/components/upload/ProfileImageDropzone.vue:122 — accept varsayılanı image/jpeg,image/png,image/webp. .gif bilinçli dışarıda: bantta animasyon istenmiyor ve tradehub_core/media/pipeline.py:106 animasyonlu dosyayı hiç işlemiyor.",
			"accept.extensions": "aynı satır (ProfileImageDropzone.vue:122) + tradehub_core/media/upload_policy.py:60-62 (KIND_IMAGE listesi) kesişimi",
			"accept.max_bytes": "admin-panel/frontend/src/components/upload/ProfileImageDropzone.vue:123 maxBytes varsayılanı 5 MB — bugün fiilen uygulanan tek tavan. Diğer yol (admin-panel/frontend/src/views/seller/StorefrontEdit.vue:252-258) HİÇ boyut kontrolü yapmıyor (docs/reports/00-upload-slot-envanteri.md §7-A).",
			"accept.max_megapixels_hard": "tradehub_core/media/pipeline/policy/slots/product-image.json ile aynı değer (80 MP) — decompression-bomb koruması slot bazlı değişmemeli. Kod tabanında karşılığı YOK (grep 'MAX_IMAGE_PIXELS' tradehub_core/ → 0 sonuç).",
			"require.min_short_edge": "hesap: en büyük gerçek kutunun yüksekliği 400 CSS px (tradehubfront/src/utils/seller/section-registry.ts:103 `lg:h-[400px]`, lg = 768px — style.css:256-260). Kısa kenar bunun altındaysa bant dikeyde büyütülür.",
			"require.min_area": "hesap: 1920 × 400 = 768.000 piksel — en büyük gerçek kutunun alanı.",
			"require.allowed_ratios": "hesap: canlı kutu oranı 360/180 = 2,00:1 (360px viewport) ile 1920/400 = 4,80:1 (1920px viewport) arasında değişiyor; band bu iki uç arasını 2:1, 5:2, 3:1, 7:2, 4:1, 24:5 basamaklarıyla tarıyor. 24:5 = 4,8 (en geniş kutu oranı). Kutu yükseklikleri section-registry.ts:103.",
			"require.ratio_tolerance": "hesap: ±%12 — yukarıdaki 6 basamak ±%12 ile 1,76 … 5,38 aralığını boşluksuz kaplar; dışı ret/uyarı bölgesidir.",
			"require.min_count": "section-registry.ts:117-125 — hero_banner bölümü etkinse en az bir slayt gerekir, yoksa bölüm boş bir renk bandı olarak basılır.",
			"require.max_count": "ÖLÇÜLMEDİ / ÖNERİ: bugün slider slayt adedi SINIRSIZ (admin-panel/frontend/src/components/seller/LayoutSectionCard.vue:195-199 `multiple`, adet kontrolü yok). 5 pratik bir üst sınır önerisidir; ürün kararı gerekir.",
			"master.max_long_edge": "tradehub_core/media/presets.py:14 — `safe` preset max_dim = 2560. Kod tabanında var olan en büyük eşik; yeni sayı üretilmedi.",
			"master.min_long_edge": "hesap: en büyük gerçek kutu genişliği 1920 CSS px (tam viewport, section-registry.ts:795 sarmalayıcıda max-width yok).",
			"master.max_megapixels": "hesap: 2560 × 640 / 1e6 = 1,638 → 1,64 (4:1 en dar izinli oranda master alanı). Şema invaryantı: 2560² / 1e6 = 6,55 ≥ 1,64.",
			"master.dpi_out": "Ekran medyası — 72 dpi metadata normalizasyonu. Piksel boyutunu etkilemez.",
			"master.colorspace": "srgb SEÇİMİ: bant tam ekran genişliğinde ve geniş gamut (P3) fotoğraflarda soluk/aşırı doygun görünme riski en yüksek burada. Mevcut motor davranışı 'preserve' (tradehub_core/media/pipeline.py:114-116 ICC taşınıyor) — bu bir DEĞİŞİKLİK önerisidir, mevcut davranışın kaydı değil.",
			"master.format": "tradehub_core/media/pipeline.py:147-181 to_webp() — sunucu tarafı garanti-WebP zaten var.",
			"master.strip_metadata.gps": "KVKK: mağaza bandı sık sık fabrika/atölye fotoğrafı oluyor; GPS koordinatı işletmenin fiziksel konumunu sızdırır. Bugün silinmiyor (engine.py:114-116 yalnız EXIF yönünü uyguluyor, GPS'i silmiyor).",
			"master.strip_metadata.icc": "false — tradehub_core/media/pipeline.py:11-13 ve :114-116 ICC profilini bilinçli koruyor; silinirse renk yönetimi bozulur.",
			"profiles[0].width": "hesap: 360 CSS px @2x = 720 → 768",
			"profiles[1].width": "hesap: max(640 @2x = 1280; 1280 @1x = 1280) = 1280",
			"profiles[2].width": "hesap: max(1920 @1x = 1920; 768 @2x = 1536) = 1920",
			"profiles[3].width": "hesap: 1280 @2x = 2560; üst sınır presets.py:14 (safe max_dim 2560)",
			"profiles[4].width": "hesap: StoreHeader.ts:203 `lg:w-[500px]` × DPR2 = 1000; yükseklik 1000 × 9/16 = 562,5 → 563 (StoreHeader.ts:296 aspect-video)",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139 — kodlu ret sözleşmesi.",
			"on_violation.retryable": "tradehub_core/media/upload_policy.py:97-100"
		},
		"open_questions": [
			"`header_bg_image` alanı GERÇEKTEN VAR MI? tradehubfront/src/pages/seller-shop.ts:118-119 bu alanı okuyor ama `grep -rn header_bg_image /Users/ahmet/Desktop/istoc-medya-wt/tradehub_core/` → 0 SONUÇ. Ya tr_tradehub app'inden geliyor (docs/reports/00-upload-slot-envanteri.md §9-M1) ya da ölü kod. Doğrulama: `docker compose exec backend bench --site istoc.localhost list-apps` ve panelde Mağaza Düzenle → Network sekmesinde `tr_tradehub.api.v1.seller.get_storefront` isteğinin HTTP kodu.",
			"`Admin Seller Profile.banner_image` storefront'ta HİÇ okunmuyor (grep 'banner_image' tradehubfront/src → 0 sonuç) ve LIVE_SOURCES'ta yok. Alan ölü mü, yoksa okunması mı gerekiyor? Doğrulama: `frappe.db.count('Admin Seller Profile', {'banner_image': ['is','set']})`.",
			"Mevcut kapak dosyalarının gerçek oran dağılımı ölçülmedi. Doğrulama: docs/reports/00-upload-slot-envanteri.md §9-M5 betiği (PIL ile oran histogramı), `attached_to_field='banner_image'` filtresiyle.",
			"Panelden yüklenen kapakların kaçı is_private=1? Doğrulama: docs/reports/00-upload-slot-envanteri.md §9-M4 betiği.",
			"master.colorspace='srgb' bir DEĞİŞİKLİK önerisi; mevcut davranış 'preserve'. Renk kayması riski üretim görselleriyle görsel karşılaştırma yapılmadan 'active' edilmemeli.",
			"profiles[].encoder_quality.avif değerleri null — AVIF kalibrasyonu yapılmadı. Şema kuralı: null encoder_quality varken status 'active' olamaz."
		],
		"notes": [
			"CANLI RENDER TEK YERDE: tradehubfront/src/utils/seller/section-registry.ts:103 (statik mod) ve :206 (slider modu, kapsayıcı yüksekliği). Sarmalayıcı `renderDynamicSections` (section-registry.ts:795) hiçbir max-width uygulamıyor → bant TAM VIEWPORT genişliğinde. Kutu: 360×180, 640×320, 768×400, 1920×400.",
			"ÖLÜ RENDERLAR (politika kapsamında değil, karışmasın diye kayıt): (1) tradehubfront/src/components/seller/HeroBanner.ts:13 — `xl:h-[500px]`'e kadar çıkan varyant; yalnız components/seller/index.ts:8'de dışa aktarılıyor, hiçbir sayfa çağırmıyor. (2) tradehubfront/src/components/seller/CompanyInfo.ts:37 — `lg:grid-cols-[55%_45%]` içinde 400px yüksekliğinde hero; CompanyInfoComponent hiçbir sayfada kullanılmıyor (yalnız index.ts:12).",
			"ORAN ÇELİŞKİSİ (panel): admin-panel/frontend/src/components/upload/ProfileImageDropzone.vue:135 dikdörtgen önizlemeyi `w-full sm:w-64 h-36` = 256×144 = 16:9 çiziyor, ama aynı bileşenin recommendedSize metni 1600×400 = 4:1 (DocTypeFormView.vue:448). Satıcı 4:1 yüklemesi söylenip 16:9 önizleme görüyor.",
			"ZATEN ÇÖZÜLMÜŞ — yeniden tasarlanmayacak: (1) tek kapı L0 (tradehub_core/hooks.py:227-252 → utils/security.py:96 → upload_policy.py:307); (2) sunucu tarafı garanti-WebP (engine.py:147-181); (3) EXIF yön düzeltmesi + ICC koruma (engine.py:114-116) — telefondan çekilmiş yatay bandın yan yatmaması bu sayede; (4) istemci sıkıştırma (admin-panel/frontend/src/lib/media/compress.js).",
			"İKİ AYRI ORAN, TEK DOSYA: aynı kapak görseli hem 4,8:1'lik banda hem StoreHeader'ın 16:9'luk kutusuna (StoreHeader.ts:296) sokuluyor. Bu yüzden profil listesinde ayrı bir `cover_16x9_1000` var; tek bir orana indirgeme YAPILMADI çünkü ikisi de canlı.",
			"Bu politika dosyası bugün kod tarafından OKUNMUYOR (upload_policy.check() slot parametresi almıyor — tradehub_core/media/upload_policy.py:307-313)."
		]
	},
	"company.cover_video": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.1.0",
		"status": "draft",
		"slot_key": "company.cover_video",
		"title": "Şirket kapak videosu",
		"description": "Mağaza (şirket) sayfasının üst bloğunda oynatılan tanıtım videosu. Ayrı bir 'kapak' alanı YOKTUR: kapak, galeri sıralamasının türevidir — media_groups[0].items[0] ve media_type == 'video' (tradehub_core/api/seller.py:795, :823-824). Bu politika T-022'nin çıktısıdır ve T-022 kendi biçimini kullanıyordu (kök anahtarlar _meta / identity / render_box / modes / upload_constraints / renditions …); şema uyumsuzluğu bu sürümde giderildi: zorunlu üst düzey alanlar dolduruldu, videoya özgü içeriğin tamamı şema v1.1.0'ın 'video' bloğuna TAŞINDI — hiçbir sayı, gerekçe, ölçü ya da karar silinmedi.",
		"roles": [
			"seller",
			"admin"
		],
		"bound_to": [
			{
				"doctype": "Seller Gallery Image",
				"field": "video_url",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller.gallery_video` — `Seller Gallery Image.video_url` (Attach). KAPAK VİDEOSUNUN GERÇEK ALANI BUDUR; alan doctype'ta tanımlı: tradehub_core/tradehub_core/doctype/seller_gallery_image/seller_gallery_image.json. Kapak ayrımı alan düzeyinde değil sıralama düzeyinde: _build_media_groups sort_order asc + idx asc sıralar, sonra videoyu başa alır (tradehub_core/api/seller.py:795, :823-824). Aynı belgenin §5 tablosu bu slotu 'Şirket profili kapak videosu — ⚠️ KISMEN' diye işaretliyor: storefront'ta bu alan, panelde ise sahipsiz factory_video_url yazılıyor."
			},
			{
				"doctype": "Seller Gallery Image",
				"field": "poster_image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller.gallery_poster` — kapak videosunun kapak GÖRSELİ. PAYLAŞILAN BAĞ, bilinçli: aynı alan tradehub_core/media/pipeline/policy/slots/company-cover-image.json bound_to'sunda da var. Ayrım: poster'ın kabul kapısı ve geometrisi (bir GÖRSEL olduğu için) company.cover_image politikasına tabidir; poster'ın hangi KAREDEN ve hangi kuralla üretileceği bu politikanın video.poster bloğuna tabidir. LIVE_SOURCES'ta YOK (§7-B B6) → silme taramasında 'kullanılmıyor' görünür."
			}
		],
		"accept": {
			"mime": [
				"video/mp4",
				"video/webm",
				"video/quicktime"
			],
			"extensions": [
				".mp4",
				".webm",
				".mov",
				".m4v"
			],
			"max_bytes": 83886080,
			"max_megapixels_hard": 8.3,
			"allow_animated": true
		},
		"require": {
			"min_short_edge": 720,
			"min_area": 921600,
			"max_short_edge": 2160,
			"allowed_ratios": [
				"16:9"
			],
			"ratio_tolerance": 0.01,
			"min_count": 0,
			"max_count": 1
		},
		"master": {
			"max_long_edge": 1280,
			"min_long_edge": 1280,
			"max_megapixels": 0.93,
			"dpi_out": 72,
			"colorspace": "preserve",
			"format": "webm",
			"orientation": "preserve",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "poster_1280",
				"width": 1280,
				"height": 720,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 78
				},
				"fit": "cover",
				"target_ratio": "16:9",
				"serves": [
					"kapak oynatıcısının poster'ı — 16:9 medya kutusu (StoreHeader.ts:297) ve <video :poster> (StoreHeader.ts:303)",
					"masaüstünde sabit 500 CSS px kolon (StoreHeader.ts:203 lg:w-[500px])"
				],
				"derived_from": "hesap: masaüstü kutusu 500 CSS px × DPR2 = 1000 cihaz px → üst basamak 1280 (16:9'da 1280×720). En geniş kutu 1023 px viewport'ta 943 CSS px (@2x = 1886) ama 1080p tier K1 kararına kadar EKLENMİYOR (video.rendition_policy.resolution_1080p). Kutu ölçüleri video.render_box.computed_sizes_css_px, kaynak tradehubfront/src/components/seller/StoreHeader.ts:203,297",
				"max_overshoot": 1.28
			},
			{
				"name": "poster_854",
				"width": 854,
				"height": 480,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 70
				},
				"fit": "cover",
				"target_ratio": "16:9",
				"serves": [
					"mobil/tablet poster (kutu 296-688 CSS px, video.render_box.computed_sizes_css_px)",
					"poster 120 KB kapısını 1280 genişlikte geçemediğinde küçültme basamağı (video.poster.output.downscale_fallback)"
				],
				"derived_from": "hesap: 480p teslim tier'ının kare ölçüsüyle aynı (854×480 — video.renditions[cover_480_webm]); poster ile ilk kare arasında ölçü farkı olmasın. Mobil en dar kutu 296 CSS px @2x = 592 → 854 bu talebi karşılıyor. Kutu kaynağı StoreHeader.ts:297 (aspect-video), genişlik zinciri StoreHeader.ts:46,128,129",
				"max_overshoot": 1.44
			},
			{
				"name": "thumb_192",
				"width": 192,
				"height": 144,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 70
				},
				"fit": "cover",
				"target_ratio": "4:3",
				"serves": [
					"küçük resim ızgarası hücresi — repeat(auto-fill, minmax(96px, 1fr)) (StoreHeader.ts:378), hücre oranı 4:3 (StoreHeader.ts:381)"
				],
				"derived_from": "hesap: hücrenin en küçük hâli 96×72 CSS px (minmax 96px + 4:3) → DPR2 = 192×144. DİKKAT: 16:9 poster 4:3 hücreye girerken yatayda %25 kırpılır ((16/9)/(4/3) = 1,3333 → 1 - 1/1,3333 = 0,25) — güvenli alan kısıtı bu yüzden %10 kenar payından değil video.safe_area.thumbnail_safe_width_pct'ten (%75) gelir. Kaynak StoreHeader.ts:378, :381",
				"max_overshoot": 1
			}
		],
		"content_rules": [
			{
				"rule": "aspect_ratio_deviation",
				"threshold": 0.01,
				"comparator": "gt",
				"action": "reject",
				"message_key": "oran_16_9_degil",
				"source": "hesap: |(w/h) − 16/9| / (16/9) > 0,01. Kutu her kırılımda 16:9 (StoreHeader.ts:297 aspect-video) ve object-cover (StoreHeader.ts:304) sapmayı sessizce merkezden kırpar — yükleyene uyarı gösterilmiyor."
			},
			{
				"rule": "duration_seconds",
				"threshold": 60,
				"comparator": "gt",
				"action": "reject",
				"message_key": "sure_uzun",
				"source": "hesap: 60 s × 1,6 Mbps hedef ortalama = 96 Mbit = 12 MB teslim kapısı (video.renditions[cover_720_webm].max_bytes). Kodda süre kontrolü YOK — Ç5."
			},
			{
				"rule": "duration_seconds_floor",
				"threshold": 6,
				"comparator": "lt",
				"action": "reject",
				"message_key": "sure_kisa",
				"source": "hesap: önizleme klibi 6 s (video.preview_clip.duration_s); master kendi önizlemesinden kısa olamaz. ambient kipinde taban 3 s'dir (video.modes.ambient.duration_s.min) ama ambient K2 onayına kadar KAPALI."
			},
			{
				"rule": "frame_rate",
				"threshold": 30,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "kare_hizi_dusuruldu",
				"source": "video.frame_rate.output_cap = 30. Gerekçe: 60 fps aynı kalitede ~%80 fazla bit; fabrika turu / konuşan kafa içeriğinde görsel kazanç yok. Ret değil, sunucu indirir."
			},
			{
				"rule": "bitrate_kbps",
				"threshold": 2000,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "bitrate_isleniyor",
				"source": "tradehub_core/media/transcode.py:67 sunucu barı 2.500.000 bps, admin-panel/frontend/src/lib/media/compress.video.js:29 istemci barı 2.000.000 bps — Ç4. Karar: dar olan kazanır, iki sayı 2.000 kbps'te birleşir."
			},
			{
				"rule": "rendition_bytes",
				"threshold": 12582912,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "cok_agir",
				"source": "video.rendition_policy.size_gate_retry — CRF +2 ile en çok 2 deneme, son başarısızlıkta cover_video_too_heavy. Bugün boyut kapısı HİÇ YOK: çıktı ne olursa olsun os.replace ile yazılıyor (tradehub_core/media/transcode.py:252)."
			},
			{
				"rule": "video_stream_present",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "video_akisi_yok",
				"source": "ffprobe video akışı döndürmedi. Bugün bu kontrol video yolunda hiç çalışmıyor: tradehub_core/media/metadata.py:180-186 → tradehub_core/media/pipeline.py:79-93 yalnız PIL kullanıyor, PIL video açmaz (Ç5)."
			},
			{
				"rule": "ffprobe_readable",
				"threshold": false,
				"comparator": "eq",
				"action": "review",
				"message_key": "ffprobe_okunamadi",
				"source": "tradehub_core/media/transcode.py:101-106 — ffprobe patlarsa güvenli tarafa düşülüp True dönüyor (transcode et) ve frappe.log_error yazılıyor. Kapak slotunda transcode zaten koşulsuz, bu yüzden sonuç 'moderasyona düşür'."
			},
			{
				"rule": "poster_mean_luma_out_of_range",
				"threshold": true,
				"comparator": "eq",
				"action": "review",
				"message_key": "poster_cozulemedi",
				"source": "video.poster.quality_gate — ortalama parlaklık %6'nın altında ya da %94'ün üstündeyse kare siyah/patlamış sayılır; [duration×0,25, duration×0,50] penceresinde 1 yeniden deneme, sonra cover_video_poster_unresolved."
			},
			{
				"rule": "captions_missing",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "altyazi_gerekli",
				"source": "video.accessibility.captions_rules 1. satır: story + ses akışı var + konuşma beyan edildi + .vtt yok → cover_video_captions_required. Yürürlük K4, konuşma tespiti K5 kararına bağlı; onay gelmeden yalnız YENİ yüklemelerde uygulanır."
			},
			{
				"rule": "burned_in_logo",
				"threshold": true,
				"comparator": "eq",
				"action": "warn",
				"message_key": "gomulu_logo",
				"source": "video.safe_area.burned_in_logo.allowed = false. Gerekçe: arayüz mantıksal yön özellikleriyle RTL'de aynalanıyor (tradehubfront/src/utils/seller/section-registry.ts:185,188), videoya gömülü logo aynalanamaz. Ret değil uyarı."
			},
			{
				"rule": "is_private",
				"threshold": true,
				"comparator": "eq",
				"action": "warn",
				"message_key": "private_transcode_atlandi",
				"source": "tradehub_core/media/transcode.py:194 — `if doc.get('is_folder') or doc.get('is_private'): return`. Private yüklenen kapak videosu HİÇ normalize edilmez, poster üretilmez ve kullanıcıya hiçbir şey söylenmez."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "reject",
			"master": "auto_fix",
			"quality": "warn",
			"content_rules": "warn",
			"error_code_prefix": "cover_video",
			"retryable": false
		},
		"messages": {
			"tr": {
				"bicim_desteklenmiyor": "Bu video biçimi kabul edilmiyor ({bicim}). Kapak videosunu MP4 (H.264) ya da WebM olarak yeniden kaydedip yükleyin ({izinli_bicimler}).",
				"cok_buyuk": "Video {mb} MB; sınır {max_mb} MB. Süreyi 60 saniyenin altına indirin ya da 1920×1080 çözünürlükte, 10 Mbps'i aşmayan bir dosya olarak yeniden kaydedin.",
				"cozunurluk_dusuk": "Kapak videosunun çözünürlüğü çok düşük; en az 1280×720 gerekiyor. Daha yüksek çözünürlükte kaydedin, yoksa mağaza sayfasında bulanık görünür.",
				"cozunurluk_yuksek": "Kapak videosu 3840×2160'tan büyük. Sunucu her hâlükârda 1280×720'ye indiriyor; 1920×1080 kaydedip yüklemek hem daha hızlı hem aynı sonucu verir.",
				"oran_16_9_degil": "Videonun oranı {oran}; kapak kutusu 16:9. Başka oranlarda görüntü merkezden kırpılır ve kenarlarda içerik kaybolur — 16:9 olarak yeniden kadrajlayıp yükleyin.",
				"sure_uzun": "Kapak videosu 60 saniyeden uzun. Uzun anlatım kapak için değil; en çarpıcı 60 saniyeyi kesip yükleyin, tam turu galeriye ayrı bir öğe olarak ekleyin.",
				"sure_kisa": "Kapak videosu 6 saniyeden kısa. Bu süre önizleme klibinden bile kısa; en az 6 saniyelik bir çekim yükleyin.",
				"kare_hizi_dusuruldu": "Videonun kare hızı 30 fps'e indirildi; yükleme kabul edildi. Görsel kayıp yok, dosya belirgin şekilde küçüldü — bir sonraki yüklemede doğrudan 30 fps kaydedebilirsiniz.",
				"bitrate_isleniyor": "Videonun bit hızı yüksek olduğu için sunucuda yeniden sıkıştırılıyor. Yükleme kabul edildi; işlem bitince kapak mağaza sayfanızda görünecek.",
				"cok_agir": "Video sıkıştırıldıktan sonra da boyut sınırının üstünde kaldı. Süreyi kısaltmak ya da hareketli/gürültülü sahneleri azaltmak dosyayı küçültmenin en etkili yoludur.",
				"video_akisi_yok": "Dosyada video akışı bulunamadı; yalnız ses ya da bozuk bir kayıt olabilir. Videoyu yeniden dışa aktarıp (MP4/H.264) tekrar yükleyin.",
				"ffprobe_okunamadi": "Videonun teknik bilgileri okunamadı; dosya bozuk olabilir. Yükleme kabul edildi ama güvenli tarafta kalmak için incelemeye alındı ve yeniden sıkıştırılacak.",
				"poster_cozulemedi": "Videodan uygun bir kapak karesi seçilemedi (ilk saniyeler tamamen siyah ya da tamamen beyaz). Kapak görselini elle yükleyin ya da videoyu daha aydınlık bir kareyle başlatın.",
				"altyazi_gerekli": "Kapak videosunda konuşma var ama altyazı dosyası (.vtt) yüklenmemiş. Konuşmanın dilinde bir altyazı dosyası ekleyin; sesi kapalı izleyen ve işitme engelli kullanıcılar videoyu ancak böyle anlıyor.",
				"gomulu_logo": "Videoya gömülü logo/yazı tespit edildi. Arayüz Arapça gibi sağdan sola dillerde aynalandığı için gömülü logo ters tarafta kalır; logonuz kapağın yanında ayrıca gösteriliyor, videodan çıkarmanız önerilir.",
				"private_transcode_atlandi": "Video gizli (private) olarak kaydedildi; bu yüzden sıkıştırma ve kapak karesi üretimi atlandı. Kapak videosunu herkese açık olarak yükleyin.",
				"transcode_hatasi": "Video işlenirken bir hata oluştu; hata bizde. Yükleme kaydedildi, işlem otomatik olarak yeniden denenecek — dosyayı yeniden yüklemeniz gerekmiyor."
			},
			"en": {
				"bicim_desteklenmiyor": "This video format is not accepted ({bicim}). Re-export your cover video as MP4 (H.264) or WebM and upload it again ({izinli_bicimler}).",
				"cok_buyuk": "The video is {mb} MB; the limit is {max_mb} MB. Trim it under 60 seconds or re-export at 1920×1080 with a bitrate below 10 Mbps.",
				"cozunurluk_dusuk": "The cover video resolution is too low; at least 1280×720 is required. Re-export at a higher resolution, otherwise it will look blurry on your store page.",
				"cozunurluk_yuksek": "The cover video is larger than 3840×2160. The server downscales everything to 1280×720 anyway; exporting at 1920×1080 uploads faster with the same result.",
				"oran_16_9_degil": "The video aspect ratio is {oran}; the cover box is 16:9. Other ratios are center-cropped and content near the edges is lost — reframe to 16:9 and upload again.",
				"sure_uzun": "The cover video is longer than 60 seconds. A cover is not the place for a long narrative; cut the strongest 60 seconds and add the full tour to your gallery as a separate item.",
				"sure_kisa": "The cover video is shorter than 6 seconds — shorter than the preview clip itself. Upload a shot of at least 6 seconds.",
				"kare_hizi_dusuruldu": "The frame rate was reduced to 30 fps and the upload was accepted. There is no visible quality loss and the file got noticeably smaller — you can export at 30 fps directly next time.",
				"bitrate_isleniyor": "The bitrate is high, so the server is re-compressing the video. The upload was accepted; the cover will appear on your store page once processing finishes.",
				"cok_agir": "Even after compression the video stayed above the size limit. Shortening it, or reducing fast-moving and noisy scenes, is the most effective way to shrink the file.",
				"video_akisi_yok": "No video stream was found in the file; it may be audio-only or corrupted. Re-export the video (MP4/H.264) and upload it again.",
				"ffprobe_okunamadi": "The technical details of the video could not be read; the file may be corrupted. The upload was accepted but flagged for review and will be re-compressed to stay on the safe side.",
				"poster_cozulemedi": "No usable cover frame could be picked from the video (the opening seconds are fully black or fully white). Upload a poster image manually, or start the video on a brighter frame.",
				"altyazi_gerekli": "The cover video contains speech but no subtitle file (.vtt) was uploaded. Add subtitles in the spoken language; muted viewers and deaf or hard-of-hearing users can only follow the video that way.",
				"gomulu_logo": "A burned-in logo or text was detected in the video. The interface mirrors for right-to-left languages such as Arabic, so a burned-in logo ends up on the wrong side; your logo is already shown next to the cover, so removing it from the video is recommended.",
				"private_transcode_atlandi": "The video was stored as private, so compression and cover-frame generation were skipped. Upload the cover video as public.",
				"transcode_hatasi": "Something went wrong while processing the video, and it is on our side. The upload was saved and will be retried automatically — you do not need to upload the file again."
			}
		},
		"video": {
			"duration_min_s": 6,
			"duration_max_s": 60,
			"resolution_min": {
				"width": 1280,
				"height": 720,
				"derivation": "Masaüstü kutusu 500 CSS px × DPR2 = 1000 cihaz px; 1280 ≥ 1000. Kutu: StoreHeader.ts:203 (lg:w-[500px]), :297 (aspect-video)"
			},
			"resolution_max": {
				"width": 3840,
				"height": 2160,
				"note": "4K üstü kabul etmenin görsel karşılığı yok: teslim her hâlükârda 1280 genişliğe iniyor (transcode.py:242)."
			},
			"resolution_recommended": {
				"width": 1920,
				"height": 1080,
				"note": "Yükleyene önerilen ölçü. Ret eşiği değil."
			},
			"bitrate_cap_kbps": 2000,
			"frame_rate": {
				"accepted": [
					24,
					25,
					30
				],
				"downsampled_from": [
					50,
					60
				],
				"output_cap": 30,
				"reason": "60 fps aynı kalitede ~%80 fazla bit; fabrika turu / konuşan kafa içeriğinde görsel kazanç yok."
			},
			"audio_policy": {
				"track": "allowed",
				"codec": "libopus",
				"bitrate_kbps": 96,
				"channels": 2,
				"autoplay_mute_mandatory": true,
				"user_can_unmute": true,
				"loudness": {
					"standard": "EBU R128",
					"integrated_lufs": -16,
					"true_peak_dbtp": -1,
					"filter": "loudnorm=I=-16:TP=-1:LRA=11",
					"note": "Standarda atıf — bu oturumda ölçüm YAPILMADI."
				},
				"notes": [
					"story kipinde ses AKTARILIR; ambient kipinde ffmpeg -an ile SİLİNİR (video.modes.ambient.audio_track = stripped).",
					"muted+playsinline olmadan mobil tarayıcılar oynatmayı reddeder; sesli otomatik oynatma B2B vitrininde saldırgan.",
					"Kullanıcı sesi açabilir: StoreHeader.ts:255-260, düğme :347-350.",
					"Ç10 — bugün `-c:a libopus` var ama `-b:a` YOK (transcode.py:246): bitrate kodlayıcı varsayılanına bağlı ve ffmpeg sürümü değişince sessizce değişir. 96 kbps bu yüzden SABİTLENİYOR."
				]
			},
			"autoplay": {
				"enabled": false,
				"muted": true,
				"loop": false,
				"playsinline": true,
				"preload": "metadata",
				"present_today": false,
				"note": "Varsayılan kip story: otomatik oynatma YOK, kullanıcı başlatır (StoreHeader.ts:301-309'da autoplay özniteliği yok) — bu yüzden WCAG 2.2 SC 2.2.2 kapsamına girmiyor. muted/playsinline bugün de var (StoreHeader.ts:308), loop yok. ambient kipi açılırsa (K2) enabled=true, muted=true (zorunlu), loop=true, playsinline=true olur. preload='auto' YASAK — pasif mobil bütçeyi tek başına aşar; navigator.connection.saveData === true ya da effectiveType ∈ ['slow-2g','2g'] iken 'none'a düşürülür."
			},
			"poster": {
				"selection_rule": "1) Satıcı poster_image yüklediyse O KAZANIR, otomatik seçim çalışmaz. 2) Yoksa [0,5 s, min(5 s, süre×0,25)] penceresinde ffmpeg 'thumbnail' filtresi (n=120) histogram uzaklığına göre en temsili kareyi seçer — 'ilk anlamlı kare'nin uygulanabilir tanımı budur. 3) Seçilen kare parlaklık kapısından geçmezse [süre×0,25, süre×0,50] penceresinde bir kez yeniden denenir. 4) O da geçmezse cover_video_poster_unresolved.",
				"profile": "poster_1280",
				"fallback_profile": "poster_854",
				"override_field": "Seller Gallery Image.poster_image",
				"implemented_today": false,
				"auto_generate": {
					"implemented_today": false,
					"search_window_s": {
						"start": 0.5,
						"end_expr": "min(5, duration * 0.25)"
					},
					"window_reason": "Açılış siyahlığını (0-0,5 s) atlar, videonun ilk çeyreğinden çıkmaz.",
					"command": "ffmpeg -ss 0.5 -t 4.5 -i cover_720.webm -vf \"thumbnail=n=120,scale=1280:-2\" -frames:v 1 -c:v libwebp -quality 78 cover_poster.webp",
					"selection_basis": "ffmpeg 'thumbnail' filtresi n kare içinden histogram uzaklığına göre en temsili kareyi seçer — 'ilk anlamlı kare'nin uygulanabilir tanımı."
				},
				"quality_gate": {
					"reject_if_mean_luma_pct_below": 6,
					"reject_if_mean_luma_pct_above": 94,
					"retry_window_expr": "[duration * 0.25, duration * 0.50]",
					"max_retries": 1,
					"on_final_failure": "cover_video_poster_unresolved"
				},
				"output": {
					"format": "webp",
					"width": 1280,
					"height": 720,
					"max_bytes": 122880,
					"max_bytes_human": "120 KB",
					"quality_ladder": [
						78,
						70,
						62
					],
					"downscale_fallback": {
						"width": 854,
						"height": 480
					},
					"note": "Pasif mobil bütçenin ana kalemi. Profil karşılıkları: profiles[poster_1280] ve profiles[poster_854]."
				},
				"seller_override": {
					"field": "Seller Gallery Image.poster_image",
					"wins": true,
					"today_behavior": ":poster=\"current.poster || ''\" — boşsa poster HİÇ YOK, kutu siyah kalır",
					"today_source": "StoreHeader.ts:303, :297"
				},
				"legacy_fallback": {
					"technique": "item.src + '#t=0.5' with <video preload=\"metadata\">",
					"source": "StoreHeader.ts:401-405",
					"scope_today": "yalnız küçük resim ızgarası — ana oynatıcıda YOK",
					"verdict": "Kaldırılmaz ama yeterli sayılmaz: tam bir <video> + metadata indirmesi, poster'dan pahalı. Otomatik poster devreye girince tek işlevi migrate edilmemiş satırlar.",
					"finding_ref": "Ç7"
				}
			},
			"preview_clip": {
				"duration_s": 6,
				"max_bytes": 409600,
				"silent": true,
				"max_bytes_human": "400 KB",
				"max_bytes_derivation": "6 s × 500 kbps = 3 Mbit = 375 KB → 400 KB (409.600 bayt)",
				"implemented_today": false,
				"start_offset": "poster'ın seçildiği zaman damgası",
				"start_offset_reason": "Önizleme, kullanıcının poster'da gördüğü kareden başlar → görsel süreklilik.",
				"width": 854,
				"height": 480,
				"video_codec": "libvpx-vp9",
				"fallback_container": "mp4/libx264",
				"loop": true,
				"loop_reason": "Ses yok ve süre kısa → story kipindeki loop yasağının gerekçesi burada geçerli değil.",
				"used_in": [
					"mağaza kartı",
					"arama sonucu",
					"küçük resim hover"
				],
				"not_used_in": [
					"kapak kutusu (orada tam video var)"
				],
				"reduced_motion": "oynatılmaz — poster gösterilir"
			},
			"hls": {
				"threshold_s": 60,
				"ladder": [],
				"delivery": "progressive",
				"required_if_any": {
					"duration_s_gt": 60,
					"max_rendition_bytes_gt": 12582912,
					"distinct_resolution_tiers_gt": 2
				},
				"triggers_none": true,
				"reason": "Süre 60 s ile, rendition 12 MB ile, tier sayısı 2 ile sınırlı — üç koşul da tanım gereği sağlanmıyor. Bu yüzden ladder BOŞ: 'basamak yok' ile 'basamak yazılmadı' karışmasın.",
				"threshold_written_for": "gelecekteki uzun-form 'şirket tanıtım filmi' slotu — o slot açıldığında HLS/LL-HLS ilk günden zorunlu",
				"current_state": "yok",
				"current_state_evidence": "tradehubfront/src ve admin-panel/frontend/src içinde 'hls' / 'HLS' → 0 eşleşme",
				"byte_range_required": true,
				"byte_range_reason": "Progressive teslimde seek'in çalışması Accept-Ranges: bytes gerektirir.",
				"byte_range_verify": "docs/standards/company-cover-video.md §11-D5"
			},
			"mobile_data_budget": {
				"first_10s_max_kb": 1250,
				"first_10s_typical_kb": 875,
				"first_10s_derivation": "480p tier tavanı 1,0 Mbps × 10 s = 10 Mbit = 1.250 KB (1.280.000 bayt)",
				"first_10s_typical_derivation": "hedef ortalama 0,7 Mbps × 10 s = 7 Mbit ≈ 875 KB (896.000 bayt)",
				"passive_max_kb": 150,
				"passive_max_on_save_data_kb": 120,
				"passive_breakdown": {
					"poster_kb": 120,
					"container_metadata_kb": 30
				},
				"worst_case_total_kb": 1400,
				"why_two_part": "Otomatik oynatma yok (StoreHeader.ts:301-309) → ilk 10 s baytı ancak kullanıcı dokunduktan SONRA iner. Pasif maliyet yalnız poster + metadata: 120 KB + 30 KB = 150 KB (153.600 bayt); saveData açıkken 120 KB (122.880 bayt).",
				"why_strict": "flex-col-reverse (StoreHeader.ts:129) mobilde videoyu katlamanın üstüne koyuyor — LCP adayı konum.",
				"verify": "docs/standards/company-cover-video.md §11-D9"
			},
			"accessibility": {
				"vtt_required": "if_speech",
				"reduced_motion_behavior": "story: DEĞİŞMEZ — kullanıcı başlatmalı oynatma kısıtlanmaz (WCAG 2.2 SC 2.2.2 yalnız otomatik hareketi hedefler). ambient: otomatik oynatma İPTAL, poster + oynat düğmesi gösterilir. preview_clip: oynatılmaz, poster gösterilir. UYGULAMA: CSS bunu yapamaz, JS gerekir — window.matchMedia('(prefers-reduced-motion: reduce)').matches oynatma anında okunur, init'te önbelleğe ALINMAZ (kullanıcı OS ayarını sekme açıkken değiştirebilir).",
				"current_state": "yok",
				"current_state_evidence": "'<track', 'kind=\"captions\"', '.vtt' → tradehubfront/src + admin-panel/frontend/src içinde 0 eşleşme",
				"captions_rules": [
					{
						"condition": "story + ses akışı var + konuşma içeriyor",
						"vtt": "ZORUNLU",
						"on_missing": "cover_video_captions_required"
					},
					{
						"condition": "story + ses akışı var + yalnız müzik/ortam",
						"vtt": "opsiyonel",
						"caption_field": "ZORUNLU"
					},
					{
						"condition": "story + ses akışı yok",
						"vtt": "opsiyonel",
						"caption_field": "ZORUNLU"
					},
					{
						"condition": "ambient",
						"vtt": "gereksiz (ses akışı yok)",
						"caption_field": "ZORUNLU"
					}
				],
				"speech_detection": {
					"method": "satıcı beyanı (onay kutusu) + rastgele denetim",
					"decision_ref": "K5",
					"note": "ffmpeg silencedetect 'ses var mı' der, 'konuşma mı müzik mi' demez."
				},
				"required_new_field": {
					"doctype": "Seller Gallery Image",
					"fieldname": "subtitles_vtt",
					"fieldtype": "Attach",
					"note": "ALAN HENÜZ YOK — açılması gerekiyor. Bu yüzden bound_to'da yer almıyor: bound_to yalnız BUGÜN var olan depolama alanlarını sayar."
				},
				"required_upload_policy_change": {
					"extension": ".vtt",
					"current_state": "upload_policy.EXTENSIONS içinde YOK (tradehub_core/media/upload_policy.py:57-65)",
					"new_kind": "KIND_CAPTION",
					"max_bytes": 524288,
					"max_bytes_human": "512 KB"
				},
				"player_markup": "<track kind=\"captions\" srclang=\"tr\" label=\"Türkçe\" default>",
				"languages": {
					"platform_locales": [
						"tr",
						"en",
						"ru",
						"ar"
					],
					"mandatory": "yalnız videonun konuşma dili",
					"others": "opsiyonel"
				},
				"effective_date": {
					"new_uploads": "hemen",
					"existing_covers": "90 gün geçiş",
					"decision_ref": "K4"
				},
				"prefers_reduced_motion": {
					"existing_css_rule": {
						"source": "tradehubfront/src/style.css:757-765",
						"effect": "animation-duration/transition-duration → 0.01ms",
						"does_not_affect": "<video> oynatması"
					},
					"story": "değişmez — kullanıcı başlatmalı oynatma kısıtlanmaz (WCAG 2.2 SC 2.2.2 yalnız otomatik hareketi hedefler)",
					"ambient": "otomatik oynatma İPTAL; poster + oynat düğmesi gösterilir",
					"preview_clip": "oynatılmaz; poster gösterilir",
					"implementation_note": "CSS bunu yapamaz — JS gerekir: window.matchMedia('(prefers-reduced-motion: reduce)').matches. Oynatma anında okunmalı, init'te önbelleğe ALINMAMALI (kullanıcı OS ayarını sekme açıkken değiştirebilir)."
				},
				"other_gaps": [
					{
						"gap": "Seek çubuğu klavyeyle kullanılamıyor — <div> + @click, role/tabindex yok",
						"source": "StoreHeader.ts:339",
						"fix": "role=\"slider\" + aria-valuenow/min/max + @keydown.arrow-left/right"
					},
					{
						"gap": "Oynat/duraklat aria-label sabit 'Oynat'",
						"source": "StoreHeader.ts:332",
						"fix": ":aria-label=\"playing ? 'Duraklat' : 'Oynat'\""
					},
					{
						"gap": "Üç kontrol etiketi i18n dışında ('Oynat', 'Sesi aç/kapat', 'Tam ekran')",
						"source": "StoreHeader.ts:332,347,352",
						"fix": "t(...) ile 4 dile alınması — dosyanın geri kalanı zaten t(...) kullanıyor (:19, :58)"
					},
					{
						"gap": "iOS'ta tam ekran çalışmıyor — yalnız v.requestFullscreen kontrol ediliyor",
						"source": "StoreHeader.ts:274-277",
						"fix": "webkitEnterFullscreen() dalı"
					},
					{
						"gap": "Poster yoksa boş siyah kutu",
						"source": "StoreHeader.ts:297,303",
						"fix": "otomatik poster (video.poster bloğu)"
					}
				]
			},
			"renditions": [
				{
					"id": "cover_720_webm",
					"role": "primary",
					"width": 1280,
					"height": 720,
					"container": "webm",
					"video_codec": "libvpx-vp9",
					"crf": 32,
					"maxrate_kbps": 2500,
					"bufsize_kbps": 5000,
					"target_avg_kbps": 1600,
					"audio_codec": "libopus",
					"audio_bitrate_kbps": 96,
					"audio_channels": 2,
					"max_bytes": 12582912,
					"max_bytes_human": "12 MB",
					"max_bytes_derivation": "60 s × 1,6 Mbps = 96 Mbit = 12 MB",
					"mime": "video/webm; codecs=vp9,opus",
					"served_when": "min-width: 1024px",
					"implemented_today": true,
					"crf_note": "CRF 32 mevcut hattan korunuyor (transcode.py:245); bu standart üstüne -maxrate/-bufsize ekliyor.",
					"note": "maxrate 2500 kbps mevcut hattın barıdır (transcode.py:67); video.bitrate_cap_kbps = 2000 ise TETİKLEME eşiğidir (Ç4 kararı). İkisi farklı işler: biri kuyruğa alma barı, biri encoder tavanı."
				},
				{
					"id": "cover_720_mp4",
					"role": "fallback",
					"width": 1280,
					"height": 720,
					"container": "mp4",
					"video_codec": "libx264",
					"profile": "high",
					"crf": 23,
					"maxrate_kbps": 2800,
					"bufsize_kbps": 5600,
					"target_avg_kbps": 1900,
					"audio_codec": "aac",
					"audio_profile": "aac_low",
					"audio_bitrate_kbps": 96,
					"audio_channels": 2,
					"max_bytes": 14680064,
					"max_bytes_human": "14 MB",
					"mime": "video/mp4; codecs=avc1.640028,mp4a.40.2",
					"extra_flags": [
						"-movflags +faststart"
					],
					"served_when": "min-width: 1024px (WebM desteklenmiyorsa)",
					"implemented_today": false
				},
				{
					"id": "cover_480_webm",
					"role": "mobile_primary",
					"width": 854,
					"height": 480,
					"container": "webm",
					"video_codec": "libvpx-vp9",
					"crf": 34,
					"maxrate_kbps": 1000,
					"bufsize_kbps": 2000,
					"target_avg_kbps": 700,
					"audio_codec": "libopus",
					"audio_bitrate_kbps": 64,
					"audio_channels": 1,
					"max_bytes": 5242880,
					"max_bytes_human": "5 MB",
					"max_bytes_derivation": "60 s × 0,7 Mbps = 42 Mbit ≈ 5,25 MB → 5 MB",
					"mime": "video/webm; codecs=vp9,opus",
					"served_when": "max-width: 1023px",
					"implemented_today": false
				},
				{
					"id": "cover_480_mp4",
					"role": "mobile_fallback",
					"width": 854,
					"height": 480,
					"container": "mp4",
					"video_codec": "libx264",
					"profile": "high",
					"crf": 25,
					"maxrate_kbps": 1200,
					"bufsize_kbps": 2400,
					"target_avg_kbps": 850,
					"audio_codec": "aac",
					"audio_bitrate_kbps": 64,
					"audio_channels": 1,
					"max_bytes": 6291456,
					"max_bytes_human": "6 MB",
					"mime": "video/mp4; codecs=avc1.640028,mp4a.40.2",
					"extra_flags": [
						"-movflags +faststart"
					],
					"served_when": "max-width: 1023px (WebM desteklenmiyorsa)",
					"implemented_today": false
				}
			],
			"rendition_policy": {
				"tier_breakpoint_px": 1024,
				"tier_breakpoint_reason": "lg breakpoint'iyle aynı — kolon 500px'e o noktada sabitleniyor (StoreHeader.ts:203).",
				"distinct_resolution_tiers": 2,
				"object_count_per_cover": 6,
				"object_count_breakdown": "4 rendition + 1 poster + 1 önizleme klibi",
				"storage_typical_30s_mb": 19,
				"storage_worst_60s_mb": 37.5,
				"storage_note": "Kota etkisi docs/reports/06-depolama-maliyet.md ile çapraz okunmalı. Rendition'ların File kaydı açıp kotayı 6 kat tüketmesi K7 kararına bağlı; öneri: File kaydı AÇMASIN (presets.py:33-35 ARCHIVE_DIRNAME deseni).",
				"size_gate_retry": {
					"crf_step": 2,
					"max_attempts": 2,
					"on_final_failure": "cover_video_too_heavy"
				},
				"size_gate_missing_today": "Bugün çıktı ne olursa olsun os.replace ile yazılıyor (transcode.py:252) — boyut kapısı yok.",
				"resolution_1080p": {
					"included": false,
					"reason": "1023 px viewport'ta kutu 943 CSS px; DPR2'de 1886 cihaz px isteniyor, 1280 ile 1,47x upscale. 1080p bitrate tavanını 2,5 → 4,5 Mbps'e (+%80 bayt) taşır.",
					"gate_to_add": "Tablet-DPR2 (768-1023 px × DPR≥2) payı > %15 ise eklenir",
					"measurement_ref": "docs/standards/company-cover-video.md §11-D3",
					"decision_ref": "K1",
					"if_added": {
						"maxrate_kbps": 4500,
						"max_bytes_human": "22 MB"
					}
				}
			},
			"modes": {
				"story": {
					"default": true,
					"implemented_today": true,
					"duration_s": {
						"min": 6,
						"max": 60
					},
					"min_duration_derivation": "Önizleme klibi 6 s; master kendi önizlemesinden kısa olamaz.",
					"max_duration_derivation": "60 s × 1,6 Mbps hedef ortalama = 96 Mbit = 12 MB (teslim dosya kapısı).",
					"autoplay": false,
					"muted_initial": true,
					"audio_track": "allowed",
					"loop": false,
					"controls": "custom",
					"loop_reason": "Ses taşıyan anlatı döngüye girmemeli; ayrıca @ended='playing = false' (StoreHeader.ts:307) bilinçli bir 'bitti' durumu üretiyor."
				},
				"ambient": {
					"default": false,
					"implemented_today": false,
					"requires_admin_approval": "K2 — ONAYLANDI 2026-08-19 (platform yöneticisi): ambient AÇILDI, ama YALNIZ DOĞRULANMIŞ (verified) satıcılara. default=false BU YÜZDEN DEĞİŞMEDİ: kip artık slot düzeyinde değil, SATICI düzeyinde açılıyor. Kapı VerificationBadge altyapısına bağlanacak (tradehubfront components/seller/VerificationBadge.ts, seller.verifications); doğrulanmamış satıcıda ambient istenirse SESSİZCE standart (story) kipe düşülür, hata gösterilmez. implemented_today HÂLÂ false — bağlama işi ayrı görev. docs/standards/company-cover-video.md §10.9-K2",
					"duration_s": {
						"min": 3,
						"max": 8
					},
					"autoplay": true,
					"muted_required": true,
					"audio_track": "stripped",
					"audio_strip_flag": "-an",
					"loop": true,
					"controls": "hidden",
					"playsinline_required": true,
					"reduced_motion_override": "autoplay iptal; poster + oynat düğmesi",
					"max_delivered_bytes": 700000,
					"max_delivered_derivation": "8 s × 0,7 Mbps = 5,6 Mbit = 700 KB"
				}
			},
			"transcode": {
				"unconditional_for_this_slot": true,
				"unconditional_reason": "needs_transcode() koşullu atlaması kapak slotunda poster üretimini, MP4 yedeğini ve 480p tier'ı da atlar. Kapak mağaza başına 1 dosya, nadiren değişir → kuyruk riski yok (transcode.py:14-16'daki gerekçe burada geçerli değil).",
				"general_library_thresholds_kept": {
					"max_width": 1280,
					"max_bitrate_bps": 2500000,
					"source": "tradehub_core/media/transcode.py:66-67, :75-76",
					"note": "Genel kütüphane eşikleri KORUNUYOR. Bu standart onlara dokunmuyor."
				},
				"client_server_threshold_conflict": {
					"client_bps": 2000000,
					"client_source": "admin-panel/frontend/src/lib/media/compress.video.js:29",
					"server_bps": 2500000,
					"server_source": "tradehub_core/media/transcode.py:67",
					"symptom": "1280x720 @ 2,3 Mbps: panelden geçerse istemci dönüştürür; upload_file/after_insert yolundan geçerse sunucu atlar. Aynı dosya, giriş kapısına göre iki farklı sonuç.",
					"decision": "İki sayı 2.000.000'da birleşir (dar olan kazanır; sunucu barı 2,5 → 2,0 iner).",
					"finding_ref": "Ç4"
				},
				"in_place_replace": {
					"allowed_for_this_slot": false,
					"today_behavior": "dst_path = f'{src_path}.transcoding.webm' (transcode.py:230) ardından os.replace(dst_path, src_path) (transcode.py:252) → .mp4 adresine VP9/WebM baytları yazılıyor.",
					"consequences": [
						"nginx Content-Type'ı uzantıdan türetir → WebM baytları video/mp4 olarak servis edilir",
						"<source type=\"video/mp4\"> yazmak yalan olur; tip uyuşmazlığında tarayıcı kaynağı atlayabilir",
						"WebM konteynerini desteklemeyen eski Safari'de kapak hiç oynamaz ve yedek yol yok"
					],
					"finding_ref": "Ç1"
				},
				"keyframe_interval_s": 2,
				"keyframe_flag": "-g 60 (30 fps'te)",
				"keyframe_reason": "El yapımı seek çubuğu (StoreHeader.ts:261-266) rastgele noktaya atlıyor; 2 s'den seyrek anahtar kare seek'i gözle görülür geciktirir. İleride HLS segmentlemesi de 2 s katı ister.",
				"webm_cues_to_front": {
					"required": true,
					"flag": "-cues_to_front 1",
					"present_today": false,
					"reason": "Index sonda kalırsa preload=metadata ve seek için tarayıcı dosya sonuna range isteği atar → mobilde ek RTT.",
					"finding_ref": "Ç11",
					"verify": "docs/standards/company-cover-video.md §11-D6"
				},
				"loudness_normalization": {
					"standard": "EBU R128",
					"integrated_lufs": -16,
					"true_peak_dbtp": -1,
					"filter": "loudnorm=I=-16:TP=-1:LRA=11",
					"note": "Standarda atıf — bu oturumda ölçüm YAPILMADI."
				}
			},
			"identity": {
				"canonical_storage": {
					"doctype": "Seller Gallery Image",
					"parent_doctype": "Admin Seller Profile",
					"parent_field": "gallery_images",
					"source": "tradehub_core/tradehub_core/doctype/seller_gallery_image/seller_gallery_image.json",
					"discriminator": {
						"media_type": "video"
					},
					"media_url_field": "video_url",
					"poster_field": "poster_image",
					"caption_field": "caption",
					"category_field": "category",
					"order_field": "sort_order"
				},
				"cover_selection_rule": {
					"rule": "media_groups[0].items[0] ve media_type == 'video'",
					"explanation": "Ayrı bir 'kapak' alanı yok; kapak sıralamanın türevi. _build_media_groups sort_order asc, idx asc ile sıralar, sonra videoyu başa alır.",
					"evidence": [
						"tradehub_core/api/seller.py:795",
						"tradehub_core/api/seller.py:823-824"
					]
				},
				"categories": {
					"values": [
						"overview",
						"360_view",
						"production",
						"quality_control"
					],
					"default": "overview",
					"duplicated_in": [
						"tradehub_core/tradehub_core/doctype/seller_gallery_image/seller_gallery_image.json (category.options)",
						"tradehub_core/api/seller.py:760-765 (_MEDIA_CATEGORIES)"
					],
					"finding_ref": "Ç12"
				},
				"aliases": [
					{
						"field": "factory_video_url",
						"written_by": "admin-panel/frontend/src/views/seller/StorefrontEdit.vue:1014,1228",
						"posts_to": "tr_tradehub.api.v1.seller.update_storefront",
						"status": "orphan",
						"evidence": "tradehub_core/**/*.py, tradehub_core/**/*.json ve tradehubfront/src/** içinde 'factory_video_url' → 0 eşleşme",
						"resolution": "Yeni yükleme kabul etmez; mevcut değer Seller Gallery Image (category=overview, media_type=video, sort_order=0) satırına taşınır. Faz 3 göçü.",
						"finding_ref": "Ç2",
						"bound_to_note": "BU ALAN HENÜZ YOK — hiçbir doctype'a bağlı değil, bu yüzden bound_to'ya YAZILMADI. docs/reports/00-upload-slot-envanteri.md §5 satırı da bunu 'o alan bu repoda bir doctype'a bağlı değil (§9-M1)' diye kaydediyor."
					}
				]
			},
			"render_box": {
				"component": "tradehubfront/src/components/seller/StoreHeader.ts:203-418",
				"measurement_method": "Tailwind v4 varsayılan ölçeği (1rem=16px) ile KAYNAK KODDAN hesaplandı. Tarayıcıda computed style OKUNMADI — doğrulama komutu docs/standards/company-cover-video.md §11-D7.",
				"class_chain": [
					{
						"layer": "page_container",
						"classes": "max-w-[1200px] mx-auto px-4 lg:px-8 py-6",
						"source": "StoreHeader.ts:46"
					},
					{
						"layer": "card_padding",
						"classes": "px-4 sm:px-6 lg:px-10 py-6 lg:py-8 lg:pb-10",
						"source": "StoreHeader.ts:128"
					},
					{
						"layer": "row",
						"classes": "flex flex-col-reverse lg:flex-row gap-6 lg:gap-8",
						"source": "StoreHeader.ts:129"
					},
					{
						"layer": "video_column",
						"classes": "w-full lg:w-[500px] shrink-0",
						"source": "StoreHeader.ts:203"
					},
					{
						"layer": "media_box",
						"classes": "relative w-full rounded-sm overflow-hidden bg-gray-900 aspect-video",
						"source": "StoreHeader.ts:297"
					},
					{
						"layer": "video_el",
						"classes": "w-full h-full object-cover",
						"source": "StoreHeader.ts:304"
					}
				],
				"computed_sizes_css_px": [
					{
						"viewport": 360,
						"container": 328,
						"card_inner": 296,
						"box_w": 296,
						"box_h": 166.5,
						"dpr2_w": 592
					},
					{
						"viewport": 390,
						"container": 358,
						"card_inner": 326,
						"box_w": 326,
						"box_h": 183.4,
						"dpr2_w": 652
					},
					{
						"viewport": 640,
						"container": 608,
						"card_inner": 560,
						"box_w": 560,
						"box_h": 315,
						"dpr2_w": 1120
					},
					{
						"viewport": 768,
						"container": 736,
						"card_inner": 688,
						"box_w": 688,
						"box_h": 387,
						"dpr2_w": 1376
					},
					{
						"viewport": 1023,
						"container": 991,
						"card_inner": 943,
						"box_w": 943,
						"box_h": 530.4,
						"dpr2_w": 1886,
						"note": "EN GENİŞ — lg altında kolon tam genişlik"
					},
					{
						"viewport": 1024,
						"container": 960,
						"card_inner": 880,
						"box_w": 500,
						"box_h": 281.25,
						"dpr2_w": 1000,
						"note": "lg:w-[500px] devreye girdi, sabitlendi"
					},
					{
						"viewport": 1440,
						"container": 1200,
						"card_inner": 1056,
						"box_w": 500,
						"box_h": 281.25,
						"dpr2_w": 1000
					}
				],
				"aspect_ratio_all_breakpoints": "16:9",
				"mobile_alternate_ratio": null,
				"object_fit": "cover",
				"object_fit_risk": "Master 16:9 değilse sessizce merkezden kırpılır; yükleyene uyarı gösterilmez.",
				"empty_state_background": "#111827 (bg-gray-900, StoreHeader.ts:297)",
				"mobile_dom_order": {
					"classes": "flex-col-reverse lg:flex-row",
					"source": "StoreHeader.ts:129",
					"effect": "Mobil ve tablette video, istatistik bloğunun ÜSTÜNDE — katlamanın üstünde, LCP adayı."
				},
				"thumbnail_box": {
					"grid": "repeat(auto-fill, minmax(96px, 1fr))",
					"grid_source": "StoreHeader.ts:378",
					"cell_aspect": "4:3",
					"cell_aspect_source": "StoreHeader.ts:381",
					"min_size_css_px": [
						96,
						72
					],
					"horizontal_crop_of_16x9_poster_pct": 25,
					"crop_derivation": "(16/9) / (4/3) = 1,3333 → 1 - 1/1,3333 = 0,25"
				}
			},
			"safe_area": {
				"overlays": [
					{
						"name": "controls_bar",
						"height_px": 40,
						"derivation": "py-2.5 (10px) x2 + w-5/h-5 ikon (20px)",
						"source": "StoreHeader.ts:329,333-334"
					},
					{
						"name": "controls_gradient",
						"spans": "kutunun tamamı",
						"value": "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
						"source": "StoreHeader.ts:330"
					},
					{
						"name": "center_play_button",
						"size_px": [
							56,
							56
						],
						"source": "StoreHeader.ts:321"
					}
				],
				"overlay_share_of_height_pct": {
					"viewport_1024_plus": {
						"bar": 14.2,
						"play_button": 19.9
					},
					"viewport_768": {
						"bar": 10.3,
						"play_button": 14.5
					},
					"viewport_360": {
						"bar": 24,
						"play_button": 33.6,
						"note": "en kötü durum — alt %26 kuralının kaynağı"
					}
				},
				"title_safe_insets_pct": {
					"left": 10,
					"right": 10,
					"top": 6,
					"bottom": 26
				},
				"title_safe_on_1280x720_px": {
					"width": 1024,
					"height": 490,
					"offset_x": 128,
					"offset_y": 43
				},
				"center_keepout_px": [
					72,
					72
				],
				"center_keepout_reason": "56px oynat düğmesi + 8px pay; poster olarak da bu kare gösteriliyor.",
				"thumbnail_safe_width_pct": 75,
				"thumbnail_safe_reason": "Küçük resim 4:3 → 16:9 poster %25 yatay kırpılıyor; asıl kısıt bu, %10 kenar payından sıkı.",
				"burned_in_logo": {
					"allowed": false,
					"reason": "Arayüz mantıksal yön özellikleriyle RTL'de aynalanıyor (start-*/end-*/ms-*/pe-*; ör. section-registry.ts:185,188). Videoya gömülü logo aynalanamaz. Mağaza logosu zaten ayrı <img> olarak render ediliyor (CompanyInfo.ts:47, 120px).",
					"on_violation": "cover_video_burned_logo_warning (uyarı, ret değil)"
				},
				"burned_in_subtitles": {
					"allowed": false,
					"reason": "Tarayıcı <track> altyazısını alt bölgeye yerleştirir; gömülü altyazı ile üst üste biner."
				}
			},
			"playback_attributes": {
				"playsinline": {
					"required": true,
					"present_today": true,
					"source": "StoreHeader.ts:308, :403"
				},
				"muted": {
					"story_initial": true,
					"autoplay_requires": true,
					"present_today": true,
					"source": "StoreHeader.ts:308, :207"
				},
				"autoplay": {
					"story": false,
					"ambient": true,
					"present_today": false,
					"source": "StoreHeader.ts:301-309 (autoplay özniteliği yok)"
				},
				"loop": {
					"story": false,
					"ambient": true,
					"present_today": false
				},
				"preload": {
					"default": "metadata",
					"present_today": "metadata",
					"source": "StoreHeader.ts:308",
					"forbidden": [
						"auto"
					],
					"forbidden_reason": "preload=auto pasif mobil bütçeyi tek başına aşar.",
					"downgrade_to_none_when": [
						"navigator.connection.saveData === true",
						"navigator.connection.effectiveType in ['slow-2g','2g']"
					]
				},
				"audio_policy": {
					"autoplay_mute_mandatory": true,
					"mute_mandatory_reason": "muted+playsinline olmadan mobil tarayıcılar oynatmayı reddeder; sesli otomatik oynatma B2B vitrininde saldırgan.",
					"user_can_unmute": true,
					"user_unmute_source": "StoreHeader.ts:255-260, düğme :347-350",
					"opus_bitrate_pinned": true,
					"opus_bitrate_pin_reason": "Bugün -c:a libopus, -b:a YOK (transcode.py:246) → kodlayıcı varsayılanına bağlı, ffmpeg sürümü değişince sessizce değişir.",
					"finding_ref": "Ç10"
				}
			},
			"validation_codes": [
				{
					"code": "cover_video_aspect_invalid",
					"condition": "abs(w/h - 16/9) / (16/9) > 0.01",
					"retryable": false,
					"severity": "error",
					"message_key": "oran_16_9_degil"
				},
				{
					"code": "cover_video_resolution_too_low",
					"condition": "w < 1280 || h < 720",
					"retryable": false,
					"severity": "error",
					"message_key": "cozunurluk_dusuk"
				},
				{
					"code": "cover_video_resolution_too_high",
					"condition": "w > 3840 || h > 2160",
					"retryable": false,
					"severity": "error",
					"message_key": "cozunurluk_yuksek"
				},
				{
					"code": "cover_video_too_short",
					"condition": "story: duration < 6s | ambient: duration < 3s",
					"retryable": false,
					"severity": "error",
					"message_key": "sure_kisa"
				},
				{
					"code": "cover_video_too_long",
					"condition": "story: duration > 60s | ambient: duration > 8s",
					"retryable": false,
					"severity": "error",
					"message_key": "sure_uzun"
				},
				{
					"code": "cover_video_too_large",
					"condition": "bytes > 83886080",
					"retryable": false,
					"severity": "error",
					"message_key": "cok_buyuk"
				},
				{
					"code": "cover_video_too_heavy",
					"condition": "encode sonrası tier dosyası 2 CRF denemesinden sonra hâlâ kapı üstünde",
					"retryable": false,
					"severity": "error",
					"message_key": "cok_agir"
				},
				{
					"code": "cover_video_no_video_stream",
					"condition": "ffprobe video stream döndürmedi",
					"retryable": false,
					"severity": "error",
					"message_key": "video_akisi_yok"
				},
				{
					"code": "cover_video_poster_unresolved",
					"condition": "otomatik poster iki denemede de parlaklık kapısını geçemedi",
					"retryable": false,
					"severity": "error",
					"message_key": "poster_cozulemedi"
				},
				{
					"code": "cover_video_captions_required",
					"condition": "ses akışı var + konuşma beyan edildi + .vtt yok",
					"retryable": false,
					"severity": "error",
					"message_key": "altyazi_gerekli"
				},
				{
					"code": "cover_video_transcode_failed",
					"condition": "ffmpeg hata verdi",
					"retryable": true,
					"severity": "error",
					"message_key": "transcode_hatasi"
				},
				{
					"code": "cover_video_burned_logo_warning",
					"condition": "gömülü logo tespiti/beyanı",
					"retryable": null,
					"severity": "warning",
					"message_key": "gomulu_logo"
				}
			]
		},
		"sources": {
			"slot_key": "docs/reports/00-upload-slot-envanteri.md §8 kanonik anahtar biçimi (<alan>.<slot>) + tradehub_core/media/pipeline/policy/slots/company-cover-image.json 'company.cover_image' ile aynı aile. T-022 taslağı 'seller.cover_video' yazıyordu; kapak GÖRSELİ 'company.*' ailesinde olduğu için ikisi ayrışmasın diye 'company.cover_video' seçildi. Envanterdeki doctype biçimindeki karşılığı `seller.gallery_video`'dur (§2) — fark docs/standards/README.md 'Policy kapsam haritası' bölümünde yazılı.",
			"roles": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller.gallery_video` rol='satıcı'; ayrıca aynı satır Admin Seller Profile çocuğu olduğu için admin panelinden de yazılabiliyor (admin-panel/frontend/src/views/seller/StorefrontEdit.vue:503-543, 1004-1021 satıcı paneli; DocTypeFormView admin tarafı).",
			"bound_to": "docs/reports/00-upload-slot-envanteri.md §2 satırları `seller.gallery_video` ve `seller.gallery_poster`; §5 satırı 'Şirket profili kapak videosu'.",
			"accept.mime": "tradehub_core/media/upload_policy.py:62 (KIND_VIDEO uzantıları) + tradehub_core/media/transcode.py:67 VIDEO_EXTENSIONS. İstemci accept: admin-panel/frontend/src/views/seller/StorefrontEdit.vue:1004-1021",
			"accept.extensions": "tradehub_core/media/upload_policy.py:62 — .mp4, .webm, .mov, .m4v",
			"accept.max_bytes": "hesap: 60 s × 10 Mbps (cömert 1080p master tavanı) = 600 Mbit = 75 MB → 80 MB (83.886.080 bayt). Küresel tavan 200 MB (upload_policy.py:69) bunun üstünde, çelişki yok; DocType açıklaması ve panel 10 MB diyor — Ç3.",
			"accept.max_megapixels_hard": "hesap: 3840×2160 / 1e6 = 8,29 → 8,3. 4K kare üst sınırı; teslim her hâlükârda 1280 genişliğe iniyor (transcode.py:242).",
			"accept.allow_animated": "Video slotu — hareket slotun kendisidir. engine.py:111-112'deki 'animated' reddi PIL yoluna aittir, video yolu ffmpeg'dir (transcode.py:235-248).",
			"require.min_short_edge": "hesap: masaüstü kutusu 500 CSS px × DPR2 = 1000 cihaz px genişlik → 16:9'da yükseklik 563; standart basamak 720 (1280×720). Kutu: StoreHeader.ts:203, :297",
			"require.min_area": "hesap: 1280 × 720 = 921.600 piksel.",
			"require.max_short_edge": "hesap: 3840×2160 üst sınırının kısa kenarı = 2160 (video.resolution_max).",
			"require.allowed_ratios": "tradehubfront/src/components/seller/StoreHeader.ts:297 `aspect-video` — kutu HER kırılımda 16:9 (video.render_box.aspect_ratio_all_breakpoints).",
			"require.ratio_tolerance": "hesap: ±%1 — encoder yuvarlamalarını (1920×1088 = 1,765 vs 1,778 → %0,7 sapma) geçirir, 4:3 veya 1:1'i geçirmez. object-cover kırpması bundan geniş sapmayı sessizce yutuyor (StoreHeader.ts:304).",
			"require.max_count": "Kapak tek öğedir: media_groups[0].items[0] (api/seller.py:795, :823-824). Galerinin geri kalanı bu politikanın kapsamı DIŞINDA (seller.gallery_image / seller.gallery_video).",
			"master.max_long_edge": "tradehub_core/media/transcode.py:242 — ffmpeg hedefi scale='min(1280,iw)':-2. Yeni hedef önerilmiyor; 1080p tier K1 onayına bağlı (video.rendition_policy.resolution_1080p).",
			"master.min_long_edge": "hesap: require.min_short_edge 720 → 16:9'da uzun kenar 1280. Kapak için master hedefi TAM 1280×720; altı 'under-spec'tir ve en büyük profiller üretilmez.",
			"master.max_megapixels": "hesap: 1280 × 720 / 1e6 = 0,9216 → 0,93. Şema invaryantı sağlanıyor: 1280² / 1e6 = 1,638 ≥ 0,93.",
			"master.dpi_out": "Video için anlamsız bir alan; şema zorunlu kıldığı için ekran standardı 72 yazıldı. ÖLÇÜLMEDİ: video metadata'sında dpi taşınmıyor.",
			"master.colorspace": "tradehub_core/media/transcode.py:235-248 — ffmpeg komutunda renk uzayı dönüşümü YOK, kaynak korunuyor.",
			"master.format": "tradehub_core/media/transcode.py:243-246 — gerçek master biçimi WebM (VP9 video + Opus ses). 'webm' değeri şema v1.1.0'da enum'a eklendi; v1.0.0'da bu ifade edilemiyordu (docs/standards/README.md §4 E10).",
			"master.orientation": "ffmpeg döndürme metadata'sını taşır; PIL'in ImageOps.exif_transpose davranışı (engine.py:116) video yoluna hiç girmez → 'preserve'. ÖLÇÜLMEDİ: dikey çekilmiş telefon videosunda rotate matrisinin korunduğu üretim dosyasında doğrulanmalı.",
			"master.strip_metadata": "tradehub_core/media/transcode.py:235-248 — ffmpeg varsayılanı çoğu metadata'yı taşımaz. ÖLÇÜLMEDİ: `ffprobe -show_format` ile üretim dosyalarında GPS/EXIF silinmesi doğrulanmalı (Ç5 nedeniyle bugün hiçbir video metadata'sı okunmuyor).",
			"quality.reencode_floor_saving_ratio": "tradehub_core/media/presets.py:25 MIN_SAVING_RATIO = 0.10 — görsel yolundaki Kapı 6 ile aynı eşik. NOT: video yolunda bu kapı UYGULANMIYOR (transcode.py:251-252 os.replace); kapak slotunda yerine mutlak bayt kapısı + CRF yeniden denemesi geliyor (video.rendition_policy.size_gate_retry).",
			"profiles[0].width": "hesap: 500 CSS px × DPR2 = 1000 → üst basamak 1280 (16:9'da 1280×720). Kutu StoreHeader.ts:203, :297",
			"profiles[1].width": "hesap: 480p teslim tier'ıyla aynı kare (854×480, video.renditions[cover_480_webm]); mobil en dar kutu 296 CSS px @2x = 592 ≤ 854.",
			"profiles[2].width": "hesap: küçük resim hücresi en az 96×72 CSS px (StoreHeader.ts:378 minmax(96px,1fr), :381 oran 4:3) → DPR2 = 192×144.",
			"profiles[*].encoder_quality.webp": "video.poster.output.quality_ladder = [78, 70, 62] — 120 KB kapısı tutulana kadar inilecek basamaklar. ÖLÇÜLMEDİ: hangi basamağın 1280×720'de 120 KB'ı tuttuğu gerçek kapak karelerinde ölçülmeli (D1/D2).",
			"video.duration_min_s": "hesap: önizleme klibi 6 s (video.preview_clip.duration_s); master kendi önizlemesinden kısa olamaz.",
			"video.duration_max_s": "hesap: 60 s × 1,6 Mbps hedef ortalama = 96 Mbit = 12 MB teslim kapısı.",
			"video.resolution_min": "hesap: masaüstü kutusu 500 CSS px × DPR2 = 1000 cihaz px; 1280 ≥ 1000.",
			"video.resolution_max": "hesap: 4K (3840×2160) üst sınırı; üstünü kabul etmenin görsel karşılığı yok (transcode.py:242).",
			"video.bitrate_cap_kbps": "tradehub_core/media/transcode.py:67 (2.500.000 bps sunucu) ile admin-panel/frontend/src/lib/media/compress.video.js:29 (2.000.000 bps istemci) çelişiyordu — Ç4. Karar: dar olan kazanır → 2.000 kbps.",
			"video.frame_rate.output_cap": "hesap/gerekçe: 60 fps aynı kalitede ~%80 fazla bit; bu slotun içeriğinde (fabrika turu, konuşan kafa) görsel kazanç yok. ÖLÇÜLMEDİ: gerçek kapakların fps dağılımı D2.",
			"video.audio_policy.bitrate_kbps": "tradehub_core/media/transcode.py:246 — `-c:a libopus` var, `-b:a` YOK (Ç10). 96 kbps stereo konuşma+müzik için EBU/Opus tavsiye aralığının içinde; SABİTLENİYOR.",
			"video.audio_policy.loudness": "EBU R128 standardına atıf — bu oturumda ÖLÇÜLMEDİ.",
			"video.autoplay": "tradehubfront/src/components/seller/StoreHeader.ts:301-309 — autoplay özniteliği YOK, playsinline ve muted VAR (:308). ambient kipinin değerleri K2 onayına bağlı.",
			"video.poster.selection_rule": "docs/standards/company-cover-video.md §6.9 — 'ilk anlamlı kare'nin uygulanabilir tanımı; ffmpeg thumbnail filtresi histogram uzaklığı.",
			"video.poster.output.max_bytes": "hesap: pasif mobil bütçe 150 KB = poster 120 KB + konteyner metadata 30 KB (video.mobile_data_budget).",
			"video.preview_clip.max_bytes": "hesap: 6 s × 500 kbps = 3 Mbit = 375 KB → 400 KB (409.600 bayt).",
			"video.hls.threshold_s": "hesap: bu slotun süre tavanı 60 s; eşik tam oraya konuldu ki 60 s'yi AŞAN bir slot açıldığında HLS ilk günden zorunlu olsun. Bugün 'hls' → tradehubfront/src + admin-panel/frontend/src içinde 0 eşleşme.",
			"video.mobile_data_budget.first_10s_max_kb": "hesap: 480p tier tavanı 1,0 Mbps × 10 s = 10 Mbit = 1.250 KB (1.280.000 bayt).",
			"video.mobile_data_budget.passive_max_kb": "hesap: poster 120 KB (122.880 bayt) + konteyner metadata 30 KB (30.720 bayt) = 150 KB (153.600 bayt). Otomatik oynatma olmadığı için pasif maliyet bundan fazlası değil (StoreHeader.ts:301-309).",
			"video.accessibility.vtt_required": "docs/standards/company-cover-video.md §8.1 — bugün '<track' / 'kind=\"captions\"' / '.vtt' → 0 eşleşme. Yürürlük K4, konuşma tespiti K5.",
			"video.accessibility.reduced_motion_behavior": "tradehubfront/src/style.css:757-765 — mevcut kural yalnız animation/transition süresini kısıyor, <video> oynatmasını ETKİLEMİYOR. WCAG 2.2 SC 2.2.2 yalnız otomatik hareketi hedefler.",
			"video.renditions[*].crf": "tradehub_core/media/transcode.py:245 — mevcut hattın CRF 32 değeri korunuyor; diğer tier'ların CRF'leri ondan TÜRETİLDİ (854 genişlikte 34, x264 karşılıkları 23/25). ÖLÇÜLMEDİ: hedef SSIM'e göre kalibre edilmedi.",
			"video.renditions[*].max_bytes": "hesap: her tier için süre × hedef ortalama bitrate (her satırın max_bytes_derivation alanında yazılı).",
			"video.renditions[*].mime": "Konteyner + kodlayıcı çiftinden türetildi. Ç1 nedeniyle bugün .mp4 adresinden WebM baytları servis ediliyor; bu MIME dizeleri ancak Ç1 çözüldükten sonra doğru olur.",
			"video.transcode.keyframe_interval_s": "tradehubfront/src/components/seller/StoreHeader.ts:261-266 — el yapımı seek çubuğu rastgele noktaya atlıyor; 2 s'den seyrek anahtar kare seek'i gözle görülür geciktirir.",
			"video.transcode.general_library_thresholds_kept": "tradehub_core/media/transcode.py:66-67, :75-76 — genel kütüphane eşikleri korunuyor.",
			"video.render_box": "tradehubfront/src/components/seller/StoreHeader.ts:46,128,129,203,297,304,378,381 — Tailwind ölçeğiyle (1rem=16px) KAYNAK KODDAN hesaplandı, tarayıcıda ÖLÇÜLMEDİ (D7).",
			"video.safe_area": "tradehubfront/src/components/seller/StoreHeader.ts:321,329,330,333-334 katman ölçüleri + video.render_box yükseklikleriyle yüzdeye çevrildi. En kötü durum 360 px viewport: alt %26 kuralının kaynağı.",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139 — 14 kodlu ret sözleşmesi; bu slotun kodları 'cover_video_' önekli (video.validation_codes).",
			"on_violation.retryable": "tradehub_core/media/upload_policy.py:97-100 — kullanıcının dosyasıyla ilgili hatalar tekrar denenmez. Tek istisna cover_video_transcode_failed (sunucu hatası, retryable=true).",
			"messages.tr": "docs/standards/company-cover-video.md §6.13 ve §7 karar tablosu; her metin ŞEMA kuralı gereği sebep + çözüm taşıyor.",
			"messages.en": "TR metinlerinden çevrildi; sayılar ve alan adları birebir korundu. ÖLÇÜLMEDİ: ru/ar yerelleri için karşılık YAZILMADI — platform 4 dil destekliyor (video.accessibility.languages.platform_locales), mesaj haritası bugün 2 dil taşıyor."
		},
		"known_conflicts": [
			{
				"id": "Ç1",
				"summary": ".mp4 adresine VP9/WebM baytları yazılıyor; MIME yalan",
				"evidence": [
					"tradehub_core/media/transcode.py:230",
					"tradehub_core/media/transcode.py:252"
				],
				"fixed_here": false,
				"decision": "Bu slotta yerinde takas YASAK (video.transcode.in_place_replace.allowed_for_this_slot = false); rendition'lar ayrı adreslerde yaşar ve MIME konteynere göre yazılır."
			},
			{
				"id": "Ç2",
				"summary": "factory_video_url hiçbir yere bağlanmıyor — panel yazıyor, hiçbir doctype tutmuyor",
				"evidence": [
					"admin-panel/frontend/src/views/seller/StorefrontEdit.vue:1014,1228",
					"tr_tradehub.api.v1.seller.update_storefront",
					"docs/reports/00-upload-slot-envanteri.md §5 ve §9-M1"
				],
				"fixed_here": false,
				"decision": "Yeni yükleme kabul etmez; mevcut değer Seller Gallery Image (category=overview, media_type=video, sort_order=0) satırına taşınır (Faz 3 göçü). bound_to'ya YAZILMADI — o alan henüz yok."
			},
			{
				"id": "Ç3",
				"summary": "Aynı yükleme sınırı için dört ayrı sayı: 200 MB / 100 MB / 10 MB / 10 MB",
				"evidence": [
					"tradehub_core/media/upload_policy.py:69",
					"tradehub_core/tradehub_core/doctype/seller_gallery_image/seller_gallery_image.json (video_url.description)",
					"admin-panel/frontend/src/views/seller/StorefrontEdit.vue:1007",
					"admin-panel/frontend/src/lib/media/compress.video.js:24"
				],
				"fixed_here": false,
				"decision": "Bu slotun tavanı 80 MB (accept.max_bytes = 83.886.080). DocType açıklaması ve panel istemcisi 80 MB'a YÜKSELTİLMELİ.",
				"details": [
					{
						"value_bytes": 209715200,
						"human": "200 MB",
						"where": "tradehub_core/media/upload_policy.py:69",
						"verdict": "küresel tavan — 80 MB bunun altında, çelişki yok"
					},
					{
						"value_bytes": 10485760,
						"human": "10 MB",
						"where": "seller_gallery_image.json → video_url.description",
						"verdict": "GEÇERSİZ — 60 s 1080p master 10 MB'a sığmaz (10 MB / 60 s = 1,33 Mbps)"
					},
					{
						"value_bytes": 10485760,
						"human": "10 MB",
						"where": "admin-panel/frontend/src/views/seller/StorefrontEdit.vue:1007",
						"verdict": "GEÇERSİZ — 80 MB'a yükseltilmeli"
					},
					{
						"value_bytes": 104857600,
						"human": "100 MB",
						"where": "admin-panel/frontend/src/lib/media/compress.video.js:24",
						"verdict": "ret değil, istemci sıkıştırma kapısı — dokunulmuyor"
					}
				]
			},
			{
				"id": "Ç4",
				"summary": "İstemci 2,0 Mbps vs sunucu 2,5 Mbps 'verimli' barı — aynı dosya giriş kapısına göre iki farklı sonuç alıyor",
				"evidence": [
					"admin-panel/frontend/src/lib/media/compress.video.js:29",
					"tradehub_core/media/transcode.py:67"
				],
				"fixed_here": false,
				"decision": "İki sayı 2.000.000'da birleşir (dar olan kazanır); video.bitrate_cap_kbps = 2000."
			},
			{
				"id": "Ç5",
				"summary": "Video ölçü/süre metadatası hiç yazılmıyor (PIL bağımlılığı) — bu politikadaki hiçbir süre/oran/çözünürlük kuralı bugün ZORLANAMAZ",
				"evidence": [
					"tradehub_core/media/metadata.py:180-186",
					"tradehub_core/media/pipeline.py:79-93"
				],
				"fixed_here": false,
				"decision": "ffprobe tabanlı bir okuma dalı eklenmeden bu slotun L3 katmanı çalışamaz. status='draft' olmasının birincil sebebi budur."
			},
			{
				"id": "Ç6",
				"summary": "Skeleton 5:3 (h-[300px]) vs gerçek 16:9 (281,25px) → 18,75 px CLS",
				"evidence": [
					"tradehubfront/src/components/seller/StoreHeader.ts:39",
					"tradehubfront/src/components/seller/StoreHeader.ts:297"
				],
				"fixed_here": false
			},
			{
				"id": "Ç7",
				"summary": "Ana oynatıcıda poster yedeği yok; #t=0.5 hilesi yalnız küçük resimde",
				"evidence": [
					"tradehubfront/src/components/seller/StoreHeader.ts:303",
					"tradehubfront/src/components/seller/StoreHeader.ts:402"
				],
				"fixed_here": false,
				"decision": "video.poster otomatik üretimi devreye girince legacy hilenin tek işlevi migrate edilmemiş satırlar olur."
			},
			{
				"id": "Ç8",
				"summary": "Ana kutu 16:9, küçük resim 4:3 — aynı poster %25 yatay kırpılıyor",
				"evidence": [
					"tradehubfront/src/components/seller/StoreHeader.ts:297",
					"tradehubfront/src/components/seller/StoreHeader.ts:381"
				],
				"fixed_here": false,
				"decision": "Kırpma kabul edildi ve GÜVENLİ ALANA yazıldı: video.safe_area.thumbnail_safe_width_pct = 75. Ayrıca profiles[thumb_192] ayrı bir 4:3 türev üretiyor."
			},
			{
				"id": "Ç9",
				"summary": "Ürün videosu modalinde sesli autoplay (muted yok) → tarayıcı bloklar",
				"evidence": [
					"tradehubfront/src/components/seller/CompanyProfile.ts:1002"
				],
				"fixed_here": false,
				"decision": "Bu slotun kapsamı DIŞINDA (product.video / seller.gallery_video), ama aynı bileşen ailesinde olduğu için kaydedildi."
			},
			{
				"id": "Ç10",
				"summary": "Opus bitrate sabitlenmemiş (-b:a yok) — ffmpeg sürümü değişince ses kalitesi sessizce değişir",
				"evidence": [
					"tradehub_core/media/transcode.py:246"
				],
				"fixed_here": false,
				"decision": "video.audio_policy.bitrate_kbps = 96 ile SABİTLENİYOR."
			},
			{
				"id": "Ç11",
				"summary": "WebM cue'ları başta değil (-cues_to_front yok) → mobilde ek RTT",
				"evidence": [
					"tradehub_core/media/transcode.py:235-248"
				],
				"fixed_here": false,
				"decision": "video.transcode.webm_cues_to_front.required = true."
			},
			{
				"id": "Ç12",
				"summary": "Kategori enum'u doctype ve _MEDIA_CATEGORIES'te iki kez yazılı",
				"evidence": [
					"tradehub_core/tradehub_core/doctype/seller_gallery_image/seller_gallery_image.json (category.options)",
					"tradehub_core/api/seller.py:760-765"
				],
				"fixed_here": false,
				"decision": "K6: tek kaynak doctype JSON'u olsun; bu fazda enum genişletilmiyor."
			}
		],
		"pending_admin_decisions": [],
		"production_verification_required": [
			{
				"id": "D1",
				"what": "Gerçek kapak videosu envanteri (kaç mağaza, kaç poster boş)",
				"how": "docs/standards/company-cover-video.md §11-D1 SQL",
				"blocks": "poster otomatik üretiminin öncelik sırası"
			},
			{
				"id": "D2",
				"what": "Gerçek süre/çözünürlük/bitrate dağılımı",
				"how": "docs/standards/company-cover-video.md §11-D2 ffprobe döngüsü",
				"blocks": "video.duration_max_s, video.bitrate_cap_kbps, video.frame_rate eşiklerinin kalibrasyonu"
			},
			{
				"id": "D3",
				"what": "Viewport × DPR dağılımı (K1 girdisi)",
				"how": "docs/standards/company-cover-video.md §11-D3 RUM sorgusu — ölçüm kancası bugün YOK",
				"blocks": "K1 (1080p tier)"
			},
			{
				"id": "D4",
				"what": "th_media_video_status dağılımı (hat sağlığı)",
				"how": "docs/standards/company-cover-video.md §11-D4 SQL",
				"blocks": "koşulsuz transcode kararının maliyeti"
			},
			{
				"id": "D5",
				"what": "Content-Type + Accept-Ranges + ilk 4 bayt (Ç1 kanıtı)",
				"how": "docs/standards/company-cover-video.md §11-D5 curl + xxd",
				"blocks": "Ç1 ve video.hls.byte_range_required"
			},
			{
				"id": "D6",
				"what": "ffmpeg/ffprobe yetenekleri (vp9, opus, x264, libwebp, cues_to_front, thumbnail, loudnorm)",
				"how": "docs/standards/company-cover-video.md §11-D6",
				"blocks": "video.transcode ve video.poster.auto_generate komutlarının çalışabilirliği"
			},
			{
				"id": "D7",
				"what": "Gerçek kutu ölçüleri — video.render_box.computed_sizes_css_px tarayıcıdan DOĞRULANMADI",
				"how": "docs/standards/company-cover-video.md §11-D7 DevTools snippet, 7 genişlikte",
				"blocks": "profiles[].width basamakları"
			},
			{
				"id": "D8",
				"what": "CLS + LCP elemanı (Ç6'nın büyüklüğü)",
				"how": "docs/standards/company-cover-video.md §11-D8 lighthouse",
				"blocks": "Ç6"
			},
			{
				"id": "D9",
				"what": "Pasif mobil bütçenin gerçek ölçümü (150 KB tavanı)",
				"how": "docs/standards/company-cover-video.md §11-D9 lighthouse network-requests",
				"blocks": "video.mobile_data_budget.passive_max_kb ve video.poster.output.max_bytes"
			}
		],
		"open_questions": [
			"ffmpeg/ffprobe üretim imajında var mı? `docker compose exec backend which ffmpeg ffprobe`. Yoksa transcode.py:101-106 her videoda log_error yazıp True dönüyor ve _run_transcode FileNotFoundError alıyor — yani hiçbir kapak videosu normalize edilmiyor ve poster hiç üretilmiyor (D6).",
			"Video için ölçü/süre metadatası ne zaman yazılacak? Ç5 çözülmeden bu politikadaki süre/oran/çözünürlük kapılarının hiçbiri zorlanamaz; slot yalnız kâğıt üzerinde geçerlidir.",
			"Kapak, ayrı bir alan mı olacak yoksa sıralamanın türevi mi kalacak? Bugün türev (api/seller.py:823-824). Satıcı 'bu videoyu kapak yap' diyemiyor; yalnız sort_order ile dolaylı söylüyor.",
			"factory_video_url göçü hangi görevde yapılacak? Ç2 — panel bir alana yazıyor, hiçbir doctype tutmuyor; veri kaybı mı yaşanıyor yoksa alan hep boş mu kaldı, üretim verisi olmadan bilinmiyor (D1).",
			"subtitles_vtt alanı ve KIND_CAPTION kind'ı hangi görevde açılacak? Bugün .vtt upload_policy.EXTENSIONS'ta yok (upload_policy.py:57-65) — altyazı yüklenmesi teknik olarak MÜMKÜN DEĞİL, yani altyazı zorunluluğu bugün uygulanamaz bir kural.",
			"Rendition'lar için KOTA KALEMİ — K7 karara bağlandı (2026-08-19: rendition'lar kotadan SAYILACAK), ama karar tek başına eksik: kapak başına 6 nesne (~19 MB tipik, ~37,5 MB en kötü) bugünkü kota değerlerini fiilen 6'ya böler. Kota değerlerinin yeniden boyutlandırılması ya da ayrı bir rendition kota kalemi AÇIK — docs/standards/kota.md güncellenmeli. docs/standards/company-cover-video.md §10.9-K7",
			"encoder_quality.webp basamakları (78/70/62) hangisinin 120 KB kapısını tuttuğu ÖLÇÜLMEDİ; poster kalite kalibrasyonu D1/D2 verisini bekliyor.",
			"messages.en dışındaki yereller (ru, ar) yazılmadı — platform 4 dil destekliyor. Mesaj haritası eksik kaldığı sürece o dillerdeki kullanıcı ret sebebini İngilizce görür."
		],
		"notes": [
			"KAYNAK GÖREV: T-022 · tarih 2026-08-17 · branch medya-motoru-faz0-faz2 · insan belgesi docs/standards/company-cover-video.md. Bu dosya o görevin çıktısıdır; T-022 kendi biçimini (kök anahtarlar _meta / identity / render_box / safe_area / modes / upload_constraints / transcode / renditions / rendition_policy / poster / preview_clip / playback_attributes / mobile_data_budget / adaptive_streaming / accessibility / validation_codes / known_conflicts / pending_admin_decisions / production_verification_required / unmeasured_disclaimer) kullanıyordu çünkü yazıldığı anda slot politikası şemasının video karşılığı yoktu.",
			"ŞEMA UYUMLANDIRMASI: zorunlu üst düzey alanlar (schema_version, slot_key, roles, accept, require, master, profiles, on_violation, messages, sources) dolduruldu ve bound_to eklendi; videoya özgü içerik şema v1.1.0'ın 'video' bloğuna taşındı. Eşleme: _meta → notes/status/slot_key; identity → video.identity + bound_to; render_box → video.render_box; safe_area → video.safe_area; modes → video.modes; upload_constraints → accept/require/video.resolution_*/video.frame_rate (+ Ç3 detayları known_conflicts'e); transcode → video.transcode; renditions → video.renditions; rendition_policy → video.rendition_policy; poster → video.poster + profiles[poster_1280, poster_854]; preview_clip → video.preview_clip; playback_attributes → video.playback_attributes + video.autoplay + video.audio_policy; mobile_data_budget → video.mobile_data_budget (birim bayt → KB, aritmetik derivation metinlerinde korundu); adaptive_streaming → video.hls; accessibility → video.accessibility; validation_codes → video.validation_codes (+ message_key eşlemesi eklendi); known_conflicts / pending_admin_decisions / production_verification_required → üst düzeyde aynı adlarla; unmeasured_disclaimer → bu notlar.",
			"SLOT ANAHTARI DEĞİŞTİ: T-022 taslağı 'seller.cover_video' yazıyordu, bu sürüm 'company.cover_video' yazıyor — kapak GÖRSELİ zaten 'company.cover_image'. Envanterdeki doctype biçimindeki karşılık `seller.gallery_video`'dur (00-upload-slot-envanteri.md §2). Üç adlandırma ailesinin farkı docs/standards/README.md 'Policy kapsam haritası' bölümünde yazılı.",
			"BUGÜN ZORLANMIYOR: enforced_today = false. Tek ve yapısal sebep — video için genişlik/yükseklik/süre metadatası hiç yazılmıyor: tradehub_core/media/metadata.py:180-186 → tradehub_core/media/pipeline.py:79-93 yalnız PIL kullanıyor, PIL video açmaz. ffprobe tabanlı bir okuma dalı eklenmeden bu dosyadaki hiçbir boyut/oran/süre kuralı zorlanamaz (Ç5).",
			"İKİNCİ YAPISAL ENGEL: slot kimliği sunucuya hiç geçmiyor — upload_policy.check() imzasında slot parametresi yok (tradehub_core/media/upload_policy.py:307-313, 00-upload-slot-envanteri.md §7-B B1). Bu politika bugün kod tarafından OKUNMUYOR.",
			"ÖLÇÜLMEDİ UYARISI: Docker kapalı; üretim veritabanına ve canlı siteye erişim YOK. Bu dosyadaki CSS ölçüleri kaynak koddan Tailwind ölçeğiyle HESAPLANDI, tarayıcıda ölçülmedi. Bitrate/bayt bütçeleri TÜRETİLDİ (her türetmenin aritmetiği yanında yazılı), sahada ölçülmedi. Kodlayıcı eşikleri ve yükleme tavanları dosya:satır ile OKUNDU.",
			"L3 KATMANI YOK: video.validation_codes adlandırma deseni upload_policy.Kod dataclass'ıyla uyumlu (upload_policy.py:98-120), ama L3 (slot semantiği) katmanı bu kod tabanında BUGÜN HİÇ YOK — T-001 §L3.",
			"profiles[] ve video.renditions[] AYRI ŞEYLER: profiles[] bu slotta POSTER ve küçük resim GÖRSELLERİNİ tanımlar (<picture> kaynağı); teslim edilen VİDEO türevleri video.renditions[] altındadır (<video><source> kaynağı). Şema v1.0.0 ikincisini ifade edemiyordu — docs/standards/README.md §4 E10 bu sürümde kapandı.",
			"YÖNETİCİ KARARLARI KAPANDI — 2026-08-19. pending_admin_decisions listesi BOŞALTILDI çünkü K1–K8'in sekizi de karara bağlandı (docs/standards/company-cover-video.md §10.9 + 'VARSAYILANDA ONAYLANAN KARARLAR'). Sonuçlar: K1 1080p tier = EKLENMESİN (varsayılanla aynı; sayısal tetik AÇIK KALIYOR — §11-D3 tablet-DPR2 payı > %15 çıkarsa karar yeniden açılır). K2 ambient = AÇILDI, yalnız doğrulanmış satıcılara (öneriyle aynı; bkz. video.modes.ambient.requires_admin_approval). K3 kapak videosu = OPSİYONEL KALSIN (varsayılanla aynı; require.min_count = 0). K4 altyazı yürürlüğü = YALNIZ YENİ YÜKLEMELER (öneri 'mevcuda 90 gün geçiş' idi; K8 kararı mevcuda dokunmadığı için bu ayrım kapandı, ikisi artık tutarlı). K5 konuşma tespiti = SATICI BEYANI + rastgele denetim (varsayılanla aynı). K6 kategori enum'u = GENİŞLETİLMESİN, 4 kategori sabit; enum'un tek kaynağı doctype JSON'u olmalı (Ç12). K7 rendition'lar kotadan sayılsın mı = SAYILSIN — ÖNERİDEN AYRILAN KARAR (bkz. ayrı not). K8 mevcut içerik için geçiş penceresi = YENİ YÜKLEMELERE HEMEN, MEVCUT KAPAKLARA DOKUNULMAZ (seçenek A). K8 bu blokta hiç listelenmemişti (2026-08-18'de doğdu); kaydı buraya düşüyor.",
			"K7 — ÖNERİDEN AYRILAN KARAR VE ÖLÇÜLEBİLİR BEDELİ (2026-08-19). Bu politikanın önerisi 'rendition'lar File kaydı AÇMASIN, yalnız master kotadan sayılsın' idi (presets.py:33-35 ARCHIVE_DIRNAME deseni). KARAR BUNUN TERSİ: rendition'lar da satıcı medya kotasından SAYILACAK. Bedeli: entitlement.checks.check_media_storage_quota bugün her File kaydını sayıyor ve bu slot kapak başına 6 NESNE üretiyor (tipik ~19 MB, en kötü ~37,5 MB — §6.5); kota değerleri değişmeden kalırsa satıcılar kotalarını yaklaşık 6 KAT hızlı doldurur. BAĞLI GÖREV — bu karar tek başına EKSİKTİR: kota değerleri yeniden boyutlandırılmalı ya da rendition'lar için ayrı bir kota kalemi tanımlanmalı; docs/standards/kota.md bu karara göre güncellenmeli. docs/standards/company-cover-video.md §10.9-K7",
			"STATUS = DRAFT KALDI (2026-08-19, T-029). K1–K8'in sekizi de kapandı ve encoder_quality null YOK; buna rağmen 'active' YAPILMADI. Engeller ÖLÇÜMDÜR, karar değil: open_questions 8 maddeden 7'si duruyor ve hiçbiri yönetici kararına bağlı değil — ffmpeg/ffprobe imajda var mı (§11-D6, yoksa hiçbir kapak normalize edilmiyor), video ölçü/süre metadatası hiç yazılmıyor (Ç5 — bu politikadaki süre/oran/çözünürlük kapılarının HİÇBİRİ zorlanamaz), kapak ayrı alan mı sıralamanın türevi mi, factory_video_url göçü (Ç2), subtitles_vtt alanı ve KIND_CAPTION (bugün .vtt upload_policy.EXTENSIONS'ta yok → altyazı zorunluluğu uygulanamaz bir kural), poster encoder_quality.webp basamaklarının (78/70/62) kalibrasyonu ÖLÇÜLMEDİ, messages.ru / messages.ar yazılmadı. docs/reports/16-t029-politika-aktivasyonu.md"
		]
	},
	"document.attachment": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.0.0",
		"status": "draft",
		"slot_key": "document.attachment",
		"title": "Belge / sertifika eki (KYB, KYC, sertifika, denetim, dekont)",
		"description": "Kimlik ve yetki belgeleri, sertifikalar, denetim raporları, dekontlar. BU SLOT BÜYÜK ÖLÇÜDE UYGULANMIŞ: tradehub_core/api/v1/kyb.py:411-501 kod tabanının en sıkı yükleme kuralını zaten çalıştırıyor (uzantı allowlist + magic-byte + uzantı/içerik eşleşmesi + 10 MB + private + doğru attach hedefi + yetki kapısı + rate limit). Bu politika o kuralı yeniden tasarlamaz; standarda taşır ve aynı kuralı ALMAYAN kardeş slotları (KYC, sertifika, denetim, sevkiyat, DPA, dekont) işaretler. Diğer slotlardan farkı: bu bir GÖSTERİM değil OKUNABİLİRLİK slotudur — piksel gereksinimi render kutusundan değil belge okunabilirliğinden türetilir.",
		"roles": [
			"seller",
			"buyer",
			"admin"
		],
		"bound_to": [
			{
				"doctype": "KYB Verification",
				"field": "identity_document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyb.identity_document` — L0+L1; presets.py:45 EXCLUDED_DOCTYPES + presets.py:73 EXCLUDED_MEDIA_FIELDS"
			},
			{
				"doctype": "KYB Verification",
				"field": "imza_sirkuleri",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyb.imza_sirkuleri` — L0+L1; tradehub_core/media/presets.py:70-76 EXCLUDED_MEDIA_FIELDS'ta YOK (§7-B B5)"
			},
			{
				"doctype": "KYB Verification",
				"field": "ticaret_sicil_gazetesi",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyb.ticaret_sicil` — L0+L1; EXCLUDED_MEDIA_FIELDS'ta YOK"
			},
			{
				"doctype": "KYB Verification",
				"field": "faaliyet_belgesi",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyb.faaliyet_belgesi` — L0+L1; EXCLUDED_MEDIA_FIELDS'ta YOK"
			},
			{
				"doctype": "KYB Verification",
				"field": "vergi_levhasi",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyb.vergi_levhasi` — L0+L1; EXCLUDED_MEDIA_FIELDS'ta YOK"
			},
			{
				"doctype": "KYB Verification",
				"field": "bank_account_document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyb.bank_account` — L0+L1; tradehub_core/media/presets.py:73 EXCLUDED_MEDIA_FIELDS'ta VAR"
			},
			{
				"doctype": "KYC Verification",
				"field": "identity_document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `kyc.identity_document` — L1 YOK; tradehubfront/src/components/kyc/KycLayout.ts:376 doğrudan /api/method/upload_file çağırıyor, magic-byte kontrolü yok. `compress: false` (:381) BİLİNÇLİ, OCR okunabilirliği için."
			},
			{
				"doctype": "Seller Application",
				"field": "identity_document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller_application.identity` — L1 YOK; tradehub_core/media/presets.py:56-64 notu: canlıda 144 dosyada attached_to_doctype BOŞ"
			},
			{
				"doctype": "Seller Certification",
				"field": "document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller_certification.document` — L1 YOK; presets.py:56-64: canlıda 2 dosyada attached_to_doctype BOŞ"
			},
			{
				"doctype": "Seller Verification",
				"field": "document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `seller_verification.document` — L1 YOK; presets.py:48,75 EXCLUDED"
			},
			{
				"doctype": "Shipment Document",
				"field": "file",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `shipment.document` — tradehub_core/media/presets.py:44-53 EXCLUDED_DOCTYPES'ta YOK → optimizasyon hattına GİRER"
			},
			{
				"doctype": "Data Processing Agreement",
				"field": "document",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `gdpr.dpa_document` — EXCLUDED_DOCTYPES'ta YOK (§7-B B5)"
			},
			{
				"doctype": "Order",
				"field": "receipt_url",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `order.receipt` — istemcide accept var, BOYUT KONTROLÜ YOK (tradehubfront/src/components/orders/OrdersPageLayout.ts:1548); presets.py:50 EXCLUDED_DOCTYPES"
			},
			{
				"doctype": "Payment Transaction",
				"field": "receipt_url",
				"fieldtype": "Attach",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `payment.receipt` — presets.py:51 EXCLUDED_DOCTYPES"
			}
		],
		"accept": {
			"mime": [
				"application/pdf",
				"image/jpeg",
				"image/png",
				"image/webp",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			],
			"extensions": [
				".pdf",
				".jpg",
				".jpeg",
				".png",
				".webp",
				".docx"
			],
			"max_bytes": 10485760,
			"max_megapixels_hard": 80,
			"allow_animated": false
		},
		"require": {
			"min_short_edge": 1654,
			"min_area": 3868706,
			"allowed_ratios": [
				"210:297"
			],
			"ratio_tolerance": 1,
			"max_count": 1
		},
		"master": {
			"max_long_edge": 5000,
			"min_long_edge": 2339,
			"max_megapixels": 25,
			"dpi_out": 200,
			"colorspace": "preserve",
			"format": "preserve",
			"orientation": "apply_exif",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"target_ssim_per_class": {
				"text": 0.995,
				"graphic": 0.99
			},
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "doc_thumb_512",
				"width": 512,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 85
				},
				"fit": "cover",
				"target_ratio": "3:2",
				"serves": [
					"SlotDropzone belge kartı 160px yükseklik (mobil 128px)",
					"panel önizleme kartı 240×160",
					"panel alt tablo satırı 40×40"
				],
				"derived_from": "hesap: max(SlotDropzone kart yüksekliği 160 @3x = 480; panel önizlemesi 240 @2x = 480; tablo satırı 40 @3x = 120) = 480 → üst basamak 512. Hedef oran 3:2, panel önizleme kutusunun oranı (240/160). Kutular: tradehubfront/src/lib/upload-ui/facades/SlotDropzone.ts:95 (h-40, max-sm:h-32), admin-panel/frontend/src/views/doctype/DocTypeFormView.vue:512 (w-60 h-40), :862 (w-10 h-10)",
				"max_overshoot": 1.07
			}
		],
		"content_rules": [
			{
				"rule": "extension_in_allowlist",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "bicim_desteklenmiyor",
				"source": "tradehub_core/api/v1/kyb.py:19 KYB_ALLOWED_EXTENSIONS + kontrol :438-443. MEVCUT — yalnız KYB ucunda; KYC/sertifika/denetim/dekont yollarında YOK."
			},
			{
				"rule": "content_length_bytes",
				"threshold": 12,
				"comparator": "lt",
				"action": "reject",
				"message_key": "icerik_cok_kisa",
				"source": "tradehub_core/api/v1/kyb.py:27-28 — `if len(content) < 12: frappe.throw('Geçersiz dosya: içerik çok kısa.')`. MEVCUT."
			},
			{
				"rule": "magic_byte_recognized",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "icerik_taninmiyor",
				"source": "tradehub_core/api/v1/kyb.py:23-58 _detect_format — PDF %PDF-, JPEG FFD8FF, PNG 89504E47, WEBP RIFF..WEBP, DOCX PK\\x03\\x04 + [Content_Types].xml + word/ klasörü. MEVCUT — yalnız KYB ucunda."
			},
			{
				"rule": "magic_byte_matches_extension",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "icerik_uzantiyla_uyusmuyor",
				"source": "tradehub_core/api/v1/kyb.py:460-478 expected_match haritası — .pdf yüklenip içerik PNG ise RET. MEVCUT (KYB). DİKKAT: L0'da aynı uyuşmazlık yalnız UYARI (tradehub_core/media/upload_policy.py:366-369); belge slotunda SERT ret olması bilinçli fark."
			},
			{
				"rule": "docx_is_real_docx",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "docx_gecersiz",
				"source": "tradehub_core/api/v1/kyb.py:48-53 — ZIP magic tek başına yetmiyor; içeride [Content_Types].xml VE word/ klasörü aranıyor, yoksa .zip'i .docx uzantılı yüklemek engellenir. MEVCUT."
			},
			{
				"rule": "is_private",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "gizli_olmali",
				"source": "tradehub_core/api/v1/kyb.py docstring :423 — `is_private=1 File doc oluşturulur`. MEVCUT (KYB); KYC/Seller Application/Seller Certification yolları Frappe upload_file kullanıyor ve is_private ÇAĞIRANA bağlı (docs/reports/00-upload-slot-envanteri.md §7-B B8)."
			},
			{
				"rule": "attach_target_set",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "kayda_baglanmadi",
				"source": "tradehub_core/media/presets.py:56-64 — canlı DB'de doğrulanmış: Seller Application.identity_document 144 dosya, Seller Certification.document 2 dosya, ikisinde de attached_to_doctype BOŞ. Toplam 146 kimlik/PII belgesi EXCLUDED_DOCTYPES kontrolünden sessizce kaçıyor. KYB ucu bunu doğru yapıyor (kyb.py:479-501, File'ı KYB Verification'a attach ediyor)."
			},
			{
				"rule": "long_edge",
				"threshold": 2339,
				"comparator": "lt",
				"action": "warn",
				"message_key": "cozunurluk_dusuk",
				"source": "hesap: A4 = 210 × 297 mm. 297 mm = 297/25,4 = 11,693 inç. 200 dpi × 11,693 = 2.338,6 → 2.339 piksel uzun kenar. 200 dpi bir SEÇİMDİR (yazılı belge OCR'ı için yaygın alt eşik), ölçüm değil — open_questions'ta doğrulama komutu var."
			},
			{
				"rule": "optimizer_excluded",
				"threshold": false,
				"comparator": "eq",
				"action": "review",
				"message_key": "optimizasyon_dpi_dusuruyor",
				"source": "hesap + kod: tradehub_core/media/presets.py:15 `balanced` max_dim = 2000 ve tradehub_core/media/pipeline.py:117 `im.thumbnail((max_dim, max_dim))` uzun kenarı 2000'e indiriyor. 2000 px'lik bir A4 dikey tarama = 2000 / 11,693 inç = 171 dpi. Yani 300 dpi'lik bir tarama 171 dpi'ye düşer. Bu tuzak presets.py:44-53 EXCLUDED_DOCTYPES sayesinde 8 doctype için kapalı ama `Shipment Document` ve `Data Processing Agreement` o listede YOK."
			},
			{
				"rule": "kvkk_field_map_complete",
				"threshold": false,
				"comparator": "eq",
				"action": "review",
				"message_key": "kvkk_haritasi_eksik",
				"source": "tradehub_core/media/presets.py:70-76 EXCLUDED_MEDIA_FIELDS KYB'nin yalnız 2 alanını sayıyor (identity_document, bank_account_document); imza_sirkuleri, ticaret_sicil_gazetesi, faaliyet_belgesi, vergi_levhasi YOK. Kodun kendi bakım notu (presets.py:66-69) bu riski zaten yazıyor."
			},
			{
				"rule": "client_compression_disabled",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "sikistirma_kapatilmali",
				"source": "tradehubfront/src/components/kyc/KycLayout.ts:381 `compress: false` ve tradehubfront/src/alpine/kyb.ts:303-306 (autoCustomUploader ile sıkıştırmayı atlıyor). MEVCUT ve BİLİNÇLİ — OCR okunabilirliği. Belge slotunda istemci sıkıştırması AÇIK kalırsa belge okunamaz hâle gelir."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "warn",
			"master": "warn",
			"content_rules": "reject",
			"error_code_prefix": "upload",
			"retryable": false
		},
		"messages": {
			"tr": {
				"bicim_desteklenmiyor": "Bu dosya türü belge olarak kabul edilmiyor ({bicim}). Yalnızca PDF, JPG, PNG, WEBP ve DOCX yükleyebilirsiniz ({izinli_bicimler}).",
				"cok_buyuk": "Belge {mb} MB; sınır {max_mb} MB. Tarayıcınızı 200 dpi ve gri tonlamaya alırsanız dosya küçülür ve okunabilirlik korunur.",
				"icerik_cok_kisa": "Dosya içeriği okunamayacak kadar kısa; yükleme sırasında bozulmuş olabilir. Belgeyi yeniden tarayıp tekrar yükleyin.",
				"icerik_taninmiyor": "Dosyanın içeriği tanınan bir belge biçimi değil. Belgeyi PDF veya JPG olarak yeniden kaydedip yükleyin.",
				"icerik_uzantiyla_uyusmuyor": "Dosyanın içeriği uzantısıyla uyuşmuyor (ör. .pdf uzantılı ama içerik görsel). Belgeyi doğru biçimde yeniden kaydedip yükleyin.",
				"docx_gecersiz": "Yüklenen dosya geçerli bir Word belgesi değil; .zip dosyasının uzantısı değiştirilmiş olabilir. Word'de açıp .docx olarak kaydedin.",
				"gizli_olmali": "Belgeler yalnızca gizli (private) olarak saklanabilir. Bu yükleme yolu belgeyi herkese açık kaydediyor; teknik ekibin bu ucu düzeltmesi gerekiyor.",
				"kayda_baglanmadi": "Belge bir doğrulama kaydına bağlanamadı; bu hâliyle gizlilik korumasının dışında kalır. Formu baştan doldurup belgeyi yeniden yükleyin.",
				"cozunurluk_dusuk": "Belgenin çözünürlüğü düşük; yazılar makine tarafından okunamayabilir. A4 bir belge için en az 1654 × 2339 piksel (200 dpi) tarama önerilir.",
				"optimizasyon_dpi_dusuruyor": "Bu belge türü otomatik görsel sıkıştırma kapsamında; çözünürlüğü düşürülüp okunamaz hâle gelebilir. Teknik ekibin bu doctype'ı muafiyet listesine eklemesi gerekiyor.",
				"kvkk_haritasi_eksik": "Bu belge alanı gizlilik muafiyet haritasında kayıtlı değil; herkese açık hâle gelme riski taşıyor. Teknik ekibin muafiyet listesini tamamlaması gerekiyor.",
				"sikistirma_kapatilmali": "Belge yüklemede tarayıcı sıkıştırması açık kalmış; yazılar bozulabilir. Belgeyi yeniden yükleyin, sıkıştırma bu alanda kapalı olmalıdır."
			}
		},
		"sources": {
			"accept.mime": "tradehub_core/api/v1/kyb.py:19 KYB_ALLOWED_EXTENSIONS uzantı listesinin MIME karşılığı; magic-byte tespiti aynı 6 biçimi tanıyor (kyb.py:23-58). DEĞİŞTİRİLMEDİ, standarda taşındı.",
			"accept.extensions": "tradehub_core/api/v1/kyb.py:19 — ('.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx')",
			"accept.max_bytes": "tradehub_core/api/v1/kyb.py:20 KYB_MAX_BYTES = 10 * 1024 * 1024. İstemci de aynı: tradehubfront/src/alpine/kyb.ts:295, tradehubfront/src/components/kyc/KycLayout.ts:370, admin-panel/frontend/src/views/doctype/DocTypeFormView.vue:2229 (UPLOAD_MAX_BYTES). L0 belge tavanı 50 MB (tradehub_core/media/upload_policy.py:73) — yani L1, L0'dan 5 kat sıkı.",
			"accept.max_megapixels_hard": "tradehub_core/media/pipeline/policy/slots/product-image.json ile aynı (80 MP) — decompression-bomb koruması slot bazlı değişmemeli. Kod tabanında karşılığı YOK.",
			"accept.allow_animated": "Belge animasyonlu olamaz; tradehub_core/media/pipeline.py:106 zaten animasyonluyu işlemiyor.",
			"require.min_short_edge": "hesap: A4 = 210 × 297 mm. 210 mm = 210/25,4 = 8,268 inç. 200 dpi × 8,268 = 1.653,5 → 1.654 piksel. Bu, DİKEY taranmış bir A4'ün kısa kenarıdır.",
			"require.min_area": "hesap: 1.654 × 2.339 = 3.868.706 piksel (200 dpi A4).",
			"require.allowed_ratios": "hesap: A4 = 210:297. Belge oranı belgeye göre değişiyor (A4 dikey/yatay, kimlik kartı ISO/IEC 7810 ID-1 = 85,6 × 54 mm, vergi levhası) — bu yüzden ratio_tolerance 1 ile oran SERBEST bırakıldı; 210:297 yalnız şemanın zorunlu kıldığı temsili değerdir.",
			"require.ratio_tolerance": "1 = oran serbest. Şemanın kendi talimatı: 'oran serbest istenirse allowed_ratios: [\"0:0\"] DEĞİL, ratio_tolerance: 1 kullanılır' (tradehub_core/media/pipeline/policy/schema/slot-policy.schema.json, require.ratio_tolerance açıklaması).",
			"require.max_count": "docs/reports/00-upload-slot-envanteri.md §2 — her belge alanı tekil Attach; KYB'de 6 ayrı alan = 6 belge.",
			"master.max_long_edge": "5000 SEÇİMİ: bu slotta küçültme İSTENMİYOR (okunabilirlik). Şema max_long_edge'i zorunlu kıldığı için pratikte devre dışı bırakan bir değer yazıldı; 5000 px = 300 dpi'de 42 cm'lik bir kenar, A3 tarama dahil her belgeyi kapsar. Gerçek üst sınırı accept.max_bytes (10 MB) koyuyor.",
			"master.min_long_edge": "hesap: 200 dpi A4 uzun kenarı = 297/25,4 × 200 = 2.338,6 → 2.339.",
			"master.max_megapixels": "hesap: 5.000 × 5.000 / 1e6 = 25. Şema invaryantı: 5000² / 1e6 = 25 ≥ 25 (sınırda).",
			"master.dpi_out": "hesap: require.min_short_edge ve master.min_long_edge 200 dpi A4'ten türetildi; çıktı metadata'sı da 200 yazılıyor ki belge sonradan 'düşük çözünürlüklü' sanılmasın. NOT: diğer slotlarda bu değer 72 (ekran medyası) — belge slotunda bilinçli farklı.",
			"master.colorspace": "preserve — tradehub_core/media/pipeline.py:114-116 mevcut davranışı. Belgede renk dönüşümü istenmez: mühür/kaşe renkleri ve ıslak imza tonu delil değeri taşır.",
			"master.format": "preserve — tradehub_core/media/pipeline.py:8-9,132 format-koruma dalı. PDF hiç işlenmiyor (engine.py:98-100 `if fmt not in SUPPORTED_FORMATS: return unsupported_format`), yani dpi tuzağı yalnız GÖRSEL olarak taranmış belgeler için geçerli.",
			"master.strip_metadata.exif": "true — taranmış belgede EXIF gereksiz. UYARI: silmeden önce yön bilgisi piksellere uygulanmalı (engine.py:116 ImageOps.exif_transpose); aksi hâlde yan yatmış bir vergi levhası okunamaz.",
			"master.strip_metadata.gps": "true — KVKK: telefonla çekilmiş kimlik/vergi levhası fotoğrafı kullanıcının konumunu sızdırır.",
			"master.strip_metadata.icc": "false — engine.py:11-13 ve :114-116 ICC'yi bilinçli koruyor; mühür/kaşe renk tonu için de gerekli.",
			"quality.target_ssim_per_class.text": "0,995 SEÇİMİ: bu slotun tamamı metin içerikli. tradehub_core/media/pipeline/policy/slots/product-image.json'da 'text' sınıfı 0,99; belge slotunda daha yüksek tutuldu çünkü ret/kabul kararı OCR'a bağlı. ÖLÇÜLMEDİ: hangi SSIM değerinde OCR başarı oranının düştüğü ölçülmeli.",
			"profiles[0].width": "hesap: max(SlotDropzone kart yüksekliği 160 @3x = 480; panel önizlemesi 240 @2x = 480; tablo 40 @3x = 120) = 480 → 512",
			"profiles[0].encoder_quality.webp": "85 SEÇİMİ: küçük resim de metin içeriyor (belge başlığı okunabilmeli). tradehub_core/media/presets.py:14-16 aralığının (82-90) ortası. ÖLÇÜLMEDİ.",
			"on_violation.content_rules": "reject — diğer slotlarda 'warn' seçilirken burada 'reject': tradehub_core/api/v1/kyb.py bugün de bu kuralların çoğunda frappe.throw ile sert ret veriyor (kyb.py:440-443, :453-454, :472-476). Mevcut davranışın kaydı.",
			"on_violation.require": "warn — GEOMETRİDE ret ETMİYORUZ. Gerekçe: telefonla çekilmiş düşük çözünürlüklü bir vergi levhası bugün kabul ediliyor ve KYB süreci onun üzerinden yürüyor; sert ret çalışan akışı kırar. Uyarı + yeniden çekme çağrısı doğru davranış.",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139. NOT: kyb.py bu kodlu sözleşmeyi KULLANMIYOR, düz frappe.ValidationError metni fırlatıyor — istemci koda değil metne bakmak zorunda.",
			"on_violation.retryable": "tradehub_core/media/upload_policy.py:97-100 — kullanıcının dosyasıyla ilgili hatalar tekrar denenmez."
		},
		"open_questions": [
			"`Shipment Document` ve `Data Processing Agreement` dosyaları optimizasyondan geçmiş mi (dpi kaybı oluşmuş mu)? Doğrulama: `docker compose exec backend bench --site istoc.localhost console` içinde: frappe.db.sql(\"select f.file_url, f.th_optimized_at from tabFile f where f.attached_to_doctype in ('Shipment Document','Data Processing Agreement') and f.th_optimized_at is not null\") — dönen her satır küçültülmüş bir hassas belgedir.",
			"attached_to_doctype BOŞ hassas belge sayısı hâlâ 146 mı? Doğrulama: frappe.db.sql(\"select count(*) from tabFile where (attached_to_doctype is null or attached_to_doctype='') and is_folder=0\") + presets.py:70-76 haritası üzerinden ters referans taraması.",
			"Taranmış belgelerin gerçek piksel/dpi dağılımı ne? Doğrulama: docs/reports/00-upload-slot-envanteri.md §9-M5 betiği, attached_to_doctype IN ('KYB Verification','KYC Verification','Seller Certification','Seller Verification') filtresiyle; ayrıca PIL `im.info.get('dpi')`.",
			"200 dpi eşiği DOĞRU MU? Bu bir seçim, ölçüm değil. Doğrulama: mevcut belgelerden 30 örnek alıp `tesseract <dosya> - --dpi <deger>` ile 150/200/300 dpi'de OCR karakter doğruluğu karşılaştırılmalı.",
			"KYC ucu neden L1 almıyor? tradehubfront/src/components/kyc/KycLayout.ts:376 Frappe upload_file kullanıyor; kyb.upload_kyb_document ile aynı korumaya (magic-byte + uzantı allowlist) taşınabilir mi? Ürün/güvenlik kararı.",
			"PDF içeriği taranıyor mu? engine.py PDF'e dokunmuyor ama upload_policy.py:187-224 ilk 512 baytta <html/<svg/<script arıyor. PDF içindeki JavaScript (/JS, /OpenAction) taranMIYOR — güvenlik açısından ölçülmesi gereken ayrı bir konu."
		],
		"notes": [
			"REFERANS UYGULAMA: tradehub_core/api/v1/kyb.py:411-501. Uyguladıkları sırayla: yetki kapısı require_seller_capability('kyb.submit') (:427-429), Guest reddi (:431-433), rate limit 20/300 sn (:412), uzantı allowlist (:438-443), base64 çözme (:448-451), 10 MB tavanı (:453-454), magic-byte tespiti (:23-58 üzerinden :458), uzantı↔içerik eşleşmesi (:460-478), is_private=1, KYB Verification'a attach (:479-501).",
			"DOĞRU ATTACH HEDEFİ KARARI ve gerekçesi kyb.py:479-495 yorumunda yazılı: File User'a attach edilirse Frappe'nin private-file izin kontrolünde satıcı KENDİ belgesine 403 alıyor; KYB Verification'a attach edilince if_owner=1 sayesinde erişebiliyor. Bu, tekrar keşfedilmemesi gereken bir bulgu.",
			"L1 ALMAYAN KARDEŞ SLOTLAR (aynı sıkılıkta korunmuyor): KYC Verification.identity_document, Seller Application.identity_document, Seller Certification.document, Seller Verification.document, Shipment Document.file, Data Processing Agreement.document, Order.receipt_url. Bunların tamamı yalnız L0'a güveniyor: yasak uzantı listesi + boyut tavanı + ilk 512 baytta tehlikeli içerik taraması (tradehub_core/utils/security.py:68,90,96 → tradehub_core/media/upload_policy.py:307).",
			"İSTEMCİ SIKIŞTIRMASININ BİLİNÇLİ KAPATILMASI bu slotun en önemli çözülmüş kararı: tradehubfront/src/components/kyc/KycLayout.ts:381 (`compress: false`) ve tradehubfront/src/alpine/kyb.ts:303-306. Sıkıştırma açılırsa belge okunamaz hâle gelir; hiçbir 'optimizasyon' önerisi bunu geri açmamalı.",
			"BELGE VİTRİNDE HİÇ GÖSTERİLMİYOR: ürün sayfasında sertifika BELGESİ değil yalnız rozet basılıyor (tradehubfront/src/components/product/ProductCertificates.ts:30 — satır 52 px yükseklik, ikon 32×32). Yani belge dosyası hiçbir yüksek trafikli yüzeye inmiyor; doc_thumb_512 profili yalnız yükleme/yönetim ekranları için.",
			"ZATEN ÇÖZÜLMÜŞ — yeniden tasarlanmayacak: (1) kyb.py'nin tüm kural zinciri; (2) tradehub_core/media/presets.py:44-53 EXCLUDED_DOCTYPES (8 doctype) hassas belgeleri optimizasyondan muaf tutuyor; (3) presets.py:70-76 EXCLUDED_MEDIA_FIELDS ters referans haritası ve presets.py:56-69'daki bakım notu; (4) RFQ ekinde doğru bağlama deseni (tradehubfront/src/components/rfq/uploader.ts:30-41 — is_private=1 + doctype=RFQ).",
			"Bu politika dosyası bugün kod tarafından OKUNMUYOR (tradehub_core/media/upload_policy.py:307-313). Ama kural 5 gereği: kyb.py'deki kısım ZATEN ÇALIŞIYOR — politika onu tekrarlıyor, değiştirmiyor."
		]
	},
	"product.image": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.0.0",
		"status": "draft",
		"slot_key": "product.image",
		"title": "Ürün görseli",
		"description": "Bir ilanın ana görseli, galeri görselleri ve varyant görselleri. Sistemdeki en yüksek trafikli ve en yüksek piksel talebi olan slot: 20 render noktasının 20'si de bu slotu basıyor (docs/reports/03-render-envanteri.md §2).",
		"roles": [
			"seller",
			"admin"
		],
		"bound_to": [
			{
				"doctype": "Listing",
				"field": "primary_image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `listing.primary_image`; media/usage.py:33 LIVE_SOURCES"
			},
			{
				"doctype": "Listing Image",
				"field": "image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `listing.gallery_image` (reqd)"
			},
			{
				"doctype": "Listing Variant Item",
				"field": "variant_image",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `listing.variant_image`; media/usage.py:36"
			},
			{
				"doctype": "Listing Variant Item",
				"field": "variant_gallery",
				"fieldtype": "Long Text",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 — JSON dizi içinde URL listesi (bulk_import/persister.py:614-640); Attach taramasıyla BULUNAMAZ"
			}
		],
		"accept": {
			"mime": [
				"image/jpeg",
				"image/png",
				"image/webp",
				"image/tiff"
			],
			"extensions": [
				".jpg",
				".jpeg",
				".png",
				".webp",
				".tif",
				".tiff"
			],
			"max_bytes": 26214400,
			"max_megapixels_hard": 80,
			"allow_animated": false
		},
		"require": {
			"min_short_edge": 1000,
			"min_area": 1000000,
			"allowed_ratios": [
				"1:1",
				"4:5",
				"3:4"
			],
			"ratio_tolerance": 0.02,
			"max_count": 12
		},
		"master": {
			"max_long_edge": 2400,
			"min_long_edge": 2000,
			"max_megapixels": 5.76,
			"dpi_out": 72,
			"colorspace": "srgb",
			"format": "webp",
			"orientation": "apply_exif",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"target_ssim_per_class": {
				"photo": 0.96,
				"graphic": 0.98,
				"text": 0.99,
				"fine_detail": 0.975
			},
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "w96",
				"width": 96,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 80
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "#FFFFFF",
				"serves": [
					"R5 lightbox karosu",
					"R14 sepet SKU satırı"
				],
				"derived_from": "hesap: max(lightbox karosu 52px @1x = 52; sepet SKU 40px @2x = 80) = 80 → üst basamak 96. Kutular: docs/reports/03-render-envanteri.md §3.8 (ProductImageGallery.ts:339; SkuRow.ts:36)",
				"max_overshoot": 1.85
			},
			{
				"name": "w192",
				"width": 192,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 80
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "#FFFFFF",
				"serves": [
					"R3 PD galeri karosu",
					"R7 PD mobil karo şeridi",
					"R13 sepet ürün başlığı",
					"R15 checkout özet şeridi",
					"R16 sepet çekmecesi"
				],
				"derived_from": "hesap: max(checkout özet 64px @3x = 192; mobil karo 80px @2x = 160; PD karosu 70px @2x = 140; lightbox karosu 52px @2x = 104) = 192. Kutular: docs/reports/03-render-envanteri.md §3.8 (CartSummary.ts:20; MobileLayout.ts:198; ProductImageGallery.ts:86,103)",
				"max_overshoot": 1.85
			},
			{
				"name": "w384",
				"width": 384,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "#FFFFFF",
				"serves": [
					"R1 ListingCard @1x",
					"R7 mobil karo @3x",
					"R3 PD karosu @3x",
					"R20 buyer dashboard mini kart @2x"
				],
				"derived_from": "hesap: max(kart @1x 1920 viewport = 343 (§3.1/§3.4); mini kart 169.5px @2x = 340 (§3.8); mobil karo 80px @3x = 240) = 343 → üst basamak 384. Kaynak: docs/reports/03-render-envanteri.md §3.1 satır 1920, §3.4 satır 1920, §3.8",
				"max_overshoot": 1.83
			},
			{
				"name": "w640",
				"width": 640,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "#FFFFFF",
				"serves": [
					"R1/R8/R9/R10/R11/R17/R18 kart ızgaraları @2x",
					"R2 PD masaüstü ana görsel @1x"
				],
				"derived_from": "hesap: max(kart @2x 640 viewport = 592 (§3.1); PD masaüstü ana görsel ≥1536 viewport @1x = 502 (§3.5)) = 592 → üst basamak 640. Kaynak: docs/reports/03-render-envanteri.md §3.1, §3.5",
				"max_overshoot": 1.66
			},
			{
				"name": "w768",
				"width": 768,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "#FFFFFF",
				"serves": [
					"R6 PD mobil ana görsel @1x (tablet dikey)",
					"R1 kart @2x en geniş hâl"
				],
				"derived_from": "hesap: max(PD mobil ana görsel = tam viewport, 768px tablet dikey @1x = 768 (§3.6); kart @2x 1920 viewport = 685 (§3.4)) = 768. Kaynak: docs/reports/03-render-envanteri.md §3.6 satır 768, §3.4 satır 1920",
				"max_overshoot": 1.16
			},
			{
				"name": "w1280",
				"width": 1280,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "contain",
				"serves": [
					"R6 PD mobil ana görsel @3x (360-390px telefon)",
					"R4 lightbox ana görsel @2x",
					"R1 kart @3x"
				],
				"derived_from": "hesap: max(lightbox ana görsel 636px @2x = 1272 (§3.8); PD mobil 360px @3x = 1080 (§3.6); kart @3x 1920 viewport = 1028 (§3.4)) = 1272 → üst basamak 1280. Kaynak: docs/reports/03-render-envanteri.md §3.8 satır 'PD lightbox ana görsel', §3.6, §3.4",
				"max_overshoot": 1.59
			},
			{
				"name": "w1920",
				"width": 1920,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "contain",
				"serves": [
					"R6 PD mobil ana görsel @3x (430px iPhone Pro Max) ve @2x (768px tablet)",
					"R2 masaüstü hover-zoom kaynağı",
					"R4 lightbox @3x"
				],
				"derived_from": "hesap: max(masaüstü hover-zoom ≥1536 viewport: 502px × 1.85 = 929 CSS @2x = 1858 (§3.5b); lightbox 636px @3x = 1908 (§3.8); tablet 768px @2x = 1536 (§3.6); iPhone Pro Max 430px @3x = 1290 (§3.6)) = 1908 → üst basamak 1920. Kaynak: docs/reports/03-render-envanteri.md §3.5b, §3.8, §3.6",
				"max_overshoot": 1.49
			}
		],
		"content_rules": [
			{
				"rule": "animated",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "animated",
				"source": "tradehub_core/media/pipeline.py:111-112 — motor animasyonlu görseli işleyemiyor (reason='animated'); kabul edilse türev üretilemez"
			},
			{
				"rule": "unreadable",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "unreadable",
				"source": "tradehub_core/media/pipeline.py:79-93 probe(readable=False) — mevcut davranışın slot düzeyine taşınması"
			},
			{
				"rule": "entropy_bits",
				"threshold": 2,
				"comparator": "lt",
				"action": "reject",
				"message_key": "blank",
				"source": "ÖLÇÜLMEDİ: eşik üretim korpusunda kalibre edilmeli — docs/standards/product-image.md §9.6. Kural boş/tek renk yüklemeyi keser; kalibre edilene kadar status=draft olduğu için zorlanmaz"
			},
			{
				"rule": "blur_laplacian_variance",
				"threshold": 100,
				"comparator": "lt",
				"action": "warn",
				"message_key": "blurry",
				"source": "ÖLÇÜLMEDİ: Laplacian varyans eşiği bu korpusta hiç ölçülmedi — docs/standards/product-image.md §9.6. 'warn'dan sert bir aksiyona ancak kalibrasyondan sonra çıkılabilir"
			},
			{
				"rule": "border_ratio",
				"threshold": 0.25,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "border_excessive",
				"source": "hesap: ürün kutusu 1:1 (ProductImageGallery.ts:246-248, ListingCard.ts:163). Kenarlarda %25'ten fazla tek renk dolgu, kart ızgarasında ürünün görünen alanını yarıya indirir. Eşik ÖLÇÜLMEDİ: kırpma öncesi/sonrası tıklama oranı etkisi bilinmiyor"
			},
			{
				"rule": "background_uniformity",
				"threshold": 0.6,
				"comparator": "lt",
				"action": "warn",
				"message_key": "background_not_uniform",
				"applies_to": [
					"Listing.primary_image"
				],
				"source": "ÖLÇÜLMEDİ: platformda beyaz zemin zorunluluğu bugün hiçbir yerde yazılı değil (grep: 00-upload-slot-envanteri.md §7-B B2 — kod tabanında oran/zemin kuralı yok). Eşik ticari karar bekliyor"
			},
			{
				"rule": "text_area_ratio",
				"threshold": 0.2,
				"comparator": "gt",
				"action": "review",
				"message_key": "text_overlay",
				"source": "ÖLÇÜLMEDİ: metin alanı ölçümü için bir dedektör (OCR/CTPN) kod tabanında YOK. Kural, dedektör gelene kadar action='ignore' ile ölçüm modunda çalıştırılmalı"
			},
			{
				"rule": "watermark_suspect",
				"threshold": 0.5,
				"comparator": "gt",
				"action": "review",
				"message_key": "watermark_suspect",
				"source": "ÖLÇÜLMEDİ: dedektör yok. Rakip/tedarikçi filigranı taşıyan görsel B2B pazaryerinde hukuki risk; kural kayıt altına alındı, eşik keyfî ve zorlanmamalı"
			},
			{
				"rule": "collage_suspect",
				"threshold": 0.5,
				"comparator": "gt",
				"action": "warn",
				"message_key": "collage_suspect",
				"source": "ÖLÇÜLMEDİ: dedektör yok. Kolaj görseller karo (70px, ProductImageGallery.ts:86) ölçeğinde tamamen okunamaz hâle gelir — bu yüzden kural tanımlı"
			},
			{
				"rule": "duplicate_phash",
				"threshold": {
					"hamming": 6
				},
				"comparator": "lte",
				"action": "warn",
				"message_key": "duplicate",
				"source": "ÖLÇÜLMEDİ: hamming eşiği bu korpusta doğrulanmadı. Mevcut sistemde içerik-eşliği yalnız sayaçlı silme tarafında ele alınıyor (tradehub_core/media/seller_media.py — aynı içerik birden çok mağazada tek fiziksel dosya), yükleme anında tekrar tespiti YOK"
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "reject",
			"master": "warn",
			"quality": "warn",
			"content_rules": "warn",
			"error_code_prefix": "product_image",
			"retryable": false
		},
		"messages": {
			"tr": {
				"short_edge_too_small": "Görselin kısa kenarı {kisa_kenar} piksel; en az {gerekli_kisa_kenar} piksel gerekiyor. Bu boyutta görsel ürün sayfasının büyük görselinde ve yakınlaştırmada bulanık çıkar. Fotoğrafı telefonunuzun en yüksek çözünürlük ayarıyla yeniden çekin veya orijinal (kırpılmamış) dosyayı yükleyin. WhatsApp'tan gelen görseller sıkıştırıldığı için genelde bu sınırın altında kalır; dosyayı e-posta veya bilgisayar üzerinden alın.",
				"area_too_small": "Görselin toplam piksel alanı {mp} MP; en az {max_mp} MP gerekiyor (örnek: 1000 × 1000 piksel). Ekran görüntüsü veya küçültülmüş bir kopya yüklemiş olabilirsiniz. Orijinal fotoğraf dosyasını yükleyin.",
				"ratio_not_allowed": "Görselin en-boy oranı {oran}; kabul edilen oranlar {izinli_oranlar} (±%2 sapma). Ürün ızgaralarındaki kutu kare olduğu için bu oranın dışındaki görsellerin kenarları kırpılır ya da ürünün etrafında geniş boş bantlar kalır. Görseli düzenleyicide {izinli_oranlar} oranlarından birine kırpın; ürünü ortalayıp boşluğu beyazla tamamlamak da geçerli bir çözümdür.",
				"too_many_pixels": "Görsel {mp} MP; işlenebilir üst sınır {max_mp} MP. Bu boyuttaki dosyalar sunucuda aşırı bellek tükettiği için açılmadan reddedilir. Görseli bir düzenleyicide en fazla 2400 piksel uzun kenara küçültüp yeniden yükleyin.",
				"too_large_bytes": "Dosya {mb} MB; bu slot için üst sınır {max_mb} MB. Kalite kaybı olmadan küçültmek için dosyayı JPEG veya WebP olarak kaydedin; ürün görselleri için 2400 piksel uzun kenar yeterlidir, bu ölçüde bir görsel normalde 1 MB'ın altında kalır.",
				"format_not_supported": "{bicim} biçimi bu slotta kabul edilmiyor. Kabul edilen biçimler: {izinli_bicimler}. iPhone kullanıyorsanız Ayarlar > Kamera > Biçimler > 'En Uyumlu' seçeneğini işaretleyin ya da görseli JPEG olarak dışa aktarın.",
				"animated": "Hareketli görsel (animasyonlu GIF/WebP) ürün görseli olarak kullanılamaz; sistem hareketli dosyalardan küçük boy türevleri üretemez. Ürünü tek karede gösteren sabit bir fotoğraf yükleyin. Ürünü hareketli anlatmak istiyorsanız ilanın video alanını kullanın.",
				"unreadable": "Dosya bir görsel olarak açılamadı; aktarım sırasında bozulmuş ya da uzantısı içeriğiyle uyuşmuyor olabilir. Dosyayı bilgisayarınızda açıp görüntülenebildiğini doğrulayın, sonra 'Farklı kaydet' ile JPEG veya PNG olarak yeniden kaydedip yükleyin.",
				"master_under_spec": "Görselin uzun kenarı {uzun_kenar} piksel; tam kalite için {gerekli_uzun_kenar} piksel öneriyoruz. Görsel kabul edildi, ancak yakınlaştırma ve büyük ekran görünümünde ayrıntı kaybı olacak: sistem görselleri büyütmez. Daha büyük bir orijinal varsa onu yüklemeniz görselin tüm ekranlarda net görünmesini sağlar.",
				"blurry": "Görsel bulanık görünüyor. Ürün sayfasında yakınlaştırma yapıldığında ayrıntı okunamaz. Fotoğrafı sabit bir yüzeyde, iyi ışıkta ve odağı ürüne kilitleyerek yeniden çekin.",
				"blank": "Görsel boş ya da tek renk görünüyor; ürüne ait bir içerik bulunamadı. Yanlış dosyayı seçmiş olabilirsiniz. Ürünü gösteren fotoğrafı yükleyin.",
				"border_excessive": "Görselin kenarlarında geniş boş alan var (%{yuzde}). Ürün, kart ızgaralarında olması gerekenden küçük görünür. Sistem fazla boşluğu otomatik kırptı; sonucu kontrol edin. Kırpmayı kendiniz yapmak isterseniz ürünü kadrajın en az %75'ini kaplayacak şekilde kırpıp yeniden yükleyin.",
				"background_not_uniform": "Ana ürün görselinin arka planı karışık. Ürün, arama sonuçlarındaki küçük kartlarda arka plandan ayırt edilemiyor. Ürünü düz beyaz veya açık gri bir zeminde çekin; ana görselde ürün dışında nesne bulunmasın. İkinci ve sonraki görsellerde kullanım ortamı gösterebilirsiniz.",
				"text_overlay": "Görselin üzerinde geniş bir metin/etiket alanı var (%{yuzde}). Bu metin küçük kartlarda (70 piksel) okunamaz ve reklam gibi göründüğü için ilan onaya düşer. Fiyat, kampanya ve iletişim bilgisini görselden çıkarıp ilan alanlarına yazın.",
				"watermark_suspect": "Görselde filigran ya da başka bir firmaya ait logo olabilir. Başkasının görselini kullanmak ilanın kaldırılmasına yol açar; ilan incelemeye alındı. Görsel sizinse filigransız orijinalini yükleyin.",
				"collage_suspect": "Görsel birden çok fotoğrafın birleştirilmiş hâli gibi görünüyor. Kolajlar 70 piksellik galeri karolarında okunamaz. Her açıyı ayrı bir galeri görseli olarak yükleyin; galeride 12 görsele kadar yer var.",
				"duplicate": "Bu görselin aynısı ya da neredeyse aynısı bu ilanda zaten var. Aynı görselin iki kez görünmesi alıcıda güven kaybı yaratır. Tekrarı kaldırıp ürünün farklı bir açısını, ölçeğini ya da ayrıntısını gösteren bir fotoğraf ekleyin.",
				"too_many_files": "Bu ilana en fazla {max_adet} görsel eklenebilir; şu an {adet} görsel var. Devam etmek için en zayıf görselleri kaldırın: birbirinin benzeri açılar yerine ürünün farklı yönlerini gösterenleri tutun."
			},
			"en": {
				"short_edge_too_small": "The image's short edge is {kisa_kenar}px; at least {gerekli_kisa_kenar}px is required. At this size the image looks blurry in the product page hero and in zoom. Re-shoot at your camera's highest resolution, or upload the original uncropped file.",
				"area_too_small": "Total pixel area is {mp} MP; at least {max_mp} MP is required (e.g. 1000 × 1000 px). You may have uploaded a screenshot or a downscaled copy. Upload the original photo file.",
				"ratio_not_allowed": "Aspect ratio is {oran}; allowed ratios are {izinli_oranlar} (±2%). Product grid boxes are square, so images outside these ratios get cropped or surrounded by wide empty bands. Crop to one of {izinli_oranlar}, or centre the product and pad with white.",
				"too_many_pixels": "The image is {mp} MP; the processing limit is {max_mp} MP. Files this large are rejected before decoding to protect server memory. Resize to at most 2400px on the long edge and upload again.",
				"too_large_bytes": "The file is {mb} MB; the limit for this slot is {max_mb} MB. Save as JPEG or WebP; 2400px on the long edge is enough for product images and normally stays under 1 MB.",
				"format_not_supported": "{bicim} is not accepted in this slot. Accepted formats: {izinli_bicimler}. On iPhone, set Settings > Camera > Formats > 'Most Compatible', or export the image as JPEG.",
				"animated": "Animated images (GIF/animated WebP) cannot be used as product images; the system cannot generate resized derivatives from them. Upload a still photo instead, and use the listing's video field for motion.",
				"unreadable": "The file could not be opened as an image; it may be corrupted or its extension may not match its content. Open it locally to confirm it displays, then re-save as JPEG or PNG and upload again.",
				"master_under_spec": "The long edge is {uzun_kenar}px; we recommend {gerekli_uzun_kenar}px for full quality. The image was accepted, but zoom and large-screen views will lose detail — the system never upscales. Upload a larger original if you have one.",
				"blurry": "The image looks out of focus. Detail becomes unreadable when buyers zoom. Re-shoot with the camera steady, in good light, focused on the product.",
				"blank": "The image looks empty or single-coloured; no product content was found. You may have picked the wrong file. Upload a photo of the product.",
				"border_excessive": "The image has wide empty margins ({yuzde}%). The product appears smaller than it should in card grids. The system auto-cropped the excess — please review. To crop it yourself, make the product fill at least 75% of the frame.",
				"background_not_uniform": "The main product image has a busy background. The product cannot be distinguished on small search-result cards. Shoot on a plain white or light grey background with nothing else in frame; use later gallery images for context shots.",
				"text_overlay": "A large text/badge area covers this image ({yuzde}%). That text is unreadable on 70px cards and reads as advertising, so the listing has been queued for review. Move price, promotion and contact details out of the image and into the listing fields.",
				"watermark_suspect": "The image may carry a watermark or another company's logo. Using someone else's image can get the listing removed; it has been queued for review. If the image is yours, upload the unwatermarked original.",
				"collage_suspect": "The image looks like several photos merged together. Collages are unreadable in 70px gallery thumbnails. Upload each angle as a separate gallery image — up to 12 are allowed.",
				"duplicate": "This image, or a near-identical one, is already on this listing. Duplicates reduce buyer trust. Remove the repeat and add a different angle, scale or detail shot.",
				"too_many_files": "This listing allows at most {max_adet} images; it currently has {adet}. Remove the weakest ones, keeping shots that show different sides of the product rather than near-identical angles."
			}
		},
		"sources": {
			"accept.mime": "tradehub_core/media/pipeline.py:21 SUPPORTED_FORMATS = {JPEG, PNG, WEBP, TIFF} — motorun bugün gerçekten çözebildiği küme. upload_policy.py:57-60 .avif/.heic'i görsel sayıyor, api/seller_media.py:245-247 IMAGE_TO_WEBP_EXTENSIONS ikisini de içeriyor, ama engine.SUPPORTED_FORMATS içermiyor ve requirements.txt/pyproject.toml'da pillow-heif ya da pillow-avif-plugin YOK. Eklenti yoksa to_webp istisnası api/seller_media.py:294-300'de YAKALANIYOR: dosya orijinal HEIC hâliyle kaydediliyor, kullanıcıya uyarı gitmiyor, yalnız log_error yazılıyor → HEIC'i çözemeyen tarayıcıda görsel hiç görünmüyor. Sessiz kayıp yerine açık ret tercih edildiği için allowlist'e alınmadı (bkz. open_questions[0])",
			"accept.extensions": "engine.py:27-35 FORMAT_EXTENSIONS ∩ SUPPORTED_FORMATS; upload_policy.check() kararını uzantı üzerinden veriyor (upload_policy.py:317-320)",
			"accept.max_bytes": "tradehub_core/media/upload_policy.py:68 MAX_BYTES[image] = 25 * 1024 * 1024. Slot tavanı bilinçli olarak global tavanla AYNI: bugünkü fiili durum bu ve slot politikası buraya sıkılaştırma getirmeden önce gerçek p95 dosya boyutu ölçülmeli (bkz. open_questions[3])",
			"accept.max_megapixels_hard": "T-020 görev tanımı / kaynak tasarım dokümanı: 80 MP. Kod tabanında karşılığı YOK (grep 'MAX_IMAGE_PIXELS' → tradehub_core/ içinde 0 sonuç)",
			"accept.allow_animated": "engine.py:111-112 — animasyonlu görsel işlenemiyor",
			"require.min_short_edge": "T-020 görev tanımı / kaynak tasarım dokümanı: 1000 px. Çapraz kontrol: docs/reports/03-render-envanteri.md §3.6 — PD mobil ana görsel 360px telefonda @3x 1080 px istiyor; 1000 px'lik bir orijinal bu talebi bile karşılamıyor, yani 1000 gerçekten TABAN, hedef değil",
			"require.min_area": "T-020 görev tanımı: 1.000.000 px. Karşılaştırma >= olmak zorunda: 1:1 oranda 1000×1000 = 1.000.000 tam sınırda buluşur, > kullanılsa min_short_edge ile çelişirdi",
			"require.allowed_ratios": "T-020 görev tanımı: 1:1, 4:5, 3:4. Çapraz kontrol: render tarafındaki TÜM ürün kutuları kare (docs/reports/03-render-envanteri.md §2 — R1, R2, R4, R6, R8, R9, R10, R17, R18, R20 hepsi 'aspect-square'); 4:5 ve 3:4 kabul edildiği için profiles[] içinde 1:1 dolgu kararı verildi",
			"require.ratio_tolerance": "T-020 görev tanımı: ±%2 → 0.02. Bantlar (hesap: |w/h − r| / r ≤ 0.02): 1:1 → 0.980-1.020; 4:5 → 0.784-0.816; 3:4 → 0.735-0.765. Bantlar çakışmıyor (0.816 < 0.980 ve 0.765 < 0.784), yani oran ataması tek anlamlı",
			"require.max_count": "ÖLÇÜLMEDİ: bugün hiçbir galeri slotunda adet kuralı yok (docs/reports/00-upload-slot-envanteri.md §7-A 'panel.listing_gallery: boyut yok, adet yok'). 12 değeri mevcut ilanların gerçek görsel sayısı dağılımına göre doğrulanmalı (bkz. open_questions[4])",
			"master.max_long_edge.mevcut_durum": "Bugün üç ayrı tavan var: to_webp yolu 1920 (engine.py:177, testi tests/test_engine_webp.py:33) — ürün görselleri fiilen bu yoldan geçiyor (api/seller_media.py:245-247, :292); optimize yolu varsayılan 2000 (presets.py:15); safe 2560 / aggressive 1600 (presets.py:14,16). Hiçbiri 2400 değil. Çelişkinin tartışması: docs/standards/product-image.md §5",
			"master.max_long_edge": "hesap: docs/reports/03-render-envanteri.md §3.6 — PD mobil ana görsel kutusu tam viewport genişliği; en büyük gerçek cihaz sınıfı tablet dikey 768 CSS px, × DPR 3 = 2304 → üst basamak 2400. Çapraz kontrol: 1023 px viewport @2x = 2046 < 2400; masaüstü hover-zoom @2x = 1858 (§3.5b); lightbox @3x = 1908 (§3.8). Gerekçe ve mevcut koddaki 1920/2000 ile çelişkinin tartışması: docs/standards/product-image.md §5",
			"master.min_long_edge": "T-020 görev tanımı: 2000. Bu bir RET eşiği değil: kaynak daha küçükse büyütülmez (engine.py:117 thumbnail yalnız küçültür), master 'under-spec' işaretlenir ve w1920 profili üretilmez",
			"master.max_megapixels": "hesap: 2400 × 2400 = 5.760.000 px = 5.76 MP. max_long_edge ile tutarlı (invariant: 2400^2/1e6 = 5.76 >= 5.76)",
			"master.dpi_out": "T-020 görev tanımı: 72. Ekran medyasında piksel ölçüsünü etkilemez; 300 DPI etiketli baskı dosyalarının metadata'sını normalize eder",
			"master.colorspace": "KARAR: 'srgb'. Mevcut motor 'preserve' davranıyor (engine.py:115,122,126,131 ICC profili çıktıya taşınıyor, dönüştürülmüyor). Değişiklik motor işi gerektirir (bkz. open_questions[2])",
			"master.strip_metadata.icc": "false — engine.py:11-13 EXIF/ICC notu: convert('RGB') ICC'yi düşürüyor, bu yüzden profil bilinçli olarak çıktıya taşınıyor. Silmek renk yönetimini bozar",
			"master.strip_metadata.gps": "true — KVKK/gizlilik: satıcının fabrika ya da ev konumu ürün fotoğrafının EXIF GPS bloğuyla sızabilir. Kod tabanında bugün EXIF temizliği YOK; engine.py:116 yalnız yön bilgisini piksele uyguluyor",
			"master.orientation": "engine.py:116 ImageOps.exif_transpose — mevcut davranış korunuyor",
			"quality.metric": "ÖLÇÜLMEDİ: kod tabanında hiçbir kalite ölçütü yok (grep 'ssim|butteraugli|dssim' → tradehub_core/ ve docs/ içinde 0 anlamlı sonuç)",
			"quality.target_ssim_per_class": "HEDEF, ölçüm değil. Sınıflar arası sıralamanın gerekçesi: metin ve düz renk alanları quantization'a fotoğraftan daha duyarlıdır (banding, halka artefaktı), bu yüzden 'text' > 'graphic' > 'fine_detail' > 'photo'. Sayılar kalibrasyonla doğrulanacak (bkz. open_questions[1])",
			"quality.reencode_floor_saving_ratio": "tradehub_core/media/presets.py:25 MIN_SAVING_RATIO = 0.10 — mevcut Kapı 6 ile aynı değer",
			"profiles": "Genişlikler docs/reports/03-render-envanteri.md §3.9'un aday kümesinden (96, 192, 384, 640, 768, 1080, 1280, 1600, 1920) seçildi; aralarındaki oran 1.25'in altında kalan çiftler birleştirildi (1080+1280 → 1280, 1600+1920 → 1920). Her profilin dayandığı kutu 'derived_from' alanında yazılı. Birleştirme gerekçesi: docs/standards/product-image.md §6",
			"profiles[].encoder_quality.webp": "engine.py:148 to_webp(quality=80) — sistemin bugün fiilen kullandığı WebP kalitesi. presets.py:14-16 optimize yolunda 90/88/82 kullanıyor; ikisi ayrı yol, karıştırılmamalı",
			"profiles[].encoder_quality.avif": "null = KALİBRE EDİLMEDİ. Kod tabanında AVIF encode yolu yok; AVIF yalnız iki statik pazarlama görselinde kullanılıyor (docs/reports/03-render-envanteri.md §4 — liman.avif, kargo.avif)",
			"profiles[].fit": "KARAR: 1:1 kutuya giden profiller (w96-w768) 'pad' → beyaz dolgu ile 1:1. Gerekçe: kartlarda 'object-cover' var (ListingCard.ts:163 aspect-square) ve 3:4 bir görsel cover ile yüksekliğinin %25'ini kaybeder. 1:1'e dolgulanmış görsel kare kutuda cover ile de tam görünür. w1280/w1920 'contain': bunlar detay ve zoom kaynağıdır, dolgu piksel bütçesini boşa harcar (docs/standards/product-image.md §7)",
			"profiles[].max_overshoot": "hesap: profil genişliği / o profilin karşıladığı EN KÜÇÜK talep (bir alt profil genişliğinin üstündeki en küçük CSS kutusu × DPR değeri). Talep listesi docs/reports/03-render-envanteri.md §3.1-3.8 tablolarından",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139 — mevcut kodlu ret sözleşmesi (14 kod + retryable). Yeni kodlar aynı biçimde üretilmeli: 'product_image_<message_key>'",
			"on_violation.retryable": "upload_policy.py:97-100 kuralı: kullanıcının dosyasıyla ilgili hatalar tekrar denenmez",
			"messages": "Metinler T-020 kapsamında yazıldı. Her metin NEDEN + NASIL içerir. Mevcut ret metinleriyle aynı ton: upload_policy.py:328-360 (ör. 'Dosya çok büyük: {0} MB. Bu tür için sınır {1} MB.')"
		},
		"open_questions": [
			"HEIC/AVIF kabul edilecek mi? Bugün bir iPhone HEIC'i L0'ı geçer, optimize() 'unsupported_format' döner (engine.py:109-110), to_webp() Pillow eklentisi yoksa istisna atar ama istisna api/seller_media.py:294-300'de yakalanır ve dosya orijinal .heic hâliyle kaydedilir — kullanıcıya uyarı gitmez. Sonuç: HEIC'i çözemeyen tarayıcıda ürün görseli hiç görünmez. Ya pillow-heif bağımlılığı eklenir ya .heic/.avif upload_policy.EXTENSIONS'tan çıkarılıp açık ret verilir. Doğrulama: docs/standards/product-image.md §9.7",
			"profiles[].encoder_quality.avif hepsinde null. AVIF kalitesi hedef SSIM'e göre kalibre edilmeden bu politika 'active' olamaz.",
			"master.colorspace='srgb' motorun bugünkü 'preserve' davranışından farklı (engine.py:115,122,126,131). Geniş gamut (Display P3) telefon fotoğraflarının tarayıcıda nasıl göründüğü ölçülmeden dönüşüm zorunlu kılınmamalı.",
			"accept.max_bytes bugünkü global tavanla aynı (25 MB) bırakıldı. Gerçek ürün görseli p95 dosya boyutu ölçülmedi (docs/reports/03-render-envanteri.md §7.3) — ölçüldükten sonra slot tavanı sıkılaştırılabilir.",
			"require.max_count=12 doğrulanmadı: mevcut ilanların görsel sayısı dağılımı bilinmiyor. Bugün hiçbir adet kuralı olmadığı için 12'nin üstünde galerisi olan ilanlar var olabilir; kural geçmişe dönük uygulanırsa o ilanlar kaydedilemez hâle gelir.",
			"content_rules içindeki 7 kuralın eşiği kalibre edilmedi ve 3'ünün (text_area_ratio, watermark_suspect, collage_suspect) dedektörü kod tabanında hiç yok.",
			"require.* kurallarının GEÇMİŞE dönük uygulanıp uygulanmayacağı belirsiz. Mevcut ürün görsellerinin kaçının min_short_edge=1000 ve allowed_ratios'u geçtiği ölçülmedi — bu sayı bilinmeden politika zorlanamaz (docs/standards/product-image.md §9.1)."
		],
		"notes": [
			"Bu politika bugün HİÇBİR kod yolu tarafından okunmuyor. upload_policy.check() imzasında slot parametresi yok (tradehub_core/media/upload_policy.py:306-312), yani slot kimliği sunucuya hiç ulaşmıyor — docs/reports/00-upload-slot-envanteri.md §7-B B1. Politikanın uygulanabilmesi için önce o kimlik taşınmalıdır.",
			"profiles[] üretimi de bugün YOK: bir yükleme → bir dosya (docs/reports/03-render-envanteri.md §6.3). srcset'i frontend'e yazmak İKİNCİ adımdır; birinci adım türev üretimi ve URL sözleşmesidir.",
			"srcset eklenmeden önce tradehubfront/src/utils/mediaUrl.ts genişletilmelidir: MutationObserver attributeFilter ['src','style'] (mediaUrl.ts:76) 'srcset' içermiyor — docs/reports/03-render-envanteri.md §6.1 uyarısı."
		]
	},
	"product.video": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.1.0",
		"status": "draft",
		"slot_key": "product.video",
		"title": "Ürün tanıtım videosu",
		"description": "Bir ilanın ve varyantlarının tanıtım videosu. Sistemde ASENKRON TRANSCODE HATTI ZATEN VAR (tradehub_core/media/transcode.py, 1280px/VP9/Opus) — bu politika o hattı yeniden tasarlamaz, sınırlarını slot sözleşmesine taşır. Görsel slotlarından farklı bir sorunu var: video 16:9, galeri kutusu ise kare (aspect-square), yani video kutuya letterbox oluyor.",
		"roles": [
			"seller"
		],
		"bound_to": [
			{
				"doctype": "Listing",
				"field": "video_url",
				"fieldtype": "Data",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `listing.video` — fieldtype Attach DEĞİL Data; panel buraya upload_file çıktısını string yazıyor (admin-panel/frontend/src/views/seller/ListingFormView.vue:4166-4185). media/usage.py:34 LIVE_SOURCES'ta kayıtlı."
			},
			{
				"doctype": "Listing Variant Item",
				"field": "variant_video_url",
				"fieldtype": "Data",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `listing.variant_video` — LIVE_SOURCES'ta YOK (§7-B B6), silme taramasında 'kullanılmıyor' görünür."
			}
		],
		"accept": {
			"mime": [
				"video/mp4",
				"video/webm",
				"video/quicktime"
			],
			"extensions": [
				".mp4",
				".webm",
				".mov",
				".m4v"
			],
			"max_bytes": 10485760,
			"max_megapixels_hard": 8.3,
			"allow_animated": true
		},
		"require": {
			"min_short_edge": 360,
			"min_area": 230400,
			"allowed_ratios": [
				"16:9"
			],
			"ratio_tolerance": 0.06,
			"max_count": 1
		},
		"master": {
			"max_long_edge": 1280,
			"min_long_edge": 640,
			"max_megapixels": 0.93,
			"dpi_out": 72,
			"colorspace": "preserve",
			"format": "webm",
			"orientation": "preserve",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "poster_192",
				"width": 192,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 80
				},
				"fit": "cover",
				"target_ratio": "1:1",
				"serves": [
					"galeri video karosu 70×70",
					"lightbox video karosu 76×76 (<960px'te 68×68)"
				],
				"derived_from": "hesap: max(lightbox karosu 76 @2x = 152; galeri karosu 70 @2x = 140) = 152 → üst basamak 192. Kutular: tradehubfront/src/components/product/ProductImageGallery.ts:103 (THUMB_BASE w-[70px]), :111-115 (LIGHTBOX_THUMB_BASE w-[76px], max-[960px] 68px)",
				"max_overshoot": 1.26
			},
			{
				"name": "poster_1024",
				"width": 1024,
				"formats": [
					"avif",
					"webp"
				],
				"encoder_quality": {
					"avif": null,
					"webp": 80
				},
				"fit": "contain",
				"serves": [
					"masaüstü galeri video slaytının duran kare gösterimi",
					"mobil MediaViewer video slaytının poster'ı"
				],
				"derived_from": "hesap: masaüstü galeri kutusu ≥1536 viewport'ta 502 CSS px @2x = 1004 → üst basamak 1024. Kutu: docs/reports/03-render-envanteri.md §3.5",
				"max_overshoot": 1.02
			}
		],
		"video": {
			"duration_max_s": 33,
			"resolution_min": {
				"width": 640,
				"height": 360,
				"derivation": "hesap: en küçük gerçek görüntüleme kutusu 300 CSS px (1024-1279 masaüstü bandı, docs/reports/03-render-envanteri.md §3.5); DPR2 → 600 genişlik → 16:9'da kısa kenar 338 → standart basamak 360 (640×360)."
			},
			"resolution_max": {
				"width": 3840,
				"height": 2160,
				"note": "4K kare üst sınırı. Sunucu her hâlükârda 1280 genişliğe indiriyor (transcode.py:242), bu yüzden üstünü kabul etmenin görsel karşılığı yok."
			},
			"resolution_recommended": {
				"width": 1280,
				"height": 720,
				"note": "ffmpeg hedefi zaten bu: scale='min(1280,iw)':-2 (transcode.py:242). Daha büyük yüklemek yalnız yükleme süresini uzatır."
			},
			"bitrate_cap_kbps": 2500,
			"audio_policy": {
				"track": "allowed",
				"codec": "libopus",
				"bitrate_kbps": null,
				"autoplay_mute_mandatory": true,
				"user_can_unmute": true,
				"notes": [
					"bitrate_kbps = null: SABİTLENMEDİ. transcode.py:246 `-c:a libopus` yazıyor, `-b:a` YOK → kodlayıcı varsayılanına bağlı ve ffmpeg sürümü değişince sessizce değişir. Kapak videosu slotu bunu 96 kbps'te sabitliyor (company-cover-video.json, Ç10); ürün videosunda karar VERİLMEDİ.",
					"autoplay_mute_mandatory: ürün videosu modalinde bugün MUTED YOK ve autoplay var (tradehubfront/src/components/seller/CompanyProfile.ts:1002) → tarayıcı oynatmayı bloklar. company-cover-video.json known_conflicts Ç9 bunu kaydediyor."
				]
			},
			"autoplay": {
				"enabled": false,
				"muted": true,
				"loop": false,
				"playsinline": true,
				"preload": "metadata",
				"present_today": false,
				"note": "Galeri/MediaViewer içinde video kullanıcı dokununca oynar; ProductVideoSection (16:9 kutu) hiçbir sayfada mount edilmiyor (notes[0] ÖLÜ RENDER). CompanyProfile.ts:1002'deki modal autoplay'i muted DEĞİL — Ç9. Bu satırlar hedeflenen sözleşmedir, bugünkü davranış değil."
			},
			"poster": {
				"selection_rule": "TANIMLANMADI: bugün poster hiç üretilmiyor. Bir yükleme → bir dosya (docs/reports/03-render-envanteri.md §6.3) ve <video> etiketlerine poster verilmiyor; galeri video karosunda duran kare tarayıcının ilk karesidir. Kare seçim kuralı ürün videosu için henüz KARAR DEĞİL — company-cover-video.json video.poster.selection_rule (ffmpeg thumbnail, n=120, [0,5 s, min(5 s, süre×0,25)] penceresi) hazır bir şablondur ve aynen benimsenebilir.",
				"profile": "poster_1024",
				"fallback_profile": "poster_192",
				"implemented_today": false
			},
			"renditions": [
				{
					"id": "product_1280_webm",
					"role": "primary",
					"width": 1280,
					"height": 720,
					"container": "webm",
					"video_codec": "libvpx-vp9",
					"crf": 32,
					"audio_codec": "libopus",
					"audio_bitrate_kbps": null,
					"max_bytes": 10485760,
					"max_bytes_human": "10 MB",
					"max_bytes_derivation": "Çıktı için AYRI bayt kapısı YOK: _run_transcode sonucu koşulsuz yerine yazıyor (transcode.py:251-252 os.replace). accept.max_bytes ile aynı sayı yazıldı — ÖLÇÜLMEDİ, çıktının girdiden büyük olmadığı garanti değil.",
					"mime": "video/webm; codecs=vp9,opus",
					"served_when": "her viewport — tek tier",
					"implemented_today": true,
					"crf_note": "CRF 32 mevcut hattan okundu (transcode.py:245); -maxrate/-bufsize YOK, bu yüzden maxrate_kbps/bufsize_kbps yazılmadı.",
					"note": "Ç1 UYARISI: bu rendition kaynağın ADRESİNE yazılıyor (transcode.py:230 → :252), yani .mp4 uzantılı bir URL'den WebM baytları servis ediliyor. mime alanı ancak Ç1 çözüldükten sonra doğru olur; bugün nginx Content-Type'ı uzantıdan türetiyor."
				}
			],
			"transcode": {
				"unconditional_for_this_slot": false,
				"conditional_reason": "needs_transcode() eşikleri geçerli: 1280 genişlik ve 2.500.000 bps altındaki dosyalar ATLANIR (tradehub_core/media/transcode.py:61,66-67,116). Kapak videosunun aksine ürün videosu ilan başına 1 + varyant başına 1 adet → kuyruk riski gerçek, koşullu atlama korunuyor.",
				"in_place_replace": {
					"allowed_for_this_slot": true,
					"today_behavior": "dst_path = f'{src_path}.transcoding.webm' (transcode.py:230) ardından os.replace(dst_path, src_path) (transcode.py:252).",
					"note": "Bu politika mevcut davranışı DEĞİŞTİRMİYOR (Kural 5: çözülmüş hattı yeniden tasarlama). Ama Ç1'in bedeli burada da geçerli: .mp4 adresinden WebM baytı servis ediliyor. Düzeltme kapak slotunda başlıyor (company-cover-video.json video.transcode.in_place_replace)."
				},
				"size_gate_missing_today": "Boyut kapısı yok; çıktı ne olursa olsun yazılıyor (transcode.py:251-252). presets.py:25 MIN_SAVING_RATIO video yolunda UYGULANMIYOR."
			}
		},
		"content_rules": [
			{
				"rule": "frame_width",
				"threshold": 1280,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "genislik_kuculttuk",
				"source": "tradehub_core/media/transcode.py:242 — ffmpeg -vf scale='min(1280,iw)':-2. Ret değil, sunucu küçültür."
			},
			{
				"rule": "bitrate_bps",
				"threshold": 2500000,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "bitrate_isleniyor",
				"source": "tradehub_core/media/transcode.py:61 NEEDS_TRANSCODE_MAX_BITRATE = 2_500_000 — eşiği aşan video transcode kuyruğuna girer (transcode.py:116)."
			},
			{
				"rule": "duration_seconds",
				"threshold": 33,
				"comparator": "gt",
				"action": "warn",
				"message_key": "sure_uzun",
				"source": "hesap: 10 MB = 10·1024·1024·8 = 83.886.080 bit; 83.886.080 / 2.500.000 bps = 33,5 sn. Yani accept.max_bytes ile transcode.py:61 bitrate eşiği birlikte ~33 saniyelik ZIMNİ bir süre sınırı üretiyor. Kodda açık süre kontrolü YOK."
			},
			{
				"rule": "is_private",
				"threshold": true,
				"comparator": "eq",
				"action": "warn",
				"message_key": "private_transcode_atlandi",
				"source": "tradehub_core/media/transcode.py:194 — `if doc.get('is_folder') or doc.get('is_private'): return`. Private yüklenen ürün videosu HİÇ normalize edilmez ve kullanıcıya hiçbir şey söylenmez."
			},
			{
				"rule": "ffprobe_readable",
				"threshold": false,
				"comparator": "eq",
				"action": "review",
				"message_key": "ffprobe_okunamadi",
				"source": "tradehub_core/media/transcode.py:101-106 — ffprobe patlarsa güvenli tarafa düşülüp True dönüyor (transcode et) ve frappe.log_error yazılıyor."
			},
			{
				"rule": "owner_is_seller_or_listing_attached",
				"threshold": false,
				"comparator": "eq",
				"action": "warn",
				"message_key": "kapsam_disi_transcode_yok",
				"source": "tradehub_core/media/transcode.py:201-204 — ownership.store_of(owner) boş VE attached_to_doctype != 'Listing' ise global transcode ağı dosyayı atlıyor."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "warn",
			"master": "auto_fix",
			"content_rules": "warn",
			"error_code_prefix": "upload",
			"retryable": false
		},
		"messages": {
			"tr": {
				"bicim_desteklenmiyor": "Bu video biçimi kabul edilmiyor ({bicim}). MP4, WebM veya MOV olarak yeniden kaydedip tekrar yükleyin ({izinli_bicimler}).",
				"cok_buyuk": "Video {mb} MB; sınır {max_mb} MB. Süreyi kısaltın ya da 1280 piksel genişlikte yeniden kaydedip yükleyin.",
				"cozunurluk_dusuk": "Video genişliği çok düşük; en az 640×360 gerekiyor. Daha yüksek çözünürlükte kaydedip yükleyin, yoksa ürün sayfasında bulanık görünür.",
				"oran_16_9_degil": "Videonun oranı {oran}; beklenen 16:9. Galeri kutusu kare olduğu için başka oranlarda üstte ve altta geniş siyah bant oluşur.",
				"genislik_kuculttuk": "Video 1280 piksel genişliğe küçültüldü; yükleme kabul edildi, işlem sunucuda arka planda tamamlanıyor.",
				"bitrate_isleniyor": "Videonun bit hızı yüksek olduğu için sunucuda yeniden sıkıştırılıyor. Yükleme kabul edildi; hazır olunca ürün sayfasında görünecek.",
				"sure_uzun": "Video tahminen 33 saniyeden uzun ve 10 MB sınırına dayanıyor. Süreyi kısaltmak dosyayı küçültmenin en etkili yoludur.",
				"private_transcode_atlandi": "Video gizli (private) olarak kaydedildi; bu yüzden sunucu sıkıştırma adımı atlandı. Ürün videosunu herkese açık olarak yükleyin.",
				"ffprobe_okunamadi": "Videonun teknik bilgileri okunamadı; dosya bozuk olabilir. Yükleme kabul edildi ama güvenli tarafta kalmak için yeniden sıkıştırılacak.",
				"kapsam_disi_transcode_yok": "Bu video otomatik sıkıştırma kapsamına girmedi çünkü bir ilana bağlanmamış. Videoyu ürün formundan yükleyin."
			}
		},
		"sources": {
			"accept.mime": "tradehub_core/media/upload_policy.py:63 (KIND_VIDEO uzantıları) + tradehub_core/media/transcode.py:67 VIDEO_EXTENSIONS; istemci accept: admin-panel/frontend/src/views/seller/ListingFormView.vue:1215 (video/*)",
			"accept.extensions": "tradehub_core/media/transcode.py:67 VIDEO_EXTENSIONS = {.mp4, .webm, .mov, .m4v}",
			"accept.max_bytes": "admin-panel/frontend/src/views/seller/ListingFormView.vue:4169 — bugün FİİLEN uygulanan en sıkı sınır (10 MB). Sunucu L0 tavanı 200 MB (upload_policy.py:69) ama platform_limit() Frappe max_file_size ile kısıtlıyor (upload_policy.py:239-265). Yeni sayı üretilmedi; mevcut üç değerden (10/25/200) en sıkısı alındı.",
			"accept.max_megapixels_hard": "hesap: 3840×2160 / 1e6 = 8,29 → 4K kare üst sınırı. Sunucu her hâlükârda 1280 genişliğe indiriyor (transcode.py:242), bu yüzden 4K üstü kabul etmenin hiçbir görsel karşılığı yok.",
			"accept.allow_animated": "Video slotu — hareket slotun kendisidir. Bu alanın görsel motorundaki karşılığı (engine.py:106 'animated' reddi) video yoluna hiç girmez; video yolu Pillow değil ffmpeg (transcode.py:235-248).",
			"require.min_short_edge": "hesap: en küçük gerçek görüntüleme kutusu 300 CSS px (1024-1279 masaüstü bandı, docs/reports/03-render-envanteri.md §3.5); DPR2 → 600 genişlik → 16:9'da kısa kenar 338 → standart basamak 360 (640×360).",
			"require.min_area": "hesap: 640 × 360 = 230.400 piksel.",
			"require.allowed_ratios": "tradehubfront/src/components/product/ProductVideoSection.ts:79 (padding-top:56.25% = 16:9) + tradehubfront/src/components/seller/StoreHeader.ts:296 (aspect-video) + tradehubfront/src/components/seller/CompanyProfile.ts:997 (aspect-video)",
			"require.ratio_tolerance": "hesap: ±%6 — 1920×1080 (1,778) ile 1920×1088 (1,765) gibi encoder yuvarlamalarını geçirir, 4:3 (1,333) veya 1:1'i geçirmez.",
			"require.max_count": "docs/reports/00-upload-slot-envanteri.md §2 — Listing.video_url tek bir Data alanı; varyant başına ayrı 1 adet (Listing Variant Item.variant_video_url).",
			"master.max_long_edge": "tradehub_core/media/transcode.py:242 — ffmpeg hedefi scale='min(1280,iw)':-2. Yeni bir hedef önerilmiyor, mevcut hedef yazıldı. Eşik tutarlılığı transcode.py:55-60 yorumunda gerekçelendirilmiş.",
			"master.min_long_edge": "hesap: require.min_short_edge 360 → 16:9'da uzun kenar 640.",
			"master.max_megapixels": "hesap: 1280 × 720 / 1e6 = 0,9216 → 0,93. Şema invaryantı sağlanıyor: 1280² / 1e6 = 1,64 ≥ 0,93.",
			"master.dpi_out": "Video için anlamsız bir alan; şema zorunlu kıldığı için ekran standardı 72 yazıldı. ÖLÇÜLMEDİ: video metadata'sında dpi taşınmıyor.",
			"master.colorspace": "tradehub_core/media/transcode.py:235-248 — ffmpeg komutunda renk uzayı dönüşümü YOK, kaynak korunuyor.",
			"master.format": "tradehub_core/media/transcode.py:243-246 — gerçek master biçimi WebM (VP9 video + Opus ses). ŞEMA BOŞLUĞU GİDERİLDİ: v1.0.0'da master.format enum'unda 'webm' yoktu ve 'preserve' yazmak zorunda kalınmıştı; şema v1.1.0 enum'a 'webm' ve 'mp4' ekledi, değer gerçeğe çevrildi (docs/standards/README.md §4 E10).",
			"master.orientation": "ffmpeg döndürme metadata'sını taşır; PIL'in ImageOps.exif_transpose davranışı (engine.py:116) video yoluna hiç girmez → 'apply_exif' yerine 'preserve'. ÖLÇÜLMEDİ: dikey çekilmiş telefon videosunda rotate matrisinin korunduğu üretim dosyasında doğrulanmalı.",
			"master.strip_metadata": "tradehub_core/media/transcode.py:235-248 — ffmpeg varsayılanı çoğu metadata'yı taşımaz; GPS/EXIF silinmesi ÖLÇÜLMEDİ: `ffprobe -show_format` ile üretim dosyalarında doğrulanmalı.",
			"quality.reencode_floor_saving_ratio": "tradehub_core/media/presets.py:25 MIN_SAVING_RATIO = 0.10 — görsel yolundaki Kapı 6 ile aynı eşik. NOT: video yolunda bu kapı UYGULANMIYOR; _run_transcode çıktıyı koşulsuz yerine yazıyor (transcode.py:251-252 os.replace).",
			"profiles[0].width": "hesap: max(76 @2x = 152; 70 @2x = 140) = 152 → 192. Kutular ProductImageGallery.ts:103,111-115",
			"profiles[1].width": "hesap: 502 CSS px @2x = 1004 → 1024. Kutu docs/reports/03-render-envanteri.md §3.5 (≥1536 viewport satırı)",
			"profiles.eksik": "ŞEMA BOŞLUĞU GİDERİLDİ: video rendition'ı (1280 genişlik VP9/Opus WebM) profiles[] içinde ifade edilemiyordu — profiles[].formats enum'u yalnız avif/webp/jpeg/png kabul ediyor. Şema v1.1.0 'video.renditions[]' bloğunu ekledi ve rendition oraya YAZILDI. Ayrım korunuyor: profiles[] iki POSTER görselini tanımlar (<picture> kaynağı), video.renditions[] teslim edilen videoyu (<video><source> kaynağı). Rendition'ın kodda yaşadığı yer transcode.py:242-247.",
			"video.duration_max_s": "hesap: 10 MB = 10·1024·1024·8 = 83.886.080 bit; 83.886.080 / 2.500.000 bps = 33,5 sn → 33 s. Bu ZIMNİ bir sınırdır: accept.max_bytes ile transcode.py:61 bitrate eşiğinin çarpımından doğuyor, kodda açık süre kontrolü YOK (content_rules 'duration_seconds' kuralı bu yüzden 'warn').",
			"video.resolution_min": "hesap: 300 CSS px × DPR2 = 600 genişlik → 16:9'da kısa kenar 338 → standart basamak 360 (640×360). Kutu docs/reports/03-render-envanteri.md §3.5",
			"video.resolution_max": "hesap: 3840×2160 / 1e6 = 8,29 MP → accept.max_megapixels_hard ile aynı kaynak. Teslim her hâlükârda 1280 genişliğe iniyor (transcode.py:242).",
			"video.bitrate_cap_kbps": "tradehub_core/media/transcode.py:61 NEEDS_TRANSCODE_MAX_BITRATE = 2_500_000 → 2.500 kbps. DİKKAT: istemci barı 2.000.000 bps (admin-panel/frontend/src/lib/media/compress.video.js:29) — aynı çelişki (Ç4) burada da var, ama kapak slotunun aksine bu politika mevcut sunucu eşiğini DEĞİŞTİRMİYOR (Kural 5).",
			"video.audio_policy.bitrate_kbps": "tradehub_core/media/transcode.py:246 — `-c:a libopus` var, `-b:a` YOK. null = SABİTLENMEDİ; ürün videosu için karar verilmedi (kapak slotu 96 kbps'te sabitliyor).",
			"video.autoplay": "tradehubfront/src/components/product/ProductVideoSection.ts:56-63 (ÖLÜ RENDER, mount edilmiyor) ve tradehubfront/src/components/product/MediaViewer.ts:54; modal autoplay'i tradehubfront/src/components/seller/CompanyProfile.ts:1002 (muted YOK — Ç9). Yazılan değerler hedeflenen sözleşmedir.",
			"video.poster.selection_rule": "TANIMLANMADI: türev üretimi yok (docs/reports/03-render-envanteri.md §6.3), <video poster> verilmiyor. Kare seçim kuralı ürün videosu için karar bekliyor; şablon company-cover-video.json video.poster.",
			"video.renditions[0]": "tradehub_core/media/transcode.py:242-247 — scale='min(1280,iw)':-2, libvpx-vp9, CRF 32, libopus. Yeni değer üretilmedi, mevcut hat okundu.",
			"video.transcode.conditional_reason": "tradehub_core/media/transcode.py:61,66-67,116 — needs_transcode() eşikleri; transcode.py:14-16 yorumu koşullu atlamanın gerekçesini yazıyor.",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139 — 14 kodlu ret sözleşmesi, kodlar 'upload_' önekli.",
			"on_violation.retryable": "tradehub_core/media/upload_policy.py:97-100 — kullanıcının dosyasıyla ilgili hatalar tekrar denenmez."
		},
		"open_questions": [
			"ffmpeg/ffprobe üretim imajında var mı? `docker compose exec backend which ffmpeg ffprobe`. Yoksa transcode.py:101-106 her videoda log_error yazıp True dönüyor ve _run_transcode FileNotFoundError alıyor — yani hiçbir video normalize edilmiyor.",
			"File.th_media_video_status dağılımı: kaç video processing/ready/failed? `bench --site <site> console` içinde: frappe.db.sql(\"select th_media_video_status, count(*) from tabFile where th_media_video_status is not null group by 1\")",
			"Gerçek video çözünürlük / bitrate / süre dağılımı: her ürün videosu için `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate,duration -of json <dosya>` ve histogram.",
			"Listing.video_url alanlarının kaçı DOSYA, kaçı YouTube/Vimeo URL'i? İkisi aynı Data alanında yaşıyor (ProductVideoSection.ts:31-49 ikisini de işliyor) ve yalnız dosya olanlar bu politikanın kapsamında.",
			"ProductVideoSection ölü kod mu, mount edilmesi mi gerekiyor? Karar verilene kadar 16:9 render kutusu yalnız kağıt üzerinde var.",
			"10 MB sınırı ürünün gerçek ihtiyacını karşılıyor mu? Panelde 10 MB, sunucuda 200 MB ilan ediliyor; hangi sayının doğru olduğu ürün kararı."
		],
		"notes": [
			"ÖLÜ RENDER: `ProductVideoSection()` hiçbir sayfada çağrılmıyor. Doğrulama: grep 'ProductVideoSection' /Users/ahmet/Desktop/istoc/tradehubfront/src → yalnız kendi dosyası, components/product/index.ts:21-24 (barrel) ve `toVideoEmbedHtml` içe aktarımları (alpine/product.ts:25, components/product/MediaViewer.ts:14). Yani 16:9'luk oranlı kutu bugün ekranda YOK; video yalnız KARE galeri kutusunda (ProductImageGallery.ts:248 aspect-square) ve kare MediaViewer kutusunda (MediaViewer.ts:54) gösteriliyor.",
			"16:9 video / 1:1 kutu ÇELİŞKİSİ: 502×502'lik masaüstü kutusunda 16:9 bir video 502×282 olarak çizilir, üstte ve altta toplam 220 px siyah kalır (MediaViewer.ts:54 `bg-black`, ProductVideoSection.ts:64 `object-contain bg-black`). Bu politika çelişkiyi çözmez, kaydeder.",
			"ZATEN ÇÖZÜLMÜŞ — yeniden tasarlanmayacak: (1) asenkron transcode hattı, RQ `long` kuyruğu, 1700 sn ffmpeg timeout, `nice -n 10` (transcode.py:50,157-160,236); (2) idempotanlık — aynı dosya iki yoldan tetiklenirse ikinci kez kuyruğa girmez (transcode.py:139-140); (3) durum alanı File.th_media_video_status ve panel okuması (media/inventory.py:239,261); (4) yedek/geri yükleme farkındalığı (media/backup.py:79-84, media/restore.py:198); (5) istemci sıkıştırma mediabunny ile WebM (admin-panel/frontend/src/lib/media/compress.js `prepareVideo`); (6) parçalı yükleme eşiği 8 MB (upload_policy.py:89) — 10 MB'lık video zaten parçalı gider (media/chunked.py).",
			"SESSİZ FARK: sunucu 200 MB ilan ediyor (upload_policy.py:69), istemci 10 MB kesiyor (ListingFormView.vue:4169), DocType açıklamaları 10 MB diyor, platform_limit() Frappe tavanını 25 MB varsayıyor (upload_policy.py:239-259). Aynı sınır için dört ayrı sayı — docs/reports/00-upload-slot-envanteri.md §7-B B7.",
			"Bu politika dosyası bugün kod tarafından OKUNMUYOR. Slot kimliği sunucuya geçmiyor: upload_policy.check() imzasında slot parametresi yok (tradehub_core/media/upload_policy.py:307-313, §7-B B1)."
		]
	},
	"seller.logo": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.2.0",
		"status": "draft",
		"slot_key": "seller.logo",
		"title": "Satıcı (mağaza) logosu",
		"description": "Mağaza logosu — mağaza vitrini başlığı, ürün detay tedarikçi kartı, üretici listesi ve hero'su, favoriler, vitrin şablonu kartları, satıcı dashboard'u ve admin panel önizlemeleri. 16 render noktası ölçüldü; en büyük piksel talebi 480 px (admin dropzone 160 CSS px @ DPR3). Standart: docs/standards/logo.md",
		"roles": [
			"seller",
			"admin"
		],
		"bound_to": [
			{
				"doctype": "Admin Seller Profile",
				"field": "logo",
				"fieldtype": "Attach Image",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 Tablo A satır `seller.logo`; media/usage.py:39 LIVE_SOURCES ('seller_logo') — kayıtlı"
			},
			{
				"doctype": "Storefront Layout",
				"field": "sections (JSON içinde header.logo)",
				"fieldtype": "Long Text",
				"source": "docs/reports/00-upload-slot-envanteri.md §2 satır `panel.storefront_layout_logo`; yazan ekran admin-panel/frontend/src/views/seller/StorefrontLayoutEditor.vue:272-278 (accept=\"image/*\", boyut kontrolü YOK). Attach taramasıyla BULUNAMAZ — JSON içinde URL"
			}
		],
		"accept": {
			"mime": [
				"image/png",
				"image/webp",
				"image/jpeg"
			],
			"extensions": [
				".png",
				".webp",
				".jpg",
				".jpeg"
			],
			"conditional_extensions": [
				".svg"
			],
			"rejected_extensions": [
				".gif",
				".tif",
				".tiff",
				".bmp",
				".heic",
				".avif",
				".svgz"
			],
			"format_priority": [
				"svg",
				"png_with_alpha",
				"webp_lossless",
				"jpeg_opaque"
			],
			"max_bytes": 1048576,
			"max_bytes_svg": 32768,
			"allow_animated": false,
			"allow_data_uri": false
		},
		"require": {
			"min_short_edge": 256,
			"recommended_edge": 512,
			"low_resolution_warn_below": 512,
			"max_edge": 4096,
			"aspect_band": {
				"min_w_over_h": 0.5,
				"max_w_over_h": 2
			},
			"alpha_channel": "optional",
			"alpha_accepted_pil_modes": [
				"RGBA",
				"LA",
				"P_with_transparency"
			],
			"max_count": 1
		},
		"master": {
			"target_ratio": "1:1",
			"fit": "pad",
			"pad_color": "transparent",
			"allow_crop": false,
			"allow_upscale": false,
			"max_long_edge": 4096,
			"min_long_edge": 256,
			"format": "webp",
			"encoding": "lossless",
			"colorspace": "srgb",
			"orientation": "apply_exif",
			"in_file_safe_area_percent": 0,
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "bit_exact",
			"lossless_required": true,
			"reason": "Logo düz renk + keskin kenar. Kayıplı encode halkalanma (ringing) üretir; SSIM bu artefaktı logoda güvenilir ölçmez. Kayıpsızlık ölçülebilir bir kriter: çıktı, girdiyle piksel-eş olmalı.",
			"reencode_floor_saving_ratio": null
		},
		"profiles": [
			{
				"name": "w64",
				"width": 64,
				"height": 64,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 4096,
				"serves": [
					"S11 marka sayfası satıcı rozeti @3x",
					"S8 favoriler satırı @2x",
					"S4/S6/S6b/S10 @1x-2x",
					"S2/S5/S9/S12/S13/S16 @1x"
				],
				"derived_from": "hesap: max(S11 16px @3x = 48; S8 32px @2x = 64; S5 64px @1x = 64) = 64. Kutular: docs/standards/logo.md §3.1 (brand.ts:138; FavoritesLayout.ts:368-370; product/CompanyProfile.ts:109)",
				"max_overshoot": 1.33,
				"byte_reference": "tradehubfront/icons/icon-48.webp 1332 B, icon-72.webp 2021 B (stat -f %z; file → gerçekte PNG) → 64 px ara değer ≈ 1700 B"
			},
			{
				"name": "w128",
				"width": 128,
				"height": 128,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 8192,
				"serves": [
					"S8/S10/S4/S6/S6b @3x",
					"S9/S12/S2/S13/S5/S16 @2x",
					"S15/S7/S3 @1x"
				],
				"derived_from": "hesap: max(S4 40px @3x = 120; S6 42px @3x = 126; S5 64px @2x = 128; S3 120px @1x = 120) = 128. Kutular: docs/standards/logo.md §3.2",
				"max_overshoot": 1.07,
				"byte_reference": "tradehubfront/icons/icon-128.webp 3600 B (file → gerçekte PNG 128×128 RGBA)"
			},
			{
				"name": "w256",
				"width": 256,
				"height": 256,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 16384,
				"serves": [
					"S9/S2/S13/S5/S16 @3x",
					"S15 @2x-3x",
					"S7/S3 @2x",
					"S1/S14 @1x"
				],
				"derived_from": "hesap: max(S13 56px @3x = 168; S16 64px @3x = 192; S15 80px @3x = 240; S7 116px @2x = 232; S3 120px @2x = 240; S14 160px @1x = 160) = 240 → üst basamak 256. Kutular: docs/standards/logo.md §3.2",
				"max_overshoot": 1.6,
				"byte_reference": "tradehubfront/icons/icon-256.webp 9159 B (file → gerçekte PNG 256×256 RGBA)"
			},
			{
				"name": "w384",
				"width": 384,
				"height": 384,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 23040,
				"serves": [
					"S1 @2x (280 kutu)",
					"348 ve 360 px talepleri"
				],
				"derived_from": "K3 kararı (logo.md §13-K3) ÖLÇÜMLE B'ye çevrildi, 2026-08-19. Tetik: 512 rung'unun gerçek baytı 40 KiB tavanına yaklaşırsa 5 rung. Ölçüm (18 gerçek logo, kayıpsız WebP): p50 27.162 B ≈ referans 27.128 B, p90 83.522 B, max 109.172 B; 9/18 referanstan ağır, 5/18 tavanı AŞIYOR. Tetik ateşledi. Bu rung en kötü aşırı-servisi 1,83× → 1,37× indirir.",
				"max_overshoot": 1.37
			},
			{
				"name": "w512",
				"width": 512,
				"height": 512,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": "lossless"
				},
				"fit": "pad",
				"target_ratio": "1:1",
				"pad_color": "transparent",
				"max_bytes": 40960,
				"serves": [
					"S7/S3 @3x",
					"S1 @2x-3x",
					"S14 @2x-3x"
				],
				"derived_from": "hesap: max(S1 140px @3x = 420; S14 160px @3x = 480) = 480 → üst basamak 512. Kutular: docs/standards/logo.md §3.2 (seller-shop.ts:124-129; ProfileImageDropzone.vue:135)",
				"max_overshoot": 1.83,
				"max_overshoot_note": "En kötü durum S1 @2x (280 → 512 = 1,83× doğrusal / 3,35× piksel). K3 KAPANDI (2026-08-19, seçenek B): w384 rung'u eklendi ve bu değeri 1,37×'e indirdi — docs/standards/logo.md §13-K3.",
				"byte_reference": "tradehubfront/public/icons/icon-512.png 27128 B (stat -f %z; file → PNG 512×512 RGBA kayıpsız)"
			},
			{
				"name": "og1200x630",
				"width": 1200,
				"height": 630,
				"formats": [
					"jpeg"
				],
				"encoder_quality": {
					"jpeg": 85
				},
				"fit": "pad",
				"target_ratio": "1200:630",
				"pad_color": "#FFFFFF",
				"max_bytes": 122880,
				"max_content_height": 453,
				"serves": [
					"og:image",
					"twitter:image"
				],
				"derived_from": "seo/og_image.py:20-21 OG_WIDTH=1200, OG_HEIGHT=630. Bağlanma: seo/meta_builder.py:261 og_image_resolver=lambda r: ensure_og_image(r, source_field='logo'). max_content_height = 630 × 0,72 = 453,6 → 453 (%14 üst + %14 alt güvenli alan).",
				"fixes": "seo/og_image.py:45-49 bugün COVER-CROP yapıyor: 1:1 logo için new_h=1200, top=(1200−630)//2=285, crop(0,285,1200,915) → logonun yüksekliğinin %47,5'i (570/1200) kesiliyor. Ayrıca :34 img.convert('RGB') alfayı belirsiz zemine düşürüyor, :51 JPEG q85 kayıplı. Bu profil üçünü de düzeltir: pad (crop değil) + açıkça beyaz zemin.",
				"byte_reference": "tradehubfront/public/images/og-default.jpg 47649 B (file → JPEG 1200×630)"
			}
		],
		"content_rules": [
			{
				"rule": "animated",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "animated",
				"source": "media/engine.py:111-112 animasyonluyu atlıyor (reason='animated'); api/seller_media.py:245-247 .gif'i WebP dönüşümünden bilinçli dışarıda tutuyor. Logo animasyonlu olmamalı."
			},
			{
				"rule": "no_alpha_channel",
				"threshold": true,
				"comparator": "eq",
				"action": "warn",
				"message_key": "format_no_alpha",
				"source": "16 render noktasının 11'i logonun altına açık plaka boyuyor: bg-gray-50 ×6 (seller/CompanyProfile.ts:1029, ManufacturerList.ts:242, ManufacturersHero.ts:277, FavoritesLayout.ts:368, section-registry.ts:749, seller-dashboard.ts:157), bg-white ×2 (seller-shop.ts:204, product/CompanyProfile.ts:109), bg-gray-100 ×2 (section-registry.ts:620, seller-dashboard.ts:65), bg-white/10 ×1 (brand.ts:138). Opak dikdörtgen bu plakaların üzerinde görünür kutu bırakır. Ayrıca seller-shop.ts:124 HİÇ plaka koymuyor — arka plan satıcının kendi header_bg_image'i (:118-119). ACTION=WARN (RET DEĞİL) — K1 ölçümle çözüldü: docs/reports/08-canli-olcum.md §2.1 (2026-08-18), ölçülen 18 gerçek logonun 9'u JPEG = %50 ve yalnız 4'ü (%22) alfa taşıyor. docs/standards/logo.md §13-K1'in kendi sayısal tetiği ('JPEG payı %10'u geçerse B') aşıldı → Öneri A (ret) DÜŞTÜ, seçenek B yürürlükte: kabul + uyarı + geçiş penceresi. Görsel gerekçe (11 plaka) geçerliliğini KORUYOR; değişen tek şey yaptırımın sertliği. GEÇİŞ PENCERESİ: mevcut opak logolar dokunulmadan yaşar; yeni yüklemede uyarı gösterilir ve kayıt envantere logo_opaque olarak düşer; sert rette ısrar, mevcut logoların yarısını anında geçersiz kılardı."
			},
			{
				"rule": "aspect_out_of_band",
				"threshold": [
					0.5,
					2
				],
				"comparator": "outside",
				"action": "reject",
				"message_key": "aspect_out_of_band",
				"source": "En küçük içerik kutusu 32×32 (FavoritesLayout.ts:368 size-10 + p-1). object-contain ile 2:1 logo 32×16 px çizilir = platform logosunun en küçük render'ı (CartSummary.ts:126 sm:h-4 = 16 px) ile aynı okunabilirlik tabanı. 4:1'de 32×8 px = tabanın yarısı, okunmaz. K2 ÖLÇÜMLE ONAYLANDI (docs/reports/08-canli-olcum.md §2.1, 2026-08-18): 18 gerçek logonun 16'sı (%89) 1:2…2:1 bandının İÇİNDE; band dışı yalnız 2 dosya (egemen-plastik, timex-logo — ikisi de w/h = 2,876). §13-K2'nin tetiği ('%20'den fazlası band dışıysa iki-dosya modeline geç') = %11 < %20 → seçenek A yürürlükte, band DEĞİŞMEDİ. Band dışı 2 dosya istisna olarak ele alınır (kare 'mark' sürümü istenir), kural gevşetilmez."
			},
			{
				"rule": "aspect_normalize_to_square",
				"threshold": "1:1",
				"comparator": "pad_to",
				"action": "auto_fix",
				"message_key": null,
				"source": "5 render noktası object-cover kullanıyor ve kare olmayan logoyu MERKEZDEN KIRPIYOR: seller-shop.ts:129 (140×140), seller-dashboard.ts:66 (48×48), seller-dashboard.ts:158 (56×56), StorefrontEdit.vue:79 (80×80), StorefrontLayoutEditor.vue:247 (64×64). 9 nokta object-contain ile kırpmıyor → aynı dosya iki farklı davranış görüyor. Master 1:1'e saydam letterbox ile padlenirse kare kutu × kare kaynak = kırpma matematiksel olarak imkânsız; MEVCUT KODUN TEK SATIRINA dokunulmaz."
			},
			{
				"rule": "data_uri_value",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "data_uri_forbidden",
				"source": "seed_demo_data.py:231-245 _write_asset() SVG'yi data:image/svg+xml;base64 olarak DOĞRUDAN alan değerine yazıyor (:287 → :3364 satıcı logosu). File kaydı açılmadığı için utils/security.py:29-30 ve upload_policy.py:190 kapılarının İKİSİ DE devre dışı. Sonuçlar: (a) alan değeri text (64KB, :237 docstring); (b) seo/og_image.py:59-69 data: URI'yi çözemiyor → og:image sessizce site varsayılanına düşüyor; (c) media/usage.py envanteri File kaydı olmadığı için bu logoları görmüyor. Demo seed muafiyeti utils/security.py:98-109 _SYSTEM_FLAGS desenini kullanmalı."
			},
			{
				"rule": "svg_dtd_or_entity",
				"threshold": true,
				"comparator": "eq",
				"action": "reject",
				"message_key": "svg_dtd_forbidden",
				"source": "XXE / billion-laughs. Entity genişletmesi sanitize'den ÖNCE bellek tüketir; temizlemeye çalışmak yerine reddetmek doğru sıra. Parser defusedxml olmalı — standart xml.etree varsayılan olarak entity çözer. docs/standards/logo.md §6.2 SVG-5."
			},
			{
				"rule": "svg_node_count",
				"threshold": 256,
				"comparator": "gt",
				"action": "reject",
				"message_key": "svg_too_complex",
				"measured_on": "sanitize çıktısı",
				"source": "Ölçüm (regex `<([a-zA-Z][\\w:-]*)`): amex.svg 2, public/vite.svg 11, ta-logo.svg 20 (gerçek kelime markası, 305×46), O1CN..tps-222-221.svg 32, svgviewer-output.svg 75 (otomatik trace edilmiş illüstrasyon), public/icons/ui.svg 463 (çok-ikonlu sprite). 256 = gerçek kelime markasının 12,8 katı, otomatik-trace örneğinin 3,4 katı, sprite'ın altında. İKİNCİL savunma — svgviewer-output.svg yalnız 75 düğüm ama 137695 bayt, tüm ağırlık path d verisinde; bayt tavanı birincil."
			},
			{
				"rule": "svg_empty_after_sanitize",
				"threshold": 0,
				"comparator": "eq",
				"action": "reject",
				"message_key": "svg_empty_after_sanitize",
				"source": "Allowlist temizliği sonrası çizim elementi (path/rect/circle/ellipse/line/polyline/polygon/use) kalmadıysa dosya işlevsiz. Sessizce boş logo kaydetmek yerine ret."
			},
			{
				"rule": "derivative_oversize",
				"threshold": "profiles[].max_bytes",
				"comparator": "gt",
				"action": "warn",
				"message_key": "derivative_oversize",
				"source": "Tavan aşılırsa üretim BAŞARISIZ SAYILMAZ; uyarıyla yazılır ve envantere düşer. Aksi hâlde meşru ama karmaşık bir logo sessizce türevsiz kalırdı."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "reject",
			"master": "warn",
			"quality": "warn",
			"content_rules": "reject",
			"error_code_prefix": "logo",
			"retryable": false,
			"retryable_reason": "upload_policy.py:98-100 kuralı: kullanıcının dosyasıyla ilgili hatalar tekrar denenmez (aynı dosya aynı sonucu verir)"
		},
		"messages": {
			"tr": {
				"too_small": "Logo en az 256×256 piksel olmalı; yüklediğiniz {w}×{h}. Bu boyutta logo mağaza vitrini başlığında (140 piksel kutu) yüksek çözünürlüklü ekranda bulanık çıkar. Logonuzun orijinal dosyasını yükleyin; bir vektör dosyanız (AI, EPS, SVG) varsa oradan 512×512 PNG olarak dışa aktarın.",
				"low_resolution": "Logonuz yüksek çözünürlüklü ekranlarda bulanık görünebilir ({w}×{h}). Önerilen: 512×512 piksel. Bu bir engel değil — logonuz kaydedildi.",
				"aspect_out_of_band": "Logo oranı 1:2 ile 2:1 arasında olmalı; yüklediğiniz {w}:{h}. Mağaza listelerinde logo 32 piksellik kutulara kadar küçülüyor; daha geniş bir logo o kutularda okunmaz hâle gelir. Geniş bir kelime markanız varsa, onun kare (simge) sürümünü yükleyin.",
				"format_no_alpha": "Logonuz saydam zeminli değil. JPEG biçiminde saydamlık olamaz; logonuz mağaza kartlarında gri zemin üzerinde beyaz bir kutu içinde görünecek. Logonuz kaydedildi — bu bir engel değil, uyarı. Düzeltmek için logoyu saydam zeminli PNG veya WebP olarak yeniden kaydedip yükleyin.",
				"format_animated": "Logo animasyonlu olamaz. Tek kareli bir PNG veya WebP yükleyin.",
				"format_not_supported": "{bicim} biçimi logo için kabul edilmiyor. Kabul edilen biçimler: PNG, WebP, JPEG — JPEG saydamlık taşımadığı için kabul edilir ama uyarı üretir. iPhone kullanıyorsanız Ayarlar > Kamera > Biçimler > 'En Uyumlu' seçeneğini işaretleyin ya da logoyu PNG olarak dışa aktarın.",
				"too_large": "Logo dosyası çok büyük ({mb} MB); üst sınır {max_mb} MB. Bir logo, 512×512 pikselde normalde 30 KB'ın altında kalır. Bu boyutta bir dosya büyük olasılıkla fotoğraf ya da gereksiz büyük bir kopya.",
				"svg_dtd_forbidden": "SVG dosyası desteklenmeyen bir yapı içeriyor. Tasarım programınızdan 'sade SVG' / 'optimize SVG' seçeneğiyle yeniden dışa aktarın.",
				"svg_too_complex": "SVG çok karmaşık ({dugum} öğe; üst sınır 256). Bu dosya büyük olasılıkla bir fotoğraftan otomatik olarak vektöre çevrilmiş. Logo olarak tasarlanmış, sadeleştirilmiş bir dosya yükleyin.",
				"svg_empty_after_sanitize": "SVG dosyasında güvenli olmayan içerik temizlendikten sonra çizilecek bir şey kalmadı. Dosya beklenmeyen bir yapıda; PNG olarak yükleyin.",
				"data_uri_forbidden": "Logo bir dosya olarak yüklenmeli; gömülü veri (data: URI) kabul edilmiyor.",
				"derivative_oversize": "Logo kaydedildi, ancak bazı boyutları beklenenden büyük çıktı. Görüntülenmeyi etkilemez; teknik ekip bilgilendirildi."
			}
		},
		"logo": {
			"svg_policy": {
				"enabled": false,
				"enable_requires": "docs/standards/logo.md §6.2 SVG-1…SVG-10 maddelerinin TÜMÜ. Kısmi uygulama sistemi bugünkünden daha güvensiz hâle getirir.",
				"gate_1": "tradehub_core/utils/security.py:27-44 _DENIED_EXTENSIONS içinde '.svg' (:29) ve '.svgz' (:30) → security.py:90-95 frappe.PermissionError",
				"gate_2": "tradehub_core/media/upload_policy.py:190 _DANGEROUS_MARKERS içinde b'<svg' → upload_policy.py:225-231 is_dangerous(); baştaki boşluk ve UTF-8 BOM atlanıyor (:229)",
				"gate_3_open": "seed_demo_data.py:231-245 data: URI kanalı — File kaydı yok, iki gate de devre dışı. SVG logolar demo DB'de ZATEN VAR.",
				"both_gates_must_open_together": true,
				"scope": "slot-kapsamlı; yalnız seller.logo ve brand.logo. Global açılış YASAK. Bugün slot semantiği katmanı YOK (docs/reports/00-upload-slot-envanteri.md §1: 'L3 — Slot semantiği: Sistemde hiç yok') → bu politikayı okuyan kayıt defteri ÖNCE kurulmalı. T-021'in 'KİLİT' olmasının teknik nedeni budur.",
				"sanitize_location": "sunucu, File kaydı yazılmadan ÖNCE. İstemci DOMPurify (tradehubfront ^3.3.2) UX kolaylığı, kapı değil — docs/MEDYA-YUKLEME-SOZLESMESI.md: 'İstemcideki her kontrol hızlandırmak içindir. Karar her zaman sunucunundur.'",
				"stored_content": "sanitize edilmiş sürüm; orijinal DEĞİL",
				"pipeline_order": [
					"1. slot_key logo slotu mu — değilse bugünkü davranış (RET)",
					"2. uzantı .svg mi — .svgz ise RET",
					"3. XML iyi biçimli mi (defusedxml) — değilse RET",
					"4. DTD / ENTITY var mı — varsa RET",
					"5. sanitize (allowlist) çalıştır",
					"6. çıktı düğüm sayısı <= 256 mı — değilse RET",
					"7. çıktı <= 32768 B mi — değilse RET",
					"8. is_dangerous() ATLA — YALNIZ burada, 'sanitize edildi' bayrağına bağlı (uzantıya veya slot adına DEĞİL)",
					"9. File kaydını SANITIZE EDİLMİŞ içerikle aç"
				],
				"is_dangerous_bypass_note": "Sanitize çıktısı tanım gereği '<svg' ile başlar → upload_policy.py:190 marker'ı onu reddeder. Ayrıca aynı listede b'<?xml' de var (:191 civarı) — XML bildirimiyle başlayan meşru SVG de çarpar. Bypass ikisini de kapsar, ama YALNIZ adım 4 geçtikten sonra.",
				"allowed_elements": [
					"svg",
					"g",
					"path",
					"rect",
					"circle",
					"ellipse",
					"line",
					"polyline",
					"polygon",
					"defs",
					"linearGradient",
					"radialGradient",
					"stop",
					"clipPath",
					"mask",
					"use",
					"title",
					"desc",
					"symbol"
				],
				"allowed_attributes": [
					"viewBox",
					"xmlns",
					"width",
					"height",
					"d",
					"x",
					"y",
					"x1",
					"y1",
					"x2",
					"y2",
					"cx",
					"cy",
					"r",
					"rx",
					"ry",
					"points",
					"transform",
					"fill",
					"fill-rule",
					"fill-opacity",
					"stroke",
					"stroke-width",
					"stroke-linecap",
					"stroke-linejoin",
					"stroke-dasharray",
					"stroke-opacity",
					"opacity",
					"offset",
					"stop-color",
					"stop-opacity",
					"gradientUnits",
					"gradientTransform",
					"clip-path",
					"mask",
					"id",
					"class"
				],
				"stripped_with_reason": {
					"script, handler": "doğrudan kod çalıştırma",
					"foreignObject": "içine HTML gömülebilir; gömüldüğü an SVG bir HTML belgesi olur",
					"image": "dış kaynak isteği (SSRF / iz sürme); gömülü base64 raster 'vektör logo' iddiasını yalanlar",
					"style elementi ve style attribute": "background:url(...), @import → CSS ile dış istek. Stil bilgisi fill/stroke presentation attribute'larıyla zaten ifade edilebiliyor",
					"animate, animateTransform, animateMotion, set, discard": "logo animasyonlu olmaz (allow_animated=false ile tutarlı); SMIL geçmişte XSS vektörü",
					"on* attribute'larının tamamı": "allowlist bunları otomatik siler; ayrıca isim-öneki kuralıyla ikinci kez taranır",
					"filter, feImage, fe*": "feImage dış kaynak çekebiliyor; filter zinciri logoda gerekmiyor ve render maliyeti öngörülemez",
					"XML processing instruction, yorum, <!DOCTYPE>, <!ENTITY>": "silinir / RET"
				},
				"href_rule": "yalnız '#' ile başlayan değer korunur (aynı dosya içi <use> referansı). http:, https:, data:, javascript:, protokol-relatif '//', göreli yol → attribute silinir",
				"svgz_allowed": false,
				"svgz_reason": "utils/security.py:30. Gzip'i sanitize'den önce açmak zip-bomb yüzeyi ekler; 32 KiB tavanında kazanç ~20 KB ve HTTP Content-Encoding: gzip aynı tasarrufu zaten sağlıyor.",
				"viewbox_required": true,
				"viewbox_reason": "viewBox yoksa object-contain ölçekleme davranışı tarayıcılar arasında ayrışır. Ölçülen 8 SVG'nin 8'inde de viewBox var.",
				"serving": {
					"img_src_only": true,
					"dom_inline_forbidden": true,
					"dom_inline_reason": "<img> ile yüklenen SVG tarayıcıda script çalıştırmaz — sanitize kaçırsa bile İKİNCİ savunma hattı. Storefront bugün de satıcı logosunu yalnız <img src>/:src ile basıyor (16 render noktasının 16'sı). İnline <svg> olan tek yerler sabit kodlanmış ikonlar (MessageList.ts:9, ManufacturersHero.ts:284). Bu ayrım korunmalı: ne innerHTML, ne Alpine x-html, ne Vue v-html.",
					"content_type": "image/svg+xml",
					"x_content_type_options": "nosniff",
					"content_security_policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
					"verification_note": "MEMORY.md 'prod'a ulaşmamış nginx sertleştirmesi' bulgusu taşıyor → bu başlıklar ÜRETİMDE DOĞRULANMALI (docs/standards/logo.md §12-D6). Doğrulanmadan svg_policy.enabled=true yapılamaz."
				},
				"bundled_svg_out_of_scope": "src/assets/images/ta-logo.svg, public/icons/ui.svg (463 düğüm), public/vite.svg derleme zamanında Vite ile paketleniyor; File kaydı yok, kullanıcı girdisi değil. Yasak yalnız YÜKLENEN dosyaya uygulanır."
			},
			"dark_theme": {
				"variant_required": false,
				"reason": "16 render noktasının 11'i logonun altına açık plaka boyuyor ve bu plakaların HİÇBİRİ dark: varyantı taşımıyor (style.css:19 @variant dark (&:where(.dark, .dark *))) — koyu temada da açık kalıyorlar. Logo her koşulda açık zemin üzerinde. Satıcıdan iki dosya istemek 11 noktada gereksiz, 1 noktada çözülebilir bir sorun için.",
				"rule": "logo her zaman açık bir plaka üzerinde render edilir",
				"violating_render": {
					"id": "S1",
					"file": "tradehubfront/src/pages/seller-shop.ts:124-126",
					"problem": "alt plaka YOK; arka plan satıcının yüklediği header_bg_image (:118-119). Karanlık bir header görseline koyu bir logo binebilir.",
					"status": "bulgu olarak kayıtlı (docs/standards/logo.md §11-F3); düzeltmesi T-021 kapsamı DIŞINDA"
				}
			},
			"css_safe_area": {
				"standard_percent": 8,
				"scope": "yalnız YENİ render noktaları",
				"in_file_percent": 0,
				"reason": "Mevcut 7 nokta padding'i CSS'te ZATEN uyguluyor. Ölçülen kenar-başına yüzdeler: section-registry.ts:750 p-0.5/40 = %5,00; section-registry.ts:621 p-1/56 = %7,14; seller/CompanyProfile.ts:1030 p-1/48 = %8,33; ManufacturerList.ts:245 p-1/48 = %8,33; brand.ts:101 p-3/128 = %9,375; FavoritesLayout.ts:370 p-1/40 = %10,00; brand.ts:101 p-3/96 = %12,50. Medyan %8,33 → standart %8. Dosyaya gömmek çift padding üretir (%8 + %8,33 = %16,3 → 40 px kutuda logo 27 px'e düşer) ve 7 mevcut dosyada CSS değişikliği gerektirir.",
				"exception": "Oran normalizasyonu paddingi SAYDAM pikseldir, görsel kenar boşluğu değil. Logonun kendi kenarı ile canvas kenarı arasına EK boşluk konmaz."
			},
			"render_points": [
				{
					"id": "S1",
					"where": "Mağaza vitrini başlığı (masaüstü, ≥480px)",
					"file": "tradehubfront/src/pages/seller-shop.ts:124-129",
					"outer_box_px": 140,
					"padding_px": 0,
					"content_box_px": 140,
					"fit": "cover",
					"plate": null,
					"dpr": [
						140,
						280,
						420
					],
					"note": "object-cover → KIRPIYOR; alt plaka YOK, arka plan header_bg_image"
				},
				{
					"id": "S2",
					"where": "Mağaza vitrini başlığı (mobil, sm:hidden)",
					"file": "tradehubfront/src/pages/seller-shop.ts:204-207",
					"outer_box_px": 50,
					"padding_px": 0,
					"content_box_px": 50,
					"fit": "contain",
					"plate": "bg-white",
					"dpr": [
						50,
						100,
						150
					]
				},
				{
					"id": "S3",
					"where": "Şirket bilgisi bloğu",
					"file": "tradehubfront/src/components/seller/CompanyInfo.ts:47",
					"outer_box_px": 120,
					"padding_px": 0,
					"content_box_px": 120,
					"fit": "contain",
					"plate": null,
					"dpr": [
						120,
						240,
						360
					],
					"note": "w-[120px] h-auto — TEK serbest yükseklikli nokta"
				},
				{
					"id": "S4",
					"where": "Mağaza 'Tedarikçiye ulaş' yan kutusu",
					"file": "tradehubfront/src/components/seller/CompanyProfile.ts:1029-1030",
					"outer_box_px": 48,
					"padding_px": 4,
					"content_box_px": 40,
					"fit": "contain",
					"plate": "bg-gray-50",
					"dpr": [
						40,
						80,
						120
					]
				},
				{
					"id": "S5",
					"where": "Ürün detay tedarikçi kartı",
					"file": "tradehubfront/src/components/product/CompanyProfile.ts:109",
					"outer_box_px": 64,
					"padding_px": 0,
					"content_box_px": 64,
					"fit": "contain",
					"plate": "bg-white",
					"dpr": [
						64,
						128,
						192
					]
				},
				{
					"id": "S6",
					"where": "Üretici listesi kartı (≥768px lg:)",
					"file": "tradehubfront/src/components/manufacturers/ManufacturerList.ts:242-246",
					"outer_box_px": 50,
					"padding_px": 4,
					"content_box_px": 42,
					"fit": "contain",
					"plate": "bg-gray-50",
					"dpr": [
						42,
						84,
						126
					]
				},
				{
					"id": "S6b",
					"where": "Üretici listesi kartı (<768px)",
					"file": "tradehubfront/src/components/manufacturers/ManufacturerList.ts:242-246",
					"outer_box_px": 48,
					"padding_px": 4,
					"content_box_px": 40,
					"fit": "contain",
					"plate": "bg-gray-50",
					"dpr": [
						40,
						80,
						120
					]
				},
				{
					"id": "S7",
					"where": "Üretici hero 'top ranking' karosu",
					"file": "tradehubfront/src/components/manufacturers/ManufacturersHero.ts:277-279",
					"outer_box_px": 116,
					"padding_px": 0,
					"content_box_px": 116,
					"fit": "contain",
					"plate": "bg-gray-50",
					"dpr": [
						116,
						232,
						348
					]
				},
				{
					"id": "S8",
					"where": "Favoriler — kayıtlı satıcı satırı",
					"file": "tradehubfront/src/components/favorites/FavoritesLayout.ts:368-370",
					"outer_box_px": 40,
					"padding_px": 4,
					"content_box_px": 32,
					"fit": "contain",
					"plate": "bg-gray-50",
					"dpr": [
						32,
						64,
						96
					],
					"note": "EN KÜÇÜK kutu — oran bandını belirleyen nokta"
				},
				{
					"id": "S9",
					"where": "Vitrin şablonu — kişi bilgisi kartı",
					"file": "tradehubfront/src/utils/seller/section-registry.ts:620-621",
					"outer_box_px": 56,
					"padding_px": 4,
					"content_box_px": 48,
					"fit": "contain",
					"plate": "bg-gray-100",
					"dpr": [
						48,
						96,
						144
					]
				},
				{
					"id": "S10",
					"where": "Vitrin şablonu — şirket mini kartı",
					"file": "tradehubfront/src/utils/seller/section-registry.ts:749-750",
					"outer_box_px": 40,
					"padding_px": 2,
					"content_box_px": 36,
					"fit": "contain",
					"plate": "bg-gray-50",
					"dpr": [
						36,
						72,
						108
					]
				},
				{
					"id": "S11",
					"where": "Marka sayfası 'satıcı' rozeti",
					"file": "tradehubfront/src/pages/brand.ts:138",
					"outer_box_px": 16,
					"padding_px": 0,
					"content_box_px": 16,
					"fit": "contain",
					"plate": "bg-white/10",
					"dpr": [
						16,
						32,
						48
					]
				},
				{
					"id": "S12",
					"where": "Satıcı dashboard üst başlık",
					"file": "tradehubfront/src/pages/seller-dashboard.ts:65-66",
					"outer_box_px": 48,
					"padding_px": 0,
					"content_box_px": 48,
					"fit": "cover",
					"plate": "bg-gray-100",
					"dpr": [
						48,
						96,
						144
					],
					"note": "object-cover → KIRPIYOR"
				},
				{
					"id": "S13",
					"where": "Satıcı dashboard hesap formu önizleme",
					"file": "tradehubfront/src/pages/seller-dashboard.ts:157-158",
					"outer_box_px": 56,
					"padding_px": 0,
					"content_box_px": 56,
					"fit": "cover",
					"plate": "bg-gray-50",
					"dpr": [
						56,
						112,
						168
					],
					"note": "object-cover → KIRPIYOR"
				},
				{
					"id": "S14",
					"where": "Admin panel — ASP formu dropzone (kare)",
					"file": "admin-panel/frontend/src/components/upload/ProfileImageDropzone.vue:135 (bağlanma: src/views/doctype/DocTypeFormView.vue:439-451)",
					"outer_box_px": 160,
					"padding_px": 0,
					"content_box_px": 160,
					"fit": "dropzone",
					"plate": null,
					"dpr": [
						160,
						320,
						480
					],
					"note": "EN BÜYÜK TALEP (480 px) — master alt sınırını belirler. recommendedSize metni '400×400' (DocTypeFormView.vue:448) bu standartla ÇELİŞİYOR"
				},
				{
					"id": "S15",
					"where": "Admin panel — Mağaza Ayarları önizleme",
					"file": "admin-panel/frontend/src/views/seller/StorefrontEdit.vue:74-82",
					"outer_box_px": 80,
					"padding_px": 0,
					"content_box_px": 80,
					"fit": "cover",
					"plate": "dashed",
					"dpr": [
						80,
						160,
						240
					],
					"note": "object-cover → KIRPIYOR; accept=\"image/*\", boyut kontrolü YOK"
				},
				{
					"id": "S16",
					"where": "Admin panel — Vitrin düzeni header önizleme",
					"file": "admin-panel/frontend/src/views/seller/StorefrontLayoutEditor.vue:241-249",
					"outer_box_px": 64,
					"padding_px": 0,
					"content_box_px": 64,
					"fit": "cover",
					"plate": "bg-gray-50",
					"dpr": [
						64,
						128,
						192
					],
					"note": "object-cover → KIRPIYOR"
				}
			],
			"not_render_points": [
				{
					"file": "tradehubfront/src/components/product/ProductSellerPanel.ts:122-124",
					"why": "yorumda 'logo 40×40' yazıyor ama kod harf baş harfleri basıyor (sellerInitial); <img> YOK"
				},
				{
					"file": "tradehubfront/src/components/product/MobileLayout.ts:490",
					"why": "sınıf adı pdm-supplier-logo ama içerik baş harfler (si.name.charAt(0))"
				},
				{
					"file": "tradehubfront/src/alpine/messages.ts:97-100",
					"why": "sohbet avatarı satıcı logosu DEĞİL — avatarFor() üçüncü parti https://ui-avatars.com/api/?... URL'i üretiyor. Ayrı bulgu: docs/standards/logo.md §11-F7"
				}
			]
		},
		"sources": {
			"require.min_short_edge=256": "S1 (140 CSS px, seller-shop.ts:124) DPR2 talebi 280; 256 bunu %8,6 açıkla karşılamıyor — görsel olarak fark edilmesi zor, işlevsel olarak kabul edilebilir. 256'nın altında S7 (116 px) DPR2'de (232) sınıra dayanır.",
			"require.recommended_edge=512": "En büyük rung. media/engine.py:117 im.thumbnail() YALNIZ küçültür (engine.py:97 docstring: 'Yalnız downscale — upscale yok'), yani 512 rung'unu doğurabilen tek alt sınır. Bugünkü panel tavsiyesi 400×400 (DocTypeFormView.vue:448) 512 rung'unu ASLA doğurmaz → docs/standards/logo.md §13-K5.",
			"require.max_edge=4096": "media/presets.py:15-17 max_dim değerlerinden (2560/2000/1600) büyük; niyet vektörden export edilmiş büyük PNG'yi reddetmemek ama sınırsız da bırakmamak.",
			"require.aspect_band": "content_rules[aspect_out_of_band].source. ÖLÇÜMLE ONAYLANDI (K2): docs/reports/08-canli-olcum.md §2.1 — 16/18 = %89 band içinde, %11 dışında; §13-K2 tetiği %20 → band 1:2…2:1 olarak KALDI.",
			"require.alpha_channel=optional": "docs/reports/08-canli-olcum.md §2.1 (2026-08-18): 9/18 = %50 JPEG, 4/18 = %22 alfalı → docs/standards/logo.md §13-K1 tetiği (%10) aşıldı, değer 'required'dan 'optional'a indirildi ve yaptırım content_rules[no_alpha_channel].action='warn' oldu. 'optional' burada 'fark etmez' demek DEĞİL: alfasızlık ölçülür, kullanıcıya uyarı gösterilir ve envantere yazılır. Görsel gerekçe: content_rules[no_alpha_channel].source. Motor bu üç modu ZATEN doğru ayırt ediyor: engine.py:169-176 — o mantık logo slotunda yeniden yazılmamalı, çağrılmalı. Alfa korunuyor: tests/test_engine_webp.py:54.",
			"require.max_count=1": "Attach Image alanı tek değer tutuyor (Admin Seller Profile.logo).",
			"accept.mime += image/jpeg": "docs/reports/08-canli-olcum.md §2.2 K1 (2026-08-18): ölçüm %50 JPEG → §13-K1 seçenek B. .jpg/.jpeg rejected_extensions'tan çıkarıldı, mime'a image/jpeg eklendi. format_priority'de EN SONA konuldu ('jpeg_opaque'): kabul edilir ama tavsiye edilmez. Bu tek başına bir gevşetme değil — content_rules[no_alpha_channel] uyarısı ve messages.tr.format_no_alpha metni bedeli kullanıcıya söylüyor.",
			"accept.max_bytes=1048576": "512 × 512 × 4 (RGBA) = 1048576 B — depolanan en büyük master'ın SIKIŞTIRILMAMIŞ boyutu. Kendi ham raster'ından büyük dosya tanım gereği logo değil. Bugünkü fiili tavanlar: upload_policy.py:68 = 25 MB (global), ProfileImageDropzone.vue:123 = 5 MB (istemci), api/v1/identity.py:940-955 = 5 MB. 1 MiB üçünden de dar.",
			"accept.max_bytes_svg=32768": "Ölçüm: tradehubfront/src/assets/images/ta-logo.svg = 12379 B (stat -f %z; gerçek kelime markası, 305×46, 20 düğüm) × 2,65. Karşı örnek — tavansız hâlde ne olduğu: aynı klasörde ta-shield-pattern.svg 105516 B, svgviewer-output.svg 137695 B. İkisi de reddedilir.",
			"accept.mime": "upload_policy.py:57-60 EXTENSIONS görsel kümesinden, logo için DARALTILMIŞ. DÜZELTME 2026-08-18 (K1): .jpg/.jpeg ARTIK DIŞARIDA DEĞİL — alfa yokluğu ret sebebi olmaktan çıkıp uyarıya indi (bkz. accept.mime += image/jpeg girdisi ve content_rules[no_alpha_channel]). Hâlâ dışarıda bırakılanlar ve nedenleri: .gif → engine.py:111-112 animasyonlu atlanıyor + api/seller_media.py:245 WebP dönüşümünden dışarıda; .tif/.tiff/.bmp/.heic → tarayıcı render etmez, ayrıca iki yol ayrışıyor (seller_media WebP'ye çevirir api/seller_media.py:245, runner TIFF'i TIFF bırakır engine.py:126-131); .avif → upload_policy.py:59 izinli AMA engine.py:21 SUPPORTED_FORMATS={JPEG,PNG,WEBP,TIFF} içinde değil → engine.py:109 'unsupported_format', yani AVIF logo bugün AVIF olarak yaşamıyor.",
			"accept.allow_data_uri=false": "content_rules[data_uri_value].source",
			"master.pad_color=transparent": "Ürün görseli slotu #FFFFFF padliyor (product-image.json profiles[].pad_color) — logo için beyaz pad YANLIŞ olurdu: 11 render noktası logoyu gri plaka (bg-gray-50/bg-gray-100) üzerine basıyor, beyaz pad orada görünür kutu bırakır. Saydam pad hem gri hem beyaz plakada doğru.",
			"master.allow_upscale=false": "engine.py:97 docstring 'Yalnız downscale — upscale yok' + :117 im.thumbnail(). Upscale kalite kazandırmaz, yalnız bayt harcar.",
			"master.encoding=lossless": "api/seller_media.py:292 → media/engine.py:148 to_webp(data, quality: int = 80) → :180 im.save(buf,'WEBP',quality=quality,method=4) KAYIPLI. Logonun keskin kenarında halkalanma üretir. Karşılaştırma: engine.py:120-122 PNG yolu kayıpsız ('PNG kayıpsızdır; quality parametresi geçerli değil'). Aynı dosya runner.py:229 yolundan geçse PNG kalır ve kayıpsız olur → İKİ YOL AYRIŞIYOR (docs/standards/logo.md §11-F5).",
			"master.in_file_safe_area_percent=0": "css_safe_area.reason",
			"profiles[].width": "docs/standards/logo.md §3.2 piksel tablosu; her profilin derived_from alanı kendi hesabını taşıyor. 14 farklı içerik kutusunun DPR 1/2/3 kombinasyonu = 42 talep, 5 rung (64/128/256/384/512) ile karşılanıyor — w384, K3'ün 2026-08-19 ölçümüyle eklendi (docs/standards/logo.md §13-K3).",
			"profiles[].max_bytes": "Her profilin byte_reference alanı ölçülen dosyayı gösteriyor (stat -f %z + file). Payların küçük rung'da genişlemesi kasıtlı: ölçülen B/px eğrisi 0,103 (icon-512.png) → 0,220 (icon-128) → 0,578 (icon-48) — küçük ölçekte PNG başlık maliyeti (IHDR + palet + CRC) baytın sabit bir yüzdesini yiyor.",
			"profiles[og1200x630]": "profiles[og1200x630].derived_from ve .fixes",
			"png_fallback_not_generated": "docs/standards/logo.md §13-K4 — KARAR KAPANDI (2026-08-19): seçenek A, yalnız kayıpsız WebP; PNG yedeği ÜRETİLMEZ. Storefront'ta <picture> kullanımı 0 (grep -rni '<picture' src | wc -l → 0, docs/reports/03-render-envanteri.md §0-1) — PNG yedeği 19 render noktasında yeni markup demek. engine.py:151-160 docstring'inin bahsettiği WebP eksikliği ENCODE tarafı (Safari canvas.toBlob), decode değil.",
			"dpr_range=[1,2,3]": "capacitor.config.ts:22 appId 'com.istoc.app' (iOS+Android hedefi tanımlı), :35 preferredContentMode 'mobile'. Modern iPhone ekranları DPR 3. DPR 4 desteklenmiyor — piyasada anlamlı payı olan cihaz yok ve her rung'ı 1,78× büyütürdü.",
			"breakpoints": "tradehubfront/src/style.css:256-260 — bu projede Tailwind varsayılanları EZİLMİŞ: sm=480, md=640, lg=768, xl=1024. Logo kutularında kullanılan kırılımlar: lg:w-[50px] (ManufacturerList.ts:242) → ≥768px; sm:hidden (seller-shop.ts:202) → ≥480px. Çapraz kontrol: docs/reports/03-render-envanteri.md §1.1",
			"profiles[w384]": "docs/standards/logo.md §13-K3 (2026-08-19 ölçümle kapandı, seçenek B). max_bytes 23040 = hesap: 40960 × 384² / 512². Ölçüm: w512 kayıpsız WebP p50 27162 B / max 109172 B, 5/18 dosya 40960 B tavanını aşıyor.",
			"status=draft": "docs/reports/16-t029-politika-aktivasyonu.md — şemanın active kuralı (encoder_quality null 0, kalibre edilmemiş eşik yok) SAĞLANIYOR, ama SRS §6.2 + FR-144 + FR-149 engelliyor; üçü de bu dosyanın dışındaki işler."
		},
		"open_questions": [
			"accept.max_megapixels_hard ALANI YOK — FR-144 (docs/srs/SRS-v1.0.md §3.M) bu dosyayı adıyla sayıyor ve 'alanı olmayan politika active yapılamamalıdır' diyor. 9 politikanın 7'sinde alan var, eksik olan ikisi seller-logo ve brand-logo. Eşik uydurulamaz: FR-143 değerin BELLEK BÜTÇESİNDEN türetilmesini ve sources bloğunda yazılı olmasını istiyor (önerilen 40 MP ≈ 160 MB/çözüm). Not: bu slot piksel bombasına karşı savunmasız DEĞİL — require.max_edge=4096 reddediyor (engine.py:879) — ama alanın varlığı ayrı bir şarttır.",
			"compliance_measured BLOĞU YOK — FR-149 bir politikanın active yapılmasından ÖNCE gerçek veriye uygulanmış uyum karnesini politikanın içinde istiyor ({measured_at, dataset, n, violation_rate, top_violation, enforcement_mode}). Ölçüm ZATEN VAR: seller.logo ihlal oranı %31,6 (n=19, docs/reports/09-slot-bazinda-istatistik.md §3); %10'un üstü olduğu için enforcement_mode 'new_uploads_only' olur. Eksik olan, bloğun ŞEMADA tanımlı olması ve buraya yazılması — ikisi de bu görevin kapsamı dışında.",
			"SLOT KİMLİĞİ SUNUCUYA ULAŞMIYOR — SRS §6.2 'Aşağıdakiler tamamlanmadan hiçbir slot politikası active yapılamaz' listesinin ilk maddesi (FR-001) açık: media/upload_policy.py:307-313 check() imzası slot parametresi taşımıyor (2026-08-19'da okundu). Bu politika active yapılsaydı zorlanacak bir kod yolu bulamazdı; 'active' bir BEYAN olarak kalırdı. Boru hattı bayrakları da 0 (media_pipeline_enabled=0, active_slots='')."
		],
		"production_verification_required": [
			"D1 — Gerçek logo dosyalarının piksel/oran/PIL-mode/bayt dağılımı. require.min_short_edge=256 sert reddi bu çıktı olmadan üretime alınamaz (kaç satıcının logosunu anında geçersiz kılacağı bilinmiyor). Tam betik: docs/standards/logo.md §12-D1",
			"D2 — data: URI logoların gerçek sayısı. seed_demo_data.py:3364 kaynaklı; üretimde 0 olmalı. 0 değilse content_rules[data_uri_value] acil. Tam betik: §12-D2",
			"D3 — Tarayıcıda hesaplanmış (computed) kutu ölçüleri. render_points[].content_box_px değerleri Tailwind sınıfından TÜRETİLDİ, ÖLÇÜLMEDİ. DPR 1/2/3 için ayrı ayrı. Tam betik: §12-D3",
			"D4 — Türev baytlarının gerçek ölçümü (kayıpsız WebP vs PNG, gerçek logolar üzerinde). profiles[].max_bytes tavanlarını onaylar ya da düzeltir; kayıpsız WebP PNG'den küçük ÇIKMIYORSA format_priority'de PNG öne alınmalı. Tam betik: §12-D4",
			"D5 — og:image kırpma hasarının GÖRSEL doğrulaması (%47,5 kesilme beklenir). Tam betik: §12-D5",
			"D6 — SVG servis başlıkları (Content-Type, nosniff, CSP sandbox). svg_policy.enabled=true'nun ön koşulu. Tam betik: §12-D6",
			"D7 — Depolama etkisi. Logolu satıcı sayısı bilinmiyor. Yalnız WebP: 68 + 120 = 188 KiB/logo. docs/reports/06-depolama-maliyet.md ile çapraz kontrol. Tam betik: §12-D7",
			"D8 — Koyu temanın gerçek kullanım oranı + S1 (seller-shop.ts:124, plakasız) noktasının koyu temada ekran görüntüsü. dark_theme.variant_required=false kararının ve F3 bulgusunun ciddiyetini belirler. Tam betik: §12-D8"
		],
		"notes": [
			"KARAR K1 — KAPANDI (2026-08-18, ölçümle). 'JPEG logo RET mi, uyarıyla kabul mü?' → UYARIYLA KABUL + geçiş penceresi (seçenek B). Tetik §13-K1'de önceden yazılıydı: 'JPEG payı %10'u geçerse B'. docs/reports/08-canli-olcum.md §2.1 ölçtü: Admin Seller Profile.logo (27) + Brand.logo (11) = 38 referanstan diskte gerçek dosya olan 18'inin 9'u JPEG = %50; alfa kanallı 4/18 = %22. Öneri A (ret) ölçümle DÜŞTÜ. Bu politikada değişen alanlar: accept.mime (+image/jpeg), accept.extensions (+.jpg/.jpeg), accept.rejected_extensions (−.jpg/.jpeg), accept.format_priority (+jpeg_opaque, en sonda), require.alpha_channel (required → optional), content_rules[no_alpha_channel].action (reject → warn), messages.tr.format_no_alpha (ret metni → uyarı metni), messages.tr.format_not_supported (JPEG eklendi). DEĞİŞMEYEN: 11 render noktasının açık plaka gerekçesi ve S1'in plakasız oluşu — görsel sorun duruyor, yalnız yaptırım sertliği düştü.",
			"KARAR K2 — KAPANDI (2026-08-18, ölçümle). 'Oran bandı 1:2…2:1 mi, 1:4…4:1 + kare mark varyantı mı?' → 1:2…2:1 KALDI (seçenek A onaylandı). Tetik: '%20'den fazlası band dışıysa B'. Ölçüm (docs/reports/08-canli-olcum.md §2.1): 16/18 = %89 band içinde, band dışı 2 dosya (%11) ve ikisi de w/h = 2,876 geniş kelime markası. %11 < %20 → iki-dosya modelinin maliyeti haklı çıkmadı. Bu politikada DEĞİŞEN SAYI YOK: require.aspect_band = {0.5, 2.0} aynen kaldı; yalnız sources ve content_rules[aspect_out_of_band].source ölçüm referansıyla güncellendi. Band dışı 2 dosya istisna olarak (kare 'mark' sürümü istenerek) ele alınır.",
			"KARAR K3 — KAPANDI (2026-08-19, ölçümle). 'Merdiven 4 rung mu (64/128/256/512), 5 rung mu (+384)?' → 5 RUNG (seçenek B). Öneri A (4 rung) ölçümle DÜŞTÜ. Tetik §13-K3'te önceden yazılıydı: '512 rung'unun gerçek baytı 40 KiB tavanına yaklaşıyorsa B'. Dalga A türev üretimini açtığı için §12-D4 koşuldu: 20 referanstan 18'i diskte üretilebildi; w512 kayıpsız WebP gerçek baytı p50 27.162 B (referans icon-512.png 27.128 B), p90 83.522 B, max 109.172 B = tavanın 2,7 katı; 9/18 (%50) referanstan ağır, 5/18 (%28) 40.960 B tavanını AŞIYOR. Tetik iki bağımsız okumadan da sağlandı. Bu politikada değişen: profiles[] dizisine w384 eklendi (max_bytes 23.040 = 40.960 × 384²/512²). En kötü aşırı-servis 1,83× → 1,37×. K3'ÜN ÇÖZMEDİĞİ: en ağır 4 dosya AI üretimi fotoğrafımsı PNG; 384 rung'u 109 KB'lık bir logoyu küçültmez ve max_bytes türevlerde YAPTIRIMSIZ (aşımda yalnız NOTE_OVERSIZE — media/pipeline/image/render.py:934). Kayıplı yedek / içerik kuralı AYRI GÖREV. docs/standards/logo.md §13-K3",
			"KARAR K4 — KAPANDI (2026-08-19, varsayılanda onaylandı). 'PNG yedeği üretilsin mi?' → HAYIR, yalnız kayıpsız WebP (seçenek A; öneriyle aynı, davranış değişmedi). Bu politikada değişen sayı YOK: profiles[].formats zaten yalnız ['webp'] (og1200x630 hariç, o jpeg). docs/standards/logo.md 'VARSAYILANDA ONAYLANAN KARARLAR — 2026-08-19'",
			"KARAR K5 — KAPANDI (2026-08-19, varsayılanda onaylandı). 'Panelin 400×400 tavsiyesi ne olacak?' → 512×512'ye ÇIKARILSIN (seçenek A). Bu politikada değişen sayı YOK: require.recommended_edge zaten 512. Panel metninin (admin-panel DocTypeFormView.vue:448) güncellenmesi AYRI GÖREV ve bu deponun DIŞINDA. O metin düzeltilene kadar 400×400 master 512 rung'unu doğurmaz (media/engine.py:117 upscale yapmaz). docs/standards/logo.md 'VARSAYILANDA ONAYLANAN KARARLAR — 2026-08-19'",
			"KARAR K6 — KAPANDI (2026-08-19, varsayılanda onaylandı). 'min_short_edge=256 sert reddi GEÇMİŞE dönük uygulanacak mı?' → YALNIZ YENİ YÜKLEMELERE (seçenek A). Mevcut logolar dokunulmadan yaşar, envanterde low_resolution işaretlenir. Ölçüm kararı destekliyor: kısa kenarı 256'nın altında olan 1/18 = %5,5 (docs/standards/logo.md §13.0). Bu politikada değişen sayı YOK; değişen, kuralın KAPSAMI — geriye dönük tarama YAPILMAZ. docs/standards/logo.md 'VARSAYILANDA ONAYLANAN KARARLAR — 2026-08-19'",
			"svg_policy.enabled=false → true GEÇİŞİ AÇIK KALAN TEK ÖN KOŞUL DEĞİL, ayrı bir iş kalemidir: docs/standards/logo.md §6.2 SVG-1…SVG-10'un tümü + §12-D6 (nginx Content-Type / nosniff / CSP sandbox başlıkları) doğrulanmadan açılamaz ve en kritik ön koşulu slot kayıt defteridir (notes: upload_policy.check() imzasında slot parametresi yok). Bu madde open_questions'tan çıkarıldı çünkü bu politikanın YÜRÜRLÜKTEKİ değeri (svg_policy.enabled=false) belirsiz değil, KARARLIDIR; madde numaralı bir iş listesine (SVG-1…SVG-10 + D6) bağlıdır.",
			"STATUS = DRAFT KALDI (2026-08-19, T-029). K1–K6'nın altısı da kapandı, encoder_quality null YOK ve şema doğrulaması 9/9 OK — yani ŞEMANIN 'active' kuralı (null encoder_quality + 'kalibre edilmedi' eşiği) bu dosyada SAĞLANIYOR. Buna rağmen 'active' YAPILMADI: SRS'in KENDİ kuralları bunu YASAKLIYOR ve üçü de bu oturumda kod/dosya üzerinde DOĞRULANDI. (1) docs/srs/SRS-v1.0.md §6.2 açık cümle: 'Aşağıdakiler tamamlanmadan hiçbir slot politikası active yapılamaz' — listenin İLK maddesi 'upload_policy.check() slot_key parametresi alıyor (FR-001)' ve bu madde AÇIK: media/upload_policy.py:307-313 imzası (file_name, content, size, media_endpoint) — slot parametresi YOK, yani slot kimliği sunucuya hiç ulaşmıyor ve 'active' zorlanacak bir yol bulamaz. (2) FR-144 bu dosyayı ADIYLA sayıyor: 'her görsel slotunda accept.max_megapixels_hard alanının var olmasını zorunlu kılmalıdır; alanı olmayan politika active YAPILAMAMALIDIR' — bu dosyanın accept bloğunda alan YOK (7/9 politikada var, eksik olan ikisi bu ve brand-logo). ÖLÇÜLEN KARŞI OLGU, kayda geçirilir: FR-144'ün '500 MP'lik bir logo tek bir sayıya bile takılmaz' cümlesi bu slot için TAM DOĞRU DEĞİL — require.max_edge=4096 (policy/engine.py:879, block=require, on_violation.require=reject) 4096'dan uzun kenarlı her dosyayı reddediyor ve 4096²=16,7 MP tavanı fiilen koyuyor. Yine de FR-144 bir ALANIN VARLIĞINI şart koşuyor ve alan yok; eşiğin bellek bütçesinden türetilmesi FR-143'ün işi. (3) FR-149: 'bir slot politikasını active yapmadan ÖNCE, o politikanın gerçek veriye uygulanmış uyum karnesini (compliance_measured) politikanın İÇİNDE taşımalıdır' — bu blok bu dosyada YOK ve şemada da tanımlı değil. Ölçülen karne zaten var: seller.logo ihlal oranı %31,6 (n=19, docs/reports/09-slot-bazinda-istatistik.md §3) > %10 → FR-149'un kuralına göre enforcement_mode 'new_uploads_only' olurdu. ÜÇÜ DE bu politikanın DIŞINDAKİ işlerdir (media/upload_policy.py imzası, şemaya yeni alan, FR-143 eşik türetmesi) ve T-029'un kapsamı dışındadır. docs/reports/16-t029-politika-aktivasyonu.md",
			"Bu politika bugün HİÇBİR kod yolu tarafından okunmuyor. tradehub_core/media/pipeline/ altında bu görevden önce hiçbir dosya yoktu (find media_engine -type f → boş). Ayrıca upload_policy.check() imzasında slot parametresi YOK (media/upload_policy.py:306-312), yani slot kimliği sunucuya hiç ulaşmıyor — docs/reports/00-upload-slot-envanteri.md §1: 'L3 — Slot semantiği (boyut / oran / adet / rol): Sistemde hiç yok'. Politikanın uygulanabilmesi için önce o kimlik taşınmalıdır.",
			"profiles[] üretimi de bugün YOK: bir yükleme → bir dosya. media/engine.py:117 im.thumbnail((max_dim, max_dim)) ve :177 im.thumbnail((1920,1920)) — yükleme anında tek master küçültülüp saklanıyor, türev üretilmiyor (docs/reports/03-render-envanteri.md §0-5).",
			"srcset'i frontend'e yazmak İKİNCİ adımdır. Storefront'ta srcset kullanımı 0, <picture> 0, sizes 0 (docs/reports/03-render-envanteri.md §0-1). Merdiven kurulmadan srcset yazmanın gösterecek ikinci dosyası yok.",
			"Uygulama sırası (bağımlılık zinciri): 1) slot kayıt defteri → 2) logo doğrulama kodları → 3) oran normalizasyonu (1:1 saydam pad) → 4) türev merdiveni (kayıpsız WebP) → 5) og:image logo yolu düzeltmesi → 6) srcset → 7) SVG kabulü. Adım 7 en sonda: SVG kabulü slot-kapsamlı olmak zorunda ve slot kapsamı adım 1'de doğuyor. docs/standards/logo.md §10",
			"Bu görev MEVCUT KOD DOSYALARINI DEĞİŞTİRMEDİ. Açığa çıkan 18 bulgu docs/standards/logo.md §11'de kayıtlı — aralarında: platform logosunun 87×32 olması (F1), header'da koyu tema varyantının bağlanmamış olması (F2), 5 object-cover kırpma noktası (F4), kayıplı WebP dönüşümü (F5), og:image'in logoyu %47,5 kırpması (F13), data: URI SVG kanalı (F14), admin panel favicon 404 (F10).",
			"ŞEMA NOTU: bu dosya tradehub_core/media/pipeline/policy/slots/ altındaki çoğunluk şemasına (product-image.json, product-video.json, company-cover-image.json, category-banner.json) hizalandı. Kardeş dosyalarda 4 farklı şema var (document-attachment.json ve user-avatar.json Türkçe anahtarlar, company-cover-video.json ayrı bir yapı) — kayıt defteri yazılmadan önce tek şemaya indirilmeli."
		]
	},
	"user.avatar": {
		"$schema": "../schema/slot-policy.schema.json",
		"schema_version": "1.0.0",
		"status": "draft",
		"slot_key": "user.avatar",
		"title": "Kullanıcı profil fotoğrafı",
		"description": "Alıcı/satıcı/yönetici profil fotoğrafı. Kod tabanındaki TEK gerçek çift doğrulamalı görsel slotu: uzantı allowlist'i ve 5 MB tavanı hem sunucuda (tradehub_core/api/v1/identity.py:939-953) hem iki ayrı istemcide aynı sayıyla yazılı. Buna karşılık en büyük gerçek kutu 72 CSS px — yani sistemdeki en küçük piksel talebi ve potansiyel olarak en büyük israf oranı burada.",
		"roles": [
			"buyer",
			"seller",
			"admin"
		],
		"bound_to": [
			{
				"doctype": "User",
				"field": "user_image",
				"fieldtype": "Attach Image",
				"source": "tradehub_core/api/v1/identity.py:966 — frappe.db.set_value('User', user, 'user_image', file_doc.file_url). Frappe ÇEKİRDEK doctype'ı olduğu için docs/reports/00-upload-slot-envanteri.md'nin 41 alanlık tradehub_core taramasında çıkmaz (§5 'Kullanıcı avatarı' satırı bunu not ediyor)."
			}
		],
		"accept": {
			"mime": [
				"image/jpeg",
				"image/png",
				"image/webp"
			],
			"extensions": [
				".jpg",
				".jpeg",
				".png",
				".webp"
			],
			"max_bytes": 5242880,
			"max_megapixels_hard": 80,
			"allow_animated": false
		},
		"require": {
			"min_short_edge": 96,
			"min_area": 9216,
			"allowed_ratios": [
				"1:1"
			],
			"ratio_tolerance": 0.02,
			"max_count": 1
		},
		"master": {
			"max_long_edge": 256,
			"min_long_edge": 96,
			"max_megapixels": 0.0655,
			"dpi_out": 72,
			"colorspace": "srgb",
			"format": "webp",
			"orientation": "apply_exif",
			"strip_metadata": {
				"exif": true,
				"gps": true,
				"xmp": true,
				"icc": false
			}
		},
		"quality": {
			"metric": "ssim",
			"target_ssim_per_class": {
				"photo": 0.96,
				"graphic": 0.98
			},
			"reencode_floor_saving_ratio": 0.1
		},
		"profiles": [
			{
				"name": "avatar_96",
				"width": 96,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 82
				},
				"fit": "cover",
				"target_ratio": "1:1",
				"serves": [
					"mesaj balonu avatarı 28px @3x",
					"sohbet/panel başlığı 36px @2x",
					"mesaj listesi 40px @2x",
					"mobil ayarlar avatarı 48px @2x"
				],
				"derived_from": "hesap: max(28 @3x = 84; 36 @2x = 72; 40 @2x = 80; 48 @2x = 96) = 96. Kutular: tradehubfront/src/components/messages/MessageContent.ts:128 (w-7), :81 (w-9), tradehubfront/src/components/messages/MessageList.ts:100 (w-10), tradehubfront/src/components/settings/SettingsLayout.ts:98 (max-sm:size-12)",
				"max_overshoot": 1.14
			},
			{
				"name": "avatar_160",
				"width": 160,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 82
				},
				"fit": "cover",
				"target_ratio": "1:1",
				"serves": [
					"panel IconRail avatarı 36px @3x",
					"mobil ayarlar avatarı 48px @3x",
					"hesap düzenleme avatarı 64px @2x",
					"ayarlar profil başlığı 72px @2x"
				],
				"derived_from": "hesap: max(36 @3x = 108; 48 @3x = 144; 64 @2x = 128; 72 @2x = 144) = 144 → üst basamak 160. Kutular: admin-panel/frontend/src/components/layout/IconRail.vue:45 (w-9), tradehubfront/src/components/settings/SettingsLayout.ts:98 (size-[72px], max-sm:size-12), tradehubfront/src/components/settings/SettingsAccountEdit.ts:223 (w-16)",
				"max_overshoot": 1.11
			},
			{
				"name": "avatar_256",
				"width": 256,
				"formats": [
					"webp"
				],
				"encoder_quality": {
					"webp": 82
				},
				"fit": "cover",
				"target_ratio": "1:1",
				"serves": [
					"ayarlar profil başlığı 72px @3x",
					"hesap düzenleme avatarı 64px @3x",
					"master"
				],
				"derived_from": "hesap: max(72 @3x = 216; 64 @3x = 192) = 216 → üst basamak 256. En büyük avatar kutusu 72 CSS px (tradehubfront/src/components/settings/SettingsLayout.ts:98 size-[72px]); 256 üstünde HİÇBİR avatar yüzeyinin talebi yok.",
				"max_overshoot": 1.19
			}
		],
		"content_rules": [
			{
				"rule": "long_edge",
				"threshold": 256,
				"comparator": "gt",
				"action": "auto_fix",
				"message_key": "kuculttuk",
				"source": "hesap: en büyük gerçek kutu 72 CSS px × DPR3 = 216 → master 256. 256 üstü piksel hiçbir avatar yüzeyinde kullanılamaz. Bugün küçültme YAPILMIYOR (aşağıdaki notes/optimizasyon maddesi)."
			},
			{
				"rule": "is_animated",
				"threshold": true,
				"comparator": "eq",
				"action": "auto_fix",
				"message_key": "animasyon_duruldu",
				"source": "tradehub_core/api/v1/identity.py:939 `.gif`'i KABUL ediyor, ama tradehub_core/media/pipeline.py:106 `if getattr(im, 'is_animated', False): return OptimizeResult(ok=False, reason='animated')` → animasyonlu GIF hiç işlenmez, olduğu gibi saklanır. Aynı kapı media/gates.py:68-69'da da var. Bu politika .gif'i accept listesinden çıkarıyor; mevcut kayıtlar için auto_fix (ilk kare) öneriliyor."
			},
			{
				"rule": "magic_byte_matches_extension",
				"threshold": false,
				"comparator": "eq",
				"action": "reject",
				"message_key": "icerik_uzantiyla_uyusmuyor",
				"source": "tradehub_core/api/v1/identity.py:939-941 yalnız UZANTIYA bakıyor; magic-byte kontrolü YOK. Karşılaştırma: tradehub_core/api/v1/kyb.py:23-58 aynı işi magic-byte ile yapıyor. L0'ın tehlikeli içerik taraması (tradehub_core/media/upload_policy.py:187-224) devrede ama uzantı/içerik eşleşmesini doğrulamıyor (:366-369 yalnız uyarı)."
			},
			{
				"rule": "circle_inscribed_square_fraction",
				"threshold": 0.707,
				"comparator": "lt",
				"action": "warn",
				"message_key": "daire_maskesi",
				"source": "hesap: tüm avatar render'ları rounded-full (daire maske). Bir dairenin içine yazılabilen en büyük karenin kenarı = çap / sqrt(2) = çapın %70,7'si. Yani görselin köşeleri HER ZAMAN maskelenir; yüz/logo merkez %70,7 × %70,7 karesinde olmalı."
			},
			{
				"rule": "optimizer_ran",
				"threshold": false,
				"comparator": "eq",
				"action": "review",
				"message_key": "optimize_edilmedi",
				"source": "tradehub_core/api/v1/identity.py:955-966 — File kaydı DOĞRUDAN açılıyor; engine.optimize() veya engine.to_webp() ÇAĞRILMIYOR. Ayrıca media/gates.py:57 Kapı 1 (presets.py:23 MIN_FILE_SIZE = 200 KB) 200 KB altını zaten atlıyor. Sonuç: 4 MB'lık bir avatar 36 px'lik kutuya 4 MB olarak indirilebilir."
			}
		],
		"on_violation": {
			"default": "reject",
			"accept": "reject",
			"require": "reject",
			"master": "auto_fix",
			"content_rules": "warn",
			"error_code_prefix": "upload",
			"retryable": false
		},
		"messages": {
			"tr": {
				"bicim_desteklenmiyor": "Bu görsel biçimi profil fotoğrafı olarak kabul edilmiyor ({bicim}). JPG, PNG veya WebP seçin ({izinli_bicimler}).",
				"cok_buyuk": "Dosya {mb} MB; sınır {max_mb} MB. Profil fotoğrafı 256×256 pikselden büyük olmasına gerek yok; telefonunuzun kırpma aracıyla küçültüp yükleyin.",
				"cok_kucuk": "Profil fotoğrafı {kisa_kenar} piksel; en az {gerekli_kisa_kenar} piksel gerekiyor. Bu ölçünün altı ayarlar sayfasındaki büyük avatarda bulanık görünür.",
				"kare_degil": "Profil fotoğrafı kare olmalı; şu anki oran {oran}. Fotoğrafı kare kırpın, aksi hâlde kenarlardan otomatik kesilir.",
				"kuculttuk": "Fotoğraf 256×256 piksele küçültüldü. Profil fotoğrafı en büyük 72 piksellik bir alanda gösterildiği için daha yükseği gereksiz veri demek.",
				"animasyon_duruldu": "Hareketli görseller profil fotoğrafı olarak desteklenmiyor; ilk kare alındı. Sabit bir fotoğraf yüklemeniz önerilir.",
				"icerik_uzantiyla_uyusmuyor": "Dosyanın içeriği uzantısıyla uyuşmuyor. Görseli bir görsel düzenleyicide açıp JPG veya PNG olarak yeniden kaydedip yükleyin.",
				"daire_maskesi": "Profil fotoğrafı daire içinde gösteriliyor; köşeler kesilir. Yüzü veya logoyu görselin ortasına, kenarlardan uzak yerleştirin.",
				"optimize_edilmedi": "Profil fotoğrafı sıkıştırılmadan saklandı. Sayfa yükleme süresini etkileyebilir; teknik ekibin bu uca optimizasyon eklemesi gerekiyor."
			}
		},
		"sources": {
			"accept.mime": "tradehubfront/src/alpine/settings.ts:76 `/^image\\/(jpeg|png|webp|gif)$/i` + admin-panel/frontend/src/stores/auth.js:201-206 (aynı regex) + tradehubfront/src/components/settings/SettingsLayout.ts:97 (accept özniteliği). BU POLİTİKA image/gif'i ÇIKARDI — gerekçe content_rules.is_animated kaynağında.",
			"accept.extensions": "tradehub_core/api/v1/identity.py:939 `allowed_ext = ('.jpg', '.jpeg', '.png', '.webp', '.gif')` — bu politika .gif'i çıkardı.",
			"accept.max_bytes": "ÜÇ YERDE AYNI SAYI: tradehub_core/api/v1/identity.py:952-953 (sunucu, 5*1024*1024), tradehubfront/src/alpine/settings.ts:81 (istemci), admin-panel/frontend/src/stores/auth.js:201-206 (panel istemcisi). Kod tabanında bu tutarlılığın olduğu tek slot.",
			"accept.max_megapixels_hard": "tradehub_core/media/pipeline/policy/slots/product-image.json ile aynı (80 MP) — decompression-bomb koruması slot bazlı değişmemeli. Kod tabanında karşılığı YOK.",
			"accept.allow_animated": "tradehub_core/media/pipeline.py:106 ve tradehub_core/media/gates.py:68-69 — motor animasyonlu dosyayı işlemiyor; kabul etmek onu ham hâlde saklamak demek.",
			"require.min_short_edge": "hesap: en büyük gerçek avatar kutusu 72 CSS px (tradehubfront/src/components/settings/SettingsLayout.ts:98 `size-[72px]`). 96, 72'nin üstündeki ilk yuvarlak değer ve 64 px kutusunun (SettingsAccountEdit.ts:223 `w-16`) @1,5x'i.",
			"require.min_area": "hesap: 96 × 96 = 9.216 piksel.",
			"require.allowed_ratios": "Bulunan 9 avatar render'ının TAMAMI kare kutu + rounded-full + object-cover: SettingsLayout.ts:98, SettingsAccountEdit.ts:223,335, MessageList.ts:100, MessageContent.ts:81,128, chat-popup/InboxPanel.ts:71, chat-shared/ChatHeader.ts:31, admin-panel IconRail.vue:45. İstisna yok.",
			"require.ratio_tolerance": "hesap: ±%2 — 256×255 gibi encoder/kırpma yuvarlamalarını geçirir, 4:3'ü geçirmez.",
			"require.max_count": "User.user_image tek alan.",
			"master.max_long_edge": "hesap: 72 CSS px (en büyük kutu) × DPR3 = 216 → üst basamak 256.",
			"master.min_long_edge": "hesap: require.min_short_edge ile aynı (96) — kare slot.",
			"master.max_megapixels": "hesap: 256 × 256 / 1e6 = 0,065536 → aşağı yuvarlanarak 0,0655. Şema invaryantı: 256² / 1e6 = 0,065536 ≥ 0,0655 (yukarı yuvarlansaydı 0,0656 > 0,065536 olur ve invaryant kırılırdı — kare slotlarda yuvarlama YÖNÜ önemli).",
			"master.dpi_out": "Ekran medyası — 72 dpi metadata normalizasyonu.",
			"master.colorspace": "srgb SEÇİMİ: avatarlar mesaj listesinde yan yana diziliyor; farklı gamut'lardan gelen fotoğrafların birbirine göre kayması burada göze çarpar. Mevcut motor davranışı 'preserve' (tradehub_core/media/pipeline.py:114-116).",
			"master.format": "tradehub_core/media/pipeline.py:147-181 to_webp() — sunucu tarafı garanti-WebP zaten var; avatar ucu bunu bugün ÇAĞIRMIYOR (content_rules.optimizer_ran).",
			"master.strip_metadata.gps": "KVKK: profil fotoğrafı genelde telefonla çekiliyor ve GPS koordinatı kullanıcının ev/iş adresini sızdırır. Bugün silinmiyor — avatar ucu engine'e hiç girmediği için EXIF bloğu olduğu gibi saklanıyor (identity.py:955-966).",
			"master.strip_metadata.icc": "false — tradehub_core/media/pipeline.py:11-13 ICC'yi bilinçli koruyor.",
			"profiles[0].width": "hesap: max(28 @3x = 84; 36 @2x = 72; 40 @2x = 80; 48 @2x = 96) = 96",
			"profiles[1].width": "hesap: max(36 @3x = 108; 48 @3x = 144; 64 @2x = 128; 72 @2x = 144) = 144 → 160",
			"profiles[2].width": "hesap: max(72 @3x = 216; 64 @3x = 192) = 216 → 256",
			"profiles[].encoder_quality.webp": "82 SEÇİMİ: tradehub_core/media/presets.py:16 `aggressive` preset quality = 82. Avatar en küçük yüzey ve kalite riski en düşük olan slot; kod tabanında var olan en agresif değer seçildi. ÖLÇÜLMEDİ: 96 px'lik bir avatarda 82 ile 88 arasındaki görsel fark ölçülmedi.",
			"on_violation.require": "reject — diğer slotlarda 'warn' seçilirken burada 'reject': 1:1 dışı bir avatar daire maskede sistematik olarak bozuk görünür ve düzeltmesi kullanıcı için kolaydır (kare kırpma).",
			"on_violation.error_code_prefix": "tradehub_core/media/upload_policy.py:104-139. NOT: identity.py bu sözleşmeyi KULLANMIYOR, düz `frappe.throw` metni fırlatıyor (identity.py:940, :952) — istemci koda değil metne bakmak zorunda.",
			"on_violation.retryable": "tradehub_core/media/upload_policy.py:97-100"
		},
		"open_questions": [
			"User.user_image dolu kaç kayıt var ve dosyaların medyan/p95 BAYT ve PİKSEL boyutu ne? Doğrulama: `frappe.db.count('User', {'user_image': ['is','set']})` + docs/reports/00-upload-slot-envanteri.md §9-M5 betiği (PIL ile boyut okuma), `attached_to_doctype='User'` filtresiyle.",
			"Kaç avatar 256 pikselden büyük? Bu sayı, bu slottaki israfın doğrudan ölçüsü — 72 px'lik bir kutuya inen her fazladan piksel boşa giden bant.",
			"Kaç avatar animasyonlu GIF? Doğrulama: `attached_to_doctype='User'` dosyalarında PIL ile `is_animated` sayımı.",
			"Avatar dosyalarında GPS EXIF bloğu var mı? Doğrulama: `exiftool -gpslatitude -gpslongitude` ya da PIL `_getexif()` ile üretim dosyalarında tarama. KVKK açısından ölçülmesi gereken bir sayı.",
			"profiles[].encoder_quality.webp = 82 kalibre EDİLMEDİ; 96 px'lik bir avatarda 82 ile 88 arasındaki SSIM farkı ölçülmeli.",
			"master.colorspace='srgb' bir DEĞİŞİKLİK önerisi (mevcut 'preserve'); üretim görselleriyle karşılaştırılmadan 'active' edilmemeli."
		],
		"notes": [
			"EN BÜYÜK ÖLÇÜLEBİLİR İSRAF BURADA: tradehub_core/api/v1/identity.py:955-966 File kaydını doğrudan açıyor, engine.optimize()/to_webp() çağrılmıyor. Ayrıca media/gates.py:57 Kapı 1 (presets.py:23 MIN_FILE_SIZE = 200 KB) 200 KB altını zaten atlıyor. Yani 5 MB'lık 4000×3000 bir fotoğraf, 36 px'lik bir sohbet avatarına 5 MB olarak indirilebiliyor. Oran: 4000 / (36 × 3) = 37 kat fazla piksel genişliği.",
			"ZATEN ÇÖZÜLMÜŞ — yeniden tasarlanmayacak: (1) uzantı allowlist + 5 MB SUNUCUDA (identity.py:939-953) — kod tabanında yalnız 3 uçta L1 var, bu onlardan biri; (2) aynı sınır iki istemcide de yazılı ve SAYILAR UYUŞUYOR (settings.ts:76-84, auth.js:201-206); (3) rate limit 10/300 sn (identity.py:921); (4) yükleme sonrası cache-buster `?t=Date.now()` (tradehubfront/src/alpine/settings.ts:126) — avatar değişince tarayıcı eski dosyayı göstermiyor; ileride CDN eklenirse bu sorun ZATEN çözülmüş demektir; (5) File kaydı User'a attach ediliyor (identity.py:962-964) → media/usage.py silme kararında sahipsiz görünmüyor; (6) yükleme ilerleme çubuğu KYC/KYB/SlotDropzone ile aynı UX değerlerinde (settings.ts:89-95 yorumu).",
			"ATTRIBUTE TUTARSIZLIĞI: tradehubfront/src/components/settings/SettingsLayout.ts:99 `width=\"64\" height=\"64\"` yazıyor ama kutu `size-[72px]` (:98). Tarayıcı 64×64 rezerve edip 72×72 boyar. CLS riski yok (kap sabit px) ama attribute yanlış.",
			"AVATAR GÖRSELİ KULLANMAYAN YÜZEY: ürün yorumlarında avatar dosyası hiç inmiyor, baş harf + üretilmiş renk kullanılıyor (tradehubfront/src/components/product/ProductReviews.ts:315). Yani avatar trafiği yorum listelerinde SIFIR.",
			"Bu politika dosyası bugün kod tarafından OKUNMUYOR (tradehub_core/media/upload_policy.py:307-313)."
		]
	}
};

export default SLOT_POLICIES;
