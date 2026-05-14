---
paths:
  - "src/composables/**/*.js"
  - "src/stores/**/*.js"
  - "**/*.vue"
---

# Composable'lar + Pinia store'lar

## 1. Composable kuralları (`src/composables/`)

1. **Naming:** Her zaman `useX` (`useToast`, `useBreakpoint`, `useChart`).
2. **Konum:** Genel ise `src/composables/`, domain'e özelse `src/composables/<domain>/` (örn: `composables/dashboard/useChart.js`).
3. **Dönüş:** Plain object içinde **ref'ler** döndür — `return { x, y }`. `reactive({...})` döndürme; destructure reaktiviteyi bozar.
4. **Lifecycle:** `onMounted`/`onUnmounted` composable içinden çalışır; cleanup'ı (event listener, interval, AbortController) **mutlaka** `onUnmounted` veya `onScopeDispose` içinde yap. `useBreakpoint.js` kanonik örnek.
5. **Reactive input:** Composable bir kaynak alıyorsa `Ref<T> | () => T | T` kabul edip içeride `toValue()` ile normalize et.
6. **Shared state:** Modul-level `ref` (örn: `useToast.js`'teki `toasts`) — global toast queue gibi case'ler için OK. Genel kural: shared state istemiyorsan tüm `ref`'leri **fonksiyon içinde** yarat.

### Composable şablonu

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

## 2. Pinia store kuralları (`src/stores/`)

Bu projede **setup store** deseni kullanılır (`stores/auth.js` referans).

### Store şablonu

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

### Store kuralları

- **Tüm state'i return et** (Pinia private state desteklemez).
- **Try/catch + finally:** Loading state'ini her zaman `finally`'de kapat. Hata mesajını **Türkçe** ve kullanıcıya gösterilebilir formda `error.value`'ya yaz.
- **Side-effect'leri action'larda topla**, component'te değil.
- **Cross-store erişim:** Action içinden `useOtherStore()` çağır — `defineStore` body'sinin top-level'ında değil.
- **Frappe doctype erişimi** için her zaman `api.getList / getDoc / createDoc / updateDoc / deleteDoc / callMethod` kullan.
- **Permission-aware count:** CRM doctype'ları için `api.getCount()` zaten override eder — listeyi (`utils/api.js:218` `CRM_DOCTYPES`) genişletmek gerekirse oradan ekle.
