---
paths:
  - "**/*.vue"
---

# Vue.js docs sidebar — referans tabloları

> **Kural:** Konuyla ilgili yeni kod yazmadan önce ilgili Vue docs sayfasını oku. Tam doküman: <https://vuejs.org/guide/introduction.html>.

## 1. Essentials (hepsi zorunlu)

| Sayfa | Bu projede kullanım |
|---|---|
| [Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html) | Her store/composable. **`vue-reactivity.md` §1** karar tablosu |
| [Computed Properties](https://vuejs.org/guide/essentials/computed.html) | Türetilmiş değer her zaman computed; method değil. **`vue-reactivity.md` §3** |
| [Class & Style Bindings](https://vuejs.org/guide/essentials/class-and-style.html) | Conditional UI state |
| [Conditional Rendering](https://vuejs.org/guide/essentials/conditional.html) | `v-if` (DOM'dan kaldırır) vs `v-show` (display:none) |
| [List Rendering](https://vuejs.org/guide/essentials/list.html) | `<li v-for="i in items" :key="i.name">` — **`:key` zorunlu** |
| [Event Handling](https://vuejs.org/guide/essentials/event-handling.html) | modifier'lar `.stop .prevent .self`, key `.enter` |
| [Form Input Bindings](https://vuejs.org/guide/essentials/forms.html) | `v-model` + `.lazy .number .trim` (ListingFormView vb.) |
| [Watchers](https://vuejs.org/guide/essentials/watchers.html) | Side-effect (fetch). **`vue-reactivity.md` §4** |
| [Template Refs](https://vuejs.org/guide/essentials/template-refs.html) | `useTemplateRef("input")` (Vue 3.5+) |
| [Components Basics](https://vuejs.org/guide/essentials/component-basics.html) | `defineProps`, `defineEmits`, slot, dynamic |
| [Lifecycle Hooks](https://vuejs.org/guide/essentials/lifecycle.html) | `onMounted`, `onUnmounted`, `onBeforeUnmount` |

**Mini örnek — Template Refs (Vue 3.5+):**
```vue
<script setup>
import { useTemplateRef, onMounted } from "vue";
const search = useTemplateRef("searchInput");
onMounted(() => search.value?.focus());
</script>
<template><input ref="searchInput" /></template>
```

## 2. Components In-Depth

| Sayfa | Notlar |
|---|---|
| [Props](https://vuejs.org/guide/components/props.html) | `defineProps({ id: { type: String, required: true, validator: v => v.length > 0 } })`. Object/Array default `() => ({})` |
| [Events](https://vuejs.org/guide/components/events.html) | `defineEmits({ saved: (p) => !!p?.id })` — runtime validation |
| [Component v-model](https://vuejs.org/guide/components/v-model.html) | **Vue 3.4+:** `const open = defineModel("open")` — boilerplate sıfır |
| [Slots](https://vuejs.org/guide/components/slots.html) | `<slot name="header" :item="item" />` + `<template #header="{ item }">` |
| [Provide / inject](https://vuejs.org/guide/components/provide-inject.html) | Pinia genelde daha iyi; theme/i18n gibi static context için OK |
| [Async Components](https://vuejs.org/guide/components/async.html) | `defineAsyncComponent(() => import("./Heavy.vue"))` + Suspense |

**Mini örnek — defineModel + Slots:**
```vue
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

## 3. Reusability + Built-in

| Sayfa | Notlar |
|---|---|
| [Composables](https://vuejs.org/guide/reusability/composables.html) | Projenin omurgası. `useX` + plain object + ref. **`state-management.md`** |
| [Custom Directives](https://vuejs.org/guide/reusability/custom-directives.html) | `v-focus`, `v-click-outside` gibi DOM-only davranış için |
| [Plugins](https://vuejs.org/guide/reusability/plugins.html) | `app.use(...)`. ECharts global registration `src/plugins/echarts.js` |
| [Transition](https://vuejs.org/guide/built-ins/transition.html) | Modal, toast |
| [TransitionGroup](https://vuejs.org/guide/built-ins/transition-group.html) | Toast queue, notification list |
| [KeepAlive](https://vuejs.org/guide/built-ins/keep-alive.html) | Tab geçişi olan form'larda state korur |
| [Teleport](https://vuejs.org/guide/built-ins/teleport.html) | Dropdown, modal portal — z-index/overflow için |
| [Suspense](https://vuejs.org/guide/built-ins/suspense.html) | Async setup'lı component'ler |

## 4. Best practices (hepsi zorunlu)

| Sayfa | Karşılık |
|---|---|
| [Production Deployment](https://vuejs.org/guide/best-practices/production-deployment.html) | `npm run build` + nginx. Source map yok |
| [Performance](https://vuejs.org/guide/best-practices/performance.html) | `vue-reactivity.md` §1, `components-router.md` §3 |
| [Accessibility](https://vuejs.org/guide/best-practices/accessibility.html) | `aria-*`, semantic HTML, focus management |
| [Security](https://vuejs.org/guide/best-practices/security.html) | `api-security.md` §3 |

**Mini örnek — Accessibility:**
```vue
<!-- ❌ -->
<div @click="save" class="btn">Kaydet</div>

<!-- ✅ -->
<button type="button" @click="save" :disabled="loading" :aria-busy="loading">
  {{ loading ? "Kaydediliyor…" : "Kaydet" }}
</button>
```

## 5. Pinia + Vue Router + Sass ek referanslar

| Konu | Link |
|---|---|
| Pinia: Defining Store | <https://pinia.vuejs.org/core-concepts/> |
| Pinia: storeToRefs | <https://pinia.vuejs.org/api/modules/pinia.html#storeToRefs> |
| Vue Router: Navigation Guards | <https://router.vuejs.org/guide/advanced/navigation-guards.html> |
| Vue Router: Lazy Loading | <https://router.vuejs.org/guide/advanced/lazy-loading.html> |
| Sass: @use | <https://sass-lang.com/documentation/at-rules/use/> |
| Sass: Built-in Modules | <https://sass-lang.com/documentation/modules/> |
| Vite: Env Variables | <https://vite.dev/guide/env-and-mode.html> |
| Vite: Build Optimizations | <https://vite.dev/guide/build.html> |

## 6. Extra topics (ihtiyaç halinde)

| Sayfa | Ne zaman |
|---|---|
| [Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html) | Composable yazıyorsan zorunlu — Proxy, customRef, effectScope |
| [Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html) | Virtual DOM, compiler optimizations — performans tuning |
| [Animation Techniques](https://vuejs.org/guide/extras/animation.html) | Toast/modal için |

> **Bu proje TypeScript kullanmıyor** (saf JS + ESLint). TS eklenirse `vue-tsc` + `defineProps<{ id: string }>()` pattern'leri devreye girer — eklemeden önce sor.
