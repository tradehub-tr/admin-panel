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
  // İptal planı (BE-3 additive alanlar): access="ok" → cancel_at_period_end +
  // billing_cycle; access="locked" + reason="canceled" → canceled_at.
  const cancelAtPeriodEnd = computed(() => !!state.value?.cancel_at_period_end);
  const billingCycle = computed(() => state.value?.billing_cycle || null);
  const canceledAt = computed(() => state.value?.canceled_at || null);
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

  // ── Abonelik iptali (Amazon Seller modeli — dönem sonunda etkinleşir) ──
  // Uçlar BE-2 sözleşmesi (subscription_cancellation.py): yalnız mağaza
  // sahibi; hata zarfı mevcut api.request() çözümlemesiyle Error.message'a
  // düşer (403 owner-değil, 417 geçersiz reason / status != active / dönem
  // bilgisi eksik). Hata çağırana fırlatılır — toast kararı component'in.
  const cancelActing = ref(false);

  /** Dönem sonunda iptali planla. reason zorunlu (allowlist backend'de). */
  async function requestCancellation(reason, note = "") {
    cancelActing.value = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.v1.subscription_cancellation.request_cancellation",
        { reason, note }
      );
      // Bayrak/durum tek doğru kaynaktan tazelenir (cancel_at_period_end=1).
      await fetchAccessState();
      return res?.message ?? null;
    } finally {
      cancelActing.value = false;
    }
  }

  /** Planlı iptali tek tıkla geri al (dönem bitmeden). */
  async function revokeCancellation() {
    cancelActing.value = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.v1.subscription_cancellation.revoke_cancellation"
      );
      await fetchAccessState();
      return res?.message ?? null;
    } finally {
      cancelActing.value = false;
    }
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
    cancelAtPeriodEnd,
    billingCycle,
    canceledAt,
    hasSubscription,
    trialDaysLeft,
    cancelActing,
    requestCancellation,
    revokeCancellation,
    fetchAccessState,
    ensureChecked,
    refresh: fetchAccessState,
    reset,
  };
});
