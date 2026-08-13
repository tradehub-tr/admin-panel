import returns from "@/mocks/logistics/return_request.json";

import ReturnDecisionScreen from "./ReturnDecisionScreen.vue";

/**
 * **I2 · İade kararı** (TUR-116).
 *
 * Red kararında gerekçe zorunlu, onayda serbest — bu ayrım story'lerde
 * ayrı ayrı görülebilir. Kapanmış ve karara bağlanmış talepte form HİÇ
 * render edilmiyor.
 */
export default {
  title: "Lojistik/KT3 · İade/Karar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-return-decision",
  component: ReturnDecisionScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = returns.detail.data;
const ROWS = returns.default.data.items;

/** Henüz karara bağlanmamış talep — kalemleriyle birlikte. */
const PENDING = {
  ...DETAIL,
  ...ROWS.find((r) => r.status === "requested"),
  items: DETAIL.items,
  decided_at: null,
  decision_note: null,
  is_closed: 0,
};

export const Default = {
  name: "Karar bekliyor",
  args: { request: PENDING },
};

/** Zaten karara bağlanmış — gerekçesiyle birlikte gösteriliyor, form yok. */
export const AlreadyDecided = {
  name: "Zaten karara bağlanmış",
  args: { request: { ...DETAIL, is_closed: 0 } },
};

/** Kapanmış talep — değiştirilemez, form hiç render edilmiyor. */
export const ClosedRequest = {
  name: "Kapanmış (değiştirilemez)",
  args: { request: { ...DETAIL, is_closed: 1 } },
};

/** Kalem listesi olmayan talep — bağlam kartları yine görünüyor. */
export const NoItems = {
  name: "Kalem listesi yok",
  args: { request: { ...PENDING, items: [] } },
};

export const Saving = {
  name: "Kaydediliyor",
  args: { request: PENDING, saving: true },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { request: PENDING, error: returns.error.error },
};
