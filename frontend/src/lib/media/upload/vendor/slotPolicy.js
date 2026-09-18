// ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
// Kaynak: tradehub_core/tradehub_core/media/pipeline/policy/slots/*.json
// Yeniden üret: node src/lib/media/upload/sync.mjs
//
// Yalnız ÖN KONTROL'ün ölçebildiği alanlar taşındı (bayt, megapiksel, kenar,
// oran, alfa, süre, çözünürlük, kare hızı). Render profilleri, mesaj metinleri
// ve transcode ayarları KASITLI dışarıda: ön kontrol onları kullanmıyor,
// taşımak ayrışacak ikinci bir kopya üretirdi.

/** Kaynak dosyaların senkron anındaki özetleri — ayrışma testi bunu kullanır. */
export const VENDOR_MANIFEST = {
  "gorev": "T-081 · T-091",
  "uretici": "src/lib/media/upload/sync.mjs",
  "senkron_tarihi": "2026-09-17",
  "kaynaklar": {
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/brand-logo.json": "e982a6cb01382bd3c040d5b19a0f69b1ad8d8506c22358265de4e231366ff344",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/category-banner.json": "a34ffde6809e6b7426693850bc98c13a6f2e986a84f158deb7e3efb7885536d4",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/company-cover-image.json": "92adc83621a155aac1c7c007c6c8dc90aa77c11fa85f9f918f36df6a07fc4f61",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/company-cover-video.json": "48c357a8d275fa6d782a536b72e80635e73f1de24f97733592894f57696ec12a",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/document-attachment.json": "41fb1d282230bbea634a353b25da4597227b734de34859b88dc8fc2bd95b6dbf",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/library-image.json": "6f13815b4aa2dd5810904f3d9a1c0dcbfa88693ff7802f9b0f56b8ae9935e1a3",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/product-image.json": "a6f6f7e52711cd0134ce684dbb1e9bcf212982e7a7490d43190534405176ae6a",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/product-video.json": "bca5f07253f7aac71c6a85cccc6e9de9438f493fb8e61f37d4276fa073c77ae0",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/seller-logo.json": "4962294ae22bcf5c36d5628d6d19c5892f88f32d81df2643f8b552f718abc46a",
    "tradehub_core/tradehub_core/media/pipeline/policy/slots/user-avatar.json": "8de8f0b6424d2621d2e1477a5bdac9ab907e201d92877132633c5ed8fcc2456c"
  }
};

/** 9 slot — ön kontrol kuralları. */
export const SLOT_POLICIES = [
  {
    "slotKey": "brand.logo",
    "title": "Marka logosu",
    "roles": [
      "admin"
    ],
    "kind": "image",
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
      "conditionalExtensions": [
        ".svg"
      ],
      "rejectedExtensions": [
        ".gif",
        ".tif",
        ".tiff",
        ".bmp",
        ".heic",
        ".avif",
        ".svgz"
      ],
      "maxBytes": 589824,
      "maxBytesSvg": 32768,
      "maxMegapixelsHard": 16.8,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 256,
      "maxShortEdge": null,
      "minArea": null,
      "maxEdge": 4096,
      "recommendedEdge": 384,
      "lowResolutionWarnBelow": 384,
      "allowedRatios": [],
      "ratioTolerance": null,
      "aspectBand": {
        "minWOverH": 0.5,
        "maxWOverH": 2
      },
      "alphaChannel": "optional",
      "minCount": null,
      "maxCount": 1
    },
    "video": null
  },
  {
    "slotKey": "category.banner",
    "title": "Kategori bandı / kategori vitrin görseli",
    "roles": [
      "admin",
      "seller"
    ],
    "kind": "image",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 5242880,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 80,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 480,
      "maxShortEdge": null,
      "minArea": 460800,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "5:4",
        "3:2",
        "16:9",
        "2:1",
        "5:2",
        "3:1"
      ],
      "ratioTolerance": 0.12,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": null,
      "maxCount": 1
    },
    "video": null
  },
  {
    "slotKey": "company.cover_image",
    "title": "Şirket / mağaza kapak görseli",
    "roles": [
      "seller",
      "admin"
    ],
    "kind": "image",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 5242880,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 80,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 400,
      "maxShortEdge": null,
      "minArea": 768000,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "2:1",
        "5:2",
        "3:1",
        "7:2",
        "4:1",
        "24:5"
      ],
      "ratioTolerance": 0.12,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": 1,
      "maxCount": 5
    },
    "video": null
  },
  {
    "slotKey": "company.cover_video",
    "title": "Şirket kapak videosu",
    "roles": [
      "seller",
      "admin"
    ],
    "kind": "video",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 83886080,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 8.3,
      "allowAnimated": true
    },
    "require": {
      "minShortEdge": 720,
      "maxShortEdge": 2160,
      "minArea": 921600,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "16:9"
      ],
      "ratioTolerance": 0.01,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": 0,
      "maxCount": 1
    },
    "video": {
      "durationMinS": 6,
      "durationMaxS": 60,
      "resolutionMin": {
        "width": 1280,
        "height": 720
      },
      "resolutionMax": {
        "width": 3840,
        "height": 2160
      },
      "resolutionRecommended": {
        "width": 1920,
        "height": 1080
      },
      "bitrateCapKbps": 2000,
      "frameRateAccepted": [
        24,
        25,
        30
      ],
      "frameRateOutputCap": 30
    }
  },
  {
    "slotKey": "document.attachment",
    "title": "Belge / sertifika eki (KYB, KYC, sertifika, denetim, dekont)",
    "roles": [
      "seller",
      "buyer",
      "admin"
    ],
    "kind": "image",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 10485760,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 80,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 1654,
      "maxShortEdge": null,
      "minArea": 3868706,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "210:297"
      ],
      "ratioTolerance": 1,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": null,
      "maxCount": 1
    },
    "video": null
  },
  {
    "slotKey": "library.image",
    "title": "Medya kütüphanesi görseli",
    "roles": [
      "seller",
      "admin"
    ],
    "kind": "image",
    "accept": {
      "mime": [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/tiff",
        "image/avif",
        "image/bmp"
      ],
      "extensions": [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".tif",
        ".tiff",
        ".avif",
        ".bmp"
      ],
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 26214400,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 80,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 1,
      "maxShortEdge": null,
      "minArea": 1,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "1:1"
      ],
      "ratioTolerance": 1,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": null,
      "maxCount": null
    },
    "video": null
  },
  {
    "slotKey": "product.image",
    "title": "Ürün görseli",
    "roles": [
      "seller",
      "admin"
    ],
    "kind": "image",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 26214400,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 80,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 1000,
      "maxShortEdge": null,
      "minArea": 1000000,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "1:1",
        "4:5",
        "3:4"
      ],
      "ratioTolerance": 0.02,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": null,
      "maxCount": 12
    },
    "video": null
  },
  {
    "slotKey": "product.video",
    "title": "Ürün tanıtım videosu",
    "roles": [
      "seller"
    ],
    "kind": "video",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 10485760,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 8.3,
      "allowAnimated": true
    },
    "require": {
      "minShortEdge": 360,
      "maxShortEdge": null,
      "minArea": 230400,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "16:9"
      ],
      "ratioTolerance": 0.06,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": null,
      "maxCount": 1
    },
    "video": {
      "durationMinS": null,
      "durationMaxS": 33,
      "resolutionMin": {
        "width": 640,
        "height": 360
      },
      "resolutionMax": {
        "width": 3840,
        "height": 2160
      },
      "resolutionRecommended": {
        "width": 1280,
        "height": 720
      },
      "bitrateCapKbps": 2500,
      "frameRateAccepted": [],
      "frameRateOutputCap": null
    }
  },
  {
    "slotKey": "seller.logo",
    "title": "Satıcı (mağaza) logosu",
    "roles": [
      "seller",
      "admin"
    ],
    "kind": "image",
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
      "conditionalExtensions": [
        ".svg"
      ],
      "rejectedExtensions": [
        ".gif",
        ".tif",
        ".tiff",
        ".bmp",
        ".heic",
        ".avif",
        ".svgz"
      ],
      "maxBytes": 1048576,
      "maxBytesSvg": 32768,
      "maxMegapixelsHard": 16.8,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 256,
      "maxShortEdge": null,
      "minArea": null,
      "maxEdge": 4096,
      "recommendedEdge": 512,
      "lowResolutionWarnBelow": 512,
      "allowedRatios": [],
      "ratioTolerance": null,
      "aspectBand": {
        "minWOverH": 0.5,
        "maxWOverH": 2
      },
      "alphaChannel": "optional",
      "minCount": null,
      "maxCount": 1
    },
    "video": null
  },
  {
    "slotKey": "user.avatar",
    "title": "Kullanıcı profil fotoğrafı",
    "roles": [
      "buyer",
      "seller",
      "admin"
    ],
    "kind": "image",
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
      "conditionalExtensions": [],
      "rejectedExtensions": [],
      "maxBytes": 5242880,
      "maxBytesSvg": null,
      "maxMegapixelsHard": 80,
      "allowAnimated": false
    },
    "require": {
      "minShortEdge": 96,
      "maxShortEdge": null,
      "minArea": 9216,
      "maxEdge": null,
      "recommendedEdge": null,
      "lowResolutionWarnBelow": null,
      "allowedRatios": [
        "1:1"
      ],
      "ratioTolerance": 0.02,
      "aspectBand": null,
      "alphaChannel": null,
      "minCount": null,
      "maxCount": 1
    },
    "video": null
  }
];

export default SLOT_POLICIES;
