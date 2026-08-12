import StatusFilterPills from "./StatusFilterPills.vue";

/**
 * Durum filtresi hapları. Lojistikte sevkiyat durumu (11 durum) ve katalog
 * aktiflik filtresinde kullanılacak.
 */
export default {
  title: "Ortak/StatusFilterPills",
  component: StatusFilterPills,
  tags: ["autodocs"],
};

const Template = (args) => ({
  components: { StatusFilterPills },
  setup: () => ({ args }),
  data: () => ({ selected: null }),
  template: `
    <div>
      <StatusFilterPills v-bind="args" @change="selected = $event" />
      <p class="text-xs text-slate-500">Seçilen: {{ selected ?? "—" }}</p>
    </div>
  `,
});

export const Default = {
  render: Template,
  args: {
    options: [
      { value: "", label: "Tümü", count: 137 },
      { value: "1", label: "Aktif", count: 128 },
      { value: "0", label: "Pasif", count: 9 },
    ],
  },
};

/** Sevkiyat durum makinesinin tamamı — 11 durum, taşma davranışı önemli. */
export const ShipmentStatuses = {
  name: "Sevkiyat durumları (11)",
  render: Template,
  args: {
    options: [
      { value: "Draft", label: "Taslak", count: 4 },
      { value: "Pending", label: "Beklemede", count: 12 },
      { value: "Ready for Pickup", label: "Alıma Hazır", count: 7 },
      { value: "Picked Up", label: "Alındı", count: 23 },
      { value: "In Transit", label: "Yolda", count: 41 },
      { value: "At Warehouse", label: "Depoda", count: 6 },
      { value: "Out for Delivery", label: "Dağıtımda", count: 18 },
      { value: "Delivered", label: "Teslim Edildi", count: 302 },
      { value: "Returned", label: "İade", count: 5 },
      { value: "Cancelled", label: "İptal", count: 3 },
      { value: "Failed", label: "Başarısız", count: 2 },
    ],
  },
};
