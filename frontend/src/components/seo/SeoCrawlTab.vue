<script setup>
  // 13.1 SEO Crawl Manager — tam/artımlı/örneklem/hedefli tarama, bütçe, hız, duraklat/devam et.
  import { ref, onMounted, onUnmounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import {
    crawlStart,
    crawlPause,
    crawlResume,
    crawlCancel,
    crawlRuns,
    crawlPages,
    crawlTrend,
  } from "@/api/seoHelper662";

  // 662 §2: koşum kimliği → Denetim sekmesi (aynı koşuya bağlı bulgular)
  const emit = defineEmits(["show-findings"]);
  const { t } = useI18n();
  const toast = useToast();
  const busy = ref(false);
  const runs = ref([]);
  const trend = ref([]); // 662 §2: aynı koşum kimliğine bağlı trend (tam/artımlı koşumlar)
  const form = ref({
    mode: "full",
    routes: "",
    sample_size: "",
    sample_pct: "",
    max_pages: "",
    max_seconds: "",
    max_mb: "",
    rate_limit_rps: "",
  });
  const selectedRun = ref(null);
  const pages = ref([]);
  const pagesTotal = ref(0);
  const pageFilter = ref("");
  let timer = null;

  const errMsg = (e) => e?.message || String(e);

  async function loadRuns() {
    try {
      runs.value = await crawlRuns({ limit: 30 });
      trend.value = await crawlTrend(12);
      if (selectedRun.value) {
        const r = runs.value.find((x) => x.name === selectedRun.value.name);
        if (r) selectedRun.value = r;
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function start() {
    busy.value = true;
    try {
      const p = { ...form.value };
      p.routes = p.routes
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (p.routes.length && p.mode !== "targeted") p.mode = "targeted";
      for (const k of [
        "sample_size",
        "sample_pct",
        "max_pages",
        "max_seconds",
        "max_mb",
        "rate_limit_rps",
      ])
        if (p[k] === "") delete p[k];
      const r = await crawlStart(p);
      toast.success(t("seoHelper662.crawlQueued", { run: r.name, n: r.pages_total }));
      await loadRuns();
      openRun(r);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function act(kind, run) {
    try {
      if (kind === "pause") await crawlPause(run.name);
      else if (kind === "resume") await crawlResume(run.name);
      else await crawlCancel(run.name);
      toast.success(t(`seoHelper662.crawl_${kind}_ok`));
      await loadRuns();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function openRun(run) {
    selectedRun.value = run;
    try {
      const r = await crawlPages({ run: run.name, status: pageFilter.value, limit: 200 });
      pages.value = r.rows || [];
      pagesTotal.value = r.total || 0;
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function fmt(v) {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleString();
  }
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  // 662 §1: kapsam (aday/route/mağaza), zaman (başlangıç→bitiş, geçen), hata, tekrar deneme (kuyruk işi)
  const scopeText = (r) => {
    if (r.scope_routes) return t("seoHelper662.scopeRoutes", { n: r.scope_routes });
    const base =
      r.candidates != null ? t("seoHelper662.scopeCandidates", { n: r.candidates }) : "—";
    return r.scope_store ? `${base} · ${r.scope_store}` : base;
  };
  const elapsed = (r) => (r.elapsed_seconds != null ? `${r.elapsed_seconds}s` : "—");
  const retryText = (r) => {
    if (!r.job_count) return "—";
    const n = r.job_attempts || 0;
    return `${r.job_status || "?"} · ${t("seoHelper662.attempts", { n })}`;
  };
  const statusClass = (s) =>
    ({
      running: "bg-blue-100 text-blue-700",
      queued: "bg-gray-100 text-gray-600",
      paused: "bg-amber-100 text-amber-700",
      done: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-200 text-gray-600",
    })[s] || "bg-gray-100 text-gray-600";

  onMounted(() => {
    loadRuns();
    timer = setInterval(loadRuns, 8000);
  });
  onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="space-y-4" data-testid="crawl-tab">
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="text-sm font-semibold text-gray-900 mb-3">{{ t("seoHelper662.crawlStart") }}</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label class="text-xs text-gray-600"
          >{{ t("seoHelper662.mode") }}
          <select
            v-model="form.mode"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
            data-testid="crawl-mode"
          >
            <option value="full">{{ t("seoHelper662.mode_full") }}</option>
            <option value="incremental">{{ t("seoHelper662.mode_incremental") }}</option>
            <option value="sample">{{ t("seoHelper662.mode_sample") }}</option>
            <option value="targeted">{{ t("seoHelper662.mode_targeted") }}</option>
          </select>
        </label>
        <label class="text-xs text-gray-600"
          >{{ t("seoHelper662.sampleSize") }}
          <input
            v-model="form.sample_size"
            type="number"
            min="1"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
          />
        </label>
        <label class="text-xs text-gray-600"
          >{{ t("seoHelper662.maxPages") }}
          <input
            v-model="form.max_pages"
            type="number"
            min="0"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
            data-testid="crawl-max-pages"
          />
        </label>
        <label class="text-xs text-gray-600"
          >{{ t("seoHelper662.rps") }}
          <input
            v-model="form.rate_limit_rps"
            type="number"
            min="0"
            step="0.5"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
          />
        </label>
        <label class="text-xs text-gray-600"
          >{{ t("seoHelper662.maxSeconds") }}
          <input
            v-model="form.max_seconds"
            type="number"
            min="0"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
          />
        </label>
        <label class="text-xs text-gray-600"
          >{{ t("seoHelper662.maxMb") }}
          <input
            v-model="form.max_mb"
            type="number"
            min="0"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
          />
        </label>
        <label class="text-xs text-gray-600 col-span-2"
          >{{ t("seoHelper662.routes") }}
          <textarea
            v-model="form.routes"
            rows="2"
            class="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
            :placeholder="t('seoHelper662.routesPlaceholder')"
            data-testid="crawl-routes"
          />
        </label>
      </div>
      <div class="mt-3">
        <button
          type="button"
          class="hdr-btn-primary"
          :disabled="busy"
          data-testid="crawl-start"
          @click="start"
        >
          {{ t("seoHelper662.startCrawl") }}
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="crawl-runs">
      <div class="text-sm font-semibold text-gray-900 mb-2">{{ t("seoHelper662.runs") }}</div>
      <div v-if="!runs.length" class="text-xs text-gray-400">{{ t("seoHelper662.noRuns") }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1 text-left">ID</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.mode") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper.colStatus") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.progress") }}</th>
              <th class="px-2 py-1">OK / ✗ / JS</th>
              <th class="px-2 py-1">{{ t("seoHelper662.findings") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.budget") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.scope") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.time") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.retry") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper.lastError") }}</th>
              <th class="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="r in runs"
              :key="r.name"
              class="hover:bg-gray-50 cursor-pointer"
              :class="selectedRun?.name === r.name ? 'bg-brand-50' : ''"
              :data-testid="`crawl-run-${r.name}`"
              @click="openRun(r)"
            >
              <td class="px-2 py-1 font-mono">{{ r.name }}</td>
              <td class="px-2 py-1">{{ r.mode }}</td>
              <td class="px-2 py-1 text-center">
                <span
                  class="inline-block px-2 py-0.5 rounded-full"
                  :class="statusClass(r.status)"
                  >{{ r.status }}</span
                >
              </td>
              <td class="px-2 py-1">
                <div class="w-28 h-2 bg-gray-100 rounded">
                  <div
                    class="h-2 bg-brand-500 rounded"
                    :style="{ width: pct(r.cursor, r.pages_total) + '%' }"
                  />
                </div>
                <span class="text-gray-500">{{ r.cursor }}/{{ r.pages_total }}</span>
              </td>
              <td class="px-2 py-1 text-center">
                {{ r.pages_ok }} / {{ r.pages_failed }} / {{ r.pages_needs_js }}
              </td>
              <td class="px-2 py-1 text-center">{{ r.findings }}</td>
              <td class="px-2 py-1">
                <span v-if="r.budget_exhausted" class="text-amber-700">{{ r.budget_reason }}</span>
                <span v-else class="text-gray-400"
                  >{{ r.max_pages }}p · {{ r.rate_limit_rps }} rps</span
                >
              </td>
              <td class="px-2 py-1 whitespace-nowrap" :data-testid="`crawl-scope-${r.name}`">
                {{ scopeText(r) }}
              </td>
              <td class="px-2 py-1 whitespace-nowrap" :data-testid="`crawl-time-${r.name}`">
                {{ fmt(r.started_at || r.creation) }}
                <span v-if="r.finished_at" class="text-gray-400">→ {{ fmt(r.finished_at) }}</span>
                <span class="text-gray-500"> · {{ elapsed(r) }}</span>
              </td>
              <td
                class="px-2 py-1 whitespace-nowrap"
                :class="r.job_status === 'dead' || r.job_status === 'failed' ? 'text-red-700' : ''"
                :data-testid="`crawl-retry-${r.name}`"
              >
                {{ retryText(r)
                }}<span v-if="r.resumed_from" class="text-gray-400"> · ↻ {{ r.resumed_from }}</span>
              </td>
              <td
                class="px-2 py-1 max-w-[14rem] truncate"
                :class="r.last_error || r.job_last_error ? 'text-red-700' : 'text-gray-400'"
                :title="r.last_error || r.job_last_error"
                :data-testid="`crawl-error-${r.name}`"
              >
                {{ r.last_error || r.job_last_error || "—" }}
              </td>
              <td class="px-2 py-1 text-right whitespace-nowrap" @click.stop>
                <button
                  v-if="r.findings"
                  type="button"
                  class="text-brand-800 hover:underline mr-2"
                  :data-testid="`crawl-findings-${r.name}`"
                  @click="emit('show-findings', r.name)"
                >
                  {{ t("seoHelper662.showFindings", { n: r.findings }) }}
                </button>
                <button
                  v-if="['queued', 'running'].includes(r.status)"
                  type="button"
                  class="text-amber-700 hover:underline mr-2"
                  :data-testid="`crawl-pause-${r.name}`"
                  @click="act('pause', r)"
                >
                  {{ t("seoHelper662.pause") }}
                </button>
                <button
                  v-if="r.status === 'paused'"
                  type="button"
                  class="text-brand-800 hover:underline mr-2"
                  :data-testid="`crawl-resume-${r.name}`"
                  @click="act('resume', r)"
                >
                  {{ t("seoHelper662.resume") }}
                </button>
                <button
                  v-if="!['done', 'failed', 'cancelled'].includes(r.status)"
                  type="button"
                  class="text-red-700 hover:underline"
                  @click="act('cancel', r)"
                >
                  {{ t("seoHelper.cancel") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="trend.length"
      class="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="crawl-trend"
    >
      <div class="text-sm font-semibold text-gray-900 mb-2">{{ t("seoHelper662.trend") }}</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1 text-left">{{ t("seoHelper.colDate") }}</th>
              <th class="px-2 py-1 text-left">ID</th>
              <th class="px-2 py-1">{{ t("seoHelper662.mode") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.pagesOk") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.findings") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.openErrors") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.time") }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="r in trend"
              :key="r.name"
              class="hover:bg-gray-50 cursor-pointer"
              :data-testid="`crawl-trend-${r.name}`"
              @click="emit('show-findings', r.name)"
            >
              <td class="px-2 py-1 whitespace-nowrap">{{ fmt(r.finished_at || r.creation) }}</td>
              <td class="px-2 py-1 font-mono">{{ r.name }}</td>
              <td class="px-2 py-1 text-center">{{ r.mode }}</td>
              <td class="px-2 py-1 text-center">
                <div class="inline-block w-20 h-2 bg-gray-100 rounded align-middle mr-1">
                  <div class="h-2 bg-green-500 rounded" :style="{ width: (r.ok_pct || 0) + '%' }" />
                </div>
                {{ r.ok_pct == null ? "—" : r.ok_pct + "%" }}
              </td>
              <td class="px-2 py-1 text-center">{{ r.findings }}</td>
              <td class="px-2 py-1 text-center" :class="r.errors_open ? 'text-red-700' : ''">
                {{ r.errors_open }}
              </td>
              <td class="px-2 py-1 text-center">{{ r.elapsed_seconds }}s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="selectedRun"
      class="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="crawl-pages"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold text-gray-900">
          {{ t("seoHelper662.pagesOf", { run: selectedRun.name }) }}
          <span class="text-xs font-normal text-gray-500">{{ pagesTotal }}</span>
        </div>
        <select
          v-model="pageFilter"
          class="px-2 py-1 text-xs border border-gray-200 rounded-md"
          @change="openRun(selectedRun)"
        >
          <option value="">{{ t("seoHelper.stAll") }}</option>
          <option value="ok">2xx</option>
          <option value="error">4xx/5xx</option>
          <option value="needs_js">needs_js</option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1 text-left">URL</th>
              <th class="px-2 py-1">HTTP</th>
              <th class="px-2 py-1">ms</th>
              <th class="px-2 py-1">{{ t("seoHelper662.render") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.title") }}</th>
              <th class="px-2 py-1 text-left">canonical</th>
              <th class="px-2 py-1">robots</th>
              <th class="px-2 py-1">H1 / {{ t("seoHelper662.words") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper.lastError") }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="p in pages" :key="p.name">
              <td class="px-2 py-1 font-mono max-w-[22rem] truncate" :title="p.url">{{ p.url }}</td>
              <td
                class="px-2 py-1 text-center"
                :class="p.status_code >= 400 || !p.status_code ? 'text-red-700' : ''"
              >
                {{ p.status_code || "—"
                }}<span v-if="p.robots_blocked" class="text-amber-700"> robots</span>
              </td>
              <td class="px-2 py-1 text-center">{{ p.response_ms }}</td>
              <td class="px-2 py-1 text-center">{{ p.needs_js ? "needs_js" : p.rendered_with }}</td>
              <td class="px-2 py-1 max-w-[16rem] truncate" :title="p.title">
                {{ p.title || "—" }}
              </td>
              <td class="px-2 py-1 max-w-[16rem] truncate font-mono" :title="p.canonical">
                {{ p.canonical || "—" }}
              </td>
              <td class="px-2 py-1 text-center">{{ p.robots_meta || "—" }}</td>
              <td class="px-2 py-1 text-center">{{ p.h1_count }} / {{ p.word_count }}</td>
              <td class="px-2 py-1 text-gray-500 max-w-[16rem] truncate" :title="p.error">
                {{ p.error || "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
