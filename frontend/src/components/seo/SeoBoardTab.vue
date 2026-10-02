<script setup>
  // 13.3 SEO Monitoring Board — kaynaklar + güncellik, boyut bazlı görünürlük/dönüşüm, anomali.
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import {
    boardOverview,
    boardVisibility,
    boardConversions,
    boardSnapshotNow,
  } from "@/api/seoHelper662";

  const { t } = useI18n();
  const toast = useToast();
  const ov = ref(null);
  const dimension = ref("all");
  const visibility = ref([]);
  const conversions = ref([]);
  const errMsg = (e) => e?.message || String(e);

  async function load() {
    try {
      ov.value = await boardOverview();
      await loadDim();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function loadDim() {
    try {
      const [v, c] = await Promise.all([
        boardVisibility(dimension.value),
        boardConversions(dimension.value, 30),
      ]);
      visibility.value = v;
      conversions.value = c;
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function snapshot() {
    try {
      const r = await boardSnapshotNow();
      toast.success(t("seoHelper662.snapshotDone", { n: r.snapshots }));
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  function age(m) {
    if (m === null || m === undefined) return t("seoHelper662.never");
    if (m < 60) return `${m} dk`;
    if (m < 60 * 48) return `${Math.round(m / 60)} sa`;
    return `${Math.round(m / 1440)} g`;
  }
  const conv = (d, k) => (d[k] === undefined || d[k] === null ? "—" : d[k]);
  // 662 §3: eksik veri / başarısız-kesik koşumda kapsam sınırı açıkça yazılır
  function reasonText(r) {
    const label = r.label || r.source || "";
    switch (r.code) {
      case "source_missing":
        return t("seoHelper662.scope_source_missing", { source: label });
      case "source_stale":
        return t("seoHelper662.scope_source_stale", { source: label, age: age(r.age_minutes) });
      case "last_run_failed":
        return t("seoHelper662.scope_last_run_failed", { run: r.run, error: r.error || "" });
      case "last_run_incomplete":
        return t("seoHelper662.scope_last_run_incomplete", { run: r.run, status: r.status });
      case "budget_exhausted":
        return t("seoHelper662.scope_budget", {
          run: r.run,
          crawled: r.crawled,
          candidates: r.candidates ?? "?",
          reason: r.reason || "",
        });
      case "no_crawl":
        return t("seoHelper662.scope_no_crawl");
      default:
        return r.code;
    }
  }
  onMounted(load);
</script>

<template>
  <div class="space-y-4" data-testid="board-tab">
    <div class="flex items-center justify-between">
      <div class="text-sm font-semibold text-gray-900">{{ t("seoHelper662.sources") }}</div>
      <button type="button" class="hdr-btn-outlined" data-testid="board-snapshot" @click="snapshot">
        {{ t("seoHelper662.snapshotNow") }}
      </button>
    </div>
    <div
      v-if="ov?.scope"
      class="rounded-lg border p-3 text-xs"
      :class="
        ov.scope.limited
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-green-200 bg-green-50 text-green-800'
      "
      data-testid="board-scope"
    >
      <div class="font-semibold">
        {{ ov.scope.limited ? t("seoHelper662.scopeLimited") : t("seoHelper662.scopeFull") }}
        <span v-if="ov.scope.last_crawl" class="font-normal text-gray-600">
          · {{ t("seoHelper662.lastCrawl") }}:
          <span class="font-mono">{{ ov.scope.last_crawl.run }}</span> ({{
            ov.scope.last_crawl.mode
          }}, {{ ov.scope.last_crawl.status }}, {{ ov.scope.last_crawl.crawled }}/{{
            ov.scope.last_crawl.candidates ?? ov.scope.last_crawl.planned
          }}
          <span v-if="ov.scope.last_crawl.coverage_pct != null"
            >= {{ ov.scope.last_crawl.coverage_pct }}%</span
          >)
        </span>
      </div>
      <ul v-if="ov.scope.limited" class="mt-1 list-disc pl-5 space-y-0.5">
        <li v-for="(r, i) in ov.scope.reasons" :key="i">{{ reasonText(r) }}</li>
      </ul>
    </div>
    <div v-if="ov" class="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="board-sources">
      <div
        v-for="s in ov.sources"
        :key="s.key"
        class="bg-white rounded-lg border p-3"
        :class="s.stale ? 'border-amber-300' : 'border-gray-200'"
      >
        <div class="text-[11px] uppercase text-gray-400">{{ s.label }}</div>
        <div
          class="text-sm font-semibold"
          :class="s.configured ? 'text-gray-900' : 'text-gray-400'"
        >
          {{ s.configured ? t("seoHelper662.configured") : t("seoHelper662.notConfigured") }}
        </div>
        <div class="text-[11px]" :class="s.stale ? 'text-amber-700' : 'text-green-700'">
          {{ t("seoHelper662.freshness") }}: {{ age(s.age_minutes)
          }}<span v-if="s.stale"> · {{ t("seoHelper662.stale") }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="ov"
      class="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="board-anomalies"
    >
      <div class="text-sm font-semibold text-gray-900 mb-2">{{ t("seoHelper662.anomalies") }}</div>
      <div v-if="!ov.anomalies.length" class="text-xs text-gray-400">
        {{ t("seoHelper662.noData") }}
      </div>
      <ul v-else class="text-xs space-y-1">
        <li
          v-for="a in ov.anomalies"
          :key="a.source + a.metric"
          :class="
            a.bad ? 'text-red-700 font-semibold' : a.anomaly ? 'text-amber-700' : 'text-gray-600'
          "
        >
          {{ a.source }} · {{ a.metric }} · {{ a.day }}: {{ a.current }}
          <span v-if="a.pct !== null && a.pct !== undefined"
            >({{ a.pct > 0 ? "+" : "" }}{{ a.pct }}% · {{ t("seoHelper662.baseline") }}
            {{ a.mean }})</span
          >
          <span v-else class="text-gray-400">· {{ a.reason }}</span>
        </li>
      </ul>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="board-visibility">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold text-gray-900">{{ t("seoHelper662.visibility") }}</div>
        <select
          v-model="dimension"
          class="px-2 py-1 text-xs border border-gray-200 rounded-md"
          data-testid="board-dimension"
          @change="loadDim"
        >
          <option value="all">{{ t("seoHelper662.dim_all") }}</option>
          <option value="store">{{ t("seoHelper662.dim_store") }}</option>
          <option value="lang">{{ t("seoHelper662.dim_lang") }}</option>
          <option value="page_type">{{ t("seoHelper662.dim_page_type") }}</option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.dimension") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper.cardPages") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.indexable") }}</th>
              <th class="px-2 py-1">crawl ok</th>
              <th class="px-2 py-1">needs_js</th>
              <th class="px-2 py-1">ms</th>
              <th class="px-2 py-1">{{ t("seoHelper662.findings") }} (e/w)</th>
              <th class="px-2 py-1">GSC 7g</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="g in visibility" :key="g.key">
              <td class="px-2 py-1">{{ g.key }}</td>
              <td class="px-2 py-1 text-center">{{ g.published }} / {{ g.pages }}</td>
              <td class="px-2 py-1 text-center">{{ g.indexable }}</td>
              <td class="px-2 py-1 text-center">
                {{ g.crawl_ok_pct === null ? "—" : g.crawl_ok_pct + "%" }}
              </td>
              <td class="px-2 py-1 text-center">{{ g.needs_js }}</td>
              <td class="px-2 py-1 text-center">{{ g.avg_ms ?? "—" }}</td>
              <td class="px-2 py-1 text-center">
                <span :class="g.findings_error ? 'text-red-700' : ''">{{ g.findings_error }}</span>
                / {{ g.findings_warning }}
              </td>
              <td class="px-2 py-1 text-center">
                {{ g.gsc_clicks_7d ?? "—" }} / {{ g.gsc_impressions_7d ?? "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="board-conversions">
      <div class="text-sm font-semibold text-gray-900 mb-2">
        {{ t("seoHelper662.conversions") }} (30 {{ t("seoHelper662.days") }})
      </div>
      <div v-if="!conversions.length" class="text-xs text-gray-400">
        {{ t("seoHelper662.noConversions") }}
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.dimension") }}</th>
              <th class="px-2 py-1">RFQ ({{ t("seoHelper662.organic") }})</th>
              <th class="px-2 py-1">
                {{ t("seoHelper662.inquiry") }} ({{ t("seoHelper662.organic") }})
              </th>
              <th class="px-2 py-1">
                {{ t("seoHelper662.order") }} ({{ t("seoHelper662.organic") }})
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="d in conversions" :key="d.key">
              <td class="px-2 py-1">{{ d.key }}</td>
              <td class="px-2 py-1 text-center">
                {{ conv(d, "rfq_total") }} ({{ conv(d, "rfq_organic") }} ·
                {{ conv(d, "rfq_organic_pct") }}%)
              </td>
              <td class="px-2 py-1 text-center">
                {{ conv(d, "inquiry_total") }} ({{ conv(d, "inquiry_organic") }} ·
                {{ conv(d, "inquiry_organic_pct") }}%)
              </td>
              <td class="px-2 py-1 text-center">
                {{ conv(d, "order_total") }} ({{ conv(d, "order_organic") }} ·
                {{ conv(d, "order_organic_pct") }}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
