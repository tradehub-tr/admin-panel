import LinkTreePicker from "./LinkTreePicker.vue";

/** Ağaç yapılı Link seçici (kategori gibi `is_tree` DocType'lar için). */
export default {
  title: "Ortak/LinkTreePicker",
  component: LinkTreePicker,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { LinkTreePicker },
  setup: () => ({ args }),
  data: () => ({ value: "" }),
  template: `<div class="max-w-md"><LinkTreePicker v-bind="args" v-model="value" /></div>`,
});

export const Flat = {
  name: "Düz liste",
  render: Template,
  args: { doctype: "Logistics Provider", placeholder: "Taşıyıcı seçin" },
};

export const Tree = {
  name: "Ağaç",
  render: Template,
  args: { doctype: "Product Category", isTree: true, placeholder: "Kategori seçin" },
};
