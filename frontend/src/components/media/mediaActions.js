/**
 * Kart işlem menüsünün tek kaynağı.
 *
 * Kart, detay paneli ve klavye kısayolları aynı listeyi okur; işlem eklemek
 * için tek yer değişir (tekrarlı yapı önlemi). `icon` ve `labelKey` fonksiyon
 * çünkü arşiv/arşivden-çıkar gibi durumlar medyaya göre değişir.
 */
export const CARD_ACTIONS = [
  {
    id: "preview",
    icon: () => "eye",
    labelKey: () => "media.actions.preview",
  },
  {
    id: "edit",
    icon: () => "pencil",
    labelKey: () => "media.actions.edit",
    needsEdit: true,
  },
  {
    id: "use",
    icon: () => "package",
    labelKey: () => "media.actions.useInProduct",
  },
  {
    id: "download",
    icon: () => "download",
    labelKey: () => "media.actions.download",
  },
  {
    id: "copyLink",
    icon: () => "copy",
    labelKey: () => "media.actions.copyLink",
  },
  {
    id: "duplicate",
    icon: () => "layers",
    labelKey: () => "media.actions.duplicate",
  },
  {
    id: "archive",
    icon: (item) => (item.archived ? "archive-restore" : "archive"),
    labelKey: (item) => (item.archived ? "media.actions.unarchive" : "media.actions.archive"),
    needsEdit: true,
  },
  {
    id: "delete",
    icon: () => "trash-2",
    labelKey: () => "media.actions.delete",
    needsEdit: true,
    danger: true,
  },
];

/**
 * Kart üzerinde hover/odakla çıkan hızlı işlemler.
 * Menüyü açmadan tek tıkla erişim — kısayol bilmeyen kullanıcı için görünür yol.
 * `CARD_ACTIONS`'ın alt kümesi; id'ler aynı handler'a düşer.
 */
export const QUICK_ACTIONS = [
  { id: "preview", icon: "eye", labelKey: "media.actions.preview" },
  { id: "edit", icon: "pencil", labelKey: "media.actions.edit", needsEdit: true },
  { id: "download", icon: "download", labelKey: "media.actions.download" },
];
