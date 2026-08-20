/**
 * T-115 — katalog bölgesi ⇄ GERÇEK storefront DOM eşlemesi.
 *
 * Her satır bir iddiadır: *"`placements.json`'daki şu bölgenin kutusu,
 * gerçek sayfada şu elemandır."* Eşleme yanlışsa drift sayısı da yalan olur;
 * bu yüzden her satırda seçicinin hangi kaynak satırından çıktığı yazılı
 * (`source`) ve ölçüm sırasında kare kutu / görünürlük doğrulanıyor.
 *
 * Seçiciler storefront kaynağı OKUNARAK değil, **tarayıcıda gerçek sayfa
 * gezilerek** bulundu; kaynaktaki sınıf dizisiyle DOM'daki sınıf dizisi
 * ayrıştığında (ör. sepet özet karosu) DOM kazandı.
 *
 * ÖLÇÜLMEYEN bölgeler `unmeasured` ile işaretli — gizlenmez, raporda
 * "OLCULMEDI" satırı olarak çıkar. Sessizce atlanan bölge YOKTUR.
 */

/** Gerçek veri — canlı API'den (`get_listings`) alındı, uydurulmadı. */
export const FIXTURES = {
  productSlug:
    process.env.DRIFT_PRODUCT_SLUG ||
    "20-adet-alci-tas-boyama-seti-anne-cocuk-etkinligi-cocuk-gelisimi-objeleri-sadece-objeler",
  sellerSlug: process.env.DRIFT_SELLER_SLUG || "SEL-00002",
};

/** Misafir sepetini tohumlar — /sepet boş sepette özet şeridini basmaz. */
export const CART_SEED_JS = `(() => {
  const sku = (i) => ({
    id: "SKU-" + i, skuImage: "/files/Bere-1.png", variantText: "Varyant " + i,
    unitPrice: 100, currency: "\\u20ba", unit: "Adet", quantity: 2, minQty: 1,
    maxQty: 999, selected: true, baseUnitPrice: 100, basePriceAddon: 0, baseCurrency: "TRY",
  });
  const product = (i) => ({
    id: "PRD-" + i, title: "Drift olcum urunu " + i, href: "/urun/x", tags: [],
    moqLabel: "1 Adet", favoriteIcon: "", deleteIcon: "", selected: true,
    skus: [sku(i * 10), sku(i * 10 + 1)],
  });
  localStorage.setItem("tradehub_cart", JSON.stringify({
    suppliers: [{ id: "SUP-1", name: "Drift Tedarikci", href: "/magaza/SEL-00002",
                  selected: true, products: [product(1), product(2)] }],
    shippingFee: 0, discount: 0, currency: "\\u20ba",
  }));
  return true;
})()`;

/** Tembel bölümleri (ana sayfa ızgaraları) tetikler. */
export const SCROLL_JS = `(async () => {
  for (let i = 0; i < 8; i++) {
    window.scrollBy(0, window.innerHeight);
    await new Promise((r) => setTimeout(r, 450));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 700));
  return true;
})()`;

export const PAGES = {
  home: { path: "/", after: SCROLL_JS, afterWaitMs: 2500 },
  listing: { path: "/urunler" },
  product_detail: { path: () => `/urun/${FIXTURES.productSlug}`, after: SCROLL_JS, afterWaitMs: 2000 },
  cart_checkout: { path: "/sepet", seed: CART_SEED_JS },
  seller_shop: { path: () => `/magaza/${FIXTURES.sellerSlug}` },
};

/**
 * `region key` → ölçüm reçetesi.
 *   selector      : CSS seçici (GÖRÜNÜR ilk eşleşme ölçülür)
 *   altSelector   : `selectorMinVw` altındaki düzen için ikinci seçici
 *   selectorMinVw : `selector` bu genişlikten İTİBAREN geçerli
 *   expectSquare  : kutu kare olmalı — yanlış eleman yakalayan emniyet kemeri
 *   prepare       : ölçümden önce sayfada koşacak JS (sekme/lightbox açma)
 *   optional      : bulunamazsa rapor satırı üretir, ölçüm başarısızlığı sayılmaz
 *   unmeasured    : ölçülmeyecekse GEREKÇE (boş bırakılamaz)
 */
export const TARGETS = [
  {
    key: "home/hero_showcase_grid",
    // `.product-slider` kutunun İÇİNDE (w-full h-full); kutu onun EBEVEYNİ olan
    // `aspect-square` sarmalayıcı. `:has()` ile doğrudan o seçiliyor.
    selector: "#home-product-grid div:has(> .product-slider)",
    expectSquare: true,
    source:
      "components/hero/ProductGrid.ts:183 (#home-product-grid, 2xl:grid-cols-7 gap 16px) → " +
      "components/shared/ListingCard.ts:205 (aspect-square w-full)",
  },
  {
    key: "home/top_deals",
    selector: "#top-deals-grid div:has(> img), #top-deals-grid .aspect-square",
    expectSquare: true,
    source: "components/hero/TopDeals.ts:234 (#top-deals-grid, gap-x-2 sm:gap-x-3 lg:gap-x-4)",
  },
  {
    key: "home/tailored_grid",
    selector: "#ts-product-grid div:has(> .product-slider), #ts-product-grid .aspect-square",
    expectSquare: true,
    optional: true,
    source: "components/tailored-selections/TailoredProductGrid.ts:21 (#ts-product-grid)",
  },
  {
    key: "listing/card_grid",
    selector: ".product-grid div:has(> .product-slider)",
    expectSquare: true,
    source:
      "components/products/ProductListingGrid.ts:94 (.product-grid, min-[1280px]:grid-cols-5) → ListingCard.ts:205",
  },
  {
    key: "listing/brand_grid",
    unmeasured:
      "Marka sayfası (/marka/<slug>) gerçek bir marka slug'ı ister; bu ortamdaki " +
      "API yanıtında ürünlerin `brandSlug` alanı BOŞ döndü, doğrulanmış slug yok. Kutu ölçülmedi.",
  },
  {
    key: "product_detail/main_image",
    selector: "#gallery-main-image",
    selectorMinVw: 1024,
    altSelector: "#pdm-gallery-wrap",
    expectSquare: true,
    source:
      "ProductImageGallery.ts:325 (#gallery-main-image, aspect-square) · " +
      "MobileLayout.ts:136 (#pdm-gallery-wrap, aspect-square) — 1024 eşiği pages/product-detail.ts düzen anahtarı",
  },
  {
    key: "product_detail/thumb_rail",
    selector: "#pd-thumb-strip .gallery-thumb, #pd-thumb-strip [data-thumb-index], #pd-thumb-strip button > div",
    selectorMinVw: 1280,
    expectSquare: true,
    optional: true,
    source: "ProductImageGallery.ts:300 (#pd-thumb-strip w-[78px]) — karo THUMB_SIZE=70",
  },
  {
    key: "product_detail/lightbox_main",
    // Lightbox iç kutusu: #gallery-lightbox-stage > div (h-full aspect-square).
    selector: "#gallery-lightbox-stage > div",
    selectorMinVw: 1024,
    expectSquare: true,
    prepare: `(() => { const el = document.querySelector('#gallery-main-image'); if (!el) return false; el.click(); return true; })()`,
    prepareWaitMs: 900,
    cleanup: `(() => { document.querySelector('#gallery-lightbox-close')?.click(); return true; })()`,
    source: "ProductImageGallery.ts:400-402 (#gallery-lightbox-inner h-[min(82vh,720px)] → stage → aspect-square)",
  },
  {
    key: "product_detail/lightbox_thumb",
    unmeasured:
      "Lightbox karo listesi (#gallery-lightbox-thumb-list) yalnız 2+ görselli üründe " +
      "doluyor; ortamdaki referans üründe tek görsel var. Kutu ölçülmedi.",
  },
  {
    key: "product_detail/related_slider",
    selector: ".rp-card",
    optional: true,
    source: "components/product/RelatedProducts.ts:78 (.rp-card — Swiper slide gövdesi)",
  },
  {
    key: "cart_checkout/summary_strip",
    // Yayındaki ve yereldeki derlemelerin İKİSİNDE de karo `.checkout-item-card`
    // sınıfını TAŞIMIYOR (kaynakta var); `.checkout-items-images`'ın doğrudan
    // çocuğu tek kararlı tutamak.
    selector: ".checkout-item-card, .checkout-items-images > div",
    expectSquare: true,
    source: "components/cart/page/CartSummary.ts:20 (.checkout-items-images > karo — w-14 / sm:w-16)",
  },
  {
    key: "cart_checkout/sku_row",
    selector: ".cart-sku-row img, [data-sku-row] img, .sku-row__image",
    optional: true,
    source: "components/cart/molecules/SkuRow.ts:24,36",
  },
  {
    key: "cart_checkout/product_item",
    selector: "[data-product-item] .product-item-image, .cart-product-item img, .product-item__image",
    optional: true,
    source: "components/cart/molecules/ProductItem.ts:84",
  },
  {
    key: "cart_checkout/drawer_thumb",
    unmeasured:
      "Sepet çekmecesi (alpine/cart.ts:639) yalnız başlıktaki sepet düğmesine basılınca " +
      "açılıyor; çekmece akışı bu ölçümde tetiklenmedi. Kutu ölçülmedi.",
  },
  {
    key: "seller_shop/product_grid",
    // Ürün ızgarası mağaza sayfasının "Ürünler" SEKMESİNDE; varsayılan sekme
    // "Profil" olduğu için önce sekmeye basılıyor.
    selector: ".product-card__image-area",
    expectSquare: true,
    prepare: `(() => {
      const b = [...document.querySelectorAll('button,a')]
        .find((e) => /^(ürünler|urunler|products)$/i.test(e.textContent.trim()));
      if (!b) return false; b.click(); return true;
    })()`,
    prepareWaitMs: 2500,
    source:
      "components/seller/CompanyProfile.ts:802 (grid ... xl:grid-cols-4 gap-4 product-grid) → " +
      ":806 (.product-card__image-area, aspect-square) — /magaza/<slug> Ürünler sekmesi",
  },
];

export const TARGET_BY_KEY = new Map(TARGETS.map((t) => [t.key, t]));
