<script setup>
  import { computed } from "vue";
  import { storeToRefs } from "pinia";
  import { RouterLink } from "vue-router";
  import { useAuthStore } from "@/stores/auth";
  import { useSubscriptionStore } from "@/stores/subscription";
  import { isIosApp } from "@/utils/platform";
  import AppIcon from "@/components/common/AppIcon.vue";

  const auth = useAuthStore();
  const sub = useSubscriptionStore();
  const { inDunning, dunningGraceEnd } = storeToRefs(sub);

  // iOS uygulamada /abonelik ödeme CTA'sı gizlenir (anti-steering, AC-1);
  // hoşgörü bitişi bilgisi kalır. Platform runtime'da değişmez — sabit yeterli.
  const iosApp = isIosApp();

  // Sadece satıcı (admin değil) + dunning hoşgörü penceresinde göster (AC-10).
  const show = computed(() => auth.isSeller && !auth.isAdmin && inDunning.value);

  // dunning_grace_end "YYYY-MM-DD HH:MM:SS" → okunur tarih (SellerTrialBanner
  // gibi gün sayısı değil; backend'in verdiği kesin bitiş tarihi gösterilir).
  const graceEndLabel = computed(() => {
    if (!dunningGraceEnd.value) return null;
    const d = new Date(String(dunningGraceEnd.value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  });
</script>

<template>
  <!-- iOS: /abonelik'e götüren link (ödeme CTA'sı) yerine düz bilgi kutusu.
       :is sabit ikili seçimdir (kullanıcı girdisi değil) — dynamic-component
       whitelist kuralına uygun (SellerTrialBanner deseni). -->
  <component
    :is="iosApp ? 'div' : RouterLink"
    v-if="show"
    :to="iosApp ? undefined : '/abonelik'"
    class="dunning-banner"
    :class="{ 'dunning-banner--static': iosApp }"
  >
    <AppIcon name="hourglass" :size="14" class="dunning-banner__icon" />
    <span class="dunning-banner__text">
      Abonelik döneminiz doldu — ödemenizi bekliyoruz.
      <template v-if="graceEndLabel">
        Erişiminiz <strong>{{ graceEndLabel }}</strong> tarihine kadar sürer.
      </template>
    </span>
    <AppIcon v-if="!iosApp" name="arrow-right" :size="14" class="dunning-banner__arrow" />
  </component>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .dunning-banner {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    line-height: 1.3;
    text-decoration: none;
    border: 1px solid rgba($c-warning, 0.45);
    background: rgba($c-warning, 0.08);
    color: $l-text-700;
    transition: background $t-base;
    @include dark {
      border-color: rgba($c-warning, 0.35);
      background: rgba($c-warning, 0.12);
      color: $d-text;
    }

    // iOS bilgi-only kipinde (--static) hover geri bildirimi verilmez —
    // tıklanabilirlik yanılsaması ölü kontrol olurdu (SellerTrialBanner deseni).
    &:hover:not(.dunning-banner--static) {
      background: rgba($c-warning, 0.14);
      @include dark {
        background: rgba($c-warning, 0.18);
      }
      .dunning-banner__text {
        text-decoration: underline;
      }
      .dunning-banner__arrow {
        transform: translateX(2px);
      }
    }

    // Dar ekranda tek satırı korumak için biraz sıkılaştır
    @media (max-width: 400px) {
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
    }
  }
  .dunning-banner__text {
    flex: 1 1 auto;
    min-width: 0;
    strong {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .dunning-banner__icon,
  .dunning-banner__arrow {
    flex-shrink: 0;
  }
  .dunning-banner__icon {
    color: $c-warning;
  }
  .dunning-banner__arrow {
    color: $c-warning;
    transition: transform $t-base;
  }
  // iOS bilgi-only: tıklanabilirlik yanılsaması verme (ölü kontrol yasağı).
  .dunning-banner--static {
    cursor: default;
  }
</style>
