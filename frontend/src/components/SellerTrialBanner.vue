<script setup>
  import { computed } from "vue";
  import { storeToRefs } from "pinia";
  import { useAuthStore } from "@/stores/auth";
  import { useSubscriptionStore } from "@/stores/subscription";
  import AppIcon from "@/components/common/AppIcon.vue";

  const auth = useAuthStore();
  const sub = useSubscriptionStore();
  const { isTrial, trialDaysLeft } = storeToRefs(sub);

  // Sadece satıcı (admin değil) + aktif trial durumunda göster.
  const show = computed(
    () => auth.isSeller && !auth.isAdmin && isTrial.value && trialDaysLeft.value !== null
  );

  // Son 3 gün → aciliyet tonu.
  const urgent = computed(() => (trialDaysLeft.value ?? 99) <= 3);
</script>

<template>
  <router-link
    v-if="show"
    to="/abonelik"
    class="trial-banner"
    :class="{ 'trial-banner--urgent': urgent }"
  >
    <AppIcon name="zap" :size="14" class="trial-banner__icon" />
    <span class="trial-banner__text">
      Pro denemeniz: <strong>{{ trialDaysLeft }} gün</strong> kaldı
    </span>
    <AppIcon name="arrow-right" :size="14" class="trial-banner__arrow" />
  </router-link>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .trial-banner {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    line-height: 1.3;
    text-decoration: none;
    border: 1px solid rgba($brand, 0.35);
    background: rgba($brand, 0.06);
    color: $l-text-700;
    transition: background $t-base;
    @include dark {
      border-color: rgba($brand-light, 0.3);
      background: rgba($brand-light, 0.1);
      color: $d-text;
    }

    &:hover {
      background: rgba($brand, 0.1);
      @include dark {
        background: rgba($brand-light, 0.16);
      }
      .trial-banner__text {
        text-decoration: underline;
      }
      .trial-banner__arrow {
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
  .trial-banner__text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .trial-banner__icon,
  .trial-banner__arrow {
    flex-shrink: 0;
  }
  .trial-banner__arrow {
    color: $brand;
    transition: transform $t-base;
    @include dark {
      color: $brand-light;
    }
  }
  .trial-banner--urgent {
    border-color: rgba($c-warning, 0.45);
    background: rgba($c-warning, 0.08);
    @include dark {
      border-color: rgba($c-warning, 0.35);
      background: rgba($c-warning, 0.12);
    }
  }
  .trial-banner__text strong {
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
</style>
