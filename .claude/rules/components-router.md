---
paths:
  - "src/components/**/*.vue"
  - "src/views/**/*.vue"
  - "src/router/**/*.js"
  - "**/*.vue"
---

# Component'ler + Vue Router

## 1. Component yapısı

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

## 2. Component kuralları

- **Her zaman `<script setup>`** — `setup()` sadece çok özel entegrasyon gerektiyse.
- **Two-way binding için `defineModel()`** (Vue 3.4+). Yeni kodda `props.modelValue` + `emit('update:modelValue')` yazma.
- **Props mutate etme** — `eslint.config.js`'te `LayoutSectionCard.vue` istisnası var (ödenecek borç). Yeni component'lerde `emit('update:...')` ile parent'a haber ver.
- **Async component lazy load:** Route component'leri zaten `() => import(...)` ile lazy. Modal/dialog için `defineAsyncComponent`.
- **Tek köklü olma zorunluluğu yok** (Vue 3) — gereksiz `<div>` wrapper açma.
- **Stiller — karma kullanım:**
  - **Layout / spacing / utility:** Tailwind class'ları (`flex items-center gap-3 px-4 py-2`)
  - **Marka rengi / brand transition / dark mode / panel pattern:** SCSS variable + mixin (`background: $brand; transition: $t-spring; @include dark { ... }`)
  - **Component'e özel one-off stil:** `<style scoped lang="scss">` içinde, her zaman `@use "@/assets/scss/variables" as *;` ile başla.

## 3. Performans — büyük liste & render

- **`v-memo`:** >200 satır listede `v-memo="[item.id, item.status]"` ile re-render atla.
- **`v-once`:** Tamamen statik blok için.
- **Stabil prop'lar:** `<Row :active="row.id === activeId" />`, `<Row :active-id="activeId" />`'den **kat kat** daha hızlı.
- **Liste binlerce satırsa** virtualization kullan — yeni dep eklemeden önce sor.
- **ECharts/Chart.js instance'ları:** `composables/dashboard/useChart.js`'i kullan; instance'ı `shallowRef` veya `markRaw` içinde tut.
- **Computed ile filtreleme:** Server-side pagination/filtreleme **default**. Client-side filtre 50 satırın üstüne çıkmasın.

## 4. Vue Router (`src/router/index.js`)

- **Tüm view'lar lazy** — `() => import("@/views/...")`. Statik import yapma.
- **`meta.requiresAuth`, `meta.guest`, `meta.requiresSuperAdmin`** — `beforeEach` guard'ı (`router/index.js:415`) işliyor; doğru meta'yı set et.
- **`meta.title`, `meta.breadcrumb`, `meta.section`** — sidebar/breadcrumb için zorunlu. Section değerleri: `dashboard | orders | catalog | products | commerce | store | system | messaging | crm | helpdesk | management`.
- **Race condition:** View içinde `route.params` izleyerek fetch yapıyorsan `watch` + `onWatcherCleanup` ile AbortController bağla.
