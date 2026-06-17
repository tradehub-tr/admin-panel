<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { storeToRefs } from "pinia";
  import api from "@/utils/api";
  import { useSubscriptionStore } from "@/stores/subscription";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  // Sayfa-içi onboarding: paket kartları → birincil abone ol/öde butonu → bilgi/durum alanı.
  usePageTour("subscription-gate", () => [
    { target: '[data-tour="sgt-plans"]', title: t("tourSteps.page.sgtPlans_t"), desc: t("tourSteps.page.sgtPlans_d") },
    { target: '[data-tour="sgt-subscribe"]', title: t("tourSteps.page.sgtSubscribe_t"), desc: t("tourSteps.page.sgtSubscribe_d") },
    { target: '[data-tour="sgt-info"]', title: t("tourSteps.page.sgtInfo_t"), desc: t("tourSteps.page.sgtInfo_d") },
  ]);
  const sub = useSubscriptionStore();
  const { isLocked, isTrial, lockReason, canStartTrial, trialDaysLeft } = storeToRefs(sub);

  const plans = ref([]);
  const loading = ref(true);
  const acting = ref(""); // işlem yapılan plan_code (buton spinner)
  const pending = ref(null); // bekleyen havale talebi (varsa banka talimatı gösterilir)

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

  async function loadPlans() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.v1.public_pricing.get_pricing_plans");
      plans.value = res?.message?.plans || [];
    } catch (e) {
      toast.error(e.message || "Paketler yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

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
      toast.success("Deneme başladı 🎉");
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
    <div v-else class="notice notice--plain">
      <h1 class="notice__title">Aboneliğiniz</h1>
      <p v-if="isTrial" class="notice__desc">
        Pro denemeniz aktif — {{ trialDaysLeft }} gün kaldı. Dilediğiniz an kalıcı pakete geçebilirsiniz.
      </p>
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
        <span>⏳</span>
        <span>Ödemeniz <strong>onay bekliyor</strong>. Havale ulaştığında ekibimiz onaylayacak.</span>
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
          <span v-else>⚡ {{ trialPlan.trial_days }} gün ücretsiz dene</span>
        </button>
      </div>

      <!-- Paketler -->
      <div v-if="loading" class="state-msg">Paketler yükleniyor…</div>
      <div v-else class="plans" data-tour="sgt-plans">
        <div
          v-for="p in plans"
          :key="p.plan_code"
          class="plan"
          :class="{ 'plan--featured': p.highlighted }"
        >
          <span v-if="p.highlighted" class="plan__badge">EN POPÜLER</span>
          <div class="plan__tag">{{ p.plan_code }}</div>
          <div class="plan__name">{{ p.plan_name }}</div>
          <div class="plan__price">{{ priceLabel(p) }}</div>
          <p class="plan__desc">{{ p.short_tagline || p.description || "" }}</p>

          <button
            v-if="!isContactSales(p)"
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

      <p class="foot-note" data-tour="sgt-info">
        Ödeme havale / EFT ile alınır. Havaleniz onaylandığında paketiniz aktifleşir.
      </p>
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
</style>
