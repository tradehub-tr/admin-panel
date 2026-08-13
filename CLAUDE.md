# CLAUDE.md — admin-panel

Bu dosya kısa orkestrasyon kurallarını içerir. Detaylı kurallar `admin-panel/.claude/rules/` altında path-scoped olarak duruyor — Claude o tip dosyaya dokunduğunda otomatik yüklenir.

> **Kod yazmadan önce** ilgili Vue.js docs sayfasını oku (bkz. `.claude/rules/vue-docs.md`). Stil yazmadan önce `.claude/rules/scss.md`'ye ve `src/assets/scss/variables.scss`'e bak.

---

## 1. Proje künyesi

| Alan | Değer |
|---|---|
| Uygulama | TR Tradehub Admin Panel (satıcı + admin) — Frappe backend için Vue 3 SPA |
| Frontend kökü | `admin-panel/frontend/` |
| Default branch | `master` |
| Build | **Vite 5.4** (`vite.config.js`) |
| Framework | **Vue 3.5+** (Composition API, `<script setup>`) |
| Router | **Vue Router 4.4** (lazy-loaded, history mode) |
| State | **Pinia 2.2** (setup store deseni) |
| Stiller | **SCSS** (`sass` devDep, modern `@use`) — `src/assets/main.scss` + `src/assets/scss/*.scss` |
| Utility CSS | **Tailwind v4** — `@tailwindcss/vite` eklentisiyle **build'e derleniyor** (`src/assets/tailwind.css`) |
| Grafikler | **ECharts 5.5** + **Chart.js 4.5** |
| Ikonlar | **lucide-vue-next** |
| Sürükle-bırak | **vuedraggable 4** |
| Lint/Format | ESLint 9 (flat config) + Prettier 3 + `eslint-plugin-vue` |
| Backend API | Frappe REST — `/api/method/...`, `/api/resource/...` (CSRF + cookie auth) |
| Base path (build) | `/panel/` (production), `/` (dev / GitHub Pages) |

**Özel notlar:**
- `vite.config.js` `/api`, `/assets`, `/files`, `/private`, `/socket.io` proxy'lerini Frappe backend'ine yönlendirir. Bu yolları **asla** absolute URL ile çağırma — relative kullan.
- `src/utils/api.js` tek `request()` fonksiyonu üzerinden CSRF, hata çözümleme ve 401-redirect davranışını merkezleştirir. **Yeni HTTP istekleri için her zaman bu modülü kullan**, fetch'i doğrudan çağırma.
- **Stiller:** Tailwind utility class'ları **Vite build'inde üretilir** (`@tailwindcss/vite`, `src/assets/tailwind.css`) — CDN **yok**, `index.html` dış stil çekmiyor. Marka rengi/spacing/transition gibi tasarım tokenları `variables.scss` üzerinden gider. Karma kullanım kuralları `.claude/rules/scss.md` §6.
  > ⚠️ Bu satır eskiden "Tailwind CDN" diyordu; proje Tailwind v4 Vite eklentisine geçtiğinde güncellenmemişti. Stil zincirini kuran her yeni araç (Storybook gibi) bu eklentiyi ayrıca devreye almalı, yoksa hiçbir utility sınıfı üretilmez.

> ⚠ **LOCAL dev'de HMR YOK** — `docker-compose.yml`'deki `admin-panel` servisi Vite dev server değil, **nginx ile `./admin-panel/frontend/dist`'i** servis ediyor (`admin-panel/frontend/dist:/usr/share/nginx/html/panel:ro`). Frontend'de yapılan her değişikliği görmek için zorunlu:
> ```bash
> cd admin-panel/frontend && npm run build
> ```
> Sonra tarayıcıda **Ctrl+Shift+R** ile hard refresh. Yeni dosya/route ekleyince index.html yeniden üretilir, eski bundle hash'i geçersiz olur.

## 1.1 Storybook (2026-08-12)

Component'leri uygulamayı ayağa kaldırmadan geliştirmek ve tasarım onayı almak için:

```bash
cd admin-panel/frontend
npm run storybook          # dev sunucu, http://localhost:6006 — HMR VAR
npm run build-storybook     # statik çıktı → storybook-static/ (gitignored)
```

> HMR olmayan uygulamanın aksine Storybook **kendi dev sunucusunu** getiriyor;
> component üzerinde çalışırken `npm run build` beklemeye gerek yok.

| Dosya | İşi |
|---|---|
| `.storybook/main.js` | Vite ayarları **yeniden** kurulur — Storybook `vite.config.js`'i OKUMAZ. Tailwind eklentisi, SCSS `modern-compiler` ve `@` alias'ı burada |
| `.storybook/preview.js` | Stil zinciri (`main.js` ile aynı sıra), i18n, memory router, Pinia, `txResize`/`nativeSelectPicker`; tema (`html.dark`) ve dil araç çubukları |
| `.storybook/mocks/api.js` | `@/utils/api` sahtesi — Storybook'ta backend yok |

**Story yazarken:**
- Başlık düzeni: `Ortak/…`, `Ortak/DataTable/…`, `Form Alanları/…`, `Lojistik/…`
- Backend'e giden component'lerde mock **yanıt şekli gerçek `api.js` ile aynı olmalı** —
  `getList`→`{data}`, `getMeta`/`callMethod`/`searchLink`→`{message}`, `uploadFile`→string.
  Şekil saparsa story yalan söyler: tasarım onaylanır, gerçek veriye bağlanınca ekran boş gelir.
- i18n preview'da **senkron** kurulur (4 dil statik import). Uygulamadaki async
  `initializeI18n()` kullanılamıyor — Storybook preview'ı esbuild ile paketlendiği için
  top-level `await` çalışmıyor.
- `Teleport` kullanan component'ler `#storybook-root`'u boş bırakır, `body`'ye render eder.

## 1.2 Testler

```bash
npm test          # node --test "src/**/*.test.js"  — 108 test
npm run test:watch
```

Testler **Node'un yerleşik koşucusunu** kullanıyor (`node:test` + `node:assert`),
vitest/jest **yok** — yeni test yazarken aynı deseni sürdür. CI (`lint.yml`) bu
script'i çalıştırıyor.

> Dizin verip `node --test src/` çalıştırma — hata verir. Glob deseni gerekli.

## 2. Mutlak kurallar (özet)

> Detay her birinin path-scoped rule'unda. Burası özet uyarı listesi.

1. **READ-FIRST:** Vue docs + mevcut benzer dosyayı oku, sonra kod yaz.
2. **REFACTOR-BEFORE-WRITE:** Composable/store/util/SCSS'leri ara, aynı işi yapan varsa onu kullan.
3. **`v-html` yasak** — sadece backend sanitize'li içerik, yorumda gerekçe.
4. **Reactive nesne destructure etme** → `toRefs()` veya `storeToRefs()`.
5. **Computed içine side-effect koyma** — `watch`/`watchEffect` veya event handler.
6. **Büyük 3. parti instance** (ECharts, Chart.js) → `markRaw()` veya `shallowRef()`.
7. **Lifecycle hook'ları `await` sonrası çağırma** — sadece sync setup'ta.
8. **`v-for` üzerinde her zaman `:key`** — kararlı kimlik, index değil.
9. **SCSS `@import` yasak** — `@use ... as *`.
10. **`console.log` ve `any` ile commit yok** — `npm run lint:fix`.
11. **Yeni dependency:** sor + bundle audit.

## 3. Path-scoped rules

`.claude/rules/` altında 8 dosya — ilgili dosya açıldığında otomatik yüklenir:

| Dosya | Hangi dosyalar için | İçerik |
|---|---|---|
| `vue-reactivity.md` | `**/*.{vue,js}` | ref/reactive/shallowRef karar tablosu, computed/watch, destructure |
| `state-management.md` | `src/composables/**`, `src/stores/**`, `**/*.vue` | Composable + Pinia setup store şablonları ve kuralları |
| `components-router.md` | `src/components/**`, `src/views/**`, `src/router/**`, `**/*.vue` | Component yapısı, defineModel, performans, Vue Router meta |
| `api-security.md` | `src/utils/api.js`, `src/stores/**`, `**/*.vue` | `api.request` deseni, Frappe entegrasyonu, güvenlik checklist (XSS/redirect/injection) |
| `scss.md` | `**/*.scss`, `**/*.vue` | `@use` syntax, token tablosu, dark mixin, Tailwind ile karma kullanım |
| `build-decisions.md` | `package.json`, `vite.config.js`, `eslint.config.js`, `.prettierrc.json` | NPM scripts, ESLint/Prettier, dosya ekleme karar ağacı |
| `workflow.md` | `**/*.{vue,js,scss}` | 12 mutlak kural, başlangıç checklist'i, hızlı hata tablosu |
| `vue-docs.md` | `**/*.vue` | Vue.js docs sidebar referansları, Pinia/Router/Sass linkleri |

## 4. Auto memory ile ilişki

Kök auto memory (`~/.claude/projects/-home-metin-Desktop-istoc-c--cd/memory/MEMORY.md`) her oturumda yüklenir. Bu CLAUDE.md ile **tamamlayıcı**: bu dosya yazılı kural, memory biriken öğrenme.

Clean code kuralları kök `.claude/rules/clean-code.md`'de — 3 alt-projeyi de kapsar, burada tekrar edilmedi.

<!-- Bakım notu: bu dosyayı <200 satırda tut. Detay rules'a, biriken öğrenme memory'ye. -->

**Son güncelleme:** 2026-05-14 — CLAUDE.md path-scoped rules yapısına geçirildi (817 → ~110 satır, içerik 8 rule'a bölündü).
