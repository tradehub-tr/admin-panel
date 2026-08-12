import LogisticsSettingsScreen from "./LogisticsSettingsScreen.vue";

/**
 * **M3 · Lojistik ayarları.**
 *
 * Ana anahtar (`logistics_enabled`) diğer 12 bayraktan görsel olarak ayrı:
 * backend'de kapalıyken alt bayrakların değeri hiç okunmuyor. Ekran bunu
 * yansıtıyor — kapalıyken alt bayraklar devre dışı, üstte uyarı var.
 * Açık görünüp etkisiz kalan bir anahtar en sinsi yanlış anlaşılma.
 */
export default {
  title: "Lojistik/KT1 · Ayarlar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-settings",
  component: LogisticsSettingsScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

// Bayrak adları backend sözleşmesinden (constants.py LOGISTICS_FEATURE_FLAGS).
const FEATURE_FLAGS = {
  carrier_api_enabled: false,
  multi_carrier_enabled: false,
  shipping_zone_pricing_enabled: false,
  auto_tracking_enabled: false,
  split_shipment_enabled: false,
  multi_leg_enabled: false,
  cost_estimation_enabled: false,
  webhook_notifications_enabled: false,
  return_flow_enabled: false,
  seller_delivery_enabled: false,
  buyer_pickup_enabled: false,
  warehouse_transfer_enabled: false,
};

const SETTINGS = {
  logistics_enabled: 1,
  default_currency: "TRY",
  shipment_naming_series: "SHP-.YYYY.-.#####",
  default_logistics_provider: "YK",
  default_package_type: "BOX",
  default_vehicle_type: "VAN",
  tracking_poll_interval_minutes: 30,
  sla_breach_notify_hours: 24,
  max_delivery_attempts: 3,
  return_window_days: 14,
};

export const Default = {
  name: "Modül açık",
  args: {
    settings: SETTINGS,
    featureFlags: { ...FEATURE_FLAGS, auto_tracking_enabled: true, split_shipment_enabled: true },
    can: { read: true, write: true },
  },
};

/**
 * Ana anahtar kapalı — bu, sistemin varsayılan durumu. Alt bayraklar
 * devre dışı ve üstte "etkisiz" uyarısı var.
 */
export const MasterDisabled = {
  name: "Modül kapalı (varsayılan)",
  args: {
    settings: { ...SETTINGS, logistics_enabled: 0 },
    featureFlags: { ...FEATURE_FLAGS, auto_tracking_enabled: true },
    can: { read: true, write: true },
  },
};

/** Yazma yetkisi yok — tüm anahtarlar devre dışı, ana anahtar dahil. */
export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...Default.args, loading: true },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    ...Default.args,
    error: {
      code: "PERMISSION_DENIED",
      message: "Lojistik ayarlarını görüntüleme yetkiniz yok.",
    },
  },
};
