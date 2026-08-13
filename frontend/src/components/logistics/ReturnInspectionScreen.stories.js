import returns from "@/mocks/logistics/return_request.json";

import ReturnInspectionScreen from "./ReturnInspectionScreen.vue";

/**
 * **I3 · Depo kontrolü** (TUR-116).
 *
 * Sözleşmedeki örnek veri bilinçli olarak iki farklı sorunu içeriyor:
 * ilk kalemde 6 ulaştı ama 2'si hasarlı (4 kabul), ikincide 3 istendi
 * 2 ulaştı ve hiçbiri kabul edilmedi. Hesaplanan iade tutarı bu kalem
 * kararlarından türetiliyor: 4 × 620,00 = 2.480,00.
 */
export default {
  title: "Lojistik/KT3 · İade/Depo kontrolü",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-return-inspection",
  component: ReturnInspectionScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = returns.detail.data;

export const Default = {
  name: "Kontrol tamamlanmış",
  args: { request: { ...DETAIL, is_closed: 0 }, can: { read: true, write: true } },
};

/** Henüz kontrol edilmemiş: sonuç ve miktarlar boş. */
export const NotInspected = {
  name: "Kontrol edilmemiş",
  args: {
    request: {
      ...DETAIL,
      is_closed: 0,
      items: DETAIL.items.map((item) => ({
        ...item,
        received_qty: null,
        accepted_qty: null,
        inspection_result: null,
        inspection_note: null,
      })),
    },
    can: { read: true, write: true },
  },
};

/**
 * Kabul edilen, ulaşandan fazla: sessiz geçilirse olmayan mal için para
 * iadesi yapılır. Kaydet devre dışı.
 */
export const AcceptedExceedsReceived = {
  name: "Hata · kabul > ulaşan",
  args: {
    request: {
      ...DETAIL,
      is_closed: 0,
      items: DETAIL.items.map((item, index) =>
        index === 0 ? { ...item, received_qty: 4, accepted_qty: 6 } : item
      ),
    },
    can: { read: true, write: true },
  },
};

/** Sorunlu sonuç seçilmiş ama açıklama girilmemiş — kaydet devre dışı. */
export const MissingNote = {
  name: "Hata · açıklama eksik",
  args: {
    request: {
      ...DETAIL,
      is_closed: 0,
      items: DETAIL.items.map((item) => ({ ...item, inspection_note: "" })),
    },
    can: { read: true, write: true },
  },
};

/** Hepsi sorunsuz — tam iade tutarı hesaplanıyor. */
export const AllOk = {
  name: "Hepsi sorunsuz",
  args: {
    request: {
      ...DETAIL,
      is_closed: 0,
      items: DETAIL.items.map((item) => ({
        ...item,
        received_qty: item.requested_qty,
        accepted_qty: item.requested_qty,
        inspection_result: "ok",
        inspection_note: "",
        unit_refund: 620.0,
      })),
    },
    can: { read: true, write: true },
  },
};

export const ClosedRequest = {
  name: "Kapanmış (değiştirilemez)",
  args: { request: { ...DETAIL, is_closed: 1 }, can: { read: true, write: true } },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { request: { ...DETAIL, is_closed: 0 }, can: { read: true, write: false } },
};
