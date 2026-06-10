<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useFeed } from "@/composables/useFeed";

  const { t } = useI18n();
  const { feeds, loading, listAllFeeds } = useFeed();

  const filterStatus = ref("all");

  // last_status free-form Data alanı; filtre seçenekleri veride mevcut olan
  // değerlerden türetilir, rozet rengi statusBadgeCls heuristiğiyle eşlenir.
  const statusOptions = computed(() => {
    const present = new Set(feeds.value.map((f) => f.last_status).filter(Boolean));
    return [
      { value: "all", label: t("adminFeeds.statusAll") },
      ...[...present].map((s) => ({ value: s, label: statusLabel(s) })),
    ];
  });

  const filteredFeeds = computed(() => {
    if (filterStatus.value === "all") return feeds.value;
    return feeds.value.filter((f) => (f.last_status || "") === filterStatus.value);
  });

  const summary = computed(() => ({
    total: feeds.value.length,
    enabled: feeds.value.filter((f) => f.enabled).length,
    failing: feeds.value.filter((f) => (f.consecutive_failures || 0) > 0).length,
  }));

  function statusLabel(s) {
    if (!s) return t("adminFeeds.statusNever");
    const map = {
      Success: t("adminFeeds.statusSuccess"),
      Partial: t("adminFeeds.statusPartial"),
      Failed: t("adminFeeds.statusFailed"),
      Running: t("adminFeeds.statusRunning"),
      "Never Run": t("adminFeeds.statusNever"),
    };
    return map[s] || s;
  }

  function statusBadgeCls(s) {
    switch (s) {
      case "Success":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "Partial":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "Failed":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
      case "Running":
        return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  async function load() {
    await listAllFeeds();
  }

  onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("adminFeeds.title") }}
        </h1>
        <p class="text-xs text-gray-400">
          {{
            t("adminFeeds.summary", {
              total: summary.total,
              enabled: summary.enabled,
              failing: summary.failing,
            })
          }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("adminFeeds.refresh") }}</span>
        </button>
      </div>
    </div>

    <div class="card mb-5 !p-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <select v-model="filterStatus" class="form-input-sm w-auto">
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="filteredFeeds.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <AppIcon name="rss" :size="24" class="text-gray-400" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("adminFeeds.emptyTitle") }}</h3>
      <p class="text-xs text-gray-400">{{ t("adminFeeds.emptyDesc") }}</p>
    </div>

    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="tbl-th">{{ t("adminFeeds.colSeller") }}</th>
              <th class="tbl-th">{{ t("adminFeeds.colFeedUrl") }}</th>
              <th class="tbl-th">{{ t("adminFeeds.colStatus") }}</th>
              <th class="tbl-th">{{ t("adminFeeds.colLastFetch") }}</th>
              <th class="tbl-th text-right">{{ t("adminFeeds.colFailures") }}</th>
              <th class="tbl-th text-center">{{ t("adminFeeds.colEnabled") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredFeeds" :key="item.name" class="tbl-row border-b border-gray-50">
              <td class="tbl-td">
                <p class="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {{ item.seller_profile || "—" }}
                </p>
                <p class="text-[10px] text-gray-400 font-mono">{{ item.name }}</p>
              </td>
              <td class="tbl-td max-w-[260px]">
                <span class="text-xs text-gray-600 font-mono dark:text-gray-300 break-all">
                  {{ item.feed_url }}
                </span>
              </td>
              <td class="tbl-td">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                  :class="statusBadgeCls(item.last_status)"
                >
                  {{ statusLabel(item.last_status) }}
                </span>
                <span
                  v-if="item.last_item_count != null"
                  class="ml-1 text-[10px] text-gray-400"
                >
                  {{ t("adminFeeds.itemCount", { count: item.last_item_count }) }}
                </span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ formatDate(item.last_fetch) }}</span>
              </td>
              <td class="tbl-td text-right">
                <span
                  class="text-xs font-semibold"
                  :class="
                    (item.consecutive_failures || 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-gray-400'
                  "
                >
                  {{ item.consecutive_failures || 0 }}
                </span>
              </td>
              <td class="tbl-td text-center">
                <span
                  class="text-[10px] font-semibold"
                  :class="item.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
                >
                  {{ item.enabled ? t("adminFeeds.enabledYes") : t("adminFeeds.enabledNo") }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
</style>
