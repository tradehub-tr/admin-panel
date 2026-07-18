<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { storeToRefs } from "pinia";
  import api from "@/utils/api";
  import { useSubscriptionStore } from "@/stores/subscription";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  // Sayfa-içi onboarding: paket kartları → birincil abone ol/öde butonu → bilgi/durum alanı.
  usePageTour("subscription-gate", () => [
    {
      target: '[data-tour="sgt-plans"]',
      title: t("tourSteps.page.sgtPlans_t"),
      desc: t("tourSteps.page.sgtPlans_d"),
    },
    {
      target: '[data-tour="sgt-subscribe"]',
      title: t("tourSteps.page.sgtSubscribe_t"),
      desc: t("tourSteps.page.sgtSubscribe_d"),
    },
    {
      target: '[data-tour="sgt-info"]',
      title: t("tourSteps.page.sgtInfo_t"),
      desc: t("tourSteps.page.sgtInfo_d"),
    },
  ]);
  const sub = useSubscriptionStore();
  const {
    isLocked,
    isTrial,
    lockReason,
    canStartTrial,
    trialDaysLeft,
    hasSubscription,
    planCode,
    subStatus,
    currentPeriodEnd,
    trialEnd,
  } = storeToRefs(sub);

  const plans = ref([]);
  const loading = ref(true);
  const acting = ref(""); // işlem yapılan plan_code (buton spinner)
  const pending = ref(null); // bekleyen havale talebi (varsa banka talimatı gösterilir)
  const selectedPlanCode = ref(""); // mobil liste seçimi (V4 — radio satırlar + sabit ödeme çubuğu)

  const CURRENCY_SYMBOL = { EUR: "€", USD: "$", TRY: "₺" };

  const LOCK_COPY = {
    trial_expired: {
      title: "Deneme süreniz doldu",
      desc: "14 günlük Pro denemeniz sona erdi. Panele devam etmek için bir paket seçin. Mağazanız ve ürünleriniz korunuyor — abone olduğunuzda kaldığınız yerden devam edersiniz.",
    },
    no_subscription: {
      title: "Devam etmek için bir paket seçin",
      desc: "Satıcı panelini kullanmak için aktif bir aboneliğiniz olmalı.",
    },
    canceled: {
      title: "Aboneliğiniz iptal edildi",
      desc: "Panele dönmek için bir paket seçin.",
    },
    past_due: {
      title: "Ödemeniz beklemede",
      desc: "Erişiminizi sürdürmek için aboneliğinizi yenileyin.",
    },
  };

  const headline = computed(() => LOCK_COPY[lockReason.value] || LOCK_COPY.no_subscription);

  function priceLabel(p) {
    if (p.price_override_label) return p.price_override_label;
    const sym = CURRENCY_SYMBOL[p.currency] || p.currency || "";
    if ((p.yearly_price || 0) > 0) return `${sym}${p.yearly_price} / yıl`;
    if ((p.monthly_price || 0) > 0) return `${sym}${p.monthly_price} / ay`;
    return "Özel teklif";
  }

  function isContactSales(p) {
    return p.cta_action === "contact_sales";
  }

  function isCurrentPlan(p) {
    return hasSubscription.value && p.plan_code === planCode.value;
  }

  // Mevcut planın görünen adı (pricing listesinden eşle).
  const currentPlan = computed(
    () => plans.value.find((p) => p.plan_code === planCode.value) || null
  );
  const currentPlanName = computed(() => currentPlan.value?.plan_name || planCode.value || "—");
  const statusLabel = computed(() => (subStatus.value === "trial" ? "Deneme" : "Aktif"));

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(String(d).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  }

  async function loadPlans() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.v1.public_pricing.get_pricing_plans");
      plans.value = res?.message?.plans || [];
      // Mobil varsayılan seçim: öne çıkan plan; o mevcut plansa ödenebilir ilk plan.
      const list = plans.value;
      const preferred = list.find((p) => p.highlighted && !isCurrentPlan(p));
      selectedPlanCode.value = (preferred || list.find((p) => !isCurrentPlan(p)) || list[0])
        ?.plan_code;
    } catch (e) {
      toast.error(e.message || "Paketler yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  const selectedPlan = computed(
    () => plans.value.find((p) => p.plan_code === selectedPlanCode.value) || null
  );
  // Seçili planın kart özeti bullet'ları (admin "Kartta" kürasyonu) — en fazla 4 satır.
  const selectedFeatures = computed(() =>
    (selectedPlan.value?.features || [])
      .filter((f) => f.show_on_card && !f.is_disabled)
      .slice(0, 4)
  );

  // Trial başlat (ücretsiz, anında) — havale gerektirmez.
  async function startTrial(planCode) {
    if (acting.value) return;
    acting.value = planCode + ":trial";
    try {
      await api.callMethod("tradehub_core.api.v1.subscription.upgrade_subscription_plan", {
        new_plan: planCode,
        start_trial: 1,
      });
      await sub.refresh();
      toast.success("Deneme başladı");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e.message || "İşlem başarısız");
    } finally {
      acting.value = "";
    }
  }

  // Havale/EFT: paket seç → pending ödeme talebi + banka talimatı.
  async function requestBankTransfer(planCode) {
    if (acting.value) return;
    acting.value = planCode;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.v1.subscription_payment.create_bank_transfer_request",
        { plan: planCode, billing_cycle: "yearly" }
      );
      pending.value = res?.message || null;
    } catch (e) {
      toast.error(e.message || "Ödeme talebi oluşturulamadı");
    } finally {
      acting.value = "";
    }
  }

  async function checkPending() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.subscription_payment.get_my_pending_payment"
      );
      pending.value = res?.message || null;
    } catch {
      /* sessiz — talimat yoksa normal akış */
    }
  }

  function copyRef() {
    try {
      navigator.clipboard?.writeText(pending.value.reference_code);
      toast.success("Referans kodu kopyalandı");
    } catch {
      /* clipboard yoksa geç */
    }
  }

  // Trial paketi = ilk trial_days>0 olan plan (genelde PRO).
  const trialPlan = computed(() => plans.value.find((p) => (p.trial_days || 0) > 0));

  onMounted(() => {
    loadPlans();
    checkPending();
  });
</script>

<template>
  <div class="sub-gate">
    <!-- Durum başlığı -->
    <div v-if="isLocked" class="notice notice--lock">
      <h1 class="notice__title">{{ headline.title }}</h1>
      <p class="notice__desc">{{ headline.desc }}</p>
    </div>
    <div v-else-if="hasSubscription" class="cur-card">
      <div>
        <div class="cur-card__label">Aktif Aboneliğiniz</div>
        <div class="cur-card__plan">
          {{ currentPlanName }}
          <span class="cur-badge" :class="isTrial ? 'cur-badge--trial' : 'cur-badge--active'">{{
            statusLabel
          }}</span>
        </div>
        <div class="cur-card__meta">
          <template v-if="isTrial">
            Deneme bitişi: <strong>{{ fmtDate(trialEnd) }}</strong>
            <span class="cur-card__sep">·</span> {{ trialDaysLeft }} gün kaldı
          </template>
          <template v-else-if="currentPeriodEnd">
            Yenileme tarihi: <strong>{{ fmtDate(currentPeriodEnd) }}</strong>
          </template>
          <template v-else>Aboneliğiniz aktif.</template>
        </div>
      </div>
      <div class="cur-card__hint">
        {{
          isTrial
            ? "Denemenizi kalıcı pakete yükseltmek için aşağıdan seçin."
            : "Paketinizi değiştirmek / yükseltmek için aşağıdan seçin."
        }}
      </div>
    </div>

    <!-- Havale/EFT talimatı (bekleyen ödeme varsa) -->
    <div v-if="pending" class="bank">
      <h2 class="bank__title">Havale / EFT ile ödeme</h2>
      <p class="bank__lead">
        Aşağıdaki hesaba <strong>{{ pending.amount }} {{ pending.currency }}</strong> tutarını
        gönderin. <strong>Açıklama kısmına referans kodunuzu yazın.</strong> Ödemeniz onaylandığında
        paneliniz otomatik açılır.
      </p>

      <div class="bank__grid">
        <div class="bank__field">
          <div class="bank__label">Banka</div>
          <div class="bank__value">{{ pending.bank.bank_name || "—" }}</div>
        </div>
        <div class="bank__field">
          <div class="bank__label">Hesap Sahibi</div>
          <div class="bank__value">{{ pending.bank.account_holder || "—" }}</div>
        </div>
        <div class="bank__field bank__field--wide">
          <div class="bank__label">IBAN</div>
          <div class="bank__value bank__value--mono">{{ pending.bank.iban || "—" }}</div>
        </div>
        <div class="bank__field bank__field--wide bank__ref">
          <div class="bank__label bank__label--ref">Referans Kodu (açıklamaya yazın)</div>
          <div class="bank__ref-row">
            <span class="bank__ref-code">{{ pending.reference_code }}</span>
            <button type="button" class="btn btn--outline btn--sm" @click="copyRef">Kopyala</button>
          </div>
        </div>
      </div>

      <p v-if="pending.bank.instructions" class="bank__note">{{ pending.bank.instructions }}</p>

      <div class="bank__waiting">
        <span><AppIcon name="hourglass" :size="16" /></span>
        <span
          >Ödemeniz <strong>onay bekliyor</strong>. Havale ulaştığında ekibimiz onaylayacak.</span
        >
      </div>

      <button type="button" class="btn btn--ghost bank__back" @click="pending = null">
        ← Başka paket seç
      </button>
    </div>

    <template v-if="!pending">
      <!-- Deneme başlat (hiç kullanılmadıysa) -->
      <div v-if="canStartTrial && trialPlan" class="notice notice--trial" data-tour="sgt-subscribe">
        <div class="notice--trial__text">
          <p class="notice__title">
            {{ trialPlan.trial_days }} gün ücretsiz {{ trialPlan.plan_name }} deneyin
          </p>
          <p class="notice__desc">Kredi kartı gerekmez.</p>
        </div>
        <button
          type="button"
          class="btn btn--trial notice--trial__btn"
          :disabled="!!acting"
          @click="startTrial(trialPlan.plan_code)"
        >
          <span v-if="acting === trialPlan.plan_code + ':trial'">Başlatılıyor…</span>
          <span v-else
            ><AppIcon name="zap" :size="14" /> {{ trialPlan.trial_days }} gün ücretsiz dene</span
          >
        </button>
      </div>

      <!-- Paketler -->
      <h2 v-if="hasSubscription && !loading" class="plans-heading">Paketinizi değiştirin</h2>
      <div v-if="loading" class="state-msg">Paketler yükleniyor…</div>
      <div v-else class="plans" data-tour="sgt-plans">
        <div
          v-for="p in plans"
          :key="p.plan_code"
          class="plan"
          :class="{ 'plan--featured': p.highlighted, 'plan--current': isCurrentPlan(p) }"
        >
          <span v-if="isCurrentPlan(p)" class="plan__badge plan__badge--current">MEVCUT</span>
          <span v-else-if="p.highlighted" class="plan__badge">EN POPÜLER</span>
          <div class="plan__tag">{{ p.plan_code }}</div>
          <div class="plan__name">{{ p.plan_name }}</div>
          <div class="plan__price">{{ priceLabel(p) }}</div>
          <p class="plan__desc">{{ p.short_tagline || p.description || "" }}</p>

          <button v-if="isCurrentPlan(p)" type="button" class="btn btn--current plan__btn" disabled>
            Mevcut planınız
          </button>
          <button
            v-else-if="!isContactSales(p)"
            type="button"
            class="btn plan__btn"
            :class="p.highlighted ? 'btn--primary' : 'btn--outline'"
            :disabled="!!acting"
            @click="requestBankTransfer(p.plan_code)"
          >
            <span v-if="acting === p.plan_code">İşleniyor…</span>
            <span v-else>Havale / EFT ile öde</span>
          </button>
          <a v-else href="mailto:satis@istoc.com" class="btn btn--outline plan__btn">Teklif Al</a>
        </div>
      </div>

      <!-- Mobil (V4): radio satır listesi — masaüstünde gizli -->
      <div v-if="!loading" class="plans-m" role="radiogroup" aria-label="Paket seçimi">
        <button
          v-for="p in plans"
          :key="p.plan_code"
          type="button"
          class="plan-m"
          :class="{ 'plan-m--on': p.plan_code === selectedPlanCode }"
          role="radio"
          :aria-checked="p.plan_code === selectedPlanCode"
          @click="selectedPlanCode = p.plan_code"
        >
          <span class="plan-m__line">
            <span class="plan-m__radio" aria-hidden="true"></span>
            <span class="plan-m__id">
              <span class="plan-m__name">
                {{ p.plan_name }}
                <span v-if="isCurrentPlan(p)" class="plan-m__pop plan-m__pop--current">MEVCUT</span>
                <span v-else-if="p.highlighted" class="plan-m__pop">EN POPÜLER</span>
              </span>
              <span class="plan-m__sub">{{ p.short_tagline || p.description || "" }}</span>
            </span>
            <span class="plan-m__price">{{ priceLabel(p) }}</span>
          </span>
          <span v-if="p.plan_code === selectedPlanCode" class="plan-m__ext">
            <template v-if="selectedFeatures.length">
              <span v-for="f in selectedFeatures" :key="f.feature_key || f.display_text" class="plan-m__tick">
                <span class="plan-m__tick-ic"><AppIcon name="check" :size="14" /></span>
                {{ f.display_text }}
              </span>
            </template>
            <span v-else class="plan-m__desc">{{ p.short_tagline || p.description || "" }}</span>
          </span>
        </button>
      </div>

      <p class="foot-note" data-tour="sgt-info">
        Ödeme havale / EFT ile alınır. Havaleniz onaylandığında paketiniz aktifleşir.
      </p>

      <!-- Mobil (V4): tab bar üstü sabit ödeme çubuğu -->
      <div v-if="!loading && selectedPlan" class="sgt-mbar">
        <div class="sgt-mbar__sum">
          <span>Seçili paket</span>
          <b>{{ selectedPlan.plan_name }} · {{ priceLabel(selectedPlan) }}</b>
        </div>
        <button v-if="isCurrentPlan(selectedPlan)" type="button" class="btn btn--current" disabled>
          Mevcut planınız
        </button>
        <a v-else-if="isContactSales(selectedPlan)" href="mailto:satis@istoc.com" class="btn btn--primary">
          Teklif Al
        </a>
        <button
          v-else
          type="button"
          class="btn btn--primary"
          :disabled="!!acting"
          @click="requestBankTransfer(selectedPlan.plan_code)"
        >
          <span v-if="acting === selectedPlan.plan_code">İşleniyor…</span>
          <span v-else>Havale / EFT ile öde</span>
        </button>
        <button
          v-if="canStartTrial && trialPlan"
          type="button"
          class="btn btn--trial sgt-mbar__trial"
          :disabled="!!acting"
          @click="startTrial(trialPlan.plan_code)"
        >
          <span v-if="acting === trialPlan.plan_code + ':trial'">Başlatılıyor…</span>
          <span v-else>
            <AppIcon name="zap" :size="14" /> {{ trialPlan.trial_days }} gün ücretsiz dene
          </span>
        </button>
        <div v-if="canStartTrial && trialPlan" class="sgt-mbar__note">Kredi kartı gerekmez</div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .sub-gate {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0.5rem 0 2rem;
  }

  /* ── Bildirim / durum kutuları ── */
  .notice {
    border: 1px solid $l-border-alt;
    background: $l-bg;
    border-radius: 12px;
    padding: 1.1rem 1.35rem;
    margin-bottom: 1.25rem;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .notice__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .notice__desc {
    margin: 0.35rem 0 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .notice--lock {
    border-color: rgba($c-warning, 0.45);
    background: rgba($c-warning, 0.07);
    @include dark {
      background: rgba($c-warning, 0.1);
      border-color: rgba($c-warning, 0.32);
    }
  }
  .notice--trial {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    border-color: rgba($brand, 0.4);
    background: rgba($brand, 0.05);
    @include dark {
      background: rgba($brand-light, 0.08);
      border-color: rgba($brand-light, 0.32);
    }
  }

  /* ── Mevcut abonelik kartı ── */
  .cur-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.1rem 1.35rem;
    margin-bottom: 1.25rem;
    background: $l-bg;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .cur-card__label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .cur-card__plan {
    margin-top: 0.15rem;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .cur-card__meta {
    margin-top: 0.35rem;
    font-size: 0.85rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    strong {
      color: $l-text-700;
      @include dark {
        color: $d-text;
      }
    }
  }
  .cur-card__sep {
    margin: 0 0.25rem;
    opacity: 0.5;
  }
  .cur-card__hint {
    font-size: 0.82rem;
    max-width: 240px;
    text-align: right;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .cur-badge {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
  }
  .cur-badge--trial {
    background: rgba($brand, 0.15);
    color: $brand;
    @include dark {
      color: $brand-light;
    }
  }
  .cur-badge--active {
    background: rgba($c-success, 0.16);
    color: #047857;
    @include dark {
      color: #34d399;
    }
  }

  .plans-heading {
    margin: 0 0 0.85rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }

  /* ── Paket kartları ── */
  .plans {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    @media (min-width: 768px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .plan {
    position: relative;
    display: flex;
    flex-direction: column;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.35rem 1.25rem;
    transition: border-color $t-base;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    &:hover {
      border-color: rgba($brand, 0.35);
      @include dark {
        border-color: rgba($brand-light, 0.4);
      }
    }
  }
  .plan--featured {
    border-color: $brand;
    box-shadow: 0 0 0 1px $brand inset;
    @include dark {
      border-color: $brand-light;
      box-shadow: 0 0 0 1px $brand-light inset;
    }
  }
  .plan--current {
    border-color: $c-success;
    box-shadow: 0 0 0 1px $c-success inset;
  }
  .plan__badge {
    position: absolute;
    top: -0.6rem;
    left: 1.25rem;
    background: $brand;
    color: #fff;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
  }
  .plan__badge--current {
    background: $c-success;
  }
  .plan__tag {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .plan__name {
    margin-top: 0.2rem;
    font-size: 1.15rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .plan__price {
    margin-top: 0.55rem;
    font-size: 1.4rem;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .plan__desc {
    margin: 0.35rem 0 1.1rem;
    min-height: 38px;
    font-size: 0.85rem;
    line-height: 1.45;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .plan__btn {
    margin-top: auto;
  }

  /* ── Butonlar ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.62rem 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background $t-base,
      border-color $t-base,
      filter $t-base,
      opacity $t-base;
    text-decoration: none;
    &:disabled {
      opacity: 0.55;
      cursor: default;
    }
    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }
  }
  .btn--sm {
    width: auto;
    padding: 0.4rem 0.8rem;
    font-size: 0.78rem;
  }
  .btn--primary {
    background: $brand;
    color: #fff;
    border-color: $brand;
  }
  .btn--outline {
    background: transparent;
    color: $brand;
    border-color: $brand;
    @include dark {
      color: $brand-light;
      border-color: $brand-light;
    }
    &:hover:not(:disabled) {
      filter: none;
      background: rgba($brand, 0.08);
      @include dark {
        background: rgba($brand-light, 0.12);
      }
    }
  }
  .btn--trial {
    background: $c-success;
    color: #fff;
    border-color: $c-success;
    width: auto;
  }
  .btn--current {
    background: transparent;
    border-color: $c-success;
    color: #047857;
    cursor: default;
    @include dark {
      color: #34d399;
    }
  }
  .btn--ghost {
    width: auto;
    background: transparent;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    &:hover:not(:disabled) {
      filter: none;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }

  /* ── Havale paneli ── */
  .bank {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.25rem;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .bank__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .bank__lead {
    margin: 0.4rem 0 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    strong {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .bank__grid {
    margin-top: 1.1rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.7rem;
    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  }
  .bank__field {
    background: $l-bg-soft;
    border-radius: 8px;
    padding: 0.7rem 1rem;
    @include dark {
      background: $d-bg-elevated;
    }
  }
  .bank__field--wide {
    @media (min-width: 640px) {
      grid-column: 1 / -1;
    }
  }
  .bank__label {
    font-size: 0.7rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .bank__value {
    margin-top: 0.1rem;
    font-weight: 500;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .bank__value--mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    letter-spacing: 0.02em;
  }
  .bank__ref {
    border: 1px solid rgba($brand, 0.45);
    background: rgba($brand, 0.06);
    @include dark {
      background: rgba($brand-light, 0.1);
      border-color: rgba($brand-light, 0.4);
    }
  }
  .bank__label--ref {
    color: $brand;
    @include dark {
      color: $brand-light;
    }
  }
  .bank__ref-row {
    margin-top: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .bank__ref-code {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 1rem;
    font-weight: 700;
    color: $brand;
    @include dark {
      color: $brand-light;
    }
  }
  .bank__note {
    margin: 0.8rem 0 0;
    font-size: 0.85rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .bank__waiting {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 8px;
    padding: 0.7rem 1rem;
    font-size: 0.85rem;
    background: rgba($c-warning, 0.1);
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
    strong {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .bank__back {
    margin-top: 1rem;
    padding-left: 0;
  }

  /* ── Yardımcı metinler ── */
  .state-msg {
    padding: 3rem 0;
    text-align: center;
    color: $l-text-400;
    @include dark {
      color: $d-text-muted;
    }
  }
  .foot-note {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.78rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  /* ── Mobil V4 (≤767px): radio satır listesi + tab bar üstü sabit ödeme çubuğu ── */
  .plans-m,
  .sgt-mbar {
    display: none;
  }

  $m-tabbar-h: 64px; /* mobile-nav.scss ile senkron tut */

  @media (max-width: 767px) {
    /* Kart grid'i listeye, trial banner'ı sabit çubuğa taşındı */
    .plans,
    .notice--trial {
      display: none;
    }

    .sub-gate {
      padding-bottom: 200px; /* sabit çubuk içeriğin sonunu örtmesin */
    }

    .plans-m {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .plan-m {
      width: 100%;
      text-align: left;
      font-family: inherit;
      background: $l-bg;
      border: 1px solid $l-border-alt;
      border-radius: 14px;
      padding: 14px 15px;
      cursor: pointer;
      transition: border-color $t-base;
      @include dark {
        background: $d-bg-card;
        border-color: $d-border;
      }
    }
    .plan-m--on {
      border-color: $brand;
      box-shadow: 0 0 0 1px $brand inset;
      background: linear-gradient(160deg, rgba($brand, 0.06), $l-bg 55%);
      @include dark {
        border-color: $brand;
        background: linear-gradient(160deg, rgba($brand, 0.09), $d-bg-card 55%);
      }
    }
    .plan-m__line {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .plan-m__radio {
      width: 20px;
      height: 20px;
      flex: none;
      border-radius: 999px;
      border: 2px solid $l-text-300;
      @include dark {
        border-color: $d-text-faint;
      }
    }
    .plan-m--on .plan-m__radio {
      border-color: $brand;
      background: radial-gradient(circle, $brand 0 42%, transparent 46%);
      @include dark {
        border-color: $brand;
      }
    }
    .plan-m__id {
      flex: 1;
      min-width: 0;
    }
    .plan-m__name {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 15px;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
    .plan-m__pop {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 999px;
      background: $brand;
      color: $brand-ink;
    }
    .plan-m__pop--current {
      background: $c-success;
      color: #fff;
    }
    .plan-m__sub {
      display: block;
      margin-top: 1px;
      font-size: 11px;
      color: $l-text-400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      @include dark {
        color: $d-text-faint;
      }
    }
    .plan-m__price {
      flex: none;
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
    .plan-m__ext {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid $l-border-alt;
      @include dark {
        border-color: $d-border-inner;
      }
    }
    .plan-m__tick {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12.5px;
      line-height: 1.45;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    .plan-m__tick-ic {
      flex: none;
      margin-top: 2px;
      color: $brand;
      @include dark {
        color: $brand-light;
      }
    }
    .plan-m__desc {
      font-size: 12.5px;
      line-height: 1.5;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }

    .sgt-mbar {
      display: flex;
      flex-direction: column;
      gap: 9px;
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(#{$m-tabbar-h} + env(safe-area-inset-bottom));
      z-index: 40; /* tab bar (50) altında, içerik üstünde */
      padding: 12px 16px 10px;
      background: $l-bg;
      border-top: 1px solid $l-border;
      @include dark {
        background: $d-panel-bg;
        border-color: $d-panel-border;
      }
    }
    .sgt-mbar__sum {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 0 2px;
      font-size: 12.5px;
      color: $l-text-500;
      b {
        font-size: 13.5px;
        color: $l-text-900;
      }
      @include dark {
        color: $d-text-muted;
        b {
          color: $d-text-max;
        }
      }
    }
    .sgt-mbar__trial {
      width: 100%;
      span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }
    .sgt-mbar__note {
      margin-top: -3px;
      text-align: center;
      font-size: 11px;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
    .foot-note {
      margin-top: 1rem;
    }
  }
</style>
