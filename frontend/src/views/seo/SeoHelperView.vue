<script setup>
  // SEO Helper (MOGEM-663) — süper admin: MCP taslak onayı, sayfa/denetim, kuyruk & MCP istemcileri.
  // Yalnız admin tarafı (satıcı ekranı yok). Onay Builder Page'i yayınlamaz (published=0).
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import {
    getSummary,
    listDrafts,
    getDraft,
    approveDraft,
    rejectDraft,
    listPages,
    listFindings,
    listCrawlRuns,
    runAudit,
    getQueue,
    requeueJobs,
    listClients,
    listToolCalls,
    createClient,
    rotateKey,
    disableClient,
  } from "@/api/seoHelper";

  const { t } = useI18n();
  const toast = useToast();

  const TABS = ["drafts", "pages", "ops"];
  const tab = ref("drafts");
  const summary = ref(null);
  const busy = ref(false);

  // ── Taslaklar
  const drafts = ref([]);
  const draftsTotal = ref(0);
  const draftStatus = ref("draft");
  const draftType = ref("");
  const selected = ref(null); // draft_detail
  const decision = ref(null); // 'approve' | 'reject' | null
  const note = ref("");

  // ── Sayfalar
  const pages = ref([]);
  const pagesTotal = ref(0);
  const pageSearch = ref("");
  const pageState = ref("");
  const findings = ref([]);
  const findingsFor = ref(null);
  const crawlRuns = ref([]);
  const selectedRoutes = ref(new Set());

  // ── Kuyruk & MCP
  const queue = ref({ rows: [], counts: {}, stuck_30m: 0 });
  const queueStatus = ref("");
  const clients = ref([]);
  const calls = ref([]);
  const newClient = ref({ client_name: "", role: "seo_agent", monthly_token_budget: 0, store: "" });
  const showNewClient = ref(false);
  const issuedKey = ref(null); // { client, api_key } — bir kez gösterilir
  const pendingClientAction = ref(null); // { kind: 'rotate'|'disable', client }

  const errMsg = (e) => e?.message || String(e);

  async function loadSummary() {
    try {
      summary.value = await getSummary();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function loadDrafts() {
    busy.value = true;
    try {
      const r = await listDrafts({
        status: draftStatus.value,
        draft_type: draftType.value,
        limit: 100,
      });
      drafts.value = r.rows || [];
      draftsTotal.value = r.total || 0;
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function openDraft(row) {
    decision.value = null;
    note.value = "";
    try {
      selected.value = await getDraft(row.name);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function confirmDecision() {
    if (!selected.value || !decision.value) return;
    busy.value = true;
    try {
      if (decision.value === "approve") {
        const r = await approveDraft(selected.value.name, note.value);
        toast.success(t("seoHelper.approved", { target: r?.target || "" }));
      } else {
        await rejectDraft(selected.value.name, note.value);
        toast.success(t("seoHelper.rejected"));
      }
      selected.value = null;
      decision.value = null;
      await Promise.all([loadDrafts(), loadSummary()]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function loadPages() {
    busy.value = true;
    try {
      const r = await listPages({ search: pageSearch.value, state: pageState.value, limit: 100 });
      pages.value = r.rows || [];
      pagesTotal.value = r.total || 0;
      crawlRuns.value = await listCrawlRuns();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function openFindings(row) {
    findingsFor.value = row;
    try {
      findings.value = await listFindings({ page: row.name });
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function toggleRoute(route) {
    const s = new Set(selectedRoutes.value);
    if (s.has(route)) s.delete(route);
    else s.add(route);
    selectedRoutes.value = s;
  }

  async function startAudit() {
    busy.value = true;
    try {
      const r = await runAudit([...selectedRoutes.value]);
      toast.success(t("seoHelper.auditQueued", { run: r.crawl_run }));
      selectedRoutes.value = new Set();
      crawlRuns.value = await listCrawlRuns();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function loadOps() {
    busy.value = true;
    try {
      const [q, c, tc] = await Promise.all([
        getQueue({ status: queueStatus.value, limit: 50 }),
        listClients(),
        listToolCalls({ limit: 30 }),
      ]);
      queue.value = q;
      clients.value = c;
      calls.value = tc;
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function requeueDead() {
    try {
      const r = await requeueJobs({ allDead: true });
      toast.success(t("seoHelper.requeued", { n: r.requeued }));
      await Promise.all([loadOps(), loadSummary()]);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function submitNewClient() {
    if (!newClient.value.client_name) return;
    busy.value = true;
    try {
      const payload = { ...newClient.value };
      if (!payload.store) delete payload.store;
      const r = await createClient(payload);
      issuedKey.value = { client: r.client, api_key: r.api_key };
      showNewClient.value = false;
      newClient.value = { client_name: "", role: "seo_agent", monthly_token_budget: 0, store: "" };
      await loadOps();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function confirmClientAction() {
    const a = pendingClientAction.value;
    if (!a) return;
    busy.value = true;
    try {
      if (a.kind === "rotate") {
        const r = await rotateKey(a.client);
        issuedKey.value = { client: r.client, api_key: r.api_key };
      } else {
        await disableClient(a.client);
        toast.success(t("seoHelper.clientDisabled"));
      }
      pendingClientAction.value = null;
      await loadOps();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(issuedKey.value.api_key);
      toast.success(t("seoHelper.copied"));
    } catch {
      toast.error(t("seoHelper.copyFailed"));
    }
  }

  function fmt(v) {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleString();
  }
  const usd = (v) => `$${Number(v || 0).toFixed(4)}`;
  const statusClass = (s) =>
    ({
      draft: "bg-amber-100 text-amber-700",
      applied: "bg-green-100 text-green-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      published: "bg-green-100 text-green-700",
      dead: "bg-red-100 text-red-700",
      failed: "bg-amber-100 text-amber-700",
      done: "bg-green-100 text-green-700",
      queued: "bg-gray-100 text-gray-600",
      running: "bg-blue-100 text-blue-700",
      ok: "bg-green-100 text-green-700",
      denied: "bg-red-100 text-red-700",
      error: "bg-red-100 text-red-700",
    })[s] || "bg-gray-100 text-gray-600";

  const budgetPct = computed(() => {
    const b = summary.value?.mcp_budget || 0;
    if (!b) return null;
    return Math.min(100, Math.round((100 * (summary.value?.mcp_month?.tokens || 0)) / b));
  });

  function loadTab() {
    if (tab.value === "drafts") loadDrafts();
    else if (tab.value === "pages") loadPages();
    else loadOps();
  }

  watch(tab, loadTab);
  watch([draftStatus, draftType], loadDrafts);
  watch([queueStatus], loadOps);
  watch(pageState, loadPages);
  let timer = null;
  watch(pageSearch, () => {
    clearTimeout(timer);
    timer = setTimeout(loadPages, 400);
  });

  onMounted(async () => {
    await loadSummary();
    loadTab();
  });
</script>

<template>
  <div data-testid="seo-helper">
    <!-- Başlık -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900">{{ t("seoHelper.title") }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t("seoHelper.subtitle") }}</p>
      </div>
      <button
        class="hdr-btn-outlined"
        type="button"
        @click="
          loadSummary();
          loadTab();
        "
      >
        {{ t("seoHelper.refresh") }}
      </button>
    </div>

    <!-- Özet kartları -->
    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5" data-testid="sh-cards">
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper.cardPending") }}</div>
        <div class="text-xl font-bold text-gray-900" data-testid="sh-card-pending">
          {{ summary.drafts_pending }}
        </div>
        <div v-if="summary.drafts_invalid" class="text-[11px] text-red-600">
          {{ t("seoHelper.cardInvalid", { n: summary.drafts_invalid }) }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper.cardDead") }}</div>
        <div
          class="text-xl font-bold"
          :class="summary.jobs?.dead ? 'text-red-600' : 'text-gray-900'"
        >
          {{ summary.jobs?.dead ?? 0 }}
        </div>
        <div class="text-[11px] text-gray-400">
          {{
            t("seoHelper.cardQueued", {
              q: summary.jobs?.queued ?? 0,
              f: summary.jobs?.failed ?? 0,
            })
          }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper.cardMcpCost") }}</div>
        <div class="text-xl font-bold text-gray-900">{{ usd(summary.mcp_month?.usd) }}</div>
        <div class="text-[11px] text-gray-400">
          {{
            t("seoHelper.cardMcpDetail", {
              calls: summary.mcp_month?.calls ?? 0,
              tokens: summary.mcp_month?.tokens ?? 0,
            })
          }}
          <span v-if="budgetPct !== null"> · {{ budgetPct }}%</span>
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper.cardPages") }}</div>
        <div class="text-xl font-bold text-gray-900">
          {{ summary.pages_published }} / {{ summary.pages }}
        </div>
        <div class="text-[11px] text-gray-400">
          {{ t("seoHelper.cardFindings", { n: summary.findings_open }) }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper.cardMirror") }}</div>
        <div
          class="text-xl font-bold"
          :class="summary.builder_pages_without_mirror ? 'text-amber-600' : 'text-gray-900'"
        >
          {{ summary.builder_pages_without_mirror }}
        </div>
      </div>
    </div>

    <!-- Sekmeler -->
    <div class="flex border-b border-gray-200 mb-4 overflow-x-auto">
      <button
        v-for="k in TABS"
        :key="k"
        type="button"
        :data-testid="`sh-tab-${k}`"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
        :class="
          tab === k
            ? 'border-brand-500 text-brand-800'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="tab = k"
      >
        {{ t(`seoHelper.tab_${k}`) }}
      </button>
    </div>

    <!-- ── Sekme 1: Taslaklar -->
    <div v-if="tab === 'drafts'" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="flex flex-col sm:flex-row gap-2 mb-3">
          <select
            v-model="draftStatus"
            class="px-3 py-2 text-sm border border-gray-200 rounded-md"
            data-testid="sh-draft-status"
          >
            <option value="draft">{{ t("seoHelper.stDraft") }}</option>
            <option value="applied">{{ t("seoHelper.stApplied") }}</option>
            <option value="rejected">{{ t("seoHelper.stRejected") }}</option>
            <option value="all">{{ t("seoHelper.stAll") }}</option>
          </select>
          <select v-model="draftType" class="px-3 py-2 text-sm border border-gray-200 rounded-md">
            <option value="">{{ t("seoHelper.typeAll") }}</option>
            <option
              v-for="k in ['page_create', 'page_update', 'block_add', 'metadata', 'translation']"
              :key="k"
              :value="k"
            >
              {{ t(`seoHelper.type_${k}`) }}
            </option>
          </select>
          <span class="text-xs text-gray-400 self-center">{{
            t("seoHelper.total", { n: draftsTotal })
          }}</span>
        </div>
        <div v-if="busy && !drafts.length" class="text-center py-10 text-sm text-gray-400">
          {{ t("seoHelper.loading") }}
        </div>
        <div
          v-else-if="!drafts.length"
          class="text-center py-10 text-sm text-gray-400 bg-white rounded-lg border border-gray-200"
        >
          {{ t("seoHelper.emptyDrafts") }}
        </div>
        <div
          v-else
          class="overflow-x-auto bg-white rounded-lg border border-gray-200"
          data-testid="sh-drafts-table"
        >
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colDate") }}</th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colType") }}</th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colTarget") }}</th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colClient") }}</th>
                <th class="px-3 py-2 text-center">{{ t("seoHelper.colValidation") }}</th>
                <th class="px-3 py-2 text-center">{{ t("seoHelper.colStatus") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="d in drafts"
                :key="d.name"
                class="hover:bg-gray-50 cursor-pointer"
                :class="selected?.name === d.name ? 'bg-brand-50' : ''"
                :data-testid="`sh-draft-${d.name}`"
                @click="openDraft(d)"
              >
                <td class="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {{ fmt(d.creation) }}
                </td>
                <td class="px-3 py-2">{{ t(`seoHelper.type_${d.draft_type}`, d.draft_type) }}</td>
                <td class="px-3 py-2 font-mono text-xs">
                  {{ d.target_name || "—" }}
                  <div class="text-gray-400">{{ d.store || t("seoHelper.platform") }}</div>
                </td>
                <td class="px-3 py-2 text-xs">{{ d.client_name }}</td>
                <td class="px-3 py-2 text-center">
                  <span
                    v-if="d.publishable"
                    class="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"
                    >{{ t("seoHelper.valOk") }}</span
                  >
                  <span
                    v-else
                    class="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700"
                    :title="d.finding_codes.join(', ')"
                  >
                    {{ t("seoHelper.valFail") }} ({{ d.finding_codes.length }})
                  </span>
                </td>
                <td class="px-3 py-2 text-center">
                  <span
                    class="inline-block px-2 py-0.5 text-xs rounded-full"
                    :class="statusClass(d.status)"
                    >{{ d.status }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detay -->
      <div
        class="bg-white rounded-lg border border-gray-200 p-4 h-fit"
        data-testid="sh-draft-detail"
      >
        <div v-if="!selected" class="text-sm text-gray-400">{{ t("seoHelper.pickDraft") }}</div>
        <div v-else class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <div class="font-semibold text-gray-900">
              {{ t(`seoHelper.type_${selected.draft_type}`, selected.draft_type) }}
            </div>
            <span
              class="inline-block px-2 py-0.5 text-xs rounded-full"
              :class="statusClass(selected.status)"
              >{{ selected.status }}</span
            >
          </div>
          <div class="text-xs text-gray-500">
            {{ selected.client_name }} · {{ selected.store || t("seoHelper.platform") }} ·
            {{ fmt(selected.creation) }}
          </div>
          <div v-if="selected.target_name" class="text-xs">
            {{ t("seoHelper.target") }}: <span class="font-mono">{{ selected.target_name }}</span>
            <a
              :href="`/builder/page/${selected.target_name}`"
              target="_blank"
              class="ml-2 text-brand-800 hover:underline"
              >{{ t("seoHelper.openBuilder") }}</a
            >
          </div>

          <!-- öneri vs mevcut -->
          <div class="rounded-md border border-gray-100">
            <div class="grid grid-cols-2 text-[11px] uppercase text-gray-400 bg-gray-50 px-2 py-1">
              <div>{{ t("seoHelper.proposed") }}</div>
              <div>{{ t("seoHelper.current") }}</div>
            </div>
            <div
              v-for="(v, k) in selected.payload"
              :key="k"
              class="grid grid-cols-2 gap-2 px-2 py-1.5 border-t border-gray-100 text-xs"
            >
              <div class="min-w-0">
                <span class="text-gray-400">{{ k }}:</span>
                <span class="break-words">{{ typeof v === "object" ? JSON.stringify(v) : v }}</span>
              </div>
              <div class="min-w-0 text-gray-600 break-words">
                {{
                  selected.current
                    ? (selected.current[k] ?? selected.current[{ title: "page_title" }[k]] ?? "—")
                    : "—"
                }}
              </div>
            </div>
          </div>

          <!-- doğrulama -->
          <div>
            <div class="text-[11px] uppercase text-gray-400 mb-1">
              {{ t("seoHelper.colValidation") }}
            </div>
            <div
              v-if="selected.validation?.publishable === false"
              class="text-xs text-red-700"
              data-testid="sh-val-fail"
            >
              {{ t("seoHelper.valFailLong") }}
            </div>
            <div v-else class="text-xs text-green-700">{{ t("seoHelper.valOk") }}</div>
            <ul class="mt-1 space-y-0.5">
              <li v-for="(f, i) in selected.validation?.findings || []" :key="i" class="text-xs">
                <span
                  class="inline-block px-1.5 rounded"
                  :class="
                    f.severity === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  "
                  >{{ f.code }}</span
                >
                <span class="text-gray-600 ml-1">{{ f.message }}</span>
              </li>
            </ul>
          </div>

          <div v-if="selected.tool_call" class="text-[11px] text-gray-400">
            {{ selected.tool_call.tool }} · {{ selected.tool_call.duration_ms }} ms ·
            {{ usd(selected.tool_call.cost_usd) }} ·
            {{
              (selected.tool_call.cost_tokens_in || 0) + (selected.tool_call.cost_tokens_out || 0)
            }}
            token
          </div>

          <div v-if="selected.status !== 'draft'" class="text-xs text-gray-500">
            {{ selected.reviewed_by }} · {{ fmt(selected.reviewed_at) }}
            <span v-if="selected.review_note">· {{ selected.review_note }}</span>
          </div>

          <!-- karar -->
          <div v-else>
            <div v-if="!decision" class="flex gap-2">
              <button
                type="button"
                class="hdr-btn-primary"
                data-testid="sh-approve"
                :disabled="selected.validation?.publishable === false"
                :title="
                  selected.validation?.publishable === false ? t('seoHelper.valFailLong') : ''
                "
                @click="decision = 'approve'"
              >
                {{ t("seoHelper.approve") }}
              </button>
              <button
                type="button"
                class="hdr-btn-outlined"
                data-testid="sh-reject"
                @click="decision = 'reject'"
              >
                {{ t("seoHelper.reject") }}
              </button>
            </div>
            <div v-else class="space-y-2" data-testid="sh-decision">
              <div
                class="text-xs"
                :class="decision === 'approve' ? 'text-green-700' : 'text-red-700'"
              >
                {{
                  decision === "approve" ? t("seoHelper.approveHint") : t("seoHelper.rejectHint")
                }}
              </div>
              <textarea
                v-model="note"
                rows="2"
                class="w-full px-2 py-1 text-xs border border-gray-200 rounded-md"
                :placeholder="t('seoHelper.notePlaceholder')"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="hdr-btn-primary"
                  data-testid="sh-decision-confirm"
                  :disabled="busy"
                  @click="confirmDecision"
                >
                  {{ t("seoHelper.confirm") }}
                </button>
                <button type="button" class="hdr-btn-outlined" @click="decision = null">
                  {{ t("seoHelper.cancel") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Sekme 2: Sayfalar & Denetim -->
    <div v-else-if="tab === 'pages'" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            v-model="pageSearch"
            type="text"
            :placeholder="t('seoHelper.searchRoute')"
            class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md"
            data-testid="sh-page-search"
          />
          <select v-model="pageState" class="px-3 py-2 text-sm border border-gray-200 rounded-md">
            <option value="">{{ t("seoHelper.stAll") }}</option>
            <option
              v-for="s in [
                'draft',
                'review',
                'approved',
                'scheduled',
                'published',
                'suspended',
                'archived',
              ]"
              :key="s"
              :value="s"
            >
              {{ s }}
            </option>
          </select>
          <button
            type="button"
            class="hdr-btn-primary"
            data-testid="sh-audit"
            :disabled="busy"
            @click="startAudit"
          >
            {{
              selectedRoutes.size
                ? t("seoHelper.auditSelected", { n: selectedRoutes.size })
                : t("seoHelper.auditAll")
            }}
          </button>
        </div>
        <div
          v-if="!pages.length"
          class="text-center py-10 text-sm text-gray-400 bg-white rounded-lg border border-gray-200"
        >
          {{ t("seoHelper.emptyPages") }}
        </div>
        <div
          v-else
          class="overflow-x-auto bg-white rounded-lg border border-gray-200"
          data-testid="sh-pages-table"
        >
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th class="px-2 py-2"></th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colRoute") }}</th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colStatus") }}</th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colRobots") }}</th>
                <th class="px-3 py-2 text-center">{{ t("seoHelper.colFindings") }}</th>
                <th class="px-3 py-2 text-left">{{ t("seoHelper.colEvaluated") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in pages" :key="p.name" class="hover:bg-gray-50">
                <td class="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedRoutes.has(p.route)"
                    @change="toggleRoute(p.route)"
                  />
                </td>
                <td class="px-3 py-2">
                  <div class="font-mono text-xs">
                    {{ p.route }} <span class="text-gray-400">[{{ p.lang }}]</span>
                  </div>
                  <div class="text-xs text-gray-500 truncate max-w-[26rem]">{{ p.title }}</div>
                </td>
                <td class="px-3 py-2">
                  <span
                    class="inline-block px-2 py-0.5 text-xs rounded-full"
                    :class="statusClass(p.publish_state)"
                    >{{ p.publish_state }}</span
                  >
                  <span v-if="p.indexable" class="ml-1 text-[11px] text-green-700">index</span>
                </td>
                <td class="px-3 py-2 text-xs font-mono">{{ p.effective_robots || "—" }}</td>
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="text-xs hover:underline"
                    :class="
                      p.errors ? 'text-red-700' : p.warnings ? 'text-amber-700' : 'text-gray-400'
                    "
                    @click="openFindings(p)"
                  >
                    {{ p.errors }} / {{ p.warnings }}
                  </button>
                </td>
                <td class="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {{ fmt(p.last_evaluated_at) }}
                  <span class="text-gray-300">v{{ p.data_version }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="space-y-4">
        <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="sh-findings">
          <div class="text-[11px] uppercase text-gray-400 mb-2">
            {{ t("seoHelper.colFindings") }}
            <span v-if="findingsFor" class="font-mono normal-case">{{ findingsFor.route }}</span>
          </div>
          <div v-if="!findingsFor" class="text-xs text-gray-400">{{ t("seoHelper.pickPage") }}</div>
          <div v-else-if="!findings.length" class="text-xs text-green-700">
            {{ t("seoHelper.noFindings") }}
          </div>
          <ul v-else class="space-y-1">
            <li v-for="f in findings" :key="f.name" class="text-xs">
              <span
                class="inline-block px-1.5 rounded"
                :class="
                  f.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                "
                >{{ f.code }}</span
              >
              <span class="text-gray-600 ml-1">{{ f.message }}</span>
            </li>
          </ul>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="text-[11px] uppercase text-gray-400 mb-2">{{ t("seoHelper.crawlRuns") }}</div>
          <div v-if="!crawlRuns.length" class="text-xs text-gray-400">—</div>
          <ul v-else class="space-y-1">
            <li
              v-for="r in crawlRuns"
              :key="r.name"
              class="text-xs flex items-center justify-between gap-2"
            >
              <span class="font-mono">{{ r.name }}</span>
              <span class="inline-block px-2 py-0.5 rounded-full" :class="statusClass(r.status)">{{
                r.status
              }}</span>
              <span class="text-gray-500"
                >{{ r.pages_ok ?? 0 }}/{{ r.pages_total ?? 0 }} · {{ r.findings ?? 0 }}</span
              >
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ── Sekme 3: Kuyruk & MCP -->
    <div v-else class="space-y-4">
      <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="sh-queue">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="text-sm font-semibold text-gray-900">
            {{ t("seoHelper.queue") }}
            <span class="ml-2 text-xs font-normal text-gray-500">
              queued {{ queue.counts.queued ?? 0 }} · running {{ queue.counts.running ?? 0 }} ·
              failed {{ queue.counts.failed ?? 0 }} ·
              <span :class="queue.counts.dead ? 'text-red-600 font-semibold' : ''"
                >dead {{ queue.counts.dead ?? 0 }}</span
              >
              · done {{ queue.counts.done ?? 0 }}
              <span v-if="queue.stuck_30m" class="text-amber-700">
                · {{ t("seoHelper.stuck", { n: queue.stuck_30m }) }}</span
              >
            </span>
          </div>
          <div class="flex gap-2">
            <select
              v-model="queueStatus"
              class="px-2 py-1 text-xs border border-gray-200 rounded-md"
            >
              <option value="">{{ t("seoHelper.stAll") }}</option>
              <option
                v-for="s in ['queued', 'running', 'failed', 'dead', 'done']"
                :key="s"
                :value="s"
              >
                {{ s }}
              </option>
            </select>
            <button
              type="button"
              class="hdr-btn-outlined"
              data-testid="sh-requeue-dead"
              :disabled="!queue.counts.dead"
              @click="requeueDead"
            >
              {{ t("seoHelper.requeueDead") }}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 uppercase text-gray-500">
              <tr>
                <th class="px-2 py-1 text-left">İş</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.colType") }}</th>
                <th class="px-2 py-1">{{ t("seoHelper.queue") }}</th>
                <th class="px-2 py-1">{{ t("seoHelper.colStatus") }}</th>
                <th class="px-2 py-1">#</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.nextAttempt") }}</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.lastError") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="j in queue.rows" :key="j.name">
                <td class="px-2 py-1 font-mono">{{ j.name }}</td>
                <td class="px-2 py-1">{{ j.job_type }}</td>
                <td class="px-2 py-1 text-center">{{ j.queue }}</td>
                <td class="px-2 py-1 text-center">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full"
                    :class="statusClass(j.status)"
                    >{{ j.status }}</span
                  >
                </td>
                <td class="px-2 py-1 text-center">{{ j.attempts }}</td>
                <td class="px-2 py-1">{{ fmt(j.next_attempt_at) }}</td>
                <td class="px-2 py-1 text-gray-500 truncate max-w-[22rem]" :title="j.last_error">
                  {{ j.last_error || "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="sh-clients">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-gray-900">{{ t("seoHelper.clients") }}</div>
          <button
            type="button"
            class="hdr-btn-primary"
            data-testid="sh-new-client"
            @click="showNewClient = !showNewClient"
          >
            {{ t("seoHelper.newClient") }}
          </button>
        </div>

        <div
          v-if="showNewClient"
          class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 p-3 bg-gray-50 rounded-md"
          data-testid="sh-new-client-form"
        >
          <input
            v-model="newClient.client_name"
            class="px-2 py-1 text-sm border border-gray-200 rounded-md"
            :placeholder="t('seoHelper.clientName')"
            data-testid="sh-client-name"
          />
          <select
            v-model="newClient.role"
            class="px-2 py-1 text-sm border border-gray-200 rounded-md"
          >
            <option value="seo_agent">seo_agent</option>
            <option value="content_agent">content_agent</option>
            <option value="auditor">auditor</option>
          </select>
          <input
            v-model.number="newClient.monthly_token_budget"
            type="number"
            min="0"
            class="px-2 py-1 text-sm border border-gray-200 rounded-md"
            :placeholder="t('seoHelper.budget')"
          />
          <input
            v-model="newClient.store"
            class="px-2 py-1 text-sm border border-gray-200 rounded-md"
            :placeholder="t('seoHelper.storeOptional')"
          />
          <div class="sm:col-span-4 flex gap-2">
            <button
              type="button"
              class="hdr-btn-primary"
              data-testid="sh-client-create"
              :disabled="busy || !newClient.client_name"
              @click="submitNewClient"
            >
              {{ t("seoHelper.create") }}
            </button>
            <button type="button" class="hdr-btn-outlined" @click="showNewClient = false">
              {{ t("seoHelper.cancel") }}
            </button>
          </div>
        </div>

        <div
          v-if="issuedKey"
          class="mb-3 p-3 rounded-md border border-amber-300 bg-amber-50"
          data-testid="sh-issued-key"
        >
          <div class="text-xs text-amber-800 mb-1">{{ t("seoHelper.keyOnce") }}</div>
          <div class="flex items-center gap-2">
            <code class="text-xs break-all" data-testid="sh-key-value">{{
              issuedKey.api_key
            }}</code>
            <button type="button" class="hdr-btn-outlined" @click="copyKey">
              {{ t("seoHelper.copy") }}
            </button>
            <button type="button" class="hdr-btn-outlined" @click="issuedKey = null">
              {{ t("seoHelper.close") }}
            </button>
          </div>
        </div>

        <div
          v-if="pendingClientAction"
          class="mb-3 p-3 rounded-md border border-red-200 bg-red-50 text-xs"
          data-testid="sh-client-confirm"
        >
          {{
            pendingClientAction.kind === "rotate"
              ? t("seoHelper.rotateHint")
              : t("seoHelper.disableHint")
          }}
          <div class="flex gap-2 mt-2">
            <button
              type="button"
              class="hdr-btn-primary"
              data-testid="sh-client-confirm-yes"
              :disabled="busy"
              @click="confirmClientAction"
            >
              {{ t("seoHelper.confirm") }}
            </button>
            <button type="button" class="hdr-btn-outlined" @click="pendingClientAction = null">
              {{ t("seoHelper.cancel") }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 uppercase text-gray-500">
              <tr>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.clientName") }}</th>
                <th class="px-2 py-1 text-left">Rol</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.store") }}</th>
                <th class="px-2 py-1">{{ t("seoHelper.monthUsage") }}</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.rotatedAt") }}</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.lastUsed") }}</th>
                <th class="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="c in clients"
                :key="c.name"
                :class="c.enabled ? '' : 'opacity-50'"
                :data-testid="`sh-client-${c.name}`"
              >
                <td class="px-2 py-1">
                  <div class="font-medium">{{ c.client_name }}</div>
                  <div class="font-mono text-gray-400">shc_{{ c.api_key_prefix }}_…</div>
                </td>
                <td class="px-2 py-1">{{ c.role }}</td>
                <td class="px-2 py-1">{{ c.store || t("seoHelper.platform") }}</td>
                <td class="px-2 py-1 text-center">
                  {{ c.month_calls }} · {{ c.tokens_used_month
                  }}<span v-if="c.monthly_token_budget">/{{ c.monthly_token_budget }}</span> ·
                  {{ usd(c.month_usd) }}
                  <span v-if="c.month_errors || c.month_denied" class="text-red-600">
                    · {{ c.month_errors }}e/{{ c.month_denied }}d</span
                  >
                </td>
                <td class="px-2 py-1">{{ fmt(c.key_rotated_at) }}</td>
                <td class="px-2 py-1">{{ fmt(c.last_used_at) }}</td>
                <td class="px-2 py-1 text-right whitespace-nowrap">
                  <template v-if="c.enabled">
                    <button
                      type="button"
                      class="text-brand-800 hover:underline mr-2"
                      :data-testid="`sh-rotate-${c.name}`"
                      @click="pendingClientAction = { kind: 'rotate', client: c.name }"
                    >
                      {{ t("seoHelper.rotate") }}
                    </button>
                    <button
                      type="button"
                      class="text-red-700 hover:underline"
                      @click="pendingClientAction = { kind: 'disable', client: c.name }"
                    >
                      {{ t("seoHelper.disable") }}
                    </button>
                  </template>
                  <span v-else class="text-gray-400">{{ t("seoHelper.disabled") }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4" data-testid="sh-calls">
        <div class="text-sm font-semibold text-gray-900 mb-2">{{ t("seoHelper.toolCalls") }}</div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 uppercase text-gray-500">
              <tr>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.colDate") }}</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.colClient") }}</th>
                <th class="px-2 py-1 text-left">Araç</th>
                <th class="px-2 py-1">{{ t("seoHelper.colStatus") }}</th>
                <th class="px-2 py-1">ms</th>
                <th class="px-2 py-1">$</th>
                <th class="px-2 py-1 text-left">{{ t("seoHelper.lastError") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="k in calls" :key="k.name">
                <td class="px-2 py-1 whitespace-nowrap">{{ fmt(k.creation) }}</td>
                <td class="px-2 py-1">{{ k.client }}</td>
                <td class="px-2 py-1">{{ k.tool }}</td>
                <td class="px-2 py-1 text-center">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full"
                    :class="statusClass(k.result)"
                    >{{ k.result }}</span
                  >
                </td>
                <td class="px-2 py-1 text-center">{{ k.duration_ms }}</td>
                <td class="px-2 py-1 text-center">{{ usd(k.cost_usd) }}</td>
                <td class="px-2 py-1 text-gray-500 truncate max-w-[22rem]" :title="k.error">
                  {{ k.error || "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
