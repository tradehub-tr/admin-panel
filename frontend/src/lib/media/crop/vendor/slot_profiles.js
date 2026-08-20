// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/.../policy/slots/*.json
// Yeniden üret: npm run sync:crop
export default {
	"schema_version": "1.0.0",
	"slots": [
		{
			"slotKey": "brand.logo",
			"title": "Marka logosu",
			"minShortEdge": 256,
			"maxMegapixelsHard": null,
			"profiles": [
				{
					"name": "w64",
					"width": 64,
					"height": 64,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.33
				},
				{
					"name": "w128",
					"width": 128,
					"height": 128,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.23
				},
				{
					"name": "w256",
					"width": 256,
					"height": 256,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.19
				},
				{
					"name": "w384",
					"width": 384,
					"height": 384,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.37
				},
				{
					"name": "w512",
					"width": 512,
					"height": 512,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.64
				},
				{
					"name": "og1200x630",
					"width": 1200,
					"height": 630,
					"fit": "pad",
					"formats": [
						"jpeg"
					],
					"ratioLabel": "1200:630",
					"maxOvershoot": null
				}
			]
		},
		{
			"slotKey": "category.banner",
			"title": "Kategori bandı / kategori vitrin görseli",
			"minShortEdge": 480,
			"maxMegapixelsHard": 80,
			"profiles": [
				{
					"name": "catbanner_480",
					"width": 480,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "2:1",
					"maxOvershoot": 1.23
				},
				{
					"name": "catbanner_960",
					"width": 960,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "2:1",
					"maxOvershoot": 1.11
				},
				{
					"name": "catbanner_1920",
					"width": 1920,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "2:1",
					"maxOvershoot": 1.09
				}
			]
		},
		{
			"slotKey": "company.cover_image",
			"title": "Şirket / mağaza kapak görseli",
			"minShortEdge": 400,
			"maxMegapixelsHard": 80,
			"profiles": [
				{
					"name": "cover_768",
					"width": 768,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "24:5",
					"maxOvershoot": 1.2
				},
				{
					"name": "cover_1280",
					"width": 1280,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "24:5",
					"maxOvershoot": 1
				},
				{
					"name": "cover_1920",
					"width": 1920,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "24:5",
					"maxOvershoot": 1
				},
				{
					"name": "cover_2560",
					"width": 2560,
					"height": null,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "24:5",
					"maxOvershoot": 1
				},
				{
					"name": "cover_16x9_1000",
					"width": 1000,
					"height": 563,
					"fit": "cover",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "16:9",
					"maxOvershoot": 1
				}
			]
		},
		{
			"slotKey": "company.cover_video",
			"title": "Şirket kapak videosu",
			"minShortEdge": 720,
			"maxMegapixelsHard": 8.3,
			"profiles": [
				{
					"name": "poster_1280",
					"width": 1280,
					"height": 720,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "16:9",
					"maxOvershoot": 1.28
				},
				{
					"name": "poster_854",
					"width": 854,
					"height": 480,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "16:9",
					"maxOvershoot": 1.44
				},
				{
					"name": "thumb_192",
					"width": 192,
					"height": 144,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "4:3",
					"maxOvershoot": 1
				}
			]
		},
		{
			"slotKey": "document.attachment",
			"title": "Belge / sertifika eki (KYB, KYC, sertifika, denetim, dekont)",
			"minShortEdge": 1654,
			"maxMegapixelsHard": 80,
			"profiles": [
				{
					"name": "doc_thumb_512",
					"width": 512,
					"height": null,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "3:2",
					"maxOvershoot": 1.07
				}
			]
		},
		{
			"slotKey": "product.image",
			"title": "Ürün görseli",
			"minShortEdge": 1000,
			"maxMegapixelsHard": 80,
			"profiles": [
				{
					"name": "w96",
					"width": 96,
					"height": null,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.85
				},
				{
					"name": "w192",
					"width": 192,
					"height": null,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.85
				},
				{
					"name": "w384",
					"width": 384,
					"height": null,
					"fit": "pad",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.83
				},
				{
					"name": "w640",
					"width": 640,
					"height": null,
					"fit": "pad",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.66
				},
				{
					"name": "w768",
					"width": 768,
					"height": null,
					"fit": "pad",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.16
				},
				{
					"name": "w1280",
					"width": 1280,
					"height": null,
					"fit": "contain",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": null,
					"maxOvershoot": 1.59
				},
				{
					"name": "w1920",
					"width": 1920,
					"height": null,
					"fit": "contain",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": null,
					"maxOvershoot": 1.49
				}
			]
		},
		{
			"slotKey": "product.video",
			"title": "Ürün tanıtım videosu",
			"minShortEdge": 360,
			"maxMegapixelsHard": 8.3,
			"profiles": [
				{
					"name": "poster_192",
					"width": 192,
					"height": null,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.26
				},
				{
					"name": "poster_1024",
					"width": 1024,
					"height": null,
					"fit": "contain",
					"formats": [
						"avif",
						"webp"
					],
					"ratioLabel": null,
					"maxOvershoot": 1.02
				}
			]
		},
		{
			"slotKey": "seller.logo",
			"title": "Satıcı (mağaza) logosu",
			"minShortEdge": 256,
			"maxMegapixelsHard": null,
			"profiles": [
				{
					"name": "w64",
					"width": 64,
					"height": 64,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.33
				},
				{
					"name": "w128",
					"width": 128,
					"height": 128,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.07
				},
				{
					"name": "w256",
					"width": 256,
					"height": 256,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.6
				},
				{
					"name": "w384",
					"width": 384,
					"height": 384,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.37
				},
				{
					"name": "w512",
					"width": 512,
					"height": 512,
					"fit": "pad",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.83
				},
				{
					"name": "og1200x630",
					"width": 1200,
					"height": 630,
					"fit": "pad",
					"formats": [
						"jpeg"
					],
					"ratioLabel": "1200:630",
					"maxOvershoot": null
				}
			]
		},
		{
			"slotKey": "user.avatar",
			"title": "Kullanıcı profil fotoğrafı",
			"minShortEdge": 96,
			"maxMegapixelsHard": 80,
			"profiles": [
				{
					"name": "avatar_96",
					"width": 96,
					"height": null,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.14
				},
				{
					"name": "avatar_160",
					"width": 160,
					"height": null,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.11
				},
				{
					"name": "avatar_256",
					"width": 256,
					"height": null,
					"fit": "cover",
					"formats": [
						"webp"
					],
					"ratioLabel": "1:1",
					"maxOvershoot": 1.19
				}
			]
		}
	]
};
