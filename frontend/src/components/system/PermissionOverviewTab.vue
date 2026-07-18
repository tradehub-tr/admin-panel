<script setup>
  /**
   * Sprint 6 — Süper Admin RBAC Genel Bakış Tab.
   *
   * Backend:
   *   - tradehub_core.api.v1.permission_console.list_capabilities
   *   - tradehub_core.api.v1.permission_console.list_modules_tree(panel)
   *   - tradehub_core.api.v1.permission_console.list_rbac_audit(limit)
   *
   * İçerik:
   *   1. RBAC-spesifik mini KPI grid (capability, grant, modül, policy sayıları)
   *   2. Audit timeline (TH Capability + TH Module değişiklik akışı)
   *   3. Tab geçiş kısayolları (Capability / Modüller tab'larına emit)
   *
   * @emits switch-tab(tabId) — parent PermissionConsoleView yakalar.
   */

  import { computed, onMounted, ref } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const emit = defineEmits(["switch-tab"]);
  const toast = useToast();

  const loading = ref(false);
  const error = ref(null);
  const capabilities = ref([]);
  const modules = ref([]);
  const auditEntries = ref([]);
  const auditLimit = ref(20);

  // Sprint 5 — Plan sync state
  const planSyncStats = ref({
    total_plan_gated: 0,
    unsynced_count: 0,
    fully_synced_count: 0,
  });
  const planSyncCapabilities = ref([]);

  // ──────────────────────────────────────────────────────────────────────
  // Computed
  // ──────────────────────────────────────────────────────────────────────

  const capabilityCount = computed(() => capabilities.value.length);
  const ownerOnlyCount = computed(() => capabilities.value.filter((c) => c.is_owner_only).length);
  const protectedCapCount = computed(() => capabilities.value.filter((c) => c.is_protected).length);
  const grantCount = computed(() =>
    capabilities.value.reduce((sum, c) => sum + (c.grants?.length || 0), 0)
  );

  const moduleCount = computed(() => modules.value.length);
  const sectionCount = computed(
    () => modules.value.filter((m) => m.item_type === "section").length
  );
  const policyCount = computed(() => {
    let total = 0;
    for (const m of modules.value) {
      if (m.policies) total += Object.keys(m.policies).length;
    }
    return total;
  });

  const hiddenPolicyCount = computed(() => {
    let total = 0;
    for (const m of modules.value) {
      for (const profile in m.policies || {}) {
        if (m.policies[profile] === "hidden") total++;
      }
    }
    return total;
  });

  // Audit timeline aktivite tipi sınıflandırma (görsel için)
  function entrySource(e) {
    if (e.source === "FieldMask") return "field-mask";
    const dt = e.target_doctype || "";
    if (dt === "TH Capability Registry") return "cap-reg";
    if (dt === "TH Capability Grant") return "cap-grant";
    if (dt === "TH Module Registry") return "mod-reg";
    if (dt === "TH Module Policy") return "mod-policy";
    return "other";
  }

  function entryIcon(e) {
    const src = entrySource(e);
    if (src === "field-mask") return "eye-off";
    if (src.startsWith("cap")) return "shield-check";
    if (src.startsWith("mod")) return "layout-grid";
    return "file-text";
  }

  function entryShortType(e) {
    if (e.source === "FieldMask") return "Maskeleme";
    const dt = e.target_doctype || "";
    if (dt === "TH Capability Registry") return "Capability";
    if (dt === "TH Capability Grant") return "Grant";
    if (dt === "TH Module Registry") return "Modül";
    if (dt === "TH Module Policy") return "Policy";
    return dt;
  }

  function relativeTime(ts) {
    if (!ts) return "—";
    const date = new Date(ts.replace(" ", "T"));
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return formatTime(date);
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "az önce";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} dk önce`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} sa önce`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day} gün önce`;
    return formatTime(date);
  }

  function formatTime(date) {
    const opts = {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    try {
      return new Intl.DateTimeFormat("tr-TR", opts).format(date);
    } catch {
      return date.toISOString().slice(0, 16).replace("T", " ");
    }
  }

  function actorShort(actor) {
    if (!actor) return "—";
    if (actor.includes("@")) return actor.split("@")[0];
    return actor;
  }

  // ──────────────────────────────────────────────────────────────────────
  // API
  // ──────────────────────────────────────────────────────────────────────

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const [capsRes, modsRes, auditRes, planSyncRes] = await Promise.all([
        api.callMethodGET("tradehub_core.api.v1.permission_console.list_capabilities"),
        api.callMethodGET("tradehub_core.api.v1.permission_console.list_modules_tree", {
          panel: "seller",
        }),
        api.callMethodGET("tradehub_core.api.v1.permission_console.list_rbac_audit", {
          limit: auditLimit.value,
        }),
        api.callMethodGET("tradehub_core.api.v1.permission_console.list_plan_capability_sync"),
      ]);
      capabilities.value = capsRes?.message?.capabilities || [];
      modules.value = modsRes?.message?.modules || [];
      auditEntries.value = auditRes?.message?.entries || [];
      planSyncStats.value = planSyncRes?.message?.stats || {
        total_plan_gated: 0,
        unsynced_count: 0,
        fully_synced_count: 0,
      };
      planSyncCapabilities.value =
        planSyncRes?.message?.capabilities?.filter((c) => c.is_unsynced) || [];
    } catch (e) {
      error.value = e?.message || "Veri yüklenemedi";
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function loadMoreAudit() {
    auditLimit.value = Math.min(auditLimit.value + 30, 200);
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.permission_console.list_rbac_audit",
        { limit: auditLimit.value }
      );
      auditEntries.value = res?.message?.entries || auditEntries.value;
    } catch (e) {
      toast.error(e?.message || "Audit yüklenemedi");
    }
  }

  onMounted(fetchAll);
</script>

<template>
  <div class="overview">
    <header class="ov-header">
      <div>
        <h2 class="title">RBAC Genel Bakış</h2>
        <p class="subtitle">Capability, modül ve son değişiklik akışı — tek panelden.</p>
      </div>
      <button
        type="button"
        class="btn ghost"
        :disabled="loading"
        :aria-busy="loading"
        @click="fetchAll"
      >
        <AppIcon name="refresh-cw" :size="14" />
        Yenile
      </button>
    </header>

    <div v-if="error" class="state-msg error">{{ error }}</div>

    <!-- KPI grid -->
    <section class="kpis" :aria-busy="loading">
      <button
        type="button"
        class="kpi kpi--capability"
        :title="'Capability sekmesine geç'"
        @click="emit('switch-tab', 'capabilities')"
      >
        <header class="kpi-head">
          <AppIcon name="shield-check" :size="16" />
          <span>Capability</span>
        </header>
        <div class="kpi-value">{{ capabilityCount || "—" }}</div>
        <footer class="kpi-foot">
          {{ ownerOnlyCount }} owner-only · {{ protectedCapCount }} korumalı
        </footer>
      </button>

      <button type="button" class="kpi kpi--grants" @click="emit('switch-tab', 'capabilities')">
        <header class="kpi-head">
          <AppIcon name="key-round" :size="16" />
          <span>Aktif Grant</span>
        </header>
        <div class="kpi-value">{{ grantCount || "—" }}</div>
        <footer class="kpi-foot">role × capability eşleşmesi</footer>
      </button>

      <button type="button" class="kpi kpi--modules" @click="emit('switch-tab', 'modules')">
        <header class="kpi-head">
          <AppIcon name="layout-grid" :size="16" />
          <span>Modüller</span>
        </header>
        <div class="kpi-value">{{ moduleCount || "—" }}</div>
        <footer class="kpi-foot">{{ sectionCount }} section</footer>
      </button>

      <button type="button" class="kpi kpi--policies" @click="emit('switch-tab', 'modules')">
        <header class="kpi-head">
          <AppIcon name="eye-off" :size="16" />
          <span>Policy</span>
        </header>
        <div class="kpi-value">{{ policyCount || "—" }}</div>
        <footer class="kpi-foot">{{ hiddenPolicyCount }} hidden kaydı</footer>
      </button>

      <button
        type="button"
        class="kpi kpi--plan"
        :class="{ 'is-alert': planSyncStats.unsynced_count > 0 }"
        @click="emit('switch-tab', 'capabilities')"
      >
        <header class="kpi-head">
          <AppIcon name="gem" :size="16" />
          <span>Plan Tutarlılık</span>
        </header>
        <div class="kpi-value">
          {{
            planSyncStats.unsynced_count > 0
              ? planSyncStats.unsynced_count
              : planSyncStats.total_plan_gated || "—"
          }}
        </div>
        <footer class="kpi-foot">
          {{
            planSyncStats.unsynced_count > 0
              ? `${planSyncStats.unsynced_count} / ${planSyncStats.total_plan_gated} tutarsız`
              : `${planSyncStats.total_plan_gated} plan-gated capability`
          }}
        </footer>
      </button>
    </section>

    <!-- Sprint 5 — Plan tutarsızlık uyarı bandı -->
    <section v-if="planSyncStats.unsynced_count > 0" class="plan-warning-banner" role="alert">
      <div class="banner-icon">
        <AppIcon name="alert-triangle" :size="20" />
      </div>
      <div class="banner-body">
        <h3 class="banner-title">
          {{ planSyncStats.unsynced_count }} capability hiçbir abonelik planında listelenmemiş
        </h3>
        <p class="banner-text">
          Bu capability'lere grant verilse bile kullanıcı çağrıda red alır:
          <code v-for="(c, idx) in planSyncCapabilities" :key="c.key" class="banner-cap">
            {{ c.key }}<span v-if="idx < planSyncCapabilities.length - 1">,</span>
          </code>
        </p>
      </div>
      <button type="button" class="banner-cta" @click="emit('switch-tab', 'capabilities')">
        Düzelt →
      </button>
    </section>

    <!-- Audit timeline -->
    <section class="audit-block">
      <header class="audit-header">
        <h3>Son Aktivite</h3>
        <span class="audit-meta">{{ auditEntries.length }} kayıt</span>
      </header>

      <ul v-if="auditEntries.length" class="audit-list">
        <li
          v-for="(e, idx) in auditEntries"
          :key="`${e.target_name}|${e.timestamp}|${idx}`"
          class="audit-item"
          :class="`src--${entrySource(e)}`"
        >
          <div class="audit-icon" :class="`src--${entrySource(e)}`">
            <AppIcon :name="entryIcon(e)" :size="14" />
          </div>
          <div class="audit-body">
            <div class="audit-line1">
              <span class="audit-type">{{ entryShortType(e) }}</span>
              <span class="audit-target">{{ e.target_name }}</span>
            </div>
            <div class="audit-line2">
              <span class="audit-actor">{{ actorShort(e.actor) }}</span>
              <span class="audit-sep">·</span>
              <time class="audit-time" :title="e.timestamp">{{ relativeTime(e.timestamp) }}</time>
            </div>
          </div>
        </li>
      </ul>
      <div v-else-if="!loading" class="empty">Henüz değişiklik yok.</div>
      <div v-else class="empty">Yükleniyor…</div>

      <footer v-if="auditEntries.length && auditLimit < 200" class="audit-footer">
        <button type="button" class="btn ghost" :disabled="loading" @click="loadMoreAudit">
          Daha fazla göster
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .overview {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  // ── Header ────────────────────────────────────────────
  .ov-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  .subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background $t-fast,
      opacity $t-fast;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  .btn.ghost {
    background: transparent;
    border-color: $l-border;
    color: $l-text-700;
    @include dark {
      border-color: $d-border;
      color: $d-text;
    }
    &:not(:disabled):hover {
      background: $l-bg-soft;
      @include dark {
        background: $d-bg-hover;
      }
    }
  }

  .state-msg {
    padding: 12px;
    text-align: center;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    &.error {
      color: $c-error;
    }
  }

  // ── KPI ───────────────────────────────────────────────
  .kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .kpi {
    text-align: left;
    background: $l-bg-soft;
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 12px 14px;
    cursor: pointer;
    transition:
      border-color $t-fast,
      background $t-fast,
      transform $t-fast;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    &:hover {
      border-color: $brand;
      background: $l-bg;
      @include dark {
        background: $d-bg-elevated;
      }
    }
    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 2px;
    }
  }
  .kpi-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .kpi-value {
    margin-top: 4px;
    font-size: 24px;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .kpi-foot {
    margin-top: 2px;
    font-size: 11px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .kpi--capability {
    .kpi-head {
      color: $brand;
    }
  }
  .kpi--grants {
    .kpi-head {
      color: $c-success;
    }
  }
  .kpi--modules {
    .kpi-head {
      color: #6366f1;
    }
  }
  .kpi--policies {
    .kpi-head {
      color: $c-warning;
    }
  }
  .kpi--plan {
    .kpi-head {
      color: #a855f7;
    }
    &.is-alert {
      border-color: $c-error;
      background: rgba($c-error, 0.04);
      .kpi-head {
        color: $c-error;
      }
      .kpi-value {
        color: $c-error;
      }
    }
  }

  // ── Mobil (<768px): KPI'lar 2×2 mini grid, Plan Tutarlılık tam satır bant ──
  // auto-fit minmax(180px) 320px'te tek sütuna düşüp kutuları devleştiriyordu.
  @media (max-width: 767px) {
    // Dış katmanlar (page-content 16px + tab-content 12px) zaten pad'liyor;
    // içteki üçüncü padding katmanı yatay alanı boşa yiyordu.
    .overview {
      padding: 0;
      gap: 12px;
    }

    .kpis {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .kpi {
      padding: 9px 10px;
      border-radius: 10px;
      min-width: 0;
    }
    .kpi-head {
      gap: 5px;
      font-size: 9.5px;
      // İki kelimeli etiketler ("Aktif Grant") dar kutuda 2 satıra kırılır;
      // sabit yükseklik tüm kutularda değerleri aynı hizada tutar.
      align-items: flex-start;
      min-height: 24px;

      svg {
        width: 13px;
        height: 13px;
        margin-top: 1px;
      }
    }
    .kpi-value {
      margin-top: 3px;
      font-size: 20px;
    }
    .kpi-foot {
      font-size: 9.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    // Tek sayıda KPI'nın 5.'si: tam genişlik yatay bant (is-alert kırmızısı
    // aynen çalışır — uyarı verebilen tek KPI'ya görünür bir sahne).
    .kpi--plan {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;

      .kpi-head {
        order: 1;
        flex-shrink: 0;
        min-height: 0;
        align-items: center;
      }
      .kpi-foot {
        order: 2;
        flex: 1;
        min-width: 0;
        margin-top: 0;
      }
      .kpi-value {
        order: 3;
        margin-top: 0;
        font-size: 17px;
      }
    }
  }

  // ── Plan tutarsızlık banner ──────────────────────────
  .plan-warning-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: rgba($c-error, 0.06);
    border: 1px solid rgba($c-error, 0.3);
    border-left: 4px solid $c-error;
    border-radius: 8px;
    @include dark {
      background: rgba($c-error, 0.1);
    }
  }
  .banner-icon {
    flex-shrink: 0;
    color: $c-error;
    background: rgba($c-error, 0.12);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .banner-body {
    flex: 1;
    min-width: 0;
  }
  .banner-title {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .banner-text {
    margin: 0;
    font-size: 12px;
    color: $l-text-700;
    line-height: 1.5;
    @include dark {
      color: $d-text;
    }
  }
  .banner-cap {
    display: inline-block;
    padding: 1px 6px;
    margin: 0 2px;
    font-family:
      ui-monospace,
      JetBrains Mono,
      monospace;
    font-size: 11px;
    background: rgba($c-error, 0.12);
    color: $c-error;
    border-radius: 4px;
  }
  .banner-cta {
    flex-shrink: 0;
    padding: 7px 14px;
    border-radius: 6px;
    border: none;
    background: $c-error;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-fast;
    &:hover {
      background: darken($c-error, 8%);
    }
  }

  // ── Audit ─────────────────────────────────────────────
  .audit-block {
    background: $l-bg-soft;
    border: 1px solid $l-border;
    border-radius: 8px;
    overflow: hidden;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .audit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid $l-border;
    background: $l-bg;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
  }
  .audit-meta {
    font-size: 11px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .audit-list {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 460px;
    overflow-y: auto;
  }
  .audit-item {
    display: flex;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border-inner;
    }
    &:last-child {
      border-bottom: none;
    }
  }
  .audit-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba($brand, 0.1);
    color: $brand;
    &.src--cap-reg,
    &.src--cap-grant {
      background: rgba($brand, 0.12);
      color: $brand;
    }
    &.src--mod-reg,
    &.src--mod-policy {
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
    }
    &.src--field-mask {
      background: rgba($c-warning, 0.12);
      color: $c-warning;
    }
    &.src--other {
      background: rgba($l-text-500, 0.1);
      color: $l-text-500;
    }
  }
  .audit-body {
    flex: 1;
    min-width: 0;
  }
  .audit-line1 {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .audit-type {
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .audit-target {
    font-family:
      ui-monospace,
      JetBrains Mono,
      monospace;
    font-size: 11px;
    color: $l-text-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-muted;
    }
  }
  .audit-line2 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 11px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .audit-actor {
    font-weight: 500;
  }
  .audit-sep {
    opacity: 0.5;
  }
  .audit-footer {
    padding: 8px 14px;
    text-align: center;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .empty {
    padding: 24px;
    text-align: center;
    font-size: 13px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
</style>
