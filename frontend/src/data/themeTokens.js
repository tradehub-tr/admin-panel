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
// v1 kapsamı: yalnızca BUTON tokenları. İleride card/input/badge eklenebilir.
// ======================================================

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
    id: 'ortak',
    title: 'Ortak Ayarlar',
    subtitle: 'Hem dolu hem outline butonlar için geçerli',
    icon: 'sliders',
    tokens: [
      { var: '--radius-button', type: 'range', default: 8, min: 0, max: 64, step: 1, unit: 'px', label: 'Köşe Yuvarlaklığı' },
      { var: '--spacing-button-x', type: 'range', default: 24, min: 0, max: 64, step: 1, unit: 'px', label: 'Yatay Boşluk (Padding X)' },
      { var: '--spacing-button-y', type: 'range', default: 12, min: 0, max: 32, step: 1, unit: 'px', label: 'Dikey Boşluk (Padding Y)' },
      { var: '--btn-font-size', type: 'range', default: 0.875, min: 0.5, max: 2, step: 0.0625, unit: 'rem', label: 'Yazı Boyutu' },
      { var: '--btn-font-weight', type: 'range', default: 600, min: 100, max: 900, step: 100, unit: '', label: 'Yazı Kalınlığı' },
    ],
  },
  {
    id: 'solid',
    title: 'Dolu Buton (Primary)',
    subtitle: 'Ana aksiyon butonları: Giriş Yap, Sepete Ekle vs.',
    icon: 'square',
    tokens: [
      { var: '--btn-bg', type: 'color', default: '#cc9900', label: 'Arka Plan' },
      { var: '--btn-text', type: 'color', default: '#ffffff', label: 'Yazı Rengi' },
      { var: '--btn-border-width', type: 'range', default: 0, min: 0, max: 8, step: 1, unit: 'px', label: 'Çerçeve Kalınlığı' },
      { var: '--btn-border-color', type: 'color', default: '#cc9900', label: 'Çerçeve Rengi' },
      { var: '--btn-shadow', type: 'text', default: 'none', label: 'Gölge (CSS shadow)' },
      { var: '--btn-hover-bg', type: 'color', default: '#b38600', label: 'Hover Arka Plan' },
      { var: '--btn-hover-text', type: 'color', default: '#ffffff', label: 'Hover Yazı Rengi' },
    ],
  },
  {
    id: 'outline',
    title: 'Outline Buton',
    subtitle: 'İkincil aksiyonlar: İptal, Geri, Önizle vs.',
    icon: 'square-dashed',
    tokens: [
      { var: '--btn-outline-bg', type: 'color', default: '#ffffff', label: 'Arka Plan' },
      { var: '--btn-outline-text', type: 'color', default: '#cc9900', label: 'Yazı Rengi' },
      { var: '--btn-outline-border-width', type: 'range', default: 2, min: 0, max: 8, step: 1, unit: 'px', label: 'Çerçeve Kalınlığı' },
      { var: '--btn-outline-border-color', type: 'color', default: '#cc9900', label: 'Çerçeve Rengi' },
      { var: '--btn-outline-hover-bg', type: 'color', default: 'rgba(204,153,0,0.08)', label: 'Hover Arka Plan' },
      { var: '--btn-outline-hover-text', type: 'color', default: '#cc9900', label: 'Hover Yazı Rengi' },
    ],
  },
]

/**
 * Tüm bilinen token'ların varsayılan değerleri haritası.
 * Reset / defaults için kullanılır.
 */
export function buildDefaultsMap() {
  const defaults = {}
  for (const group of buttonTokenGroups) {
    for (const t of group.tokens) {
      // range için default'a unit eklenir, color ve text olduğu gibi kullanılır
      if (t.type === 'range') {
        defaults[t.var] = `${t.default}${t.unit || ''}`
      } else {
        defaults[t.var] = String(t.default)
      }
    }
  }
  return defaults
}

/**
 * Tüm bilinen CSS variable isimlerinin listesi (bir token'ı düzenlerken
 * hızlıca kontrol etmek için).
 */
export function allTokenVars() {
  const vars = []
  for (const group of buttonTokenGroups) {
    for (const t of group.tokens) vars.push(t.var)
  }
  return vars
}
