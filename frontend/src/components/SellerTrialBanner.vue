<script setup>
  import { computed } from "vue";
  import { storeToRefs } from "pinia";
  import { useAuthStore } from "@/stores/auth";
  import { useSubscriptionStore } from "@/stores/subscription";

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
  <div v-if="show" class="trial-banner" :class="{ 'trial-banner--urgent': urgent }">
    <span class="trial-banner__text">
      ⚡ Pro denemeniz: <strong>{{ trialDaysLeft }} gün</strong> kaldı
    </span>
    <router-link to="/abonelik" class="trial-banner__link">Pakete geç →</router-link>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .trial-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    border: 1px solid rgba($brand, 0.35);
    background: rgba($brand, 0.06);
    color: $l-text-700;
    @include dark {
      border-color: rgba($brand-light, 0.3);
      background: rgba($brand-light, 0.1);
      color: $d-text;
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
  .trial-banner__link {
    font-weight: 600;
    color: $brand;
    text-decoration: none;
    @include dark {
      color: $brand-light;
    }
    &:hover {
      text-decoration: underline;
    }
  }
</style>
