<template>
  <div class="eca-rules-view">
    <header class="eca-header">
      <div>
        <h1 class="eca-title">
          <AppIcon name="zap" :size="22" />
          {{ t("ecaRules.title") }}
        </h1>
        <p class="eca-subtitle">
          {{
            t("ecaRules.summary", {
              platform: summary.platformCount,
              seller: summary.sellerCount,
              active: summary.activeCount,
            })
          }}
        </p>
      </div>

      <div class="eca-toolbar" data-tour="erv-filters">
        <select v-model="filters.scope" class="eca-select" @change="reload">
          <option value="">{{ t("ecaRules.allScopes") }}</option>
          <option value="Platform">Platform</option>
          <option value="Per-Seller">Per-Seller</option>
        </select>

        <select
          v-if="filters.scope !== 'Platform'"
          v-model="filters.seller"
          class="eca-select eca-select-seller"
          @change="reload"
        >
          <option value="">{{ t("ecaRules.allSellers") }}</option>
          <option v-for="s in sellers" :key="s.name" :value="s.name">
            {{ s.seller_name || s.name }}
          </option>
        </select>

        <select v-model="filters.enabled" class="eca-select" @change="reload">
          <option value="">{{ t("ecaRules.allStatuses") }}</option>
          <option value="1">{{ t("ecaRules.active") }}</option>
          <option value="0">{{ t("ecaRules.inactive") }}</option>
        </select>

        <button class="btn-primary" data-tour="erv-new" @click="goNew">
          {{ t("ecaRules.addPlatformRule") }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="eca-loading">{{ t("ecaRules.loading") }}</div>

    <div v-else-if="!rules.length" class="eca-empty">
      <AppIcon name="zap" :size="32" />
      <p>{{ t("ecaRules.empty") }}</p>
    </div>

    <!-- Mobil: kural kartları (tablo yalnızca desktop) -->
    <div v-else-if="!isLg" class="eca-cards" data-tour="erv-table">
      <article v-for="r in rules" :key="r.name" class="eca-card" :class="{ off: !r.enabled }">
        <div class="ec-top">
          <h3 class="ec-name">{{ r.rule_name || r.name }}</h3>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="!!r.enabled"
              @change="onToggle(r, $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <p class="ec-meta">
          {{ r.reference_doctype }} · {{ r.event }} ·
          {{ t("ecaRules.priority", { priority: r.priority }) }}
        </p>
        <div class="ec-chips">
          <span :class="['badge', r.rule_scope === 'Platform' ? 'badge-gray' : 'badge-brand']">
            {{ r.rule_scope }}
          </span>
          <span v-if="r.execution_phase" :class="['badge', phaseClass(r.execution_phase)]">
            {{ r.execution_phase }}
          </span>
          <span class="ec-owner">
            {{ r.rule_scope === "Platform" ? t("ecaRules.ownerAdmin") : r.seller_profile || "—" }}
          </span>
          <span class="ec-fired" :title="t('ecaRules.colTriggers')">
            <AppIcon name="zap" :size="11" />
            {{ r.total_fired_count ?? 0 }}
          </span>
        </div>
        <div class="ec-actions">
          <button type="button" class="ec-btn" @click="goEdit(r)">
            <AppIcon name="pencil" :size="13" />
            {{ t("ecaRules.edit") }}
          </button>
          <button type="button" class="ec-btn danger" @click="onDelete(r)">
            <AppIcon name="trash-2" :size="13" />
            {{ t("ecaRules.delete") }}
          </button>
        </div>
      </article>
    </div>

    <div v-else class="eca-table-wrap" data-tour="erv-table">
      <table class="eca-table">
        <thead>
          <tr>
            <th>{{ t("ecaRules.colRule") }}</th>
            <th>{{ t("ecaRules.colScope") }}</th>
            <th>{{ t("ecaRules.colOwner") }}</th>
            <th>{{ t("ecaRules.colPhase") }}</th>
            <th>{{ t("ecaRules.colTriggers") }}</th>
            <th class="text-center">{{ t("ecaRules.colActive") }}</th>
            <th class="text-right">{{ t("ecaRules.colActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.name">
            <td>
              <div class="cell-title">{{ r.rule_name || r.name }}</div>
              <div class="cell-sub">
                {{ r.reference_doctype }} · {{ r.event }} ·
                {{ t("ecaRules.priority", { priority: r.priority }) }}
              </div>
            </td>
            <td>
              <span :class="['badge', r.rule_scope === 'Platform' ? 'badge-gray' : 'badge-brand']">
                {{ r.rule_scope }}
              </span>
            </td>
            <td>
              <span v-if="r.rule_scope === 'Platform'">{{ t("ecaRules.ownerAdmin") }}</span>
              <span v-else>{{ r.seller_profile || "—" }}</span>
            </td>
            <td>
              <span :class="['badge', phaseClass(r.execution_phase)]">
                {{ r.execution_phase || "—" }}
              </span>
            </td>
            <td>{{ r.total_fired_count ?? 0 }}</td>
            <td class="text-center">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="!!r.enabled"
                  @change="onToggle(r, $event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </label>
            </td>
            <td class="text-right">
              <button class="btn-link" @click="goEdit(r)">{{ t("ecaRules.edit") }}</button>
              <button class="btn-link danger" @click="onDelete(r)">
                {{ t("ecaRules.delete") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, reactive, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useEcaRule } from "@/composables/useEcaRule";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";

  const { t } = useI18n();
  const { isLg } = useBreakpoint();
  const router = useRouter();
  const { rules, loading, fetchAllRules, toggleRule, deleteRule } = useEcaRule();

  // Sayfa-içi onboarding: filtreler → kurallar tablosu → yeni kural.
  usePageTour("eca-rules", () => [
    {
      target: '[data-tour="erv-filters"]',
      title: t("tourSteps.page.ervFilters_t"),
      desc: t("tourSteps.page.ervFilters_d"),
    },
    {
      target: '[data-tour="erv-table"]',
      title: t("tourSteps.page.ervTable_t"),
      desc: t("tourSteps.page.ervTable_d"),
    },
    {
      target: '[data-tour="erv-new"]',
      title: t("tourSteps.page.ervNew_t"),
      desc: t("tourSteps.page.ervNew_d"),
    },
  ]);

  const filters = reactive({
    scope: "",
    seller: "",
    enabled: "",
  });

  const sellers = ref([]);

  const summary = computed(() => {
    const platform = rules.value.filter((r) => r.rule_scope === "Platform").length;
    const seller = rules.value.filter((r) => r.rule_scope === "Per-Seller").length;
    const active = rules.value.filter((r) => !!r.enabled).length;
    return { platformCount: platform, sellerCount: seller, activeCount: active };
  });

  function phaseClass(phase) {
    if (phase === "Admin") return "badge-amber";
    if (phase === "Seller") return "badge-blue";
    return "badge-gray";
  }

  function buildFilters() {
    const f = {};
    if (filters.scope) f.rule_scope = filters.scope;
    if (filters.seller) f.seller_profile = filters.seller;
    if (filters.enabled !== "") f.enabled = Number(filters.enabled);
    return f;
  }

  async function reload() {
    await fetchAllRules(buildFilters());
  }

  async function loadSellers() {
    try {
      const res = await api.getList("Admin Seller Profile", {
        fields: ["name", "seller_name"],
        order_by: "seller_name asc",
        limit_page_length: 100,
      });
      sellers.value = res.data || [];
    } catch {
      sellers.value = [];
    }
  }

  function goNew() {
    router.push({ path: "/eca-rules/new", query: { scope: "Platform" } });
  }

  function goEdit(r) {
    router.push(`/eca-rules/${encodeURIComponent(r.name)}`);
  }

  async function onToggle(r, checked) {
    await toggleRule(r.name, checked);
  }

  async function onDelete(r) {
    if (!confirm(t("ecaRules.deleteConfirm", { name: r.rule_name }))) return;
    try {
      await deleteRule(r.name);
    } catch {
      /* toast composable tarafından */
    }
  }

  onMounted(async () => {
    await Promise.all([reload(), loadSellers()]);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .eca-rules-view {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .eca-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .eca-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 700;
    color: $l-text-900;
    margin: 0;

    @include dark {
      color: $d-text;
    }
  }

  .eca-subtitle {
    font-size: 13px;
    color: $l-text-500;
    margin: 4px 0 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  .eca-toolbar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .eca-select {
    height: 32px;
    padding: 0 10px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: $l-bg;
    color: $l-text-700;
    font-size: 12px;
    outline: none;
    transition: border-color $t-base;

    &:focus {
      border-color: $brand;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .btn-primary {
    height: 32px;
    padding: 0 14px;
    background: $brand;
    color: #fff;
    border: 0;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: darken(#f5b800, 6%);
    }
  }

  .eca-loading,
  .eca-empty {
    padding: 48px 16px;
    text-align: center;
    color: $l-text-500;
    font-size: 14px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .eca-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .eca-table-wrap {
    border: 1px solid $l-border;
    border-radius: 8px;
    overflow: hidden;
    background: $l-bg;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .eca-table {
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
      vertical-align: middle;

      @include dark {
        border-top-color: $d-border-inner;
        color: $d-text;
      }
    }

    tbody tr:hover {
      background: $l-bg-subtle;

      @include dark {
        background: $d-bg-hover;
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

    &.badge-brand {
      background: rgba($brand, 0.12);
      color: $brand;
    }

    &.badge-amber {
      background: #fef3c7;
      color: #92400e;
    }

    &.badge-blue {
      background: #dbeafe;
      color: #1e40af;
    }

    &.badge-green {
      background: #d1fae5;
      color: #065f46;
    }

    &.badge-red {
      background: #fee2e2;
      color: #991b1b;
    }
  }

  .text-center {
    text-align: center;
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

    &.danger {
      color: $c-error;
    }
  }

  .toggle {
    display: inline-flex;
    position: relative;
    width: 36px;
    height: 20px;
    cursor: pointer;

    input {
      opacity: 0;
      width: 0;
      height: 0;
    }
  }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: #cbd5e1;
    border-radius: 999px;
    transition: background $t-base;

    &::before {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform $t-base;
    }
  }

  .toggle input:checked + .toggle-slider {
    background: $c-success;

    &::before {
      transform: translateX(16px);
    }
  }

  // ── Mobil kural kartları (<768px'te tablo yerine) ─────────
  .eca-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .eca-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 12px 13px;
    display: flex;
    flex-direction: column;
    gap: 7px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    &.off {
      .ec-name,
      .ec-meta,
      .ec-chips {
        opacity: 0.55;
      }
    }
  }
  .ec-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .ec-name {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.35;
    color: $l-text-900;
    min-width: 0;

    @include dark {
      color: $d-text-hi;
    }
  }
  .ec-top .toggle {
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ec-meta {
    margin: 0;
    font-size: 11px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }
  .ec-chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ec-owner {
    font-size: 11px;
    font-weight: 600;
    color: $l-text-600;
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include dark {
      color: $d-text-muted;
    }
  }
  .ec-fired {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: auto;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }
  .ec-actions {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid $l-border-alt;

    @include dark {
      border-top-color: $d-border-inner;
    }
  }
  .ec-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 38px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    color: $l-text-700;
    background: transparent;
    border: 1px solid $l-border;
    border-radius: 9px;
    cursor: pointer;
    transition: background $t-fast;

    @include dark {
      color: $d-text-hi;
      border-color: $d-border;
    }

    &:active {
      background: rgba($brand, 0.08);
    }

    &.danger {
      color: $c-error;
      border-color: rgba($c-error, 0.3);
    }
  }

  // ── Mobil düzen ───────────────────────────────────────────
  @media (max-width: 767px) {
    .eca-rules-view {
      padding: 16px 0;
    }

    .eca-header {
      flex-direction: column;
      align-items: stretch;
    }

    // Simetrik filtre grid'i: kapsam + durum yan yana, satıcı ve buton tam
    // satır. dense akış, koşullu satıcı select'inin bıraktığı boşluğu doldurur.
    .eca-toolbar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-auto-flow: dense;
      gap: 8px;
    }
    .eca-select {
      width: 100%;
      height: auto;
      min-height: 42px;
    }
    .eca-select-seller {
      grid-column: 1 / -1;
    }
    .btn-primary {
      grid-column: 1 / -1;
      height: auto;
      min-height: 44px;
      font-size: 13px;
    }
  }
</style>
