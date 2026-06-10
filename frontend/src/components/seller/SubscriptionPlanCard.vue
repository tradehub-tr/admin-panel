<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useI18n } from "vue-i18n";

  const props = defineProps({
    user: { type: String, required: true },
  });

  const { t } = useI18n();
  const toast = useToast();

  const loading = ref(true);
  const saving = ref(false);
  // {is_seller, store, plan_code, plan_name, status, trial_end, can_edit}
  const sub = ref(null);
  const plans = ref([]);
  const selected = ref("");

  const isSeller = computed(() => !!sub.value?.is_seller);
  const canEdit = computed(() => !!sub.value?.can_edit);
  const dirty = computed(
    () => canEdit.value && selected.value && selected.value !== sub.value?.plan_code
  );

  function unwrap(res) {
    return res?.message ?? res;
  }

  async function load() {
    if (!props.user) return;
    loading.value = true;
    try {
      sub.value = unwrap(
        await api.callMethodGET("tradehub_core.api.v1.subscription.get_seller_subscription", {
          user: props.user,
        })
      );
      selected.value = sub.value?.plan_code || "";
      if (sub.value?.can_edit && !plans.value.length) {
        plans.value =
          unwrap(
            await api.callMethodGET(
              "tradehub_core.api.v1.permission_console.list_subscription_plans"
            )
          ) || [];
      }
    } catch {
      // Sessiz: kart gizli kalır (is_seller=false gibi davran)
      sub.value = { is_seller: false };
    } finally {
      loading.value = false;
    }
  }

  async function changePlan() {
    if (!dirty.value || saving.value) return;
    saving.value = true;
    try {
      await api.callMethod("tradehub_core.api.v1.subscription.upgrade_subscription_plan", {
        new_plan: selected.value,
        tenant: sub.value.store,
        reason: "Admin panel — satıcı profili plan değişikliği",
      });
      toast.success(t("sellerPlan.changed"));
      await load();
    } catch (e) {
      toast.error(e.message || t("sellerPlan.changeError"));
    } finally {
      saving.value = false;
    }
  }

  watch(() => props.user, load);
  onMounted(load);
</script>

<template>
  <section v-if="!loading && isSeller" class="seller-plan-card">
    <div class="sp-head">
      <h3 class="sp-title">{{ t("sellerPlan.title") }}</h3>
      <span v-if="sub.status" class="sp-status" :class="`st-${sub.status}`">
        {{ t(`sellerPlan.statusValue.${sub.status}`, sub.status) }}
      </span>
    </div>

    <!-- Süper admin: değiştirilebilir -->
    <div v-if="canEdit" class="sp-body">
      <select v-model="selected" class="sp-select" :disabled="saving">
        <option value="">{{ t("sellerPlan.noSubscription") }}</option>
        <option v-for="p in plans" :key="p.plan_code" :value="p.plan_code">
          {{ p.plan_name }}
        </option>
      </select>
      <button type="button" class="sp-btn" :disabled="!dirty || saving" @click="changePlan">
        {{ saving ? t("sellerPlan.saving") : t("sellerPlan.change") }}
      </button>
    </div>

    <!-- Satıcı: salt-okunur -->
    <div v-else class="sp-readonly">
      {{ sub.plan_name || t("sellerPlan.noSubscription") }}
    </div>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .seller-plan-card {
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg-soft;
    padding: 0.9rem 1.1rem;
    margin-bottom: 1.1rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }
  }
  .sp-head {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.7rem;
  }
  .sp-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
  .sp-status {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: $l-bg-muted;
    color: $l-text-700;
    @include dark {
      background: $d-bg-hover;
      color: $d-text;
    }
    &.st-active {
      background: rgba($c-success, 0.15);
      color: $c-success;
    }
    &.st-trial {
      background: rgba($c-info, 0.15);
      color: $c-info;
    }
    &.st-past_due,
    &.st-suspended,
    &.st-canceled {
      background: rgba($c-error, 0.15);
      color: $c-error;
    }
  }
  .sp-body {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .sp-select {
    flex: 1 1 12rem;
    min-width: 10rem;
    padding: 0.45rem 0.6rem;
    border-radius: 8px;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.85rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
  }
  .sp-btn {
    flex: 0 0 auto;
    padding: 0.45rem 1.1rem;
    border-radius: 8px;
    border: none;
    background: $brand;
    color: #fff;
    font-size: 0.83rem;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;
    &:hover:not(:disabled) {
      background: $brand-glow;
    }
    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
  .sp-readonly {
    font-size: 0.95rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
</style>
