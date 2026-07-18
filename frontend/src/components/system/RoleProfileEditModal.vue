<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="rp-modal-backdrop" @click.self="close">
        <div class="rp-modal modal-panel" role="dialog" aria-modal="true">
        <header class="rp-modal-header">
          <h3>{{ isCreate ? "Yeni Rol Profili" : `Rol Düzenle — ${name}` }}</h3>
          <button type="button" class="icon-btn" aria-label="Kapat" @click="close">×</button>
        </header>

        <div v-if="loadingRoles" class="rp-state">Roller yükleniyor…</div>
        <template v-else>
          <div class="rp-body">
            <div v-if="isCreate" class="rp-field">
              <label for="rp-name">Rol Profili Adı</label>
              <input
                id="rp-name"
                v-model.trim="formName"
                type="text"
                placeholder="örn. Seller Custom Manager"
                maxlength="80"
                autocomplete="off"
              />
              <p class="rp-hint">
                Daha sonra değiştirilemez. Boş bırakılamaz, 80 karakteri geçemez.
              </p>
            </div>

            <div v-if="isCreate" class="rp-field">
              <label for="rp-parent">Şablon Profili (opsiyonel)</label>
              <select id="rp-parent" v-model="parentProfile" class="rp-select">
                <option value="">— Boş başla —</option>
                <option v-for="p in templateOptions" :key="p.name" :value="p.name">
                  {{ p.role_profile }} ({{ p.category }})
                </option>
              </select>
              <p class="rp-hint">
                Seçilirse o profilin <strong>modül kapıları</strong> ve
                <strong>capability izinleri</strong> yeni profile kopyalanır. Boş bırakılırsa yeni
                rol için hiçbir modül kapısı yoktur (default tüm modüller görünür).
              </p>
            </div>

            <div class="rp-field">
              <label>İçereceği Roller ({{ selectedRoles.size }} seçili)</label>
              <input v-model="search" type="search" placeholder="Rol ara…" class="rp-search" />
              <div class="rp-roles-list">
                <label
                  v-for="r in filteredRoles"
                  :key="r.name"
                  class="rp-role-chip"
                  :class="{ checked: selectedRoles.has(r.name), disabled: isProtected }"
                >
                  <input
                    type="checkbox"
                    :checked="selectedRoles.has(r.name)"
                    :disabled="isProtected"
                    @change="toggleRole(r.name)"
                  />
                  <span>{{ r.name }}</span>
                  <span
                    v-if="r.desk_access"
                    class="rp-flag"
                    title="Yönetim paneli (Desk) erişimi olan sistem rolü"
                  >
                    sistem
                  </span>
                </label>
                <p v-if="!filteredRoles.length" class="rp-state">Eşleşen rol yok.</p>
              </div>
              <p v-if="isProtected" class="rp-hint warn">
                <AppIcon name="lock" :size="14" /> Bu profil korumalıdır — içerdiği roller
                değiştirilemez.
              </p>
            </div>
          </div>

          <footer class="rp-modal-footer">
            <button type="button" class="btn" @click="close">İptal</button>
            <button
              type="button"
              class="btn primary"
              :disabled="submitting || isProtected || (isCreate && !formName)"
              @click="submit"
            >
              {{ submitting ? "Kaydediliyor…" : isCreate ? "Oluştur" : "Kaydet" }}
            </button>
          </footer>
        </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { usePermissionStore } from "@/stores/permission";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    open: { type: Boolean, default: false },
    mode: { type: String, default: "create" }, // "create" | "edit"
    name: { type: String, default: "" },
    initialRoles: { type: Array, default: () => [] },
    isProtected: { type: Boolean, default: false },
  });
  const emit = defineEmits(["close", "saved"]);

  const store = usePermissionStore();
  const { assignableRoles, roles: allProfiles } = storeToRefs(store);
  const toast = useToast();

  const isCreate = computed(() => props.mode === "create");
  const formName = ref("");
  const parentProfile = ref("");
  const selectedRoles = ref(new Set());
  const search = ref("");
  const submitting = ref(false);
  const loadingRoles = ref(false);

  // Şablon olarak seçilebilecek profile'lar — kendisi ve ERPNext default'ları
  // backend zaten filtreliyor, bu listeyi storedaki roles'tan alıyoruz.
  const templateOptions = computed(() =>
    (allProfiles.value || []).filter((p) => p.name !== formName.value)
  );

  const filteredRoles = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return assignableRoles.value;
    return assignableRoles.value.filter((r) => r.name.toLowerCase().includes(q));
  });

  function toggleRole(name) {
    if (props.isProtected) return;
    if (selectedRoles.value.has(name)) selectedRoles.value.delete(name);
    else selectedRoles.value.add(name);
    selectedRoles.value = new Set(selectedRoles.value);
  }

  async function ensureRolesLoaded() {
    if (assignableRoles.value.length) return;
    loadingRoles.value = true;
    try {
      await store.fetchAssignableRoles();
    } catch (e) {
      toast.error(e.message || "Rol listesi yüklenemedi");
    } finally {
      loadingRoles.value = false;
    }
  }

  watch(
    () => props.open,
    async (val) => {
      if (!val) return;
      formName.value = "";
      parentProfile.value = "";
      search.value = "";
      selectedRoles.value = new Set(props.initialRoles || []);
      await ensureRolesLoaded();
    },
    { immediate: true }
  );

  function close() {
    emit("close");
  }

  async function submit() {
    if (submitting.value) return;
    if (isCreate.value && !formName.value) {
      toast.error("Rol adı boş olamaz");
      return;
    }
    submitting.value = true;
    try {
      const rolesList = Array.from(selectedRoles.value);
      if (isCreate.value) {
        const res = await store.createRoleProfile(
          formName.value,
          rolesList,
          parentProfile.value || null
        );
        const detail = res?.parent_profile
          ? ` (${res.inherited_grants} grant + ${res.inherited_policies} kapı kopyalandı)`
          : "";
        toast.success(`"${formName.value}" oluşturuldu${detail}`);
      } else {
        const res = await store.updateRoleProfile(props.name, rolesList);
        const synced = res?.synced_users;
        const detail =
          typeof synced === "number" && synced > 0
            ? ` (${synced} kullanıcının rolleri eşitlendi)`
            : "";
        toast.success(`"${props.name}" güncellendi${detail}`);
      }
      emit("saved");
      emit("close");
    } catch (e) {
      toast.error(e.message || "Kaydetme başarısız");
    } finally {
      submitting.value = false;
    }
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .rp-modal-backdrop {
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
  .rp-modal {
    width: 100%;
    max-width: 520px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    overflow: hidden;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .rp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid $l-border;

    h3 {
      margin: 0;
      font-size: 1rem;
      color: $l-text-900;
    }

    @include dark {
      border-bottom-color: $d-border;

      h3 {
        color: $d-text-max;
      }
    }
  }
  .icon-btn {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: $l-text-500;
    cursor: pointer;
    padding: 0 0.25rem;

    &:hover {
      color: $l-text-900;
    }

    @include dark {
      color: $d-text-muted;

      &:hover {
        color: $d-text-max;
      }
    }
  }
  .rp-body {
    padding: 1.25rem;
    overflow-y: auto;
    flex: 1;
  }
  .rp-field {
    margin-bottom: 1.25rem;

    > label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: $l-text-700;
      margin-bottom: 0.4rem;

      @include dark {
        color: $d-text-hi;
      }
    }

    input[type="text"],
    .rp-search,
    .rp-select {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid $l-border;
      border-radius: 6px;
      font-size: 0.875rem;
      background: $l-bg;
      color: $l-text-900;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 2px rgba($brand, 0.15);
      }

      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text-max;
      }
    }
  }
  .rp-hint {
    font-size: 0.75rem;
    color: $l-text-400;
    margin-top: 0.35rem;

    &.warn {
      color: $c-warning;
      font-weight: 500;
    }

    @include dark {
      color: $d-text-faint;
    }
  }
  .rp-search {
    margin-bottom: 0.5rem;
  }
  .rp-roles-list {
    border: 1px solid $l-border;
    border-radius: 8px;
    max-height: 280px;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    @include dark {
      border-color: $d-border;
    }
  }
  .rp-role-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    color: $l-text-700;
    transition:
      background-color $t-fast,
      color $t-fast;

    input[type="checkbox"] {
      margin: 0;
    }

    &:hover:not(.disabled) {
      background: $l-bg-subtle;
    }
    &.checked {
      background: rgba($brand, 0.08);
      color: $brand;
    }
    &.disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    @include dark {
      color: $d-text-hi;

      &:hover:not(.disabled) {
        background: $d-bg-hover;
      }
      &.checked {
        background: rgba($brand-light, 0.13);
        color: $brand-light;
      }
    }
  }
  .rp-flag {
    margin-left: auto;
    font-size: 0.65rem;
    font-weight: 600;
    color: $brand;
    background: rgba($brand, 0.12);
    border-radius: 4px;
    padding: 0.1rem 0.35rem;
  }
  .rp-state {
    color: $l-text-500;
    text-align: center;
    padding: 2rem 1rem;
    font-size: 0.9rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .rp-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.9rem 1.25rem;
    border-top: 1px solid $l-border;
    background: $l-bg-soft;

    @include dark {
      border-top-color: $d-border;
      background: $d-bg-elevated;
    }
  }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;

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
    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-max;

      &:hover:not(:disabled) {
        background: $d-bg-hover;
      }
    }
  }
</style>
