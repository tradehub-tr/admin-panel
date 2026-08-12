import templates from "@/mocks/logistics/notification_template.json";

import NotificationTemplateScreen from "./NotificationTemplateScreen.vue";

/**
 * **J1 · Bildirim şablonları** (TUR-113).
 *
 * Şablon gövdesi HTML ama `v-html` ile basılmıyor — gövde kullanıcı girdisi
 * ve panelde çalıştırılabilir kılmak XSS açardı. Story'ler `<p>` etiketli
 * gövdelerle bunu doğruluyor: metin olarak görünmeli, biçimlenmiş değil.
 */
export default {
  title: "Lojistik/KT2 · Bildirim/Şablonlar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-notification-templates",
  component: NotificationTemplateScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = templates.default.data.items;

export const Default = {
  name: "Karışık şablonlar",
  args: { rows: ROWS, can: { read: true, write: true } },
};

/** Zorunlu şablon: tercih ekranında kapatılamayacağı burada da görünüyor. */
export const MandatoryTemplate = {
  name: "Zorunlu şablon",
  args: { rows: ROWS.filter((r) => r.is_mandatory), can: { read: true, write: true } },
};

/** Pasif şablon soluk — gönderilmiyor ama tanımı duruyor. */
export const InactiveTemplate = {
  name: "Pasif şablon",
  args: { rows: ROWS.filter((r) => !r.is_active), can: { read: true, write: true } },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { rows: ROWS, can: { read: true, write: false } },
};

export const Empty = {
  name: "Şablon yok",
  args: { rows: [], can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: templates.error.error },
};
