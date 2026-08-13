// Lojistik arayüz sabitleri.
//
// Durum listesi ve sırası backend sözleşmesinden gelir
// (tradehub_core/logistics/constants.py → ShipmentStatus). Burada YALNIZ
// görsel karşılıkları tanımlanır — durum EKLEMEK/ÇIKARMAK bu dosyanın işi
// değildir, sözleşme değişikliğidir.

/** Sevkiyat durumu → görsel ton. `constants.py` ALLOWED_TRANSITIONS sırasıyla. */
export const SHIPMENT_STATUS_TONE = {
  Draft: "neutral",
  Pending: "info",
  "Ready for Pickup": "info",
  "Picked Up": "progress",
  "In Transit": "progress",
  "At Warehouse": "progress",
  "Out for Delivery": "progress",
  Delivered: "success",
  Returned: "warning",
  Cancelled: "neutral",
  Failed: "danger",
};

/** Terminal durumlar — ileri geçiş yok (constants.py TERMINAL_STATUSES). */
export const TERMINAL_STATUSES = ["Delivered", "Returned", "Cancelled"];

/** Bacak durumu → ton (constants.py LegStatus). */
export const LEG_STATUS_TONE = {
  Planned: "neutral",
  "In Progress": "progress",
  Arrived: "info",
  Completed: "success",
  Cancelled: "neutral",
};

/** Olay kaynağı → ton + ikon. `source` alanı TUR-112'den. */
export const EVENT_SOURCE_META = {
  manual: { tone: "warning", icon: "user", labelKey: "logistics.eventSource.manual" },
  api: { tone: "info", icon: "plug", labelKey: "logistics.eventSource.api" },
  webhook: { tone: "progress", icon: "webhook", labelKey: "logistics.eventSource.webhook" },
  polling: { tone: "neutral", icon: "refresh-cw", labelKey: "logistics.eventSource.polling" },
};

/**
 * Taşıyıcı GEREKTİRMEYEN kanallar (constants.py ShippingChannel kodları).
 *
 * Bu kanallarda "taşıyıcı seç" ve "takip no" alanları anlamsız; yerine
 * sürücü/plaka/randevu izleniyor (TUR-108).
 */
export const CARRIER_LESS_CHANNELS = ["SELLER_VEHICLE", "BUYER_PICKUP"];

/** Kargo ücretini ödeyen taraf (constants.py CostPaidBy). */
export const COST_PAID_BY = ["Seller", "Buyer", "Platform", "Shared"];

/** Teslim kodu durumu → ton (contract.py delivery_code_status). */
export const DELIVERY_CODE_TONE = {
  not_required: "neutral",
  pending: "info",
  verified: "success",
  failed: "danger",
};

/** Ödeme durumu → ton. Ödeme şartlı teslimde `unpaid` teslimi ENGELLER. */
export const PAYMENT_STATUS_TONE = {
  unpaid: "danger",
  paid: "success",
  waived: "neutral",
};

/** Entegrasyon işlemi → ton (contract.py integration_log.operation). */
export const INTEGRATION_OPERATIONS = [
  "create_shipment",
  "cancel",
  "label",
  "quote",
  "track",
  "webhook",
];

/** Bağlantı testi yetenekleri (contract.py connection_test.probe). */
export const CONNECTION_PROBES = ["authenticate", "quote", "track"];

/** Operasyon alarmı türleri (contract.py operation_alert.alert_type). */
export const ALERT_TYPES = [
  "sla_breach",
  "integration_failure",
  "exception_spike",
  "stuck_shipment",
];

/** İçe aktarma sihirbazı adımları (contract.py import_job.status). */
export const IMPORT_STEPS = ["mapping", "previewing", "applying", "completed"];

/** İade talebi durumu → ton (contract.py return_request.status). */
export const RETURN_STATUS_TONE = {
  requested: "warning",
  approved: "info",
  rejected: "neutral",
  in_transit: "progress",
  inspecting: "progress",
  closed: "success",
};

/** İade nedenleri — alıcının seçtiği sabit küme. */
export const RETURN_REASONS = ["damaged", "wrong_item", "missing_parts", "not_as_described", "other"];

/** Depo kontrol sonucu → ton (contract.py inspection_result). */
export const INSPECTION_RESULT_TONE = {
  ok: "success",
  damaged: "danger",
  missing_parts: "warning",
  mismatch: "warning",
};

/** Rapor kırılımları (TUR-118 filtreleri). */
export const REPORT_DIMENSIONS = ["carrier", "shipping_method", "seller", "status"];

/** İstisna önem derecesi → ton (Shipment Exception Code.severity). */
export const SEVERITY_TONE = {
  Info: "info",
  Warning: "warning",
  Critical: "danger",
};

/**
 * Ton → Tailwind sınıfları.
 *
 * Tek yerde tutuluyor ki rozet, satır vurgusu ve zaman çizelgesi aynı renk
 * dilini kullansın. Marka rengi için `th-` sınıfları tercih edilir; kök
 * CLAUDE.md §4.6 gereği bunlar yeniden yazılmaz.
 */
export const TONE_CLASSES = {
  neutral: {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  info: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  progress: {
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  success: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  danger: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export function toneFor(map, value, fallback = "neutral") {
  return map[value] ?? fallback;
}
