// Lojistik mock kapısı — MOGEM-685 F-03 (29 Eyl 2026).
//
// ÜRÜN KARARI (29 Eyl 2026): Alpha, Beta ve RC'de sahte veri OLABİLİR (test, iş onayı
// ve UAT orada yapılıyor), PROD'da HİÇ olmamalı. Ölçüldü (29 Eyl): bu kapıdan önce
// panelin varsayılan derlemesinde yedi dosyada sahte kayıt vardı
// (`podSeed`, `exceptionsMock`, `reportsMock` parçaları; `pricing`, `returns`,
// `packaging`, `PendingQueueView` içine gömülü tohumlar).
//
// İKİ KAPI — ikisi birden açık olmadıkça mock ÇALIŞMAZ:
//
//   1. DERLEME ANAHTARI `__LOJISTIK_MOCK__` (vite.config `define`, kaynağı
//      `VITE_LOGISTICS_MOCK`). Kapalı derlemede (`.env.production` = "0",
//      PROD) mock dalı derleme anında sabit `false` olur ve mock modülleri
//      DERLEME ÇIKTISINA GİRMEZ. Açanlar: `.env.development` (`npm run dev`),
//      `npm run build:onizleme`, repo `Dockerfile`'ı (varsayılan AÇIK — Alpha/Beta/RC
//      onunla derleniyor; PROD sunucudaki ayrı Dockerfile ile anahtarsız derleniyor,
//      Jenkins rc-to-prod #47'de ölçüldü).
//      Kapıyı CI koruyor: `scripts/check-no-mock-in-build.mjs`.
//   2. SUNUCU ADI (`mockCalisiyor()`). Anahtar yanlışlıkla PROD derlemesine
//      verilse bile mock yalnız önizleme sunucularında çalışır.
//
// ÇAĞIRANLAR İÇİN KURAL — her mock dalı TAM BU biçimde yazılır:
//
//     if (__LOJISTIK_MOCK__ && mockCalisiyor() && MOCK.<uç>) return <mock>;
//
//   `__LOJISTIK_MOCK__` HER dosyada yazılmalı: yalnız `mockCalisiyor()` mock'u
//   ÇALIŞTIRMAZ ama derleyici dalı atamaz — veri yine dosyaya girer. Başka
//   dosyadan içe aktarılan bir sabit de yetmiyor (storefront'ta ölçüldü:
//   derleyici ağaç budama anında değeri bilmiyor).
//
// EKRANLAR: mock'a bağlı ekranlar kapı kapalıyken menüden ve route'tan
// düşer (`router/logisticsScreens.js` → `mockApi`). Uç yazılıp `MOCK`
// satırı `false` olunca ekran kendiliğinden görünür.

/**
 * Mock'un çalışabileceği sunucular — TAM eşleşme.
 *
 * PROD BİLİNÇLİ OLARAK YOK: `istoc.com`, `www.istoc.com` ve backend adresleri
 * (`*.cronbi.com`) ne bu listede ne de aşağıdaki son eklerle eşleşiyor. RC
 * (`rc.istoc.com`) Alpha/Beta ile aynı yapıda (29 Eyl ürün kararı). Liste
 * storefront'un `src/services/logisticsMock.ts` `PREVIEW_HOSTS`'uyla aynı.
 */
const ONIZLEME_SUNUCULARI = Object.freeze([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "alpha.istoc.com",
  "beta.istoc.com",
  "rc.istoc.com",
]);

/**
 * `.localhost` ve `.local` genel alan adı sisteminde tahsis edilemiyor
 * (RFC 6761 / 6762) — canlı bir sunucu bu son ekleri alamaz. Yerel stack
 * `tradehub.localhost` üzerinden servis ediliyor.
 */
const ONIZLEME_SON_EKLERI = Object.freeze([".localhost", ".local"]);

/** Saf karar — `window`'a bakmıyor ki gerçek alan adlarıyla test edilebilsin. */
export function onizlemeSunucusuMu(host) {
  const h = String(host || "").toLowerCase();
  return ONIZLEME_SUNUCULARI.includes(h) || ONIZLEME_SON_EKLERI.some((s) => h.endsWith(s));
}

/**
 * Mock bu sunucuda çalışabilir mi? (İkinci kapı.)
 *
 * `window` yoksa (`node --test`) true: birim testleri mock'la koşuyor ve
 * orada bir sunucu adı yok. Tarayıcıda karar yalnız sunucu adına bağlı.
 */
export function mockCalisiyor() {
  if (typeof window === "undefined" || !window.location) return true;
  return onizlemeSunucusuMu(window.location.hostname);
}

/**
 * Bu api modüllerine bağlı bir ekran/sekme GİZLENMELİ mi?
 *
 * Mock çalışıyorsa hayır (önizleme). Çalışmıyorsa (PROD ya da önizleme
 * derlemesi yanlış sunucuda) modüllerden biri hâlâ mock bekliyorsa evet:
 * ucu olmayan ekran gerçek modda boş/hatalı açılır. `__LOJISTIK_MOCK_BEKLEYEN__`
 * derleme anında `MOCK` haritalarından okunuyor (`scripts/lojistik-mock-haritasi.mjs`)
 * — uç yazılıp satır `false` olunca ekran kendiliğinden görünür.
 */
export function mockBekliyor(moduller) {
  if (!moduller?.length || (__LOJISTIK_MOCK__ && mockCalisiyor())) return false;
  return moduller.some((m) => __LOJISTIK_MOCK_BEKLEYEN__.includes(m));
}
