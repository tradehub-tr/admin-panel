import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { matchesQuery } from "@/utils/mediaFormat";

/**
 * Satıcı Medya Kütüphanesi — FRONTEND-ONLY store.
 *
 * Backend/Frappe DocType yok: tüm veri bu dosyadaki sabit örneklerden gelir ve
 * tüm mutasyonlar bellekte yapılır. Gerçek API'ye bağlanırken buradaki her
 * action'ın gövdesi `api.request(...)` çağrısıyla değiştirilir; component'ler
 * ve imzalar aynı kalır.
 *
 * Satıcı izolasyonu (medya.md §Satıcı Kuralları) mock tarafında da modellenir:
 *   - `owner: "self"`   → satıcının kendi medyası, düzenlenebilir/silinebilir
 *   - `owner: "shared"` → mağazanın ortak medyası, seçilebilir ama salt-okunur
 * Başka satıcıların medyası bu listeye hiç girmez.
 */

const OWNER_SELF = "self";
const OWNER_SHARED = "shared";

/** Mock önizleme: gerçek dosya yok, kartlar CSS gradyanıyla çizilir. */
function seed() {
  return [
    {
      id: "MED-0001",
      fileName: "lacivert-gomlek-on.webp",
      title: "Lacivert gömlek — önden",
      alt: "Pamuklu erkek gömlek, lacivert, önden görünüm",
      description: "Stüdyo çekimi, beyaz fon.",
      tags: ["gömlek", "tekstil", "stüdyo"],
      kind: "image",
      ext: "WEBP",
      bytes: 254_000,
      width: 1200,
      height: 1200,
      uploadedAt: "2026-08-03T09:12:00",
      usedIn: [
        { id: "LST-00014", label: "Pamuklu Erkek Gömlek" },
        { id: "LST-00019", label: "Gömlek 3'lü Set" },
      ],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: ["#3b5b8c", "#8fa8c8"],
    },
    {
      id: "MED-0002",
      fileName: "magaza-banner-yaz.webp",
      title: "Yaz kampanyası banner",
      alt: "Yaz kampanyası mağaza banner görseli",
      description: "",
      tags: ["banner", "kampanya"],
      kind: "image",
      ext: "WEBP",
      bytes: 512_000,
      width: 1920,
      height: 640,
      uploadedAt: "2026-08-02T16:40:00",
      usedIn: [{ id: "STORE", label: "Mağaza vitrini" }],
      owner: OWNER_SHARED,
      favorite: false,
      archived: false,
      gradient: ["#c2410c", "#f5b800"],
    },
    {
      id: "MED-0003",
      fileName: "iso-9001-sertifika.pdf",
      title: "ISO 9001 sertifikası",
      alt: "",
      description: "2026 yılı için geçerli kalite sertifikası.",
      tags: ["sertifika", "kyb"],
      kind: "document",
      ext: "PDF",
      bytes: 1_248_000,
      width: null,
      height: null,
      uploadedAt: "2026-08-02T11:05:00",
      usedIn: [],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: null,
    },
    {
      id: "MED-0004",
      fileName: "kozmetik-set-01.jpg",
      title: "Kozmetik set",
      alt: "Beş parçalı kozmetik seti, pembe zemin",
      description: "",
      tags: ["kozmetik", "set"],
      kind: "image",
      ext: "JPG",
      bytes: 389_000,
      width: 1000,
      height: 1000,
      uploadedAt: "2026-08-02T09:30:00",
      usedIn: [{ id: "LST-00121", label: "Kozmetik Bakım Seti" }],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: ["#9d174d", "#f9a8d4"],
    },
    {
      id: "MED-0005",
      fileName: "tanitim-filmi.mp4",
      title: "Mağaza tanıtım filmi",
      alt: "",
      description: "42 saniyelik mağaza tanıtımı.",
      tags: ["video", "tanıtım"],
      kind: "video",
      ext: "MP4",
      bytes: 18_400_000,
      width: 1920,
      height: 1080,
      uploadedAt: "2026-08-01T14:20:00",
      usedIn: [{ id: "STORE", label: "Mağaza sayfası" }],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: null,
    },
    {
      id: "MED-0006",
      fileName: "tablet-beyaz.webp",
      title: "Beyaz tablet",
      alt: "Beyaz renkli 10 inç tablet, açılı görünüm",
      description: "",
      tags: ["elektronik"],
      kind: "image",
      ext: "WEBP",
      bytes: 301_000,
      width: 1200,
      height: 1200,
      uploadedAt: "2026-08-01T10:00:00",
      usedIn: [{ id: "LST-00208", label: '10" Android Tablet' }],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: ["#0f766e", "#5eead4"],
    },
    {
      id: "MED-0007",
      fileName: "katalog-2026-q3.pdf",
      title: "2026 Q3 kataloğu",
      alt: "",
      description: "48 sayfalık sezon kataloğu.",
      tags: ["katalog"],
      kind: "document",
      ext: "PDF",
      bytes: 6_800_000,
      width: null,
      height: null,
      uploadedAt: "2026-07-31T18:45:00",
      usedIn: [],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: null,
    },
    {
      id: "MED-0008",
      fileName: "ahsap-sandalye.jpg",
      title: "Ahşap sandalye",
      alt: "Meşe ahşap yemek sandalyesi, yandan görünüm",
      description: "",
      tags: ["mobilya"],
      kind: "image",
      ext: "JPG",
      bytes: 455_000,
      width: 1400,
      height: 1400,
      uploadedAt: "2026-07-30T13:15:00",
      usedIn: [{ id: "LST-00087", label: "Meşe Yemek Sandalyesi" }],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: ["#78350f", "#d6b48c"],
    },
    {
      id: "MED-0009",
      fileName: "baharat-seti.webp",
      title: "Baharat seti",
      alt: "Cam kavanozlarda sekiz parçalı baharat seti",
      description: "",
      tags: ["gıda"],
      kind: "image",
      ext: "WEBP",
      bytes: 274_000,
      width: 1200,
      height: 1200,
      uploadedAt: "2026-07-30T08:05:00",
      usedIn: [{ id: "LST-00159", label: "8'li Baharat Seti" }],
      owner: OWNER_SHARED,
      favorite: false,
      archived: false,
      gradient: ["#854d0e", "#facc15"],
    },
    {
      id: "MED-0010",
      fileName: "vida-seti-makro.jpg",
      title: "Vida seti makro",
      alt: "Paslanmaz çelik vida seti, makro çekim",
      description: "",
      tags: ["hırdavat"],
      kind: "image",
      ext: "JPG",
      bytes: 198_000,
      width: 900,
      height: 900,
      uploadedAt: "2026-07-29T15:50:00",
      usedIn: [{ id: "LST-00033", label: "Paslanmaz Vida Seti" }],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: ["#334155", "#94a3b8"],
    },
    {
      id: "MED-0011",
      fileName: "deri-ayakkabi.webp",
      title: "Deri ayakkabı",
      alt: "Kahverengi hakiki deri klasik ayakkabı",
      description: "",
      tags: ["ayakkabı", "deri"],
      kind: "image",
      ext: "WEBP",
      bytes: 333_000,
      width: 1200,
      height: 1200,
      uploadedAt: "2026-07-29T09:10:00",
      usedIn: [],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: ["#7c2d12", "#e7c9a9"],
    },
    {
      id: "MED-0012",
      fileName: "eski-banner-2025.jpg",
      title: "2025 banner (arşiv)",
      alt: "",
      description: "Geçen sezondan kalan banner.",
      tags: ["banner", "arşiv"],
      kind: "image",
      ext: "JPG",
      bytes: 410_000,
      width: 1600,
      height: 500,
      uploadedAt: "2026-06-14T12:00:00",
      usedIn: [],
      owner: OWNER_SELF,
      favorite: false,
      archived: true,
      gradient: ["#404040", "#a3a3a3"],
    },
  ];
}

/** Boyut kovaları — filtre etiketleriyle aynı eşikleri kullanır. */
const SIZE_BUCKETS = {
  small: (b) => b < 500_000,
  medium: (b) => b >= 500_000 && b < 5_000_000,
  large: (b) => b >= 5_000_000,
};

/** Tarih kovaları — bugünden geriye gün sayısı. */
const DATE_WINDOWS = { today: 1, week: 7, month: 30, year: 365 };

function orientationOf(item) {
  if (!item.width || !item.height) return "other";
  if (item.width === item.height) return "square";
  return item.width > item.height ? "landscape" : "portrait";
}

function withinDays(iso, days) {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

/** Boş dizi = "tümü" (useDataTable select varyantının semantiği). */
function inSet(selected, value) {
  return !selected.length || selected.includes(value);
}

function inRange(range, value) {
  if (!range) return true;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return true;
}

function inDateRange(range, iso) {
  if (!range) return true;
  const day = String(iso).slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/** Hızlı görünüm bayrakları — birden fazlası seçilirse hepsi eşleşmeli. */
function matchesFlags(flags, item) {
  return flags.every((flag) =>
    flag === "favorite" ? item.favorite : flag === "missingAlt" ? isMissingAlt(item) : true
  );
}

/** Sıralanabilir alanların değer erişimcileri — sütun başlığı bunları kullanır. */
const SORT_ACCESSORS = {
  fileName: (m) => m.fileName,
  ext: (m) => m.ext,
  bytes: (m) => m.bytes,
  usageCount: (m) => m.usedIn.length,
  uploadedAt: (m) => m.uploadedAt,
};

/**
 * Ek demo kayıtları — filtrelerin ve sayfalamanın anlamlı çalışması için.
 * Deterministik: rastgelelik yok, sıra ve değerler her yüklemede aynı.
 */
const EXTRA_SEED = [
  [
    "kis-koleksiyon-mont.webp",
    "Kışlık mont",
    "image",
    "WEBP",
    388_000,
    1200,
    1200,
    "2026-07-28T11:00:00",
    ["giyim", "kışlık"],
    2,
    ["#1e3a8a", "#93c5fd"],
  ],
  [
    "spor-ayakkabi-yan.jpg",
    "Spor ayakkabı",
    "image",
    "JPG",
    512_000,
    1600,
    900,
    "2026-07-27T09:30:00",
    ["ayakkabı", "spor"],
    1,
    ["#065f46", "#6ee7b7"],
  ],
  [
    "mutfak-robotu.webp",
    "Mutfak robotu",
    "image",
    "WEBP",
    296_000,
    1200,
    1200,
    "2026-07-26T14:15:00",
    ["elektronik", "mutfak"],
    0,
    ["#7c2d12", "#fdba74"],
  ],
  [
    "tekstil-katalog.pdf",
    "Tekstil kataloğu",
    "document",
    "PDF",
    9_400_000,
    null,
    null,
    "2026-07-25T16:00:00",
    ["katalog", "tekstil"],
    0,
    null,
  ],
  [
    "urun-tanitim-2.mp4",
    "Ürün tanıtımı 2",
    "video",
    "MP4",
    24_000_000,
    1920,
    1080,
    "2026-07-24T10:45:00",
    ["video"],
    1,
    null,
  ],
  [
    "cam-vazo-seti.jpg",
    "Cam vazo seti",
    "image",
    "JPG",
    421_000,
    1000,
    1400,
    "2026-07-23T13:20:00",
    ["dekorasyon"],
    1,
    ["#334155", "#cbd5e1"],
  ],
  [
    "ofis-sandalyesi.webp",
    "Ofis sandalyesi",
    "image",
    "WEBP",
    355_000,
    1200,
    1600,
    "2026-07-22T08:50:00",
    ["mobilya", "ofis"],
    2,
    ["#3f3f46", "#a1a1aa"],
  ],
  [
    "organik-cay-seti.webp",
    "Organik çay seti",
    "image",
    "WEBP",
    268_000,
    1200,
    1200,
    "2026-07-21T15:05:00",
    ["gıda", "organik"],
    1,
    ["#166534", "#86efac"],
  ],
  [
    "banner-kis-indirim.jpg",
    "Kış indirimi banner",
    "image",
    "JPG",
    640_000,
    1920,
    600,
    "2026-07-20T12:00:00",
    ["banner", "kampanya"],
    1,
    ["#7f1d1d", "#fca5a5"],
  ],
  [
    "kalite-belgesi.pdf",
    "Kalite belgesi",
    "document",
    "PDF",
    780_000,
    null,
    null,
    "2026-07-19T09:15:00",
    ["sertifika"],
    0,
    null,
  ],
  [
    "takim-elbise.webp",
    "Takım elbise",
    "image",
    "WEBP",
    402_000,
    1200,
    1800,
    "2026-07-18T17:40:00",
    ["giyim"],
    1,
    ["#111827", "#6b7280"],
  ],
  [
    "bahce-mobilyasi.jpg",
    "Bahçe mobilyası",
    "image",
    "JPG",
    588_000,
    1800,
    1200,
    "2026-07-17T11:25:00",
    ["mobilya", "bahçe"],
    0,
    ["#14532d", "#bbf7d0"],
  ],
  [
    "deri-canta.webp",
    "Deri çanta",
    "image",
    "WEBP",
    312_000,
    1200,
    1200,
    "2026-07-16T10:10:00",
    ["deri", "aksesuar"],
    2,
    ["#78350f", "#fcd34d"],
  ],
  [
    "temizlik-seti.jpg",
    "Temizlik seti",
    "image",
    "JPG",
    244_000,
    900,
    900,
    "2026-07-15T14:35:00",
    ["temizlik"],
    1,
    ["#0c4a6e", "#7dd3fc"],
  ],
  [
    "fiyat-listesi-q3.pdf",
    "Q3 fiyat listesi",
    "document",
    "PDF",
    1_900_000,
    null,
    null,
    "2026-07-14T09:00:00",
    ["katalog"],
    0,
    null,
  ],
  [
    "aydinlatma-lamba.webp",
    "Aydınlatma lambası",
    "image",
    "WEBP",
    279_000,
    1200,
    1600,
    "2026-07-13T16:20:00",
    ["dekorasyon", "aydınlatma"],
    1,
    ["#713f12", "#fde68a"],
  ],
  [
    "depo-tanitim.mp4",
    "Depo tanıtımı",
    "video",
    "MP4",
    11_500_000,
    1280,
    720,
    "2026-07-12T13:45:00",
    ["video", "kurumsal"],
    0,
    null,
  ],
  [
    "paketleme-kutusu.jpg",
    "Paketleme kutusu",
    "image",
    "JPG",
    198_000,
    1000,
    1000,
    "2026-07-11T08:30:00",
    ["ambalaj"],
    1,
    ["#57534e", "#d6d3d1"],
  ],
];

function buildExtra(offset) {
  return EXTRA_SEED.map(
    (
      [fileName, title, kind, ext, bytes, width, height, uploadedAt, tags, useCount, gradient],
      i
    ) => ({
      id: `MED-${String(offset + i + 1).padStart(4, "0")}`,
      fileName,
      title,
      // Bazı görseller bilerek alt metinsiz — "alt metni eksik" uyarısı ve
    // hızlı görünümü demo'da görülebilsin.
    alt: kind === "image" && i % 4 !== 2 ? `${title} görseli` : "",
      description: "",
      tags,
      kind,
      ext,
      bytes,
      width,
      height,
      uploadedAt,
      usedIn: Array.from({ length: useCount }, (_, u) => ({
        id: `LST-${String(300 + i * 2 + u).padStart(5, "0")}`,
        label: `${title} — ürün ${u + 1}`,
      })),
      owner: i % 7 === 3 ? OWNER_SHARED : OWNER_SELF,
      favorite: i % 5 === 1,
      archived: false,
      gradient,
    })
  );
}

/** Görsel olup alt metni boş olanlar — SEO/erişilebilirlik uyarısı. */
function isMissingAlt(item) {
  return item.kind === "image" && !item.alt.trim();
}

/** Demo depolama kotası (mock) — kullanım çubuğu için. */
export const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;

let uploadSeq = 0;

export const useMediaStore = defineStore("media", () => {
  // ── state ──────────────────────────────────────────────────────────
  const items = ref([...seed(), ...buildExtra(12)]);
  const loading = ref(false);

  // Filtreler `useDataTable` sözleşmesiyle aynı şekilde tutulur (panelin table
  // list standardı): çoklu seçimler DİZİ (boş dizi = "tümü"), sayısal alanlar
  // {min,max}, tarih {from,to}. Sayfa bunları `dt.filters`'tan tek yönlü
  // besler; ray, sütun filtresi ve çekmece aynı state'i yazar.
  const search = ref("");
  const nameFilter = ref(""); // dosya adı sütun filtresi (aramadan bağımsız)
  const kindFilter = ref([]); // image | video | document
  const usageFilter = ref([]); // used | unused
  const ownerFilter = ref([]); // self | shared
  const showArchived = ref(false);
  const formatFilter = ref([]); // WEBP | JPG | PDF | MP4 …
  const orientationFilter = ref([]); // landscape | portrait | square
  const dateFilter = ref([]); // today | week | month | year (kova)
  const sizeFilter = ref([]); // small (<500KB) | medium (<5MB) | large (kova)
  const sizeRange = ref(null); // { min, max } — MB cinsinden sütun filtresi
  const usageRange = ref(null); // { min, max } — kullanıldığı ürün sayısı
  const dateRange = ref(null); // { from, to } — YYYY-MM-DD
  const tagFilter = ref([]); // çoklu etiket — hepsi eşleşmeli (AND)
  const flagFilter = ref([]); // favorite | missingAlt (AND)
  /** Çoklu sıralama — [{ field, desc }]; Shift+tık ile birden fazla sütun. */
  const sorting = ref([{ field: "uploadedAt", desc: true }]);

  // Sayfalama — ListPagination bileşeniyle sürülür.
  const page = ref(1);
  const pageSize = ref(12);

  const selectedIds = ref([]);
  const activeId = ref(null);
  /** Shift+tık aralık seçiminin çapası. */
  const lastAnchorId = ref(null);
  /** Son yıkıcı işlemin geri alma kaydı — { type, label, restore } */
  const undoEntry = ref(null);

  /** Yükleme kuyruğu — { id, name, bytes, progress, status, error } */
  const uploads = ref([]);
  const uploadTimers = new Map();

  // ── getters ────────────────────────────────────────────────────────
  const activeItem = computed(() => items.value.find((m) => m.id === activeId.value) || null);

  const selectedItems = computed(() =>
    selectedIds.value.map((id) => items.value.find((m) => m.id === id)).filter(Boolean)
  );

  /** Sayaçlar filtre uygulanmadan hesaplanır — rozet rakamları sabit kalsın. */
  const counts = computed(() => {
    const live = items.value.filter((m) => !m.archived);
    return {
      all: live.length,
      image: live.filter((m) => m.kind === "image").length,
      video: live.filter((m) => m.kind === "video").length,
      document: live.filter((m) => m.kind === "document").length,
      used: live.filter((m) => m.usedIn.length > 0).length,
      unused: live.filter((m) => m.usedIn.length === 0).length,
      shared: live.filter((m) => m.owner === OWNER_SHARED).length,
      archived: items.value.filter((m) => m.archived).length,
      favorite: live.filter((m) => m.favorite).length,
      missingAlt: live.filter(isMissingAlt).length,
      bytes: live.reduce((sum, m) => sum + m.bytes, 0),
    };
  });

  const filtered = computed(() => {
    const name = nameFilter.value.trim().toLocaleLowerCase("tr");
    const list = items.value.filter((m) => {
      if (m.archived !== showArchived.value) return false;
      if (name && !m.fileName.toLocaleLowerCase("tr").includes(name)) return false;
      if (!inSet(kindFilter.value, m.kind)) return false;
      if (!inSet(usageFilter.value, m.usedIn.length ? "used" : "unused")) return false;
      if (!inSet(ownerFilter.value, m.owner)) return false;
      if (!inSet(formatFilter.value, m.ext)) return false;
      if (!inSet(orientationFilter.value, orientationOf(m))) return false;
      // Kovalar OR, farklı filtreler AND: "küçük veya orta" ama "ve WEBP".
      if (sizeFilter.value.length && !sizeFilter.value.some((b) => SIZE_BUCKETS[b]?.(m.bytes)))
        return false;
      if (
        dateFilter.value.length &&
        !dateFilter.value.some((d) => withinDays(m.uploadedAt, DATE_WINDOWS[d]))
      )
        return false;
      if (!inRange(sizeRange.value, m.bytes / 1_000_000)) return false;
      if (!inRange(usageRange.value, m.usedIn.length)) return false;
      if (!inDateRange(dateRange.value, m.uploadedAt)) return false;
      if (tagFilter.value.length && !tagFilter.value.every((t) => m.tags.includes(t))) return false;
      if (!matchesFlags(flagFilter.value, m)) return false;
      return matchesQuery(m, search.value);
    });

    return [...list].sort(compareBySorting);
  });

  /** Çoklu sıralama: ilk eşitsizlikte karar verilir (Shift+tık sırası). */
  function compareBySorting(a, b) {
    for (const rule of sorting.value) {
      const get = SORT_ACCESSORS[rule.field];
      if (!get) continue;
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === "string" ? av.localeCompare(bv, "tr") : av - bv;
      if (cmp) return rule.desc ? -cmp : cmp;
    }
    return 0;
  }

  /** Görünen sayfa — ızgara ve tablo bunu render eder. */
  const paged = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filtered.value.slice(start, start + pageSize.value);
  });

  const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));

  /** Etiket bulutu — yalnızca arşiv durumu eşleşen kayıtlardan sayılır. */
  const availableTags = computed(() => {
    const counter = new Map();
    for (const m of items.value) {
      if (m.archived !== showArchived.value) continue;
      for (const tag of m.tags) counter.set(tag, (counter.get(tag) || 0) + 1);
    }
    return [...counter.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "tr"));
  });

  /** Kütüphanede gerçekten bulunan formatlar — sabit liste yerine veriden. */
  const availableFormats = computed(() => {
    const counter = new Map();
    for (const m of items.value) {
      if (m.archived !== showArchived.value) continue;
      counter.set(m.ext, (counter.get(m.ext) || 0) + 1);
    }
    return [...counter.entries()]
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count);
  });

  const hasActiveFilter = computed(
    () =>
      Boolean(search.value.trim()) ||
      Boolean(nameFilter.value.trim()) ||
      [
        kindFilter,
        usageFilter,
        ownerFilter,
        formatFilter,
        orientationFilter,
        dateFilter,
        sizeFilter,
        tagFilter,
        flagFilter,
      ].some((r) => r.value.length > 0) ||
      Boolean(sizeRange.value || usageRange.value || dateRange.value) ||
      showArchived.value
  );

  // ── actions: seçim ─────────────────────────────────────────────────
  function isSelected(id) {
    return selectedIds.value.includes(id);
  }

  function toggleSelect(id) {
    selectedIds.value = isSelected(id)
      ? selectedIds.value.filter((x) => x !== id)
      : [...selectedIds.value, id];
    lastAnchorId.value = id;
  }

  /**
   * Shift+tık aralık seçimi (Drive/Finder davranışı): son çapa ile tıklanan
   * öge arasındaki görünen tüm medyayı seçime ekler.
   */
  function selectRangeTo(id) {
    const visible = filtered.value.map((m) => m.id);
    const anchor = visible.indexOf(lastAnchorId.value);
    const target = visible.indexOf(id);
    if (anchor === -1 || target === -1) {
      toggleSelect(id);
      return;
    }
    const [from, to] = anchor < target ? [anchor, target] : [target, anchor];
    const range = visible.slice(from, to + 1);
    selectedIds.value = [...new Set([...selectedIds.value, ...range])];
  }

  function setActive(id) {
    activeId.value = id;
  }

  /** Filtre sonucunun tamamını seçer (sayfa değil). */
  function selectAllVisible() {
    selectedIds.value = filtered.value.map((m) => m.id);
  }

  /** Yalnızca açık sayfadakileri seçer. */
  function selectPage() {
    selectedIds.value = [...new Set([...selectedIds.value, ...paged.value.map((m) => m.id)])];
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  // ── actions: filtre ────────────────────────────────────────────────
  function resetFilters() {
    search.value = "";
    nameFilter.value = "";
    kindFilter.value = [];
    usageFilter.value = [];
    ownerFilter.value = [];
    formatFilter.value = [];
    orientationFilter.value = [];
    dateFilter.value = [];
    sizeFilter.value = [];
    sizeRange.value = null;
    usageRange.value = null;
    dateRange.value = null;
    tagFilter.value = [];
    flagFilter.value = [];
    showArchived.value = false;
    page.value = 1;
  }

  /** Etiket filtresini aç/kapat — çoklu seçim (AND). */
  function toggleTag(tag) {
    tagFilter.value = tagFilter.value.includes(tag)
      ? tagFilter.value.filter((t) => t !== tag)
      : [...tagFilter.value, tag];
  }

  /** Birincil sıralamanın yönünü çevirir (araç çubuğundaki yön düğmesi). */
  function toggleSortDir() {
    const [first, ...rest] = sorting.value;
    if (!first) return;
    sorting.value = [{ ...first, desc: !first.desc }, ...rest];
  }

  // ── actions: mutasyon (mock) ───────────────────────────────────────
  /** Ortak medya salt-okunur — medya.md §Satıcı Kuralları. */
  function canEdit(item) {
    return Boolean(item) && item.owner === OWNER_SELF;
  }

  function update(id, patch) {
    const item = items.value.find((m) => m.id === id);
    if (!item || !canEdit(item)) return false;
    Object.assign(item, patch);
    return true;
  }

  function addTagToMany(ids, tag) {
    const clean = tag.trim();
    if (!clean) return 0;
    let n = 0;
    for (const id of ids) {
      const item = items.value.find((m) => m.id === id);
      if (!item || !canEdit(item) || item.tags.includes(clean)) continue;
      item.tags = [...item.tags, clean];
      n += 1;
    }
    return n;
  }

  function archiveMany(ids, archived = true) {
    const changed = [];
    for (const id of ids) {
      const item = items.value.find((m) => m.id === id);
      if (!item || !canEdit(item) || item.archived === archived) continue;
      item.archived = archived;
      changed.push(id);
    }
    selectedIds.value = [];
    if (changed.length) {
      undoEntry.value = {
        type: archived ? "archive" : "unarchive",
        count: changed.length,
        restore: () => archiveMany(changed, !archived),
      };
    }
    return changed.length;
  }

  function removeMany(ids) {
    const removable = ids.filter((id) => canEdit(items.value.find((m) => m.id === id)));
    // Silinenleri sıralı konumlarıyla sakla — geri alınca yerine dönsün.
    const snapshot = removable
      .map((id) => ({
        index: items.value.findIndex((m) => m.id === id),
        item: items.value.find((m) => m.id === id),
      }))
      .sort((a, b) => a.index - b.index);

    items.value = items.value.filter((m) => !removable.includes(m.id));
    selectedIds.value = selectedIds.value.filter((id) => !removable.includes(id));
    if (removable.includes(activeId.value)) activeId.value = null;

    if (snapshot.length) {
      undoEntry.value = {
        type: "delete",
        count: snapshot.length,
        restore: () => {
          const next = [...items.value];
          for (const { index, item } of snapshot) next.splice(index, 0, item);
          items.value = next;
          undoEntry.value = null;
        },
      };
    }
    return removable.length;
  }

  /** Favori aç/kapat — ortak medyada da serbest (kişisel işaret). */
  function toggleFavorite(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item) return false;
    item.favorite = !item.favorite;
    return item.favorite;
  }

  /** Dosya adını değiştirir; uzantı korunur. */
  function rename(id, nextName) {
    const item = items.value.find((m) => m.id === id);
    const clean = (nextName || "").trim();
    if (!item || !canEdit(item) || !clean) return false;
    const ext = item.fileName.includes(".")
      ? item.fileName.slice(item.fileName.lastIndexOf("."))
      : "";
    const base = clean.endsWith(ext) ? clean.slice(0, -ext.length) : clean;
    item.fileName = `${base}${ext}`;
    return true;
  }

  /** Kaydı çoğaltır — kullanım bağları taşınmaz, yeni kayıt boştur. */
  function duplicate(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item) return null;
    const copy = {
      ...item,
      id: `MED-${String(items.value.length + 1).padStart(4, "0")}`,
      fileName: item.fileName.replace(/(\.[^.]+)?$/, (ext) => `-kopya${ext || ""}`),
      title: `${item.title} (kopya)`,
      usedIn: [],
      owner: OWNER_SELF,
      favorite: false,
      tags: [...item.tags],
      uploadedAt: new Date().toISOString().slice(0, 19),
    };
    items.value = [copy, ...items.value];
    return copy;
  }

  /**
   * Dosyayı değiştirir — kayıt, kullanım bağları ve metin alanları korunur.
   * Gerçek yükleme yok; yalnız boyut/tür/uzantı güncellenir.
   */
  function replaceFile(id, file) {
    const item = items.value.find((m) => m.id === id);
    if (!item || !canEdit(item) || !file) return false;
    item.bytes = file.size;
    item.ext = extOf(file.name);
    item.kind = kindOf(file);
    item.uploadedAt = new Date().toISOString().slice(0, 19);
    return true;
  }

  /** Mock dosya bağlantısı — kopyala butonları bunu kullanır. */
  function fileUrl(item) {
    return item ? `/files/medya/${item.fileName}` : "";
  }

  /** Son yıkıcı işlemi geri alır; yoksa false döner. */
  function undo() {
    if (!undoEntry.value) return false;
    const entry = undoEntry.value;
    undoEntry.value = null;
    entry.restore();
    undoEntry.value = null;
    return true;
  }

  // ── actions: yükleme (mock ilerleme) ───────────────────────────────
  function extOf(name) {
    const dot = name.lastIndexOf(".");
    return dot > -1 ? name.slice(dot + 1).toUpperCase() : "DOSYA";
  }

  function kindOf(file) {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "document";
  }

  function stopUpload(uploadId) {
    const timer = uploadTimers.get(uploadId);
    if (timer) {
      clearInterval(timer);
      uploadTimers.delete(uploadId);
    }
  }

  /**
   * Gerçek yükleme yok: dosya başına sahte ilerleme sayacı işletilir.
   * 12 MB üzeri dosyalar "boyut aşımı" ile hata durumuna düşer — hatalı dosya
   * ve yeniden deneme akışının UI'da görünmesi için.
   */
  function enqueueUploads(files) {
    for (const file of files) {
      const id = `up-${++uploadSeq}`;
      uploads.value = [
        ...uploads.value,
        {
          id,
          name: file.name,
          bytes: file.size,
          kind: kindOf(file),
          ext: extOf(file.name),
          progress: 0,
          status: "uploading",
          error: null,
        },
      ];
      runUpload(id);
    }
  }

  function runUpload(uploadId) {
    stopUpload(uploadId);
    const timer = setInterval(() => {
      const up = uploads.value.find((u) => u.id === uploadId);
      if (!up || up.status !== "uploading") {
        stopUpload(uploadId);
        return;
      }
      up.progress = Math.min(100, up.progress + Math.round(8 + Math.random() * 14));
      if (up.progress < 100) return;

      stopUpload(uploadId);
      if (up.bytes > 12 * 1024 * 1024) {
        up.status = "error";
        up.progress = 100;
        up.error = "sizeLimit";
        return;
      }
      up.status = "done";
      items.value = [makeItemFromUpload(up), ...items.value];
    }, 320);
    uploadTimers.set(uploadId, timer);
  }

  function makeItemFromUpload(up) {
    const stamp = String(items.value.length + 1).padStart(4, "0");
    return {
      id: `MED-${stamp}`,
      fileName: up.name,
      title: up.name.replace(/\.[^.]+$/, ""),
      alt: "",
      description: "",
      tags: [],
      kind: up.kind,
      ext: up.ext,
      bytes: up.bytes,
      width: up.kind === "image" ? 1200 : null,
      height: up.kind === "image" ? 1200 : null,
      uploadedAt: new Date().toISOString().slice(0, 19),
      usedIn: [],
      owner: OWNER_SELF,
      favorite: false,
      archived: false,
      gradient: up.kind === "image" ? ["#f5b800", "#ffd54d"] : null,
    };
  }

  function retryUpload(uploadId) {
    const up = uploads.value.find((u) => u.id === uploadId);
    if (!up) return;
    up.status = "uploading";
    up.progress = 0;
    up.error = null;
    runUpload(uploadId);
  }

  function cancelUpload(uploadId) {
    stopUpload(uploadId);
    uploads.value = uploads.value.filter((u) => u.id !== uploadId);
  }

  function clearFinishedUploads() {
    for (const up of uploads.value) {
      if (up.status !== "uploading") stopUpload(up.id);
    }
    uploads.value = uploads.value.filter((u) => u.status === "uploading");
  }

  return {
    // state
    items,
    loading,
    search,
    nameFilter,
    kindFilter,
    usageFilter,
    ownerFilter,
    showArchived,
    formatFilter,
    orientationFilter,
    dateFilter,
    sizeFilter,
    sizeRange,
    usageRange,
    dateRange,
    tagFilter,
    flagFilter,
    sorting,
    page,
    pageSize,
    selectedIds,
    activeId,
    undoEntry,
    uploads,
    // getters
    activeItem,
    selectedItems,
    counts,
    filtered,
    paged,
    totalPages,
    availableTags,
    availableFormats,
    hasActiveFilter,
    // actions
    isSelected,
    toggleSelect,
    selectRangeTo,
    undo,
    setActive,
    selectAllVisible,
    selectPage,
    clearSelection,
    resetFilters,
    toggleTag,
    toggleSortDir,
    canEdit,
    update,
    toggleFavorite,
    rename,
    duplicate,
    replaceFile,
    fileUrl,
    addTagToMany,
    archiveMany,
    removeMany,
    enqueueUploads,
    retryUpload,
    cancelUpload,
    clearFinishedUploads,
  };
});
