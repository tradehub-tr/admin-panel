<template>
  <div class="plans-tab">
    <p v-if="loading && !plans.length" class="state">{{ t("plans.loading") }}</p>

    <div v-else class="plans-layout">
      <!-- Sol: Plan listesi -->
      <aside class="plan-list">
        <button v-if="canManagePlans" type="button" class="plan-new-btn" @click="openCreateModal">
          + Yeni Plan
        </button>
        <button
          v-for="plan in plans"
          :key="plan.name"
          type="button"
          :class="[
            'plan-card',
            {
              active: selectedPlan?.plan_code === plan.plan_code,
              highlighted: plan.highlighted,
              inactive: !plan.is_active,
            },
          ]"
          @click="selectPlan(plan.plan_code)"
        >
          <div class="plan-card-header">
            <span class="plan-name">{{ plan.plan_name }}</span>
            <span v-if="plan.highlighted" class="badge badge-highlight">{{
              t("plans.popular")
            }}</span>
            <span v-if="!plan.is_active" class="badge badge-off">{{ t("plans.inactive") }}</span>
          </div>
          <div class="plan-price">
            {{
              plan.monthly_price > 0
                ? t("plans.pricePerMonth", { price: plan.monthly_price, currency: plan.currency })
                : t("plans.free")
            }}
          </div>
          <div class="plan-meta">
            {{ t("plans.activeSubscriptions", { count: plan.active_subscription_count }) }}
          </div>
        </button>
      </aside>

      <!-- Sağ: Plan editor -->
      <section class="plan-detail">
        <p v-if="!selectedPlan" class="state">{{ t("plans.selectPlanHint") }}</p>

        <template v-else>
          <div class="detail-header">
            <div>
              <h2>{{ selectedPlan.plan_name }}</h2>
              <p class="detail-meta">
                <code>{{ selectedPlan.plan_code }}</code> · {{ selectedPlan.monthly_price }}
                {{ selectedPlan.currency }}{{ t("plans.perMonthSuffix") }} ·
                {{ t("plans.activeSellers", { count: selectedPlan.active_subscription_count }) }}
              </p>
            </div>
            <div class="detail-actions">
              <button
                v-if="combinedDirty"
                type="button"
                class="btn-secondary"
                :disabled="saving"
                @click="reset"
              >
                {{ t("plans.cancel") }}
              </button>
              <button
                v-if="canManagePlans && selectedPlan"
                type="button"
                class="btn-danger"
                :disabled="!canDeleteCurrent || saving"
                :title="deleteDisabledReason"
                @click="confirmDelete"
              >
                Sil
              </button>
              <button type="button" class="btn-primary" :disabled="!combinedDirty || saving" @click="save">
                {{ saving ? t("plans.saving") : t("plans.saveChanges") }}
              </button>
            </div>
          </div>

          <!-- Sekmeler -->
          <nav class="tabs" role="tablist">
            <button
              v-for="tab in TABS"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :class="['tab', { active: activeTab === tab.id }]"
              @click="requestTabChange(tab.id)"
            >
              {{ tab.label }}
              <span v-if="tab.id === 'features'" class="tab-count">{{ localFeatures.length }}</span>
              <span v-if="tab.id === 'capabilities'" class="tab-count">{{ capCount }}</span>
            </button>
          </nav>

          <!-- TAB 1: Görsel & Pricing -->
          <section v-if="activeTab === 'display'" class="tab-pane">
            <div class="form-grid">
              <label class="field">
                <span class="field-label">{{ t("plans.badgeLabel") }}</span>
                <input
                  v-model="localDisplay.badge_label"
                  type="text"
                  class="input"
                  :placeholder="t('plans.badgeLabelPlaceholder')"
                />
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.badgeColor") }}</span>
                <select v-model="localDisplay.badge_color" class="input">
                  <option value="default">{{ t("plans.badgeColorDefault") }}</option>
                  <option value="yellow">{{ t("plans.badgeColorYellow") }}</option>
                  <option value="black">{{ t("plans.badgeColorBlack") }}</option>
                  <option value="premium">{{ t("plans.badgeColorPremium") }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.theme") }}</span>
                <select v-model="localDisplay.theme" class="input">
                  <option value="default">{{ t("plans.themeDefault") }}</option>
                  <option value="dark">{{ t("plans.themeDark") }}</option>
                  <option value="premium">{{ t("plans.themePremium") }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.planName") }}</span>
                <input v-model="localDisplay.plan_name" type="text" class="input" />
              </label>

              <label class="field field-wide">
                <span class="field-label">{{ t("plans.shortTagline") }}</span>
                <textarea
                  v-model="localDisplay.short_tagline"
                  rows="2"
                  class="input"
                  :placeholder="t('plans.shortTaglinePlaceholder')"
                ></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("plans.monthlyPrice", { currency: localDisplay.currency })
                }}</span>
                <input
                  v-model.number="localDisplay.monthly_price"
                  type="number"
                  min="0"
                  step="1"
                  class="input"
                />
              </label>
              <label class="field">
                <span class="field-label">{{
                  t("plans.yearlyPrice", { currency: localDisplay.currency })
                }}</span>
                <input
                  v-model.number="localDisplay.yearly_price"
                  type="number"
                  min="0"
                  step="1"
                  class="input"
                />
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.currency") }}</span>
                <select v-model="localDisplay.currency" class="input">
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="TRY">TRY (₺)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.trialDays") }}</span>
                <input
                  v-model.number="localDisplay.trial_days"
                  type="number"
                  min="0"
                  class="input"
                />
              </label>

              <label class="field">
                <span class="field-label">{{ t("plans.commissionRate") }}</span>
                <input
                  v-model.number="localDisplay.commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  class="input"
                />
              </label>
              <label class="field">
                <span class="field-label">Saha Komisyon Türü</span>
                <select v-model="localDisplay.field_commission_type" class="input">
                  <option value="Yüzde">Yüzde (paket fiyatının %'si)</option>
                  <option value="Sabit Ücret">Sabit Ücret (satış başına)</option>
                </select>
              </label>
              <label v-if="localDisplay.field_commission_type !== 'Sabit Ücret'" class="field">
                <span class="field-label">Saha Komisyon Oranı (%)</span>
                <input
                  v-model.number="localDisplay.field_commission_rate"
                  type="number"
                  min="0"
                  step="0.1"
                  class="input"
                />
              </label>
              <label v-else class="field">
                <span class="field-label">Saha Sabit Ücret</span>
                <input
                  v-model.number="localDisplay.field_commission_fixed_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input"
                />
              </label>
              <label class="field">
                <span class="field-label">Saha Komisyon Modu</span>
                <select v-model="localDisplay.field_commission_mode" class="input">
                  <option value="Tek seferlik">Tek seferlik</option>
                  <option value="Tekrarlayan">Tekrarlayan</option>
                  <option value="Belirli süre">Belirli süre</option>
                </select>
              </label>
              <label v-if="localDisplay.field_commission_mode === 'Belirli süre'" class="field">
                <span class="field-label">Komisyon Süresi (ay)</span>
                <input
                  v-model.number="localDisplay.field_commission_duration"
                  type="number"
                  min="0"
                  class="input"
                />
              </label>
            </div>
            <div class="quota-tiers-editor">
              <h4 class="subhead">Saha Kota Eşikleri</h4>
              <p class="hint">
                Bu pakette dönem içinde belirtilen satış sayısına ulaşan saha elemanı ilgili bonusu
                alır. En yüksek eşik kazanır. Dönem (Aylık/Çeyrek/Yıllık) Hakediş Ayarları'ndan
                ortak belirlenir.
              </p>
              <div v-for="(tier, idx) in localQuotaTiers" :key="idx" class="quota-tier-row">
                <label class="field">
                  <span class="field-label">Minimum Satış</span>
                  <input
                    v-model.number="tier.min_sales"
                    type="number"
                    min="1"
                    step="1"
                    class="input"
                  />
                </label>
                <label class="field">
                  <span class="field-label">Bonus Tutarı</span>
                  <input
                    v-model.number="tier.bonus_amount"
                    type="number"
                    min="0"
                    step="1"
                    class="input"
                  />
                </label>
                <button type="button" class="th-btn-outline" @click="removeQuotaTier(idx)">
                  Sil
                </button>
              </div>
              <button type="button" class="th-btn-outline" @click="addQuotaTier">
                + Eşik Ekle
              </button>
            </div>
            <div class="form-grid">
              <label class="field">
                <span class="field-label">{{ t("plans.maxActiveListings") }}</span>
                <input
                  v-model.number="localDisplay.max_active_listings"
                  type="number"
                  min="0"
                  class="input"
                  :placeholder="t('plans.unlimitedPlaceholder')"
                />
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.ctaLabel") }}</span>
                <input v-model="localDisplay.cta_label" type="text" class="input" />
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.ctaAction") }}</span>
                <select v-model="localDisplay.cta_action" class="input">
                  <option value="signup">{{ t("plans.ctaSignup") }}</option>
                  <option value="signup_billing">{{ t("plans.ctaSignupBilling") }}</option>
                  <option value="contact_sales">{{ t("plans.ctaContactSales") }}</option>
                  <option value="learn_more">{{ t("plans.ctaLearnMore") }}</option>
                </select>
              </label>

              <label class="field-checkbox">
                <input v-model="localDisplay.highlighted" type="checkbox" />
                <span>{{ t("plans.highlightedLabel") }}</span>
              </label>
              <label class="field-checkbox">
                <input v-model="localDisplay.is_active" type="checkbox" />
                <span>{{ t("plans.activeLabel") }}</span>
              </label>
              <label class="field-checkbox">
                <input v-model="localDisplay.is_public" type="checkbox" />
                <span>{{ t("plans.publicLabel") }}</span>
              </label>
              <label class="field">
                <span class="field-label">{{ t("plans.displayOrder") }}</span>
                <input v-model.number="localDisplay.display_order" type="number" class="input" />
              </label>
            </div>
          </section>

          <!-- TAB 2: Paket İçeriği — Matris (Faz J) -->
          <section v-else-if="activeTab === 'features'" class="tab-pane">
            <PlanFeatureEditor
              ref="featureEditorRef"
              :plan-code="selectedPlan?.plan_code || ''"
              @update:dirty="featuresDirty = $event"
            />
          </section>

          <!-- TAB 3: Yetkinlikler -->
          <section v-else-if="activeTab === 'capabilities'" class="tab-pane">
            <p class="section-desc">
              {{ t("plans.capabilitiesDescBefore") }}
              <strong>{{ t("plans.capabilitiesDescEmphasis") }}</strong>
              {{ t("plans.capabilitiesDescAfter") }}
            </p>

            <h4 class="subhead">{{ t("plans.capabilityFlags") }}</h4>
            <div class="cap-list">
              <label v-for="(value, key) in localCapabilities" :key="key" class="cap-row">
                <input
                  type="checkbox"
                  :checked="value"
                  @change="localCapabilities[key] = $event.target.checked"
                />
                <span class="cap-text">
                  <span class="cap-label">{{ capLabel(key) }}</span>
                  <code class="cap-key">{{ key }}</code>
                </span>
              </label>
            </div>

            <h4 class="subhead">{{ t("plans.quotaLimits") }}</h4>
            <p class="hint">
              <code>-1</code> {{ t("plans.quotaUnlimited") }} · <code>0</code>
              {{ t("plans.quotaDisabled") }} · {{ t("plans.quotaPositive") }}
            </p>
            <div class="quota-list">
              <div v-for="(value, key) in localQuotas" :key="key" class="quota-row">
                <span class="quota-key">{{ key }}</span>
                <input
                  type="number"
                  class="quota-input"
                  :value="value"
                  min="-1"
                  @input="localQuotas[key] = parseInt($event.target.value, 10)"
                />
              </div>
            </div>

            <h4 class="subhead">{{ t("plans.allowedRegions") }}</h4>
            <div class="region-list">
              <span v-for="r in selectedPlan.allowed_regions || []" :key="r" class="chip">{{
                r
              }}</span>
              <p v-if="!selectedPlan.allowed_regions?.length" class="muted">
                {{ t("plans.noRegions") }}
              </p>
            </div>
          </section>
        </template>
      </section>
    </div>

    <!-- Yeni Plan modal -->
    <Teleport to="body">
      <div v-if="createModalOpen" class="pln-modal-backdrop" @click.self="createModalOpen = false">
        <div class="pln-modal" role="dialog" aria-modal="true">
          <header class="pln-modal-header">
            <h3>Yeni Subscription Plan</h3>
            <button
              type="button"
              class="icon-btn"
              aria-label="Kapat"
              @click="createModalOpen = false"
            >
              ×
            </button>
          </header>
          <div class="pln-modal-body">
            <div class="pln-field">
              <label>Plan Code <span class="req">*</span></label>
              <input
                v-model.trim="newPlan.plan_code"
                type="text"
                placeholder="örn. premium"
                maxlength="40"
              />
              <p class="pln-hint">Lowercase, harf+rakam+tire+altçizgi. Sonradan değişmez.</p>
            </div>
            <div class="pln-field">
              <label>Plan Adı <span class="req">*</span></label>
              <input
                v-model.trim="newPlan.plan_name"
                type="text"
                placeholder="örn. Premium"
                maxlength="80"
              />
            </div>
            <div class="pln-field">
              <label>Kısa Açıklama</label>
              <input
                v-model.trim="newPlan.description"
                type="text"
                placeholder="Marketing copy (opsiyonel)"
                maxlength="200"
              />
            </div>
            <div class="pln-row">
              <div class="pln-field">
                <label>Aylık Fiyat</label>
                <input v-model.number="newPlan.monthly_price" type="number" min="0" step="0.01" />
              </div>
              <div class="pln-field">
                <label>Yıllık Fiyat</label>
                <input v-model.number="newPlan.yearly_price" type="number" min="0" step="0.01" />
              </div>
              <div class="pln-field">
                <label>Currency</label>
                <select v-model="newPlan.currency">
                  <option>EUR</option>
                  <option>USD</option>
                  <option>TRY</option>
                </select>
              </div>
            </div>
            <div class="pln-row">
              <div class="pln-field">
                <label>Komisyon (%)</label>
                <input v-model.number="newPlan.commission_rate" type="number" min="0" step="0.1" />
              </div>
              <div class="pln-field">
                <label>Max Aktif Ürün</label>
                <input v-model.number="newPlan.max_active_listings" type="number" min="0" />
              </div>
              <div class="pln-field">
                <label>Trial (gün)</label>
                <input v-model.number="newPlan.trial_days" type="number" min="0" />
              </div>
            </div>
            <div class="pln-field-row">
              <label class="pln-check">
                <input v-model="newPlan.is_active" type="checkbox" />
                <span>Aktif</span>
              </label>
              <label class="pln-check">
                <input v-model="newPlan.is_public" type="checkbox" />
                <span>Storefront'ta görünür (public)</span>
              </label>
            </div>
            <p class="pln-hint warn">
              ⚠ capability_flags ve quota_limits boş başlar — oluşturulduktan sonra düzenlersiniz.
            </p>
          </div>
          <footer class="pln-modal-footer">
            <button type="button" class="btn-secondary" @click="createModalOpen = false">
              İptal
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="!newPlan.plan_code || !newPlan.plan_name || creating"
              @click="executeCreate"
            >
              {{ creating ? "Oluşturuluyor…" : "Oluştur" }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- Plan silme onayı -->
    <Teleport to="body">
      <div
        v-if="deleteDialog.open"
        class="pln-modal-backdrop"
        @click.self="deleteDialog.open = false"
      >
        <div class="pln-confirm">
          <h3>Planı Sil</h3>
          <p>
            <strong>{{ deleteDialog.planCode }}</strong> planı silinecek. Bu işlem geri alınamaz.
            Plan'a bağlı capability_flags + quota_limits + pricing_features de temizlenir.
          </p>
          <footer>
            <button type="button" class="btn-secondary" @click="deleteDialog.open = false">
              İptal
            </button>
            <button
              type="button"
              class="btn-danger"
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
  import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { usePermissionStore } from "@/stores/permission";
  import { useAuthStore } from "@/stores/auth";
  import { useToast } from "@/composables/useToast";
  import PlanFeatureEditor from "./PlanFeatureEditor.vue";

  const { t, te } = useI18n();

  // Capability anahtarları teknik (feature.import.xml_feed gibi). plans.capLabels
  // altında insan-okur bir karşılığı varsa onu göster; yoksa ham anahtara düş.
  function capLabel(key) {
    const path = `plans.capLabels.${key}`;
    return te(path) ? t(path) : key;
  }

  const TABS = computed(() => [
    { id: "display", label: t("plans.tabDisplay") },
    { id: "features", label: t("plans.tabFeatures") },
    { id: "capabilities", label: t("plans.tabCapabilities") },
  ]);

  const DISPLAY_FIELDS = [
    "plan_name",
    "description",
    "badge_label",
    "badge_color",
    "theme",
    "short_tagline",
    "monthly_price",
    "yearly_price",
    "currency",
    "commission_rate",
    "field_commission_type",
    "field_commission_rate",
    "field_commission_fixed_amount",
    "field_commission_mode",
    "field_commission_duration",
    "max_active_listings",
    "cta_label",
    "cta_action",
    "highlighted",
    "display_order",
    "trial_days",
    "is_active",
    "is_public",
  ];

  function emptyDisplay() {
    return Object.fromEntries(DISPLAY_FIELDS.map((k) => [k, ""]));
  }

  const store = usePermissionStore();
  const auth = useAuthStore();
  const toast = useToast();
  const { plans, selectedPlan, loading, featureCatalogKeys } =
    storeToRefs(store);


  // ── Plan CRUD state (Süper Admin only) ───────────────────
  // canManagePlans: System Manager veya Administrator (Marketplace Admin değil).
  // Backend Faz F.4 + Plan CRUD ile aynı role separation.
  const canManagePlans = computed(() => {
    if (auth.isAdmin) return true;
    return (auth.userRoles || []).includes("System Manager");
  });

  // Protected plan kodları (sistem tarafında silinemez) — UI'da disable
  const PROTECTED_PLAN_CODES = new Set([
    "FREE",
    "STARTER",
    "PRO",
    "ENTERPRISE",
    "free",
    "starter",
    "pro",
    "enterprise",
  ]);

  const canDeleteCurrent = computed(() => {
    if (!selectedPlan.value) return false;
    if (PROTECTED_PLAN_CODES.has(selectedPlan.value.plan_code)) return false;
    if ((selectedPlan.value.active_subscription_count || 0) > 0) return false;
    return true;
  });

  const deleteDisabledReason = computed(() => {
    if (!selectedPlan.value) return "";
    if (PROTECTED_PLAN_CODES.has(selectedPlan.value.plan_code))
      return "Korumalı temel plan silinemez";
    if ((selectedPlan.value.active_subscription_count || 0) > 0)
      return `${selectedPlan.value.active_subscription_count} aktif abonelik var — önce abonelikleri taşıyın`;
    return "Planı sil";
  });

  const createModalOpen = ref(false);
  const creating = ref(false);
  const newPlan = reactive({
    plan_code: "",
    plan_name: "",
    description: "",
    monthly_price: 0,
    yearly_price: 0,
    currency: "EUR",
    commission_rate: 0,
    max_active_listings: 0,
    trial_days: 0,
    is_active: true,
    is_public: false,
  });

  const deleteDialog = reactive({ open: false, planCode: "", submitting: false });

  function openCreateModal() {
    Object.assign(newPlan, {
      plan_code: "",
      plan_name: "",
      description: "",
      monthly_price: 0,
      yearly_price: 0,
      currency: "EUR",
      commission_rate: 0,
      max_active_listings: 0,
      trial_days: 0,
      is_active: true,
      is_public: false,
    });
    createModalOpen.value = true;
  }

  async function executeCreate() {
    if (creating.value) return;
    creating.value = true;
    try {
      const res = await store.createSubscriptionPlan({ ...newPlan });
      toast.success(`Plan "${res?.plan_code || newPlan.plan_code}" oluşturuldu`);
      createModalOpen.value = false;
      // Yeni oluşturulan plan'ı seç
      if (res?.plan_code) await store.fetchPlanFullDetail(res.plan_code);
    } catch (e) {
      toast.error(e?.message || "Plan oluşturulamadı");
    } finally {
      creating.value = false;
    }
  }

  function confirmDelete() {
    if (!selectedPlan.value || !canDeleteCurrent.value) return;
    deleteDialog.planCode = selectedPlan.value.plan_code;
    deleteDialog.open = true;
  }

  async function executeDelete() {
    if (deleteDialog.submitting) return;
    deleteDialog.submitting = true;
    try {
      await store.deleteSubscriptionPlan(deleteDialog.planCode);
      toast.success(`Plan "${deleteDialog.planCode}" silindi`);
      deleteDialog.open = false;
    } catch (e) {
      toast.error(e?.message || "Silme başarısız");
    } finally {
      deleteDialog.submitting = false;
    }
  }

  const activeTab = ref("display");
  const localDisplay = ref(emptyDisplay());

  const localCapabilities = ref({});
  const localQuotas = ref({});
  const localFeatures = ref([]);
  const localQuotaTiers = ref([]);
  const saving = ref(false);

  const capCount = computed(() => Object.values(localCapabilities.value).filter(Boolean).length);

  // "Paket İçeriği" matrisi ayrı bir bileşen (PlanFeatureEditor). Kendi taslağını
  // tutuyor; dirty'sini emit ile öğrenip tek "Değişiklikleri Kaydet" butonuna ve
  // veri-kaybı guard'larına dahil ediyoruz.
  const featureEditorRef = ref(null);
  const featuresDirty = ref(false);

  const dirty = computed(() => {
    if (!selectedPlan.value) return false;
    const sp = selectedPlan.value;
    const origDisplay = Object.fromEntries(DISPLAY_FIELDS.map((k) => [k, sp[k] ?? ""]));
    return (
      JSON.stringify(origDisplay) !== JSON.stringify(localDisplay.value) ||
      JSON.stringify(sp.capability_flags || {}) !== JSON.stringify(localCapabilities.value) ||
      JSON.stringify(sp.quota_limits || {}) !== JSON.stringify(localQuotas.value) ||
      JSON.stringify(sp.pricing_features || []) !== JSON.stringify(localFeatures.value) ||
      JSON.stringify(sp.quota_tiers || []) !== JSON.stringify(localQuotaTiers.value)
    );
  });

  // Görüntüleme/Yetenekler + Paket İçeriği matrisi birlikte.
  const combinedDirty = computed(() => dirty.value || featuresDirty.value);

  const UNSAVED_MSG =
    "Kaydedilmemiş değişiklikleriniz var. Devam ederseniz bu değişiklikler kaybolur. Devam edilsin mi?";

  async function selectPlan(planCode) {
    if (planCode === selectedPlan.value?.plan_code) return;
    // Plan değiştirmeden önce kaydedilmemiş değişiklik varsa onay iste.
    if (combinedDirty.value && !window.confirm(UNSAVED_MSG)) return;
    try {
      await store.fetchPlanFullDetail(planCode);
    } catch {
      /* banner */
    }
  }

  // Sekme değişimi: Paket İçeriği'nde kaydedilmemiş matris değişikliği varken
  // başka sekmeye geçiş bileşeni unmount edip taslağı siler → önce onay iste.
  function requestTabChange(tabId) {
    if (tabId === activeTab.value) return;
    if (activeTab.value === "features" && featuresDirty.value && !window.confirm(UNSAVED_MSG)) {
      return;
    }
    if (activeTab.value === "features") featuresDirty.value = false; // taslak unmount'ta silinecek
    activeTab.value = tabId;
  }

  function reset() {
    syncFromSelected();
    featureEditorRef.value?.discard?.();
  }

  function syncFromSelected() {
    const sp = selectedPlan.value;
    if (!sp) return;
    localDisplay.value = Object.fromEntries(DISPLAY_FIELDS.map((k) => [k, sp[k] ?? ""]));
    localCapabilities.value = { ...(sp.capability_flags || {}) };
    localQuotas.value = { ...(sp.quota_limits || {}) };
    localFeatures.value = (sp.pricing_features || []).map((f) => ({
      display_text: f.display_text || "",
      icon: f.icon || "check",
      is_disabled: !!f.is_disabled,
      feature_key: f.feature_key || null,
      tooltip: f.tooltip || null,
      sort_order: f.sort_order ?? 0,
    }));
    localQuotaTiers.value = (sp.quota_tiers || []).map((t) => ({
      min_sales: Number(t.min_sales) || 0,
      bonus_amount: Number(t.bonus_amount) || 0,
    }));
  }

  function addFeature() {
    localFeatures.value.push({
      display_text: "",
      icon: "check",
      is_disabled: false,
      feature_key: null,
      tooltip: null,
      sort_order: localFeatures.value.length,
    });
  }

  function removeFeature(idx) {
    localFeatures.value.splice(idx, 1);
  }

  function addQuotaTier() {
    localQuotaTiers.value.push({ min_sales: 0, bonus_amount: 0 });
  }
  function removeQuotaTier(idx) {
    localQuotaTiers.value.splice(idx, 1);
  }

  async function save() {
    if (!selectedPlan.value || !combinedDirty.value) return;
    saving.value = true;
    try {
      // 1) Görüntüleme/Yetenek blokları — sadece değişenleri gönder.
      const sp = selectedPlan.value;
      const payload = {};
      const origDisplay = Object.fromEntries(DISPLAY_FIELDS.map((k) => [k, sp[k] ?? ""]));
      if (JSON.stringify(origDisplay) !== JSON.stringify(localDisplay.value)) {
        payload.display = { ...localDisplay.value };
      }
      if (JSON.stringify(sp.capability_flags || {}) !== JSON.stringify(localCapabilities.value)) {
        payload.capabilityFlags = localCapabilities.value;
      }
      if (JSON.stringify(sp.quota_limits || {}) !== JSON.stringify(localQuotas.value)) {
        payload.quotaLimits = localQuotas.value;
      }
      if (JSON.stringify(sp.pricing_features || []) !== JSON.stringify(localFeatures.value)) {
        payload.pricingFeatures = localFeatures.value;
      }
      if (JSON.stringify(sp.quota_tiers || []) !== JSON.stringify(localQuotaTiers.value)) {
        payload.quotaTiers = localQuotaTiers.value
          .map((t) => ({
            min_sales: Number(t.min_sales) || 0,
            bonus_amount: Number(t.bonus_amount) || 0,
          }))
          .filter((t) => t.min_sales > 0);
      }
      if (Object.keys(payload).length) {
        await store.updatePricingPlan(selectedPlan.value.plan_code, payload);
      }

      // 2) Paket İçeriği matrisi — aynı butondan kaydet (editor mount'luysa).
      if (featuresDirty.value && featureEditorRef.value?.save) {
        await featureEditorRef.value.save();
      }

      await store.fetchPlanFullDetail(selectedPlan.value.plan_code);
      await store.fetchPlans(); // sol liste güncelleme
    } finally {
      saving.value = false;
    }
  }

  watch(selectedPlan, syncFromSelected, { immediate: true });

  // Sayfa yenileme / sekme kapatma sırasında kaydedilmemiş değişiklik varsa tarayıcı uyarsın.
  function beforeUnloadGuard(e) {
    if (!combinedDirty.value) return;
    e.preventDefault();
    e.returnValue = "";
  }
  onMounted(() => window.addEventListener("beforeunload", beforeUnloadGuard));
  onUnmounted(() => window.removeEventListener("beforeunload", beforeUnloadGuard));

  onMounted(async () => {
    if (!plans.value.length) {
      try {
        await store.fetchPlans();
      } catch {
        /* banner */
      }
    }
    if (!featureCatalogKeys.value.length) {
      try {
        await store.fetchFeatureCatalogKeys();
      } catch {
        /* fallback: null seçenek var */
      }
    }
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .plans-tab {
    display: block;
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
  code {
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 0.125rem 0.4rem;
    border-radius: 4px;
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
  }

  .plans-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 1.5rem;
    min-height: 560px;
  }

  // ── Plan list ───────────────────────────────────────────────
  .plan-list {
    border-right: 1px solid $l-border;
    padding-right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    @include dark {
      border-right-color: $d-border;
    }
  }
  .plan-card {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    padding: 0.8rem;
    cursor: pointer;
    text-align: left;
    transition: all $t-base;

    &:hover {
      border-color: rgba($brand, 0.4);
    }
    &.active {
      background: rgba($brand, 0.08);
      border-color: $brand;
    }
    &.highlighted:not(.active) {
      background: rgba($c-warning, 0.08);
      border-color: rgba($c-warning, 0.3);
    }
    &.inactive {
      opacity: 0.55;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;

      &:hover {
        border-color: rgba($brand-light, 0.45);
      }
      &.active {
        background: rgba($brand-light, 0.12);
        border-color: $brand-light;
      }
      &.highlighted:not(.active) {
        background: rgba($c-warning, 0.12);
      }
    }
  }
  .plan-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
  }
  .plan-name {
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text-max;
    }
  }
  .plan-price {
    font-size: 1.05rem;
    font-weight: 700;
    color: $brand;
    font-variant-numeric: tabular-nums;

    @include dark {
      color: $brand-light;
    }
  }
  .plan-meta {
    font-size: 0.72rem;
    color: $l-text-500;
    margin-top: 0.25rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .badge {
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge-highlight {
    background: $c-warning;
    color: #fff;
  }
  .badge-off {
    background: $l-text-400;
    color: #fff;

    @include dark {
      background: $d-text-faint;
    }
  }

  // ── Detail header ─────────────────────────────────────────
  .plan-detail h2 {
    margin: 0 0 0.25rem;
    color: $l-text-900;
    font-size: 1.15rem;
    font-weight: 600;

    @include dark {
      color: $d-text-max;
    }
  }
  .detail-meta {
    color: $l-text-500;
    font-size: 0.875rem;
    margin: 0;

    @include dark {
      color: $d-text-muted;
    }
  }
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid $l-border;

    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .detail-actions {
    display: flex;
    gap: 0.5rem;
  }

  // ── Buttons ───────────────────────────────────────────────
  .btn-primary {
    background: $brand;
    color: #fff;
    border: none;
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all $t-base;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, $brand 88%, #000);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  .btn-secondary {
    background: $l-bg;
    color: $l-text-700;
    border: 1px solid $l-border;
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all $t-base;

    &:hover:not(:disabled) {
      border-color: $brand;
      color: $brand;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;

      &:hover:not(:disabled) {
        border-color: $brand-light;
        color: $brand-light;
      }
    }
  }
  .btn-icon-danger {
    background: transparent;
    border: 1px solid $l-border;
    color: $l-text-500;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    transition: all $t-base;

    &:hover {
      background: rgba($c-error, 0.1);
      border-color: $c-error;
      color: $c-error;
    }

    @include dark {
      border-color: $d-border-inner;
      color: $d-text-muted;
    }
  }

  // ── Tabs ──────────────────────────────────────────────────
  .tabs {
    display: flex;
    gap: 0.25rem;
    margin: 1rem 0 0.75rem;
    border-bottom: 1px solid $l-border;

    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .tab {
    background: transparent;
    border: none;
    padding: 0.55rem 0.9rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: $l-text-500;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    transition: all $t-base;

    &:hover {
      color: $l-text-900;
    }
    &.active {
      color: $brand;
      border-bottom-color: $brand;
    }

    @include dark {
      color: $d-text-muted;

      &:hover {
        color: $d-text-max;
      }
      &.active {
        color: $brand-light;
        border-bottom-color: $brand-light;
      }
    }
  }
  .tab-count {
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;

    .tab.active & {
      background: rgba($brand, 0.15);
      color: $brand;
    }

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;

      .tab.active & {
        background: rgba($brand-light, 0.18);
        color: $brand-light;
      }
    }
  }

  .tab-pane {
    padding: 0.75rem 0;
  }

  // ── Form grid (display tab) ───────────────────────────────
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.85rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;

    &.field-wide {
      grid-column: 1 / -1;
    }
  }
  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: $l-text-700;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    @include dark {
      color: $d-text-hi;
    }
  }
  .field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.65rem;
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    border-radius: 6px;
    font-size: 0.875rem;
    color: $l-text-900;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: $l-bg-muted;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
      color: $d-text-max;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }
  .input {
    width: 100%;
    border: 1px solid $l-border;
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.875rem;
    font-family: inherit;
    transition: border-color $t-base;

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-max;

      &:focus {
        border-color: $brand-light;
        box-shadow: 0 0 0 3px rgba($brand-light, 0.2);
      }
    }
  }
  textarea.input {
    resize: vertical;
    font-family: inherit;
  }

  // ── Features (paket içeriği) ──────────────────────────────
  .section-desc {
    color: $l-text-500;
    font-size: 0.8125rem;
    margin: 0 0 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .feature-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .feature-row {
    display: grid;
    grid-template-columns: 110px 1fr 200px auto 32px;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.55rem;
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    border-radius: 6px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
    }
  }
  .feature-icon-sel,
  .feature-key-sel {
    font-size: 0.78rem;
    padding: 0.4rem 0.5rem;
  }
  .feature-text {
    font-size: 0.875rem;
  }
  .feature-disabled-check {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    color: $l-text-700;
    white-space: nowrap;

    @include dark {
      color: $d-text-hi;
    }
  }
  .feature-actions {
    margin-top: 0.75rem;
  }
  .empty {
    padding: 1.5rem;
    text-align: center;
    color: $l-text-500;
    background: $l-bg-subtle;
    border: 1px dashed $l-border;
    border-radius: 8px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-muted;
    }
  }

  // ── Capabilities + Quotas ─────────────────────────────────
  .subhead {
    font-size: 0.78rem;
    font-weight: 600;
    color: $l-text-700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 1.2rem 0 0.5rem;

    @include dark {
      color: $d-text-hi;
    }
  }
  .hint {
    color: $l-text-500;
    font-size: 0.8125rem;
    margin: 0 0 0.6rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .cap-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.5rem;
  }
  .cap-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.65rem;
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8125rem;

    &:hover {
      background: $l-bg-muted;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }
  .cap-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .cap-label {
    color: $l-text-900;
    font-size: 0.8125rem;
    font-weight: 500;

    @include dark {
      color: $d-text-max;
    }
  }
  .cap-key {
    font-family: ui-monospace, monospace;
    color: $l-text-500;
    font-size: 0.7rem;
    background: transparent;
    padding: 0;

    @include dark {
      color: $d-text-muted;
    }
  }
  .quota-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .quota-row {
    display: grid;
    grid-template-columns: 1fr 120px;
    align-items: center;
    gap: 1rem;
    padding: 0.55rem 0.65rem;
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    border-radius: 6px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
    }
  }
  .quota-key {
    font-family: ui-monospace, monospace;
    color: $l-text-900;
    font-size: 0.8125rem;

    @include dark {
      color: $d-text-hi;
    }
  }
  .quota-input {
    border: 1px solid $l-border;
    border-radius: 6px;
    padding: 0.4rem 0.55rem;
    text-align: right;
    font-family: ui-monospace, monospace;
    background: $l-bg;
    color: $l-text-900;

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;

      &:focus {
        border-color: $brand-light;
        box-shadow: 0 0 0 3px rgba($brand-light, 0.2);
      }
    }
  }
  .region-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    background: rgba($brand, 0.1);
    color: $brand;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid rgba($brand, 0.2);

    @include dark {
      background: rgba($brand-light, 0.12);
      color: $brand-light;
      border-color: rgba($brand-light, 0.25);
    }
  }

  // ── Quota tier editor ────────────────────────────────────
  .quota-tiers-editor {
    margin: 1rem 0 0.5rem;
  }
  .quota-tier-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    margin-bottom: 0.5rem;

    .field {
      flex: 1;
    }
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 900px) {
    .plans-layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .plan-list {
      border-right: none;
      border-bottom: 1px solid $l-border;
      padding-right: 0;
      padding-bottom: 1rem;
      flex-direction: row;
      overflow-x: auto;

      @include dark {
        border-bottom-color: $d-border;
      }

      .plan-card {
        min-width: 200px;
      }
    }
    .detail-header {
      flex-direction: column;
    }
    .feature-row {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  // ── Plan CRUD UI (Faz I) ──────────────────────────────
  .plan-new-btn {
    width: 100%;
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.75rem;
    background: $brand;
    color: white;
    border: 1px solid $brand;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $t-fast;

    &:hover {
      filter: brightness(1.06);
    }
  }
  .btn-danger {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid rgba($c-error, 0.35);
    background: transparent;
    color: $c-error;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $t-fast;

    &:hover:not(:disabled) {
      background: rgba($c-error, 0.08);
      border-color: $c-error;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @include dark {
      color: $c-error;
      border-color: rgba($c-error, 0.4);

      &:hover:not(:disabled) {
        background: rgba($c-error, 0.12);
      }
    }
  }
  .pln-modal-backdrop {
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
  .pln-modal,
  .pln-confirm {
    width: 100%;
    max-width: 560px;
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
  .pln-confirm {
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

      @include dark {
        color: $d-text-hi;
      }
    }
    footer {
      display: flex;
      gap: 0.6rem;
      justify-content: flex-end;
    }
  }
  .pln-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid $l-border;

    h3 {
      margin: 0;
      font-size: 1rem;
      color: $l-text-900;

      @include dark {
        color: $d-text-max;
      }
    }
    @include dark {
      border-bottom-color: $d-border;
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
  }
  .pln-modal-body {
    padding: 1.25rem;
    overflow-y: auto;
    flex: 1;
  }
  .pln-field {
    margin-bottom: 1rem;
    flex: 1 1 0;

    > label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: $l-text-700;
      margin-bottom: 0.35rem;

      .req {
        color: $c-error;
      }

      @include dark {
        color: $d-text-hi;
      }
    }

    input[type="text"],
    input[type="number"],
    select {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid $l-border;
      border-radius: 6px;
      font-size: 0.875rem;
      background: $l-bg;
      color: $l-text-900;
      box-sizing: border-box;

      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text-max;
      }
    }
  }
  .pln-row {
    display: flex;
    gap: 0.75rem;
  }
  .pln-field-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .pln-check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
    color: $l-text-700;
    cursor: pointer;

    @include dark {
      color: $d-text-hi;
    }
  }
  .pln-hint {
    font-size: 0.75rem;
    color: $l-text-400;
    margin: 0.35rem 0 0;

    &.warn {
      color: $c-warning;
      font-weight: 500;
      margin-top: 0.75rem;
    }

    @include dark {
      color: $d-text-faint;
    }
  }
  .pln-modal-footer {
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

  // ── Faz J: Paket İçeriği matris ─────────────────────────
  .matrix-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
  }

  .pending-count {
    margin-right: auto;
    font-size: 13px;
    font-weight: 600;
    color: $c-warning;
  }

  .matrix-scroll {
    overflow-x: auto;
    border: 1px solid $l-border;
    border-radius: 8px;
    @include dark {
      border-color: $d-border;
    }
  }

  .features-matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    thead th {
      position: sticky;
      top: 0;
      background: $l-bg-soft;
      z-index: 1;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid $l-border;
      @include dark {
        background: $d-bg-elevated;
        border-bottom-color: $d-border;
      }
    }

    th.plan-col {
      text-align: center;
      min-width: 110px;
    }

    .plan-code {
      display: block;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
      color: $l-text-500;
      text-transform: uppercase;
      @include dark {
        color: $d-text-muted;
      }
    }

    th.feature-col {
      min-width: 220px;
    }

    tbody tr.category-row {
      background: rgba($brand, 0.04);
      @include dark {
        background: rgba($brand, 0.08);
      }
    }

    .category-cell {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: $brand;
    }

    tr.feature-row-tr td {
      padding: 8px 12px;
      border-bottom: 1px solid $l-border;
      @include dark {
        border-bottom-color: $d-border;
      }
    }

    .feature-name {
      font-weight: 500;
    }

    .feature-key-hint {
      display: block;
      font-size: 10px;
      color: $l-text-500;
      margin-top: 2px;
      @include dark {
        color: $d-text-faint;
      }
    }

    td.cell {
      text-align: center;
      transition: background $t-fast;
    }

    td.cell.pending {
      box-shadow: inset 0 0 0 2px rgba(245, 158, 11, 0.5);
      background: rgba(245, 158, 11, 0.08);
    }

    .cell-text {
      width: 100%;
      max-width: 110px;
      text-align: center;
      font-size: 12px;
      padding: 4px 6px;
    }
  }
</style>
