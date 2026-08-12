import IconPickerField from "./IconPickerField.vue";

/**
 * Lucide ikon seçici. `DocTypeFormView` içindeki alan renderer'ı olarak
 * çalışır; `field` DocType alan meta'sıdır (bkz. `registry.js`).
 */
export default {
  title: "Form Alanları/IconPickerField",
  component: IconPickerField,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const FIELD = { fieldname: "icon", label: "İkon", fieldtype: "Data" };

const Template = (args) => ({
  components: { IconPickerField },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `
    <div class="max-w-md">
      <IconPickerField v-bind="args" v-model="value" />
      <p class="mt-3 text-xs text-slate-500">Seçili: <code>{{ value || "—" }}</code></p>
    </div>
  `,
});

export const Default = { render: Template, args: { field: FIELD, formData: {} } };

export const Preselected = {
  name: "Seçili ikonla",
  render: Template,
  args: { field: FIELD, formData: {}, modelValue: "truck" },
};
