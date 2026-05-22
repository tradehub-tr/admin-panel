<template>
  <div class="plans-tab">
    <p v-if="loading && !plans.length" class="state">Yükleniyor…</p>

    <div v-else class="plans-layout">
      <!-- Sol: Plan listesi -->
      <aside class="plan-list">
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
            <span v-if="plan.highlighted" class="badge badge-highlight">Popüler</span>
            <span v-if="!plan.is_active" class="badge badge-off">Pasif</span>
          </div>
          <div class="plan-price">
            {{ plan.monthly_price > 0 ? `${plan.monthly_price} ${plan.currency}/ay` : "Ücretsiz" }}
          </div>
          <div class="plan-meta">{{ plan.active_subscription_count }} aktif abonelik</div>
        </button>
      </aside>

      <!-- Sağ: Plan editor -->
      <section class="plan-detail">
        <p v-if="!selectedPlan" class="state">Soldaki listeden bir plan seçin.</p>

        <template v-else>
          <div class="detail-header">
            <div>
              <h2>{{ selectedPlan.plan_name }}</h2>
              <p class="detail-meta">
                <code>{{ selectedPlan.plan_code }}</code> · {{ selectedPlan.monthly_price }}
                {{ selectedPlan.currency }}/ay · {{ selectedPlan.active_subscription_count }} aktif
                satıcı
              </p>
            </div>
            <div class="detail-actions">
              <button
                v-if="dirty"
                type="button"
                class="btn-secondary"
                :disabled="saving"
                @click="reset"
              >
                İptal
              </button>
              <button type="button" class="btn-primary" :disabled="!dirty || saving" @click="save">
                {{ saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet" }}
              </button>
            </div>
          </div>

          <!-- Sekmeler -->
          <nav class="tabs" role="tablist">
            <button
              v-for="t in TABS"
              :key="t.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === t.id"
              :class="['tab', { active: activeTab === t.id }]"
              @click="activeTab = t.id"
            >
              {{ t.label }}
              <span v-if="t.id === 'features'" class="tab-count">{{ localFeatures.length }}</span>
              <span v-if="t.id === 'capabilities'" class="tab-count">{{ capCount }}</span>
            </button>
          </nav>

          <!-- TAB 1: Görsel & Pricing -->
          <section v-if="activeTab === 'display'" class="tab-pane">
            <div class="form-grid">
              <label class="field">
                <span class="field-label">Badge Label</span>
                <input
                  v-model="localDisplay.badge_label"
                  type="text"
                  class="input"
                  placeholder="EN POPÜLER"
                />
              </label>
              <label class="field">
                <span class="field-label">Badge Rengi</span>
                <select v-model="localDisplay.badge_color" class="input">
                  <option value="default">Varsayılan</option>
                  <option value="yellow">Sarı</option>
                  <option value="black">Siyah</option>
                  <option value="premium">Premium (gradient)</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Tema</span>
                <select v-model="localDisplay.theme" class="input">
                  <option value="default">Standart</option>
                  <option value="dark">Koyu</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Plan Adı</span>
                <input v-model="localDisplay.plan_name" type="text" class="input" />
              </label>

              <label class="field field-wide">
                <span class="field-label">Kısa Slogan (Storefront)</span>
                <textarea
                  v-model="localDisplay.short_tagline"
                  rows="2"
                  class="input"
                  placeholder="Avrupa pazarına ilk adımını atan üreticiler için."
                ></textarea>
              </label>

              <label class="field">
                <span class="field-label">Aylık Fiyat ({{ localDisplay.currency }})</span>
                <input
                  v-model.number="localDisplay.monthly_price"
                  type="number"
                  min="0"
                  step="1"
                  class="input"
                />
              </label>
              <label class="field">
                <span class="field-label">Yıllık Fiyat ({{ localDisplay.currency }})</span>
                <input
                  v-model.number="localDisplay.yearly_price"
                  type="number"
                  min="0"
                  step="1"
                  class="input"
                />
              </label>
              <label class="field">
                <span class="field-label">Para Birimi</span>
                <select v-model="localDisplay.currency" class="input">
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="TRY">TRY (₺)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">Trial (gün)</span>
                <input
                  v-model.number="localDisplay.trial_days"
                  type="number"
                  min="0"
                  class="input"
                />
              </label>

              <label class="field">
                <span class="field-label">Komisyon (%)</span>
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
                <span class="field-label">Max Aktif Ürün (display)</span>
                <input
                  v-model.number="localDisplay.max_active_listings"
                  type="number"
                  min="0"
                  class="input"
                  placeholder="0 = sınırsız"
                />
              </label>
              <label class="field">
                <span class="field-label">CTA Buton Metni</span>
                <input v-model="localDisplay.cta_label" type="text" class="input" />
              </label>
              <label class="field">
                <span class="field-label">CTA Aksiyon</span>
                <select v-model="localDisplay.cta_action" class="input">
                  <option value="signup">Üye ol</option>
                  <option value="signup_billing">Üye ol + Ödeme</option>
                  <option value="contact_sales">Satışla iletişim</option>
                  <option value="learn_more">Detaylı bilgi</option>
                </select>
              </label>

              <label class="field-checkbox">
                <input v-model="localDisplay.highlighted" type="checkbox" />
                <span>En Popüler (vurgulu kart)</span>
              </label>
              <label class="field-checkbox">
                <input v-model="localDisplay.is_active" type="checkbox" />
                <span>Aktif</span>
              </label>
              <label class="field-checkbox">
                <input v-model="localDisplay.is_public" type="checkbox" />
                <span>Storefront'ta Göster (Public)</span>
              </label>
              <label class="field">
                <span class="field-label">Görüntüleme Sırası</span>
                <input v-model.number="localDisplay.display_order" type="number" class="input" />
              </label>
            </div>
          </section>

          <!-- TAB 2: Paket İçeriği -->
          <section v-else-if="activeTab === 'features'" class="tab-pane">
            <p class="section-desc">
              Bu plan'ın storefront pricing card'ında görünecek bullet listesi.
              <code>feature_key</code> set edilirse plan'a abone olunca capability_flags otomatik
              aktive olur.
            </p>

            <div v-if="!localFeatures.length" class="empty">
              <p>Henüz bir özellik eklenmemiş. Aşağıdan ekleyebilirsiniz.</p>
            </div>

            <ul class="feature-list">
              <li v-for="(f, idx) in localFeatures" :key="idx" class="feature-row">
                <select v-model="f.icon" class="input feature-icon-sel" aria-label="İkon">
                  <option value="check">✓ Check</option>
                  <option value="x">✗ X</option>
                  <option value="star">★ Star</option>
                  <option value="zap">⚡ Zap</option>
                  <option value="info">ℹ Info</option>
                </select>
                <input
                  v-model="f.display_text"
                  type="text"
                  class="input feature-text"
                  placeholder="Premium vitrin · özel banner"
                />
                <select
                  v-model="f.feature_key"
                  class="input feature-key-sel"
                  aria-label="Feature Catalog (opsiyonel)"
                >
                  <option :value="null">— (bağlama yok)</option>
                  <option
                    v-for="opt in featureCatalogKeys"
                    :key="opt.feature_key"
                    :value="opt.feature_key"
                  >
                    {{ opt.feature_key }}
                  </option>
                </select>
                <label class="feature-disabled-check">
                  <input v-model="f.is_disabled" type="checkbox" />
                  <span>Kapalı</span>
                </label>
                <button
                  type="button"
                  class="btn-icon-danger"
                  title="Sil"
                  @click="removeFeature(idx)"
                >
                  ×
                </button>
              </li>
            </ul>

            <div class="feature-actions">
              <button type="button" class="btn-secondary" @click="addFeature">+ Satır Ekle</button>
            </div>
          </section>

          <!-- TAB 3: Yetkinlikler -->
          <section v-else-if="activeTab === 'capabilities'" class="tab-pane">
            <p class="section-desc">
              Backend feature toggle'ları ve sayısal kotalar. Değişiklikler bu plan'ı kullanan tüm
              satıcılara <strong>anında</strong> yansır.
            </p>

            <h4 class="subhead">Capability Flags</h4>
            <div class="cap-list">
              <label v-for="(value, key) in localCapabilities" :key="key" class="cap-row">
                <input
                  type="checkbox"
                  :checked="value"
                  @change="localCapabilities[key] = $event.target.checked"
                />
                <span class="cap-key">{{ key }}</span>
              </label>
            </div>

            <h4 class="subhead">Quota Limits</h4>
            <p class="hint">
              <code>-1</code> = sınırsız · <code>0</code> = devre dışı · pozitif = limit
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

            <h4 class="subhead">İzin Verilen Bölgeler</h4>
            <div class="region-list">
              <span v-for="r in selectedPlan.allowed_regions || []" :key="r" class="chip">{{
                r
              }}</span>
              <p v-if="!selectedPlan.allowed_regions?.length" class="muted">Bölge atanmamış.</p>
            </div>
          </section>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { usePermissionStore } from "@/stores/permission";

  const TABS = [
    { id: "display", label: "Görsel & Pricing" },
    { id: "features", label: "Paket İçeriği" },
    { id: "capabilities", label: "Yetkinlikler" },
  ];

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
  const { plans, selectedPlan, loading, featureCatalogKeys } = storeToRefs(store);

  const activeTab = ref("display");
  const localDisplay = ref(emptyDisplay());
  const localCapabilities = ref({});
  const localQuotas = ref({});
  const localFeatures = ref([]);
  const saving = ref(false);

  const capCount = computed(() => Object.values(localCapabilities.value).filter(Boolean).length);

  const dirty = computed(() => {
    if (!selectedPlan.value) return false;
    const sp = selectedPlan.value;
    const origDisplay = Object.fromEntries(DISPLAY_FIELDS.map((k) => [k, sp[k] ?? ""]));
    return (
      JSON.stringify(origDisplay) !== JSON.stringify(localDisplay.value) ||
      JSON.stringify(sp.capability_flags || {}) !== JSON.stringify(localCapabilities.value) ||
      JSON.stringify(sp.quota_limits || {}) !== JSON.stringify(localQuotas.value) ||
      JSON.stringify(sp.pricing_features || []) !== JSON.stringify(localFeatures.value)
    );
  });

  async function selectPlan(planCode) {
    try {
      await store.fetchPlanFullDetail(planCode);
    } catch {
      /* banner */
    }
  }

  function reset() {
    syncFromSelected();
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

  async function save() {
    if (!selectedPlan.value || !dirty.value) return;
    saving.value = true;
    try {
      // Sadece değişen blokları gönder — backend ezilmesin diye
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

      await store.updatePricingPlan(selectedPlan.value.plan_code, payload);
      await store.fetchPlanFullDetail(selectedPlan.value.plan_code);
      await store.fetchPlans(); // sol liste güncelleme
    } finally {
      saving.value = false;
    }
  }

  watch(selectedPlan, syncFromSelected, { immediate: true });

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
  .cap-key {
    font-family: ui-monospace, monospace;
    color: $l-text-900;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-hi;
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
</style>
