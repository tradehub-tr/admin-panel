import preferences from "@/mocks/logistics/notification_preference.json";

import NotificationPreferenceScreen from "./NotificationPreferenceScreen.vue";

/**
 * **J2 · Bildirim tercihleri** (TUR-113).
 *
 * TUR-113 kabul kriteri: *"Zorunlu operasyon bildirimleri kullanıcı
 * tercihiyle kapatılamaz."* Fixture'daki operasyon bildirimi
 * `is_mandatory: 1` — anahtar devre dışı, açık ve kilidin gerekçesi yazılı.
 * Sebebi yazmayan bir devre dışı anahtar "bozuk" görünür.
 */
export default {
  title: "Lojistik/KT2 · Bildirim/Tercihler",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-notification-preferences",
  component: NotificationPreferenceScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = preferences.default.data.items;

export const Default = {
  name: "Rol bazında gruplu",
  args: { rows: ROWS, can: { read: true, write: true } },
};

/** Yalnız zorunlu tercihler: hepsi kilitli, hepsinde gerekçe var. */
export const MandatoryOnly = {
  name: "Yalnız zorunlu bildirimler",
  args: { rows: ROWS.filter((r) => r.is_mandatory), can: { read: true, write: true } },
};

/** Zorunlu olmayan tercihler — anahtarlar serbest. */
export const OptionalOnly = {
  name: "Yalnız isteğe bağlı",
  args: { rows: ROWS.filter((r) => !r.is_mandatory), can: { read: true, write: true } },
};

/**
 * Yazma yetkisi yok: isteğe bağlı anahtarlar da devre dışı, ama zorunlu
 * olanlar aynı görünmeye devam ediyor — iki farklı sebeple kilitli.
 */
export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { rows: ROWS, can: { read: true, write: false } },
};

export const Empty = {
  name: "Tercih yok",
  args: { rows: [], can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: preferences.error.error },
};
