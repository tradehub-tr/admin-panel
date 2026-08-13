import { ref } from "vue";

import DetailTabs from "./DetailTabs.vue";

/** Sevkiyat detayının sekme kabuğu (TUR-117) — sayaç ve dikkat noktası taşır. */
export default {
  title: "Lojistik/Ortak/DetailTabs",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-common-detail-tabs",
  component: DetailTabs,
  tags: ["autodocs"],
};

const Template = (args) => ({
  components: { DetailTabs },
  setup() {
    const active = ref(args.modelValue ?? args.tabs[0].key);
    return { args, active };
  },
  template: `
    <DetailTabs v-bind="args" v-model="active">
      <template #default="{ active }">
        <div class="rounded border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-600">
          "{{ active }}" sekmesinin içeriği
        </div>
      </template>
    </DetailTabs>
  `,
});

export const Default = {
  render: Template,
  args: {
    tabs: [
      { key: "items", label: "Ürünler", count: 2 },
      { key: "packages", label: "Paketler", count: 3 },
      { key: "documents", label: "Belgeler", count: 0 },
      { key: "tracking", label: "Takip", count: 3 },
      { key: "legs", label: "Bacaklar", count: 3 },
      { key: "cost", label: "Maliyet" },
    ],
  },
};

/** Bir sekme dikkat istiyor — operasyon açmadan görmeli. */
export const WithAlert = {
  name: "Dikkat gerektiren sekme",
  render: Template,
  args: {
    tabs: [
      { key: "items", label: "Ürünler", count: 2 },
      { key: "packages", label: "Paketler", count: 3, alert: true },
      { key: "tracking", label: "Takip", count: 12 },
    ],
  },
};

/** Çok sekme — yatay kaydırma davranışı (mobilde kritik). */
export const ManyTabs = {
  name: "Çok sekmeli",
  render: Template,
  args: {
    tabs: [
      "Ürünler", "Paketler", "Belgeler", "Takip", "Bacaklar",
      "Maliyet", "İade", "Teslim Kanıtı", "Denetim",
    ].map((label, i) => ({ key: `t${i}`, label, count: i * 2 })),
  },
};
