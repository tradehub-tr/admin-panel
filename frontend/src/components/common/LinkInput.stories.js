import LinkInput from "./LinkInput.vue";

/**
 * Frappe Link alanı seçici. Yazdıkça bağlı DocType'ta arama yapar.
 *
 * Storybook'ta backend yok — `@/utils/api` `.storybook/mocks/api.js` ile
 * değiştiriliyor ve kargo sağlayıcıları döndürüyor. Arama kutusuna "kargo"
 * yazıldığında sonuç listesi görünmeli.
 */
export default {
  title: "Ortak/LinkInput",
  component: LinkInput,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: false },
    doctype: { control: "text" },
    placeholder: { control: "text" },
  },
};

const Template = (args) => ({
  components: { LinkInput },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `
    <div class="max-w-md">
      <LinkInput v-bind="args" v-model="value" />
      <p class="mt-3 text-xs text-slate-500">Seçili değer: <code>{{ value || "—" }}</code></p>
    </div>
  `,
});

export const Default = {
  name: "Boş",
  render: Template,
  args: { doctype: "Logistics Provider", placeholder: "Taşıyıcı seçin" },
};

export const Preselected = {
  name: "Seçili değerle",
  render: Template,
  args: {
    doctype: "Logistics Provider",
    placeholder: "Taşıyıcı seçin",
    modelValue: "YK",
  },
};

/** Filtreli kullanım — yalnız aktif kayıtlar. */
export const Filtered = {
  name: "Filtreli",
  render: Template,
  args: {
    doctype: "Logistics Provider",
    placeholder: "Yalnız aktif taşıyıcılar",
    filters: [["is_active", "=", 1]],
  },
};
