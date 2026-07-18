<template>
  <div class="upm">
    <!-- Hızlı işlemler: kompakt üç buton -->
    <div v-if="quickActions.length" class="upm-qa">
      <button
        v-for="action in quickActions"
        :key="action.key"
        type="button"
        class="upm-qa-btn"
        :class="[`is-${action.key}`, { disabled: action.disabled || actionLoading }]"
        :disabled="action.disabled || actionLoading"
        @click="emit('quick-action', action)"
      >
        <AppIcon :name="actionLoading ? 'loader' : action.icon" :size="14" />
        <span>{{ action.label }}</span>
      </button>
    </div>

    <!-- Metrik şeridi -->
    <div class="upm-stats">
      <div class="upm-stat">
        <span>{{ t("upMobile.totalSpent") }}</span>
        <b>{{ fmtMoney(docData.total_spent) }}</b>
        <small>{{ t("upMobile.ordersCount", { n: docData.total_orders ?? 0 }) }}</small>
      </div>
      <div class="upm-stat">
        <span>{{ t("upMobile.avgOrder") }}</span>
        <b>{{ fmtMoney(docData.average_order_value) }}</b>
      </div>
      <div class="upm-stat">
        <span>{{ t("upMobile.onTime") }}</span>
        <b>{{ fmtPct(docData.payment_on_time_rate) }}</b>
      </div>
      <div class="upm-stat">
        <span>{{ t("upMobile.returnRate") }}</span>
        <b>{{ fmtPct(docData.return_rate) }}</b>
      </div>
      <div class="upm-stat">
        <span>{{ t("upMobile.disputeRate") }}</span>
        <b>{{ fmtPct(docData.dispute_rate) }}</b>
      </div>
    </div>

    <!-- Abonelik planı (mevcut bileşen) -->
    <SubscriptionPlanCard v-if="fd.user || docData.user" :user="fd.user || docData.user" />

    <!-- Doğrulama zaman çizelgesi -->
    <div class="upm-card upm-tl">
      <h4>{{ t("upMobile.verification") }}</h4>
      <div v-for="step in verifySteps" :key="step.key" class="upm-tlrow">
        <span class="upm-tldot" :class="step.ok ? 'ok' : 'wait'">
          <AppIcon :name="step.ok ? 'check' : 'clock'" :size="10" />
        </span>
        <div class="upm-tt">
          <b>{{ step.title }}</b>
          <span>{{ step.sub }}</span>
        </div>
      </div>
    </div>

    <!-- Bölüm satırları -->
    <p class="upm-sec-title">{{ t("upMobile.sections") }}</p>
    <button
      v-for="sec in SECTIONS"
      :key="sec.id"
      type="button"
      class="upm-card upm-secrow"
      @click="openSheet(sec.id)"
    >
      <span class="upm-secic"><AppIcon :name="sec.icon" :size="15" /></span>
      <span class="upm-secmain">
        <b>{{ t(`upMobile.sec_${sec.id}`) }}</b>
        <span>{{ sectionSummary(sec.id) }}</span>
      </span>
      <AppIcon name="chevron-right" :size="15" class="upm-chev" />
    </button>

    <!-- Bölüm sheet'i -->
    <Teleport to="body">
      <Transition name="upm-sheet">
        <div v-if="sheet" class="upm-backdrop" @click.self="sheet = null">
          <div class="upm-sheet" role="dialog" aria-modal="true">
          <div class="upm-grab" aria-hidden="true"></div>
          <header class="upm-sh-head">
            <div class="upm-sh-title">
              <b>{{ t(`upMobile.sec_${sheet}`) }}</b>
              <span>{{ fd.user || docData.user }}</span>
            </div>
            <button
              type="button"
              class="upm-sh-x"
              :aria-label="t('upMobile.close')"
              @click="sheet = null"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </header>

          <div class="upm-sh-body">
            <!-- HESAP -->
            <template v-if="sheet === 'account'">
              <label class="upm-f">
                <span>User</span>
                <input :value="fd.user" type="text" disabled />
              </label>
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Member ID</span>
                  <input :value="fd.member_id" type="text" class="upm-mono" disabled />
                </label>
                <label class="upm-f">
                  <span>Status</span>
                  <select v-model="fd.status" :disabled="!canEdit">
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </label>
              </div>
              <p class="upm-sec-title">{{ t("upMobile.capabilities") }}</p>
              <div class="upm-card upm-switches">
                <label v-for="c in CAPS" :key="c.field" class="upm-switchrow">
                  <span class="upm-sl">
                    <b>{{ c.label }}</b>
                    <span>{{ t(`upMobile.${c.hint}`) }}</span>
                  </span>
                  <input
                    v-model="fd[c.field]"
                    type="checkbox"
                    :true-value="1"
                    :false-value="0"
                    :disabled="!canEdit"
                    class="upm-sw"
                  />
                </label>
              </div>
              <p class="upm-sec-title">{{ t("upMobile.basicInfo") }}</p>
              <label class="upm-f">
                <span>Full Name</span>
                <input v-model="fd.full_name" type="text" :disabled="!canEdit" />
              </label>
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Phone</span>
                  <input v-model="fd.phone" type="text" :disabled="!canEdit" />
                </label>
                <label class="upm-f">
                  <span>Country</span>
                  <input v-model="fd.country" type="text" :disabled="!canEdit" />
                </label>
              </div>
              <label class="upm-f">
                <span>Tenant</span>
                <input :value="fd.tenant" type="text" class="upm-mono" disabled />
              </label>
            </template>

            <!-- KİMLİK & DOĞRULAMA -->
            <template v-else-if="sheet === 'identity'">
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Account Type</span>
                  <select v-model="fd.account_type" :disabled="!canEdit">
                    <option value="Individual">Individual</option>
                    <option value="Business">Business</option>
                  </select>
                </label>
                <label class="upm-f">
                  <span>Tax ID Type</span>
                  <select v-model="fd.tax_id_type" :disabled="!canEdit">
                    <option value=""></option>
                    <option value="TCKN">TCKN</option>
                    <option value="VKN">VKN</option>
                  </select>
                </label>
              </div>
              <label class="upm-f">
                <span>Company Name</span>
                <input v-model="fd.company_name" type="text" :disabled="!canEdit" />
              </label>
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Tax ID</span>
                  <input v-model="fd.tax_id" type="text" class="upm-mono" :disabled="!canEdit" />
                </label>
                <label class="upm-f">
                  <span>Tax Office</span>
                  <input v-model="fd.tax_office" type="text" :disabled="!canEdit" />
                </label>
              </div>
              <p class="upm-sec-title">{{ t("upMobile.verifyState") }}</p>
              <div v-for="step in verifySteps" :key="step.key" class="upm-card upm-vstate">
                <span class="upm-vdot" :class="step.ok ? 'ok' : 'wait'">
                  <AppIcon :name="step.icon" :size="14" />
                </span>
                <span class="upm-vmain">
                  <b>{{ step.title }}</b>
                  <span>{{ step.sub }}</span>
                </span>
                <span class="upm-chip" :class="step.ok ? 'ok' : 'warn'">{{ step.state }}</span>
              </div>
            </template>

            <!-- BANKA -->
            <template v-else-if="sheet === 'bank'">
              <label class="upm-f">
                <span>Bank Name</span>
                <input v-model="fd.bank_name" type="text" :disabled="!canEdit" />
              </label>
              <label class="upm-f">
                <span>IBAN</span>
                <span class="upm-iban">
                  <input
                    v-if="showIban"
                    v-model="fd.iban"
                    type="text"
                    class="upm-mono"
                    :disabled="!canEdit"
                  />
                  <input v-else :value="maskedIban" type="text" class="upm-mono" disabled />
                  <button type="button" class="upm-mini-btn" @click="showIban = !showIban">
                    <AppIcon :name="showIban ? 'eye-off' : 'eye'" :size="13" />
                    {{ showIban ? t("upMobile.hide") : t("upMobile.show") }}
                  </button>
                </span>
                <small>{{ t("upMobile.ibanHint") }}</small>
              </label>
              <label class="upm-f">
                <span>Account Holder Name</span>
                <input v-model="fd.account_holder_name" type="text" :disabled="!canEdit" />
              </label>
            </template>

            <!-- İŞ BİLGİLERİ -->
            <template v-else-if="sheet === 'business'">
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Business Type</span>
                  <select v-model="fd.business_type" :disabled="!canEdit">
                    <option value=""></option>
                    <option v-for="o in BUSINESS_TYPES" :key="o" :value="o">{{ o }}</option>
                  </select>
                </label>
                <label class="upm-f">
                  <span>Job Title</span>
                  <input v-model="fd.job_title" type="text" :disabled="!canEdit" />
                </label>
              </div>
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Website</span>
                  <input v-model="fd.website" type="text" :disabled="!canEdit" />
                </label>
                <label class="upm-f">
                  <span>Year Established</span>
                  <input v-model.number="fd.year_established" type="number" :disabled="!canEdit" />
                </label>
              </div>
              <label class="upm-f">
                <span>Employee Count</span>
                <select v-model="fd.employee_count" :disabled="!canEdit">
                  <option value=""></option>
                  <option v-for="o in EMPLOYEE_COUNTS" :key="o" :value="o">{{ o }}</option>
                </select>
              </label>
              <label class="upm-f">
                <span>About Us</span>
                <textarea v-model="fd.about_us" rows="3" :disabled="!canEdit"></textarea>
              </label>
              <label class="upm-f">
                <span>Selling Platforms</span>
                <textarea v-model="fd.selling_platforms" rows="2" :disabled="!canEdit"></textarea>
              </label>
              <p class="upm-sec-title">{{ t("upMobile.sourcing") }}</p>
              <label class="upm-f">
                <span>Industry Preferences</span>
                <textarea
                  v-model="fd.industry_preferences"
                  rows="2"
                  :disabled="!canEdit"
                ></textarea>
              </label>
              <div class="upm-frow">
                <label class="upm-f">
                  <span>Sourcing Frequency</span>
                  <select v-model="fd.sourcing_frequency" :disabled="!canEdit">
                    <option value=""></option>
                    <option v-for="o in SOURCING_FREQS" :key="o" :value="o">{{ o }}</option>
                  </select>
                </label>
                <label class="upm-f">
                  <span>Annual Spending</span>
                  <select v-model="fd.annual_spending" :disabled="!canEdit">
                    <option value=""></option>
                    <option v-for="o in ANNUAL_SPENDINGS" :key="o" :value="o">{{ o }}</option>
                  </select>
                </label>
              </div>
            </template>

            <!-- METRİK & SKOR (salt-okunur) -->
            <template v-else-if="sheet === 'metrics'">
              <div class="upm-card upm-score">
                <span class="upm-gauge" :style="{ '--pct': gaugePct }">
                  <b>{{ Math.round(docData.buyer_score || 0) }}</b>
                </span>
                <span class="upm-score-t">
                  <b>Buyer Score{{ docData.buyer_level ? ` · ${docData.buyer_level}` : "" }}</b>
                  <span v-if="docData.buyer_score_trend">{{ docData.buyer_score_trend }}</span>
                  <span v-if="docData.last_score_date">
                    {{ t("upMobile.lastScore") }}: {{ fmtDate(docData.last_score_date) }}
                  </span>
                </span>
              </div>
              <p class="upm-sec-title">{{ t("upMobile.tradeMetrics") }}</p>
              <div class="upm-mgrid">
                <div v-for="m in metricCells" :key="m.label" class="upm-stat">
                  <span>{{ m.label }}</span>
                  <b>{{ m.value }}</b>
                </div>
              </div>
              <p class="upm-sec-title">{{ t("upMobile.activity") }}</p>
              <div class="upm-card upm-kvs">
                <div class="upm-kv">
                  <span>{{ t("upMobile.joined") }}</span>
                  <b>
                    {{ fmtDate(docData.joined_at) }}
                    <template v-if="docData.account_age_days">
                      · {{ t("upMobile.days", { n: docData.account_age_days }) }}
                    </template>
                  </b>
                </div>
                <div class="upm-kv">
                  <span>{{ t("upMobile.lastActive") }}</span>
                  <b>{{ fmtDateTime(docData.last_active_at) }}</b>
                </div>
                <div class="upm-kv">
                  <span>{{ t("upMobile.paymentPattern") }}</span>
                  <b>{{ docData.payment_pattern || "—" }}</b>
                </div>
              </div>
            </template>

            <!-- AUDIT (salt-okunur) -->
            <template v-else-if="sheet === 'audit'">
              <div class="upm-card upm-kvs">
                <div class="upm-kv">
                  <span>Created Via</span>
                  <b>{{ docData.created_via || "—" }}</b>
                </div>
                <div class="upm-kv">
                  <span>Migrated At</span>
                  <b>{{ fmtDate(docData.migrated_at) }}</b>
                </div>
                <div class="upm-kv">
                  <span>Buyer Profile</span>
                  <b>{{ docData.migrated_from_buyer_profile || "—" }}</b>
                </div>
                <div class="upm-kv">
                  <span>Seller Profile</span>
                  <b class="upm-mono-b">{{ docData.migrated_from_seller_profile || "—" }}</b>
                </div>
                <div class="upm-kv">
                  <span>ERPNext Customer</span>
                  <b class="upm-mono-b">{{ docData.erpnext_customer || "—" }}</b>
                </div>
              </div>
            </template>
          </div>

          <footer class="upm-sh-foot">
            <button type="button" class="upm-btn-ghost" @click="sheet = null">
              {{ t("upMobile.close") }}
            </button>
            <button
              v-if="canEdit && EDIT_SHEETS.includes(sheet)"
              type="button"
              class="upm-btn-solid"
              :disabled="saving"
              @click="emit('save')"
            >
              {{ saving ? t("upMobile.saving") : t("upMobile.save") }}
            </button>
          </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import SubscriptionPlanCard from "@/components/seller/SubscriptionPlanCard.vue";

  const props = defineProps({
    formData: { type: Object, required: true },
    docData: { type: Object, required: true },
    quickActions: { type: Array, default: () => [] },
    actionLoading: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
  });
  const emit = defineEmits(["update-field", "save", "quick-action"]);

  const { t } = useI18n();

  // v-model köprüsü: props.formData'yı child'dan doğrudan mutasyona uğratmamak
  // için (vue/no-mutating-props) yazmalar update-field emit'ine çevrilir; parent
  // formData'yı günceller, okumalar reaktif kalır.
  const fd = new Proxy(
    {},
    {
      get: (_, key) => props.formData[key],
      set: (_, key, value) => {
        emit("update-field", key, value);
        return true;
      },
      has: (_, key) => key in props.formData,
    }
  );

  const SECTIONS = [
    { id: "account", icon: "user" },
    { id: "identity", icon: "shield-check" },
    { id: "bank", icon: "landmark" },
    { id: "business", icon: "briefcase" },
    { id: "metrics", icon: "trending-up" },
    { id: "audit", icon: "history" },
  ];
  const EDIT_SHEETS = ["account", "identity", "bank", "business"];
  const CAPS = [
    { field: "can_buy", label: "Can Buy", hint: "canBuyHint" },
    { field: "can_sell", label: "Can Sell", hint: "canSellHint" },
    { field: "can_admin", label: "Can Admin", hint: "canAdminHint" },
  ];
  const BUSINESS_TYPES = [
    "Manufacturer",
    "Trading Company",
    "Retailer",
    "Wholesaler",
    "Distributor",
    "Other",
  ];
  const EMPLOYEE_COUNTS = ["1-10", "11-50", "51-200", "201-500", "500+"];
  const SOURCING_FREQS = ["Daily", "Weekly", "Monthly", "Quarterly", "Annually"];
  const ANNUAL_SPENDINGS = ["Under $10K", "$10K-$50K", "$50K-$100K", "$100K-$500K", "$500K+"];

  const sheet = ref(null);
  const showIban = ref(false);

  function openSheet(id) {
    showIban.value = false;
    sheet.value = id;
  }

  // ── Biçimleyiciler ────────────────────────────────────
  function fmtMoney(v) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1000) return `€${(n / 1000).toFixed(1)}K`;
    return `€${Math.round(n)}`;
  }
  function fmtPct(v) {
    if (v === null || v === undefined || v === "") return "—";
    return `%${Math.round(Number(v) || 0)}`;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const maskedIban = computed(() => {
    const iban = String(props.formData.iban || "");
    if (!iban) return "—";
    if (iban.length <= 10) return iban;
    return `${iban.slice(0, 7)} •••• ${iban.slice(-4)}`;
  });

  const gaugePct = computed(() => {
    const s = Math.max(0, Math.min(100, Number(props.docData.buyer_score) || 0));
    return `${s}%`;
  });

  // ── Doğrulama adımları ────────────────────────────────
  const verifySteps = computed(() => {
    const d = props.docData;
    const kycOk = d.kyc_status === "Verified";
    const kybOk = d.kyb_status === "Verified";
    return [
      {
        key: "email",
        icon: "mail",
        ok: !!d.email_verified,
        state: d.email_verified ? "✓" : t("upMobile.pending"),
        title: d.email_verified ? t("upMobile.emailVerified") : t("upMobile.emailNotVerified"),
        sub: d.email_verified
          ? [fmtDate(d.email_verified_at), d.email_verified_method].filter(Boolean).join(" · ")
          : "—",
      },
      {
        key: "kyb",
        icon: "building-2",
        ok: kybOk,
        state: kybOk ? "✓" : d.kyb_status || t("upMobile.pending"),
        title: t("upMobile.kybLabel"),
        sub: kybOk
          ? [fmtDate(d.kyb_verified_at), d.company_name].filter(Boolean).join(" · ")
          : d.kyb_status || "—",
      },
      {
        key: "kyc",
        icon: "id-card",
        ok: kycOk,
        state: kycOk ? "✓" : d.kyc_status || t("upMobile.pending"),
        title: t("upMobile.kycLabel"),
        sub: kycOk ? fmtDate(d.kyc_verified_at) : d.kyc_status || t("upMobile.pending"),
      },
    ];
  });

  // ── Bölüm özetleri ────────────────────────────────────
  function sectionSummary(id) {
    const d = props.docData;
    const f = props.formData;
    if (id === "account") {
      const caps = [
        f.can_buy ? "Buy ✓" : "Buy ✗",
        f.can_sell ? "Sell ✓" : "Sell ✗",
        f.can_admin ? "Admin ✓" : "Admin ✗",
      ].join(" · ");
      return `${f.status || "—"} · ${caps}`;
    }
    if (id === "identity") {
      const done = verifySteps.value.filter((s) => s.ok).length;
      return [f.company_name, `${done}/3 ${t("upMobile.verified")}`].filter(Boolean).join(" · ");
    }
    if (id === "bank") {
      if (!f.bank_name && !f.iban) return t("upMobile.empty");
      return [f.bank_name, maskedIban.value !== "—" ? maskedIban.value : null]
        .filter(Boolean)
        .join(" · ");
    }
    if (id === "business") {
      return (
        [f.business_type, f.employee_count, f.year_established].filter(Boolean).join(" · ") ||
        t("upMobile.empty")
      );
    }
    if (id === "metrics") {
      const score = d.buyer_score ? `Buyer Score ${Math.round(d.buyer_score)}` : null;
      return [score, d.buyer_level].filter(Boolean).join(" · ") || t("upMobile.empty");
    }
    if (id === "audit") {
      return [d.created_via, d.erpnext_customer].filter(Boolean).join(" · ") || "—";
    }
    return "";
  }

  const metricCells = computed(() => {
    const d = props.docData;
    return [
      { label: t("upMobile.totalSpent"), value: fmtMoney(d.total_spent) },
      { label: t("upMobile.totalOrders"), value: d.total_orders ?? "—" },
      { label: t("upMobile.avgOrder"), value: fmtMoney(d.average_order_value) },
      { label: t("upMobile.onTime"), value: fmtPct(d.payment_on_time_rate) },
      { label: t("upMobile.returnRate"), value: fmtPct(d.return_rate) },
      { label: t("upMobile.disputeRate"), value: fmtPct(d.dispute_rate) },
      { label: t("upMobile.feedbackRate"), value: fmtPct(d.feedback_rate) },
      { label: t("upMobile.cancelRate"), value: fmtPct(d.cancellation_rate) },
    ];
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "sass:color";

  .upm {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .upm-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .upm-sec-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: $l-text-500;
    margin: 4px 2px 0;
    @include dark {
      color: $d-text-muted;
    }
  }

  /* Hızlı işlemler */
  .upm-qa {
    display: flex;
    gap: 7px;
  }
  .upm-qa-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 42px;
    font-size: 11.5px;
    font-weight: 700;
    font-family: inherit;
    border-radius: 10px;
    padding: 8px 6px;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-500;
    cursor: pointer;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
    &.is-activate:not(.disabled) {
      color: $c-success;
      border-color: rgba($c-success, 0.35);
    }
    &.is-suspend:not(.disabled) {
      color: $c-warning;
      border-color: rgba($c-warning, 0.4);
    }
    &.is-deactivate:not(.disabled) {
      color: $c-error;
      border-color: rgba($c-error, 0.35);
    }
    &.disabled {
      opacity: 0.45;
      cursor: default;
    }
  }

  /* Metrik şeridi */
  .upm-stats {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
  .upm-stat {
    flex: 0 0 112px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    padding: 10px 12px;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    span {
      display: block;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
    b {
      display: block;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-top: 3px;
      font-variant-numeric: tabular-nums;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    small {
      font-size: 9.5px;
      color: $l-text-500;
      font-weight: 600;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  /* Zaman çizelgesi */
  .upm-tl {
    padding: 13px 14px;
    h4 {
      margin: 0 0 10px;
      font-size: 12.5px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }
  .upm-tlrow {
    display: flex;
    gap: 10px;
    position: relative;
    padding-bottom: 13px;
    &:last-child {
      padding-bottom: 0;
    }
    &::before {
      content: "";
      position: absolute;
      left: 8px;
      top: 20px;
      bottom: -2px;
      width: 2px;
      background: $l-border-alt;
      @include dark {
        background: $d-border-inner;
      }
    }
    &:last-child::before {
      display: none;
    }
  }
  .upm-tldot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    &.ok {
      background: rgba($c-success, 0.15);
      color: $c-success;
    }
    &.wait {
      background: rgba($c-warning, 0.16);
      color: $c-warning;
    }
  }
  .upm-tt {
    flex: 1;
    min-width: 0;
    b {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      font-size: 10.5px;
      color: $l-text-400;
      overflow-wrap: anywhere;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  /* Bölüm satırları */
  .upm-secrow {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: start;
    font-family: inherit;
    cursor: pointer;
    padding: 12px;
    transition: border-color $t-fast;
    &:active {
      border-color: rgba($brand, 0.5);
    }
  }
  .upm-secic {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba($brand, 0.16);
    color: color.adjust($brand, $lightness: -18%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    @include dark {
      background: rgba($brand-light, 0.16);
      color: $brand-light;
    }
  }
  .upm-secmain {
    flex: 1;
    min-width: 0;
    b {
      display: block;
      font-size: 12.5px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      display: block;
      font-size: 10.5px;
      color: $l-text-400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .upm-chev {
    color: $l-text-300;
    flex-shrink: 0;
    @include dark {
      color: $d-text-faint;
    }
  }

  /* Sheet */
  .upm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-end;
    z-index: 1000;
  }
  .upm-sheet {
    width: 100%;
    max-height: 88vh;
    background: $l-bg;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    @include dark {
      background: $d-bg-card;
    }
  }
  .upm-grab {
    width: 36px;
    height: 4px;
    border-radius: 99px;
    background: $l-border;
    margin: 8px auto 4px;
    flex-shrink: 0;
    @include dark {
      background: $d-border;
    }
  }
  .upm-sh-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 16px 10px;
    border-bottom: 1px solid $l-border;
    flex-shrink: 0;
    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .upm-sh-title {
    min-width: 0;
    b {
      display: block;
      font-size: 14.5px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      font-size: 10.5px;
      color: $l-text-400;
      overflow-wrap: anywhere;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .upm-sh-x {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: $l-bg-muted;
    color: $l-text-500;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }
  .upm-sh-body {
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .upm-sh-foot {
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    padding: 10px 16px calc(14px + env(safe-area-inset-bottom));
    border-top: 1px solid $l-border;
    @include dark {
      border-top-color: $d-border;
    }
  }
  .upm-btn-ghost {
    flex: 0 0 auto;
    border: 1px solid $l-border;
    background: transparent;
    border-radius: 10px;
    padding: 11px 18px;
    font-size: 12.5px;
    font-weight: 700;
    font-family: inherit;
    color: $l-text-700;
    cursor: pointer;
    &:only-child {
      flex: 1;
    }
    @include dark {
      border-color: $d-border;
      color: $d-text-hi;
    }
  }
  .upm-btn-solid {
    flex: 1;
    background: $brand;
    border: none;
    border-radius: 10px;
    padding: 11px 16px;
    font-size: 12.5px;
    font-weight: 800;
    font-family: inherit;
    color: #fff;
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }

  /* Form parçaları */
  .upm-f {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    > span {
      font-size: 10.5px;
      font-weight: 600;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    input,
    select,
    textarea {
      width: 100%;
      background: $l-bg-subtle;
      border: 1px solid $l-border;
      border-radius: 9px;
      padding: 10px 11px;
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      color: $l-text-900;
      min-height: 40px;
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text-hi;
      }
      &:disabled {
        opacity: 0.6;
      }
      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px rgba($brand, 0.15);
      }
    }
    textarea {
      resize: vertical;
      font-weight: 500;
      line-height: 1.5;
    }
    small {
      font-size: 10px;
      color: $l-text-400;
      line-height: 1.4;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .upm-mono {
    font-family: ui-monospace, monospace !important;
    font-size: 12px !important;
  }
  .upm-mono-b {
    font-family: ui-monospace, monospace;
    font-size: 11.5px;
  }
  .upm-frow {
    display: flex;
    gap: 9px;
    > .upm-f {
      flex: 1;
    }
  }
  .upm-switches {
    padding: 2px 13px;
  }
  .upm-switchrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid $l-border-alt;
    cursor: pointer;
    &:last-child {
      border-bottom: none;
    }
    @include dark {
      border-bottom-color: $d-border-inner;
    }
  }
  .upm-sl {
    min-width: 0;
    b {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      font-size: 10.5px;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .upm-sw {
    appearance: none;
    width: 36px;
    height: 21px;
    border-radius: 99px;
    background: $l-border;
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
    transition: background $t-fast;
    @include dark {
      background: $d-border;
    }
    &::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      transition: transform $t-fast;
    }
    &:checked {
      background: $brand;
      &::after {
        transform: translateX(15px);
      }
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  /* Doğrulama durum blokları */
  .upm-vstate {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 13px;
  }
  .upm-vdot {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    &.ok {
      background: rgba($c-success, 0.12);
      color: $c-success;
    }
    &.wait {
      background: rgba($c-warning, 0.14);
      color: $c-warning;
    }
  }
  .upm-vmain {
    flex: 1;
    min-width: 0;
    b {
      display: block;
      font-size: 12.5px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      font-size: 10.5px;
      color: $l-text-400;
      overflow-wrap: anywhere;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .upm-chip {
    font-size: 10px;
    font-weight: 700;
    border-radius: 999px;
    padding: 3px 9px;
    flex-shrink: 0;
    white-space: nowrap;
    &.ok {
      background: rgba($c-success, 0.12);
      color: $c-success;
    }
    &.warn {
      background: rgba($c-warning, 0.14);
      color: color.adjust($c-warning, $lightness: -12%);
      @include dark {
        color: $c-warning;
      }
    }
  }
  .upm-iban {
    display: flex;
    gap: 7px;
    align-items: center;
    input {
      flex: 1;
      min-width: 0;
    }
  }
  .upm-mini-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 800;
    font-family: inherit;
    color: color.adjust($brand, $lightness: -18%);
    background: rgba($brand, 0.14);
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    @include dark {
      color: $brand-light;
      background: rgba($brand-light, 0.14);
    }
  }

  /* Metrik & skor */
  .upm-score {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
  }
  .upm-gauge {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    flex-shrink: 0;
    background: conic-gradient($brand 0 var(--pct, 0%), $l-border-alt var(--pct, 0%) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    @include dark {
      background: conic-gradient(
        $brand-light 0 var(--pct, 0%),
        $d-border-inner var(--pct, 0%) 100%
      );
    }
    &::before {
      content: "";
      position: absolute;
      inset: 8px;
      border-radius: 50%;
      background: $l-bg;
      @include dark {
        background: $d-bg-card;
      }
    }
    b {
      position: relative;
      font-size: 18px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }
  .upm-score-t {
    flex: 1;
    min-width: 0;
    b {
      display: block;
      font-size: 14px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      display: block;
      font-size: 11px;
      color: $l-text-500;
      margin-top: 2px;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .upm-mgrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    .upm-stat {
      flex: none;
    }
  }
  .upm-kvs {
    padding: 3px 13px;
  }
  .upm-kv {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid $l-border-alt;
    font-size: 12.5px;
    &:last-child {
      border-bottom: none;
    }
    @include dark {
      border-bottom-color: $d-border-inner;
    }
    > span {
      color: $l-text-500;
      flex-shrink: 0;
      @include dark {
        color: $d-text-muted;
      }
    }
    > b {
      font-weight: 600;
      text-align: right;
      min-width: 0;
      overflow-wrap: anywhere;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  // Bottom sheet giriş/çıkış — Vue <Transition name="upm-sheet">. Çıkışta artık ani
  // yok olmuyor; alttan kayarak kapanıyor ($ease-drawer). Çıkış girişten hızlı.
  .upm-sheet-enter-active {
    transition: opacity $d-pop $ease-out;
  }
  .upm-sheet-leave-active {
    transition: opacity $d-fast $ease-out;
  }
  .upm-sheet-enter-active .upm-sheet {
    transition: transform $d-sheet $ease-drawer;
  }
  .upm-sheet-leave-active .upm-sheet {
    transition: transform $d-modal $ease-drawer;
  }
  .upm-sheet-enter-from,
  .upm-sheet-leave-to {
    opacity: 0;
  }
  .upm-sheet-enter-from .upm-sheet,
  .upm-sheet-leave-to .upm-sheet {
    transform: translateY(100%);
  }
</style>
