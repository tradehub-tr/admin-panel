<template>
  <form class="space-y-5" @submit.prevent="submit">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.statusUpdate.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.statusUpdate.subtitle", { shipment: shipment.name }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <span class="text-sm text-slate-500">{{ t("logistics.statusUpdate.current") }}</span>
      <StatusBadge :status="shipment.status" />
      <span aria-hidden="true" class="text-slate-400">→</span>
      <StatusBadge v-if="target" :status="target" />
      <span v-else class="text-sm text-slate-400">{{ t("logistics.statusUpdate.pickTarget") }}</span>
    </div>

    <!-- Terminal durumdan ileri geçiş YOK (constants.py TERMINAL_STATUSES).
         Seçenek listesini boş bırakıp sebebini söylemek, geçersiz seçenek
         gösterip kaydederken reddetmekten dürüst. -->
    <div
      v-if="isTerminal"
      class="rounded border border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
    >
      {{ t("logistics.statusUpdate.terminalBlocked") }}
    </div>

    <template v-else>
      <fieldset class="space-y-2">
        <legend class="mb-1 text-sm font-medium">{{ t("logistics.statusUpdate.target") }} *</legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="status in allowedTargets"
            :key="status"
            type="button"
            class="rounded-lg border px-3 py-2 text-sm transition-colors"
            :class="
              status === target
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
            "
            :aria-pressed="status === target"
            @click="target = status"
          >
            <StatusBadge :status="status" :show-dot="false" />
          </button>
        </div>
        <p v-if="!allowedTargets.length" class="text-xs text-slate-500">
          {{ t("logistics.statusUpdate.noTransition") }}
        </p>
      </fieldset>

      <label class="block">
        <span class="mb-1 block text-sm font-medium">
          {{ t("logistics.statusUpdate.reason") }} *
        </span>
        <textarea
          v-model="reason"
          rows="3"
          class="form-input"
          :aria-invalid="reasonTooShort"
          :placeholder="t('logistics.statusUpdate.reasonPlaceholder')"
        />
        <!-- TUR-107 audit kriteri: manuel değişiklik GEREKÇESİZ yapılamaz.
             Gerekçe olay akışına yazılıyor ve orada kalıcı. -->
        <span class="mt-1 block text-xs" :class="reasonTooShort ? 'text-red-600 dark:text-red-400' : 'text-slate-500'">
          {{ t("logistics.statusUpdate.reasonHint", { min: MIN_REASON_LENGTH }) }}
        </span>
      </label>

      <label class="flex items-start gap-2 text-sm">
        <input v-model="notifyBuyer" type="checkbox" class="mt-0.5" />
        <span>
          {{ t("logistics.statusUpdate.notifyBuyer") }}
          <span class="block text-xs text-slate-500">{{ t("logistics.statusUpdate.notifyHint") }}</span>
        </span>
      </label>

      <div class="flex gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <button type="submit" class="th-btn-primary text-sm" :disabled="saving || !canSubmit">
          {{ saving ? t("logistics.form.saving") : t("logistics.statusUpdate.apply") }}
        </button>
      </div>
    </template>
  </form>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { TERMINAL_STATUSES } from "./constants";

  /**
   * **C2 · Manuel durum güncelleme** (TUR-107).
   *
   * TUR-107 kabul kriteri: *"Manuel değişiklikler gerekçe ile denetim kaydına
   * yazılır."* Gerekçe alanı bu yüzden isteğe bağlı değil; boşken kaydet
   * butonu çalışmıyor. Asıl doğrulama backend'de — sunum katmanı tek başına
   * garanti veremez ama kullanıcıyı da şaşırtmamalı.
   *
   * İzin verilen geçişler dışarıdan geliyor (`allowedTransitions`); geçiş
   * kuralı sözleşmenin parçası, ekranın kararı değil.
   */
  const props = defineProps({
    shipment: { type: Object, required: true },
    /** `{ "In Transit": ["Delivered", "Failed"], ... }` — constants.py'den. */
    allowedTransitions: { type: Object, default: () => ({}) },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  const emit = defineEmits(["apply", "cancel", "retry"]);

  const { t } = useI18n();

  /** Tek kelimelik "düzeltme" gerekçe değildir — denetim kaydı okunabilir olmalı. */
  const MIN_REASON_LENGTH = 10;

  const target = ref("");
  const reason = ref("");
  const notifyBuyer = ref(false);

  const isTerminal = computed(() => TERMINAL_STATUSES.includes(props.shipment.status));
  const allowedTargets = computed(() => props.allowedTransitions[props.shipment.status] ?? []);

  const reasonTooShort = computed(
    () => reason.value.length > 0 && reason.value.trim().length < MIN_REASON_LENGTH
  );
  const canSubmit = computed(
    () => Boolean(target.value) && reason.value.trim().length >= MIN_REASON_LENGTH
  );

  function submit() {
    if (!canSubmit.value) return;
    emit("apply", {
      status: target.value,
      reason: reason.value.trim(),
      notify_buyer: notifyBuyer.value,
    });
  }
</script>
