import CategoryTreePicker from "./CategoryTreePicker.vue";

/**
 * Kategori ağacı seçici. Ağacı ve aramayı backend'den çeker —
 * Storybook'ta `.storybook/mocks/api.js` yanıt veriyor.
 */
export default {
  title: "Ortak/DataTable/CategoryTreePicker",
  component: CategoryTreePicker,
  tags: ["autodocs"],
};

export const Default = {
  render: (args) => ({
    components: { CategoryTreePicker },
    setup: () => ({ args }),
    data: () => ({ value: null }),
    template: `<div class="max-w-md"><CategoryTreePicker v-bind="args" v-model="value" /></div>`,
  }),
  args: {},
};
