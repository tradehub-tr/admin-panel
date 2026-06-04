<template>
  <div class="roles-tab">
    <header class="roles-toolbar">
      <div class="rt-summary">
        <span class="rt-count">{{ t("roles.roleCount", { n: roles.length }) }}</span>
      </div>
      <button type="button" class="btn primary" @click="openCreateModal">
        {{ t("roles.newRoleProfile") }}
      </button>
    </header>

    <p v-if="loading && !roles.length" class="state">{{ t("roles.loading") }}</p>

    <div v-else class="roles-layout">
      <!-- Sol: Rol listesi (kategoriye göre gruplu) -->
      <aside class="role-list">
        <div v-for="cat in categories" :key="cat.id" class="role-group">
          <h3 class="role-group-title">
            <component :is="cat.icon" :size="14" />
            {{ cat.label }}
            <span class="role-count">({{ cat.roles.length }})</span>
          </h3>
          <button
            v-for="role in cat.roles"
            :key="role.name"
            type="button"
            :class="['role-item', { active: selectedRole?.name === role.name }]"
            @click="selectRole(role.name)"
          >
            <span class="role-name">
              {{ role.role_profile }}
              <span v-if="role.is_protected" class="protected-badge" :title="t('roles.protected')"
                >🔒</span
              >
            </span>
            <span class="role-meta">{{ t("roles.userCount", { n: role.user_count }) }}</span>
          </button>
        </div>
      </aside>

      <!-- Sağ: Detay -->
      <section class="role-detail">
        <p v-if="!selectedRole" class="state">{{ t("roles.selectPrompt") }}</p>

        <template v-else>
          <div class="detail-header">
            <div>
              <h2>
                {{ selectedRole.role_profile }}
                <span
                  v-if="selectedRole.is_protected"
                  class="protected-badge"
                  :title="t('roles.protected')"
                  >🔒</span
                >
              </h2>
              <p class="detail-meta">
                {{ t("roles.assignedToCount", { n: selectedRole.user_count }) }}
              </p>
            </div>
            <div class="detail-actions">
              <button
                type="button"
                class="btn"
                :disabled="selectedRole.is_protected"
                :title="
                  selectedRole.is_protected
                    ? 'Korumalı profilin rolleri değiştirilemez'
                    : 'Profili düzenle'
                "
                @click="openEditModal"
              >
                Düzenle
              </button>
              <button
                type="button"
                class="btn danger"
                :disabled="selectedRole.is_protected || selectedRole.user_count > 0"
                :title="deleteDisabledReason"
                @click="confirmDelete"
              >
                Sil
              </button>
            </div>
          </div>

          <section class="detail-section">
            <h3>{{ t("roles.includedRoles") }}</h3>
            <div class="role-chips">
              <span v-for="r in selectedRole.roles || []" :key="r" class="chip">{{ r }}</span>
              <p v-if="!selectedRole.roles?.length" class="muted">
                {{ t("roles.noRolesAssigned") }}
              </p>
            </div>
          </section>

          <section class="detail-section">
            <header class="cap-header">
              <h3>
                {{ t("roles.capabilitiesTitle") }}
                <span v-if="!capLoading" class="cap-total">({{ selectedRoleCapCount }})</span>
              </h3>
              <button
                type="button"
                class="link-btn"
                @click="emit('switch-tab', 'capabilities', { profile: selectedRole.role_profile })"
              >
                {{ t("roles.editInCapabilities") }} →
              </button>
            </header>
            <p v-if="capLoading" class="muted">{{ t("roles.loading") }}</p>
            <p v-else-if="capError" class="muted error">{{ capError }}</p>
            <p v-else-if="selectedRoleCapCount === 0" class="muted">
              {{ t("roles.noGrantsForProfile") }}
            </p>
            <div v-else class="cap-groups">
              <div v-for="(caps, group) in selectedRoleCapabilities" :key="group" class="cap-group">
                <h4 class="cap-group-title">
                  {{ group }}
                  <span class="cap-group-count">{{ caps.length }}</span>
                </h4>
                <div class="cap-chips">
                  <div v-for="c in caps" :key="c.key" class="cap-chip" :title="c.key">
                    <span class="cap-label">{{ c.label }}</span>
                    <span class="cap-flags">
                      <span v-if="c.is_owner_only" :title="t('roles.flagOwnerOnly')">🛡</span>
                      <span v-if="c.is_protected" :title="t('roles.flagProtected')">🔒</span>
                      <span v-if="c.requires_kyc" :title="t('roles.flagKycRequired')">🆔</span>
                      <span v-if="c.requires_aml" :title="t('roles.flagAmlClean')">🚨</span>
                      <span v-if="c.plan_feature_flag" :title="`Plan: ${c.plan_feature_flag}`"
                        >💎</span
                      >
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <h3>{{ t("roles.usersUsingRole") }}</h3>
            <p v-if="!selectedRole.users?.length" class="muted">{{ t("roles.noUsersYet") }}</p>
            <ul v-else class="user-list">
              <li v-for="u in selectedRole.users" :key="u.name" class="user-row">
                <div class="u-main">
                  <span class="u-name">{{ u.full_name || u.email }}</span>
                  <span class="u-email">{{ u.email }}</span>
                </div>
                <div class="u-meta">
                  <span v-if="u.tradehub_tenant" class="badge">{{ u.tradehub_tenant }}</span>
                  <span :class="['status-dot', u.enabled ? 'on' : 'off']" />
                  <span class="u-status">{{
                    u.enabled ? t("roles.active") : t("roles.inactive")
                  }}</span>
                </div>
              </li>
            </ul>
          </section>
        </template>
      </section>
    </div>

    <RoleProfileEditModal
      :open="editModal.open"
      :mode="editModal.mode"
      :name="editModal.name"
      :initial-roles="editModal.initialRoles"
      :is-protected="editModal.isProtected"
      @close="editModal.open = false"
      @saved="onProfileSaved"
    />

    <Teleport to="body">
      <div
        v-if="deleteDialog.open"
        class="rt-confirm-backdrop"
        @click.self="deleteDialog.open = false"
      >
        <div class="rt-confirm">
          <h3>Rol Profilini Sil</h3>
          <p>
            <strong>{{ deleteDialog.name }}</strong> profili silinecek. Bu profile bağlı tüm
            capability grant'ları ve modül policy'leri de temizlenecek. Bu işlem geri alınamaz.
          </p>
          <footer>
            <button type="button" class="btn" @click="deleteDialog.open = false">İptal</button>
            <button
              type="button"
              class="btn danger"
              :disabled="deleteDialog.submitting"
              @click="executeDelete"
            >
              {{ deleteDialog.submitting ? "Siliniyor…" : "Evet, sil" }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { computed, onMounted, reactive, ref } from "vue";
  import { storeToRefs } from "pinia";
  import { Shield, Store, ShoppingCart, Sparkles } from "lucide-vue-next";
  import { useI18n } from "vue-i18n";
  import { usePermissionStore } from "@/stores/permission";
  import { useToast } from "@/composables/useToast";
  import RoleProfileEditModal from "@/components/system/RoleProfileEditModal.vue";
  import api from "@/utils/api";

  const emit = defineEmits(["switch-tab"]);

  const { t } = useI18n();

  const store = usePermissionStore();
  const toast = useToast();
  const { roles, selectedRole, platformRoles, sellerRoles, buyerRoles, customRoles, loading } =
    storeToRefs(store);

  // ── CRUD modal state ───────────────────────────────────
  const editModal = reactive({
    open: false,
    mode: "create", // "create" | "edit"
    name: "",
    initialRoles: [],
    isProtected: false,
  });
  const deleteDialog = reactive({ open: false, name: "", submitting: false });

  const deleteDisabledReason = computed(() => {
    if (!selectedRole.value) return "";
    if (selectedRole.value.is_protected) return "Korumalı profil silinemez";
    if (selectedRole.value.user_count > 0)
      return `Bu profile ${selectedRole.value.user_count} kullanıcı atanmış — önce kullanıcıları taşıyın`;
    return "Profili sil";
  });

  function openCreateModal() {
    editModal.mode = "create";
    editModal.name = "";
    editModal.initialRoles = [];
    editModal.isProtected = false;
    editModal.open = true;
  }

  function openEditModal() {
    if (!selectedRole.value) return;
    editModal.mode = "edit";
    editModal.name = selectedRole.value.name;
    editModal.initialRoles = [...(selectedRole.value.roles || [])];
    editModal.isProtected = !!selectedRole.value.is_protected;
    editModal.open = true;
  }

  async function onProfileSaved() {
    // create modunda yeni profile select et
    if (editModal.mode === "create") {
      const newName = editModal.name || roles.value[roles.value.length - 1]?.name;
      if (newName) await selectRole(newName);
    }
  }

  function confirmDelete() {
    if (!selectedRole.value) return;
    deleteDialog.name = selectedRole.value.name;
    deleteDialog.open = true;
  }

  async function executeDelete() {
    if (deleteDialog.submitting) return;
    deleteDialog.submitting = true;
    try {
      await store.deleteRoleProfile(deleteDialog.name);
      toast.success(`"${deleteDialog.name}" silindi`);
      deleteDialog.open = false;
    } catch (e) {
      toast.error(e.message || "Silme başarısız");
    } finally {
      deleteDialog.submitting = false;
    }
  }

  // Sprint 6 — TH Capability Registry + Grant matrisi (lazy load)
  const allCapabilities = ref([]);
  const capLoading = ref(false);
  const capError = ref(null);

  const categories = computed(() => [
    { id: "platform", label: t("roles.catPlatform"), icon: Shield, roles: platformRoles.value },
    { id: "seller", label: t("roles.catSeller"), icon: Store, roles: sellerRoles.value },
    { id: "buyer", label: t("roles.catBuyer"), icon: ShoppingCart, roles: buyerRoles.value },
    { id: "custom", label: t("roles.catCustom"), icon: Sparkles, roles: customRoles.value },
  ]);

  // Seçili rol için grant edilen capability'ler — module_group bazında grupla.
  const selectedRoleCapabilities = computed(() => {
    if (!selectedRole.value || !allCapabilities.value.length) return {};
    const profile = selectedRole.value.role_profile;
    const grouped = {};
    for (const c of allCapabilities.value) {
      if (!c.grants?.includes(profile)) continue;
      const g = c.module_group || "Diğer";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(c);
    }
    return grouped;
  });

  const selectedRoleCapCount = computed(() =>
    Object.values(selectedRoleCapabilities.value).reduce((sum, arr) => sum + arr.length, 0)
  );

  async function loadCapabilities() {
    if (allCapabilities.value.length || capLoading.value) return;
    capLoading.value = true;
    capError.value = null;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.permission_console.list_capabilities"
      );
      allCapabilities.value = res?.message?.capabilities || [];
    } catch (e) {
      capError.value = e?.message || "Capability listesi yüklenemedi";
    } finally {
      capLoading.value = false;
    }
  }

  async function selectRole(name) {
    try {
      await store.fetchRoleDetail(name);
      // Detay açıldığında capability matrisi henüz yüklenmediyse arka planda çek
      loadCapabilities();
    } catch {
      // hata banner'da
    }
  }

  onMounted(async () => {
    if (!roles.value.length) {
      try {
        await store.fetchRoles();
      } catch {
        // hata banner'da
      }
    }
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .roles-tab {
    display: block;
  }

  // ── Toolbar (sağ üst CRUD aksiyonları) ────────────────────
  .roles-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid $l-border;

    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .rt-count {
    font-size: 0.85rem;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Genel buton + danger varyant ──────────────────────────
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $t-fast;

    &:hover:not(:disabled) {
      background: $l-bg-subtle;
    }
    &.primary {
      background: $brand;
      color: white;
      border-color: $brand;

      &:hover:not(:disabled) {
        filter: brightness(1.06);
      }
    }
    &.danger {
      color: $c-error;
      border-color: rgba($c-error, 0.35);

      &:hover:not(:disabled) {
        background: rgba($c-error, 0.08);
        border-color: $c-error;
      }
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-max;

      &:hover:not(:disabled) {
        background: $d-bg-hover;
      }
      &.primary {
        background: $brand;
        color: white;
      }
      &.danger {
        color: $c-error;
        border-color: rgba($c-error, 0.4);

        &:hover:not(:disabled) {
          background: rgba($c-error, 0.12);
        }
      }
    }
  }

  // ── Detay header — Düzenle/Sil aksiyonları ────────────────
  .detail-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .protected-badge {
    margin-left: 0.35rem;
    font-size: 0.75em;
    vertical-align: middle;
  }

  // ── Confirm delete dialog ─────────────────────────────────
  .rt-confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .rt-confirm {
    width: 100%;
    max-width: 440px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    padding: 1.25rem;

    h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      color: $c-error;
    }
    p {
      margin: 0 0 1rem;
      color: $l-text-700;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    footer {
      display: flex;
      gap: 0.6rem;
      justify-content: flex-end;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;

      p {
        color: $d-text-hi;
      }
    }
  }
  .state {
    color: $l-text-500;
    padding: 2rem;
    text-align: center;

    @include dark {
      color: $d-text-muted;
    }
  }
  .muted {
    color: $l-text-400;
    font-size: 0.875rem;
    font-style: italic;

    @include dark {
      color: $d-text-faint;
    }
  }

  .roles-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
    min-height: 480px;
  }

  // ── Sol liste ─────────────────────────────────────────────
  .role-list {
    border-right: 1px solid $l-border;
    padding-right: 1rem;

    @include dark {
      border-right-color: $d-border;
    }
  }
  .role-group {
    margin-bottom: 1.25rem;
  }
  .role-group-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: $l-text-500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .role-count {
    color: $l-text-400;
    font-weight: 400;

    @include dark {
      color: $d-text-faint;
    }
  }
  .role-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    font-size: 0.875rem;
    margin-bottom: 0.15rem;
    transition: all $t-base;

    &:hover {
      background: $l-bg-subtle;
    }
    &.active {
      background: rgba($brand, 0.08);
      border-color: rgba($brand, 0.25);
      color: $brand;
      font-weight: 500;

      .role-name {
        color: $brand;
      }
    }

    @include dark {
      &:hover {
        background: $d-bg-hover;
      }
      &.active {
        background: rgba($brand-light, 0.12);
        border-color: rgba($brand-light, 0.3);
        color: $brand-light;

        .role-name {
          color: $brand-light;
        }
      }
    }
  }
  .role-name {
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }
  .role-meta {
    color: $l-text-400;
    font-size: 0.72rem;

    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Sağ detay ─────────────────────────────────────────────
  .role-detail h2 {
    margin: 0 0 0.25rem;
    color: $l-text-900;
    font-size: 1.15rem;
    font-weight: 600;

    @include dark {
      color: $d-text-max;
    }
  }
  // detail-header — actions sağa yaslı flex satır
  :deep(.detail-header),
  .role-detail > template + .detail-header,
  .role-detail .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .detail-meta {
    color: $l-text-500;
    font-size: 0.875rem;
    margin: 0;

    @include dark {
      color: $d-text-muted;
    }
  }
  .detail-section {
    margin-top: 1.5rem;
  }
  .detail-section h3 {
    font-size: 0.78rem;
    font-weight: 600;
    color: $l-text-700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 0.6rem;

    @include dark {
      color: $d-text-hi;
    }
  }

  .role-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid $l-border-alt;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
      border-color: $d-border;
    }
  }

  .user-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .user-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 0.85rem;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    margin-bottom: 0.4rem;
    background: $l-bg;
    transition: border-color $t-base;

    &:hover {
      border-color: rgba($brand, 0.3);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;

      &:hover {
        border-color: rgba($brand-light, 0.35);
      }
    }
  }
  .u-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .u-name {
    font-weight: 500;
    color: $l-text-900;
    font-size: 0.875rem;

    @include dark {
      color: $d-text-hi;
    }
  }
  .u-email {
    color: $l-text-500;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .u-meta {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.75rem;
  }
  .badge {
    background: rgba($brand, 0.1);
    color: $brand;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-weight: 500;
    font-size: 0.7rem;

    @include dark {
      background: rgba($brand-light, 0.15);
      color: $brand-light;
    }
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;

    &.on {
      background: $c-success;
      box-shadow: 0 0 0 3px rgba($c-success, 0.15);
    }
    &.off {
      background: $c-error;
      box-shadow: 0 0 0 3px rgba($c-error, 0.12);
    }
  }
  .u-status {
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Sprint 6 — Capability section ─────────────────────────
  .cap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;

    h3 {
      margin: 0;
    }
  }
  .cap-total {
    margin-left: 0.25rem;
    color: $l-text-500;
    font-weight: 500;
    font-size: 0.85em;

    @include dark {
      color: $d-text-muted;
    }
  }
  .link-btn {
    background: transparent;
    border: none;
    color: $brand;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0;

    &:hover {
      text-decoration: underline;
    }

    @include dark {
      color: $brand-light;
    }
  }

  .cap-groups {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .cap-group-title {
    margin: 0 0 0.4rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-500;
    display: flex;
    align-items: center;
    gap: 0.4rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .cap-group-count {
    background: rgba($brand, 0.12);
    color: $brand;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.65rem;
    text-transform: none;
    letter-spacing: 0;
  }
  .cap-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .cap-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.55rem;
    border-radius: 6px;
    background: $l-bg-soft;
    border: 1px solid $l-border;
    font-size: 0.78rem;
    color: $l-text-700;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }
  .cap-label {
    font-weight: 500;
  }
  .cap-flags {
    display: inline-flex;
    gap: 0.2rem;
    font-size: 0.7rem;
  }

  .muted.error {
    color: $c-error;
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 760px) {
    .roles-layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .role-list {
      border-right: none;
      border-bottom: 1px solid $l-border;
      padding-right: 0;
      padding-bottom: 1rem;

      @include dark {
        border-bottom-color: $d-border;
      }
    }
    .user-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
