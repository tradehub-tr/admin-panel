import KanbanBoard from "./KanbanBoard.vue";

/**
 * Kanban panosu. Lojistikte sevkiyatları duruma göre göstermek için aday —
 * sütunlar sevkiyat durum makinesinden gelir.
 */
export default {
  title: "Ortak/KanbanBoard",
  component: KanbanBoard,
  tags: ["autodocs"],
};

const COLUMNS = [
  { value: "Pending", label: "Beklemede" },
  { value: "Picked Up", label: "Alındı" },
  { value: "In Transit", label: "Yolda" },
  { value: "Delivered", label: "Teslim Edildi" },
];

const ITEMS = [
  { name: "SHP-2026-00001", title: "Yurtiçi Kargo · İstanbul", status: "Pending" },
  { name: "SHP-2026-00002", title: "Aras Kargo · Ankara", status: "Picked Up" },
  { name: "SHP-2026-00003", title: "MNG Kargo · İzmir", status: "In Transit" },
  { name: "SHP-2026-00004", title: "Yurtiçi Kargo · Bursa", status: "In Transit" },
  { name: "SHP-2026-00005", title: "PTT Kargo · Şanlıurfa", status: "Delivered" },
];

export const Default = {
  name: "Dolu",
  args: {
    columns: COLUMNS,
    items: ITEMS,
    statusField: "status",
    columnCounts: { Pending: 1, "Picked Up": 1, "In Transit": 2, Delivered: 1 },
  },
};

export const Empty = {
  name: "Boş",
  args: { columns: COLUMNS, items: [], statusField: "status" },
};

/** Bir sütun yükleniyor, biri hatalı — kısmi durum davranışı. */
export const PartialStates = {
  name: "Kısmi durumlar",
  args: {
    columns: COLUMNS,
    items: ITEMS,
    statusField: "status",
    columnLoading: { "In Transit": true },
    columnErrors: { Delivered: "Sunucuya ulaşılamadı" },
    columnHasMore: { Pending: true },
    loadMoreText: "Daha fazla yükle",
    loadingText: "Yükleniyor…",
    retryText: "Yeniden dene",
  },
};
