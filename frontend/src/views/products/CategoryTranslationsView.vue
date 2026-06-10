<script setup>
  import { ref, computed, onMounted, nextTick } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { CONTENT_LANGS } from "@/composables/useLangFields";

  const { t } = useI18n();
  const toast = useToast();

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
    const next = filteredRows.value.find((r) => filledCount(r) < CONTENT_LANGS.length);
    if (!next) return;
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
      <button class="hdr-btn-outlined flex items-center gap-1.5" @click="load">
        <AppIcon name="refresh-cw" :size="13" />
        {{ t("categoryTranslations.refresh") }}
      </button>
    </div>

    <!-- Filtre + özet -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
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

    <!-- Grid -->
    <div v-else class="card overflow-hidden p-0">
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
              v-for="row in filteredRows"
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
      <div
        class="flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 bg-gray-50 dark:bg-[#1a1a25] border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <span>{{ t("categoryTranslations.autoSaveHint") }}</span>
        <button
          v-if="stats.incomplete > 0"
          class="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
          @click="jumpToNextMissing"
        >
          {{ t("categoryTranslations.jumpNext") }}
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>
  </div>
</template>
