/**
 * Medya kütüphanesi filtrelerinin ADRES ÇUBUĞU karşılığı (T-092).
 *
 * Neden gerekli: filtre durumu bugüne kadar yalnız bellekteydi. Satıcı
 * "video, kullanılmayan, 5 MB üstü" süzgecini kurup ekibine gönderemiyordu —
 * bağlantı karşı tarafta filtresiz açılıyordu; sekmeyi yenileyince de kendi
 * süzgecini kaybediyordu. Sayfalı listelerde bunun bedeli büyük: kullanıcı
 * her yenilemede aynı beş tıkı tekrar yapıyor.
 *
 * Burada YALNIZ saf çeviri var — Vue, router ve DOM yok. Sebebi: adres
 * çubuğu ile ekran arasındaki gidiş-geliş, döngüye girmesi en kolay
 * yerlerden biri (adres değişir → filtre değişir → adres değişir…). Çeviri
 * saf ve karşılaştırılabilir olunca döngü kırma işi tek bir eşitlik
 * kontrolüne iniyor (`sameQuery`), tahmine değil.
 *
 * Şema `useDataTable`'ın alan tanımından türetilir; buradaki tek varsayım
 * değişken tipleri (`text | select | range | date`) ve onların değer şekli:
 * text → string, select → string[], range → {min,max}, date → {from,to}.
 */

/** Aralık ayracı. `-` olamaz: eksi sayı ve ISO tarih ikisi de `-` içeriyor. */
const RANGE_SEP = "~";

/** Bu anahtarlar EKRANA aittir; adresteki diğer parametreler korunur. */
export const RESERVED_KEYS = ["q", "sort", "page", "size"];

function numOrNull(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Bir filtre değerinin adres çubuğu karşılığı; boşsa "" (yazılmaz). */
export function encodeValue(variant, value) {
  if (value == null) return "";
  if (variant === "text") return String(value).trim();
  if (variant === "select") {
    return Array.isArray(value) ? value.filter(Boolean).join(",") : "";
  }
  if (variant === "range") {
    const { min, max } = value;
    if (min == null && max == null) return "";
    return `${min ?? ""}${RANGE_SEP}${max ?? ""}`;
  }
  if (variant === "date") {
    const { from, to } = value;
    if (!from && !to) return "";
    return `${from || ""}${RANGE_SEP}${to || ""}`;
  }
  return "";
}

/**
 * Adres çubuğundaki metin → filtre değeri. Anlamsız girdide `undefined`
 * döner ve filtre HİÇ kurulmaz: elle yazılmış bozuk bir adres yüzünden liste
 * boş görünmesin. Sayı beklenen yerde harf gelirse o sınır yok sayılır.
 */
export function decodeValue(variant, raw) {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  if (variant === "text") return s;
  if (variant === "select") {
    const list = [
      ...new Set(
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      ),
    ];
    return list.length ? list : undefined;
  }
  if (variant === "range") {
    const [a, b] = s.split(RANGE_SEP);
    const min = numOrNull(a);
    const max = numOrNull(b);
    return min == null && max == null ? undefined : { min, max };
  }
  if (variant === "date") {
    const [a, b] = s.split(RANGE_SEP);
    const from = (a || "").trim();
    const to = (b || "").trim();
    return from || to ? { from: from || null, to: to || null } : undefined;
  }
  return undefined;
}

/** `[{field,desc}]` → "uploadedAt:desc,bytes:asc" */
export function encodeSorting(sorting) {
  return (sorting || [])
    .filter((s) => s && s.field)
    .map((s) => `${s.field}:${s.desc ? "desc" : "asc"}`)
    .join(",");
}

/**
 * "uploadedAt:desc" → `[{field,desc}]`.
 *
 * Alan adı beyaz listeden geçmek zorunda. Geçmeseydi adresten gelen serbest
 * metin sıralama alanı olurdu; bugün sonucu yalnız "sıralama olmaz" ama
 * sıralama sunucuya taşındığında aynı değer sorguya girerdi.
 */
export function decodeSorting(raw, allowedFields = []) {
  const izinli = new Set(allowedFields);
  const list = String(raw ?? "")
    .split(",")
    .map((part) => {
      const [field, dir] = part.split(":");
      const key = (field || "").trim();
      if (!key || !izinli.has(key)) return null;
      return { field: key, desc: (dir || "").trim().toLowerCase() !== "asc" };
    })
    .filter(Boolean);
  return list.length ? list : undefined;
}

/**
 * Ekran durumu → adres çubuğu parametreleri.
 *
 * Yalnız VARSAYILANDAN SAPAN değerler yazılır. Aksi hâlde filtresiz sayfa da
 * uzun bir sorgu kuyruğu taşırdı ve "temiz adres" ile "filtreli adres" ayırt
 * edilemezdi.
 *
 * @param {object} state   { search, filters, sorting, page, pageSize }
 * @param {Array}  schema  [{ key, variant }]
 * @param {object} defaults { sorting, pageSize }
 * @returns {Record<string,string>}
 */
export function encodeFilterQuery(state = {}, schema = [], defaults = {}) {
  const out = {};

  const q = String(state.search ?? "").trim();
  if (q) out.q = q;

  const filters = state.filters || {};
  for (const { key, variant } of schema) {
    const encoded = encodeValue(variant, filters[key]);
    if (encoded) out[key] = encoded;
  }

  const sort = encodeSorting(state.sorting);
  if (sort && sort !== encodeSorting(defaults.sorting)) out.sort = sort;

  const page = Number(state.page) || 1;
  if (page > 1) out.page = String(page);

  const size = Number(state.pageSize) || 0;
  if (size && size !== Number(defaults.pageSize)) out.size = String(size);

  return out;
}

/**
 * Adres çubuğu → ekran durumu.
 *
 * Sayfa boyutu izinli listeden seçilir: adresten gelen "size=100000" bütün
 * kütüphaneyi tek sayfaya basardı ve ızgaranın kalem sayısı sınırı — bu
 * ekranda düzeni ayakta tutan tek şey — adres çubuğundan aşılabilir olurdu.
 *
 * @returns {{search:string, filters:object, sorting:Array|undefined, page:number, pageSize:number|undefined}}
 */
export function decodeFilterQuery(query = {}, schema = [], defaults = {}) {
  const oku = (key) => {
    const v = query[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const filters = {};
  for (const { key, variant } of schema) {
    const value = decodeValue(variant, oku(key));
    if (value !== undefined) filters[key] = value;
  }

  const izinliBoyutlar = (defaults.pageSizes || []).map(Number);
  const size = Number(oku("size"));
  const pageSize = izinliBoyutlar.includes(size) ? size : undefined;

  const page = Math.max(1, Math.trunc(Number(oku("page"))) || 1);

  return {
    search: String(oku("q") ?? "").trim(),
    filters,
    sorting: decodeSorting(oku("sort"), defaults.sortableKeys || []),
    page,
    pageSize,
  };
}

/** Adresteki bize AİT OLMAYAN parametreler — yazarken korunur. */
export function foreignParams(query = {}, schema = []) {
  const bizim = new Set([...RESERVED_KEYS, ...schema.map((f) => f.key)]);
  const out = {};
  for (const [key, value] of Object.entries(query)) {
    if (!bizim.has(key)) out[key] = value;
  }
  return out;
}

/**
 * İki sorgu aynı mı — adres yazma döngüsünü kıran kontrol.
 *
 * Değerler string'e çevrilerek karşılaştırılıyor: router bazı parametreleri
 * dizi olarak verebiliyor ve `?page=2` ile `page: 2` aynı adres.
 */
export function sameQuery(a = {}, b = {}) {
  const duz = (o) => {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (v == null || v === "") continue;
      out[k] = String(Array.isArray(v) ? v[0] : v);
    }
    return out;
  };
  const x = duz(a);
  const y = duz(b);
  const anahtarlar = Object.keys(x);
  if (anahtarlar.length !== Object.keys(y).length) return false;
  return anahtarlar.every((k) => x[k] === y[k]);
}
