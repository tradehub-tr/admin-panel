import ChildTable from "./ChildTable.vue";

/**
 * Frappe child table düzenleyicisi. Lojistikte `Logistics Provider`'ın
 * işletim kanalları ve `Shipping Method`'un taşıyıcı servisleri bu bileşenle
 * yönetilecek.
 */
export default {
  title: "Ortak/ChildTable",
  component: ChildTable,
  tags: ["autodocs"],
  argTypes: { modelValue: { control: false } },
};

const Template = (args) => ({
  components: { ChildTable },
  setup: () => ({ args }),
  data: () => ({ rows: JSON.parse(JSON.stringify(args.modelValue ?? [])) }),
  template: `
    <div>
      <ChildTable v-bind="args" v-model="rows" />
      <pre class="mt-4 text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded">{{ rows }}</pre>
    </div>
  `,
});

const CHANNEL_COLUMNS = [
  { fieldname: "shipping_channel", label: "Kanal", fieldtype: "Data" },
  { fieldname: "channel_name", label: "Kanal Adı", fieldtype: "Data" },
];

export const Default = {
  name: "İşletim kanalları",
  render: Template,
  args: {
    columns: CHANNEL_COLUMNS,
    childDoctype: "Provider Operating Channel",
    addLabel: "Kanal ekle",
    modelValue: [{ shipping_channel: "CARGO", channel_name: "Kargo" }],
  },
};

export const Empty = {
  name: "Boş",
  render: Template,
  args: { ...Default.args, modelValue: [] },
};

export const MultipleRows = {
  name: "Çok satırlı",
  render: Template,
  args: {
    ...Default.args,
    modelValue: [
      { shipping_channel: "CARGO", channel_name: "Kargo" },
      { shipping_channel: "COURIER", channel_name: "Kurye" },
      { shipping_channel: "WAREHOUSE", channel_name: "Ambar" },
    ],
  },
};
