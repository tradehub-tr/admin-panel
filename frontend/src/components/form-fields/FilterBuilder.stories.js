import FilterBuilder from "./FilterBuilder.vue";

/**
 * Görsel filtre kurucu — sonucu JSON metni olarak `v-model`'e yazar.
 * Alan listesini backend meta'sından alır (Storybook'ta mock).
 */
export default {
  title: "Form Alanları/FilterBuilder",
  component: FilterBuilder,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { FilterBuilder },
  setup: () => ({ args }),
  data: () => ({ value: args.modelValue ?? "" }),
  template: `
    <div>
      <FilterBuilder v-bind="args" v-model="value" />
      <pre class="mt-4 text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded">{{ value || "—" }}</pre>
    </div>
  `,
});

const BASE = {
  field: { fieldname: "filters_json", label: "Filtreler" },
  formData: { source_doctype: "Logistics Provider" },
};

export const Empty = { name: "Boş", render: Template, args: BASE };

export const Prefilled = {
  name: "Dolu",
  render: Template,
  args: { ...BASE, modelValue: JSON.stringify([["is_active", "=", 1]]) },
};
