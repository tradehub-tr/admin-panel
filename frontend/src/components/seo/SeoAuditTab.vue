<script setup>
  // 13.4 SEO Audit Reporter — kategori/durum süzgeci, kanıt/kök neden/sorumlu/öneri, yaşam döngüsü.
  import { ref, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import {
    auditReport,
    auditMarkFixed,
    auditClose,
    auditReopen,
    auditImportSignals,
    auditExportUrl,
  } from "@/api/seoHelper662";

  // 662 §2: Tarama sekmesinden gelen koşum kimliği → yalnız o koşunun bulguları
  const props = defineProps({ run: { type: String, default: "" } });
  const { t } = useI18n();
  const toast = useToast();
  const category = ref("");
  const status = ref("");
  const source = ref("");
  const runFilter = ref(props.run || "");
  const days = ref(30);
  const SOURCES = ["crawler", "log", "gsc", "media", "notfound_log", "policy", "mcp"];
  const report = ref(null);
  const open = ref(null);
  const busy = ref(false);
  const errMsg = (e) => e?.message || String(e);
  const CATS = ["technical", "content", "catalog", "international", "merchant", "policy"];

  async function load() {
    try {
      report.value = await auditReport({
        category: category.value,
        status: status.value,
        signal_source: source.value,
        crawl_run: runFilter.value,
        days: days.value,
        limit: 500,
      });
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function act(kind, f) {
    busy.value = true;
    try {
      if (kind === "fixed") {
        const r = await auditMarkFixed(f.name, 1);
        toast.success(t("seoHelper662.markedFixed", { run: r.recrawl_run || "-" }));
      } else if (kind === "close") {
        await auditClose(f.name);
        toast.success(t("seoHelper662.closed"));
      } else {
        await auditReopen(f.name);
        toast.success(t("seoHelper662.reopened"));
      }
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }
  const sevClass = (s) =>
    ({
      error: "bg-red-100 text-red-700",
      warning: "bg-amber-100 text-amber-700",
      info: "bg-gray-100 text-gray-600",
    })[s] || "";
  const stClass = (s) =>
    ({
      open: "bg-red-50 text-red-700",
      reopened: "bg-red-100 text-red-800",
      fixed: "bg-blue-100 text-blue-700",
      recrawl_pending: "bg-amber-100 text-amber-700",
      closed: "bg-green-100 text-green-700",
    })[s] || "";
  const fmt = (v) => (v ? new Date(v).toLocaleString() : "—");
  const srcClass = (s) =>
    ({
      crawler: "bg-brand-50 text-brand-800",
      log: "bg-purple-100 text-purple-700",
      gsc: "bg-green-100 text-green-700",
      media: "bg-pink-100 text-pink-700",
      notfound_log: "bg-orange-100 text-orange-700",
      policy: "bg-gray-100 text-gray-600",
      mcp: "bg-indigo-100 text-indigo-700",
    })[s] || "bg-gray-100 text-gray-600";
  async function importSignals() {
    busy.value = true;
    try {
      const r = await auditImportSignals("all");
      const n = Object.values(r).reduce((a, x) => a + (x.rows || 0), 0);
      toast.success(t("seoHelper662.signalsImported", { n }));
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }
  // 662 §3: denetlenebilir dışa rapor — sunucu indirme yanıtı (CSV/JSON), aynı süzgeçlerle
  const exportUrl = (fmt) =>
    auditExportUrl({
      fmt,
      category: category.value,
      status: status.value,
      signal_source: source.value,
      crawl_run: runFilter.value,
      days: days.value,
      limit: 5000,
    });
  watch(
    () => props.run,
    (v) => (runFilter.value = v || "")
  );
  watch([category, status, source, runFilter, days], load);
  onMounted(load);
</script>

<template>
  <div class="space-y-4" data-testid="audit-tab">
    <div class="flex flex-wrap gap-2 items-center">
      <select
        v-model="category"
        class="px-2 py-1 text-sm border border-gray-200 rounded-md"
        data-testid="audit-category"
      >
        <option value="">{{ t("seoHelper662.allCategories") }}</option>
        <option v-for="c in CATS" :key="c" :value="c">{{ t(`seoHelper662.cat_${c}`) }}</option>
      </select>
      <select
        v-model="status"
        class="px-2 py-1 text-sm border border-gray-200 rounded-md"
        data-testid="audit-status"
      >
        <option value="">{{ t("seoHelper662.activeOnly") }}</option>
        <option
          v-for="s in ['open', 'reopened', 'fixed', 'recrawl_pending', 'closed', 'all']"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
      <select
        v-model="source"
        class="px-2 py-1 text-sm border border-gray-200 rounded-md"
        data-testid="audit-source"
      >
        <option value="">{{ t("seoHelper662.allSources") }}</option>
        <option v-for="s in SOURCES" :key="s" :value="s">{{ t(`seoHelper662.src_${s}`) }}</option>
      </select>
      <select v-model="days" class="px-2 py-1 text-sm border border-gray-200 rounded-md">
        <option v-for="d in [7, 30, 90, 365]" :key="d" :value="d">
          {{ d }} {{ t("seoHelper662.days") }}
        </option>
      </select>
      <span
        v-if="runFilter"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-brand-50 text-brand-800"
        data-testid="audit-run-filter"
      >
        {{ t("seoHelper662.runFilter") }}: <span class="font-mono">{{ runFilter }}</span>
        <button type="button" class="ml-1 hover:underline" @click="runFilter = ''">×</button>
      </span>
      <span v-if="report" class="text-xs text-gray-500">{{
        t("seoHelper.total", { n: report.total })
      }}</span>
      <span class="flex-1" />
      <button
        type="button"
        class="hdr-btn-outlined"
        :disabled="busy"
        data-testid="audit-import-signals"
        @click="importSignals"
      >
        {{ t("seoHelper662.importSignals") }}
      </button>
      <a
        :href="exportUrl('csv')"
        class="hdr-btn-outlined"
        data-testid="audit-export-csv"
        download
        >{{ t("seoHelper662.exportCsv") }}</a
      >
      <a :href="exportUrl('json')" class="hdr-btn-outlined" data-testid="audit-export-json" download
        >JSON</a
      >
    </div>
    <div v-if="report?.by_source" class="flex flex-wrap gap-2 text-xs" data-testid="audit-sources">
      <span
        v-for="(n, s) in report.by_source"
        :key="s"
        class="inline-block px-2 py-0.5 rounded-full"
        :class="srcClass(s)"
        >{{ t(`seoHelper662.src_${s}`, s) }}: {{ n }}</span
      >
    </div>

    <div v-if="report" class="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="audit-summary">
      <div
        v-for="(v, c) in report.summary.by_category"
        :key="c"
        class="bg-white rounded-lg border border-gray-200 p-3"
      >
        <div class="text-[11px] uppercase text-gray-400">{{ t(`seoHelper662.cat_${c}`, c) }}</div>
        <div class="text-sm">
          <span class="text-red-700 font-semibold">{{ v.error }}</span> /
          <span class="text-amber-700">{{ v.warning }}</span> /
          <span class="text-gray-500">{{ v.info }}</span>
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.byOwner") }}</div>
        <div class="text-xs text-gray-700">
          <div v-for="(n, o) in report.summary.by_owner" :key="o">{{ o }}: {{ n }}</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div
        class="lg:col-span-2 overflow-x-auto bg-white rounded-lg border border-gray-200"
        data-testid="audit-table"
      >
        <table class="w-full text-xs">
          <thead class="bg-gray-50 uppercase text-gray-500">
            <tr>
              <th class="px-2 py-1">{{ t("seoHelper662.severity") }}</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.code") }}</th>
              <th class="px-2 py-1 text-left">URL</th>
              <th class="px-2 py-1 text-left">{{ t("seoHelper662.owner") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper662.occurrences") }}</th>
              <th class="px-2 py-1">{{ t("seoHelper.colStatus") }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="f in report?.rows || []"
              :key="f.name"
              class="hover:bg-gray-50 cursor-pointer"
              :class="open?.name === f.name ? 'bg-brand-50' : ''"
              :data-testid="`audit-row-${f.name}`"
              @click="open = f"
            >
              <td class="px-2 py-1 text-center">
                <span class="inline-block px-2 py-0.5 rounded-full" :class="sevClass(f.severity)">{{
                  f.severity
                }}</span>
              </td>
              <td class="px-2 py-1">
                <span class="font-mono">{{ f.code }}</span>
                <div class="text-gray-500">
                  {{ t(`seoHelper662.cat_${f.category}`, f.category) }}
                  <span
                    class="ml-1 inline-block px-1.5 rounded-full"
                    :class="srcClass(f.signal_source)"
                    >{{ t(`seoHelper662.src_${f.signal_source}`, f.signal_source) }}</span
                  >
                </div>
              </td>
              <td class="px-2 py-1 font-mono max-w-[18rem] truncate" :title="f.url">
                {{ f.url || f.route }}
              </td>
              <td class="px-2 py-1">
                {{ f.owner_role }}
                <div v-if="f.owner_store" class="text-gray-500">{{ f.owner_store }}</div>
              </td>
              <td class="px-2 py-1 text-center">{{ f.occurrences }}</td>
              <td class="px-2 py-1 text-center">
                <span class="inline-block px-2 py-0.5 rounded-full" :class="stClass(f.status)">{{
                  f.status
                }}</span>
              </td>
            </tr>
            <tr v-if="report && !report.rows.length">
              <td colspan="6" class="px-2 py-4 text-center text-gray-400">
                {{ t("seoHelper662.noFindings") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="bg-white rounded-lg border border-gray-200 p-4 h-fit text-sm space-y-2"
        data-testid="audit-detail"
      >
        <div v-if="!open" class="text-gray-400 text-xs">{{ t("seoHelper662.pickFinding") }}</div>
        <template v-else>
          <div class="flex items-center justify-between">
            <span class="font-mono font-semibold">{{ open.code }}</span
            ><span
              class="inline-block px-2 py-0.5 text-xs rounded-full"
              :class="stClass(open.status)"
              >{{ open.status }}</span
            >
          </div>
          <div class="text-xs text-gray-700">{{ open.message }}</div>
          <div class="text-xs">
            <span class="text-gray-400">{{ t("seoHelper662.affectedUrl") }}:</span>
            <a
              :href="open.url"
              target="_blank"
              class="font-mono text-brand-800 hover:underline break-all"
              >{{ open.url || open.route }}</a
            >
          </div>
          <div class="text-xs">
            <span class="text-gray-400">{{ t("seoHelper662.rootCause") }}:</span>
            {{ open.root_cause || "—" }}
          </div>
          <div class="text-xs">
            <span class="text-gray-400">{{ t("seoHelper662.owner") }}:</span> {{ open.owner_role }}
            <span v-if="open.owner_store">· {{ open.owner_store }}</span>
          </div>
          <div class="text-xs">
            <span class="text-gray-400">{{ t("seoHelper662.recommendation") }}:</span>
            {{ open.recommendation || "—" }}
          </div>
          <div class="text-xs">
            <span class="text-gray-400">{{ t("seoHelper662.evidence") }}:</span>
            <pre
              class="mt-1 p-2 bg-gray-50 rounded text-[11px] overflow-auto max-h-40"
              data-testid="audit-evidence"
              >{{ JSON.stringify(open.evidence, null, 1) }}</pre
            >
          </div>
          <div class="text-[11px] text-gray-500">
            {{ t("seoHelper662.firstSeen") }} {{ fmt(open.first_observed) }} ·
            {{ t("seoHelper662.lastSeen") }} {{ fmt(open.last_observed) }} · ×{{ open.occurrences
            }}<span v-if="open.fixed_by"> · {{ open.fixed_by }}</span>
          </div>
          <div class="text-[11px] text-gray-500" data-testid="audit-trace">
            {{ t("seoHelper662.source") }}:
            {{ t(`seoHelper662.src_${open.signal_source}`, open.signal_source) }}
            <span v-if="open.crawl_run">
              · {{ t("seoHelper662.runFilter") }}:
              <span class="font-mono">{{ open.crawl_run }}</span></span
            >
            <span v-if="open.recrawl_run">
              · {{ t("seoHelper662.recrawlTrace", { n: open.recrawl_count || 0 }) }}:
              <span class="font-mono">{{ open.recrawl_run }}</span></span
            >
          </div>
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              v-if="['open', 'reopened'].includes(open.status)"
              type="button"
              class="hdr-btn-primary"
              :disabled="busy"
              data-testid="audit-fixed"
              @click="act('fixed', open)"
            >
              {{ t("seoHelper662.markFixedRecrawl") }}
            </button>
            <button
              v-if="open.status !== 'closed'"
              type="button"
              class="hdr-btn-outlined"
              :disabled="busy"
              @click="act('close', open)"
            >
              {{ t("seoHelper662.closeFinding") }}
            </button>
            <button
              v-if="open.status === 'closed'"
              type="button"
              class="hdr-btn-outlined"
              :disabled="busy"
              @click="act('reopen', open)"
            >
              {{ t("seoHelper662.reopenFinding") }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
