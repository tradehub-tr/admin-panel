// Okutulan kodun ne olduğunu çözer — kalem mi, koli mi, tanınmayan mı.
//
// NEDEN SUNUCUYA SORULMUYOR:
//   Depoda operatör saniyede bir okutuyor. Her okutmada ağ turu beklemek
//   akışı kilitler; kopan bağlantıda ise ekran tamamen durur. Eşleşme
//   verisi (`scan_code`, `barcode`) zaten yüklü sevkiyatın içinde —
//   aramak yerel bir iş.
//
// NEDEN SAF FONKSİYON:
//   Vue'dan ve tarayıcı API'sinden bağımsız; `node:test` ile doğrudan
//   sınanabiliyor. Eşleşme sırası bir SÖZLEŞME kuralı (13-FE-VERI-SOZLESMESI
//   §4.2), sunum kararı değil — testle kilitleniyor.

/** Kod normalizasyonu — okuyucu bazen baş/son boşluk ve CR ekliyor. */
function normalize(code) {
  return String(code ?? "")
    .trim()
    .replace(/[\r\n]+$/, "");
}

/**
 * Okutulan kodu çözer.
 *
 * EŞLEŞME SIRASI (sözleşme §4.2): önce KOLİ, sonra KALEM.
 * Koli barkodları `PKG…` önekli ve sayıca az; ürün barkoduyla çakışma
 * olasılığı düşük. Çakışırsa operatörün beklentisi "koliyi seçtim"
 * yönündedir — elindeki koliyi okutup içine ürün koyar.
 *
 * @param {string} rawCode
 * @param {{items?: Array, packages?: Array}} shipment
 * @returns {{type: "package"|"item"|"unknown"|"empty", code: string, package?: object, item?: object}}
 */
export function matchScan(rawCode, { items = [], packages = [] } = {}) {
  const code = normalize(rawCode);
  if (!code) return { type: "empty", code };

  const pkg = packages.find((p) => normalize(p.barcode) && normalize(p.barcode) === code);
  if (pkg) return { type: "package", code, package: pkg };

  const item = items.find((i) => normalize(i.scan_code) && normalize(i.scan_code) === code);
  if (item) return { type: "item", code, item };

  return { type: "unknown", code };
}

/**
 * Sevkiyatta okutulabilir bir şey var mı?
 *
 * Hiçbir kalemde `scan_code` yoksa tarama kutusu HİÇ çizilmez. Boş bir kutu
 * göstermek "okutma bozuk" izlenimi verir; operatör kodu okutur, hiçbir şey
 * olmaz ve arızayı arar — oysa veri eksik.
 *
 * Koli barkodu tek başına yeterli sayılmıyor: koli okutmak yalnız aktif koliyi
 * değiştirir, asıl iş olan kalem atamasını yapmaz.
 *
 * @param {{items?: Array}} shipment
 * @returns {boolean}
 */
export function hasScannableItems({ items = [] } = {}) {
  return items.some((i) => normalize(i.scan_code));
}

/**
 * Okutmanın sevkiyat taslağına etkisini hesaplar — MUTASYON YOK.
 *
 * Yeni bir `packages` dizisi döndürür; çağıran onu store'a yazar. Saf
 * tutulmasının sebebi test edilebilirlik: "tanınmayan kod hiçbir koliyi
 * değiştirmemeli" kuralı ancak girdi/çıktı karşılaştırmasıyla kanıtlanır.
 *
 * @param {object} params
 * @param {string} params.code            okutulan ham kod
 * @param {Array}  params.items           sevkiyat kalemleri
 * @param {Array}  params.packages        koliler (taslak)
 * @param {number} params.activeIndex     aktif koli index'i
 * @param {number} [params.qty=1]         eklenecek miktar
 * @returns {{
 *   result: "added"|"activated"|"unknown"|"empty"|"no-package"|"already-full",
 *   packages: Array, activeIndex: number, item?: object, package?: object, qty?: number
 * }}
 */
export function applyScan({ code, items = [], packages = [], activeIndex = 0, qty = 1 }) {
  const match = matchScan(code, { items, packages });

  if (match.type === "empty" || match.type === "unknown") {
    // Tanınmayan kod HİÇBİR ŞEYİ değiştirmez. Diziyi olduğu gibi geri
    // veriyoruz — kopyalamak bile referans değişimiyle gereksiz render eder.
    return { result: match.type, packages, activeIndex, code: match.code };
  }

  if (match.type === "package") {
    const idx = packages.indexOf(match.package);
    return { result: "activated", packages, activeIndex: idx, package: match.package };
  }

  // Kalem eşleşti — aktif koliye eklenecek.
  if (!packages.length) {
    // Koli yokken okutma sessizce kaybolurdu. Çağıran bunu "önce koli oluştur"
    // uyarısına çeviriyor.
    return { result: "no-package", packages, activeIndex, item: match.item };
  }

  const target = Math.min(Math.max(activeIndex, 0), packages.length - 1);
  const packed = packedQtyOf(match.item, packages);
  const remaining = (Number(match.item.qty) || 0) - packed;
  if (remaining <= 0) {
    // Kalemin tamamı zaten kolilerde. Fazlasını eklemek sunucu doğrulamasına
    // takılırdı; operatöre burada söylemek daha hızlı.
    return { result: "already-full", packages, activeIndex: target, item: match.item };
  }

  const addQty = Math.min(qty, remaining);
  const next = packages.map((pkg, i) => {
    if (i !== target) return pkg;
    const contents = [...(pkg.contents ?? [])];
    const at = contents.findIndex((c) => c.shipment_item === match.item.row_id);
    if (at >= 0) contents[at] = { ...contents[at], qty: contents[at].qty + addQty };
    else contents.push({ shipment_item: match.item.row_id, qty: addQty });
    return { ...pkg, contents };
  });

  return {
    result: "added",
    packages: next,
    activeIndex: target,
    item: match.item,
    package: next[target],
    qty: addQty,
  };
}

/** Bir kalemin tüm kolilerdeki toplam atanmış miktarı. */
export function packedQtyOf(item, packages = []) {
  let sum = 0;
  for (const pkg of packages) {
    for (const c of pkg.contents ?? []) {
      if (c.shipment_item === item.row_id) sum += Number(c.qty) || 0;
    }
  }
  return sum;
}
