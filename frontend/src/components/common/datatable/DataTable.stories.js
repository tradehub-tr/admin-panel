import { useDataTable } from "@/composables/useDataTable";

import DataTable from "./DataTable.vue";

/**
 * Ana veri tablosu. `dt` nesnesi `useDataTable` composable'ından gelir —
 * story'lerde sahte bir nesne değil GERÇEK composable kullanılıyor, sıralama
 * ve filtre davranışı gerçeğiyle aynı olsun diye.
 *
 * Lojistik katalog ekranlarının tamamı bu bileşen üzerine kurulacak.
 */
export default {
  title: "Ortak/DataTable/DataTable",
  component: DataTable,
  tags: ["autodocs"],
};

const FIELDS = [
  { key: "provider_code", label: "Kod", sortable: true },
  { key: "provider_name", label: "Sağlayıcı", sortable: true },
  {
    key: "provider_type",
    label: "Tip",
    filter: {
      type: "select",
      options: [
        { value: "Kargo", label: "Kargo" },
        { value: "Ambar", label: "Ambar" },
      ],
    },
  },
  { key: "country", label: "Ülke" },
  { key: "is_active", label: "Aktif" },
];

const ROWS = [
  { name: "YK", provider_code: "YK", provider_name: "Yurtiçi Kargo", provider_type: "Kargo", country: "Turkey", is_active: 1 },
  { name: "AK", provider_code: "AK", provider_name: "Aras Kargo", provider_type: "Kargo", country: "Turkey", is_active: 1 },
  { name: "MNG", provider_code: "MNG", provider_name: "MNG Kargo", provider_type: "Kargo", country: "Turkey", is_active: 1 },
  { name: "DHL", provider_code: "DHL", provider_name: "DHL", provider_type: "Kargo", country: "Germany", is_active: 0 },
];

const Template = (args) => ({
  components: { DataTable },
  setup() {
    const dt = useDataTable(FIELDS, { pageSize: 20 });
    return { args, dt };
  },
  template: `<DataTable v-bind="args" :dt="dt" />`,
});

export const Default = {
  name: "Dolu",
  render: Template,
  args: { rows: ROWS, total: ROWS.length, clickable: true },
};

export const Empty = {
  name: "Boş",
  render: Template,
  args: { rows: [], total: 0 },
};

/** Çok satırlı — sütun taşması ve sayfalama davranışı. */
export const ManyRows = {
  name: "Çok satırlı",
  render: Template,
  args: {
    rows: Array.from({ length: 20 }, (_, i) => ({
      ...ROWS[i % ROWS.length],
      name: `P-${i + 1}`,
      provider_code: `P${i + 1}`,
    })),
    total: 137,
  },
};
