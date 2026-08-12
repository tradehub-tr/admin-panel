import { useDataTable } from "@/composables/useDataTable";

import DataTableToolbar from "./DataTableToolbar.vue";

/** Tablo araç çubuğu — arama, filtreler ve sütun görünürlüğü. */
export default {
  title: "Ortak/DataTable/DataTableToolbar",
  component: DataTableToolbar,
  tags: ["autodocs"],
};

const FIELDS = [
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
  { key: "country", label: "Ülke", filter: { type: "text" } },
  { key: "modified", label: "Güncelleme", defaultHidden: true },
];

const Template = (args) => ({
  components: { DataTableToolbar },
  setup() {
    const dt = useDataTable(FIELDS, { pageSize: 20 });
    return { args, dt };
  },
  template: `<DataTableToolbar v-bind="args" :dt="dt" />`,
});

export const Default = {
  render: Template,
  args: { searchPlaceholder: "Sağlayıcı ara…" },
};

export const WithColumnPanel = {
  name: "Sütun paneliyle",
  render: Template,
  args: { showColumns: true, searchPlaceholder: "Sağlayıcı ara…" },
};
