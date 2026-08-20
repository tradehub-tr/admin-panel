// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/media/pipeline/simulator/*.json
// Yeniden üret: npm run sync:simulator
export default {
	"schema_version": "1.0.0",
	"devices": {
		"$comment": "T-110 — Önizleme simülatörünün referans cihaz seti. VERİDİR, koda gömülü değildir.",
		"schema_version": "1.0.0",
		"generated_for": "Faz 11 / T-110",
		"measurement_status": "EMULE_DEGERLER_OLCULMEDI",
		"measurement_note": "Buradaki `css_viewport` ve `dpr` değerleri GERÇEK CİHAZDA ÖLÇÜLMEDİ. Chrome DevTools cihaz listesi, Lighthouse mobil preset'i ve üreticinin yayımladığı teknik özellik sayfalarındaki standart emülasyon değerleridir. Gerçek tarayıcıda `window.innerWidth` bunlardan DAHA KÜÇÜK çıkar: masaüstünde dikey kaydırma çubuğu (~15px) ve mobilde tarayıcı kromu viewport'tan düşer. Simülatör bu farkı UYGULAMAZ — `scrollbar_px` alanı bilgi amaçlıdır, hesaba katılırsa profil seçimi bir basamak aşağı kayabilir. Gerçek ölçüm için docs/ui/faz11-simulator.md §5.",
		"physical_rule": "physical = round(css * dpr). Panelin gerçek piksel sayısı bundan ±2px sapabilir (tarayıcı DPR'yi yuvarlar); sapan cihazlarda `physical_note` vardır.",
		"devices": [
			{
				"id": "iphone-se-3",
				"label": "iPhone SE (3. nesil)",
				"class": "phone",
				"css_viewport": {
					"width": 375,
					"height": 667
				},
				"dpr": 2,
				"physical": {
					"width": 750,
					"height": 1334
				},
				"scrollbar_px": 0,
				"source": "Apple teknik özellikleri (1334×750 @2x) — Chrome DevTools 'iPhone SE' girdisiyle aynı",
				"why": "Hâlâ satılan en dar ekran. srcset merdiveninin ALT ucunu zorlar: 2 sütunlu kart ızgarasında kutu 163px'e iner."
			},
			{
				"id": "galaxy-s23",
				"label": "Samsung Galaxy S23",
				"class": "phone",
				"css_viewport": {
					"width": 360,
					"height": 780
				},
				"dpr": 3,
				"physical": {
					"width": 1080,
					"height": 2340
				},
				"scrollbar_px": 0,
				"source": "Chrome DevTools 'Galaxy S8+/S20' sınıfı 360px CSS genişliği; panel 1080×2340",
				"why": "Android tarafının fiili standardı: 360 CSS px @3x. docs/reports/03-render-envanteri.md'nin tüm tablolarında ilk satır budur."
			},
			{
				"id": "iphone-14",
				"label": "iPhone 14 / 15 / 16",
				"class": "phone",
				"css_viewport": {
					"width": 390,
					"height": 844
				},
				"dpr": 3,
				"physical": {
					"width": 1170,
					"height": 2532
				},
				"scrollbar_px": 0,
				"source": "Apple teknik özellikleri (2532×1170 @3x)",
				"why": "iOS'un en yaygın gövdesi. Ürün detay mobil ana görselinde 390×3 = 1170 piksel talep eder."
			},
			{
				"id": "moto-g-power",
				"label": "Moto G Power (Lighthouse mobil varsayılanı)",
				"class": "phone",
				"css_viewport": {
					"width": 412,
					"height": 823
				},
				"dpr": 1.75,
				"physical": {
					"width": 721,
					"height": 1440
				},
				"scrollbar_px": 0,
				"source": "Lighthouse `--form-factor=mobile` varsayılan ekran emülasyonu (412×823, DPR 1.75)",
				"why": "TAM SAYI OLMAYAN DPR. Lighthouse skorunun üretildiği cihaz budur; CWV raporlarıyla karşılaştırma ancak bu satır üzerinden yapılabilir. 1.75 çarpanı merdivende yarım basamağa denk gelen tek yerdir."
			},
			{
				"id": "iphone-15-pro-max",
				"label": "iPhone 15 / 16 Pro Max",
				"class": "phone",
				"css_viewport": {
					"width": 430,
					"height": 932
				},
				"dpr": 3,
				"physical": {
					"width": 1290,
					"height": 2796
				},
				"scrollbar_px": 0,
				"source": "Apple teknik özellikleri (2796×1290 @3x)",
				"why": "Telefon sınıfının en yüksek piksel talebi: ürün detay mobil ana görselinde 1290 piksel."
			},
			{
				"id": "ipad-mini-6",
				"label": "iPad mini (6. nesil, dikey)",
				"class": "tablet",
				"css_viewport": {
					"width": 744,
					"height": 1133
				},
				"dpr": 2,
				"physical": {
					"width": 1488,
					"height": 2266
				},
				"scrollbar_px": 0,
				"source": "Apple teknik özellikleri (2266×1488 @2x)",
				"why": "768px kırılımının HEMEN ALTINDA. Bu projede `lg:` = 768px olduğu için 744 ile 768 arası düzen değiştirir; merdivenin kırılım kenarındaki davranışını sınar."
			},
			{
				"id": "ipad-pro-11",
				"label": "iPad Pro 11\" (dikey)",
				"class": "tablet",
				"css_viewport": {
					"width": 834,
					"height": 1194
				},
				"dpr": 2,
				"physical": {
					"width": 1668,
					"height": 2388
				},
				"scrollbar_px": 0,
				"source": "Apple teknik özellikleri (2388×1668 @2x)",
				"why": "Ürün detay hâlâ MOBİL düzendedir (eşik 1024px) → ana görsel kutusu = 834 CSS px, @2x = 1668 piksel. Sistemin en yüksek tekil talebi bu sınıftan çıkar."
			},
			{
				"id": "ipad-pro-11-landscape",
				"label": "iPad Pro 11\" (yatay)",
				"class": "tablet",
				"css_viewport": {
					"width": 1194,
					"height": 834
				},
				"dpr": 2,
				"physical": {
					"width": 2388,
					"height": 1668
				},
				"scrollbar_px": 0,
				"source": "Aynı cihaz, yatay yönelim",
				"why": "1024 ile 1280 arasındaki bandın tek temsilcisi: ürün detay MASAÜSTÜ düzenine geçer ama sağ ray hâlâ 300px'tir."
			},
			{
				"id": "surface-pro-9",
				"label": "Surface Pro 9 (tarayıcı tam ekran)",
				"class": "laptop",
				"css_viewport": {
					"width": 1368,
					"height": 912
				},
				"dpr": 1.5,
				"physical": {
					"width": 2052,
					"height": 1368
				},
				"scrollbar_px": 15,
				"source": "Chrome DevTools 'Surface Pro 7' sınıfı 1368×912 @1.5",
				"why": "Windows'ta %150 ölçek fiili varsayılandır ve TAM SAYI OLMAYAN ikinci DPR'dir. 1.5 çarpanı 1280 ile 1920 basamakları arasına düşer."
			},
			{
				"id": "macbook-air-13",
				"label": "MacBook Air 13\" (Retina, varsayılan ölçek)",
				"class": "laptop",
				"css_viewport": {
					"width": 1440,
					"height": 900
				},
				"dpr": 2,
				"physical": {
					"width": 2880,
					"height": 1800
				},
				"scrollbar_px": 15,
				"source": "Apple 'varsayılan olarak 1440×900 gibi görünür' ölçek ayarı",
				"why": "En yaygın dizüstü. docs/reports/03-render-envanteri.md'nin 1440 sütununun cihaz karşılığı."
			},
			{
				"id": "macbook-pro-16",
				"label": "MacBook Pro 16\" (varsayılan ölçek)",
				"class": "laptop",
				"css_viewport": {
					"width": 1728,
					"height": 1117
				},
				"dpr": 2,
				"physical": {
					"width": 3456,
					"height": 2234
				},
				"scrollbar_px": 15,
				"source": "Apple 'varsayılan olarak 1728×1117 gibi görünür' ölçek ayarı",
				"why": "DPR 2 ile en geniş CSS viewport. Kart ızgaralarında @2x talebi burada tavana vurur."
			},
			{
				"id": "desktop-1080p",
				"label": "Masaüstü 1080p (DPR 1)",
				"class": "desktop",
				"css_viewport": {
					"width": 1920,
					"height": 1080
				},
				"dpr": 1,
				"physical": {
					"width": 1920,
					"height": 1080
				},
				"scrollbar_px": 15,
				"source": "Standart 1920×1080 monitör, tarayıcı tam ekran, ölçek %100",
				"why": "Container'ın 1840px max-width'inin devreye girdiği ilk genişlik. DPR 1 olduğu için @1x basamaklarının doğru seçilip seçilmediğini gösteren tek sınıf."
			},
			{
				"id": "desktop-1440p",
				"label": "Masaüstü 1440p (DPR 1)",
				"class": "desktop",
				"css_viewport": {
					"width": 2560,
					"height": 1440
				},
				"dpr": 1,
				"physical": {
					"width": 2560,
					"height": 1440
				},
				"scrollbar_px": 15,
				"source": "Standart 2560×1440 monitör, tarayıcı tam ekran, ölçek %100",
				"why": "Container 1840'ta doyduğu için 1920'ye göre kutu genişlikleri DEĞİŞMEZ. Merdivenin üst ucunda fazladan basamak gerekmediğini kanıtlar."
			}
		]
	},
	"placements": {
		"$comment": "T-111 — 5 sayfa × bölge → profil eşlemesi. Kutu genişlikleri GERÇEK CSS'ten türetildi; her adımın `derived_from` alanı dosya:satır verir.",
		"schema_version": "1.0.0",
		"generated_for": "Faz 11 / T-111",
		"source_report": "docs/reports/03-render-envanteri.md",
		"storefront_root": "/Users/ahmet/Desktop/istoc/tradehubfront/src",
		"measurement_status": "KISMEN_DOGRULANDI_8_BOLGE_15TEN_GERCEK_TARAYICIDA",
		"measurement_note": "Kutu genişlikleri storefront kaynağındaki Tailwind sınıflarından ARİTMETİK olarak türetildi. 2026-08-20'de 15 bölgenin 8'i GERÇEK tarayıcıda getBoundingClientRect() ile doğrulandı (T-115 drift ölçümü, 13 cihaz × 85 ölçüm; ölçüm dosyası admin-panel/frontend/src/lib/media/simulator/__tests__/fixtures/drift-measurements.json, rapor docs/reports/59-fe2-drift-testi.md). Ölçüm dört bölgede sapma buldu (en büyüğü 80,68px) ve dördü de bu dosyada düzeltildi; yeniden ölçümde 85 satırın hiçbiri 2px eşiğini aşmıyor. HÂLÂ DOĞRULANMAMIŞ 7 bölge: home/tailored_grid, listing/brand_grid, product_detail/related_slider, product_detail/lightbox_thumb, cart_checkout/sku_row, cart_checkout/product_item, cart_checkout/drawer_thumb — bunların değerleri hâlâ yalnız CSS'ten türetme. Kaydırma çubuğu (masaüstünde ~15px) hesaba katılmaz. Doğrulama komutu: node scripts/drift-measure.mjs --dist <tradehubfront/dist>",
		"breakpoints": {
			"$comment": "tradehubfront/src/style.css:256-260 — Tailwind varsayılanları EZİLMİŞ. Bu projede lg=768, xl=1024.",
			"xs": 320,
			"sm": 480,
			"md": 640,
			"lg": 768,
			"xl": 1024,
			"2xl": 1536
		},
		"containers": {
			"viewport": {
				"max_width": null,
				"padding": [
					{
						"min_vw": 0,
						"px": 0
					}
				],
				"derived_from": "components/product/MobileLayout.ts:537 — mobil ürün detayının kök sarmalayıcısında yatay padding YOK."
			},
			"boxed": {
				"max_width": 1840,
				"padding": [
					{
						"min_vw": 1536,
						"px": 64
					},
					{
						"min_vw": 0,
						"px": 32
					}
				],
				"derived_from": "style.css:1540-1549 (.container-boxed / .container-wide AYNI) + :249 --container-lg=1840px + :217/:219 --spacing-page-x 16px→32px. Padding border-box olduğu için max-width'in İÇİNDEDİR: içerik = min(1840,W) − 2×pad."
			},
			"pdp_shell": {
				"max_width": 1736,
				"padding": [
					{
						"min_vw": 1280,
						"px": 80
					},
					{
						"min_vw": 0,
						"px": 32
					}
				],
				"derived_from": "pages/product-detail.ts:251 — max-w-[1736px] px-4 min-[1280px]:px-10 (16px→40px tek yan)."
			},
			"pdp_content_col": {
				"base": "pdp_shell",
				"subtract": [
					{
						"min_vw": 1280,
						"px": 410
					},
					{
						"min_vw": 1024,
						"px": 316
					}
				],
				"derived_from": "pages/product-detail.ts:259 — grid-cols-[minmax(0,1fr)_300px] min-[1280px]:_394px, gap-4. Çıkarılan = sağ ray + 16px gap (394+16=410 / 300+16=316)."
			},
			"seller_shell": {
				"max_width": 1200,
				"padding": [
					{
						"min_vw": 768,
						"px": 64
					},
					{
						"min_vw": 0,
						"px": 32
					}
				],
				"derived_from": "pages/seller-shop.ts:120 — max-w-[1200px] mx-auto px-4 lg:px-8 (bu projede lg=768)."
			}
		},
		"pages": [
			{
				"page": "home",
				"title": "Ana sayfa",
				"url": "/",
				"primary_region": "hero_showcase_grid",
				"regions": [
					{
						"region": "hero_showcase_grid",
						"title": "Ürün vitrini ızgarası",
						"slot_key": "product.image",
						"render_point": "R1 (ListingCard) — components/hero/ProductGrid.ts:184-185",
						"lcp_candidate": true,
						"box": [
							{
								"min_vw": 1536,
								"grid": {
									"container": "boxed",
									"subtract_px": 14,
									"cols": 7,
									"gap": 16
								}
							},
							{
								"min_vw": 1024,
								"grid": {
									"container": "boxed",
									"subtract_px": 12,
									"cols": 6,
									"gap": 16
								}
							},
							{
								"min_vw": 768,
								"grid": {
									"container": "boxed",
									"subtract_px": 8,
									"cols": 4,
									"gap": 16
								}
							},
							{
								"min_vw": 640,
								"grid": {
									"container": "boxed",
									"subtract_px": 6,
									"cols": 3,
									"gap": 16
								}
							},
							{
								"min_vw": 0,
								"grid": {
									"container": "boxed",
									"subtract_px": 4,
									"cols": 2,
									"gap": 16
								}
							}
						],
						"derived_from": "components/hero/ProductGrid.ts:184 grid-cols-2 md:3 lg:4 xl:6 2xl:7; gap style.css:580 --product-grid-gap:16px (ProductGrid.ts:185 inline). DÜZELTME (T-115, docs/reports/59): kutu ızgara SÜTUNU değil, kartın kenarlık İÇİ alanıdır — shared/ListingCard.ts:405 sarmalayıcısı `border border-gray-200` taşıyor. Sütun başına 2px (1px×2) düşülür; `subtract_px` toplam olduğu için her adımda 2×cols. Gerçek tarayıcıda 13/13 cihazda sabit −2,00px ölçüldü."
					},
					{
						"region": "top_deals",
						"title": "En İyi Fırsatlar ızgarası",
						"slot_key": "product.image",
						"render_point": "R10 — components/hero/TopDeals.ts:58-65, ızgara :236",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 1920,
								"grid": {
									"container": "boxed",
									"subtract_px": 29.5,
									"cols": 6,
									"gap": 16
								}
							},
							{
								"min_vw": 1440,
								"grid": {
									"container": "boxed",
									"subtract_px": 25.5,
									"cols": 6,
									"gap": 16
								}
							},
							{
								"min_vw": 1000,
								"grid": {
									"container": "boxed",
									"subtract_px": 22.5,
									"cols": 6,
									"gap": 16
								}
							},
							{
								"min_vw": 850,
								"grid": {
									"container": "boxed",
									"subtract_px": 20.2,
									"cols": 5,
									"gap": 16
								}
							},
							{
								"min_vw": 768,
								"grid": {
									"container": "boxed",
									"subtract_px": 19.3,
									"cols": 4,
									"gap": 16
								}
							},
							{
								"min_vw": 550,
								"grid": {
									"container": "boxed",
									"subtract_px": 18,
									"cols": 3,
									"gap": 12
								}
							},
							{
								"min_vw": 480,
								"grid": {
									"container": "boxed",
									"subtract_px": 17,
									"cols": 2,
									"gap": 12
								}
							},
							{
								"min_vw": 0,
								"grid": {
									"container": "boxed",
									"subtract_px": 16,
									"cols": 2,
									"gap": 8
								}
							}
						],
						"derived_from": "components/hero/TopDeals.ts:236 grid-cols-2 min-[550px]:3 lg:4 min-[850px]:5 min-[1000px]:6 + gap-x-2 sm:gap-x-3 lg:gap-x-4 (8/12/16px). DÜZELTME (T-115, docs/reports/59): ızgaranın hemen üstündeki sarmalayıcı (TopDeals.ts:212) `padding: var(--space-card-padding)` taşıyor; katalog bunu hiç düşmüyordu. Token style.css:353'te `clamp(0.5rem, 0.4rem + 0.4vw, 1rem)` — yani iki yan toplamı `clamp(16, 12.8 + 0.008×vw, 32)` px. YAKLAŞIKTIR: bu şema adım fonksiyonu tutar, akışkan (clamp) değer tutamaz; adımlar viewport bantlarına göre seçildi. Ölçülen 13 cihazda kalan hata ≤0,42px (eşik 2px). 1920 ve 1440 adımları YALNIZ bu düşüm için var — sütun sayısı 1000'dekiyle aynı."
					},
					{
						"region": "tailored_grid",
						"title": "Size Özel / Çok Satanlar ızgarası",
						"slot_key": "product.image",
						"render_point": "components/tailored-selections/TailoredProductGrid.ts:22 ve components/top-ranking-category/TopRankingCategoryGrid.ts:50 (aynı sınıf dizisi)",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 1024,
								"grid": {
									"container": "boxed",
									"cols": 5,
									"gap": 16
								}
							},
							{
								"min_vw": 768,
								"grid": {
									"container": "boxed",
									"cols": 4,
									"gap": 16
								}
							},
							{
								"min_vw": 640,
								"grid": {
									"container": "boxed",
									"cols": 3,
									"gap": 12
								}
							},
							{
								"min_vw": 0,
								"grid": {
									"container": "boxed",
									"cols": 2,
									"gap": 12
								}
							}
						],
						"derived_from": "grid-cols-2 sm:2 md:3 lg:4 xl:5 gap-3 lg:gap-4. Doğrulama: §3.4."
					}
				]
			},
			{
				"page": "listing",
				"title": "Ürün listeleme",
				"url": "/pages/products.html",
				"primary_region": "card_grid",
				"regions": [
					{
						"region": "card_grid",
						"title": "Kart ızgarası (filtre kolonu AÇIK)",
						"slot_key": "product.image",
						"render_point": "R1 — components/shared/ListingCard.ts:105, ızgara components/products/ProductListingGrid.ts:94",
						"lcp_candidate": true,
						"box": [
							{
								"min_vw": 1280,
								"grid": {
									"container": "boxed",
									"subtract_px": 280,
									"cols": 5,
									"gap": 16
								}
							},
							{
								"min_vw": 1024,
								"grid": {
									"container": "boxed",
									"subtract_px": 280,
									"cols": 3,
									"gap": 16
								}
							},
							{
								"min_vw": 768,
								"grid": {
									"container": "boxed",
									"subtract_px": 264,
									"cols": 3,
									"gap": 16
								}
							},
							{
								"min_vw": 480,
								"grid": {
									"container": "boxed",
									"subtract_px": 0,
									"cols": 2,
									"gap": 16
								}
							},
							{
								"min_vw": 0,
								"grid": {
									"container": "boxed",
									"subtract_px": 4,
									"cols": 2,
									"gap": 16
								}
							}
						],
						"derived_from": "pages/products.ts:147 container-boxed → :163 flex gap-4 lg:gap-6 → :166 hidden lg:block → components/products/FilterSidebar.ts:557 w-full lg:w-60 xl:w-64 (240/256px) → ProductListingGrid.ts:94 grid-cols-2 lg:3 min-[1280px]:5, gap 16. subtract_px = kenar çubuğu + flex gap (256+24=280 / 240+24=264). Doğrulama: §3.1'in 10 satırı da birebir çıkar. DÜZELTME (T-115, docs/reports/59): 480px ALTINDA kartın kenarlığı var — shared/ListingCard.ts:513 ızgara kipinde `border border-gray-200` ekliyor, :514 ise `min-[480px]:…:border-0` ile geri alıyor. 5 telefonun (360-430px) hepsinde tam −2,00px ölçüldü, 744px ve üstünde sapma ~0. Bu yüzden 480 adımı AYRILDI ve yalnız alt adıma 2px×2sütun = 4px `subtract_px` kondu. Not: 430 ile 744 arasında ölçülen cihaz YOK; 480 sınırı ölçümden değil CSS'ten geliyor.",
						"anomaly": "Kutu viewport ile MONOTON ARTMIYOR: 640'ta 296px, 768'de 146,7px'e DÜŞER (3 sütun + 240px filtre çubuğu aynı anda açılır). `sizes` bu yüzden tek bir `Xvw` ifadesiyle yazılamaz."
					},
					{
						"region": "brand_grid",
						"title": "Marka / kategori ızgarası (filtre kolonu YOK)",
						"slot_key": "product.image",
						"render_point": "pages/brand.ts:404,410 — aynı ProductListingGrid, kenar çubuğusuz",
						"lcp_candidate": true,
						"box": [
							{
								"min_vw": 1280,
								"grid": {
									"container": "boxed",
									"cols": 5,
									"gap": 16
								}
							},
							{
								"min_vw": 768,
								"grid": {
									"container": "boxed",
									"cols": 3,
									"gap": 16
								}
							},
							{
								"min_vw": 0,
								"grid": {
									"container": "boxed",
									"cols": 2,
									"gap": 16
								}
							}
						],
						"derived_from": "§3.4 notu: 1920'de (1776−64)/5 = 342,4px — listeleme yüzeylerinin EN GENİŞ kart kutusu."
					}
				]
			},
			{
				"page": "product_detail",
				"title": "Ürün detay",
				"url": "/urun/<slug>",
				"primary_region": "main_image",
				"layout_switch_vw": 1024,
				"regions": [
					{
						"region": "main_image",
						"title": "Ana görsel (mobil = tam viewport, masaüstü = galeri sütunu)",
						"slot_key": "product.image",
						"render_point": "R2/R6 — components/product/ProductImageGallery.ts:66-75 (≥1024) · components/product/MobileLayout.ts:136,144 (<1024)",
						"lcp_candidate": true,
						"box": [
							{
								"min_vw": 1536,
								"px": 502
							},
							{
								"min_vw": 1280,
								"px": 377
							},
							{
								"min_vw": 1024,
								"px": 300
							},
							{
								"min_vw": 0,
								"vw_pct": 100,
								"container": "viewport"
							}
						],
						"demand_multiplier": [
							{
								"min_vw": 1024,
								"value": 1.85
							},
							{
								"min_vw": 0,
								"value": 1
							}
						],
						"derived_from": "MASAÜSTÜ: pages/product-detail.ts:261 grid-cols-[minmax(0,300px)_1fr] min-[1280px]:[minmax(0,465px)] min-[1536px]:[minmax(0,590px)] − ProductImageGallery.ts:212 min-[1280px]:ps-[88px] karo rayı, sonra ProductImageGallery.ts:246 max-w-[512px] tavanı → min(512, 300/465−88/590−88) = 300/377/502. MOBİL: MobileLayout.ts:136 w-full aspect-square, kök sarmalayıcıda padding yok → kutu = tam viewport. Doğrulama: §3.5 ve §3.6.",
						"multiplier_reason": "ProductImageGallery.ts:22 ZOOM_SCALE=1.85, uygulaması alpine/product.ts:505 transform:scale(1.85). Tarayıcı `sizes`'ı görür, zoom'u GÖRMEZ — bu yüzden çarpan `sizes` üretimine GİRMEZ, yalnız 'seçilen türev zoom'da yeter mi' kontrolünde kullanılır (§3.5b).",
						"code_comment_conflict": "product-detail.ts:255-256 ve ProductImageGallery.ts:239-241 yorumları 'max 560px, 2xl'de 680px' diyor; gerçek sınıf max-w-[512px] (:246). YORUMA DEĞİL SINIFA güvenildi."
					},
					{
						"region": "thumb_rail",
						"title": "Galeri karo rayı",
						"slot_key": "product.image",
						"render_point": "R3 — ProductImageGallery.ts:86 (THUMB_SIZE=70), :103",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 0,
								"px": 70
							}
						],
						"derived_from": "ProductImageGallery.ts:86 THUMB_SIZE=70, :103 p-1 → görünen içerik 62px ama attribute ve kutu 70px. §3.8."
					},
					{
						"region": "lightbox_main",
						"title": "Lightbox ana görseli (yüksekliğe bağlı)",
						"slot_key": "product.image",
						"render_point": "R4 — ProductImageGallery.ts:322-325",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 0,
								"vh_pct": 82,
								"cap_px": 720,
								"minus_px": 84
							}
						],
						"derived_from": "ProductImageGallery.ts:322 #gallery-lightbox-inner yüksekliği min(82vh,720px); alttaki karo kapsülü ≈68px (52px karo + py-2) + gap-4 16px = 84px düşülür; görsel :324 h-full aspect-square → kare kenar. §3.8. TEK YÜKSEKLİĞE BAĞLI BÖLGE — cihazın css_viewport.height alanı burada kullanılır."
					},
					{
						"region": "lightbox_thumb",
						"title": "Lightbox karosu",
						"slot_key": "product.image",
						"render_point": "R5 — ProductImageGallery.ts:339",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 0,
								"px": 52
							}
						],
						"derived_from": "ProductImageGallery.ts:339 [&_.gallery-lightbox-thumb]:!w-[52px] — LIGHTBOX_THUMB_SIZE=76'yı EZER. §3.8."
					},
					{
						"region": "related_slider",
						"title": "İlgili ürünler (Swiper)",
						"slot_key": "product.image",
						"render_point": "R8 — components/product/RelatedProducts.ts:85, kutu :82",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 1280,
								"slider": {
									"container": "pdp_content_col",
									"per_view": 5,
									"space": 16
								}
							},
							{
								"min_vw": 1024,
								"slider": {
									"container": "pdp_content_col",
									"per_view": 4,
									"space": 16
								}
							},
							{
								"min_vw": 960,
								"slider": {
									"container": "boxed",
									"per_view": 4,
									"space": 16
								}
							},
							{
								"min_vw": 640,
								"slider": {
									"container": "boxed",
									"per_view": 3,
									"space": 14
								}
							},
							{
								"min_vw": 480,
								"slider": {
									"container": "boxed",
									"per_view": 2.2,
									"space": 12
								}
							},
							{
								"min_vw": 0,
								"slider": {
									"container": "boxed",
									"per_view": 1.4,
									"space": 12
								}
							}
						],
						"derived_from": "RelatedProducts.ts:247-256 slidesPerView 1.4 / 480:2.2 / 640:3 / 960:4 / 1280:5, spaceBetween 12/12/14/16/16. Swiper formülü: (kapsayıcı − space×(perView−1))/perView.",
						"report_delta": "Bu formül §3.7'nin MASAÜSTÜ satırlarını BİREBİR üretir (1024→157, 1280→145,2, 1440→177,2, 1920→236,4). MOBİL satırlarda rapor ~5px daha küçük değer vermiş (360→226 yerine 230,9); rapor o satırları zaten '≈, ±5px' işaretlemişti. Burada Swiper'ın gerçek formülü kullanıldı."
					}
				]
			},
			{
				"page": "cart_checkout",
				"title": "Sepet ve ödeme",
				"url": "/sepet · /odeme",
				"primary_region": "summary_strip",
				"regions": [
					{
						"region": "summary_strip",
						"title": "Sepet/ödeme özet şeridi",
						"slot_key": "product.image",
						"render_point": "R15 — alpine/cart.ts:639 (/sepet gerçek render noktası)",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 480,
								"px": 64
							},
							{
								"min_vw": 0,
								"px": 56
							}
						],
						"derived_from": "alpine/cart.ts:639 — `w-14 h-14 sm:w-16 sm:h-16`, yani İKİ basamak (56 / 64). DÜZELTME (T-115, docs/reports/59): katalog eskiden components/cart/page/CartSummary.ts:20'ye dayanıyordu ve oradaki `max-[380px]:w-12` (48px) basamağını taşıyordu; ama /sepet sayfası o bileşeni RENDER ETMİYOR. Gerçek tarayıcıda 375px ve 360px'te kutu 56px ölçüldü (katalog 48 diyordu, +8,00px). 380px basamağı kaldırıldı."
					},
					{
						"region": "sku_row",
						"title": "Sepet SKU satırı",
						"slot_key": "product.image",
						"render_point": "R14 — components/cart/molecules/SkuRow.ts:24, kutu :36",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 480,
								"px": 40
							},
							{
								"min_vw": 0,
								"px": 36
							}
						],
						"derived_from": "SkuRow.ts:36 — 36×36, sm(480)+ 40×40. §3.8."
					},
					{
						"region": "product_item",
						"title": "Sepet ürün başlığı",
						"slot_key": "product.image",
						"render_point": "R13 — components/cart/molecules/ProductItem.ts:84",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 480,
								"px": 60
							},
							{
								"min_vw": 0,
								"px": 40
							}
						],
						"derived_from": "ProductItem.ts:84 — 40×40, sm(480)+ 60×60. §3.8."
					},
					{
						"region": "drawer_thumb",
						"title": "Sepet çekmecesi karosu",
						"slot_key": "product.image",
						"render_point": "R16 — alpine/cart.ts:639-640",
						"lcp_candidate": false,
						"box": [
							{
								"min_vw": 480,
								"px": 64
							},
							{
								"min_vw": 0,
								"px": 56
							}
						],
						"derived_from": "alpine/cart.ts:639 w-14 h-14 sm:w-16 sm:h-16 (56/64px). §3.8. NOT: bu tek render noktasında width/height attribute'u YOK — sabit kutu içinde olduğu için CLS üretmez ama düzeltilmeli."
					}
				]
			},
			{
				"page": "seller_shop",
				"title": "Mağaza (satıcı vitrini)",
				"url": "/magaza/<slug>",
				"primary_region": "product_grid",
				"regions": [
					{
						"region": "product_grid",
						"title": "Mağaza ürün ızgarası",
						"slot_key": "product.image",
						"render_point": "R18 — components/seller/CompanyProfile.ts:806, ızgara :802",
						"lcp_candidate": true,
						"box": [
							{
								"min_vw": 1024,
								"grid": {
									"container": "seller_shell",
									"subtract_px": 290,
									"cols": 4,
									"gap": 16
								}
							},
							{
								"min_vw": 768,
								"grid": {
									"container": "seller_shell",
									"subtract_px": 274,
									"cols": 3,
									"gap": 16
								}
							},
							{
								"min_vw": 480,
								"grid": {
									"container": "seller_shell",
									"subtract_px": 34,
									"cols": 3,
									"gap": 16
								}
							},
							{
								"min_vw": 0,
								"grid": {
									"container": "seller_shell",
									"subtract_px": 34,
									"cols": 2,
									"gap": 16
								}
							}
						],
						"derived_from": "pages/seller-shop.ts:120 max-w-[1200px] px-4 lg:px-8 → CompanyProfile.ts:786 kart p-4 xl:p-6 → :802 grid-cols-2 sm:3 xl:4 gap-4. DÜZELTME (T-115, docs/reports/59): katalog mağaza sayfasının SOL KENAR ÇUBUĞUNU hiç modellememişti. Gerçek tarayıcı ölçümünden çözülen düşüm zinciri — kenar çubuğu + boşluk = 240px (768px ve üstünde, `lg:flex-row` devreye girince), kartın kenarlığı = 2px (her bantta), kart dolgusu = 32px (p-4) / 48px (xl:p-6). Toplam: 32+2=34 (<768) · 32+2+240=274 (768-1023) · 48+2+240=290 (≥1024). 768 adımı YENİ: kenar çubuğu 480 adımının ortasında devreye giriyordu. Ölçülen 12 cihazın 12'sinde kalan hata ≤0,02px. Not: ölçüm /magaza/<slug> üzerinde yapıldı (CompanyProfile orada render ediliyor)."
					}
				]
			}
		],
		"excluded_regions": [
			{
				"region": "home/category_bento",
				"render_point": "R12 — components/category/CategoryShowcase.ts:154, ızgara :245",
				"slot_key": "category.banner",
				"reason": "Sütun sayısı çalışma anında `colCls`/`twoXlColCls` değişkenlerinden geliyor (CategoryShowcase.ts:245); statik okumayla kutu genişliği ÇIKARILAMAZ. Satır yüksekliği (85/145/210px) biliniyor ama karo `cover` olduğu için genişlik bağlayıcı. OLCULMEDI."
			},
			{
				"region": "home/recommendation_slider",
				"render_point": "R11 — components/hero/RecommendationSlider.ts:38-45, slayt :52",
				"slot_key": "product.image",
				"reason": "RecommendationSlider.ts:141 `slidesPerView:\"auto\"` ile :52 `xl:!w-[260px]` (!important) 1024–1279 bandında ÇAKIŞIYOR: Swiper sayısal perView (3) uygularken sınıf genişliği ezmeye çalışıyor. Hangisinin kazandığı ancak tarayıcıda görülür. OLCULMEDI."
			},
			{
				"region": "seller_shop/template_tiles",
				"render_point": "R19 — utils/seller/section-registry.ts:280,389,414",
				"slot_key": "product.image",
				"reason": "Mağaza şablon motorunun bölüm genişlikleri Storefront Layout JSON'undan (Long Text alan) geliyor; kaynakta sabit CSS yok. Ayrıca bu render noktalarında width/height ve decoding attribute'ları da eksik (§5). OLCULMEDI."
			}
		]
	},
	"poster": {
		"width": 1280,
		"format": "webp",
		"maxBytes": 122880,
		"qualityLadder": [
			78,
			70,
			62
		],
		"windowStartS": 0.5,
		"windowEndExpr": "min(5, duration_s * 0.25)",
		"thumbnailFrames": 120,
		"brightnessGate": {
			"min_luma_pct": 6,
			"max_luma_pct": 94
		},
		"maxRetries": 1,
		"onFinalFailure": "video_poster_unresolved"
	}
};
