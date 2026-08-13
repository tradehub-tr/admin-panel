import DtFilterControl from "./DtFilterControl.vue";

/** DataTable filtre kontrolü — alanın `filter` tanımına göre kontrol üretir. */
export default {
  title: "Ortak/DataTable/DtFilterControl",
  component: DtFilterControl,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { DtFilterControl },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue }),
  template: `
    <div class="max-w-xs">
      <DtFilterControl v-bind="args" v-model="value" />
      <p class="mt-3 text-xs text-slate-500">Değer: <code>{{ value ?? "—" }}</code></p>
    </div>
  `,
});

export const Select = {
  name: "Seçim",
  render: Template,
  args: {
    field: {
      label: "Sağlayıcı Tipi",
      filter: {
        type: "select",
        options: [
          { value: "Kargo", label: "Kargo" },
          { value: "Ambar", label: "Ambar" },
          { value: "Kurye", label: "Kurye" },
        ],
      },
    },
  },
};

export const TextFilter = {
  name: "Metin",
  render: Template,
  args: { field: { label: "Şube Adı", filter: { type: "text" } } },
};
