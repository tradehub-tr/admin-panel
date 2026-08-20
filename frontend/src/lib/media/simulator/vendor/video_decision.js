// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/media/pipeline/policy/video_decision.json
// Kararlar tradehub_core/media/pipeline/video/decision.py KOŞTURULARAK üretildi.
// Yeniden üret: npm run sync:simulator   (ya da: node scripts/sync-simulator.mjs --video)
export default {
	"schema_version": "1.0.0",
	"source": {
		"tablo": "tradehub_core/tradehub_core/media/pipeline/policy/video_decision.json",
		"motor": "tradehub_core/tradehub_core/media/pipeline/video/decision.py",
		"kunyeKorpusu": "tradehub_core/tradehub_core/tests/fixtures/media/live-probe.json",
		"tabloSurumu": "1.0.0",
		"tabloDurumu": "draft",
		"olcum": "2026-08-18, istoc-dev-backend-1, ffmpeg/ffprobe 5.1.9-0+deb12u1",
		"kunyeOrtami": "istoc-dev-backend-1",
		"kunyeNotu": "Bu blok KONTEYNERDE ölçüldü (istoc-dev-backend-1), yerel makinede değil.",
		"bugunkuHat": {
			"NEEDS_TRANSCODE_MAX_WIDTH": 1280,
			"NEEDS_TRANSCODE_MAX_BITRATE": 2500000
		},
		"bugunkuHatKaynagi": "/home/frappe/frappe-bench/apps/tradehub_core/tradehub_core/media/transcode.py"
	},
	"actions": {
		"PASSTHROUGH": {
			"meaning": "Dosyaya DOKUNULMAZ. Kaynak zaten teslim edilebilir: H.264/yuv420p, mp4 kabı, moov başta, çözünürlük ve bitrate tavan altında, kodlama verimli.",
			"writes_new_file": false,
			"today": "transcode.needs_transcode() False dalı — durum doğrudan `ready` yapılıyor (transcode.py:186-191)."
		},
		"REMUX": {
			"meaning": "Akışlar YENİDEN KODLANMAZ (-c copy), yalnız kap/atom düzeni düzeltilir: mp4'e taşı ve moov'u başa al (+faststart).",
			"writes_new_file": true,
			"reencodes": false,
			"today": "YOK. Bugün ya tam transcode var ya hiçbir şey; bir .mov ya da moov'u sonda olan bir .mp4 için tek seçenek VP9'a tam yeniden kodlamaktı — saniyeler süren bir kopyalama işi yerine dakikalar süren bir kodlama."
		},
		"TRANSCODE": {
			"meaning": "Tam yeniden kodlama. Hedef: H.264 High + AAC 128k + faststart (targets.h264_primary).",
			"writes_new_file": true,
			"reencodes": true,
			"gate": "INV-05 fayda kapısı — çıktı kaynaktan en az min_saving_ratio kadar küçük değilse ÇIKTI ATILIR, kaynak korunur."
		},
		"REJECT": {
			"meaning": "Hat bu dosyayı işlemez. Kullanıcıya kodlu hata döner.",
			"writes_new_file": false,
			"note": "REJECT yalnız motorun kendi sınırıdır (ölçülemeyen, video akışı olmayan, 4K üstü, 15 dk üstü). Slot düzeyindeki süre/oran/bayt kuralları BURADA DEĞİL PolicyEngine'dedir (tradehub_core/media/pipeline/policy/engine.py) — iki yerde tekrar yazılmaz (NFR-046)."
		}
	},
	"operators": [
		"eq",
		"ne",
		"lt",
		"lte",
		"gt",
		"gte",
		"in",
		"not_in"
	],
	"variables": {
		"measured": {
			"type": "bool",
			"source": "ffprobe çalıştı ve video akışı bulundu mu"
		},
		"has_video": {
			"type": "bool",
			"source": "ffprobe streams[] içinde codec_type=video var mı"
		},
		"width": {
			"type": "int",
			"source": "stream.width"
		},
		"height": {
			"type": "int",
			"source": "stream.height"
		},
		"pixels": {
			"type": "int",
			"source": "width × height"
		},
		"long_edge": {
			"type": "int",
			"source": "max(width, height)"
		},
		"short_edge": {
			"type": "int",
			"source": "min(width, height)"
		},
		"duration_s": {
			"type": "float",
			"source": "format.duration"
		},
		"fps": {
			"type": "float",
			"source": "stream.avg_frame_rate (kesir çözülür); 0 ise r_frame_rate"
		},
		"video_codec": {
			"type": "str",
			"source": "stream.codec_name"
		},
		"video_profile": {
			"type": "str",
			"source": "stream.profile"
		},
		"pix_fmt": {
			"type": "str",
			"source": "stream.pix_fmt"
		},
		"video_bitrate_bps": {
			"type": "int",
			"source": "stream.bit_rate; yoksa format.bit_rate − audio.bit_rate"
		},
		"format_bitrate_bps": {
			"type": "int",
			"source": "format.bit_rate"
		},
		"bpp": {
			"type": "float",
			"source": "video_bitrate_bps / (width × height × fps)",
			"meaning": "Piksel başına bit. Çözünürlükten ve kare hızından BAĞIMSIZ verimlilik ölçüsü — 8 Mbps 4K verimli, 8 Mbps 720p israftır; ham bitrate bu ikisini ayıramaz.",
			"measured_reference": "FAZ 7 ölçümü (7 fixture): verimli 720p 0,0278 · 1080p 0,0290 · sessiz 720p 0,0362 · dikey 9:16 0,0330 · 540 sn 320×240 0,0765 · kare 352 0,1256 · şişirilmiş 720p 0,2973",
			"threshold_note": "Eşik 0,08 seçildi: ölçülen verimli örneklerin (0,028-0,036) 2 katının üstünde, şişirilmiş örneğin (0,297) çok altında. TEK BAŞINA yetmez — küçük çözünürlükte bpp doğal olarak yükselir (352×352 örneği 0,1256 ama toplam 389 kbps). Bu yüzden kural mutlak bitrate tabanıyla (1,2 Mbps) VE'lenir."
		},
		"container": {
			"type": "str",
			"source": "format.format_name (ham)"
		},
		"container_family": {
			"type": "str",
			"source": "mp4 | webm | matroska | quicktime | other"
		},
		"has_audio": {
			"type": "bool",
			"source": "streams[] içinde codec_type=audio var mı"
		},
		"audio_codec": {
			"type": "str",
			"source": "ses akışı codec_name; yoksa boş string"
		},
		"audio_bitrate_bps": {
			"type": "int",
			"source": "ses akışı bit_rate; yoksa 0"
		},
		"audio_channels": {
			"type": "int",
			"source": "ses akışı channels; yoksa 0"
		},
		"moov_at_end": {
			"type": "bool",
			"source": "ISOBMFF üst düzey atom taraması (saf Python, ffprobe gerekmez): mdat, moov'dan ÖNCE geliyorsa true",
			"meaning": "true → aşamalı indirmede oynatıcı oynatmaya başlamadan önce dosyanın SONUNU indirmek zorunda. mp4 dışı kaplarda anlamsız, false döner."
		},
		"size_bytes": {
			"type": "int",
			"source": "os.path.getsize"
		},
		"rotation": {
			"type": "int",
			"source": "stream.side_data_list[].rotation; yoksa 0"
		},
		"nb_streams": {
			"type": "int",
			"source": "format.nb_streams"
		}
	},
	"rules": [
		{
			"id": "probe_unavailable",
			"action": "REJECT",
			"code": "video_probe_failed",
			"reason": "ffprobe künyeyi okuyamadı — dosya bozuk, kap tanınmıyor ya da ffprobe yok.",
			"when": {
				"var": "measured",
				"op": "eq",
				"value": false
			},
			"notes": {
				"diverges_from_today": "transcode.needs_transcode() bu durumda True döner (güvenli taraf = transcode et). Karar tablosu REDDEDER: künyesi okunamayan dosyanın slot kurallarından (süre, oran, çözünürlük) geçtiği DOĞRULANAMAZ, dolayısıyla kabul edilmesi güvenli taraf değildir. Değişiklik bilinçlidir ve tek satırla geri alınabilir (action: TRANSCODE)."
			}
		},
		{
			"id": "no_video_stream",
			"action": "REJECT",
			"code": "video_no_stream",
			"reason": "Dosyada video akışı yok (yalnız ses ya da yalnız kapak görseli).",
			"when": {
				"var": "has_video",
				"op": "eq",
				"value": false
			},
			"notes": {}
		},
		{
			"id": "resolution_over_max",
			"action": "REJECT",
			"code": "video_resolution_over_max",
			"reason": "4K üstü kare. Teslim her hâlükârda 1280 genişliğe iniyor; 4K üstünü kabul etmenin görsel karşılığı yok, kod çözme maliyeti gerçek.",
			"when": {
				"any": [
					{
						"var": "width",
						"op": "gt",
						"value": 3840
					},
					{
						"var": "height",
						"op": "gt",
						"value": 2160
					}
				]
			},
			"notes": {
				"source": "tradehub_core/media/pipeline/policy/slots/product-video.json video.resolution_max (3840×2160)"
			}
		},
		{
			"id": "duration_over_engine_max",
			"action": "REJECT",
			"code": "video_duration_over_max",
			"reason": "15 dakika üstü. Bu MOTOR sınırıdır (tek ffmpeg koşumunun kuyruk zaman aşımına sığması), slot kuralı değil.",
			"when": {
				"var": "duration_s",
				"op": "gt",
				"value": 900
			},
			"notes": {
				"note": "Canlıda ölçülen en uzun video 540 sn (9 dk) — bu kural bugünkü hiçbir dosyayı reddetmez. Slot düzeyindeki süre tavanı (product.video: 33 sn) PolicyEngine'in işidir; orada `warn`, burada `REJECT` olması çelişki değil: motor işleyebiliyorsa işler, slot uygunluğu ayrı bir sorudur."
			}
		},
		{
			"id": "codec_not_deliverable",
			"action": "TRANSCODE",
			"code": "video_codec_not_deliverable",
			"reason": "Hedef kodek H.264. HEVC/AV1/VP8/MPEG-4/ProRes gibi kaynaklar yeniden kodlanır.",
			"when": {
				"var": "video_codec",
				"op": "not_in",
				"value": [
					"h264"
				]
			},
			"notes": {
				"note": "vp9 de bu kurala TAKILIR ve H.264'e döner — bugünkü hattın VP9 çıktısı Safari'de <video> ile oynamıyor (targets.h264_primary.why_h264_not_vp9)."
			}
		},
		{
			"id": "pix_fmt_not_web",
			"action": "TRANSCODE",
			"code": "video_pix_fmt_not_web",
			"reason": "10-bit ya da 4:2:2/4:4:4 örnekleme donanım kod çözücülerin büyük kısmında düşer; yuv420p'ye indirilir.",
			"when": {
				"var": "pix_fmt",
				"op": "not_in",
				"value": [
					"yuv420p",
					"yuvj420p"
				]
			},
			"notes": {}
		},
		{
			"id": "width_over_cap",
			"action": "TRANSCODE",
			"code": "video_width_over_cap",
			"reason": "Genişlik teslim tavanının üstünde.",
			"when": {
				"var": "width",
				"op": "gt",
				"value": 1280
			},
			"notes": {
				"source": "tradehub_core/media/transcode.py:98 NEEDS_TRANSCODE_MAX_WIDTH = 1280 — KORUNUYOR, sayı değişmedi."
			}
		},
		{
			"id": "bitrate_over_cap",
			"action": "TRANSCODE",
			"code": "video_bitrate_over_cap",
			"reason": "Bitrate teslim tavanının üstünde.",
			"when": {
				"var": "video_bitrate_bps",
				"op": "gt",
				"value": 2500000
			},
			"notes": {
				"source": "tradehub_core/media/transcode.py:99 NEEDS_TRANSCODE_MAX_BITRATE = 2_500_000 — KORUNUYOR, sayı değişmedi."
			}
		},
		{
			"id": "fps_over_cap",
			"action": "TRANSCODE",
			"code": "video_fps_over_cap",
			"reason": "50/60 fps aynı kalitede ~%80 fazla bit harcar; B2B içeriğinde (fabrika turu, ürün çevresi tur) görsel kazancı yok. Çıktı 30 fps'e indirilir.",
			"when": {
				"var": "fps",
				"op": "gt",
				"value": 30
			},
			"notes": {
				"source": "tradehub_core/media/pipeline/policy/slots/company-cover-video.json video.frame_rate.output_cap = 30",
				"gap_today": "transcode.py fps'e HİÇ bakmıyor — 60 fps bir video, genişlik ve bitrate eşiklerinin altındaysa bugün dokunulmadan geçiyor."
			}
		},
		{
			"id": "inefficient_encoding",
			"action": "TRANSCODE",
			"code": "video_inefficient_encoding",
			"reason": "Piksel başına bit tavanın üstünde VE mutlak bitrate kazanç eşiğinin üstünde — yeniden kodlamanın bayt kazancı gerçek.",
			"when": {
				"all": [
					{
						"var": "bpp",
						"op": "gt",
						"value": 0.08
					},
					{
						"var": "video_bitrate_bps",
						"op": "gt",
						"value": 1200000
					}
				]
			},
			"notes": {
				"gap_today": "transcode.py'de verimlilik ölçüsü YOK. 2,4 Mbps'lik bir 640×360 video (bpp 0,35 — ölçülen şişirilmiş örnekten bile kötü) bugün iki eşiğin de altında kaldığı için dokunulmadan geçiyor.",
				"why_two_conditions": "Yalnız bpp'ye bakmak 352×352 / 389 kbps fixture'ını (bpp 0,1256) transcode kuyruğuna sokardı: kazanılacak toplam bayt 294 KB'ın küçük bir kısmı, harcanacak CPU aynı. Mutlak taban bu boşa işi keser."
			}
		},
		{
			"id": "audio_codec_not_deliverable",
			"action": "TRANSCODE",
			"code": "video_audio_codec_not_deliverable",
			"reason": "mp4 kabında güvenle taşınan ses kodekleri AAC ve MP3. Opus/Vorbis/PCM/AC-3 yeniden kodlanır (AAC 128k).",
			"when": {
				"all": [
					{
						"var": "has_audio",
						"op": "eq",
						"value": true
					},
					{
						"var": "audio_codec",
						"op": "not_in",
						"value": [
							"aac",
							"mp3"
						]
					}
				]
			},
			"notes": {
				"note": "Bugünkü hat TERSİNİ yapıyor: ÇIKTIYA libopus yazıyor (transcode.py:359-360) ve `-b:a` vermediği için bitrate ffmpeg varsayılanına bağlı."
			}
		},
		{
			"id": "audio_bitrate_over_cap",
			"action": "TRANSCODE",
			"code": "video_audio_bitrate_over_cap",
			"reason": "192 kbps üstü ses B2B tanıtım videosunda duyulur bir kazanç sağlamaz; 128 kbps'e indirilir.",
			"when": {
				"all": [
					{
						"var": "has_audio",
						"op": "eq",
						"value": true
					},
					{
						"var": "audio_bitrate_bps",
						"op": "gt",
						"value": 192000
					}
				]
			},
			"notes": {}
		},
		{
			"id": "container_not_mp4",
			"action": "REMUX",
			"code": "video_container_not_mp4",
			"reason": "Akışlar teslim edilebilir ama kap değil (mkv/mov/webm). Yeniden kodlama GEREKMEZ — akışlar kopyalanarak mp4'e taşınır.",
			"when": {
				"var": "container_family",
				"op": "ne",
				"value": "mp4"
			},
			"notes": {
				"cost": "saniyeler (I/O sınırlı), tam transcode ise dakikalar (CPU sınırlı)"
			}
		},
		{
			"id": "moov_at_end",
			"action": "REMUX",
			"code": "video_moov_at_end",
			"reason": "moov atomu dosyanın SONUNDA. Aşamalı indirmede oynatıcı ilk kareyi göstermeden önce tüm dosyayı indirmek zorunda kalır. -movflags +faststart ile atom başa alınır.",
			"when": {
				"var": "moov_at_end",
				"op": "eq",
				"value": true
			},
			"notes": {
				"measured": "FAZ 7 ölçümü: 7 fixture'ın 7'sinde de moov ZATEN BAŞTA (atom sırası ftyp, moov, free, mdat) — bu kural fixture korpusunda tetiklenmiyor, sentetik `-movflags` verilmeden üretilmiş bir dosyayla doğrulandı."
			}
		},
		{
			"id": "extra_streams",
			"action": "REMUX",
			"code": "video_extra_streams",
			"reason": "İkiden fazla akış (ikinci ses dili, altyazı, kapak görseli, veri akışı). Teslimde yalnız ilk video + ilk ses taşınır; fazlası indirilen bayta karışır.",
			"when": {
				"all": [
					{
						"var": "has_audio",
						"op": "eq",
						"value": true
					},
					{
						"var": "nb_streams",
						"op": "gt",
						"value": 2
					}
				]
			},
			"notes": {}
		}
	],
	"fallbackRule": {
		"action": "PASSTHROUGH",
		"code": "video_already_deliverable",
		"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir."
	},
	"benefitGate": {
		"id": "INV-05",
		"min_saving_ratio": 0.1,
		"meaning": "Çıktı, kaynağın en fazla %90'ı kadar olmalı. Değilse ÇIKTI ATILIR ve kaynak korunur.",
		"why": "Bugün böyle bir kapı YOK: _run_transcode sonucu koşulsuz yerine yazıyor (transcode.py:366 os.replace). Zaten iyi sıkıştırılmış bir kaynağı yeniden kodlamak dosyayı BÜYÜTEBİLİR ve her hâlükârda kalite kaybettirir; kapı olmadan bu sessizce oluyor.",
		"source": "tradehub_core/media/presets.py MIN_SAVING_RATIO — görsel yolunda uygulanıyor, video yolunda UYGULANMIYOR (product-video.json video.transcode.size_gate_missing_today)",
		"exempt_actions": [
			"REMUX"
		],
		"exempt_reason": "REMUX'un amacı bayt kazanmak değil, ilk kareyi hızlandırmak. +faststart dosyayı birkaç KB BÜYÜTEBİLİR ve bu doğru sonuçtur.",
		"fallback": {
			"action": "REMUX",
			"enabled": true,
			"deliverable_video_codecs": [
				"h264"
			],
			"deliverable_audio_codecs": [
				"aac",
				"mp3",
				""
			],
			"why": [
				"ÖLÇÜLMÜŞ KUSUR (B-2): kapıdan düşen TRANSCODE, aynı dosyanın REMUX ihtiyacını da öldürüyordu. Gerçek örnek (2026-08-19): 1280×720 / 140,6 kbps / 540 sn kaynak — moov atomu SONDA. Kural moov_at_end REMUX diyor; ama dosya bir TRANSCODE kuralına da takılsaydı (60 fps, verimsiz kodlama, kap) kapıdan düşen çıktı atılıyor ve moov SONDA KALIYORDU. Geri çekilme yolu yoktu.",
				"Düzeltme: TRANSCODE fayda kapısından düşerse ve kaynağın kap/moov kusuru DURUYORSA, hat REMUX'a geri çekilir. REMUX kapıdan zaten muaf olduğu için bu ikinci koşum her zaman teslim edilebilir bir dosya bırakır.",
				"KOŞUL: akışlar zaten teslim edilebilir olmalı. VP9/WebM bir kaynağı -c copy ile mp4'e taşımak, tarayıcıda oynamayan bir dosya üretir — kap düzelir, oynatma bozulur. Bu yüzden geri çekilme yalnız deliverable_video_codecs/deliverable_audio_codecs listesindeki akışlar için yapılır; aksi halde kaynak DOKUNULMADAN korunur."
			]
		}
	},
	"qualityGate": {
		"id": "T-072/3-4",
		"vmaf_min": 93,
		"max_duration_delta_s": 0.1,
		"vmaf_note": "GÜNCELLENDİ (2026-08-20, W7): yeni imajdaki ffmpeg n8.1.2 libvmaf'LI (vmaf_available() → True, ölçüldü). Eşik artık transcode() içindeki kalite kapısında UYGULANIYOR: fayda kapısını geçen çıktı VMAF < vmaf_min ise ATILIR ve kaynak korunur (REMUX'a geri çekilme kuralları aynen geçerli). libvmaf'sız bir imajda kapı UYGULANMAZ ve sonuç notuna 'VMAF OLCULEMEDI' yazılır — sahte VMAF üretilmez. ESKİ NOT (2026-08-19, ffmpeg 5.1.9): imaj libvmaf'sızdı, eşik yalnız kâğıt üstündeydi. İlk gerçek ölçümler: şişirilmiş 720p fixture transcode'u 96,63 (GEÇER), gerçek DEV videosu LST-04043 sondası 89,34 (GEÇMEZ — rapor 81 §3.4); eşik kararı tablo sahibinin, buradan değiştirilmedi.",
		"duration_note": "Kaynak ile çıktının süresi arasındaki fark. 100 ms üstü fark ses/görüntü senkronunun kaydığının ya da kuyruk karelerin düştüğünün işaretidir. Ölçülür ve kayda geçer; çıktı bu yüzden ATILMAZ — süresi 120 ms sapmış bir dosya, hiç dosya olmamasından iyidir. Karar çağıranındır."
	},
	"target": {
		"id": "video_1280_h264",
		"maxWidth": 1280,
		"container": "mp4",
		"videoCodec": "libx264",
		"profile": "high",
		"level": "4.0",
		"crf": 23,
		"preset": "medium",
		"rateControl": "capped_crf",
		"maxrateKbps": 2500,
		"minMaxrateKbps": 300,
		"budgetFromBenefitGate": true,
		"frameRateCap": 30,
		"faststart": true,
		"audioCodec": "aac",
		"audioBitrateKbps": 128,
		"rateControlWhy": [
			"İLK KOŞUM SABİT CRF 23 İLE YAPILDI VE TEK DOSYA YOLUNDA HIZ DENETİMİ YOKTU. Gerçek kütüphanede ölçüldü (ffmpeg 5.1.9, 2026-08-19, 7 gerçek dosya): 1920×1080 / 1.152,7 kbps / 58,2 sn kaynak 8.504.902 B iken CRF 23 çıktısı 14.490.432 B — kaynaktan %70,4 BÜYÜK. VP9/WebM 1280×720 / 958,2 kbps kaynak 1.200.300 B iken çıktı 1.432.145 B (%19,3 büyük). İkisi de INV-05 fayda kapısından düştü; yani hat gerçek kütüphanede hiçbir şey üretmiyordu.",
			"Sebep: CRF bir KALİTE hedefidir, bayt tavanı değil. Kaynak zaten hedef kaliteden DÜŞÜK bir bitrate'te kodlanmışsa (telefonla çekilmiş, bir kez daha sıkıştırılmış içerik) CRF 23 kaynaktan daha çok bit harcar. HLS yolunda bu tuzak zaten görülmüş ve capped-CRF ile çözülmüştü (hls.rate_control_why); tek dosya yolunda düzeltme UYGULANMAMIŞTI.",
			"Düzeltme: capped CRF, tavanı INV-05'ten TÜRETİLMİŞ. Tavan = kaynak toplam bitrate × (1 − min_saving_ratio) − çıktı ses bitrate'i; mutlak tavan maxrate_kbps, taban min_maxrate_kbps. Kapının izin verdiği EN YÜKSEK kaliteyi verir: daha aşağısı gereksiz kalite kaybı, daha yukarısı kapıdan düşmek. Sabit bir çarpan (ör. kaynağın 0,75 katı) ses payını göremez ve sessiz kaynakta bütçeyi boşa harcar — gerekçe rate_ceiling_kbps docstring'inde.",
			"min_maxrate_kbps=300 tabanı KASITLI: 200 kbps'lik bir kaynağı 150 kbps tavana sıkıştırmak bloklaşma üretir. Taban yüzünden kapıyı geçemeyen dosya ATILIR ve kaynak korunur — bu doğru sonuçtur, kazanılacak bayt zaten yoktur.",
			"'crf' değeri eski (tavansız) davranışı geri getirir; karşılaştırma ölçümü docs/reports/39-t072-video-hatti.md §2'de."
		],
		"whyH264NotVp9": [
			"Doküman H.264 istiyor; bugünkü hat VP9/WebM üretiyor (transcode.py:357-360 libvpx-vp9 + libopus). FARK BİLİNÇLİ ve gerekçesi üç maddedir:",
			"1) UYUMLULUK: VP9/WebM Safari'de <video> ile güvenilir oynamıyor (macOS'ta kısmi, iOS'ta yok). Ürün videosu B2B alıcının telefonunda oynamak zorunda; oynamayan bir video sıfır bayt tasarrufundan kötüdür.",
			"2) YANLIŞ ETİKET: bugünkü hat WebM baytlarını .mp4 uzantılı ADRESE yazıyor (transcode.py:344 dst_path = src_path + '.transcoding.webm' → :366 os.replace(dst_path, src_path)). nginx Content-Type'ı uzantıdan türettiği için video/mp4 başlığıyla WebM baytı servis ediliyor. H.264/mp4 hedefi bu uyuşmazlığı kaynağında bitirir.",
			"3) DONANIM: H.264 kod çözme her telefonda donanımda; VP9 orta segment Android'de yazılımda — pil ve ısı maliyeti alıcıda.",
			"BEDELİ: aynı kalitede H.264, VP9'dan ~%20-30 daha büyük dosya üretir. Bu bedel bilinçli ödeniyor. Gelecekte iki çıktı birden (mp4 birincil + webm ikincil <source>) üretilebilir; bu tabloda targets.webm_fallback olarak yer tutucu var, FAZ 7'de ÜRETİLMİYOR."
		]
	},
	"engine": {
		"evaluator": "tradehub_core/media/pipeline/video/decision.py",
		"gate": "tradehub_core/media/pipeline/video/transcode.py",
		"rule_count": 15,
		"schema_version": "1.0.0",
		"table": "tradehub_core/media/pipeline/policy/video_decision.json",
		"variable_names": [
			"audio_bitrate_bps",
			"audio_channels",
			"audio_codec",
			"bpp",
			"container",
			"container_family",
			"duration_s",
			"format_bitrate_bps",
			"fps",
			"has_audio",
			"has_video",
			"height",
			"long_edge",
			"measured",
			"moov_at_end",
			"nb_streams",
			"pix_fmt",
			"pixels",
			"rotation",
			"short_edge",
			"size_bytes",
			"video_bitrate_bps",
			"video_codec",
			"video_profile",
			"width"
		]
	},
	"vectors": [
		{
			"benefit_gate": {
				"max_output_bytes": 2528324,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 595,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 2809249
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "real_satici_720x720_28s.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.04546,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 28,
				"format_bitrate_bps": 803000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 720,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 518400,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 2809249,
				"video_bitrate_bps": 707000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 720
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 8660282,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 300,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 9622536
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "real_uretim_h264_1280.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "",
				"bpp": 0.0051,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 540,
				"format_bitrate_bps": 143000,
				"fps": 30,
				"has_audio": false,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 9622536,
				"video_bitrate_bps": 141000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 105097,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 300,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 116775
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "real_uretim_preview_480.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "",
				"bpp": 0.021991,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 156000,
				"fps": 30,
				"has_audio": false,
				"has_video": true,
				"height": 480,
				"long_edge": 480,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 230400,
				"rotation": 0,
				"short_edge": 480,
				"size_bytes": 116775,
				"video_bitrate_bps": 152000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 480
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 1018231,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 1357,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 1131368
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_width_over_cap",
				"reason": "Genişlik teslim tavanının üstünde.",
				"rule_id": "width_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_16x9_1080p.mp4",
			"today_needs_transcode": true,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "",
				"bpp": 0.029032,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 1508000,
				"fps": 25,
				"has_audio": false,
				"has_video": true,
				"height": 1080,
				"long_edge": 1920,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 2073600,
				"rotation": 0,
				"short_edge": 1080,
				"size_bytes": 1131368,
				"video_bitrate_bps": 1505000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1920
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 5663019,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 2500,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 6292244
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_bitrate_over_cap",
				"reason": "Bitrate teslim tavanının üstünde.",
				"rule_id": "bitrate_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_bloated_720p_8m.mp4",
			"today_needs_transcode": true,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.298358,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 8390000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 6292244,
				"video_bitrate_bps": 8249000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_efficient_720p_750k.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 3590931,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 300,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 3989924
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_long_540s_320x240.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "",
				"bpp": 0.076823,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 540,
				"format_bitrate_bps": 59000,
				"fps": 10,
				"has_audio": false,
				"has_video": true,
				"height": 240,
				"long_edge": 320,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 76800,
				"rotation": 0,
				"short_edge": 240,
				"size_bytes": 3989924,
				"video_bitrate_bps": 59000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 320
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 7654411,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 924,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 8504902
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_width_over_cap",
				"reason": "Genişlik teslim tavanının üstünde.",
				"rule_id": "width_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_real_seller_1080p_2997fps.mp4",
			"today_needs_transcode": true,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.018553,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 58.2,
				"format_bitrate_bps": 1169000,
				"fps": 29.97002997002997,
				"has_audio": true,
				"has_video": true,
				"height": 1080,
				"long_edge": 1920,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 2073600,
				"rotation": 0,
				"short_edge": 1080,
				"size_bytes": 8504902,
				"video_bitrate_bps": 1153000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1920
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 754361,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 754,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 838179
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_silent_noaudio_720p.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "",
				"bpp": 0.036241,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 8,
				"format_bitrate_bps": 838000,
				"fps": 25,
				"has_audio": false,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 838179,
				"video_bitrate_bps": 835000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 264915,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 353,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 294350
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_square_352.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "",
				"bpp": 0.125581,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 392000,
				"fps": 25,
				"has_audio": false,
				"has_video": true,
				"height": 352,
				"long_edge": 352,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 123904,
				"rotation": 0,
				"short_edge": 352,
				"size_bytes": 294350,
				"video_bitrate_bps": 389000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 352
			}
		},
		{
			"benefit_gate": {
				"max_output_bytes": 915993,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 788,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 1017771
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"kind": "measured",
			"name": "video_vertical_9x16.mp4",
			"today_needs_transcode": false,
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.03295,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 8,
				"format_bitrate_bps": 1018000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 1280,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 1017771,
				"video_bitrate_bps": 911000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 720
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kunye olculemedi",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REJECT",
				"code": "video_probe_failed",
				"reason": "ffprobe künyeyi okuyamadı — dosya bozuk, kap tanınmıyor ya da ffprobe yok.",
				"rule_id": "probe_unavailable",
				"trace": [
					[
						"probe_unavailable",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "probe_unavailable",
			"kind": "synthetic",
			"mutation": [
				{
					"from": true,
					"to": false,
					"var": "measured"
				}
			],
			"mutation_why": "ffprobe kunyeyi okuyamadi",
			"name": "probe_unavailable",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": false,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REJECT",
				"code": "video_no_stream",
				"reason": "Dosyada video akışı yok (yalnız ses ya da yalnız kapak görseli).",
				"rule_id": "no_video_stream",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "no_video_stream",
			"kind": "synthetic",
			"mutation": [
				{
					"from": true,
					"to": false,
					"var": "has_video"
				}
			],
			"mutation_why": "dosyada video akisi yok",
			"name": "no_video_stream",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": false,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REJECT",
				"code": "video_resolution_over_max",
				"reason": "4K üstü kare. Teslim her hâlükârda 1280 genişliğe iniyor; 4K üstünü kabul etmenin görsel karşılığı yok, kod çözme maliyeti gerçek.",
				"rule_id": "resolution_over_max",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "resolution_over_max",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 720,
					"to": 2160,
					"var": "height"
				},
				{
					"from": 1280,
					"to": 4096,
					"var": "width"
				}
			],
			"mutation_why": "4K ustu kare (esik 3840x2160)",
			"name": "resolution_over_max",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.003003,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 2160,
				"long_edge": 4096,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 8847360,
				"rotation": 0,
				"short_edge": 2160,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 4096
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REJECT",
				"code": "video_duration_over_max",
				"reason": "15 dakika üstü. Bu MOTOR sınırıdır (tek ffmpeg koşumunun kuyruk zaman aşımına sığması), slot kuralı değil.",
				"rule_id": "duration_over_engine_max",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "duration_over_engine_max",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 6,
					"to": 901,
					"var": "duration_s"
				}
			],
			"mutation_why": "15 dk ustu (esik 900 sn)",
			"name": "duration_over_engine_max",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 901,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_codec_not_deliverable",
				"reason": "Hedef kodek H.264. HEVC/AV1/VP8/MPEG-4/ProRes gibi kaynaklar yeniden kodlanır.",
				"rule_id": "codec_not_deliverable",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "codec_not_deliverable",
			"kind": "synthetic",
			"mutation": [
				{
					"from": "h264",
					"to": "hevc",
					"var": "video_codec"
				}
			],
			"mutation_why": "H.264 disi kodek",
			"name": "codec_not_deliverable",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "hevc",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_pix_fmt_not_web",
				"reason": "10-bit ya da 4:2:2/4:4:4 örnekleme donanım kod çözücülerin büyük kısmında düşer; yuv420p'ye indirilir.",
				"rule_id": "pix_fmt_not_web",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "pix_fmt_not_web",
			"kind": "synthetic",
			"mutation": [
				{
					"from": "yuv420p",
					"to": "yuv422p10le",
					"var": "pix_fmt"
				}
			],
			"mutation_why": "10-bit 4:2:2 ornekleme",
			"name": "pix_fmt_not_web",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv422p10le",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_width_over_cap",
				"reason": "Genişlik teslim tavanının üstünde.",
				"rule_id": "width_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "width_over_cap",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 720,
					"to": 1080,
					"var": "height"
				},
				{
					"from": 1280,
					"to": 1920,
					"var": "width"
				}
			],
			"mutation_why": "genislik 1280 tavaninin ustunde",
			"name": "width_over_cap",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.012812,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 1080,
				"long_edge": 1920,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 2073600,
				"rotation": 0,
				"short_edge": 1080,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1920
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 2308,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_bitrate_over_cap",
				"reason": "Bitrate teslim tavanının üstünde.",
				"rule_id": "bitrate_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "bitrate_over_cap",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 904000,
					"to": 2707000,
					"var": "format_bitrate_bps"
				},
				{
					"from": 797000,
					"to": 2600000,
					"var": "video_bitrate_bps"
				}
			],
			"mutation_why": "video bitrate 2,5 Mbps tavaninin ustunde",
			"name": "bitrate_over_cap",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.094039,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 2707000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 2600000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_fps_over_cap",
				"reason": "50/60 fps aynı kalitede ~%80 fazla bit harcar; B2B içeriğinde (fabrika turu, ürün çevresi tur) görsel kazancı yok. Çıktı 30 fps'e indirilir.",
				"rule_id": "fps_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "fps_over_cap",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 30,
					"to": 60,
					"var": "fps"
				}
			],
			"mutation_why": "60 fps — tavan 30",
			"name": "fps_over_cap",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.014413,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 60,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 2128,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_inefficient_encoding",
				"reason": "Piksel başına bit tavanın üstünde VE mutlak bitrate kazanç eşiğinin üstünde — yeniden kodlamanın bayt kazancı gerçek.",
				"rule_id": "inefficient_encoding",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "inefficient_encoding",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 904000,
					"to": 2507000,
					"var": "format_bitrate_bps"
				},
				{
					"from": 720,
					"to": 360,
					"var": "height"
				},
				{
					"from": 797000,
					"to": 2400000,
					"var": "video_bitrate_bps"
				},
				{
					"from": 1280,
					"to": 640,
					"var": "width"
				}
			],
			"mutation_why": "tablonun gap_today ornegi: 640x360 / 2,4 Mbps (bpp 0,35) bugun iki esigin de altinda kaliyor",
			"name": "inefficient_encoding",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.347222,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 2507000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 360,
				"long_edge": 640,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 230400,
				"rotation": 0,
				"short_edge": 360,
				"size_bytes": 677639,
				"video_bitrate_bps": 2400000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 640
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_audio_codec_not_deliverable",
				"reason": "mp4 kabında güvenle taşınan ses kodekleri AAC ve MP3. Opus/Vorbis/PCM/AC-3 yeniden kodlanır (AAC 128k).",
				"rule_id": "audio_codec_not_deliverable",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "audio_codec_not_deliverable",
			"kind": "synthetic",
			"mutation": [
				{
					"from": "aac",
					"to": "opus",
					"var": "audio_codec"
				}
			],
			"mutation_why": "mp4 kabinda tasinmayan ses kodegi",
			"name": "audio_codec_not_deliverable",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "opus",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "TRANSCODE",
				"code": "video_audio_bitrate_over_cap",
				"reason": "192 kbps üstü ses B2B tanıtım videosunda duyulur bir kazanç sağlamaz; 128 kbps'e indirilir.",
				"rule_id": "audio_bitrate_over_cap",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						true
					]
				]
			},
			"defaulted": [
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "audio_bitrate_over_cap",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 0,
					"to": 256000,
					"var": "audio_bitrate_bps"
				}
			],
			"mutation_why": "256 kbps ses — tavan 192",
			"name": "audio_bitrate_over_cap",
			"variables": {
				"audio_bitrate_bps": 256000,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": true,
				"remux_fallback_reason": "kap mp4 degil (matroska)",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REMUX",
				"code": "video_container_not_mp4",
				"reason": "Akışlar teslim edilebilir ama kap değil (mkv/mov/webm). Yeniden kodlama GEREKMEZ — akışlar kopyalanarak mp4'e taşınır.",
				"rule_id": "container_not_mp4",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "container_not_mp4",
			"kind": "synthetic",
			"mutation": [
				{
					"from": "mov,mp4,m4a,3gp,3g2,mj2",
					"to": "matroska,webm",
					"var": "container"
				},
				{
					"from": "mp4",
					"to": "matroska",
					"var": "container_family"
				}
			],
			"mutation_why": "akislar teslim edilebilir, kap degil",
			"name": "container_not_mp4",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "matroska,webm",
				"container_family": "matroska",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": true,
				"remux_fallback_reason": "moov atomu SONDA",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REMUX",
				"code": "video_moov_at_end",
				"reason": "moov atomu dosyanın SONUNDA. Aşamalı indirmede oynatıcı ilk kareyi göstermeden önce tüm dosyayı indirmek zorunda kalır. -movflags +faststart ile atom başa alınır.",
				"rule_id": "moov_at_end",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "moov_at_end",
			"kind": "synthetic",
			"mutation": [
				{
					"from": false,
					"to": true,
					"var": "moov_at_end"
				}
			],
			"mutation_why": "moov atomu dosyanin SONUNDA",
			"name": "moov_at_end",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": true,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "REMUX",
				"code": "video_extra_streams",
				"reason": "İkiden fazla akış (ikinci ses dili, altyazı, kapak görseli, veri akışı). Teslimde yalnız ilk video + ilk ses taşınır; fazlası indirilen bayta karışır.",
				"rule_id": "extra_streams",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						true
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "extra_streams",
			"kind": "synthetic",
			"mutation": [
				{
					"from": 0,
					"to": 3,
					"var": "nb_streams"
				}
			],
			"mutation_why": "ikiden fazla akis (altyazi / ikinci ses / kapak)",
			"name": "extra_streams",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 3,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		},
		{
			"base": "video_efficient_720p_750k.mp4",
			"benefit_gate": {
				"max_output_bytes": 609875,
				"min_saving_ratio": 0.1,
				"rate_ceiling_kbps": 686,
				"remux_fallback_applies": false,
				"remux_fallback_reason": "kaynakta kap/moov kusuru yok — REMUX bir sey duzeltmez",
				"src_bytes": 677639
			},
			"decision": {
				"action": "PASSTHROUGH",
				"code": "video_already_deliverable",
				"reason": "Hiçbir kural eşleşmedi: kaynak H.264/yuv420p, mp4, moov başta, 1280 genişlik ve 2,5 Mbps altında, 30 fps'i aşmıyor, kodlaması verimli. Dokunmak bayt kazandırmaz, kalite kaybettirir.",
				"rule_id": "default",
				"trace": [
					[
						"probe_unavailable",
						false
					],
					[
						"no_video_stream",
						false
					],
					[
						"resolution_over_max",
						false
					],
					[
						"duration_over_engine_max",
						false
					],
					[
						"codec_not_deliverable",
						false
					],
					[
						"pix_fmt_not_web",
						false
					],
					[
						"width_over_cap",
						false
					],
					[
						"bitrate_over_cap",
						false
					],
					[
						"fps_over_cap",
						false
					],
					[
						"inefficient_encoding",
						false
					],
					[
						"audio_codec_not_deliverable",
						false
					],
					[
						"audio_bitrate_over_cap",
						false
					],
					[
						"container_not_mp4",
						false
					],
					[
						"moov_at_end",
						false
					],
					[
						"extra_streams",
						false
					]
				]
			},
			"defaulted": [
				"audio_bitrate_bps",
				"audio_channels",
				"moov_at_end",
				"nb_streams",
				"rotation",
				"video_profile"
			],
			"derived": [
				"pixels",
				"long_edge",
				"short_edge",
				"bpp"
			],
			"expects_rule": "default",
			"kind": "synthetic",
			"mutation": [],
			"mutation_why": "hicbir kural eslesmedi — tablo default'a duser",
			"name": "default",
			"variables": {
				"audio_bitrate_bps": 0,
				"audio_channels": 0,
				"audio_codec": "aac",
				"bpp": 0.028827,
				"container": "mov,mp4,m4a,3gp,3g2,mj2",
				"container_family": "mp4",
				"duration_s": 6,
				"format_bitrate_bps": 904000,
				"fps": 30,
				"has_audio": true,
				"has_video": true,
				"height": 720,
				"long_edge": 1280,
				"measured": true,
				"moov_at_end": false,
				"nb_streams": 0,
				"pix_fmt": "yuv420p",
				"pixels": 921600,
				"rotation": 0,
				"short_edge": 720,
				"size_bytes": 677639,
				"video_bitrate_bps": 797000,
				"video_codec": "h264",
				"video_profile": "",
				"width": 1280
			}
		}
	]
};
