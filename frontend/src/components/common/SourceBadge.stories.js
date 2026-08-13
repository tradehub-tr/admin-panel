import SourceBadge from "./SourceBadge.vue";

/**
 * Kaydın kaynağını gösteren rozet — toplu içe aktarma işiyle oluşturulmuş
 * kayıtlar için işe bağlantı üretir.
 */
export default {
  title: "Ortak/SourceBadge",
  component: SourceBadge,
  tags: ["autodocs"],
};

export const Manual = {
  name: "Elle oluşturulmuş",
  args: { bulkJob: null },
};

export const FromBulkImport = {
  name: "Toplu içe aktarmadan",
  args: { bulkJob: "BULK-IMPORT-2026-0042" },
};
