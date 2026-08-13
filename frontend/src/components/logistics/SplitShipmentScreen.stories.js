import shipments from "@/mocks/logistics/shipment.json";

import SplitShipmentScreen from "./SplitShipmentScreen.vue";

/**
 * **B9 · Bölünmüş sevkiyat görünümü** (TUR-106).
 *
 * TUR-106 kabul kriteri: *"Toplam sevk miktarı sipariş miktarını AŞMAZ."*
 * Bu ekran ihlali sessizce yutmuyor — aştığı anda en üstte kırmızı uyarı
 * çıkıyor. Sessizce doğru görünen bir ekran, yanlış olduğunu söyleyen
 * ekrandan çok daha tehlikeli.
 */
export default {
  title: "Lojistik/KT1 · Sevkiyat/Bölünme",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-shipment-split",
  component: SplitShipmentScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = shipments.detail.data;

/**
 * Aynı siparişin ikinci sevkiyatı: kalan miktarı taşıyor. Toplam sipariş
 * miktarını tam kapatıyor — sağlıklı bölünme.
 */
const SECOND_SHIPMENT = {
  ...DETAIL,
  name: "SHP-2026-00043",
  status: "Pending",
  tracking_number: null,
  package_count: 1,
  items: DETAIL.items.map((item) => ({
    ...item,
    shipped_qty: item.remaining_qty,
    remaining_qty: 0,
  })),
};

export const Default = {
  name: "İki sevkiyata bölünmüş",
  args: {
    orderName: DETAIL.order,
    shipments: [DETAIL, SECOND_SHIPMENT],
  },
};

/** Tek sevkiyat, kalan miktar var — çubuklar kısmi doluluk gösteriyor. */
export const PartiallyShipped = {
  name: "Kısmi sevk",
  args: { orderName: DETAIL.order, shipments: [DETAIL] },
};

/**
 * İhlal senaryosu: ikinci sevkiyat kalan miktardan fazlasını taşıyor.
 * Uyarı üstte, ilgili kalemin çubuğu kırmızı.
 */
export const OverShipped = {
  name: "İhlal · sipariş miktarı aşıldı",
  args: {
    orderName: DETAIL.order,
    shipments: [
      DETAIL,
      {
        ...SECOND_SHIPMENT,
        items: DETAIL.items.map((item) => ({
          ...item,
          shipped_qty: item.remaining_qty + 5,
          remaining_qty: 0,
        })),
      },
    ],
  },
};
