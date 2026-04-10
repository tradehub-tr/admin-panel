/**
 * Color Scale Generator
 * =====================
 * Bir baz hex renkten Tailwind-tarzı 50→950 scale üretir.
 *
 * Algoritma: HSL uzayında lightness interpolation (saturation'ı uçlarda azalt).
 * Bu Tailwind'in resmi jeneratörüyle bit-perfect aynı değildir ama görsel
 * olarak uyumlu ve 11 tonlu tutarlı bir scale üretir — admin panelinde
 * "başlangıç noktası" olarak yeterli.
 */

// Tailwind benzeri lightness haritası — scale step'i → L (0-100)
const LIGHTNESS_MAP = {
  50: 97,
  100: 93,
  200: 85,
  300: 74,
  400: 60,
  500: 50,
  600: 42,
  700: 33,
  800: 25,
  900: 17,
  950: 10,
}

/**
 * Hex (#rrggbb) → [h, s, l] (HSL: h=0..360, s/l=0..100)
 */
export function hexToHsl(hex) {
  const clean = String(hex || '').trim().replace(/^#/, '')
  let r, g, b
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255
    g = parseInt(clean[1] + clean[1], 16) / 255
    b = parseInt(clean[2] + clean[2], 16) / 255
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16) / 255
    g = parseInt(clean.slice(2, 4), 16) / 255
    b = parseInt(clean.slice(4, 6), 16) / 255
  } else {
    return [0, 0, 50]
  }

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }

  return [h, s * 100, l * 100]
}

/**
 * HSL → hex (#rrggbb). h=0..360, s/l=0..100.
 */
export function hslToHex(h, s, l) {
  const sN = Math.max(0, Math.min(100, s)) / 100
  const lN = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const hh = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const m = lN - c / 2
  let r, g, b
  if (hh < 1)      [r, g, b] = [c, x, 0]
  else if (hh < 2) [r, g, b] = [x, c, 0]
  else if (hh < 3) [r, g, b] = [0, c, x]
  else if (hh < 4) [r, g, b] = [0, x, c]
  else if (hh < 5) [r, g, b] = [x, 0, c]
  else             [r, g, b] = [c, 0, x]

  const to = (v) => {
    const n = Math.round((v + m) * 255)
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  }
  return `#${to(r)}${to(g)}${to(b)}`
}

/**
 * Baz hex'ten 50→950 scale üret.
 * Dönüş: { 50: '#...', 100: '#...', ..., 950: '#...' }
 */
export function generateScale(baseHex) {
  const [h, s] = hexToHsl(baseHex)
  const out = {}
  for (const [step, targetL] of Object.entries(LIGHTNESS_MAP)) {
    // Aşırı açık (L>90) ve aşırı koyu (L<15) tonlarda saturation azalt
    // — saf renk yerine daha nötr bir kenar elde etmek için
    let adjS = s
    if (targetL >= 90) adjS = s * 0.35
    else if (targetL <= 15) adjS = s * 0.6
    out[step] = hslToHex(h, adjS, targetL)
  }
  return out
}

/**
 * Scale'i token override mapping'e çevir.
 * Örn: prefix='primary', scale={50:'#...',...} → {'--color-primary-50':'#...',...}
 */
export function scaleToOverrides(prefix, scaleMap) {
  const out = {}
  for (const [step, hex] of Object.entries(scaleMap)) {
    out[`--color-${prefix}-${step}`] = hex
  }
  return out
}
