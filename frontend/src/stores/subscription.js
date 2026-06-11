import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/utils/api";

/**
 * Satıcı abonelik kapısı (paywall) durumu.
 *
 * Backend `get_seller_access_state` tek doğru kaynak:
 *   access: "ok" | "locked" | "no_store" | "guest"
 *   locked ise: reason + redirect + can_start_trial
 *   ok + is_trial ise: trial_end (geri sayım)
 *
 * Router guard her satıcı navigasyonunda `ensureChecked()` çağırır; ödeme/trial
 * sonrası `refresh()` ile yeniden çekilir.
 */
export const useSubscriptionStore = defineStore("subscription", () => {
  const state = ref(null);
  const loading = ref(false);
  const checked = ref(false);

  const access = computed(() => state.value?.access || null);
  const isLocked = computed(() => state.value?.access === "locked");
  const isTrial = computed(() => !!state.value?.is_trial);
  const trialEnd = computed(() => state.value?.trial_end || null);
  const canStartTrial = computed(() => !!state.value?.can_start_trial);
  const lockReason = computed(() => state.value?.reason || null);
  const planCode = computed(() => state.value?.plan || null);
  const subStatus = computed(() => state.value?.status || null);
  const currentPeriodEnd = computed(() => state.value?.current_period_end || null);
  const startedAt = computed(() => state.value?.started_at || null);
  // access === "ok" → satıcının kullanılabilir bir aboneliği var (trial veya active)
  const hasSubscription = computed(() => state.value?.access === "ok");

  // Trial bitimine kalan tam gün (banner için). trial_end "YYYY-MM-DD HH:MM:SS".
  const trialDaysLeft = computed(() => {
    if (!isTrial.value || !trialEnd.value) return null;
    const end = new Date(String(trialEnd.value).replace(" ", "T"));
    const ms = end.getTime() - Date.now();
    if (Number.isNaN(ms)) return null;
    return Math.max(0, Math.ceil(ms / 86_400_000));
  });

  async function fetchAccessState() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.subscription.get_seller_access_state"
      );
      state.value = res?.message ?? null;
      return state.value;
    } finally {
      checked.value = true;
      loading.value = false;
    }
  }

  async function ensureChecked() {
    if (checked.value) return state.value;
    return fetchAccessState();
  }

  function reset() {
    state.value = null;
    checked.value = false;
  }

  return {
    state,
    loading,
    checked,
    access,
    isLocked,
    isTrial,
    trialEnd,
    canStartTrial,
    lockReason,
    planCode,
    subStatus,
    currentPeriodEnd,
    startedAt,
    hasSubscription,
    trialDaysLeft,
    fetchAccessState,
    ensureChecked,
    refresh: fetchAccessState,
    reset,
  };
});
