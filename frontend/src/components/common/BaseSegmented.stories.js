import BaseSegmented from "./BaseSegmented.vue";

/** Segment kontrolü — az sayıda birbirini dışlayan seçenek için. */
export default {
  title: "Ortak/BaseSegmented",
  component: BaseSegmented,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { BaseSegmented },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? args.options?.[0]?.value }),
  template: `<BaseSegmented v-bind="args" v-model="value" />`,
});

export const Default = {
  render: Template,
  args: {
    options: [
      { value: "all", label: "Tümü" },
      { value: "active", label: "Aktif" },
      { value: "passive", label: "Pasif" },
    ],
  },
};

/** Lojistik: ortam seçimi (taşıyıcı hesabı formunda). */
export const Environment = {
  name: "Ortam seçimi",
  render: Template,
  args: {
    options: [
      { value: "Sandbox", label: "Test" },
      { value: "Production", label: "Canlı" },
    ],
    modelValue: "Sandbox",
  },
};
