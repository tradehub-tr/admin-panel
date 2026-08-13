import ColorPresetField from "./ColorPresetField.vue";

/** Marka renk ön ayarı seçici. */
export default {
  title: "Form Alanları/ColorPresetField",
  component: ColorPresetField,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { ColorPresetField },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "brand" }),
  template: `
    <div class="max-w-md">
      <ColorPresetField v-bind="args" v-model="value" />
      <p class="mt-3 text-xs text-slate-500">Seçili: <code>{{ value }}</code></p>
    </div>
  `,
});

export const Default = {
  render: Template,
  args: { field: { fieldname: "color_preset", label: "Renk" }, formData: {} },
};
