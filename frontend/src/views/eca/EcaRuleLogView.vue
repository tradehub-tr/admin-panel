<template>
  <div class="eca-log-view">
    <header class="log-header">
      <div>
        <h1 class="log-title">
          <AppIcon name="list" :size="22" />
          {{ t("ecaRuleLog.title") }}
        </h1>
        <p class="log-subtitle">{{ t("ecaRuleLog.subtitle") }}</p>
      </div>

      <div class="log-toolbar" data-tour="erl-filters">
        <select v-model="filters.eca_rule" class="log-select" @change="reload">
          <option value="">{{ t("ecaRuleLog.allRules") }}</option>
          <option v-for="r in ruleOptions" :key="r.name" :value="r.name">
            {{ r.rule_name || r.name }}
          </option>
        </select>
        <select v-model="filters.status" class="log-select" @change="reload">
          <option value="">{{ t("ecaRuleLog.allResults") }}</option>
          <option value="Success">{{ t("ecaRuleLog.resultSuccess") }}</option>
          <option value="Condition False">{{ t("ecaRuleLog.resultConditionFalse") }}</option>
          <option value="Error">{{ t("ecaRuleLog.resultError") }}</option>
          <option value="Rate Limited">{{ t("ecaRuleLog.resultRateLimited") }}</option>
        </select>
        <select
          v-model="filters.doctype_filter"
          class="log-select log-select-doctype"
          @change="reload"
        >
          <option value="">{{ t("ecaRuleLog.allDoctypes") }}</option>
          <option value="Listing">Listing</option>
          <option value="Bulk Import Job">Bulk Import Job</option>
          <option value="Order">Order</option>
        </select>
        <button class="btn-outline" @click="reload">{{ t("ecaRuleLog.refresh") }}</button>
      </div>
    </header>

    <div v-if="loading" class="log-loading">{{ t("ecaRuleLog.loading") }}</div>

    <div v-else-if="!logs.length" class="log-empty">
      <AppIcon name="list" :size="32" />
      <p>{{ t("ecaRuleLog.empty") }}</p>
    </div>

    <!-- Mobil: log kartları (tablo yalnızca desktop) -->
    <div v-else-if="!isLg" class="erl-cards" data-tour="erl-table">
      <article
        v-for="row in logs"
        :key="row.name"
        class="erl-card"
        :class="{ 'is-error': row.status === 'Error' }"
      >
        <div class="erl-top">
          <span :class="['badge', statusClass(row.status)]" data-tour="erl-result">
            {{ row.status }}
          </span>
          <span class="erl-time">{{ formatDate(row.triggered_at) }}</span>
        </div>
        <h3 class="erl-name">{{ row.eca_rule }}</h3>
        <p class="erl-sub">
          {{ t("ecaRuleLog.phaseEvent", { phase: row.execution_phase, event: row.event }) }}
        </p>
        <div class="erl-meta">
          <code class="mono">{{ row.reference_doctype }}:{{ row.reference_name }}</code>
          <span class="erl-duration">{{ row.execution_time_ms ?? 0 }} ms</span>
        </div>
        <div v-if="row.bulk_import_job" class="erl-job">
          <span class="erl-job-label">{{ t("ecaRuleLog.colJob") }}</span>
          <code class="mono">{{ row.bulk_import_job }}</code>
        </div>
        <button type="button" class="erl-btn" @click="toggleExpand(row.name)">
          {{ expanded[row.name] ? t("ecaRuleLog.close") : t("ecaRuleLog.detail") }}
        </button>
        <div v-if="expanded[row.name]" class="erl-detail">
          <div>
            <h4>{{ t("ecaRuleLog.snapshotBefore") }}</h4>
            <pre>{{ prettyJson(detailDocs[row.name]?.before) }}</pre>
          </div>
          <div>
            <h4>{{ t("ecaRuleLog.snapshotAfter") }}</h4>
            <pre>{{ prettyJson(detailDocs[row.name]?.after) }}</pre>
          </div>
          <div v-if="row.error_message" class="erl-detail-error">
            <h4>{{ t("ecaRuleLog.errorMessage") }}</h4>
            <pre>{{ row.error_message }}</pre>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="log-table-wrap" data-tour="erl-table">
      <table class="log-table">
        <thead>
          <tr>
            <th>{{ t("ecaRuleLog.colTime") }}</th>
            <th>{{ t("ecaRuleLog.colRule") }}</th>
            <th>{{ t("ecaRuleLog.colDocument") }}</th>
            <th data-tour="erl-result">{{ t("ecaRuleLog.colResult") }}</th>
            <th>{{ t("ecaRuleLog.colDuration") }}</th>
            <th>{{ t("ecaRuleLog.colJob") }}</th>
            <th class="text-right">{{ t("ecaRuleLog.colDetail") }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in logs" :key="row.name">
            <tr :class="{ 'row-error': row.status === 'Error' }">
              <td>{{ formatDate(row.triggered_at) }}</td>
              <td>
                <div class="cell-title">{{ row.eca_rule }}</div>
                <div class="cell-sub">
                  {{ t("ecaRuleLog.phaseEvent", { phase: row.execution_phase, event: row.event }) }}
                </div>
              </td>
              <td>
                <code class="mono"> {{ row.reference_doctype }}:{{ row.reference_name }} </code>
              </td>
              <td>
                <span :class="['badge', statusClass(row.status)]">{{ row.status }}</span>
              </td>
              <td>{{ row.execution_time_ms ?? 0 }} ms</td>
              <td>
                <code v-if="row.bulk_import_job" class="mono">
                  {{ row.bulk_import_job }}
                </code>
                <span v-else class="muted">—</span>
              </td>
              <td class="text-right">
                <button class="btn-link" @click="toggleExpand(row.name)">
                  {{ expanded[row.name] ? t("ecaRuleLog.close") : t("ecaRuleLog.detail") }}
                </button>
              </td>
            </tr>
            <tr v-if="expanded[row.name]" class="detail-row">
              <td colspan="7">
                <div class="detail-grid">
                  <div>
                    <h4>{{ t("ecaRuleLog.snapshotBefore") }}</h4>
                    <pre>{{ prettyJson(detailDocs[row.name]?.before) }}</pre>
                  </div>
                  <div>
                    <h4>{{ t("ecaRuleLog.snapshotAfter") }}</h4>
                    <pre>{{ prettyJson(detailDocs[row.name]?.after) }}</pre>
                  </div>
                  <div v-if="row.error_message" class="detail-error">
                    <h4>{{ t("ecaRuleLog.errorMessage") }}</h4>
                    <pre>{{ row.error_message }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, reactive, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useEcaRule } from "@/composables/useEcaRule";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";

  const { t } = useI18n();
  const { isLg } = useBreakpoint();
  const { fetchRuleLog } = useEcaRule();

  // Sayfa-içi onboarding: filtreler → kayıt tablosu → detay/durum.
  usePageTour("eca-rule-log", () => [
    {
      target: '[data-tour="erl-filters"]',
      title: t("tourSteps.page.erlFilters_t"),
      desc: t("tourSteps.page.erlFilters_d"),
    },
    {
      target: '[data-tour="erl-table"]',
      title: t("tourSteps.page.erlTable_t"),
      desc: t("tourSteps.page.erlTable_d"),
    },
    {
      target: '[data-tour="erl-result"]',
      title: t("tourSteps.page.erlResult_t"),
      desc: t("tourSteps.page.erlResult_d"),
    },
  ]);

  const logs = ref([]);
  const loading = ref(false);
  const expanded = reactive({});
  const detailDocs = reactive({});
  const ruleOptions = ref([]);

  const filters = reactive({
    eca_rule: "",
    status: "",
    doctype_filter: "",
    limit: 100,
  });

  function statusClass(status) {
    if (status === "Success") return "badge-green";
    if (status === "Error") return "badge-red";
    if (status === "Rate Limited") return "badge-amber";
    return "badge-gray";
  }

  function formatDate(dt) {
    if (!dt) return "";
    try {
      const d = new Date(dt.replace(" ", "T"));
      if (Number.isNaN(d.getTime())) return dt;
      return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dt;
    }
  }

  function prettyJson(val) {
    if (val === null || val === undefined) return "—";
    if (typeof val === "string") {
      try {
        return JSON.stringify(JSON.parse(val), null, 2);
      } catch {
        return val;
      }
    }
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }

  async function reload() {
    loading.value = true;
    try {
      const f = {};
      if (filters.eca_rule) f.eca_rule = filters.eca_rule;
      if (filters.status) f.status = filters.status;
      if (filters.doctype_filter) f.doctype_filter = filters.doctype_filter;
      f.limit = filters.limit;
      logs.value = await fetchRuleLog(f);
    } finally {
      loading.value = false;
    }
  }

  async function loadRuleOptions() {
    try {
      const res = await api.getList("ECA Rule", {
        fields: ["name", "rule_name"],
        order_by: "rule_name asc",
        limit_page_length: 200,
      });
      ruleOptions.value = res.data || [];
    } catch {
      ruleOptions.value = [];
    }
  }

  async function loadDetail(logName) {
    try {
      const res = await api.getDoc("ECA Rule Log", logName);
      const doc = res.data || {};
      detailDocs[logName] = {
        before: doc.doc_snapshot_before,
        after: doc.doc_snapshot_after,
      };
    } catch {
      detailDocs[logName] = { before: null, after: null };
    }
  }

  async function toggleExpand(logName) {
    if (expanded[logName]) {
      expanded[logName] = false;
      return;
    }
    expanded[logName] = true;
    if (!detailDocs[logName]) {
      await loadDetail(logName);
    }
  }

  onMounted(async () => {
    await Promise.all([reload(), loadRuleOptions()]);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .eca-log-view {
    max-width: 1300px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .log-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .log-subtitle {
    font-size: 13px;
    color: $l-text-500;
    margin: 4px 0 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  .log-toolbar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .log-select {
    height: 32px;
    padding: 0 10px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: $l-bg;
    color: $l-text-700;
    font-size: 12px;
    outline: none;

    &:focus {
      border-color: $brand;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .btn-outline {
    height: 32px;
    padding: 0 14px;
    background: transparent;
    border: 1px solid $l-border;
    color: $l-text-700;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: $l-bg-subtle;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .log-loading,
  .log-empty {
    padding: 48px 16px;
    text-align: center;
    color: $l-text-500;
    font-size: 14px;
  }

  .log-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .log-table-wrap {
    border: 1px solid $l-border;
    border-radius: 8px;
    overflow: hidden;
    background: $l-bg;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .log-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    thead {
      background: $l-bg-subtle;

      @include dark {
        background: $d-bg-elevated;
      }
    }

    th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: $l-text-500;
      letter-spacing: 0.04em;

      @include dark {
        color: $d-text-muted;
      }
    }

    td {
      padding: 12px;
      border-top: 1px solid $l-border;
      color: $l-text-700;
      vertical-align: top;

      @include dark {
        border-top-color: $d-border-inner;
        color: $d-text;
      }
    }

    tbody tr:not(.detail-row):hover {
      background: $l-bg-subtle;

      @include dark {
        background: $d-bg-hover;
      }
    }

    tr.row-error {
      background: rgba($c-error, 0.05);

      @include dark {
        background: rgba($c-error, 0.12);
      }
    }
  }

  .cell-title {
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  .cell-sub {
    font-size: 11px;
    color: $l-text-500;
    margin-top: 2px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .muted {
    color: $l-text-400;
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 2px 6px;
    border-radius: 4px;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;

    &.badge-gray {
      background: #f3f4f6;
      color: #4b5563;
    }

    &.badge-green {
      background: #d1fae5;
      color: #065f46;
    }

    &.badge-red {
      background: #fee2e2;
      color: #991b1b;
    }

    &.badge-amber {
      background: #fef3c7;
      color: #92400e;
    }
  }

  .text-right {
    text-align: right;
  }

  .btn-link {
    font-size: 12px;
    background: transparent;
    border: 0;
    color: $brand;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    transition: opacity $t-base;

    &:hover {
      opacity: 0.7;
    }
  }

  .detail-row {
    background: $l-bg-subtle;

    @include dark {
      background: $d-bg-elevated;
    }

    td {
      padding: 16px;
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: 880px) {
      grid-template-columns: 1fr;
    }

    h4 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: $l-text-500;
      letter-spacing: 0.04em;
      margin: 0 0 6px;

      @include dark {
        color: $d-text-muted;
      }
    }

    pre {
      margin: 0;
      background: $l-bg;
      border: 1px solid $l-border;
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: $l-text-700;
      max-height: 300px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;

      @include dark {
        background: $d-bg-card;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }

  .detail-error {
    grid-column: 1 / -1;

    pre {
      border-color: $c-error;
      color: $c-error;
    }
  }

  // ── Mobil log kartları (<768px'te tablo yerine) ───────────
  .erl-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .erl-card {
    display: flex;
    flex-direction: column;
    gap: 7px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    padding: 10px 12px;
    min-width: 0;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    &.is-error {
      background: rgba($c-error, 0.04);
      border-color: rgba($c-error, 0.25);

      @include dark {
        background: rgba($c-error, 0.1);
      }
    }
  }
  .erl-top {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .erl-time {
    margin-left: auto;
    font-size: 0.68rem;
    color: $l-text-400;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    @include dark {
      color: $d-text-faint;
    }
  }
  .erl-name {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.35;
    color: $l-text-900;
    overflow-wrap: anywhere;

    @include dark {
      color: $d-text-hi;
    }
  }
  .erl-sub {
    margin: 0;
    font-size: 11px;
    color: $l-text-500;
    overflow-wrap: anywhere;

    @include dark {
      color: $d-text-muted;
    }
  }
  .erl-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;

    code {
      overflow-wrap: anywhere;
    }
  }
  .erl-duration {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }
  .erl-job {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;

    code {
      overflow-wrap: anywhere;
    }
  }
  .erl-job-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }
  .erl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 40px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    color: $brand;
    background: transparent;
    border: 1px solid $l-border;
    border-radius: 9px;
    cursor: pointer;
    transition: background $t-fast;

    @include dark {
      border-color: $d-border;
    }

    &:active {
      background: rgba($brand, 0.08);
    }
  }
  .erl-detail {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid $l-border-alt;

    @include dark {
      border-top-color: $d-border-inner;
    }

    h4 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: $l-text-500;
      letter-spacing: 0.04em;
      margin: 0 0 6px;

      @include dark {
        color: $d-text-muted;
      }
    }

    pre {
      margin: 0;
      background: $l-bg-subtle;
      border: 1px solid $l-border;
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: $l-text-700;
      max-height: 260px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;

      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }
  .erl-detail-error pre {
    border-color: $c-error;
    color: $c-error;
  }

  // ── Mobil düzen ───────────────────────────────────────────
  @media (max-width: 767px) {
    .eca-log-view {
      padding: 16px 0;
    }

    .log-header {
      flex-direction: column;
      align-items: stretch;
    }

    // Simetrik filtre grid'i: kural + sonuç yan yana, doctype ve
    // "Yenile" butonu tam satır (EcaRulesView .eca-toolbar deseni).
    .log-toolbar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .log-select {
      width: 100%;
      height: auto;
      min-height: 42px;
    }
    .log-select-doctype {
      grid-column: 1 / -1;
    }
    .btn-outline {
      grid-column: 1 / -1;
      height: auto;
      min-height: 44px;
      font-size: 13px;
    }
  }
</style>
