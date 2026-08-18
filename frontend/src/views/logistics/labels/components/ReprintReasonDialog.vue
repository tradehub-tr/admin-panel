<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="t('logistics.label.reprintTitle')"
    @click.self="$emit('cancel')"
  >
    <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <h2 class="text-base font-semibold">{{ t("logistics.label.reprintTitle") }}</h2>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.label.reprintSubtitle", { count: packageCodes.length }) }}
      </p>

      <div
        v-if="maxPrintCount > 1"
        class="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
      >
        <span aria-hidden="true">⚠</span>
        <span>{{ t("logistics.label.reprintWarning", { count: maxPrintCount }) }}</span>
      </div>

      <label class="mt-4 block">
        <span class="mb-1 block text-[11px] font-semibold text-slate-500">
          {{ t("logistics.label.reasonLabel") }}
        </span>
        <AppSelect v-model="reason" :options="reasonOptions" />
      </label>

      <label class="mt-3 block">
        <span class="mb-1 block text-[11px] font-semibold text-slate-500">
          {{ t("logistics.label.reasonNote") }}
          <span v-if="reason === 'other'" class="text-red-500">*</span>
        </span>
        <input
          v-model="note"
          type="text"
          class="form-input w-full text-sm"
          :placeholder="t('logistics.label.reasonNotePlaceholder')"
        />
      </label>

      <p class="mt-3 text-[11px] text-slate-400">{{ t("logistics.label.auditHint") }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="$emit('cancel')">
          {{ t("common.cancel") }}
        </button>
        <button type="button" class="th-btn-primary text-sm" :disabled="!isValid" @click="confirm">
          {{ t("logistics.label.reprintConfirm") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import { REPRINT_REASONS } from "../labelFormats";

  /**
   * Yeniden basım gerekçesi — **D2**: yalnız 2. basımdan itibaren açılıyor.
   *
   * "Diğer" seçilirse serbest metin ZORUNLU: gerekçe listesi denetim izi için
   * var, "diğer" tek başına hiçbir şey anlatmaz (`Shipment Label Log`).
   */
  const props = defineProps({
    open: { type: Boolean, default: false },
    packageCodes: { type: Array, default: () => [] },
    /** Seçili kolilerdeki en yüksek basım sayısı — uyarının şiddeti. */
    maxPrintCount: { type: Number, default: 0 },
  });

  const emit = defineEmits(["confirm", "cancel"]);
  const { t } = useI18n();

  const reason = ref("damaged");
  const note = ref("");

  const reasonOptions = computed(() =>
    REPRINT_REASONS.map((r) => ({ value: r.key, label: t(r.labelKey) }))
  );

  const isValid = computed(() => (reason.value === "other" ? note.value.trim().length > 0 : true));

  function confirm() {
    if (!isValid.value) return;
    emit("confirm", { reason: reason.value, note: note.value.trim() || null });
  }

  // Diyalog her açılışta temiz başlasın — önceki gerekçe yeni basıma
  // sessizce taşınmasın, denetim izi yanlış olur.
  watch(
    () => props.open,
    (isOpen) => {
      if (!isOpen) return;
      reason.value = "damaged";
      note.value = "";
    }
  );
</script>
