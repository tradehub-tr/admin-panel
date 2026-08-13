import Skeleton from "./Skeleton.vue";

/**
 * Yükleniyor iskeleti. Lojistik katalog tablolarında veri gelene kadar
 * yerleşim kaymasını (CLS) önlemek için kullanılacak.
 */
export default {
  title: "Ortak/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["text", "circle", "rect", "card"] },
    count: { control: { type: "number", min: 1, max: 8 } },
  },
};

export const Text = { name: "Metin", args: { variant: "text", count: 3 } };

export const Circle = { name: "Daire", args: { variant: "circle" } };

export const Rect = {
  name: "Dikdörtgen",
  args: { variant: "rect", width: "100%", height: "120px" },
};

/** Katalog listesi beklerken gösterilecek satır iskeleti. */
export const TableRows = {
  name: "Tablo satırları",
  render: (args) => ({
    components: { Skeleton },
    setup: () => ({ args }),
    template: `
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4">
          <Skeleton variant="circle" width="32px" height="32px" />
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="15%" />
        </div>
      </div>
    `,
  }),
};
