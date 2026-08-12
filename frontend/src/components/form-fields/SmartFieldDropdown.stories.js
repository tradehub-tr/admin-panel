import SmartFieldDropdown from "./SmartFieldDropdown.vue";

/**
 * Seçili DocType'ın alanlarını tipine göre filtreleyip sunar.
 * `filterType` zorunlu: `numeric` (metrik), `date` (tarih), `grouping` (grup).
 */
export default {
  title: "Form Alanları/SmartFieldDropdown",
  component: SmartFieldDropdown,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: false },
    filterType: { control: "select", options: ["numeric", "date", "grouping"] },
  },
};

const Template = (args) => ({
  components: { SmartFieldDropdown },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `
    <div class="max-w-md">
      <SmartFieldDropdown v-bind="args" v-model="value" />
      <p class="mt-3 text-xs text-slate-500">Seçili: <code>{{ value || "—" }}</code></p>
    </div>
  `,
});

const BASE = {
  field: { fieldname: "metric_field", label: "Alan" },
  formData: { source_doctype: "Logistics Provider" },
  doctype: "Logistics Provider",
};

export const Numeric = { name: "Sayısal alanlar", render: Template, args: { ...BASE, filterType: "numeric" } };
export const Grouping = { name: "Gruplama alanları", render: Template, args: { ...BASE, filterType: "grouping" } };
