// ======================================================
// Site Teması — Token Şeması
// ======================================================
//
// ⚠️  SENKRON DOSYA
// Bu dosya şu dosyaların portudur:
//   - tradehubfront/src/utils/themeTokens.ts  (UI şeması)
//   - tradehub_core/.../tradehub_theme_settings.py → ALLOWED_THEME_KEYS  (backend whitelist)
//
// Üç tarafı da birlikte güncelleyin! Yoksa:
// - Yeni token eklemezseniz admin panel kontrolü göstermez.
// - Backend whitelist'e eklemezseniz save hata verir.
//
// v1: BUTON tokenları (buttonTokenGroups)
// v2: PALET tokenları (paletteTokenGroups) — primary/secondary/accent + semantic + surface/text/border
// v3: Tipografi / spacing (ileride)
// ======================================================

// Scale helper — primary/secondary/accent için 50→950 token dizisi üretir.
// Tailwind varsayılan palet değerleri:
//   amber (primary)  → tradehubfront default (altın)
//   near-black (secondary) → siyah tonlu nötr
//   cyan (accent)    → turkuaz vurgu
const PRIMARY_DEFAULTS = {
  50: "#fef9e7",
  100: "#fdf0c3",
  200: "#fbe08a",
  300: "#f6c94d",
  400: "#e6b212",
  500: "#cc9900",
  600: "#b38600",
  700: "#8a6800",
  800: "#6b5100",
  900: "#4d3a00",
  950: "#2e2200",
};
const SECONDARY_DEFAULTS = {
  50: "#f5f5f5",
  100: "#e5e5e5",
  200: "#cccccc",
  300: "#a3a3a3",
  400: "#737373",
  500: "#525252",
  600: "#333333",
  700: "#1f1f1f",
  800: "#141414",
  900: "#0a0a0a",
  950: "#050505",
};
const ACCENT_DEFAULTS = {
  50: "#ecfeff",
  100: "#cffafe",
  200: "#a5f3fc",
  300: "#67e8f9",
  400: "#22d3ee",
  500: "#06b6d4",
  600: "#0891b2",
  700: "#0e7490",
  800: "#155e75",
  900: "#164e63",
  950: "#083344",
};

function scaleTokens(prefix, defaults) {
  return Object.entries(defaults).map(([step, hex]) => ({
    var: `--color-${prefix}-${step}`,
    type: "color",
    default: hex,
    label: step === "500" ? `${step} (ana ton)` : String(step),
  }));
}

/**
 * Buton token grupları.
 * - "ortak"   → hem solid hem outline için geçerli (radius, padding, font)
 * - "solid"   → sadece dolu (primary) butona özel
 * - "outline" → sadece outline butona özel
 *
 * Her token: { var, type, default, label, ?min, ?max, ?step, ?unit }
 * type: 'color' | 'range' | 'text'
 */
export const buttonTokenGroups = [
  {
    id: "ortak",
    title: "Ortak Ayarlar",
    subtitle: "Hem dolu hem outline butonlar için geçerli",
    icon: "sliders",
    tokens: [
      {
        var: "--radius-button",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Köşe Yuvarlaklığı",
      },
      {
        var: "--spacing-button-x",
        type: "range",
        default: 24,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Yatay Boşluk (Padding X)",
      },
      {
        var: "--spacing-button-y",
        type: "range",
        default: 12,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
        label: "Dikey Boşluk (Padding Y)",
      },
      {
        var: "--btn-font-size",
        type: "range",
        default: 0.875,
        min: 0.5,
        max: 2,
        step: 0.0625,
        unit: "rem",
        label: "Yazı Boyutu",
      },
      {
        var: "--btn-font-weight",
        type: "range",
        default: 600,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "Yazı Kalınlığı",
      },
    ],
  },
  {
    id: "solid",
    title: "Dolu Buton (Primary)",
    subtitle: "Ana aksiyon butonları: Giriş Yap, Sepete Ekle vs.",
    icon: "square",
    tokens: [
      { var: "--btn-bg", type: "color", default: "#cc9900", label: "Arka Plan" },
      { var: "--btn-text", type: "color", default: "#ffffff", label: "Yazı Rengi" },
      {
        var: "--btn-border-width",
        type: "range",
        default: 0,
        min: 0,
        max: 8,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--btn-border-color", type: "color", default: "#cc9900", label: "Çerçeve Rengi" },
      { var: "--btn-shadow", type: "text", default: "none", label: "Gölge (CSS shadow)" },
      { var: "--btn-hover-bg", type: "color", default: "#b38600", label: "Hover Arka Plan" },
      { var: "--btn-hover-text", type: "color", default: "#ffffff", label: "Hover Yazı Rengi" },
    ],
  },
  {
    id: "outline",
    title: "Outline Buton",
    subtitle: "İkincil aksiyonlar: İptal, Geri, Önizle vs.",
    icon: "square-dashed",
    tokens: [
      { var: "--btn-outline-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      { var: "--btn-outline-text", type: "color", default: "#cc9900", label: "Yazı Rengi" },
      {
        var: "--btn-outline-border-width",
        type: "range",
        default: 2,
        min: 0,
        max: 8,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      {
        var: "--btn-outline-border-color",
        type: "color",
        default: "#cc9900",
        label: "Çerçeve Rengi",
      },
      {
        var: "--btn-outline-hover-bg",
        type: "color",
        default: "rgba(204,153,0,0.08)",
        label: "Hover Arka Plan",
      },
      {
        var: "--btn-outline-hover-text",
        type: "color",
        default: "#cc9900",
        label: "Hover Yazı Rengi",
      },
    ],
  },
];

/**
 * Palet token grupları (v2).
 * - primary/secondary/accent: 50→950 scale (11 ton)
 * - semantic: success/warning/error/info (50/500/700)
 * - surface: background tonları
 * - text: metin hiyerarşisi
 * - border: kenarlık tonları
 */
export const paletteTokenGroups = [
  {
    id: "primary",
    title: "Ana Renk (Primary)",
    subtitle: "11 tonlu scale. 500 ana tondur — butonlar, linkler, border-focus buna bağlı.",
    icon: "palette",
    scale: true, // Sekme UI'ı "base color → 50..950 üret" butonu göstersin
    tokens: scaleTokens("primary", PRIMARY_DEFAULTS),
  },
  {
    id: "secondary",
    title: "İkincil Renk (Secondary)",
    subtitle: "Nötr gri/siyah scale. Metin, border-default ve arka planlar buna bağlı.",
    icon: "circle-half-stroke",
    scale: true,
    tokens: scaleTokens("secondary", SECONDARY_DEFAULTS),
  },
  {
    id: "accent",
    title: "Vurgu Rengi (Accent)",
    subtitle: "İkincil CTA, badge ve özel vurgular için turkuaz/cyan scale.",
    icon: "wand-magic-sparkles",
    scale: true,
    tokens: scaleTokens("accent", ACCENT_DEFAULTS),
  },
  {
    id: "semantic",
    title: "Semantik Renkler",
    subtitle: "Success / Warning / Error / Info — bildirim ve toast için.",
    icon: "bell",
    tokens: [
      { var: "--color-success-50", type: "color", default: "#f0fdf4", label: "Success 50" },
      { var: "--color-success-500", type: "color", default: "#22c55e", label: "Success 500" },
      { var: "--color-success-700", type: "color", default: "#15803d", label: "Success 700" },
      { var: "--color-warning-50", type: "color", default: "#fffbeb", label: "Warning 50" },
      { var: "--color-warning-500", type: "color", default: "#f59e0b", label: "Warning 500" },
      { var: "--color-warning-700", type: "color", default: "#b45309", label: "Warning 700" },
      { var: "--color-error-50", type: "color", default: "#fef2f2", label: "Error 50" },
      { var: "--color-error-500", type: "color", default: "#ef4444", label: "Error 500" },
      { var: "--color-error-700", type: "color", default: "#b91c1c", label: "Error 700" },
      { var: "--color-info-50", type: "color", default: "#eff6ff", label: "Info 50" },
      { var: "--color-info-500", type: "color", default: "#3b82f6", label: "Info 500" },
      { var: "--color-info-700", type: "color", default: "#1d4ed8", label: "Info 700" },
    ],
  },
  {
    id: "surface",
    title: "Yüzey Renkleri",
    subtitle: "Arka plan katmanları (default / muted / raised / overlay / inverse).",
    icon: "layer-group",
    tokens: [
      { var: "--color-surface", type: "color", default: "#ffffff", label: "Surface" },
      { var: "--color-surface-muted", type: "color", default: "#fafafa", label: "Surface Muted" },
      { var: "--color-surface-raised", type: "color", default: "#f5f5f5", label: "Surface Raised" },
      {
        var: "--color-surface-overlay",
        type: "text",
        default: "rgba(0, 0, 0, 0.5)",
        label: "Overlay (rgba)",
      },
      {
        var: "--color-surface-inverse",
        type: "color",
        default: "#0a0a0a",
        label: "Surface Inverse",
      },
    ],
  },
  {
    id: "text",
    title: "Metin Renkleri",
    subtitle: "Hiyerarşi: primary → secondary → tertiary → disabled.",
    icon: "font",
    tokens: [
      { var: "--color-text-primary", type: "color", default: "#0a0a0a", label: "Primary" },
      { var: "--color-text-secondary", type: "color", default: "#525252", label: "Secondary" },
      { var: "--color-text-tertiary", type: "color", default: "#a3a3a3", label: "Tertiary" },
      { var: "--color-text-disabled", type: "color", default: "#d4d4d4", label: "Disabled" },
      {
        var: "--color-text-inverse",
        type: "color",
        default: "#fafafa",
        label: "Inverse (dark bg)",
      },
      { var: "--color-text-link", type: "color", default: "#cc9900", label: "Link" },
      { var: "--color-text-link-hover", type: "color", default: "#b38600", label: "Link Hover" },
    ],
  },
  {
    id: "border",
    title: "Kenarlık Renkleri",
    subtitle: "Kart, input ve focus border tonları.",
    icon: "border-all",
    tokens: [
      { var: "--color-border-default", type: "color", default: "#e5e5e5", label: "Default" },
      { var: "--color-border-strong", type: "color", default: "#a3a3a3", label: "Strong" },
      { var: "--color-border-focus", type: "color", default: "#cc9900", label: "Focus" },
      { var: "--color-border-error", type: "color", default: "#ef4444", label: "Error" },
    ],
  },
];

/**
 * v3: Tipografi token grupları — font-size, font-weight, line-height, letter-spacing.
 */
export const typographyTokenGroups = [
  {
    id: "font-size",
    title: "Yazı Boyutu",
    subtitle: "xs (12px) → 5xl (60px) — başlık hiyerarşisini ve body metnini belirler.",
    icon: "text-height",
    tokens: [
      {
        var: "--font-size-xs",
        type: "range",
        default: 0.75,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "xs (caption)",
      },
      {
        var: "--font-size-sm",
        type: "range",
        default: 0.875,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "sm (helper)",
      },
      {
        var: "--font-size-base",
        type: "range",
        default: 1.125,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "base (body)",
      },
      {
        var: "--font-size-lg",
        type: "range",
        default: 1.25,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "lg",
      },
      {
        var: "--font-size-xl",
        type: "range",
        default: 1.5,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "xl",
      },
      {
        var: "--font-size-2xl",
        type: "range",
        default: 1.875,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "2xl",
      },
      {
        var: "--font-size-3xl",
        type: "range",
        default: 2.25,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "3xl",
      },
      {
        var: "--font-size-4xl",
        type: "range",
        default: 3,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "4xl",
      },
      {
        var: "--font-size-5xl",
        type: "range",
        default: 3.75,
        min: 0.5,
        max: 5,
        step: 0.0625,
        unit: "rem",
        label: "5xl (hero)",
      },
    ],
  },
  {
    id: "font-weight",
    title: "Yazı Kalınlığı",
    subtitle: "normal (400) → black (900).",
    icon: "bold",
    tokens: [
      {
        var: "--font-weight-normal",
        type: "range",
        default: 400,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "normal (400)",
      },
      {
        var: "--font-weight-medium",
        type: "range",
        default: 500,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "medium (500)",
      },
      {
        var: "--font-weight-semibold",
        type: "range",
        default: 600,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "semibold (600)",
      },
      {
        var: "--font-weight-bold",
        type: "range",
        default: 700,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "bold (700)",
      },
      {
        var: "--font-weight-black",
        type: "range",
        default: 900,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "black (900)",
      },
    ],
  },
  {
    id: "line-height",
    title: "Satır Yüksekliği",
    subtitle: "Birimsiz çarpan — none (1) → loose (2).",
    icon: "grip-lines",
    tokens: [
      {
        var: "--line-height-none",
        type: "range",
        default: 1,
        min: 0.8,
        max: 3,
        step: 0.025,
        unit: "",
        label: "none (1)",
      },
      {
        var: "--line-height-tight",
        type: "range",
        default: 1.25,
        min: 0.8,
        max: 3,
        step: 0.025,
        unit: "",
        label: "tight (h1-h3)",
      },
      {
        var: "--line-height-snug",
        type: "range",
        default: 1.375,
        min: 0.8,
        max: 3,
        step: 0.025,
        unit: "",
        label: "snug (h4-h6)",
      },
      {
        var: "--line-height-normal",
        type: "range",
        default: 1.625,
        min: 0.8,
        max: 3,
        step: 0.025,
        unit: "",
        label: "normal (body)",
      },
      {
        var: "--line-height-relaxed",
        type: "range",
        default: 1.75,
        min: 0.8,
        max: 3,
        step: 0.025,
        unit: "",
        label: "relaxed",
      },
      {
        var: "--line-height-loose",
        type: "range",
        default: 2,
        min: 0.8,
        max: 3,
        step: 0.025,
        unit: "",
        label: "loose (okuma modu)",
      },
    ],
  },
  {
    id: "letter-spacing",
    title: "Harf Aralığı",
    subtitle: "tighter (-0.03em) → wider (0.05em).",
    icon: "text-width",
    tokens: [
      {
        var: "--letter-spacing-tighter",
        type: "range",
        default: -0.03,
        min: -0.1,
        max: 0.15,
        step: 0.005,
        unit: "em",
        label: "tighter (hero)",
      },
      {
        var: "--letter-spacing-tight",
        type: "range",
        default: -0.015,
        min: -0.1,
        max: 0.15,
        step: 0.005,
        unit: "em",
        label: "tight",
      },
      {
        var: "--letter-spacing-normal",
        type: "range",
        default: 0,
        min: -0.1,
        max: 0.15,
        step: 0.005,
        unit: "em",
        label: "normal",
      },
      {
        var: "--letter-spacing-wide",
        type: "range",
        default: 0.025,
        min: -0.1,
        max: 0.15,
        step: 0.005,
        unit: "em",
        label: "wide",
      },
      {
        var: "--letter-spacing-wider",
        type: "range",
        default: 0.05,
        min: -0.1,
        max: 0.15,
        step: 0.005,
        unit: "em",
        label: "wider (caps)",
      },
    ],
  },
];

/**
 * v3: Radius (köşe yuvarlaklığı) token grupları.
 */
export const radiusTokenGroups = [
  {
    id: "radius",
    title: "Köşe Yuvarlaklığı",
    subtitle: "Base scale + semantic (card/input/badge/modal).",
    icon: "bezier-curve",
    tokens: [
      {
        var: "--radius-none",
        type: "range",
        default: 0,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "none",
      },
      {
        var: "--radius-sm",
        type: "range",
        default: 4,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "sm",
      },
      {
        var: "--radius-md",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "md",
      },
      {
        var: "--radius-lg",
        type: "range",
        default: 16,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "lg",
      },
      {
        var: "--radius-xl",
        type: "range",
        default: 32,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "xl",
      },
      {
        var: "--radius-full",
        type: "range",
        default: 9999,
        min: 0,
        max: 9999,
        step: 1,
        unit: "px",
        label: "full (pill)",
      },
      {
        var: "--radius-card",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "card",
      },
      {
        var: "--radius-input",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "input",
      },
      {
        var: "--radius-badge",
        type: "range",
        default: 9999,
        min: 0,
        max: 9999,
        step: 1,
        unit: "px",
        label: "badge",
      },
      {
        var: "--radius-modal",
        type: "range",
        default: 32,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "modal",
      },
      {
        var: "--radius-tooltip",
        type: "range",
        default: 4,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "tooltip",
      },
    ],
  },
];

/**
 * v3: Spacing (semantic) token grupları.
 */
export const spacingTokenGroups = [
  {
    id: "spacing",
    title: "Aralık / Padding",
    subtitle: "Kart padding, section gap, page padding, stack/inline, input padding.",
    icon: "arrows-left-right-to-line",
    tokens: [
      {
        var: "--spacing-card-padding",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Card Padding",
      },
      {
        var: "--spacing-card-gap",
        type: "range",
        default: 11,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Card Gap",
      },
      {
        var: "--spacing-section-y",
        type: "range",
        default: 64,
        min: 0,
        max: 256,
        step: 4,
        unit: "px",
        label: "Section Y",
      },
      {
        var: "--spacing-section-y-lg",
        type: "range",
        default: 96,
        min: 0,
        max: 256,
        step: 4,
        unit: "px",
        label: "Section Y (lg)",
      },
      {
        var: "--spacing-page-x",
        type: "range",
        default: 16,
        min: 0,
        max: 128,
        step: 2,
        unit: "px",
        label: "Page X (mobile)",
      },
      {
        var: "--spacing-page-x-lg",
        type: "range",
        default: 32,
        min: 0,
        max: 128,
        step: 2,
        unit: "px",
        label: "Page X (desktop)",
      },
      {
        var: "--spacing-stack-sm",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Stack SM",
      },
      {
        var: "--spacing-stack-md",
        type: "range",
        default: 16,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Stack MD",
      },
      {
        var: "--spacing-stack-lg",
        type: "range",
        default: 32,
        min: 0,
        max: 128,
        step: 1,
        unit: "px",
        label: "Stack LG",
      },
      {
        var: "--spacing-inline-sm",
        type: "range",
        default: 8,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Inline SM",
      },
      {
        var: "--spacing-inline-md",
        type: "range",
        default: 12,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Inline MD",
      },
      {
        var: "--spacing-inline-lg",
        type: "range",
        default: 24,
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
        label: "Inline LG",
      },
      {
        var: "--spacing-input-x",
        type: "range",
        default: 12,
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
        label: "Input X",
      },
      {
        var: "--spacing-input-y",
        type: "range",
        default: 8,
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
        label: "Input Y",
      },
    ],
  },
];

/**
 * v4: Input / Checkbox / Quantity stepper token grupları.
 * Tradehubfront'taki tüm form elemanlarını (form-lg auth, form-md settings,
 * form-sm toolbar, select, textarea) tek yerden yönetir.
 */
export const inputTokenGroups = [
  {
    id: "input-base",
    title: "Input — Temel",
    subtitle: "Tüm input / select / textarea için varsayılan görünüm.",
    icon: "i-cursor",
    tokens: [
      { var: "--input-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      {
        var: "--input-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--input-border-color", type: "color", default: "#e5e5e5", label: "Çerçeve Rengi" },
      {
        var: "--input-border-color-hover",
        type: "color",
        default: "#a3a3a3",
        label: "Hover Çerçeve",
      },
      { var: "--input-text-color", type: "color", default: "#0a0a0a", label: "Yazı Rengi" },
      {
        var: "--input-placeholder-color",
        type: "color",
        default: "#a3a3a3",
        label: "Placeholder Rengi",
      },
      {
        var: "--input-font-size",
        type: "range",
        default: 0.875,
        min: 0.625,
        max: 1.5,
        step: 0.0625,
        unit: "rem",
        label: "Yazı Boyutu",
      },
      {
        var: "--input-font-weight",
        type: "range",
        default: 400,
        min: 100,
        max: 900,
        step: 100,
        unit: "",
        label: "Yazı Ağırlığı",
      },
      {
        var: "--input-line-height",
        type: "range",
        default: 1.5,
        min: 1,
        max: 2,
        step: 0.125,
        unit: "",
        label: "Line Height",
      },
    ],
  },
  {
    id: "input-focus",
    title: "Input — Focus (Tıklanma)",
    subtitle: "Tıklanınca çerçeve rengi ve çevresindeki glow.",
    icon: "crosshairs",
    tokens: [
      {
        var: "--input-focus-border-color",
        type: "color",
        default: "#cc9900",
        label: "Focus Çerçeve",
      },
      {
        var: "--input-focus-ring-color",
        type: "text",
        default: "rgba(204, 153, 0, 0.12)",
        label: "Focus Glow Rengi (rgba)",
      },
      {
        var: "--input-focus-ring-width",
        type: "range",
        default: 2,
        min: 0,
        max: 8,
        step: 1,
        unit: "px",
        label: "Glow Kalınlığı",
      },
      {
        var: "--input-focus-ring-offset",
        type: "range",
        default: 0,
        min: 0,
        max: 8,
        step: 1,
        unit: "px",
        label: "Glow Offset",
      },
    ],
  },
  {
    id: "input-disabled",
    title: "Input — Disabled",
    subtitle: "Devre dışı input görünümü.",
    icon: "ban",
    tokens: [
      { var: "--input-disabled-bg", type: "color", default: "#fafafa", label: "Arka Plan" },
      { var: "--input-disabled-text", type: "color", default: "#d4d4d4", label: "Yazı" },
      { var: "--input-disabled-border-color", type: "color", default: "#e5e5e5", label: "Çerçeve" },
      {
        var: "--input-disabled-opacity",
        type: "range",
        default: 0.6,
        min: 0.1,
        max: 1,
        step: 0.05,
        unit: "",
        label: "Opaklık",
      },
    ],
  },
  {
    id: "input-error",
    title: "Input — Hata Durumu",
    subtitle: 'Validation hatası: aria-invalid="true" veya .is-error class.',
    icon: "triangle-exclamation",
    tokens: [
      { var: "--input-error-border-color", type: "color", default: "#ef4444", label: "Çerçeve" },
      { var: "--input-error-bg", type: "color", default: "#fef2f2", label: "Arka Plan" },
      { var: "--input-error-text", type: "color", default: "#b91c1c", label: "Yazı" },
      {
        var: "--input-error-ring-color",
        type: "text",
        default: "rgba(239, 68, 68, 0.15)",
        label: "Error Glow (rgba)",
      },
    ],
  },
  {
    id: "input-size",
    title: "Input — Boyutlar",
    subtitle: "SM (filter/toolbar) / MD (default) / LG (auth/checkout).",
    icon: "arrows-up-down",
    tokens: [
      {
        var: "--input-height-sm",
        type: "range",
        default: 32,
        min: 24,
        max: 48,
        step: 1,
        unit: "px",
        label: "Small (toolbar)",
      },
      {
        var: "--input-height-md",
        type: "range",
        default: 40,
        min: 32,
        max: 56,
        step: 1,
        unit: "px",
        label: "Medium (default)",
      },
      {
        var: "--input-height-lg",
        type: "range",
        default: 48,
        min: 40,
        max: 72,
        step: 1,
        unit: "px",
        label: "Large (auth)",
      },
    ],
  },
];

export const checkboxTokenGroups = [
  {
    id: "checkbox",
    title: "Checkbox / Radio",
    subtitle: "Onay kutusu ve radio buton görünümü.",
    icon: "square-check",
    tokens: [
      {
        var: "--checkbox-size",
        type: "range",
        default: 20,
        min: 12,
        max: 32,
        step: 1,
        unit: "px",
        label: "Boyut",
      },
      {
        var: "--checkbox-radius",
        type: "range",
        default: 4,
        min: 0,
        max: 16,
        step: 1,
        unit: "px",
        label: "Köşe Yuvarlaklığı",
      },
      {
        var: "--checkbox-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--checkbox-border-color", type: "color", default: "#a3a3a3", label: "Çerçeve (boş)" },
      { var: "--checkbox-bg", type: "color", default: "#ffffff", label: "Arka Plan (boş)" },
      {
        var: "--checkbox-checked-bg",
        type: "color",
        default: "#cc9900",
        label: "Arka Plan (seçili)",
      },
      {
        var: "--checkbox-checked-border",
        type: "color",
        default: "#cc9900",
        label: "Çerçeve (seçili)",
      },
      { var: "--checkbox-checked-icon", type: "color", default: "#ffffff", label: "Tik İkonu" },
      {
        var: "--checkbox-disabled-opacity",
        type: "range",
        default: 0.5,
        min: 0.1,
        max: 1,
        step: 0.05,
        unit: "",
        label: "Disabled Opaklık",
      },
    ],
  },
];

export const quantityTokenGroups = [
  {
    id: "quantity",
    title: "Quantity Stepper (Sepet +/− Miktar)",
    subtitle: "Sepet ve ürün detayındaki miktar arttır/azalt.",
    icon: "calculator",
    tokens: [
      {
        var: "--quantity-height",
        type: "range",
        default: 40,
        min: 24,
        max: 64,
        step: 1,
        unit: "px",
        label: "Yükseklik",
      },
      {
        var: "--quantity-width",
        type: "range",
        default: 136,
        min: 80,
        max: 256,
        step: 4,
        unit: "px",
        label: "Genişlik",
      },
      { var: "--quantity-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      {
        var: "--quantity-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve",
      },
      { var: "--quantity-border-color", type: "color", default: "#e5e5e5", label: "Çerçeve Rengi" },
      {
        var: "--quantity-radius",
        type: "range",
        default: 9999,
        min: 0,
        max: 9999,
        step: 1,
        unit: "px",
        label: "Köşe (9999=pill)",
      },
      {
        var: "--quantity-button-size",
        type: "range",
        default: 36,
        min: 20,
        max: 56,
        step: 1,
        unit: "px",
        label: "Buton Boyutu",
      },
      {
        var: "--quantity-button-bg-hover",
        type: "color",
        default: "#fafafa",
        label: "Buton Hover BG",
      },
      { var: "--quantity-text-color", type: "color", default: "#0a0a0a", label: "Yazı Rengi" },
      {
        var: "--quantity-text-size",
        type: "range",
        default: 14,
        min: 10,
        max: 24,
        step: 1,
        unit: "px",
        label: "Yazı Boyutu",
      },
      {
        var: "--quantity-disabled-opacity",
        type: "range",
        default: 0.4,
        min: 0.1,
        max: 1,
        step: 0.05,
        unit: "",
        label: "Disabled Opaklık",
      },
    ],
  },
];

/**
 * Ürün kartı — base tokenları (layout / renk / tipografi / rozet / görsel).
 *
 * 3 katmanlı CSS cascade: generic card → product-card base → section override.
 * Backend whitelist: _PRODUCT_CARD_KEYS (tradehub_theme_settings.py).
 * Varsayılan değerler frontend style.css'teki gerçek :root değerleri ile
 * birebir eşleşmelidir (değiştirirken iki dosyayı birlikte güncelleyin).
 */
export const productCardBaseTokenGroups = [
  {
    id: "product-card-layout",
    title: "Ürün Kartı — Layout",
    subtitle: "Radius, padding, çerçeve, min yükseklik",
    icon: "square",
    tokens: [
      {
        var: "--product-card-radius",
        type: "range",
        default: 8,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
        label: "Köşe Yuvarlaklığı",
      },
      {
        var: "--product-card-padding",
        type: "range",
        default: 12,
        min: 4,
        max: 32,
        step: 1,
        unit: "px",
        label: "İç Padding",
      },
      {
        var: "--product-card-border-width",
        type: "range",
        default: 0,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      {
        var: "--product-card-min-height",
        type: "range",
        default: 384,
        min: 260,
        max: 520,
        step: 2,
        unit: "px",
        label: "Min Yükseklik",
      },
    ],
  },
  {
    id: "product-card-color",
    title: "Ürün Kartı — Renk & Gölge",
    subtitle: "Arka plan, çerçeve ve gölge",
    icon: "palette",
    tokens: [
      { var: "--product-card-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      { var: "--product-card-border", type: "color", default: "#e5e7eb", label: "Çerçeve Rengi" },
      { var: "--product-card-shadow", type: "text", default: "none", label: "Gölge (CSS)" },
      { var: "--product-card-hover-shadow", type: "text", default: "none", label: "Hover Gölge" },
    ],
  },
  {
    id: "product-card-typography",
    title: "Ürün Kartı — Tipografi",
    subtitle: "Başlık, fiyat, MOQ, tedarikçi metinleri",
    icon: "font",
    tokens: [
      {
        var: "--product-title-size",
        type: "range",
        default: 14,
        min: 10,
        max: 20,
        step: 1,
        unit: "px",
        label: "Başlık Boyutu",
      },
      {
        var: "--product-title-weight",
        type: "range",
        default: 400,
        min: 300,
        max: 800,
        step: 100,
        unit: "",
        label: "Başlık Kalınlığı",
      },
      { var: "--product-title-color", type: "color", default: "#222222", label: "Başlık Rengi" },
      {
        var: "--card-price-size",
        type: "range",
        default: 15,
        min: 10,
        max: 28,
        step: 1,
        unit: "px",
        label: "Fiyat Boyutu",
      },
      {
        var: "--card-price-weight",
        type: "range",
        default: 700,
        min: 300,
        max: 900,
        step: 100,
        unit: "",
        label: "Fiyat Kalınlığı",
      },
      { var: "--card-price-color", type: "color", default: "#111827", label: "Fiyat Rengi" },
      {
        var: "--card-moq-size",
        type: "range",
        default: 11,
        min: 8,
        max: 16,
        step: 1,
        unit: "px",
        label: "MOQ Boyutu",
      },
      { var: "--card-moq-color", type: "color", default: "#6b7280", label: "MOQ Rengi" },
      {
        var: "--card-supplier-size",
        type: "range",
        default: 11,
        min: 8,
        max: 16,
        step: 1,
        unit: "px",
        label: "Tedarikçi Boyutu",
      },
      { var: "--card-supplier-color", type: "color", default: "#9ca3af", label: "Tedarikçi Rengi" },
    ],
  },
  {
    id: "product-card-badge",
    title: "Ürün Kartı — Rozet",
    subtitle: "Kampanya / indirim rozetleri",
    icon: "bell",
    tokens: [
      { var: "--card-badge-bg", type: "color", default: "#FFF3E0", label: "Rozet Arka Planı" },
      { var: "--card-badge-text", type: "color", default: "#e65100", label: "Rozet Yazı Rengi" },
      {
        var: "--card-badge-size",
        type: "range",
        default: 10,
        min: 8,
        max: 14,
        step: 1,
        unit: "px",
        label: "Rozet Yazı Boyutu",
      },
      {
        var: "--card-badge-radius",
        type: "range",
        default: 4,
        min: 0,
        max: 16,
        step: 1,
        unit: "px",
        label: "Rozet Köşe",
      },
    ],
  },
  {
    id: "product-card-image",
    title: "Ürün Kartı — Görsel",
    subtitle: "Ürün resmi kutusu ve hover davranışı",
    icon: "square",
    tokens: [
      {
        var: "--product-image-radius",
        type: "range",
        default: 8,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
        label: "Resim Köşe",
      },
      {
        var: "--product-image-padding",
        type: "range",
        default: 0,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Resim Padding",
      },
      {
        var: "--product-image-hover-scale",
        type: "range",
        default: 1.06,
        min: 1,
        max: 1.3,
        step: 0.01,
        unit: "",
        label: "Hover Zoom",
      },
    ],
  },
];

/**
 * Varyant-başına bağımsız layout token aileleri (--pc-{v}-*).
 *
 * Her varyant kendi radius/padding/border-width'ine sahiptir. Default değerler
 * frontend style.css'teki orijinal görünüme birebir eşittir — admin hiçbir
 * şey değiştirmezse site tam olarak eski halini korur.
 *
 * Not: Listing + Hero için ayrı grup yok; onlar mevcut --product-card-*
 * tokenlarıyla (productCardBaseTokenGroups içinde) yönetilir.
 * Tailored card özel layout olduğu için layout token'ı tanımlamıyoruz (sadece
 * mevcut --tailored-* renk tokenları yönetilir).
 */
export const productCardVariantGroups = [
  {
    id: "pc-mini",
    title: "Varyant — Mini Kart",
    subtitle: "Buyer dashboard, browsing history, 404 explore, operation slider",
    icon: "box",
    tokens: [
      {
        var: "--pc-mini-radius",
        type: "range",
        default: 8,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Köşe",
      },
      {
        var: "--pc-mini-border-width",
        type: "range",
        default: 0,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--pc-mini-bg", type: "color", default: "transparent", label: "Arka Plan" },
      {
        var: "--pc-mini-border-color",
        type: "color",
        default: "transparent",
        label: "Çerçeve Rengi",
      },
    ],
  },
  {
    id: "pc-topdeals",
    title: "Varyant — Top Deals",
    subtitle: "top-deals.html flat grid kartı",
    icon: "bolt",
    tokens: [
      {
        var: "--pc-topdeals-radius",
        type: "range",
        default: 6,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Köşe",
      },
      {
        var: "--pc-topdeals-padding",
        type: "range",
        default: 12,
        min: 4,
        max: 32,
        step: 1,
        unit: "px",
        label: "İç Padding",
      },
      {
        var: "--pc-topdeals-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--pc-topdeals-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      {
        var: "--pc-topdeals-border-color",
        type: "color",
        default: "#e5e7eb",
        label: "Çerçeve Rengi",
      },
    ],
  },
  {
    id: "pc-topranking",
    title: "Varyant — Top Ranking",
    subtitle: "top-ranking.html flat grid kartı",
    icon: "crown",
    tokens: [
      {
        var: "--pc-topranking-radius",
        type: "range",
        default: 6,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Köşe",
      },
      {
        var: "--pc-topranking-padding",
        type: "range",
        default: 12,
        min: 4,
        max: 32,
        step: 1,
        unit: "px",
        label: "İç Padding",
      },
      {
        var: "--pc-topranking-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--pc-topranking-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      {
        var: "--pc-topranking-border-color",
        type: "color",
        default: "#e5e7eb",
        label: "Çerçeve Rengi",
      },
    ],
  },
  {
    id: "pc-rfq",
    title: "Varyant — RFQ Arama",
    subtitle: "RFQ featured + custom arama sonuçları",
    icon: "box",
    tokens: [
      {
        var: "--pc-rfq-radius",
        type: "range",
        default: 8,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Köşe",
      },
      {
        var: "--pc-rfq-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--pc-rfq-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      { var: "--pc-rfq-border-color", type: "color", default: "#e5e7eb", label: "Çerçeve Rengi" },
    ],
  },
  {
    id: "pc-featured",
    title: "Varyant — Featured / HotProducts",
    subtitle: 'Satıcı storefront "Featured Products" Buy-Now CTA\'lı kart',
    icon: "box",
    tokens: [
      {
        var: "--pc-featured-radius",
        type: "range",
        default: 8,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Köşe",
      },
      {
        var: "--pc-featured-padding",
        type: "range",
        default: 24,
        min: 8,
        max: 48,
        step: 1,
        unit: "px",
        label: "İç Padding",
      },
      {
        var: "--pc-featured-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--pc-featured-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      {
        var: "--pc-featured-border-color",
        type: "color",
        default: "#e5e7eb",
        label: "Çerçeve Rengi",
      },
    ],
  },
  {
    id: "pc-related",
    title: "Varyant — Related (İlgili Ürünler)",
    subtitle: "Ürün detay sayfasındaki 4 tab'lı related products",
    icon: "box",
    tokens: [
      {
        var: "--pc-related-radius",
        type: "range",
        default: 8,
        min: 0,
        max: 24,
        step: 1,
        unit: "px",
        label: "Köşe",
      },
      {
        var: "--pc-related-border-width",
        type: "range",
        default: 1,
        min: 0,
        max: 4,
        step: 1,
        unit: "px",
        label: "Çerçeve Kalınlığı",
      },
      { var: "--pc-related-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      {
        var: "--pc-related-border-color",
        type: "color",
        default: "#f3f4f6",
        label: "Çerçeve Rengi",
      },
    ],
  },
];

/**
 * Section override'ları. Her biri --product-card-* fallback'ine bağlı; bu
 * yüzden override edilmezse base değerleri kullanılır.
 */
export const productCardSectionTokenGroups = [
  {
    id: "topdeals-card",
    title: "Top Deals — Override",
    subtitle: "top-deals.html için opsiyonel kart override'ı",
    icon: "bolt",
    tokens: [
      { var: "--topdeals-card-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      { var: "--topdeals-card-border", type: "color", default: "#e5e7eb", label: "Çerçeve" },
      { var: "--topdeals-price-color", type: "color", default: "#dc2626", label: "Fiyat Rengi" },
      { var: "--topdeals-badge-bg", type: "color", default: "#DE0505", label: "İndirim Rozeti BG" },
    ],
  },
  {
    id: "topranking-card",
    title: "Top Ranking — Override",
    subtitle: "UYARI: hero kategori ve top-ranking.html ürün kartlarını birlikte etkiler",
    icon: "crown",
    tokens: [
      { var: "--topranking-card-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      { var: "--topranking-card-border", type: "color", default: "#e5e7eb", label: "Çerçeve" },
    ],
  },
  {
    id: "tailored-card",
    title: "Tailored — Override",
    subtitle: "tailored-selections için koleksiyon kartı",
    icon: "wand-magic-sparkles",
    tokens: [
      { var: "--tailored-card-bg", type: "color", default: "#ffffff", label: "Arka Plan" },
      { var: "--tailored-card-border", type: "color", default: "#e5e7eb", label: "Çerçeve" },
      { var: "--tailored-price-color", type: "color", default: "#222222", label: "Fiyat Rengi" },
      {
        var: "--tailored-views-color",
        type: "color",
        default: "#767676",
        label: "Görüntülenme Rengi",
      },
      {
        var: "--tailored-collection-title-color",
        type: "color",
        default: "#222222",
        label: "Koleksiyon Başlığı",
      },
    ],
  },
];

/**
 * Tüm grupları tek yerde — sekme UI'ı bunu kullanır.
 */
export const allTokenGroups = [
  ...paletteTokenGroups,
  ...typographyTokenGroups,
  ...radiusTokenGroups,
  ...spacingTokenGroups,
  ...inputTokenGroups,
  ...checkboxTokenGroups,
  ...quantityTokenGroups,
  ...buttonTokenGroups,
  ...productCardBaseTokenGroups,
  ...productCardVariantGroups,
  ...productCardSectionTokenGroups,
];

/**
 * Tüm bilinen token'ların varsayılan değerleri haritası.
 * Reset / defaults için kullanılır. Opsiyonel `groups` parametresiyle alt
 * küme de alınabilir.
 */
export function buildDefaultsMap(groups = allTokenGroups) {
  const defaults = {};
  for (const group of groups) {
    for (const t of group.tokens) {
      // range için default'a unit eklenir, color ve text olduğu gibi kullanılır
      if (t.type === "range") {
        defaults[t.var] = `${t.default}${t.unit || ""}`;
      } else {
        defaults[t.var] = String(t.default);
      }
    }
  }
  return defaults;
}

/**
 * Tüm bilinen CSS variable isimlerinin listesi (bir token'ı düzenlerken
 * hızlıca kontrol etmek için).
 */
export function allTokenVars(groups = allTokenGroups) {
  const vars = [];
  for (const group of groups) {
    for (const t of group.tokens) vars.push(t.var);
  }
  return vars;
}
