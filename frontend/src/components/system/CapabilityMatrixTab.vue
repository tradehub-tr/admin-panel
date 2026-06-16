<script setup>
  /**
   * Sprint 6 — Süper Admin Capability Matrix Tab.
   *
   * Backend: tradehub_core.api.v1.permission_console
   *   - list_capabilities()           → matriks veri
   *   - update_capability_grant()     → tek hücre toggle
   *
   * Etkileşim:
   *   1. Tek tıkla hücre toggle → pendingChanges Map'ine yazılır
   *   2. Üst bar'da pending sayısı + Kaydet/İptal
   *   3. Kaydet → sırayla POST, sonra fetch ile yeniden senkronize
   *
   * Korumalı capability (is_protected=1) + Owner sütunu toggle edilemez.
   * Owner-only capability + non-Owner sütunu görsel olarak grileşir.
   */

  import { computed, onMounted, ref } from "vue";
  import { useRoute } from "vue-router";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const toast = useToast();
  const route = useRoute();

  // RolesTab veya deep link'ten gelen ?profile=... ile kolonu vurgula
  const highlightProfile = computed(() => route.query?.profile || "");

  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const capabilities = ref([]);
  const roleProfiles = ref([]);

  // Sprint 5 — Plan sync state (list_plan_capability_sync endpoint)
  const planSyncByCap = ref({}); // { cap_key: { plan_status, plans_enabled, plans_missing, is_unsynced } }
  const planCodes = ref([]);
  const planSavingPlan = ref(""); // "PRO" — şu an save'in çalıştığı plan code (UI disable için)
  const planBulkSaving = ref(false); // "Tüm planlara ekle" çalışıyor mu

  // Sprint 6 Bulk — Toplu işlem state
  const bulkSaving = ref(false);
  const bulkConfirm = ref(null); // { action: "grant"|"revoke", profiles: [...] } veya null

  // Süper admin'in toplu işlem hedefi olarak gördüğü sub-user role'ler.
  // Owner ve Co-Owner kasıtlı dışarıda — onlar çoğunlukla zaten capability'leri alır
  // ve toplu çekme yanlışlıkla Owner'ı etkilemesin.
  const SUB_USER_PROFILES = [
    "Seller Manager",
    "Seller Operations",
    "Seller Finance Staff",
    "Seller Sales Rep",
  ];

  const moduleGroupFilter = ref("Tümü");
  const searchQuery = ref("");
  const selectedCap = ref(null);

  // Map<"profile||cap_key", boolean> — pending toggle değişiklikleri
  const pendingChanges = ref(new Map());

  // ──────────────────────────────────────────────────────────────────────
  // Computed
  // ──────────────────────────────────────────────────────────────────────

  const moduleGroups = computed(() => {
    const set = new Set();
    for (const c of capabilities.value) {
      if (c.module_group) set.add(c.module_group);
    }
    return ["Tümü", ...[...set].sort()];
  });

  const filteredCapabilities = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return capabilities.value.filter((c) => {
      if (moduleGroupFilter.value !== "Tümü" && c.module_group !== moduleGroupFilter.value) {
        return false;
      }
      if (!q) return true;
      return (
        c.key.toLowerCase().includes(q) ||
        (c.label || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    });
  });

  const pendingCount = computed(() => pendingChanges.value.size);

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────

  function cellKey(profile, capKey) {
    return `${profile}||${capKey}`;
  }

  function isGrantedOriginal(cap, profile) {
    return cap.grants?.includes(profile) || false;
  }

  function isGranted(cap, profile) {
    const k = cellKey(profile, cap.key);
    if (pendingChanges.value.has(k)) return pendingChanges.value.get(k);
    return isGrantedOriginal(cap, profile);
  }

  function isPending(cap, profile) {
    return pendingChanges.value.has(cellKey(profile, cap.key));
  }

  function isCellDisabled(cap, profile) {
    // Owner sütununda korumalı capability'ler her zaman granted (çıkarılamaz)
    if (cap.is_protected && profile === "Seller Full Access") return true;
    // Owner-only capability + non-Owner sütun → toggle anlamsız (zaten alamaz)
    if (cap.is_owner_only && profile !== "Seller Full Access") return true;
    return false;
  }

  function toggleCell(cap, profile) {
    if (isCellDisabled(cap, profile)) return;
    const k = cellKey(profile, cap.key);
    const original = isGrantedOriginal(cap, profile);
    const currentEffective = isGranted(cap, profile);
    const next = !currentEffective;
    if (next === original) {
      pendingChanges.value.delete(k);
    } else {
      pendingChanges.value.set(k, next);
    }
    // Reactivity trigger — Map mutate'i izlenmez
    pendingChanges.value = new Map(pendingChanges.value);
  }

  function selectCapability(cap) {
    selectedCap.value = cap;
  }

  // ──────────────────────────────────────────────────────────────────────
  // API
  // ──────────────────────────────────────────────────────────────────────

  async function fetchData() {
    loading.value = true;
    error.value = null;
    try {
      const [capsRes, planSyncRes] = await Promise.all([
        api.callMethodGET("tradehub_core.api.v1.permission_console.list_capabilities"),
        api.callMethodGET("tradehub_core.api.v1.permission_console.list_plan_capability_sync"),
      ]);
      capabilities.value = capsRes?.message?.capabilities || [];
      roleProfiles.value = capsRes?.message?.role_profiles || [];
      planCodes.value = planSyncRes?.message?.plans || [];
      const map = {};
      for (const c of planSyncRes?.message?.capabilities || []) {
        map[c.key] = c;
      }
      planSyncByCap.value = map;
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
      for (const [k, granted] of pendingChanges.value.entries()) {
        const sep = k.indexOf("||");
        const profile = k.slice(0, sep);
        const capKey = k.slice(sep + 2);
        try {
          await api.callMethod("tradehub_core.api.v1.permission_console.update_capability_grant", {
            role_profile: profile,
            capability: capKey,
            granted: granted ? 1 : 0,
            note: "Süper admin konsol",
          });
          success++;
        } catch (e) {
          console.warn(`Grant update failed: ${profile} / ${capKey}`, e?.message);
          failed++;
        }
      }
      pendingChanges.value = new Map();
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

  // ──────────────────────────────────────────────────────────────────────
  // Sprint 5 — Plan kapısı düzeltme aksiyonu
  // ──────────────────────────────────────────────────────────────────────

  async function togglePlanFlag(planCode, nextEnabled) {
    if (!selectedCap.value?.plan_feature_flag) return;
    planSavingPlan.value = planCode;
    try {
      await api.callMethod("tradehub_core.api.v1.permission_console.update_plan_capability_flag", {
        plan_codes: planCode,
        feature_flag: selectedCap.value.plan_feature_flag,
        enabled: nextEnabled ? 1 : 0,
      });
      await refreshPlanSync();
      toast.success(
        nextEnabled ? `${planCode} planına eklendi` : `${planCode} planından çıkarıldı`
      );
    } catch (e) {
      toast.error(e?.message || "Plan flag güncellenemedi");
    } finally {
      planSavingPlan.value = "";
    }
  }

  async function addToAllPlans() {
    if (!selectedCap.value?.plan_feature_flag) return;
    planBulkSaving.value = true;
    try {
      await api.callMethod("tradehub_core.api.v1.permission_console.update_plan_capability_flag", {
        plan_codes: JSON.stringify(planCodes.value),
        feature_flag: selectedCap.value.plan_feature_flag,
        enabled: 1,
      });
      await refreshPlanSync();
      toast.success(`${planCodes.value.length} plana eklendi`);
    } catch (e) {
      toast.error(e?.message || "Toplu güncelleme başarısız");
    } finally {
      planBulkSaving.value = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Sprint 6 Bulk — Tüm sub-user rollerine ver/çek
  // ──────────────────────────────────────────────────────────────────────

  function relevantSubUserProfiles() {
    // Backend'in döndüğü role_profiles içinden mevcut olanları filtrele
    return SUB_USER_PROFILES.filter((p) => roleProfiles.value.includes(p));
  }

  function bulkChangeNeededFor(action) {
    if (!selectedCap.value) return [];
    return relevantSubUserProfiles().filter((p) => {
      const isGrantedNow = isGranted(selectedCap.value, p);
      const isDisabled = isCellDisabled(selectedCap.value, p);
      if (isDisabled) return false;
      if (action === "grant" && !isGrantedNow) return true;
      if (action === "revoke" && isGrantedNow) return true;
      return false;
    });
  }

  function openBulkConfirm(action) {
    const profiles = bulkChangeNeededFor(action);
    if (profiles.length === 0) {
      toast.info(
        action === "grant"
          ? "Tüm sub-user roller bu capability'i zaten alıyor"
          : "Hiçbir sub-user rolünde bu capability tanımlı değil"
      );
      return;
    }
    bulkConfirm.value = { action, profiles };
  }

  function cancelBulkConfirm() {
    bulkConfirm.value = null;
  }

  async function executeBulkAction() {
    if (!bulkConfirm.value || !selectedCap.value) return;
    const { action, profiles } = bulkConfirm.value;
    const grantedFlag = action === "grant" ? 1 : 0;
    bulkSaving.value = true;
    let success = 0;
    let failed = 0;
    try {
      for (const profile of profiles) {
        try {
          await api.callMethod("tradehub_core.api.v1.permission_console.update_capability_grant", {
            role_profile: profile,
            capability: selectedCap.value.key,
            granted: grantedFlag,
            note: `Bulk: ${action} via console`,
          });
          success++;
        } catch (e) {
          console.warn(`Bulk ${action} failed: ${profile}`, e?.message);
          failed++;
        }
      }
      pendingChanges.value = new Map();
      await fetchData();
      if (failed === 0) {
        toast.success(`${success} role profile ${action === "grant" ? "eklendi" : "çıkarıldı"}`);
      } else {
        toast.error(`${success} işlendi, ${failed} hatalı`);
      }
    } finally {
      bulkSaving.value = false;
      bulkConfirm.value = null;
    }
  }

  async function refreshPlanSync() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.permission_console.list_plan_capability_sync"
      );
      const map = {};
      for (const c of res?.message?.capabilities || []) map[c.key] = c;
      planSyncByCap.value = map;
    } catch {
      // sessizce geç — UI bir sonraki tam fetch'te tazelenir
    }
  }

  onMounted(fetchData);
</script>

<template>
  <div class="capability-matrix">
    <header class="topbar">
      <div class="filters">
        <label class="filter">
          <span class="filter-label">Grup</span>
          <select v-model="moduleGroupFilter" class="select">
            <option v-for="g in moduleGroups" :key="g" :value="g">{{ g }}</option>
          </select>
        </label>
        <label class="filter search">
          <AppIcon name="search" :size="16" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Capability ara…"
            class="search-input"
          />
        </label>
        <span class="meta">
          {{ filteredCapabilities.length }} / {{ capabilities.length }} capability
        </span>
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

    <div v-if="loading" class="state-msg">Yükleniyor…</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>
    <div v-else class="body">
      <div class="matrix-scroll">
        <table class="matrix">
          <thead>
            <tr>
              <th class="cap-col">Capability</th>
              <th
                v-for="p in roleProfiles"
                :key="p"
                class="profile-col"
                :class="{ highlighted: p === highlightProfile }"
                :title="p"
              >
                {{ p.replace(/^Seller |^Buyer |^Platform |^Compliance |^Support /, "") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in filteredCapabilities"
              :key="c.key"
              :class="{ selected: selectedCap?.key === c.key }"
              @click="selectCapability(c)"
            >
              <td class="cap-col">
                <div class="cap-label">
                  {{ c.label }}
                  <span class="cap-flags">
                    <span v-if="c.is_owner_only" title="Owner-only"
                      ><AppIcon name="shield" :size="14"
                    /></span>
                    <span v-if="c.is_protected" title="Korumalı (silinemez)"
                      ><AppIcon name="lock" :size="14"
                    /></span>
                    <span v-if="c.requires_kyc" title="KYC verified gerekir"
                      ><AppIcon name="id-card" :size="14"
                    /></span>
                    <span v-if="c.requires_aml" title="AML temiz gerekir"
                      ><AppIcon name="siren" :size="14"
                    /></span>
                    <span v-if="c.plan_feature_flag" :title="`Plan kapısı: ${c.plan_feature_flag}`"
                      ><AppIcon name="gem" :size="14"
                    /></span>
                    <span
                      v-if="planSyncByCap[c.key]?.is_unsynced"
                      class="unsynced-flag"
                      title="Bu capability'nin plan_feature_flag'i hiçbir abonelik planında etkin değil. Tutarsızlık — kullanıcılar bu yetkiyi alamaz."
                      >⚠</span
                    >
                  </span>
                </div>
                <div class="cap-key">{{ c.key }}</div>
              </td>
              <td
                v-for="p in roleProfiles"
                :key="p"
                class="cell"
                :class="{
                  granted: isGranted(c, p),
                  pending: isPending(c, p),
                  disabled: isCellDisabled(c, p),
                  highlighted: p === highlightProfile,
                }"
                :title="isCellDisabled(c, p) ? 'Bu hücre değiştirilemez' : ''"
                @click.stop="toggleCell(c, p)"
              >
                <span v-if="isGranted(c, p)" class="mark granted-mark">✓</span>
                <span v-else class="mark deny-mark">–</span>
              </td>
            </tr>
            <tr v-if="filteredCapabilities.length === 0">
              <td :colspan="roleProfiles.length + 1" class="empty">
                Filtre kriterine uyan capability yok.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside v-if="selectedCap" class="detail">
        <header class="detail-header">
          <h3>{{ selectedCap.label }}</h3>
          <button
            type="button"
            class="close-btn"
            aria-label="Detayı kapat"
            @click="selectedCap = null"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </header>
        <code class="detail-key">{{ selectedCap.key }}</code>

        <!-- Sprint 6 — Owner-only / Korumalı uyarı bannerları -->
        <div v-if="selectedCap.is_owner_only" class="protection-banner owner-only">
          <div class="banner-icon-wrap"><AppIcon name="shield" :size="20" /></div>
          <div class="banner-text">
            <strong>Owner-only capability.</strong>
            Yalnızca <code>tradehub_is_owner=1</code> ve <code>Seller Owner</code> rolü taşıyan
            kullanıcılar için verilir. Sub-user toggle hücreleri bu yüzden devre dışıdır. Capability
            kaldırmak veya başka bir profile vermek bu kuralı bozar.
          </div>
        </div>
        <div v-if="selectedCap.is_protected" class="protection-banner protected">
          <div class="banner-icon-wrap"><AppIcon name="lock" :size="20" /></div>
          <div class="banner-text">
            <strong>Korumalı capability.</strong>
            Bu kayıt UI'dan
            <em>silinemez</em> ve Owner profile'ından <em>çekilemez</em>. Sistem kritik bir koruma
            kapısıdır (örn. hesap silme, sahiplik devri, plan değişikliği). Backend
            <code>is_protected=1</code> kontrolü her durumda yine de fail-secure davranır.
          </div>
        </div>

        <p v-if="selectedCap.description" class="detail-desc">
          {{ selectedCap.description }}
        </p>
        <dl class="detail-meta">
          <dt>Tier</dt>
          <dd>{{ selectedCap.default_tier }}</dd>
          <dt>Modül grubu</dt>
          <dd>{{ selectedCap.module_group }}</dd>
          <dt>Bayraklar</dt>
          <dd>
            <span v-if="selectedCap.is_owner_only" class="badge">Owner-only</span>
            <span v-if="selectedCap.is_protected" class="badge">Korumalı</span>
            <span v-if="selectedCap.requires_kyc" class="badge">KYC</span>
            <span v-if="selectedCap.requires_aml" class="badge">AML</span>
            <span v-if="selectedCap.plan_feature_flag" class="badge plan">
              {{ selectedCap.plan_feature_flag }}
            </span>
            <span
              v-if="
                !selectedCap.is_owner_only &&
                !selectedCap.is_protected &&
                !selectedCap.requires_kyc &&
                !selectedCap.requires_aml &&
                !selectedCap.plan_feature_flag
              "
              class="muted"
              >—</span
            >
          </dd>
          <dt>Aktif Grant'lar</dt>
          <dd>
            <span v-for="g in selectedCap.grants" :key="g" class="badge profile">{{ g }}</span>
            <span v-if="!selectedCap.grants?.length" class="muted">—</span>
          </dd>
        </dl>

        <section v-if="!selectedCap.is_owner_only" class="bulk-section">
          <header class="bulk-section-header">
            <h4>Toplu İşlem</h4>
            <span class="bulk-hint">Sub-user role'leri</span>
          </header>
          <p class="bulk-desc">
            Mağaza sahibi haricinde kalan sub-user role'lerine bu capability'i tek tıkla ver veya
            çek.
          </p>
          <div class="bulk-actions">
            <button
              type="button"
              class="btn ghost bulk-btn"
              :disabled="bulkSaving || !!bulkConfirm"
              @click="openBulkConfirm('grant')"
            >
              <AppIcon name="plus" :size="14" />
              Tüm sub-user'lara ver
            </button>
            <button
              type="button"
              class="btn ghost bulk-btn danger"
              :disabled="bulkSaving || !!bulkConfirm"
              @click="openBulkConfirm('revoke')"
            >
              <AppIcon name="minus" :size="14" />
              Tüm sub-user'lardan çek
            </button>
          </div>
        </section>

        <section v-if="selectedCap.plan_feature_flag" class="plan-section">
          <header class="plan-section-header">
            <h4>Plan Durumu</h4>
            <span
              v-if="planSyncByCap[selectedCap.key]?.is_unsynced"
              class="badge danger"
              title="Hiçbir plan'da bu feature etkin değil"
              >⚠ Tutarsız</span
            >
            <span
              v-else-if="planSyncByCap[selectedCap.key]?.plans_missing?.length === 0"
              class="badge success"
              title="Tüm plan'larda etkin"
              >✓ Tam Sync</span
            >
            <span v-else class="badge warning" title="Bazı planlarda eksik"> ◐ Kısmi </span>
          </header>
          <div class="plan-flag">
            <code>{{ selectedCap.plan_feature_flag }}</code>
          </div>
          <ul class="plan-list">
            <li
              v-for="p in planCodes"
              :key="p"
              :class="{
                enabled: planSyncByCap[selectedCap.key]?.plan_status?.[p],
                disabled: !planSyncByCap[selectedCap.key]?.plan_status?.[p],
              }"
            >
              <span class="plan-dot" />
              <span class="plan-code">{{ p }}</span>
              <span class="plan-status">
                {{ planSyncByCap[selectedCap.key]?.plan_status?.[p] ? "Etkin" : "Etkin değil" }}
              </span>
              <button
                type="button"
                class="plan-toggle"
                :class="{
                  remove: planSyncByCap[selectedCap.key]?.plan_status?.[p],
                  add: !planSyncByCap[selectedCap.key]?.plan_status?.[p],
                }"
                :disabled="planSavingPlan === p || planBulkSaving"
                @click="togglePlanFlag(p, !planSyncByCap[selectedCap.key]?.plan_status?.[p])"
              >
                {{
                  planSavingPlan === p
                    ? "…"
                    : planSyncByCap[selectedCap.key]?.plan_status?.[p]
                      ? "Çıkar"
                      : "+ Ekle"
                }}
              </button>
            </li>
          </ul>
          <div v-if="planSyncByCap[selectedCap.key]?.is_unsynced" class="plan-warning">
            <p>
              Bu capability hiçbir abonelik planında listelenmediği için grant verilse bile
              kullanıcı çağrıda red alır.
            </p>
            <button
              type="button"
              class="btn primary plan-cta"
              :disabled="planBulkSaving"
              :aria-busy="planBulkSaving"
              @click="addToAllPlans"
            >
              <AppIcon name="zap" :size="14" />
              {{ planBulkSaving ? "Ekleniyor…" : "Tüm planlara ekle" }}
            </button>
          </div>
        </section>
      </aside>
    </div>

    <!-- Bulk action onay modalı -->
    <Teleport to="body">
      <div
        v-if="bulkConfirm"
        class="bulk-modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="cancelBulkConfirm"
      >
        <div class="bulk-modal">
          <header class="bulk-modal-header">
            <h3>
              <AppIcon :name="bulkConfirm.action === 'grant' ? 'plus' : 'minus'" :size="18" />
              {{
                bulkConfirm.action === "grant" ? "Capability ver — onay" : "Capability çek — onay"
              }}
            </h3>
            <button type="button" class="modal-close" aria-label="Kapat" @click="cancelBulkConfirm">
              <AppIcon name="x" :size="16" />
            </button>
          </header>
          <div class="bulk-modal-body">
            <p>
              <strong>{{ selectedCap?.label }}</strong>
              capability'i
              <strong>{{ bulkConfirm.profiles.length }}</strong>
              sub-user role'üne
              {{ bulkConfirm.action === "grant" ? "eklenecek" : "çıkarılacak" }}:
            </p>
            <ul class="bulk-modal-list">
              <li v-for="p in bulkConfirm.profiles" :key="p">{{ p }}</li>
            </ul>
            <p class="bulk-modal-note">
              Owner ve Co-Owner role'leri etkilenmez. Bu işlem tek seferde
              {{ bulkConfirm.profiles.length }} grant kaydı
              {{ bulkConfirm.action === "grant" ? "oluşturur" : "siler" }}.
            </p>
          </div>
          <footer class="bulk-modal-footer">
            <button
              type="button"
              class="btn ghost"
              :disabled="bulkSaving"
              @click="cancelBulkConfirm"
            >
              İptal
            </button>
            <button
              type="button"
              class="btn primary"
              :class="{ danger: bulkConfirm.action === 'revoke' }"
              :disabled="bulkSaving"
              :aria-busy="bulkSaving"
              @click="executeBulkAction"
            >
              {{
                bulkSaving
                  ? "İşleniyor…"
                  : bulkConfirm.action === "grant"
                    ? `${bulkConfirm.profiles.length} role'e ver`
                    : `${bulkConfirm.profiles.length} role'den çek`
              }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .capability-matrix {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

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

  .matrix {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: 13px;
    th,
    td {
      padding: 8px 10px;
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
    .cap-col {
      position: sticky;
      left: 0;
      background: $l-bg;
      z-index: 1;
      min-width: 220px;
      max-width: 280px;
      @include dark {
        background: $d-bg-card;
      }
    }
    thead .cap-col {
      z-index: 3;
    }
    .profile-col {
      text-align: center;
      min-width: 80px;
      max-width: 110px;
      font-size: 12px;
      white-space: nowrap;
    }
    .profile-col.highlighted {
      background: rgba($brand, 0.12);
      color: $brand;
      font-weight: 700;
      box-shadow: inset 0 -2px 0 0 $brand;
    }
    .cell.highlighted {
      background: rgba($brand, 0.04);
      &:hover {
        background: rgba($brand, 0.1);
      }
    }
    tbody tr {
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
    .cap-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }
    .cap-flags {
      display: inline-flex;
      gap: 4px;
      font-size: 11px;
    }
    .cap-key {
      font-family:
        ui-monospace,
        JetBrains Mono,
        monospace;
      font-size: 11px;
      color: $l-text-500;
      margin-top: 2px;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .cell {
    text-align: center;
    cursor: pointer;
    user-select: none;
    transition: background $t-fast;
    &:hover {
      background: rgba($brand, 0.06);
    }
    &.disabled {
      cursor: not-allowed;
      opacity: 0.5;
      pointer-events: none;
    }
    &.pending {
      background: rgba(245, 158, 11, 0.15);
      box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.4);
    }
  }
  .mark {
    display: inline-block;
    width: 18px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
  }
  .granted-mark {
    color: $c-success;
  }
  .deny-mark {
    color: $l-text-300;
    @include dark {
      color: $d-text-faint;
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
  .detail-desc {
    margin-top: 10px;
    font-size: 13px;
    color: $l-text-700;
    @include dark {
      color: $d-text;
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
  .badge.profile {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
  }
  .badge.plan {
    background: rgba(245, 158, 11, 0.15);
    color: #b45309;
  }
  .muted {
    color: $l-text-300;
    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Sprint 5 — Plan sync ─────────────────────────────────
  .unsynced-flag {
    color: $c-error;
    font-weight: 700;
  }
  .plan-section {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .plan-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    }
  }
  .badge.danger {
    background: rgba($c-error, 0.15);
    color: $c-error;
  }
  .badge.success {
    background: rgba($c-success, 0.15);
    color: #047857;
  }
  .badge.warning {
    background: rgba($c-warning, 0.15);
    color: #b45309;
  }
  .plan-flag {
    margin-bottom: 8px;
    code {
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
  }
  .plan-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      padding: 4px 0;
    }
    .plan-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    li.enabled .plan-dot {
      background: $c-success;
    }
    li.disabled .plan-dot {
      background: $l-text-300;
      @include dark {
        background: $d-text-faint;
      }
    }
    .plan-code {
      font-weight: 600;
      min-width: 80px;
    }
    .plan-status {
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .plan-toggle {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid transparent;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background $t-fast,
      opacity $t-fast;
    background: transparent;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    &.add {
      color: $brand;
      border-color: rgba($brand, 0.3);
      &:not(:disabled):hover {
        background: rgba($brand, 0.1);
      }
    }
    &.remove {
      color: $l-text-500;
      border-color: $l-border;
      &:not(:disabled):hover {
        background: rgba($c-error, 0.1);
        color: $c-error;
        border-color: rgba($c-error, 0.3);
      }
      @include dark {
        color: $d-text-muted;
        border-color: $d-border;
      }
    }
  }
  .plan-warning {
    margin-top: 10px;
    padding: 10px 12px;
    background: rgba($c-error, 0.06);
    border-left: 3px solid $c-error;
    color: $l-text-700;
    font-size: 11px;
    border-radius: 4px;
    p {
      margin: 0 0 8px;
    }
    @include dark {
      color: $d-text;
    }
  }
  .plan-cta {
    width: 100%;
    justify-content: center;
    padding: 6px 12px;
    font-size: 12px;
  }

  // ── Sprint 6 — Korumalı capability uyarı banner ──────────
  .protection-banner {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 6px;
    margin-top: 10px;
    font-size: 11px;
    line-height: 1.5;
    color: $l-text-700;
    border: 1px solid;
    @include dark {
      color: $d-text;
    }
    &.owner-only {
      background: rgba(124, 58, 237, 0.07); // brand soft
      border-color: rgba(124, 58, 237, 0.25);
    }
    &.protected {
      background: rgba($c-error, 0.07);
      border-color: rgba($c-error, 0.25);
    }
    strong {
      color: inherit;
      font-weight: 600;
    }
    em {
      font-style: normal;
      font-weight: 600;
    }
    code {
      font-family:
        ui-monospace,
        JetBrains Mono,
        monospace;
      font-size: 10px;
      background: rgba($l-text-700, 0.08);
      padding: 1px 5px;
      border-radius: 3px;
    }
  }
  .banner-icon-wrap {
    flex-shrink: 0;
    font-size: 14px;
    line-height: 1;
  }
  .banner-text {
    flex: 1;
    min-width: 0;
  }

  // ── Sprint 6 — Bulk action ──────────────────────────────
  .bulk-section {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .bulk-section-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
    h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    }
  }
  .bulk-hint {
    font-size: 11px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .bulk-desc {
    margin: 0 0 10px;
    font-size: 11px;
    color: $l-text-500;
    line-height: 1.5;
    @include dark {
      color: $d-text-muted;
    }
  }
  .bulk-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bulk-btn {
    width: 100%;
    justify-content: center;
    font-size: 12px;
    padding: 6px 12px;
  }
  .bulk-btn.danger {
    color: $c-error;
    border-color: rgba($c-error, 0.3);
    &:not(:disabled):hover {
      background: rgba($c-error, 0.08);
      color: darken($c-error, 8%);
    }
  }

  // ── Bulk modal ──────────────────────────────────────────
  .bulk-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(#000, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .bulk-modal {
    background: $l-bg;
    border-radius: 10px;
    width: 100%;
    max-width: 420px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(#000, 0.18);
    @include dark {
      background: $d-bg-card;
    }
  }
  .bulk-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 14px;
      font-weight: 600;
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
      background: $l-bg-muted;
      @include dark {
        background: $d-bg-hover;
      }
    }
  }
  .bulk-modal-body {
    padding: 16px;
    font-size: 13px;
    line-height: 1.6;
    color: $l-text-700;
    p {
      margin: 0 0 10px;
    }
    @include dark {
      color: $d-text;
    }
  }
  .bulk-modal-list {
    list-style: disc;
    padding-left: 20px;
    margin: 0 0 12px;
    li {
      margin: 2px 0;
      font-family:
        ui-monospace,
        JetBrains Mono,
        monospace;
      font-size: 12px;
    }
  }
  .bulk-modal-note {
    font-size: 11px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .bulk-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid $l-border;
    background: $l-bg-soft;
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
    }
  }
  .btn.primary.danger {
    background: $c-error;
    &:not(:disabled):hover {
      background: darken($c-error, 6%);
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
    .body {
      flex-direction: column;
    }
    .matrix-scroll {
      max-height: 60vh;
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
    .matrix .cap-col {
      min-width: 160px;
      max-width: 200px;
    }
    .matrix .profile-col {
      min-width: 56px;
      font-size: 11px;
    }
    .cap-key {
      display: none;
    }
  }
</style>
