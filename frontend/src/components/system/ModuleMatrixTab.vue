<script setup>
  /**
   * Sprint 6 — Süper Admin Module Matrix Tab.
   *
   * Backend: tradehub_core.api.v1.permission_console
   *   - list_modules_tree(panel)      → tree + policy matrisi
   *   - update_module_policy()        → tek hücre toggle
   *
   * Etkileşim:
   *   - Hücreye tek tıkla mod döngüsü: ● visible → ○ hidden → ◐ masked → ●
   *     Korumalı modülde hidden adımı atlanır (visible ↔ masked).
   *   - Pending değişiklikler turuncu border ile işaretli, üst bar'da sayı.
   *   - Kaydet → sırayla update_module_policy POST, sonra fetch.
   *
   * Tree:
   *   - Backend `lft` ASC sıralı döner → depth-first sıra garantili.
   *   - Depth: section=0, group=1, item=2 (item_type'tan çıkarsama).
   *   - Section/group satırlarında collapse toggle (chevron).
   */

  import { computed, onMounted, ref } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const toast = useToast();

  const PANELS = [
    { id: "seller", label: "Satıcı (Mağazam)" },
    { id: "admin", label: "Admin Panel" },
  ];

  // Faz F.2 — visible/masked/hidden 3-state cycle map (export'a açık değil;
  // referans olarak tutuluyor — koruma listesinde kalsın diye underscore).

  const _MODES = ["visible", "masked", "hidden"];
  const MODE_NEXT = { visible: "hidden", hidden: "masked", masked: "visible" };
  const MODE_NEXT_PROTECTED = { visible: "masked", masked: "visible", hidden: "visible" };

  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const modules = ref([]);
  const roleProfiles = ref([]);

  const panel = ref("seller");
  const searchQuery = ref("");
  const collapsedKeys = ref(new Set());
  const selectedModule = ref(null);

  // Sprint 6 — Korumalı modüle hidden tıklama denemesinde modal
  const protectedConfirm = ref(null); // { module, attemptedMode } | null

  // Map<"profile||module_key", "visible"|"masked"|"hidden">
  const pendingChanges = ref(new Map());

  // ──────────────────────────────────────────────────────────────────────
  // Computed
  // ──────────────────────────────────────────────────────────────────────

  const modulesByKey = computed(() => {
    const map = new Map();
    for (const m of modules.value) map.set(m.key, m);
    return map;
  });

  function depthOf(m) {
    if (m.item_type === "section") return 0;
    if (m.item_type === "group") return 1;
    return 2;
  }

  function ancestorKeys(m) {
    const chain = [];
    let cur = m;
    while (cur?.parent) {
      const parent = modulesByKey.value.get(cur.parent);
      if (!parent) break;
      chain.push(parent.key);
      cur = parent;
    }
    return chain;
  }

  function isRowVisible(m) {
    // Atalardan biri collapsed ise satır gizlenir
    for (const k of ancestorKeys(m)) {
      if (collapsedKeys.value.has(k)) return false;
    }
    return true;
  }

  function matchesSearch(m) {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return true;
    return (
      m.key.toLowerCase().includes(q) ||
      (m.label || "").toLowerCase().includes(q) ||
      (m.section_key || "").toLowerCase().includes(q)
    );
  }

  const renderedModules = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) {
      return modules.value.filter(isRowVisible);
    }
    // Arama varken: eşleşen satırların atalarını da göster
    const matched = new Set();
    for (const m of modules.value) {
      if (matchesSearch(m)) {
        matched.add(m.key);
        for (const ak of ancestorKeys(m)) matched.add(ak);
      }
    }
    return modules.value.filter((m) => matched.has(m.key));
  });

  const pendingCount = computed(() => pendingChanges.value.size);

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────

  function cellKey(profile, moduleKey) {
    return `${profile}||${moduleKey}`;
  }

  function originalMode(m, profile) {
    return m.policies?.[profile] || "visible";
  }

  function effectiveMode(m, profile) {
    const k = cellKey(profile, m.key);
    if (pendingChanges.value.has(k)) return pendingChanges.value.get(k);
    return originalMode(m, profile);
  }

  function isPending(m, profile) {
    return pendingChanges.value.has(cellKey(profile, m.key));
  }

  function toggleCell(m, profile) {
    const current = effectiveMode(m, profile);
    // Korumalı modülde cycle visible↔masked (hidden adımı yasak). İlk kez
    // visible'dan ayrılırken süper admin'in "neden hidden yapamıyorum?"
    // sorusunu cevaplamak için bilgilendirme modali tek seferlik açılır,
    // ama cycle'ı bloklamaz — masked'e geçiş yine kayıt edilir.
    const next = m.is_protected
      ? MODE_NEXT_PROTECTED[current] || "visible"
      : MODE_NEXT[current] || "visible";
    if (m.is_protected && current === "visible") {
      openProtectedConfirm(m);
    }
    const k = cellKey(profile, m.key);
    const original = originalMode(m, profile);
    if (next === original) {
      pendingChanges.value.delete(k);
    } else {
      pendingChanges.value.set(k, next);
    }
    pendingChanges.value = new Map(pendingChanges.value);
  }

  function openProtectedConfirm(m) {
    protectedConfirm.value = { module: m, attemptedMode: "hidden" };
  }
  function closeProtectedConfirm() {
    protectedConfirm.value = null;
  }

  function toggleCollapse(m) {
    if (m.item_type === "item") return;
    if (collapsedKeys.value.has(m.key)) {
      collapsedKeys.value.delete(m.key);
    } else {
      collapsedKeys.value.add(m.key);
    }
    collapsedKeys.value = new Set(collapsedKeys.value);
  }

  function selectModule(m) {
    selectedModule.value = m;
  }

  // ──────────────────────────────────────────────────────────────────────
  // API
  // ──────────────────────────────────────────────────────────────────────

  async function fetchData() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.permission_console.list_modules_tree",
        { panel: panel.value }
      );
      modules.value = res?.message?.modules || [];
      roleProfiles.value = res?.message?.role_profiles || [];
      pendingChanges.value = new Map();
      collapsedKeys.value = new Set();
    } catch (e) {
      error.value = e?.message || "Veri yüklenemedi";
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function saveAll() {
    if (pendingChanges.value.size === 0) return;
    saving.value = true;
    let success = 0;
    let failed = 0;
    try {
      for (const [k, mode] of pendingChanges.value.entries()) {
        const sep = k.indexOf("||");
        const profile = k.slice(0, sep);
        const moduleKey = k.slice(sep + 2);
        try {
          await api.callMethod("tradehub_core.api.v1.permission_console.update_module_policy", {
            module: moduleKey,
            role_profile: profile,
            mode,
            note: "Süper admin konsol",
          });
          success++;
        } catch (e) {
          console.warn(`Module policy update failed: ${profile} / ${moduleKey}`, e?.message);
          failed++;
        }
      }
      await fetchData();
      if (failed === 0) {
        toast.success(`${success} değişiklik kaydedildi`);
      } else {
        toast.error(`${success} kaydedildi, ${failed} hatalı`);
      }
    } finally {
      saving.value = false;
    }
  }

  function discardAll() {
    pendingChanges.value = new Map();
  }

  function onPanelChange() {
    fetchData();
  }

  onMounted(fetchData);
</script>

<template>
  <div class="module-matrix">
    <header class="topbar">
      <div class="filters">
        <label class="filter">
          <span class="filter-label">Panel</span>
          <select v-model="panel" class="select" @change="onPanelChange">
            <option v-for="p in PANELS" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </label>
        <label class="filter search">
          <AppIcon name="search" :size="16" />
          <input v-model="searchQuery" type="text" placeholder="Modül ara…" class="search-input" />
        </label>
        <span class="meta"> {{ renderedModules.length }} / {{ modules.length }} modül </span>
      </div>
      <div class="actions">
        <span v-if="pendingCount" class="pending-badge"> {{ pendingCount }} değişiklik </span>
        <button
          type="button"
          class="btn ghost"
          :disabled="pendingCount === 0 || saving"
          @click="discardAll"
        >
          İptal
        </button>
        <button
          type="button"
          class="btn primary"
          :disabled="pendingCount === 0 || saving"
          :aria-busy="saving"
          @click="saveAll"
        >
          <AppIcon name="save" :size="14" />
          {{ saving ? "Kaydediliyor…" : `Kaydet (${pendingCount})` }}
        </button>
      </div>
    </header>

    <div class="legend">
      <span class="legend-item">
        <span class="dot visible" />
        Görünür
      </span>
      <span class="legend-item">
        <span class="dot masked" />
        Maskeli
      </span>
      <span class="legend-item">
        <span class="dot hidden" />
        Gizli
      </span>
      <span class="legend-sep">·</span>
      <span class="legend-item">🔒 Korumalı (gizlenemez)</span>
      <span class="legend-item">🏷 Mağaza Sahipli</span>
    </div>

    <div v-if="loading" class="state-msg">Yükleniyor…</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <div v-else class="body">
      <div class="matrix-scroll">
        <table class="matrix">
          <thead>
            <tr>
              <th class="mod-col">Modül</th>
              <th v-for="p in roleProfiles" :key="p" class="profile-col" :title="p">
                {{ p.replace(/^Seller |^Buyer |^Platform |^Compliance |^Support /, "") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in renderedModules"
              :key="m.key"
              :class="['row', `row--${m.item_type}`, { selected: selectedModule?.key === m.key }]"
              @click="selectModule(m)"
            >
              <td class="mod-col">
                <div class="mod-row" :style="{ paddingLeft: `${depthOf(m) * 18}px` }">
                  <button
                    v-if="m.item_type !== 'item'"
                    type="button"
                    class="chevron"
                    :aria-label="collapsedKeys.has(m.key) ? 'Aç' : 'Kapat'"
                    @click.stop="toggleCollapse(m)"
                  >
                    <AppIcon
                      :name="collapsedKeys.has(m.key) ? 'chevron-right' : 'chevron-down'"
                      :size="14"
                    />
                  </button>
                  <span v-else class="chevron-placeholder" />
                  <AppIcon
                    v-if="m.icon"
                    :name="m.icon"
                    :size="14"
                    class="mod-icon"
                    :style="{ color: m.color || undefined }"
                  />
                  <span class="mod-label" :class="`mod-label--${m.item_type}`">
                    {{ m.label || `(${m.section_key})` }}
                  </span>
                  <span class="mod-flags">
                    <span v-if="m.is_protected" title="Korumalı modül">🔒</span>
                    <span v-if="m.seller_owned" title="Mağaza sahipli kayıt">🏷</span>
                    <span v-if="m.route" :title="`Route: ${m.route}`">↗</span>
                    <span v-if="m.doctype_ref" :title="`DocType: ${m.doctype_ref}`">▦</span>
                  </span>
                </div>
              </td>
              <td
                v-for="p in roleProfiles"
                :key="p"
                class="cell"
                :class="[`cell--${effectiveMode(m, p)}`, { pending: isPending(m, p) }]"
                :title="`${effectiveMode(m, p)} — değiştirmek için tıkla`"
                @click.stop="toggleCell(m, p)"
              >
                <span class="dot" :class="effectiveMode(m, p)" />
              </td>
            </tr>
            <tr v-if="renderedModules.length === 0">
              <td :colspan="roleProfiles.length + 1" class="empty">
                Filtre kriterine uyan modül yok.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside v-if="selectedModule" class="detail">
        <header class="detail-header">
          <h3>{{ selectedModule.label || selectedModule.section_key }}</h3>
          <button
            type="button"
            class="close-btn"
            aria-label="Detayı kapat"
            @click="selectedModule = null"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </header>
        <code class="detail-key">{{ selectedModule.key }}</code>
        <dl class="detail-meta">
          <dt>Tip</dt>
          <dd>{{ selectedModule.item_type }}</dd>
          <dt>Section</dt>
          <dd>{{ selectedModule.section_key || "—" }}</dd>
          <dt v-if="selectedModule.route">Route</dt>
          <dd v-if="selectedModule.route">
            <code>{{ selectedModule.route }}</code>
          </dd>
          <dt v-if="selectedModule.doctype_ref">DocType</dt>
          <dd v-if="selectedModule.doctype_ref">
            <code>{{ selectedModule.doctype_ref }}</code>
          </dd>
          <dt>Bayraklar</dt>
          <dd>
            <span v-if="selectedModule.is_protected" class="badge">Korumalı</span>
            <span v-if="selectedModule.seller_owned" class="badge">Mağaza Sahipli</span>
            <span v-if="!selectedModule.is_protected && !selectedModule.seller_owned" class="muted"
              >—</span
            >
          </dd>
          <dt>Aktif Policy'ler</dt>
          <dd>
            <div v-for="(mode, prof) in selectedModule.policies" :key="prof" class="policy-line">
              <span class="dot" :class="mode" />
              <span>{{ prof }} → {{ mode }}</span>
            </div>
            <span v-if="!Object.keys(selectedModule.policies || {}).length" class="muted"
              >Tüm profil'ler için varsayılan (visible)</span
            >
          </dd>
        </dl>
      </aside>
    </div>

    <!-- Sprint 6 — Korumalı modül uyarı modal -->
    <Teleport to="body">
      <div
        v-if="protectedConfirm"
        class="protected-modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="closeProtectedConfirm"
      >
        <div class="protected-modal">
          <header class="protected-modal-header">
            <h3>
              <AppIcon name="shield-alert" :size="18" />
              Korumalı modül
            </h3>
            <button
              type="button"
              class="modal-close"
              aria-label="Kapat"
              @click="closeProtectedConfirm"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </header>
          <div class="protected-modal-body">
            <p>
              <strong>{{ protectedConfirm.module.label || protectedConfirm.module.key }}</strong>
              modülü <code>is_protected=1</code> bayrağı ile işaretli. Bu modül kritik bir kullanıcı
              akışında yer alır (örn. Profilim, Dashboard, KYB Doğrulama gibi).
            </p>
            <p>
              Süper admin bile bu modülü <code>hidden</code> moduna <em>geçiremez</em>. Backend
              <code>update_module_policy</code> çağrısı fail-secure davranır.
            </p>
            <p class="protected-modal-tip">Eğer kullanıcı erişimini sınırlamak istiyorsanız:</p>
            <ul class="protected-modal-list">
              <li>
                <strong>Masked</strong> moda geçirin — modül görünür ama field-level maskeleme (PII
                Field Policy) devreye girer.
              </li>
              <li>
                Veya ilgili capability'i (örn.
                <code>view.bank_info</code>) ilgili role profile'dan çıkarın.
              </li>
            </ul>
          </div>
          <footer class="protected-modal-footer">
            <button type="button" class="btn primary" @click="closeProtectedConfirm">
              Anladım
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .module-matrix {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  // ── Topbar ─────────────────────────────────────────────
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid $l-border;
    flex-wrap: wrap;
    @include dark {
      border-color: $d-border;
    }
  }
  .filters {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .filter {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .filter-label {
    font-weight: 500;
  }
  .select,
  .search-input {
    padding: 6px 10px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: $l-bg;
    color: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color $t-fast;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    &:focus {
      border-color: $brand;
    }
  }
  .search {
    border: 1px solid $l-border;
    border-radius: 6px;
    padding-left: 8px;
    @include dark {
      border-color: $d-border;
    }
    .search-input {
      border: none;
      padding-left: 4px;
    }
  }
  .meta {
    font-size: 12px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pending-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    background: rgba($brand, 0.12);
    color: $brand;
    border-radius: 999px;
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
  .btn.primary {
    background: $brand;
    color: #fff;
    &:not(:disabled):hover {
      background: darken($brand, 6%);
    }
  }

  // ── Legend ─────────────────────────────────────────────
  .legend {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    font-size: 12px;
    color: $l-text-500;
    background: $l-bg-subtle;
    border-bottom: 1px solid $l-border;
    flex-wrap: wrap;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend-sep {
    opacity: 0.4;
  }

  // ── Body ──────────────────────────────────────────────
  .state-msg {
    padding: 32px;
    text-align: center;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    &.error {
      color: $c-error;
    }
  }

  .body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .matrix-scroll {
    flex: 1;
    overflow: auto;
    min-width: 0;
  }

  // ── Matrix ────────────────────────────────────────────
  .matrix {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: 13px;
    th,
    td {
      padding: 6px 10px;
      border-bottom: 1px solid $l-border;
      vertical-align: middle;
      @include dark {
        border-color: $d-border-inner;
      }
    }
    th {
      position: sticky;
      top: 0;
      background: $l-bg;
      z-index: 2;
      font-weight: 600;
      text-align: left;
      @include dark {
        background: $d-bg-card;
      }
    }
    .mod-col {
      position: sticky;
      left: 0;
      background: $l-bg;
      z-index: 1;
      min-width: 280px;
      max-width: 360px;
      @include dark {
        background: $d-bg-card;
      }
    }
    thead .mod-col {
      z-index: 3;
    }
    .profile-col {
      text-align: center;
      min-width: 64px;
      max-width: 100px;
      font-size: 12px;
      white-space: nowrap;
    }
    .row {
      cursor: pointer;
      transition: background $t-fast;
      &:hover {
        background: $l-bg-soft;
        @include dark {
          background: $d-bg-hover;
        }
      }
      &.selected {
        background: rgba($brand, 0.08);
      }
    }
    .row--section .mod-col {
      background: $l-bg-muted;
      @include dark {
        background: $d-bg-elevated;
      }
    }
    .row--group .mod-col {
      background: $l-bg-subtle;
      @include dark {
        background: $d-bg-card;
      }
    }
  }
  .mod-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .chevron {
    background: transparent;
    border: none;
    padding: 0;
    color: $l-text-500;
    cursor: pointer;
    display: inline-flex;
    @include dark {
      color: $d-text-muted;
    }
    &:hover {
      color: $brand;
    }
  }
  .chevron-placeholder {
    display: inline-block;
    width: 14px;
  }
  .mod-icon {
    flex-shrink: 0;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .mod-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mod-label--section {
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .mod-label--group {
    font-weight: 600;
  }
  .mod-label--item {
    font-weight: 400;
  }
  .mod-flags {
    display: inline-flex;
    gap: 3px;
    font-size: 11px;
    color: $l-text-500;
  }

  // ── Cell + Dot ───────────────────────────────────────
  .cell {
    text-align: center;
    cursor: pointer;
    user-select: none;
    transition: background $t-fast;
    &:hover {
      background: rgba($brand, 0.06);
    }
    &.pending {
      box-shadow: inset 0 0 0 2px rgba(245, 158, 11, 0.5);
      background: rgba(245, 158, 11, 0.08);
    }
  }
  .dot {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    vertical-align: middle;
    &.visible {
      background: $c-success;
    }
    &.masked {
      background: $c-warning;
      background: repeating-linear-gradient(
        45deg,
        $c-warning 0,
        $c-warning 3px,
        transparent 3px,
        transparent 6px
      );
      border: 1px solid $c-warning;
    }
    &.hidden {
      background: transparent;
      border: 1px solid $l-text-300;
      @include dark {
        border-color: $d-text-faint;
      }
    }
  }

  .empty {
    text-align: center;
    padding: 24px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Detail ───────────────────────────────────────────
  .detail {
    width: 320px;
    flex-shrink: 0;
    border-left: 1px solid $l-border;
    overflow-y: auto;
    padding: 16px;
    background: $l-bg-soft;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    h3 {
      font-size: 15px;
      font-weight: 600;
      margin: 0;
    }
  }
  .close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: $l-text-500;
    &:hover {
      background: $l-bg-muted;
      @include dark {
        background: $d-bg-hover;
      }
    }
  }
  .detail-key {
    display: inline-block;
    font-family:
      ui-monospace,
      JetBrains Mono,
      monospace;
    font-size: 11px;
    padding: 2px 6px;
    background: $l-bg-muted;
    border-radius: 4px;
    @include dark {
      background: $d-bg-hover;
    }
  }
  .detail-meta {
    margin-top: 14px;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 12px;
    font-size: 12px;
    dt {
      font-weight: 600;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    dd {
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    code {
      font-family:
        ui-monospace,
        JetBrains Mono,
        monospace;
      font-size: 11px;
    }
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba($brand, 0.12);
    color: $brand;
    font-size: 11px;
    font-weight: 500;
  }
  .policy-line {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    .dot {
      width: 10px;
      height: 10px;
    }
  }
  .muted {
    color: $l-text-300;
    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Sprint 6 — Korumalı modül modal ─────────────────────
  .protected-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(#000, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .protected-modal {
    background: $l-bg;
    border-radius: 10px;
    width: 100%;
    max-width: 480px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(#000, 0.18);
    @include dark {
      background: $d-bg-card;
    }
  }
  .protected-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid $l-border;
    background: rgba($c-error, 0.06);
    @include dark {
      border-color: $d-border;
      background: rgba($c-error, 0.12);
    }
    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: $c-error;
    }
  }
  .modal-close {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: $l-text-500;
    &:hover {
      background: rgba(#000, 0.05);
      @include dark {
        background: rgba(#fff, 0.05);
      }
    }
  }
  .protected-modal-body {
    padding: 16px;
    font-size: 13px;
    line-height: 1.6;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
    p {
      margin: 0 0 10px;
    }
    code {
      font-family:
        ui-monospace,
        JetBrains Mono,
        monospace;
      font-size: 11px;
      background: $l-bg-muted;
      padding: 1px 5px;
      border-radius: 3px;
      @include dark {
        background: $d-bg-hover;
      }
    }
    em {
      font-style: normal;
      font-weight: 600;
      color: $c-error;
    }
  }
  .protected-modal-tip {
    margin-top: 8px !important;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .protected-modal-list {
    margin: 8px 0 0;
    padding-left: 20px;
    font-size: 12px;
    li {
      margin: 4px 0;
    }
  }
  .protected-modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 16px;
    border-top: 1px solid $l-border;
    background: $l-bg-soft;
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
    }
  }

  // ── Mobile ──────────────────────────────────────────────
  @media (max-width: 760px) {
    .topbar {
      gap: 10px;
      padding: 10px 12px;
    }
    .filters {
      width: 100%;
    }
    .actions {
      width: 100%;
      justify-content: flex-end;
    }
    .legend {
      gap: 10px;
      font-size: 11px;
      padding: 6px 12px;
    }
    .body {
      flex-direction: column;
    }
    .matrix-scroll {
      max-height: 55vh;
    }
    .detail {
      width: 100%;
      border-left: none;
      border-top: 1px solid $l-border;
      max-height: 40vh;
      @include dark {
        border-color: $d-border;
      }
    }
    .matrix .mod-col {
      min-width: 200px;
      max-width: 260px;
    }
    .matrix .profile-col {
      min-width: 48px;
      font-size: 11px;
    }
    .mod-label--section,
    .mod-label--group {
      font-size: 12px;
    }
  }
</style>
