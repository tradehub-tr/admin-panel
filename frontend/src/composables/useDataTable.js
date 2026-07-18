import { ref, reactive, computed } from "vue";

/**
 * useDataTable — şema-tabanlı enterprise tablo ViewModel'i.
 *
 * Demo'daki Service/Repository/ViewModel katmanlarının Vue karşılığı: filtre +
 * sıralama + sütun görünürlüğü state'ini tek yerde tutar; render'dan bağımsızdır
 * (table / grid / list / kanban hepsi aynı state'i paylaşır). Server-side çalışır:
 * çağıran view bu state'ten backend parametrelerini türetip yeniden fetch eder.
 *
 * `fields` her elemanı:
 *   { key, label, type?, align?, sortable?, hideable?, column?,
 *     filter?: { variant: "text"|"select"|"range"|"date", options?: [{value,label}] } }
 *   - `column: false` → tabloda sütun olarak çizilmez ama filtre olarak görünür
 *     (örn. Kaynak: feed/manuel).
 *
 * Filtre değer şekilleri: text → string, select → string[], range → {min,max},
 * date → {from,to}.
 */
export function useDataTable(fields, options = {}) {
  const search = ref("");
  const filters = reactive({});
  const sorting = ref(options.defaultSort ? options.defaultSort.map((s) => ({ ...s })) : []);
  const page = ref(1);
  const pageSize = ref(options.pageSize || 20);
  // defaultHidden alanları başlangıçta gizli (örn. tarih sütunları); kullanıcı
  // "Sütunlar" panelinden açabilir.
  const hidden = reactive(
    Object.fromEntries(fields.filter((f) => f.defaultHidden).map((f) => [f.key, true]))
  );

  const filterFields = computed(() => fields.filter((f) => f.filter));
  const columns = computed(() => fields.filter((f) => f.column !== false));
  const visibleColumns = computed(() => columns.value.filter((c) => !hidden[c.key]));
  const sortableFields = computed(() => fields.filter((f) => f.sortable));

  function isFilterActive(field, value) {
    if (value == null) return false;
    const variant = field.filter?.variant;
    if (variant === "text") return String(value).trim() !== "";
    if (variant === "select") return Array.isArray(value) && value.length > 0;
    if (variant === "range") return value.min != null || value.max != null;
    if (variant === "date") return Boolean(value.from || value.to);
    return false;
  }

  const activeFilterCount = computed(
    () => filterFields.value.filter((f) => isFilterActive(f, filters[f.key])).length
  );

  function setFilter(key, value) {
    if (value === undefined) delete filters[key];
    else filters[key] = value;
    page.value = 1;
  }

  function clearAll() {
    Object.keys(filters).forEach((k) => delete filters[k]);
    search.value = "";
    page.value = 1;
  }

  // Setter'lar — child bileşenler prop'u doğrudan mutate etmek yerine bunları
  // çağırır (vue/no-mutating-props). Controller deseni: state burada değişir.
  function setSearch(value) {
    search.value = value;
    page.value = 1;
  }
  function setPage(value) {
    page.value = value;
  }
  function setPageSize(value) {
    pageSize.value = value;
    page.value = 1;
  }
  function setSort(value) {
    sorting.value = value;
  }

  function toggleColumn(key) {
    hidden[key] = !hidden[key];
  }

  // Sıralama: normal tık tek sütun (none→asc→desc→none); additive (Shift) çoklu.
  function toggleSort(key, additive = false) {
    const existing = sorting.value.find((s) => s.field === key);
    if (!additive) {
      if (!existing) sorting.value = [{ field: key, desc: false }];
      else if (!existing.desc) sorting.value = [{ field: key, desc: true }];
      else sorting.value = [];
      return;
    }
    if (!existing) sorting.value = [...sorting.value, { field: key, desc: false }];
    else if (!existing.desc)
      sorting.value = sorting.value.map((s) => (s.field === key ? { ...s, desc: true } : s));
    else sorting.value = sorting.value.filter((s) => s.field !== key);
  }

  function sortStateFor(key) {
    const idx = sorting.value.findIndex((s) => s.field === key);
    return idx < 0 ? null : { ...sorting.value[idx], index: idx };
  }

  function chipLabel(field, value) {
    const variant = field.filter?.variant;
    if (variant === "text") return `${field.label}: "${value}"`;
    if (variant === "select") {
      const opts = field.filter.options || [];
      const labels = value.map((v) => opts.find((o) => o.value === v)?.label ?? v);
      return `${field.label}: ${labels.join(", ")}`;
    }
    if (variant === "range") {
      return `${field.label}: ${value.min ?? "…"} – ${value.max ?? "…"}`;
    }
    return `${field.label}: ${value.from || "…"} → ${value.to || "…"}`;
  }

  const chips = computed(() => {
    const out = [];
    if (search.value.trim())
      out.push({
        key: "__search",
        label: `Arama: "${search.value}"`,
        clear: () => (search.value = ""),
      });
    for (const f of filterFields.value) {
      const v = filters[f.key];
      if (isFilterActive(f, v))
        out.push({ key: f.key, label: chipLabel(f, v), clear: () => setFilter(f.key, undefined) });
    }
    return out;
  });

  return {
    // state
    search,
    filters,
    sorting,
    page,
    pageSize,
    hidden,
    // derived
    filterFields,
    columns,
    visibleColumns,
    sortableFields,
    activeFilterCount,
    chips,
    // helpers
    isFilterActive,
    setFilter,
    clearAll,
    toggleColumn,
    toggleSort,
    sortStateFor,
    setSearch,
    setPage,
    setPageSize,
    setSort,
  };
}
