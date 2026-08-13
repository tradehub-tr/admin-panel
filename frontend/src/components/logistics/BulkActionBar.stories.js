import BulkActionBar from "./BulkActionBar.vue";
import BulkResultSummary from "./BulkResultSummary.vue";

/**
 * Toplu aksiyon çubuğu ve sonuç özeti (TUR-117).
 *
 * TUR-117 kabul kriteri: *"Toplu işlemler kısmi hata özeti verir."*
 * Sessizce "tamamlandı" demek yanıltıcı olur.
 */
export default {
  title: "Lojistik/Ortak/BulkActionBar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-common-bulk-action-bar",
  component: BulkActionBar,
  tags: ["autodocs"],
};

export const Default = {
  name: "Seçim var",
  render: (args) => ({
    components: { BulkActionBar },
    setup: () => ({ args }),
    template: `
      <BulkActionBar v-bind="args">
        <button type="button" class="th-btn-outline text-xs">Etiket yazdır</button>
        <button type="button" class="th-btn-dark text-xs">Durum güncelle</button>
      </BulkActionBar>
    `,
  }),
  args: { count: 12 },
};

/**
 * Seçim yokken çubuk hiç render edilmez (`v-if`). Boş bir sayfa yerine
 * bağlamla gösteriliyor ki incelemeci "bozuk mu?" diye düşünmesin.
 */
export const Hidden = {
  name: "Seçim yok (gizli)",
  render: (args) => ({
    components: { BulkActionBar },
    setup: () => ({ args }),
    template: `
      <div>
        <p class="mb-4 rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600">
          Aşağıda çubuk <strong>bilinçli olarak yok</strong> — seçim sıfırken
          gizleniyor. Liste ekranında bu, sayfanın altında boş bir şerit
          kalmaması demek.
        </p>
        <BulkActionBar v-bind="args">
          <button type="button" class="th-btn-outline text-xs">Etiket yazdır</button>
        </BulkActionBar>
      </div>
    `,
  }),
  args: { count: 0 },
};

export const ResultAllSucceeded = {
  name: "Sonuç — hepsi başarılı",
  render: (args) => ({
    components: { BulkResultSummary },
    setup: () => ({ args }),
    template: `<BulkResultSummary v-bind="args" />`,
  }),
  args: { succeeded: 12, failed: [] },
};

export const ResultPartialFailure = {
  name: "Sonuç — kısmi hata",
  render: ResultAllSucceeded.render,
  args: {
    succeeded: 9,
    failed: [
      { name: "SHP-2026-00038", message: "Geçersiz durum geçişi: Failed → Delivered" },
      { name: "SHP-2026-00035", message: "Bu işlem için yetkiniz yok" },
      { name: "SHP-2026-00030", message: "Taşıyıcı API'si yanıt vermedi" },
    ],
  },
};
