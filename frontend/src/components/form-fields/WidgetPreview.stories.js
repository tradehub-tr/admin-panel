import WidgetPreview from "./WidgetPreview.vue";

/** Dashboard widget önizlemesi — yapılandırmayı backend'e gönderip sonucu gösterir. */
export default {
  title: "Form Alanları/WidgetPreview",
  component: WidgetPreview,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

export const Default = {
  render: (args) => ({
    components: { WidgetPreview },
    setup: () => ({ args }),
    data: () => ({ value: "" }),
    template: `<WidgetPreview v-bind="args" v-model="value" />`,
  }),
  args: {
    field: { fieldname: "preview", label: "Önizleme" },
    formData: { source_doctype: "Logistics Provider", metric_field: "max_weight_kg" },
  },
};
