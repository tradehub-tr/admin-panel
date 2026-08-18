/**
 * Kart işlem menüsünün tek kaynağı.
 *
 * Kart, detay paneli ve klavye kısayolları aynı listeyi okur; işlem eklemek
 * için tek yer değişir (tekrarlı yapı önlemi). `icon` ve `labelKey` fonksiyon
 * çünkü arşiv/arşivden-çıkar gibi durumlar medyaya göre değişir.
 */
export const CARD_ACTIONS = [
  {
    // Yalnız dead-letter'daki videoda (TUR-296) — diğer durumlarda göstermek
    // "her video yeniden işlenebilir" izlenimi verir. `visibleWhen` yoksa
    // işlem her medyada görünür (mevcut davranış).
    id: "retryVideo",
    icon: () => "refresh-cw",
    labelKey: () => "media.actions.retryVideo",
    visibleWhen: (item) => item.videoStatus === "failed",
    needsEdit: true,
  },
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
    // Ürününde kullanılan dosya silinemez: düğme kapanır ve etiketi sebebi
    // söyler. Açık bırakılsaydı basılınca arka taraf reddederdi ama kullanıcı
    // neden olmadığını göremezdi — "hiçbir şey olmadı" izlenimi kalırdı.
    // "Sil" = KALICI silme. Arşivleme ayrı eylem; ikisi ayrı iş yapıyor.
    // Arşivde de gösterilir: oradaki dosya da kalıcı silinebilmeli.
    labelKey: (item) =>
      (item.liveUsage || 0) > 0 ? "media.actions.deleteBlocked" : "media.actions.purge",
    needsEdit: true,
    blockedWhenUsed: true,
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
