# CLAUDE.md — admin-panel

> Bu dosya, `admin-panel/` reposunda Claude'un (ve diğer AI ajanlarının) kod yazarken **mutlaka** uyması gereken kuralları tanımlar. Amaç: tutarlı, performant, güvenli ve clean Vue 3 kodu üretmek; aynı hataları tekrar etmemek; gereksiz uzun/karmaşık çözümlerden kaçınmak.

> **Kod yazmadan önce** ilgili Vue.js docs sayfasını oku (bkz. **§16 — Vue.js Docs Sidebar Rehberi**). Aynı şekilde stil yazmadan önce **§11 — SCSS / Sass** bölümüne ve `src/assets/scss/variables.scss`'e bak.

---

## 1. Proje Künyesi (Tek Bakışta Stack)

| Alan | Değer |
|---|---|
| Uygulama | TR Tradehub Admin Panel (satıcı + admin) — Frappe backend için Vue 3 SPA |
| Frontend kökü | `admin-panel/frontend/` |
| Build | **Vite 5.4** (`vite.config.js`) |
| Framework | **Vue 3.5+** (Composition API, `<script setup>`) |
| Router | **Vue Router 4.4** (lazy-loaded routes, history mode) |
| State | **Pinia 2.2** (setup store deseni) |
| Stiller | **SCSS** (`sass` devDep, modern `@use`) — `src/assets/main.scss` + `src/assets/scss/*.scss` |
| Utility CSS | **Tailwind CDN** — `index.html`'den yükleniyor (build'e dahil değil) |
| Grafikler | **ECharts 5.5** + **Chart.js 4.5** |
| Ikonlar | **lucide-vue-next** |
| Sürükle-bırak | **vuedraggable 4** |
| Lint/Format | ESLint 9 (flat config) + Prettier 3 + `eslint-plugin-vue` |
| Backend API | Frappe REST — `/api/method/...`, `/api/resource/...` (CSRF + cookie auth) |
| Base path (build) | `/panel/` (production), `/` (dev / GitHub Pages) |

**Özel notlar:**
- `vite.config.js` `/api`, `/assets`, `/files`, `/private`, `/socket.io` proxy'lerini Frappe backend'ine yönlendirir. Bu yolları **asla** absolute URL ile çağırma — relative kullan.
- `src/utils/api.js` tek `request()` fonksiyonu üzerinden CSRF, hata çözümleme ve 401-redirect davranışını merkezleştirir. **Yeni HTTP istekleri için her zaman bu modülü kullan**, fetch'i doğrudan çağırma (sadece `uploadFile` gibi multipart akışlar istisnadır ve onlar bile `getCsrfToken()` üzerinden gider).
- **Stiller:** Tailwind utility class'ları (`.flex`, `.text-sm`, `.bg-violet-500`) CDN'den hazır gelir, **ama** marka rengi/spacing/transition gibi tasarım tokenları `src/assets/scss/variables.scss` üzerinden gider. Bu iki sistemi karıştırmadan kullanma kuralları **§11**'de.

---

## 2. Mutlak Kurallar (Önce Bunları Oku)

> Bu kurallardan biri ihlal edilirse PR reddedilir. Hiçbir istisna yok.

1. **READ-FIRST**: Vue docs ilgili sayfasını (§16'daki tablodan bul) ve mevcut benzer dosyayı oku. Ardından kod yaz.
2. **REFACTOR-BEFORE-WRITE**: Yeni fonksiyon/dosya yazmadan önce composable, store, util ve SCSS'leri ara (`grep`/`Glob`). Aynı işi yapan bir şey varsa onu kullan ya da genişlet.
3. **2 satırlık işi 4 satıra şişirme**: Erken `return`, ternary, `??`. §10 "Clean Code" tablosu.
4. **`v-html` yasak** — sadece backend'in sanitize ettiği güvenilir içerik için ve kod yorumunda **neden** güvenli olduğu açıklanmalı.
5. **Token, parola, e-posta, oturum ID'si log'a yazılmaz**. `console.log` üretime girmez (lint zaten `warn` veriyor — `console.warn`/`console.error` izinli).
6. **Reactive nesne destructure etme**. `const { x } = reactive(...)` veya `const { x } = store` reaktiviteyi kırar — `toRefs()` veya `storeToRefs()` kullan.
7. **Computed içine side-effect koyma** (fetch, mutation, Date.now, console.log, `ref.value = ...`). Bunlar `watch`/`watchEffect` veya event handler işidir.
8. **Büyük/3. parti instance'ları (ECharts, Chart.js, leaflet vb.) reactive yapma**. `markRaw()` veya `shallowRef()` kullan; aksi hâlde Proxy overhead'i FPS düşürür.
9. **Lifecycle hook'ları (`onMounted`, `onUnmounted`) async fonksiyonun `await` sonrası çağırma**. Sadece `setup`/`<script setup>`'in **synchronous** kısmında çalışır.
10. **`v-for` üzerinde her zaman `:key`** — index değil, kararlı kimlik (`item.name`, `item.id`).
11. **SCSS'te `@import` yasak** (Sass 3.0'da kaldırılacak). `@use ... as *` veya `@use ... as alias` kullan. Renk/spacing/transition için **önce `variables.scss`**, yoksa ekle.
12. **Yeni dependency ekleme**. `package.json`'a yazmadan önce sor. (Bundle boyutu ve güvenlik audit gerekir.)

---

## 3. Vue 3.5 Reaktivite — Doğru Aracı Seçmek

Vue dokümantasyonunda zorunlu okumalar:
- <https://vuejs.org/guide/essentials/reactivity-fundamentals.html>
- <https://vuejs.org/guide/essentials/computed.html>
- <https://vuejs.org/guide/essentials/watchers.html>
- <https://vuejs.org/guide/extras/reactivity-in-depth.html>
- <https://vuejs.org/guide/best-practices/performance.html>
- <https://vuejs.org/guide/best-practices/security.html>

### 3.1 ref / reactive / shallowRef / shallowReactive — karar tablosu

| Veri tipi | Kullan | Neden |
|---|---|---|
| Primitive (string, number, boolean) | `ref()` | Tek seçenek; `.value` ile erişilir, template'te otomatik unwrap. |
| Küçük plain object/array | `ref()` veya `reactive()` | `ref()` daha tutarlı (tek pattern); `reactive()` `.value` istemez ama destructure problemli. |
| Büyük liste / payload (>~100 item) | `shallowRef([...])` | Her elemana Proxy sarılmaz; mutate ettiğinde `array.value = [...array.value, x]` ile yeni referans ata. |
| Form state (nested, derin watch lazım) | `reactive({...})` veya `ref({...})` | İkisi de iş görür; ekipte `ref` tercih ediliyor. |
| 3. parti instance (ECharts, Map, WebSocket) | `markRaw()` ile sar veya `shallowRef()` içine koy | Proxy bu kütüphaneleri bozar/yavaşlatır. |
| Hesaplanmış değer | `computed()` | Cache'lenir. **Asla** `methods` ile hesaplama yapıp template'ten çağırma. |
| Side-effect (API çağrısı, log, DOM) | `watch` / `watchEffect` / event handler | Computed değil. |

### 3.2 computed vs methods vs watch — Karar Akışı

```
Türetilmiş bir değer mi gösterilecek?
├── Evet → computed()    (cache'li, dependency-tracked, pure)
└── Hayır
    └── Bir şeyin yan etkisi mi var?
        ├── Belirli kaynak değiştiğinde → watch(source, cb)
        ├── Otomatik bağımlılık takibi isteniyor → watchEffect(cb)
        └── Kullanıcı etkileşimi → @click / @input handler (method)
```

**Kritik kural:** `methods` veya basit `function` template'te kullanılırsa **her render'da yeniden çalışır**. `{{ formatPrice(item) }}` kalıbı 1000 satırlık listede 1000× tetiklenir. Bunun yerine listeyi `computed` ile `formattedItems`'a çevir ve `{{ row.priceLabel }}` ile göster.

### 3.3 computed — Doğru ve Yanlış

```js
// ✅ DOĞRU — pure, türetilmiş, cache'li
const fullName = computed(() => `${user.value.firstName} ${user.value.lastName}`);

// ✅ DOĞRU — writable computed (v-model köprüsü)
const search = computed({
  get: () => route.query.q ?? "",
  set: (v) => router.replace({ query: { ...route.query, q: v || undefined } }),
});

// ❌ YANLIŞ — side effect (mutation + non-reactive Date.now)
const price = computed(() => {
  lastReadAt.value = Date.now();          // mutation
  return items.value.reduce((s, i) => s + i.price, 0);
});

// ❌ YANLIŞ — async / fetch
const user = computed(async () => (await api.getDoc("User", id.value)).data);
// Doğrusu: watchEffect içinde fetch + ref'e yaz.
```

### 3.4 watch / watchEffect — Doğru Kullanım

```js
// ✅ Belirli kaynak — eski/yeni değer lazım
watch(routeName, (next, prev) => { /* ... */ });

// ✅ Getter ile reactive object'in tek alanı
watch(() => filters.status, fetchList);

// ✅ Birden fazla kaynak
watch([page, pageSize, filters], fetchList, { deep: true });

// ✅ Async cleanup (Vue 3.5+) — race condition'a karşı
import { watch, onWatcherCleanup } from "vue";

watch(query, async (q) => {
  const ctrl = new AbortController();
  onWatcherCleanup(() => ctrl.abort());          // eski istek iptal
  results.value = await api.search(q, ctrl.signal);
});

// ✅ DOM güncellemesinden sonra çalıştır
watch(items, scrollToBottom, { flush: "post" });

// ❌ YANLIŞ — reactive object'in iç property'sini doğrudan watch
watch(filters.status, ...);   // Reaktif değil; getter sarmalı kullan.
```

`watchEffect`, bağımlılığı **otomatik** çıkarır. Karmaşık akışta `watch` daha öngörülebilir.

### 3.5 Destructure ve Reaktivite

```js
// ❌ Reaktivite KIRILIR
const { user, isLoading } = useAuthStore();

// ✅ State/computed için storeToRefs, action'lar destructure edilebilir
import { storeToRefs } from "pinia";
const auth = useAuthStore();
const { user, isLoading } = storeToRefs(auth);
const { login, logout } = auth;

// ✅ reactive() içinde de aynı sorun — toRefs() ile çöz
const state = reactive({ count: 0 });
const { count } = toRefs(state);
```

---

## 4. Composable'lar (`src/composables/`)

### 4.1 Kurallar

1. **Naming:** Her zaman `useX` (`useToast`, `useBreakpoint`, `useChart`).
2. **Konum:** Genel ise `src/composables/`, domain'e özelse `src/composables/<domain>/` (örn: `composables/dashboard/useChart.js`).
3. **Dönüş:** Plain object içinde **ref'ler** döndür — `return { x, y }`. `reactive({...})` döndürme; destructure reaktiviteyi bozar.
4. **Lifecycle:** `onMounted`/`onUnmounted` composable içinden çalışır; cleanup'ı (event listener, interval, AbortController) **mutlaka** `onUnmounted` veya `onScopeDispose` içinde yap. `useBreakpoint.js` bunun kanonik örneği.
5. **Reactive input:** Composable bir kaynak alıyorsa `Ref<T> | () => T | T` kabul edip içeride `toValue()` ile normalize et.
6. **Tek seferlik shared state**: Modul-level `ref` (örn: `useToast.js`'teki `toasts`) — global toast queue gibi case'ler için OK. Genel kural: shared state istemiyorsan tüm `ref`'leri **fonksiyon içinde** yarat.

### 4.2 Şablon

```js
import { ref, onMounted, onUnmounted, toValue } from "vue";

export function useResource(source) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);
  const ctrl = new AbortController();

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const url = toValue(source);
      data.value = await api.callMethodGET(url, { signal: ctrl.signal });
    } catch (e) {
      if (e.name !== "AbortError") error.value = e;
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  onUnmounted(() => ctrl.abort());

  return { data, error, loading, reload: load };
}
```

---

## 5. Pinia Store'lar (`src/stores/`)

Bu projede **setup store** deseni kullanılır (`stores/auth.js` referans örnek).

### 5.1 Şablon

```js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/utils/api";

export const useFooStore = defineStore("foo", () => {
  // state
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // getters
  const count = computed(() => items.value.length);

  // actions
  async function fetchAll(params = {}) {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.getList("Foo", params);
      items.value = res.data || [];
    } catch (e) {
      error.value = e.message || "Yükleme başarısız";
      throw e;                        // çağıran handle etsin
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, error, count, fetchAll };
});
```

### 5.2 Kurallar

- **Tüm state'i return et** (Pinia private state desteklemez).
- **Try/catch + finally**: Loading state'ini her zaman `finally`'de kapat. Hata mesajını **Türkçe** ve kullanıcıya gösterilebilir formda `error.value`'ya yaz.
- **Side-effect'leri action'larda topla**, component'te değil.
- **Cross-store erişim**: Action içinden `useOtherStore()` çağır — `defineStore` body'sinin top-level'ında değil.
- **Frappe doctype erişimi** için her zaman `api.getList/getDoc/createDoc/updateDoc/deleteDoc/callMethod` kullan.
- **Permission-aware count**: CRM doctype'ları için `api.getCount()` zaten override eder — listeyi (`utils/api.js:218` `CRM_DOCTYPES`) genişletmek gerekirse oradan ekle.

---

## 6. Component'ler (`src/components/`, `src/views/`)

### 6.1 Yapı

```vue
<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useFooStore } from "@/stores/foo";
import { useToast } from "@/composables/useToast";

// 1. Props & emits — defineModel (3.4+) varsa onu tercih et
const props = defineProps({
  itemId: { type: String, required: true },
});
const emit = defineEmits(["saved", "cancel"]);
const open = defineModel("open", { type: Boolean, default: false });

// 2. Store / composable
const store = useFooStore();
const { items, loading } = storeToRefs(store);
const toast = useToast();

// 3. Local state
const draft = ref(null);

// 4. Computed
const isDirty = computed(() =>
  JSON.stringify(draft.value) !== JSON.stringify(items.value.find(i => i.name === props.itemId))
);

// 5. Methods
async function save() {
  try {
    await store.update(props.itemId, draft.value);
    toast.success("Kaydedildi");
    emit("saved");
  } catch (e) {
    toast.error(e.message);
  }
}

// 6. Lifecycle / watchers (en sonda)
watch(() => props.itemId, loadDraft, { immediate: true });
async function loadDraft() { /* ... */ }
</script>

<template>
  <section>...</section>
</template>

<style scoped lang="scss">
@use "@/assets/scss/variables" as *;

.toolbar { color: $brand; transition: background $t-base; }
</style>
```

### 6.2 Kurallar

- **Her zaman `<script setup>`** kullan. `setup()` sadece çok özel bir entegrasyon gerektiyse.
- **Two-way binding için `defineModel()`** (Vue 3.4+). Yeni kodda `props.modelValue` + `emit('update:modelValue')` yazma.
- **Props mutate etme** — `eslint.config.js`'te `LayoutSectionCard.vue` istisnası var (ödenecek borç). Yeni component'lerde **`emit('update:...')`** ile parent'a haber ver.
- **Async component lazy load**: Route component'leri zaten `() => import(...)` ile lazy. Modal/dialog gibi büyük ama nadir kullanılan iç component'ler için `defineAsyncComponent` kullan.
- **Tek köklü olma zorunluluğu yok** (Vue 3) — gereksiz `<div>` wrapper açma.
- **Stiller — karma kullanım kuralı** (§11):
  - **Layout / spacing / utility**: Tailwind class'ları (`flex items-center gap-3 px-4 py-2`).
  - **Marka rengi / brand transition / dark mode / panel pattern**: SCSS variable + mixin (`background: $brand; transition: $t-spring; @include dark { ... }`).
  - **Component'e özel one-off stil**: `<style scoped lang="scss">` içinde, her zaman `@use "@/assets/scss/variables" as *;` ile başla.

### 6.3 Performans — Büyük Liste & Render

- **`v-memo`**: >200 satır listede `v-memo="[item.id, item.status]"` ile re-render atla.
- **`v-once`**: Tamamen statik blok için.
- **Stabil prop'lar**: `<Row :active="row.id === activeId" />`, `<Row :active-id="activeId" />`'den **kat kat** daha hızlı.
- **Liste binlerce satırsa** virtualization kullan — yeni dep eklemeden önce sor.
- **ECharts/Chart.js instance'ları**: `composables/dashboard/useChart.js`'i kullan; instance'ı `shallowRef` veya `markRaw` içinde tut.
- **Computed ile filtreleme**: Server-side pagination/filtreleme **default**. Client-side filtre 50 satırın üstüne çıkmasın.

---

## 7. Vue Router (`src/router/index.js`)

- **Tüm view'lar lazy** — `() => import("@/views/...")`. Statik import yapma.
- **`meta.requiresAuth`, `meta.guest`, `meta.requiresSuperAdmin`** — `beforeEach` guard'ı (`router/index.js:415`) işliyor; doğru meta'yı set et.
- **`meta.title`, `meta.breadcrumb`, `meta.section`** — sidebar/breadcrumb için zorunlu. Section değerleri: `dashboard | orders | catalog | products | commerce | store | system | messaging | crm | helpdesk | management`.
- **Race condition**: View içinde `route.params` izleyerek fetch yapıyorsan `watch` + `onWatcherCleanup` ile AbortController bağla.

---

## 8. API Katmanı (`src/utils/api.js`) ve Frappe Entegrasyonu

### 8.1 Asla yapma

- `fetch(...)` doğrudan çağırma — `api.request` üzerinden git.
- Multipart upload dışında `Content-Type` veya `X-Frappe-CSRF-Token` header'ını manuel set etme.
- Filter/field array'lerini elle string'e çevirme.
- 401 redirect mantığını component'te tekrar yazma — `request()` yapıyor.
- `_csrf_token`'ı localStorage dışında bir yere yazma.

### 8.2 Yeni Endpoint Eklerken

1. Frappe whitelisted method: `api.callMethod("tradehub_core.api.v1.module.fn", { ... })` (POST) veya `api.callMethodGET(...)` (GET).
2. Generic doctype CRUD: `api.getList/getDoc/createDoc/updateDoc/deleteDoc`.
3. Permission-aware count: `api.getCount` (CRM override eder).
4. Hata: `request()` zaten `_server_messages`/`exception`/`exc_type`'ı çözüp `Error.message` üretir. `try/catch (e) { toast.error(e.message) }` yeterli.

---

## 9. Güvenlik Checklist

> Vue 3 dokümantasyonu otomatik olarak `{{ }}` ve `:attr` binding'lerini escape eder. Aşağıdakiler **manuel** dikkat gerektirir.

| Risk | Ne Yapma | Ne Yap |
|---|---|---|
| **XSS via v-html** | `<div v-html="userInput" />` | Backend sanitize ettiği HTML için + neden güvenli olduğunu yorumda yaz. |
| **Open redirect** | `window.location.href = route.query.next` | `router.push(internal)`; `/` ile başlamalı, `//` veya protokol içermemeli. |
| **JS injection** | `<a :href="userUrl">` (sanitize edilmemiş) | `^(https?:|/|mailto:)` regex; `javascript:`, `data:` blokla. |
| **Style injection** | `<div :style="userStyleObject">` (whitelist'siz) | Sadece bilinen property'leri al. |
| **Dynamic component** | `<component :is="userInput">` | İzin verilen map'ten seç (`COMPONENT_MAP[key] ?? Fallback`). |
| **Token sızıntısı** | Token'ı log/error/URL'e yazma | Sadece header'a koy. |
| **VITE_ env** | `VITE_API_SECRET` | **Bundle'a inline edilir, herkes görür.** Sadece public config için. |

---

## 10. Clean Code — Somut Kurallar

### 10.1 Kısa Yaz

```js
// ❌ 5 satır
let label;
if (status === "open") label = "Açık";
else label = "Kapalı";

// ✅ 1 satır
const label = status === "open" ? "Açık" : "Kapalı";

// ❌ Erken return yok
function getCount(items) {
  let count = 0;
  if (items) if (items.length) count = items.length;
  return count;
}

// ✅
const getCount = (items) => items?.length ?? 0;

// ❌ Sürekli aynı `?.` zinciri
user.value?.profile?.address?.city || "Bilinmiyor"
user.value?.profile?.address?.country || "Bilinmiyor"

// ✅ Bir kez computed
const address = computed(() => user.value?.profile?.address ?? {});
```

### 10.2 Yorumda WHY, HİÇBİR ZAMAN WHAT

```js
// ❌
// items'ı filtrele
const active = items.value.filter((i) => i.is_active);

// ✅ — sadece non-trivial ise
// Frappe `disabled` field'ı 0/1; `!disabled` 0'da truthy döndüğü için
// `=== 0` zorunlu.
const active = items.value.filter((i) => i.disabled === 0);
```

### 10.3 İsimlendirme

- Composable: `useX`
- Pinia store: `useXStore`, dosya `xCamel.js`
- Component: PascalCase, view'lar `XView.vue`, layout'lar `XLayout.vue`
- Boolean: `isX`, `hasX`, `canX`
- Action: fiil + nesne (`fetchLeads`, `updateLead`, `deleteLead`)
- SCSS variable: kebab-case prefix'li (`$l-bg`, `$d-border`, `$c-success`, `$t-fast`)

### 10.4 Kaçınılacak Şeyler

- **Premature abstraction**: 3 benzer satırı factory'ye çevirme. 5+ benzer + gerçek varyasyon olduğunda ayır.
- **Defensive over-engineering**: Sınırda (props, API response) doğrula, içeride trust et.
- **Backwards-compat shim**: Kullanılmayan eski isimler için re-export, `// removed` yorumu — direkt sil.
- **Dead code**: Commented-out kod bırakma.

---

## 11. SCSS / Sass — Modern Kullanım

> Mevcut yapı: `src/assets/main.scss` `@use` ile tüm partial'ları yükler. Tasarım tokenları `src/assets/scss/variables.scss`'de. Modern Sass syntax kullanılıyor — `@import` tamamen yasak.

Zorunlu okumalar (yeni stil dosyası açmadan önce):
- <https://sass-lang.com/documentation/at-rules/use/>
- <https://sass-lang.com/documentation/at-rules/forward/>
- <https://sass-lang.com/documentation/variables/>
- <https://sass-lang.com/documentation/breaking-changes/import/> (neden `@use`)
- <https://sass-lang.com/documentation/modules/> (built-in: `sass:math`, `sass:color`, `sass:map`)

### 11.1 Tasarım Tokenları (Mevcut, Genişlet)

`variables.scss` referans tablosu — **yeni renk/transition eklemeden önce burayı kontrol et**:

| Prefix | Anlam | Örnek |
|---|---|---|
| `$brand`, `$brand-glow`, `$brand-light` | Marka rengi | `#7c3aed` |
| `$l-bg`, `$l-bg-soft`, `$l-bg-muted`, `$l-bg-subtle` | Light mode arka plan | `#ffffff`, `#f8f9fb` |
| `$l-border`, `$l-border-alt` | Light border | `#e5e7eb` |
| `$l-text-{900..300}` | Light metin tonları | `$l-text-700: #374151` |
| `$d-bg`, `$d-bg-card`, `$d-bg-elevated`, `$d-bg-hover` | Dark mode arka plan | `#0f0f14`, `#16161d` |
| `$d-border`, `$d-border-inner` | Dark border | `#2a2a38` |
| `$d-text`, `$d-text-hi`, `$d-text-max`, `$d-text-muted`, `$d-text-faint` | Dark metin tonları | `#e8e8f0` |
| `$d-rail-bg`, `$d-panel-bg`, `$d-panel-border`, `$d-item-hover` | Sidebar dark | `#0a0a0f`, `#16161d` |
| `$c-success`, `$c-warning`, `$c-error`, `$c-info` | Status renkleri | `#10b981`, `#ef4444` |
| `$t-fast`, `$t-base`, `$t-slow`, `$t-panel`, `$t-spring`, `$t-spring-slow` | Transition timings | `0.12s ease`, `0.25s cubic-bezier(...)` |

### 11.2 Mevcut Mixin'ler

```scss
// variables.scss — dark mode wrapper
@mixin dark { html.dark & { @content; } }

// Kullanım:
.card {
  background: $l-bg;
  @include dark {
    background: $d-bg-card;
  }
}
```

### 11.3 `@use` Kuralları

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

.btn {
  background: color.adjust($brand, $lightness: 10%);
}

// ❌ YANLIŞ — @import deprecated
@import "variables";

// ❌ YANLIŞ — global Sass fonksiyonu (deprecated)
.btn { background: lighten($brand, 10%); }    // ❌
.btn { background: color.adjust($brand, $lightness: 10%); }  // ✅
```

### 11.4 Yeni Partial Eklerken

1. Dosya adı `_<name>.scss` veya `<name>.scss` (mevcut konvansiyon: prefix yok).
2. **İlk satır:** `@use "variables" as *;` — token'lara erişim için.
3. `main.scss`'e `@use "scss/<name>";` satırını ekle.
4. **Private üye** istiyorsan `$-internal-x` veya `_internal-x()` (tire/altçizgi prefix).
5. Module dışından konfigüre edilebilsin istiyorsan `$x: 0.25rem !default;` (library deseni).

### 11.5 Sass Değişkeni vs CSS Custom Property

| Kullanım | Seçim | Neden |
|---|---|---|
| Build-time sabit (renk paleti, spacing, transition) | **Sass `$var`** | Derleme sonunda yok olur, bundle küçülür |
| Runtime'da değişen (theme switch, kullanıcı seçtiği renk) | **CSS `--var`** | DOM'da inherit edilir, JS ile güncellenebilir |
| Hibrit (ör. dark mode) | İkisi birlikte | Bu projede `html.dark` class + Sass token; CSS variable gerekmiyor |

```scss
// ✅ Runtime tema renk override (ileride gerekirse)
:root { --brand: #{$brand}; }
.btn { background: var(--brand); }
// JS: document.documentElement.style.setProperty('--brand', userColor)
```

### 11.6 Tailwind ile SCSS Karma Kullanım Kuralı

> Tailwind CDN'den (`index.html`) yükleniyor — **utility class'lar mevcuttur** ama JIT, purge, custom theme yok. Bu, kararlarımızı etkiler.

| Görev | Hangisi | Örnek |
|---|---|---|
| Layout (flex/grid/spacing) | Tailwind | `class="flex items-center gap-3 px-4 py-2"` |
| Tipografi ölçek (text-sm, font-medium) | Tailwind | `class="text-sm font-medium text-gray-700"` |
| **Marka rengi** (`#7c3aed`) | SCSS variable | `style="background: $brand"` veya scoped `<style>` |
| **Dark mode varyantı** | SCSS `@include dark` | Tailwind `dark:` CDN'de yapılandırılmamış |
| **Brand transition** (`$t-spring`) | SCSS variable | Tailwind transition utility'leri statik |
| Bir kez kullanılan one-off layout | Tailwind | `class="absolute -top-2 -right-2"` |
| Tekrar eden component pattern | SCSS class | `.product-card { ... }` |

**Anti-pattern:** `class="bg-[#7c3aed]"` gibi arbitrary value Tailwind class'ı yerine SCSS variable kullan. Marka renginin tek kaynağı `$brand` olmalı.

### 11.7 Performans

- **`@extend`'i agresif kullanma** — selector listesi şişer. Bunun yerine mixin tercih et.
- **Deeply nested selectors** (4+ seviye) yazma — specificity savaşı. Mixin veya BEM (`.card__header--active`) kullan.
- **Autoprefixer Vite zaten ekliyor** — `-webkit-`, `-moz-` prefix'lerini elle yazma.
- **Google Fonts `@import url(...)`** (CSS, Sass değil) `base.scss`'de var. Yeni font ekleme; mevcut DM Sans + JetBrains Mono yeterli. Eklenecekse self-host (font-display: swap) tercih et.

---

## 12. ESLint / Prettier / Build

### 12.1 Komutlar

```bash
cd admin-panel/frontend
npm run dev           # vite dev server, port 8082
npm run build         # /panel/ base ile production build → dist/
npm run preview       # build'i lokalde serve et
npm run lint          # eslint sadece check
npm run lint:fix      # eslint --fix + prettier --write
npm run format        # prettier --write
npm run format:check  # CI için
```

### 12.2 Kurallar

- **Yeni kod commit'lemeden önce `npm run lint:fix`** çalıştır.
- `eslint.config.js` flat config — global'e değişken eklemen gerekirse `globals` objesini güncelle.
- **`no-console`**: `warn`/`error` izinli, `log` değil.
- **`no-unused-vars`**: `_` ile başlayan arg'lar yok sayılır.
- **`vue/multi-word-component-names`** kapalı.
- **`vue/no-mutating-props`** sadece `LayoutSectionCard.vue` istisnası dışında **error**.

### 12.3 Prettier

- Print width 100, semi true, **double quotes** (`singleQuote: false`), trailing comma `es5`, tab width 2.
- `.prettierrc.json`'ı değiştirme.

---

## 13. Dosya Eklerken Karar Ağacı

```
Yeni özellik geliyor:
├── Yeni route mu? → src/router/index.js (lazy import + meta)
│   └── View dosyası: src/views/<section>/<X>View.vue
├── Birden fazla view'dan kullanılan ortak UI mı?
│   └── src/components/<section>/<X>.vue
├── Reusable stateful logic (DOM, timer, fetch wrapper)?
│   └── src/composables/[<domain>/]use<X>.js
├── Server state, cross-component shared?
│   └── src/stores/<domain>.js (setup store)
├── Pure helper / formatter / type guard?
│   └── src/utils/<x>.js (named export, no Vue import gerektirmesin)
├── Sabit liste / enum?
│   └── src/constants/<x>.js
├── Static seed/mock data?
│   └── src/data/<x>.js (sadece dev)
└── Yeni stil partial?
    └── src/assets/scss/<x>.scss + main.scss'e @use ekle
```

---

## 14. Yeni İşe Başlamadan Önce Yapılacaklar (Checklist)

1. [ ] §16'dan ilgili Vue docs sayfasını oku.
2. [ ] §11'deki SCSS token tablosunu kontrol et — yeni renk/transition gerekiyor mu?
3. [ ] `src/composables/`, `src/stores/`, `src/utils/`'i grep et — aynı işi yapan var mı?
4. [ ] `package.json`'a yeni dep eklemen gerekiyorsa **sor**.
5. [ ] Değiştireceğin dosyada lint hatası varsa önce onu düzelt.
6. [ ] Reaktivite seçimi: `ref` mi, `shallowRef` mi, `markRaw` mı? (§3.1 tablosu.)
7. [ ] Liste render: 100+ satır mı? `v-memo` veya virtualization gerekir mi?
8. [ ] API çağrısı: mevcut `api.*` metoduna sığıyor mu?
9. [ ] Güvenlik: `v-html`, dynamic href/style/component, redirect kullandın mı? (§9 tablosu.)
10. [ ] Stil yazıyorsan: Tailwind mı SCSS mi? (§11.6 tablosu.)
11. [ ] Bitirdikten sonra `npm run lint:fix && npm run build` lokalde temiz geçsin.

---

## 15. Hızlı Referans — En Sık Hatalar

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

---

## 16. Vue.js Docs Sidebar Rehberi — Tüm Bölümler

> **Kural:** Konuyla ilgili yeni kod yazmadan önce ilgili Vue docs sayfasını **mutlaka** oku. Aşağıdaki tabloda her sayfa için: konu özeti + projeden bir mini örnek + ne zaman okuyacağın. Tam doküman: <https://vuejs.org/guide/introduction.html>.

### 16.1 Getting Started

| Sayfa | Konu | Ne zaman |
|---|---|---|
| [Introduction](https://vuejs.org/guide/introduction.html) | Vue felsefesi, SFC, Composition vs Options API | Yeni başlıyorsa, 5 dk |
| [Quick Start](https://vuejs.org/guide/quick-start.html) | `create-vue`, Vite scaffolding | Bu projede zaten kuruldu — atla |

### 16.2 Essentials (Hepsi Zorunlu Okuma)

| Sayfa | Mini Örnek | Bu projede kullanım |
|---|---|---|
| [Creating an Application](https://vuejs.org/guide/essentials/application.html) | `createApp(App).use(pinia).use(router).mount("#app")` | `src/main.js` |
| [Template Syntax](https://vuejs.org/guide/essentials/template-syntax.html) | `{{ msg }}`, `:href="url"`, `@click="fn"`, `v-bind="$attrs"` | Her component'te |
| [Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html) | `const x = ref(0); x.value++;` — DOM otomatik güncellenir | Her store/composable. **§3.1** karar tablosu |
| [Computed Properties](https://vuejs.org/guide/essentials/computed.html) | `const fullName = computed(() => first.value + " " + last.value)` — cache'li | Türetilmiş değer her zaman computed; method değil. **§3.3** |
| [Class & Style Bindings](https://vuejs.org/guide/essentials/class-and-style.html) | `:class="{ active: isActive }"` `:style="{ color: brand }"` | Conditional UI state göstermede |
| [Conditional Rendering](https://vuejs.org/guide/essentials/conditional.html) | `v-if` (DOM'dan kaldırır) vs `v-show` (display:none) | Loading/error state'lerinde |
| [List Rendering](https://vuejs.org/guide/essentials/list.html) | `<li v-for="i in items" :key="i.name">` — **`:key` zorunlu** | Doctype listelerinde, tabloda |
| [Event Handling](https://vuejs.org/guide/essentials/event-handling.html) | `@click="fn"`, modifier'lar `.stop .prevent .self`, key `.enter` | Form submit, button click |
| [Form Input Bindings](https://vuejs.org/guide/essentials/forms.html) | `v-model` + `.lazy .number .trim` modifier'ları | Form view'ları (`ListingFormView.vue` vb.) |
| [Watchers](https://vuejs.org/guide/essentials/watchers.html) | `watch(source, cb, { deep, immediate, flush })` + `onWatcherCleanup` | Side-effect (fetch). **§3.4** |
| [Template Refs](https://vuejs.org/guide/essentials/template-refs.html) | `const inputRef = useTemplateRef("input")` (Vue 3.5+) | Input focus, ECharts container |
| [Components Basics](https://vuejs.org/guide/essentials/component-basics.html) | `defineProps`, `defineEmits`, slot, dynamic component | Yeni component yazarken |
| [Lifecycle Hooks](https://vuejs.org/guide/essentials/lifecycle.html) | `onMounted`, `onUnmounted`, `onBeforeUnmount` | Subscription kurma/temizleme |

**Mini örnek — Template Refs (Vue 3.5+):**
```vue
<script setup>
import { useTemplateRef, onMounted } from "vue";
const search = useTemplateRef("searchInput");
onMounted(() => search.value?.focus());
</script>
<template><input ref="searchInput" /></template>
```

### 16.3 Components In-Depth

| Sayfa | Mini Örnek / Notlar |
|---|---|
| [Registration](https://vuejs.org/guide/components/registration.html) | Bu projede **local** registration (`import` + template'te kullan). `app.component()` ile global tanım yok — yeni global ekleme. |
| [Props](https://vuejs.org/guide/components/props.html) | `defineProps({ id: { type: String, required: true, validator: v => v.length > 0 } })`. Object/Array default `() => ({})`. |
| [Events](https://vuejs.org/guide/components/events.html) | `const emit = defineEmits({ saved: (payload) => !!payload?.id })` — runtime validation. |
| [Component v-model](https://vuejs.org/guide/components/v-model.html) | **Vue 3.4+:** `const open = defineModel("open")` — props/emit boilerplate'i sıfırla. **§6.1** şablon. |
| [Fallthrough Attributes](https://vuejs.org/guide/components/attrs.html) | Root'a otomatik geçen `class`/`style`/event'ler. Çoklu root için `v-bind="$attrs"`. |
| [Slots](https://vuejs.org/guide/components/slots.html) | `<slot name="header" :item="item" />` + parent: `<template #header="{ item }">`. Tablo header'larında, modal layout'larda. |
| [Provide / inject](https://vuejs.org/guide/components/provide-inject.html) | Derin component ağacında prop drilling yerine. **Pinia genelde daha iyi** — ama theme/i18n gibi static context için OK. |
| [Async Components](https://vuejs.org/guide/components/async.html) | `defineAsyncComponent(() => import("./Heavy.vue"))` + Suspense. Modal/dialog için ideal. |

**Mini örnek — defineModel + Slots:**
```vue
<!-- Modal.vue -->
<script setup>
const open = defineModel("open", { type: Boolean, default: false });
</script>
<template>
  <div v-if="open" class="modal">
    <header><slot name="header">Başlık</slot></header>
    <slot />
    <footer><slot name="footer" :close="() => (open = false)" /></footer>
  </div>
</template>
```

### 16.4 Reusability

| Sayfa | Notlar |
|---|---|
| [Composables](https://vuejs.org/guide/reusability/composables.html) | **Bu projenin omurgası.** Her composable `useX` + plain object + ref döndürür. **§4** |
| [Custom Directives](https://vuejs.org/guide/reusability/custom-directives.html) | `v-focus`, `v-click-outside` gibi DOM-only davranış için. State logic'i composable'a koy. |
| [Plugins](https://vuejs.org/guide/reusability/plugins.html) | `app.use({ install(app) { ... } })`. ECharts global registration `src/plugins/echarts.js`'de. |

### 16.5 Built-in Components

| Sayfa | Mini Örnek | Bu projede |
|---|---|---|
| [Transition](https://vuejs.org/guide/built-ins/transition.html) | `<Transition name="fade"><div v-if="show" /></Transition>` + CSS `.fade-enter-active` | Modal, toast |
| [TransitionGroup](https://vuejs.org/guide/built-ins/transition-group.html) | `<TransitionGroup tag="ul" name="list">` — `v-for` listede animate | Toast queue, notification list |
| [KeepAlive](https://vuejs.org/guide/built-ins/keep-alive.html) | `<KeepAlive><component :is="view" /></KeepAlive>` — state korur | Tab geçişi olan form'larda |
| [Teleport](https://vuejs.org/guide/built-ins/teleport.html) | `<Teleport to="body"><Modal /></Teleport>` — z-index/overflow problemleri için | Dropdown, modal portal |
| [Suspense](https://vuejs.org/guide/built-ins/suspense.html) | `<Suspense><AsyncView /></Suspense>` + `#fallback` | Async setup'lı component'ler |

### 16.6 Scaling Up

| Sayfa | Bu projede karşılığı |
|---|---|
| [Single-File Components](https://vuejs.org/guide/scaling-up/sfc.html) | `<template>` + `<script setup>` + `<style scoped lang="scss">`. **§6.1** şablon. |
| [Tooling](https://vuejs.org/guide/scaling-up/tooling.html) | Vite + Volar (IDE). Bu repo'da Volar zaten önerili. |
| [Routing](https://vuejs.org/guide/scaling-up/routing.html) | Vue Router 4 — `src/router/index.js`. **§7**. |
| [State Management](https://vuejs.org/guide/scaling-up/state-management.html) | Pinia setup store — `src/stores/`. **§5**. |
| [Testing](https://vuejs.org/guide/scaling-up/testing.html) | **Bu projede test framework henüz yok.** Eklemeden önce sor (Vitest + @vue/test-utils önerisi). |
| [SSR](https://vuejs.org/guide/scaling-up/ssr.html) | Bu projede SSR yok (SPA + Frappe backend). Geçerli değil. |

### 16.7 Best Practices (Hepsi Zorunlu)

| Sayfa | Bu CLAUDE.md'deki karşılığı |
|---|---|
| [Production Deployment](https://vuejs.org/guide/best-practices/production-deployment.html) | `npm run build` + nginx (`Dockerfile` + `nginx.conf.template`). Source map yok — açma (token sızıntısı). |
| [Performance](https://vuejs.org/guide/best-practices/performance.html) | **§3.1, §6.3** — `shallowRef`, `markRaw`, `v-memo`, `v-once`, lazy route |
| [Accessibility](https://vuejs.org/guide/best-practices/accessibility.html) | `aria-*`, semantic HTML (`<button>` not `<div onclick>`), focus management, contrast |
| [Security](https://vuejs.org/guide/best-practices/security.html) | **§9** — v-html, URL/style injection, dynamic component, env var |

**Mini örnek — Accessibility:**
```vue
<!-- ❌ -->
<div @click="save" class="btn">Kaydet</div>

<!-- ✅ -->
<button type="button" @click="save" :disabled="loading" :aria-busy="loading">
  {{ loading ? "Kaydediliyor…" : "Kaydet" }}
</button>
```

### 16.8 TypeScript

> **Bu proje TypeScript kullanmıyor** (saf JS + ESLint). Yine de TS eklenirse:

| Sayfa | Notlar |
|---|---|
| [Overview](https://vuejs.org/guide/typescript/overview.html) | `vue-tsc` + Volar IDE. `vite.config.ts` migration. |
| [TS with Composition API](https://vuejs.org/guide/typescript/composition-api.html) | `defineProps<{ id: string }>()`, `ref<User \| null>(null)` |
| [TS with Options API](https://vuejs.org/guide/typescript/options-api.html) | Bu kalıp kullanılmıyor — Composition API ile devam. |

### 16.9 Extra Topics

| Sayfa | Ne zaman oku |
|---|---|
| [Ways of Using Vue](https://vuejs.org/guide/extras/ways-of-using-vue.html) | SPA, MPA, web component karşılaştırması — bilgi amaçlı |
| [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html) | "Neden Options yerine Composition?" sorusunu cevaplayan referans |
| [Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html) | Proxy nasıl çalışır, customRef, effectScope. Composable yazıyorsan zorunlu. |
| [Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html) | Virtual DOM, patch, compiler optimizations — performans tuning'de |
| [Render Functions & JSX](https://vuejs.org/guide/extras/render-function.html) | `h()` ile programmatic render. Bu projede gerekmiyor — template'e sadık kal. |
| [Vue and Web Components](https://vuejs.org/guide/extras/web-components.html) | Custom element export — bu projede yok |
| [Animation Techniques](https://vuejs.org/guide/extras/animation.html) | CSS transition + `<Transition>` + JS hooks. Toast/modal için. |

---

## 17. Pinia, Vue Router, Sass — Ek Referanslar

| Konu | Link | Bu projede |
|---|---|---|
| Pinia: Defining Store | <https://pinia.vuejs.org/core-concepts/> | Setup store deseni — **§5** |
| Pinia: storeToRefs | <https://pinia.vuejs.org/api/modules/pinia.html#storeToRefs> | Component'te state destructure |
| Pinia: Plugins | <https://pinia.vuejs.org/core-concepts/plugins.html> | Yok — eklemeden önce sor |
| Vue Router: Navigation Guards | <https://router.vuejs.org/guide/advanced/navigation-guards.html> | `beforeEach` `router/index.js:415` |
| Vue Router: Lazy Loading | <https://router.vuejs.org/guide/advanced/lazy-loading.html> | Tüm route'larda zaten uygulanmış |
| Sass: @use | <https://sass-lang.com/documentation/at-rules/use/> | `main.scss` ve scoped `<style>` |
| Sass: @forward | <https://sass-lang.com/documentation/at-rules/forward/> | Henüz yok — token re-export ihtiyacı doğarsa |
| Sass: Built-in Modules | <https://sass-lang.com/documentation/modules/> | `sass:color`, `sass:map`, `sass:math` — global fn yerine |
| Vite: Env Variables | <https://vite.dev/guide/env-and-mode.html> | `VITE_FRAPPE_BACKEND`, `VITE_STOREFRONT_URL` |
| Vite: Build Optimizations | <https://vite.dev/guide/build.html> | `vite.config.js` — manuel chunk yok, default OK |

---

## 18. Bu Dosyayı Güncelleme

Yeni bir kalıbı ekibe yaymak istiyorsan (yeni composable, yeni güvenlik öğesi, yeni performans tuzağı, yeni SCSS token) buraya bir madde ekle ve PR aç. CLAUDE.md, kod kadar canlı bir doküman olmalı; eski/yanlış olan silinmeli.

**Son güncelleme:** 2026-05-08 — proje stack'i Vue 3.5 + Vite 5.4 + Pinia 2.2 + Vue Router 4.4 + Sass `@use` (modern). Tailwind CDN'den, SCSS tasarım tokenları `variables.scss`'de.
