import CoreDocTypePicker from "./CoreDocTypePicker.vue";

/**
 * Çekirdek DocType seçici. Backend'den DocType listesi ve meta çeker —
 * Storybook'ta `.storybook/mocks/api.js` yanıt veriyor.
 */
export default {
  title: "Form Alanları/CoreDocTypePicker",
  component: CoreDocTypePicker,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { CoreDocTypePicker },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `
    <div class="max-w-md">
      <CoreDocTypePicker v-bind="args" v-model="value" />
      <p class="mt-3 text-xs text-slate-500">Seçili: <code>{{ value || "—" }}</code></p>
    </div>
  `,
});

export const Default = {
  render: Template,
  args: {
    field: { fieldname: "source_doctype", label: "Kaynak DocType" },
    formData: {},
    placeholder: "DocType seçin",
  },
};
