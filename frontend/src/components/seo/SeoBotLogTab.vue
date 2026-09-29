<script setup>
  // 13.2 Bot / sunucu log analizi — içe aktarma, kapsam karşılaştırması, ziyaret listesi.
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import {
    botlogImport,
    botlogImportScheduled,
    botlogCoverage,
    botlogVisits,
  } from "@/api/seoHelper662";

  const { t } = useI18n();
  const toast = useToast();
  const text = ref("");
  const days = ref(7);
  const coverage = ref(null);
  const visits = ref([]);
  const busy = ref(false);
  const errMsg = (e) => e?.message || String(e);

  async function load() {
    try {
      const [c, v] = await Promise.all([
        botlogCoverage(days.value),
        botlogVisits({ days: days.value, limit: 100 }),
      ]);
      coverage.value = c;
      visits.value = v;
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function doImport() {
    busy.value = true;
    try {
      const r = await botlogImport(text.value);
      toast.success(
        t("seoHelper662.logImported", { lines: r.lines, rows: r.rows, skipped: r.skipped })
      );
      text.value = "";
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function doScheduled() {
    try {
      const r = await botlogImportScheduled();
      toast.success(t("seoHelper662.logScheduledDone", { files: r.files, rows: r.rows }));
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  onMounted(load);
</script>

<template>
  <div class="space-y-4" data-testid="botlog-tab">
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="text-sm font-semibold text-gray-900 mb-2">{{ t("seoHelper662.logImport") }}</div>
      <textarea
        v-model="text"
        rows="4"
        class="w-full px-2 py-1 text-xs font-mono border border-gray-200 rounded-md"
        :placeholder="t('seoHelper662.logPlaceholder')"
        data-testid="botlog-text"
      />
      <div class="flex gap-2 mt-2">
        <button
          type="button"
          class="hdr-btn-primary"
          :disabled="busy || !text.trim()"
          data-testid="botlog-import"
          @click="doImport"
        >
          {{ t("seoHelper662.importLog") }}
        </button>
        <button type="button" class="hdr-btn-outlined" @click="doScheduled">
          {{ t("seoHelper662.importFromPath") }}
        </button>
        <select
          v-model="days"
          class="px-2 py-1 text-xs border border-gray-200 rounded-md"
          @change="load"
        >
          <option v-for="d in [1, 7, 30, 90]" :key="d" :value="d">
            {{ d }} {{ t("seoHelper662.days") }}
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="coverage"
      :class="coverage.partial ? 'ring-1 ring-amber-300' : ''"
      class="grid grid-cols-2 md:grid-cols-4 gap-3"
      data-testid="botlog-coverage"
    >
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">
          {{ t("seoHelper662.coverage") }}
          <span
            v-if="coverage.partial"
            class="text-amber-700 normal-case"
            data-testid="botlog-partial"
          >
            · {{ t("seoHelper662.coveragePartial") }}
          </span>
        </div>
        <div class="text-xl font-bold text-gray-900">{{ coverage.coverage_pct }}%</div>
        <div class="text-[11px] text-gray-500">
          {{ coverage.both }} / {{ coverage.requested }} {{ t("seoHelper662.requestedPages") }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.botHits") }}</div>
        <div class="text-xl font-bold text-gray-900">
          {{ coverage.hits_on_requested + coverage.hits_wasted }}
        </div>
        <div class="text-[11px] text-gray-500">
          {{ t("seoHelper662.wasted") }}: {{ coverage.hits_wasted }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.blocked") }}</div>
        <div
          class="text-xl font-bold"
          :class="coverage.blocked_hits ? 'text-red-600' : 'text-gray-900'"
        >
          {{ coverage.blocked_hits }}
        </div>
        <div class="text-[11px] text-gray-500">
          {{ t("seoHelper662.unverified") }}: {{ coverage.unverified_hits }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.bots") }}</div>
        <div class="text-xs text-gray-700">
          <div v-for="(n, b) in coverage.bots" :key="b">{{ b }}: {{ n }}</div>
          <div v-if="!Object.keys(coverage.bots || {}).length" class="text-gray-400">—</div>
        </div>
      </div>
    </div>

    <div v-if="coverage" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-[11px] uppercase text-gray-400 mb-1">
          {{ t("seoHelper662.requestedNotCrawled") }} ({{ coverage.requested_not_crawled.length }})
        </div>
        <ul class="text-xs font-mono max-h-48 overflow-auto">
          <li v-for="p in coverage.requested_not_crawled" :key="p">{{ p }}</li>
          <li v-if="!coverage.requested_not_crawled.length" class="text-gray-400 font-sans">—</li>
        </ul>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-[11px] uppercase text-gray-400 mb-1">
          {{ t("seoHelper662.crawledNotRequested") }} ({{ coverage.crawled_not_requested.length }})
        </div>
        <ul class="text-xs font-mono max-h-48 overflow-auto">
          <li v-for="p in coverage.crawled_not_requested" :key="p">{{ p }}</li>
          <li v-if="!coverage.crawled_not_requested.length" class="text-gray-400 font-sans">—</li>
        </ul>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="botlog-visits">
      <div class="text-sm font-semibold text-gray-900 mb-2">{{ t("seoHelper662.visits") }}</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.day") }}</th>
              <th class="px-2 py-1 text-left">Bot</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.path") }}</th>
              <th class="px-2 py-1">HTTP</th>
              <th class="px-2 py-1">{{ t("seoHelper662.hits") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.blocked") }}</th>
              <th class="px-2 py-1">DNS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="v in visits" :key="v.day + v.bot + v.path + v.status_code">
              <td class="px-2 py-1 whitespace-nowrap">{{ v.day }}</td>
              <td class="px-2 py-1">{{ v.bot }}</td>
              <td class="px-2 py-1 font-mono">{{ v.path }}</td>
              <td class="px-2 py-1 text-center" :class="v.status_code >= 400 ? 'text-red-700' : ''">
                {{ v.status_code }}
              </td>
              <td class="px-2 py-1 text-center">{{ v.hits }}</td>
              <td class="px-2 py-1 text-center">{{ v.blocked ? "✓" : "" }}</td>
              <td class="px-2 py-1 text-center">{{ v.verified ? "✓" : "" }}</td>
            </tr>
            <tr v-if="!visits.length">
              <td colspan="7" class="px-2 py-3 text-center text-gray-400">
                {{ t("seoHelper662.noVisits") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
