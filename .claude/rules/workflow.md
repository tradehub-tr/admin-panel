---
paths:
  - "**/*.vue"
  - "**/*.js"
  - "**/*.scss"
---

# İş akışı — mutlak kurallar + checklist + hızlı referans

## 1. Mutlak kurallar (ihlal = PR red)

1. **READ-FIRST:** Vue docs ilgili sayfasını ve mevcut benzer dosyayı oku. Ardından kod yaz.
2. **REFACTOR-BEFORE-WRITE:** Yeni fonksiyon/dosya yazmadan önce composable, store, util, SCSS'leri ara (`grep`/`Glob`). Aynı işi yapan varsa onu kullan ya da genişlet.
3. **2 satırlık işi 4 satıra şişirme:** Erken `return`, ternary, `??`. (Detay: kök `clean-code.md`)
4. **`v-html` yasak** — sadece backend'in sanitize ettiği güvenilir içerik için ve kod yorumunda **neden** güvenli olduğu açıklanmalı.
5. **Token, parola, e-posta, oturum ID'si log'a yazılmaz.** `console.log` üretime girmez (lint `warn` veriyor — `console.warn`/`console.error` izinli).
6. **Reactive nesne destructure etme.** `const { x } = reactive(...)` veya `const { x } = store` reaktiviteyi kırar — `toRefs()` veya `storeToRefs()` kullan.
7. **Computed içine side-effect koyma** (fetch, mutation, `Date.now`, `console.log`, `ref.value = ...`). Bunlar `watch`/`watchEffect` veya event handler işidir.
8. **Büyük/3. parti instance'ları (ECharts, Chart.js, leaflet) reactive yapma.** `markRaw()` veya `shallowRef()` kullan; aksi hâlde Proxy overhead'i FPS düşürür.
9. **Lifecycle hook'ları (`onMounted`, `onUnmounted`) async fonksiyonun `await` sonrası çağırma.** Sadece `setup`/`<script setup>`'in **synchronous** kısmında çalışır.
10. **`v-for` üzerinde her zaman `:key`** — index değil, kararlı kimlik (`item.name`, `item.id`).
11. **SCSS'te `@import` yasak.** `@use ... as *` veya `@use ... as alias` kullan. Renk/spacing/transition için **önce `variables.scss`**, yoksa ekle.
12. **Yeni dependency ekleme.** `package.json`'a yazmadan önce sor.

## 2. Yeni işe başlamadan önce — checklist

1. [ ] Konuyla ilgili Vue docs sayfasını oku (`vue-docs.md` tablosu).
2. [ ] SCSS token tablosunu kontrol et — yeni renk/transition gerekiyor mu? (`scss.md`)
3. [ ] `src/composables/`, `src/stores/`, `src/utils/`'i grep et — aynı işi yapan var mı?
4. [ ] `package.json`'a yeni dep eklemen gerekiyorsa **sor**.
5. [ ] Değiştireceğin dosyada lint hatası varsa önce onu düzelt.
6. [ ] Reaktivite seçimi: `ref` mi, `shallowRef` mi, `markRaw` mı? (`vue-reactivity.md` §1)
7. [ ] Liste render: 100+ satır mı? `v-memo` veya virtualization gerekir mi? (`components-router.md` §3)
8. [ ] API çağrısı: mevcut `api.*` metoduna sığıyor mu? (`api-security.md` §2)
9. [ ] Güvenlik: `v-html`, dynamic href/style/component, redirect kullandın mı? (`api-security.md` §3)
10. [ ] Stil yazıyorsan: Tailwind mı SCSS mi? (`scss.md` §6)
11. [ ] Bitirdikten sonra `npm run lint:fix && npm run build` lokalde temiz geçsin.

## 3. Hızlı referans — en sık hatalar

| Hata | Düzeltme |
|---|---|
| `const { user } = useAuthStore()` reactivity yok | `const { user } = storeToRefs(useAuthStore())` |
| `{{ formatDate(row.modified) }}` her render'da çalışıyor | List'i `computed` ile pre-format'la |
| ECharts UI'ı dondurdu | `shallowRef(null)` veya `markRaw(echarts.init(...))` |
| watch async race condition | `onWatcherCleanup(() => ctrl.abort())` (Vue 3.5) |
| 1000 satırlık `v-for` ağır | `v-memo="[row.id, row.status]"` veya virtualization |
| `props.modelValue` + emit boilerplate | `const model = defineModel()` (Vue 3.4+) |
| reactive nested mutation reflect olmuyor | `shallowRef` kullanıyorsan `triggerRef(state)` çağır |
| Computed'de `Date.now()` non-reactive | Side effect → `watch` veya `setInterval` + `ref` |
| `v-for` index key | `:key="item.name"` — Frappe doctype'larda `name` PK |
| `console.log` lint warning | `console.warn` / `console.error` veya kaldır |
| `@import "variables"` deprecation | `@use "variables" as *;` |
| `lighten($brand, 10%)` global fn deprecation | `@use "sass:color"; color.adjust($brand, $lightness: 10%);` |
| `class="bg-[#7c3aed]"` hard-coded brand | Scoped `<style>`'de `background: $brand;` |

## 4. Bu dosyanın bakımı

Yeni bir kalıbı ekibe yaymak istiyorsan (yeni composable, güvenlik öğesi, performans tuzağı, SCSS token):
- Path-scoped bir kural ise → ilgili `.claude/rules/*.md`'ye ekle
- Tüm projeye geçerli ise → bu `workflow.md`'ye ekle
- Çok kısa ve geçici ise → auto memory'ye bırak (Claude'un kendi öğrenmesi)

CLAUDE.md ve rules kod kadar canlı doküman olmalı — eski/yanlış olan silinmeli.
