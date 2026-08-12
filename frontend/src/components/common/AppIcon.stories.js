import AppIcon from "./AppIcon.vue";

/**
 * Merkezî ikon bileşeni. İkon adları `iconRegistry.js` üzerinden çözülür —
 * component'ler lucide'ı doğrudan import etmez.
 */
export default {
  title: "Ortak/AppIcon",
  component: AppIcon,
  tags: ["autodocs"],
  argTypes: {
    name: { control: "text" },
    size: { control: { type: "number", min: 12, max: 64 } },
    strokeWidth: { control: { type: "number", min: 1, max: 3, step: 0.5 } },
  },
};

export const Default = { args: { name: "truck", size: 24 } };

export const Sizes = {
  name: "Boyutlar",
  render: () => ({
    components: { AppIcon },
    template: `
      <div class="flex items-end gap-4">
        <AppIcon v-for="s in [16, 20, 24, 32, 48]" :key="s" name="package" :size="s" />
      </div>
    `,
  }),
};

/** Lojistik ekranlarında kullanılacak ikon kümesi. */
export const LogisticsSet = {
  name: "Lojistik ikonları",
  render: () => ({
    components: { AppIcon },
    setup: () => ({
      icons: ["truck", "package", "map-pin", "clock", "alert-triangle", "check-circle"],
    }),
    template: `
      <div class="flex flex-wrap gap-6">
        <div v-for="n in icons" :key="n" class="flex flex-col items-center gap-2 w-24">
          <AppIcon :name="n" :size="28" />
          <span class="text-xs text-slate-500">{{ n }}</span>
        </div>
      </div>
    `,
  }),
};
