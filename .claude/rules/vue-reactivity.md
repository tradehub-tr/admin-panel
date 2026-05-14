---
paths:
  - "**/*.vue"
  - "**/*.js"
---

# Vue 3.5 reaktivite — doğru aracı seçmek

Zorunlu okumalar (her oturumda en az 1 kez):
- <https://vuejs.org/guide/essentials/reactivity-fundamentals.html>
- <https://vuejs.org/guide/essentials/computed.html>
- <https://vuejs.org/guide/essentials/watchers.html>
- <https://vuejs.org/guide/extras/reactivity-in-depth.html>

## 1. `ref` / `reactive` / `shallowRef` / `shallowReactive` — karar tablosu

| Veri tipi | Kullan | Neden |
|---|---|---|
| Primitive (string, number, boolean) | `ref()` | Tek seçenek; `.value` ile erişilir, template'te otomatik unwrap. |
| Küçük plain object/array | `ref()` veya `reactive()` | `ref()` daha tutarlı; `reactive()` destructure problemli. |
| Büyük liste / payload (>~100 item) | `shallowRef([...])` | Her elemana Proxy sarılmaz; mutate ettiğinde `array.value = [...array.value, x]` ile yeni referans ata. |
| Form state (nested, derin watch lazım) | `reactive({...})` veya `ref({...})` | İkisi de iş görür; ekipte `ref` tercih ediliyor. |
| 3. parti instance (ECharts, Map, WebSocket) | `markRaw()` ile sar veya `shallowRef()` içine koy | Proxy bu kütüphaneleri bozar/yavaşlatır. |
| Hesaplanmış değer | `computed()` | Cache'lenir. Asla `methods` ile hesaplama yapıp template'ten çağırma. |
| Side-effect (API çağrısı, log, DOM) | `watch` / `watchEffect` / event handler | Computed **değil**. |

## 2. computed vs methods vs watch

```
Türetilmiş bir değer mi gösterilecek?
├── Evet → computed()    (cache'li, dependency-tracked, pure)
└── Hayır
    └── Bir şeyin yan etkisi mi var?
        ├── Belirli kaynak değiştiğinde → watch(source, cb)
        ├── Otomatik bağımlılık takibi isteniyor → watchEffect(cb)
        └── Kullanıcı etkileşimi → @click / @input handler (method)
```

**Kritik kural:** `methods` veya basit `function` template'te kullanılırsa **her render'da yeniden çalışır**. `{{ formatPrice(item) }}` 1000 satırlık listede 1000× tetiklenir. Listeyi `computed` ile `formattedItems`'a çevir, `{{ row.priceLabel }}` ile göster.

## 3. computed — doğru/yanlış

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

## 4. watch / watchEffect

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

`watchEffect` bağımlılığı **otomatik** çıkarır. Karmaşık akışta `watch` daha öngörülebilir.

## 5. Destructure ve reaktivite

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
