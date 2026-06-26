<script setup>
  import { ref, computed, onMounted, nextTick, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { CONTENT_LANGS } from "@/composables/useLangFields";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const toast = useToast();

  // Görünüm modu (tablo/grid/kanban/liste) — localStorage'da kalıcı.
  const { viewMode } = useListViewMode("category-translations", "table");

  // Sayfa-içi onboarding: filtreler → satır-içi grid → sıradaki eksik.
  usePageTour("category-translations", () => [
    {
      target: '[data-tour="ctr-filters"]',
      title: t("tourSteps.page.ctrFilters_t"),
      desc: t("tourSteps.page.ctrFilters_d"),
    },
    {
      target: '[data-tour="ctr-grid"]',
      title: t("tourSteps.page.ctrGrid_t"),
      desc: t("tourSteps.page.ctrGrid_d"),
    },
    {
      target: '[data-tour="ctr-jump"]',
      title: t("tourSteps.page.ctrJump_t"),
      desc: t("tourSteps.page.ctrJump_d"),
    },
  ]);

  const loading = ref(false);
  const rows = ref([]);
  const filterMode = ref("missing"); // all | missing | stale
  const missingLang = ref(""); // "" = herhangi; ya da bir dil kodu

  const emptyNames = () => ({ tr: "", en: "", ar: "", ru: "" });
  const emptyFlags = () => ({ tr: false, en: false, ar: false, ru: false });

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.category.get_category_translations");
      const data = res?.message || [];
      rows.value = data.map((c) => {
        const names = emptyNames();
        for (const lng of CONTENT_LANGS) names[lng] = c[`category_name_${lng}`] || "";
        const dl = c.content_default_lang || "tr";
        if (!names[dl]) names[dl] = c.category_name || "";
        return {
          name: c.name,
          dl,
          names,
          srcInitial: names[dl],
          reviewed: emptyFlags(),
          saving: false,
        };
      });
    } catch (e) {
      toast.error(e.message || t("categoryTranslations.loadFailed"));
    } finally {
      loading.value = false;
      currentPage.value = 1;
    }
  }
  onMounted(load);

  // ── Tamamlanmışlık / bayatlama yardımcıları ───────────────
  const filledCount = (row) => CONTENT_LANGS.filter((l) => (row.names[l] || "").trim()).length;

  function badgeClass(row) {
    const n = filledCount(row);
    if (n >= CONTENT_LANGS.length)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (n <= 1) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }

  // Liste/kanban satır-içi düzenlenebilir input border+zemin rengi: kaynak/dolu/eksik/bayat.
  function langInputClass(row, lng) {
    if (isStale(row, lng))
      return "border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-900/10";
    if (lng !== row.dl && !(row.names[lng] || "").trim())
      return "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10";
    if (lng === row.dl)
      return "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10";
    return "border-gray-200 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#16161f]";
  }

  // Kaynak (varsayılan dil) yüklemeden beri değiştiyse, gözden geçirilmemiş dolu diller bayat.
  function isStale(row, lng) {
    if (lng === row.dl || !(row.names[lng] || "").trim()) return false;
    return (row.names[row.dl] || "").trim() !== (row.srcInitial || "").trim() && !row.reviewed[lng];
  }
  const rowHasStale = (row) => CONTENT_LANGS.some((l) => isStale(row, l));

  const stats = computed(() => {
    const total = rows.value.length;
    const complete = rows.value.filter((r) => filledCount(r) >= CONTENT_LANGS.length).length;
    const stale = rows.value.filter(rowHasStale).length;
    return { total, complete, incomplete: total - complete, stale };
  });

  const filteredRows = computed(() =>
    rows.value.filter((row) => {
      if (missingLang.value && (row.names[missingLang.value] || "").trim()) return false;
      if (filterMode.value === "missing") return filledCount(row) < CONTENT_LANGS.length;
      if (filterMode.value === "stale") return rowHasStale(row);
      return true;
    })
  );

  // ── Sayfalama (client-side; /app/Listing gibi) ───────────
  const PAGE_SIZES = [25, 50, 100, 0]; // 0 = Tümü
  const pageSize = ref(50);
  const currentPage = ref(1);
  const effectivePageSize = computed(() =>
    pageSize.value > 0 ? pageSize.value : Math.max(1, filteredRows.value.length)
  );
  const pagedRows = computed(() => {
    if (pageSize.value === 0) return filteredRows.value;
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredRows.value.slice(start, start + pageSize.value);
  });
  // Filtre veya sayfa boyutu değişince ilk sayfaya dön.
  watch([filterMode, missingLang, pageSize], () => {
    currentPage.value = 1;
  });

  // ── Kanban: tamamlanmışlık durumuna göre grupla ───────────
  const STATUS_META = {
    incomplete: { color: "#ef4444", labelKey: "categoryTranslations.filter_missing" },
    stale: { color: "#f59e0b", labelKey: "categoryTranslations.filter_stale" },
    complete: { color: "#10b981", labelKey: "categoryTranslations.statusComplete" },
  };
  function rowStatus(row) {
    if (rowHasStale(row)) return "stale";
    if (filledCount(row) >= CONTENT_LANGS.length) return "complete";
    return "incomplete";
  }
  const kanbanColumns = computed(() => {
    const groups = { incomplete: [], stale: [], complete: [] };
    for (const row of pagedRows.value) groups[rowStatus(row)].push(row);
    return Object.keys(groups).map((k) => ({
      key: k,
      label: t(STATUS_META[k].labelKey),
      color: STATUS_META[k].color,
      items: groups[k],
    }));
  });

  // ── Düzenleme / kayıt ─────────────────────────────────────
  function onCellChange(row, lng) {
    if (lng !== row.dl) row.reviewed[lng] = true;
    saveRow(row);
  }

  function copyFromSource(row, lng) {
    row.names[lng] = row.names[row.dl];
    row.reviewed[lng] = true;
    saveRow(row);
  }

  async function saveRow(row) {
    row.saving = true;
    try {
      const translations = { content_default_lang: row.dl };
      for (const lng of CONTENT_LANGS)
        translations[`category_name_${lng}`] = (row.names[lng] || "").trim();
      await api.callMethod("tradehub_core.api.category.update_category", {
        name: row.name,
        category_name: (row.names[row.dl] || "").trim(),
        translations: JSON.stringify(translations),
      });
    } catch (e) {
      toast.error(e.message || t("categoryTranslations.saveFailed"));
    } finally {
      row.saving = false;
    }
  }

  // ── Sıradaki eksiğe atla ──────────────────────────────────
  const rowEls = ref({});
  function setRowEl(name, el) {
    if (el) rowEls.value[name] = el;
  }
  function jumpToNextMissing() {
    const idx = filteredRows.value.findIndex((r) => filledCount(r) < CONTENT_LANGS.length);
    if (idx < 0) return;
    // Eksik kayıt başka sayfadaysa önce o sayfaya geç.
    if (pageSize.value > 0) currentPage.value = Math.floor(idx / pageSize.value) + 1;
    const next = filteredRows.value[idx];
    nextTick(() => {
      const el = rowEls.value[next.name];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstEmpty = el.querySelector("input[data-empty='1']");
      firstEmpty?.focus();
    });
  }
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("categoryTranslations.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t("categoryTranslations.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="load">
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("categoryTranslations.refresh") }}
        </button>
      </div>
    </div>

    <!-- Filtre + özet -->
    <div class="flex flex-wrap items-center gap-2 mb-3" data-tour="ctr-filters">
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{
          t("categoryTranslations.summary", {
            total: stats.total,
            complete: stats.complete,
            incomplete: stats.incomplete,
          })
        }}
      </span>
      <span class="flex-1"></span>
      <div class="inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
        <button
          v-for="m in ['all', 'missing', 'stale']"
          :key="m"
          type="button"
          class="px-3 py-1 text-xs font-medium rounded transition-colors"
          :class="
            filterMode === m
              ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          "
          @click="filterMode = m"
        >
          {{ t("categoryTranslations.filter_" + m) }}
        </button>
      </div>
      <select
        v-model="missingLang"
        class="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
      >
        <option value="">{{ t("categoryTranslations.missingLangAny") }}</option>
        <option v-for="lng in CONTENT_LANGS" :key="lng" :value="lng">
          {{ t("categoryTranslations.missingLangOne", { lang: lng.toUpperCase() }) }}
        </option>
      </select>
      <!-- Sayfa boyutu (listeleme seçeneği) -->
      <select
        v-model.number="pageSize"
        class="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
        :title="t('categoryTranslations.pageShow')"
      >
        <option v-for="ps in PAGE_SIZES" :key="ps" :value="ps">
          {{
            ps === 0
              ? t("categoryTranslations.pageAll")
              : t("categoryTranslations.perPage", { n: ps })
          }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
    </div>

    <!-- Empty -->
    <div v-else-if="filteredRows.length === 0" class="card text-center py-12">
      <AppIcon name="check-check" :size="32" class="text-green-400 mx-auto mb-3" />
      <p class="text-sm text-gray-400">{{ t("categoryTranslations.emptyState") }}</p>
    </div>

    <!-- Tablo (geniş, satır-içi düzenlenebilir) -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0" data-tour="ctr-grid">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
              <th
                class="text-left text-[11px] font-semibold text-gray-500 px-3 py-2.5 min-w-[160px]"
              >
                {{ t("categoryTranslations.colCategory") }}
              </th>
              <th
                v-for="lng in CONTENT_LANGS"
                :key="lng"
                class="text-left text-[11px] font-semibold px-3 py-2.5 min-w-[180px]"
                :class="lng === 'tr' ? 'text-violet-600 dark:text-violet-300' : 'text-gray-500'"
              >
                {{ lng.toUpperCase() }}
              </th>
              <th class="text-center text-[11px] font-semibold text-gray-500 px-3 py-2.5 w-16">
                {{ t("categoryTranslations.colStatus") }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
            <tr
              v-for="row in pagedRows"
              :key="row.name"
              :ref="(el) => setRowEl(row.name, el)"
              class="hover:bg-gray-50/60 dark:hover:bg-[#1e1e2a] transition-colors"
            >
              <!-- Kategori etiketi (kaynak ad) -->
              <td class="px-3 py-1.5">
                <div
                  class="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  <AppIcon name="folder" :size="13" class="text-violet-400 flex-shrink-0" />
                  <span class="truncate">{{ row.names[row.dl] || row.name }}</span>
                  <AppIcon
                    v-if="row.saving"
                    name="loader"
                    :size="11"
                    class="animate-spin text-gray-400 flex-shrink-0"
                  />
                </div>
              </td>
              <!-- Dil hücreleri -->
              <td
                v-for="lng in CONTENT_LANGS"
                :key="lng"
                class="px-2 py-1.5 align-top"
                :class="{
                  'bg-violet-50/60 dark:bg-violet-900/10': lng === row.dl,
                  'bg-red-50/50 dark:bg-red-900/10':
                    lng !== row.dl && !(row.names[lng] || '').trim(),
                  'bg-amber-50/60 dark:bg-amber-900/10': isStale(row, lng),
                }"
              >
                <div class="flex items-center gap-1">
                  <input
                    v-model="row.names[lng]"
                    :data-empty="(row.names[lng] || '').trim() ? '0' : '1'"
                    class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs hover:border-gray-200 dark:hover:border-gray-600 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                    :dir="lng === 'ar' ? 'rtl' : 'ltr'"
                    :placeholder="lng === row.dl ? '' : t('categoryTranslations.emptyCell')"
                    @change="onCellChange(row, lng)"
                  />
                  <button
                    v-if="
                      lng !== row.dl &&
                      !(row.names[lng] || '').trim() &&
                      (row.names[row.dl] || '').trim()
                    "
                    type="button"
                    class="shrink-0 text-[10px] text-blue-600 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                    :title="t('categoryManagement.copyFromSource')"
                    @click="copyFromSource(row, lng)"
                  >
                    <AppIcon name="copy" :size="11" />
                  </button>
                </div>
                <div
                  v-if="isStale(row, lng)"
                  class="mt-0.5 ml-1 flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                >
                  <AppIcon name="triangle-alert" :size="10" />
                  {{ t("categoryManagement.sourceChangedReview") }}
                </div>
              </td>
              <!-- Durum -->
              <td class="px-3 py-1.5 text-center">
                <span
                  class="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                  :class="badgeClass(row)"
                >
                  {{ filledCount(row) }}/{{ CONTENT_LANGS.length }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Grid (kart başına bir kategori, satır-içi düzenlenebilir) -->
    <div v-else-if="viewMode === 'grid'" class="list-grid" data-tour="ctr-grid">
      <div
        v-for="row in pagedRows"
        :key="row.name"
        :ref="(el) => setRowEl(row.name, el)"
        class="list-grid-card"
      >
        <div class="flex items-center gap-1.5 mb-3">
          <AppIcon name="folder" :size="14" class="text-violet-400 flex-shrink-0" />
          <span class="list-grid-card-title flex-1 truncate">{{
            row.names[row.dl] || row.name
          }}</span>
          <AppIcon
            v-if="row.saving"
            name="loader"
            :size="12"
            class="animate-spin text-gray-400 flex-shrink-0"
          />
          <span
            class="text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
            :class="badgeClass(row)"
          >
            {{ filledCount(row) }}/{{ CONTENT_LANGS.length }}
          </span>
        </div>
        <div class="space-y-2">
          <div v-for="lng in CONTENT_LANGS" :key="lng">
            <label
              class="block text-[10px] font-bold uppercase mb-0.5"
              :class="lng === row.dl ? 'text-violet-600 dark:text-violet-300' : 'text-gray-400'"
            >
              {{ lng }}
            </label>
            <div class="flex items-center gap-1">
              <input
                v-model="row.names[lng]"
                :data-empty="(row.names[lng] || '').trim() ? '0' : '1'"
                class="w-full bg-gray-50 dark:bg-[#16161f] border border-gray-200 dark:border-[#2a2a35] rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                :dir="lng === 'ar' ? 'rtl' : 'ltr'"
                :placeholder="lng === row.dl ? '' : t('categoryTranslations.emptyCell')"
                @change="onCellChange(row, lng)"
              />
              <button
                v-if="
                  lng !== row.dl &&
                  !(row.names[lng] || '').trim() &&
                  (row.names[row.dl] || '').trim()
                "
                type="button"
                class="shrink-0 text-[10px] text-blue-600 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                :title="t('categoryManagement.copyFromSource')"
                @click="copyFromSource(row, lng)"
              >
                <AppIcon name="copy" :size="11" />
              </button>
            </div>
            <div
              v-if="isStale(row, lng)"
              class="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            >
              <AppIcon name="triangle-alert" :size="10" />
              {{ t("categoryManagement.sourceChangedReview") }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Liste (kompakt, satır-içi düzenlenebilir) -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden" data-tour="ctr-grid">
      <div
        v-for="row in pagedRows"
        :key="row.name"
        :ref="(el) => setRowEl(row.name, el)"
        class="list-compact-item !cursor-default flex-wrap"
      >
        <div
          class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center"
        >
          <AppIcon name="folder" :size="14" class="text-violet-400" />
        </div>
        <span class="list-compact-name !flex-none min-w-0 max-w-[180px] truncate">{{
          row.names[row.dl] || row.name
        }}</span>
        <div class="flex flex-1 items-center gap-2 min-w-0">
          <div
            v-for="lng in CONTENT_LANGS"
            :key="lng"
            class="flex items-center gap-1 flex-1 min-w-0"
          >
            <span
              class="text-[9px] font-bold uppercase w-4 flex-shrink-0"
              :class="lng === row.dl ? 'text-violet-500 dark:text-violet-300' : 'text-gray-400'"
              >{{ lng }}</span
            >
            <input
              v-model="row.names[lng]"
              :data-empty="(row.names[lng] || '').trim() ? '0' : '1'"
              class="w-full min-w-0 border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
              :class="langInputClass(row, lng)"
              :dir="lng === 'ar' ? 'rtl' : 'ltr'"
              :placeholder="lng === row.dl ? '' : t('categoryTranslations.emptyCell')"
              @change="onCellChange(row, lng)"
            />
          </div>
        </div>
        <AppIcon
          v-if="row.saving"
          name="loader"
          :size="12"
          class="animate-spin text-gray-400 flex-shrink-0"
        />
        <span
          class="text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
          :class="badgeClass(row)"
        >
          {{ filledCount(row) }}/{{ CONTENT_LANGS.length }}
        </span>
      </div>
    </div>

    <!-- Kanban (tamamlanmışlık durumuna göre) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban" data-tour="ctr-grid">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :style="{ borderColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div
            v-for="row in col.items"
            :key="row.name"
            :ref="(el) => setRowEl(row.name, el)"
            class="kanban-card !cursor-default"
          >
            <div class="flex items-center gap-1.5 mb-2">
              <AppIcon name="folder" :size="13" class="text-violet-400 flex-shrink-0" />
              <span class="kanban-card-title flex-1 truncate">{{
                row.names[row.dl] || row.name
              }}</span>
              <AppIcon
                v-if="row.saving"
                name="loader"
                :size="11"
                class="animate-spin text-gray-400 flex-shrink-0"
              />
              <span
                class="text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
                :class="badgeClass(row)"
              >
                {{ filledCount(row) }}/{{ CONTENT_LANGS.length }}
              </span>
            </div>
            <div class="space-y-1.5">
              <div v-for="lng in CONTENT_LANGS" :key="lng" class="flex items-center gap-1.5">
                <span
                  class="text-[9px] font-bold uppercase w-5 flex-shrink-0"
                  :class="lng === row.dl ? 'text-violet-500 dark:text-violet-300' : 'text-gray-400'"
                  >{{ lng }}</span
                >
                <input
                  v-model="row.names[lng]"
                  :data-empty="(row.names[lng] || '').trim() ? '0' : '1'"
                  class="flex-1 min-w-0 border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                  :class="langInputClass(row, lng)"
                  :dir="lng === 'ar' ? 'rtl' : 'ltr'"
                  :placeholder="lng === row.dl ? '' : t('categoryTranslations.emptyCell')"
                  @change="onCellChange(row, lng)"
                />
                <button
                  v-if="
                    lng !== row.dl &&
                    !(row.names[lng] || '').trim() &&
                    (row.names[row.dl] || '').trim()
                  "
                  type="button"
                  class="shrink-0 text-[10px] text-blue-600 border border-gray-200 dark:border-gray-600 rounded px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                  :title="t('categoryManagement.copyFromSource')"
                  @click="copyFromSource(row, lng)"
                >
                  <AppIcon name="copy" :size="10" />
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            {{ t("categoryTranslations.noRecords") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Ortak alt bilgi: otomatik kayıt + sayfalama + sıradaki eksik -->
    <div
      v-if="!loading && filteredRows.length"
      class="flex flex-wrap items-center justify-between gap-3 mt-3 px-1 text-xs text-gray-500"
    >
      <span>{{ t("categoryTranslations.autoSaveHint") }}</span>
      <div class="flex items-center gap-4">
        <ListPagination
          v-if="pageSize > 0 && filteredRows.length > pageSize"
          v-model="currentPage"
          :total="filteredRows.length"
          :page-size="effectivePageSize"
        />
        <button
          v-if="stats.incomplete > 0"
          class="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
          data-tour="ctr-jump"
          @click="jumpToNextMissing"
        >
          {{ t("categoryTranslations.jumpNext") }}
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>
  </div>
</template>
