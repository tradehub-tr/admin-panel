import EditableCell from "./EditableCell.vue";

/** Tablo içi düzenlenebilir hücre. Katalog tablolarında hızlı düzenleme için. */
export default {
  title: "Ortak/DataTable/EditableCell",
  component: EditableCell,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: false },
    type: { control: "select", options: ["text", "number"] },
    align: { control: "select", options: ["left", "center", "right"] },
  },
};

const Template = (args) => ({
  components: { EditableCell },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue }),
  template: `
    <table class="w-full max-w-md"><tbody><tr>
      <td class="border p-2"><EditableCell v-bind="args" v-model="value" /></td>
    </tr></tbody></table>
  `,
});

export const Text = { name: "Metin", render: Template, args: { modelValue: "Yurtiçi Kargo" } };

export const Number = {
  name: "Sayı",
  render: Template,
  args: { modelValue: 30, type: "number", align: "right" },
};

/** Biçimlendirilmiş görünüm — düzenlerken ham değer, kapalıyken biçimli. */
export const Formatted = {
  name: "Biçimlendirilmiş",
  render: Template,
  args: { modelValue: 89.9, type: "number", display: "89,90 ₺", align: "right" },
};
