---
paths:
  - "**/*.scss"
  - "**/*.vue"
---

# SCSS / Sass — modern kullanım

> Mevcut yapı: `src/assets/main.scss` `@use` ile tüm partial'ları yükler. Tasarım tokenları `src/assets/scss/variables.scss`'de. **`@import` tamamen yasak** (Sass 3.0'da kaldırılacak).

Zorunlu okumalar (yeni stil dosyası açmadan önce):
- <https://sass-lang.com/documentation/at-rules/use/>
- <https://sass-lang.com/documentation/breaking-changes/import/>
- <https://sass-lang.com/documentation/modules/>

## 1. Tasarım tokenları (variables.scss referans tablosu)

| Prefix | Anlam | Örnek |
|---|---|---|
| `$brand`, `$brand-glow`, `$brand-light` | Marka rengi | `#7c3aed` |
| `$l-bg`, `$l-bg-soft`, `$l-bg-muted`, `$l-bg-subtle` | Light arka plan | `#ffffff`, `#f8f9fb` |
| `$l-border`, `$l-border-alt` | Light border | `#e5e7eb` |
| `$l-text-{900..300}` | Light metin tonları | `$l-text-700: #374151` |
| `$d-bg`, `$d-bg-card`, `$d-bg-elevated`, `$d-bg-hover` | Dark arka plan | `#0f0f14`, `#16161d` |
| `$d-border`, `$d-border-inner` | Dark border | `#2a2a38` |
| `$d-text`, `$d-text-hi`, `$d-text-max`, `$d-text-muted`, `$d-text-faint` | Dark metin tonları | `#e8e8f0` |
| `$d-rail-bg`, `$d-panel-bg`, `$d-panel-border`, `$d-item-hover` | Sidebar dark | `#0a0a0f`, `#16161d` |
| `$c-success`, `$c-warning`, `$c-error`, `$c-info` | Status renkleri | `#10b981`, `#ef4444` |
| `$t-fast`, `$t-base`, `$t-slow`, `$t-panel`, `$t-spring`, `$t-spring-slow` | Transition timings | `0.12s ease`, `0.25s cubic-bezier(...)` |

**Yeni renk/transition eklemeden önce bu tabloyu kontrol et.**

## 2. Mixin'ler

```scss
// variables.scss — dark mode wrapper
@mixin dark { html.dark & { @content; } }

// Kullanım:
.card {
  background: $l-bg;
  @include dark { background: $d-bg-card; }
}
```

## 3. `@use` kuralları

```scss
// ✅ DOĞRU — namespace olmadan (proje standardı)
@use "@/assets/scss/variables" as *;

.toolbar {
  color: $brand;
  transition: background $t-base;
}

// ✅ DOĞRU — alias ile (çakışma riski varsa)
@use "@/assets/scss/variables" as v;
.toolbar { color: v.$brand; }

// ✅ DOĞRU — built-in module
@use "sass:color";
@use "sass:map";

.btn { background: color.adjust($brand, $lightness: 10%); }

// ❌ YANLIŞ — @import deprecated
@import "variables";

// ❌ YANLIŞ — global Sass fonksiyonu (deprecated)
.btn { background: lighten($brand, 10%); }                       // ❌
.btn { background: color.adjust($brand, $lightness: 10%); }      // ✅
```

## 4. Yeni partial eklerken

1. Dosya adı `_<name>.scss` veya `<name>.scss` (mevcut konvansiyon: prefix yok).
2. **İlk satır:** `@use "variables" as *;` — token'lara erişim için.
3. `main.scss`'e `@use "scss/<name>";` satırını ekle.
4. **Private üye** istiyorsan `$-internal-x` veya `_internal-x()` (tire/altçizgi prefix).
5. Module dışından konfigüre edilebilsin istiyorsan `$x: 0.25rem !default;` (library deseni).

## 5. Sass variable vs CSS custom property

| Kullanım | Seçim | Neden |
|---|---|---|
| Build-time sabit (renk paleti, spacing, transition) | **Sass `$var`** | Derleme sonunda yok olur, bundle küçülür |
| Runtime'da değişen (theme switch, kullanıcı seçtiği renk) | **CSS `--var`** | DOM'da inherit edilir, JS ile güncellenebilir |
| Hibrit (örn. dark mode) | İkisi birlikte | Bu projede `html.dark` class + Sass token; CSS variable gerekmiyor |

```scss
// ✅ Runtime tema renk override (ileride gerekirse)
:root { --brand: #{$brand}; }
.btn { background: var(--brand); }
// JS: document.documentElement.style.setProperty('--brand', userColor)
```

## 6. Tailwind ile SCSS karma kullanım

> Tailwind CDN'den (`index.html`) yükleniyor — utility class'lar mevcut ama **JIT, purge, custom theme yok**. Bu, kararlarımızı etkiler.

| Görev | Hangisi | Örnek |
|---|---|---|
| Layout (flex/grid/spacing) | Tailwind | `class="flex items-center gap-3 px-4 py-2"` |
| Tipografi ölçek (`text-sm`, `font-medium`) | Tailwind | `class="text-sm font-medium text-gray-700"` |
| **Marka rengi** (`#7c3aed`) | SCSS variable | scoped `<style>` içinde `background: $brand;` |
| **Dark mode varyantı** | SCSS `@include dark` | Tailwind `dark:` CDN'de yapılandırılmamış |
| **Brand transition** (`$t-spring`) | SCSS variable | Tailwind transition utility'leri statik |
| Bir kez kullanılan one-off layout | Tailwind | `class="absolute -top-2 -right-2"` |
| Tekrar eden component pattern | SCSS class | `.product-card { ... }` |

**Anti-pattern:** `class="bg-[#7c3aed]"` gibi arbitrary value Tailwind class'ı yerine SCSS variable. Marka renginin **tek kaynağı** `$brand` olmalı.

## 7. Performans

- **`@extend`'i agresif kullanma** — selector listesi şişer. Mixin tercih et.
- **Deeply nested (4+ seviye)** yazma — specificity savaşı. BEM (`.card__header--active`) veya mixin.
- **Autoprefixer Vite zaten ekliyor** — `-webkit-`, `-moz-` prefix'lerini elle yazma.
- **Google Fonts `@import url(...)`** `base.scss`'de var. Yeni font ekleme; DM Sans + JetBrains Mono yeterli. Eklenecekse self-host (`font-display: swap`).
