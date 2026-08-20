<template>
  <form class="space-y-5" @submit.prevent="submit">
    <header class="min-w-0">
      <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
        {{ t("logistics.statusUpdate.title") }}
      </h1>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ t("logistics.statusUpdate.subtitle", { shipment: shipment.name }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div class="card flex flex-wrap items-center gap-3">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {{ t("logistics.statusUpdate.current") }}
      </span>
      <StatusBadge :status="shipment.status" />
      <span aria-hidden="true" class="text-gray-600">→</span>
      <StatusBadge v-if="target" :status="target" />
      <span v-else class="text-sm text-gray-600">{{ t("logistics.statusUpdate.pickTarget") }}</span>
    </div>

    <!-- Terminal durumdan ileri geçiş YOK (constants.py TERMINAL_STATUSES).
         Seçenek listesini boş bırakıp sebebini söylemek, geçersiz seçenek
         gösterip kaydederken reddetmekten dürüst. -->
    <div
      v-if="isTerminal"
      class="rounded border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
    >
      {{ t("logistics.statusUpdate.terminalBlocked") }}
    </div>

    <template v-else>
      <fieldset class="space-y-2">
        <legend class="form-label">
          {{ t("logistics.statusUpdate.target") }}
          <span class="text-red-500 ml-0.5">*</span>
        </legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="status in allowedTargets"
            :key="status"
            type="button"
            class="hdr-btn-outlined status-choice"
            :class="{ 'is-selected': status === target }"
            :aria-pressed="status === target"
            @click="target = status"
          >
            <StatusBadge :status="status" :show-dot="false" />
          </button>
        </div>
        <p v-if="!allowedTargets.length" class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.statusUpdate.noTransition") }}
        </p>
      </fieldset>

      <label class="block">
        <span class="form-label">
          {{ t("logistics.statusUpdate.reason") }}
          <span class="text-red-500 ml-0.5">*</span>
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
        <span
          class="mt-1 block text-xs"
          :class="reasonTooShort ? 'text-red-600 dark:text-red-400' : 'text-gray-600'"
        >
          {{ t("logistics.statusUpdate.reasonHint", { min: MIN_REASON_LENGTH }) }}
        </span>
      </label>

      <!-- Bilgilendirme kutusu yalnız ucun bunu taşıyabildiği yerde çizilir;
           gerekçesi script bloğunda (`canNotifyBuyer`). -->
      <label v-if="canNotifyBuyer" class="flex items-start gap-2 text-sm">
        <input v-model="notifyBuyer" type="checkbox" class="mt-0.5" />
        <span>
          {{ t("logistics.statusUpdate.notifyBuyer") }}
          <span class="block text-xs text-gray-600 dark:text-gray-400">
            {{ t("logistics.statusUpdate.notifyHint") }}
          </span>
        </span>
      </label>

      <div class="flex gap-2">
        <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <button type="submit" class="hdr-btn-primary" :disabled="saving || !canSubmit">
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
    /**
     * "Alıcıyı bilgilendir" kutusu çizilsin mi?
     *
     * VARSAYILAN KAPALI ve bu bilinçli. `update_shipment_status(name, status,
     * note)` üçüncü bir parametre almıyor — bildirim tercihi gönderilse bile
     * hiçbir yere yazılmaz. Kutuyu göstermek, kullanıcının işaretleyip
     * "alıcı haber aldı" sanmasına yol açardı; sessizce hiçbir şey yapmayan
     * bir onay kutusu ölü butondan daha kötü, çünkü tıklanınca form GERÇEKTEN
     * gönderiliyor.
     *
     * Uç bildirim parametresi kazandığında container burayı açar.
     */
    canNotifyBuyer: { type: Boolean, default: false },
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
    // Kutu çizilmediyse alan HİÇ gönderilmiyor — `false` göndermek de bir
    // tercih bildirmek olurdu, oysa burada tercih diye bir şey yok.
    emit("apply", {
      status: target.value,
      reason: reason.value.trim(),
      ...(props.canNotifyBuyer ? { notify_buyer: notifyBuyer.value } : {}),
    });
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  /* Hedef durum seçici: taban `hdr-btn-outlined`, üzerine yalnız seçim
     vurgusu biniyor. Rozet içerdiği için sabit 34px yüksekliği bırakılıyor. */
  .status-choice {
    height: auto;
    padding: 5px 10px;
  }

  /* Marka vurgusu SCSS'te, Tailwind `dark:` utility'siyle değil: header.scss'in
     `html.dark .hdr-btn-outlined` kuralı `!important` + daha yüksek özgüllük
     taşıyor, utility onu ezemiyordu (scss.md §6 — marka rengi zaten SCSS'in). */
  .status-choice.is-selected {
    border-color: $brand;
    background: rgba($brand, 0.12);

    @include dark {
      border-color: $brand !important;
      background: rgba($brand, 0.14) !important;
    }
  }
</style>
