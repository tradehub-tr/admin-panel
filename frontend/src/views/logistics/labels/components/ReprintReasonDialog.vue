<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
        @click.self="$emit('cancel')"
        @keydown.esc="$emit('cancel')"
        @keydown.tab="trapTab"
      >
        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 :id="titleId" class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {{ t("logistics.label.reprintTitle") }}
          </h2>
          <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
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
            <span class="form-label">{{ t("logistics.label.reasonLabel") }}</span>
            <AppSelect
              v-model="reason"
              :options="reasonOptions"
              :aria-label="t('logistics.label.reasonLabel')"
            />
          </label>

          <label class="mt-3 block">
            <span class="form-label">
              {{ t("logistics.label.reasonNote") }}
              <span v-if="reason === 'other'" class="text-red-700 dark:text-red-400">*</span>
            </span>
            <input
              v-model="note"
              type="text"
              class="form-input w-full text-sm"
              :aria-required="reason === 'other' || undefined"
              :placeholder="t('logistics.label.reasonNotePlaceholder')"
            />
          </label>

          <p class="mt-3 text-[11px] text-gray-600 dark:text-gray-400">
            {{ t("logistics.label.auditHint") }}
          </p>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
              {{ t("common.cancel") }}
            </button>
            <button type="button" class="hdr-btn-primary" :disabled="!isValid" @click="confirm">
              {{ t("logistics.label.reprintConfirm") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { computed, nextTick, ref, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import { focusablesIn, restoreFocus, trapTabKey } from "@/components/common/focusTrap";
  import { REPRINT_REASONS } from "../labelFormats";

  /**
   * Yeniden basım gerekçesi — **D2**: yalnız 2. basımdan itibaren açılıyor.
   *
   * "Diğer" seçilirse serbest metin ZORUNLU: gerekçe listesi denetim izi için
   * var, "diğer" tek başına hiçbir şey anlatmaz (`Shipment Label Log`).
   *
   * ODAK YÖNETİMİ (WCAG 2.1.2 / 2.4.3 / 4.1.2) — kardeş `ResolveDialog` ile
   * AYNI desen, çünkü ikisi de aynı işi yapıyor. Bu dosyada 2026-08-28'e kadar
   * odak yönetimi HİÇ YOKTU: diyalog açılınca odak arkadaki sayfada kalıyor,
   * Tab arkadaki düğmeleri geziyor, Esc bir şey yapmıyor ve kapanışta odak
   * `<body>`ye düşüyordu. Tuzak ve iade ortak `components/common/focusTrap`ten;
   * YEREL KOPYA YOK.
   *
   * Açılıştaki odak `focusablesIn(panel)[0]` ile veriliyor, elle seçilen bir
   * `ref` ile değil: ilk kontrol `AppSelect` (kendi tetikleyici düğmesini saran
   * bir bileşen) ve yarın başına bir alan eklenirse odak kendiliğinden ona
   * geçer — kaymayan tek doğru "ilk" tanımı DOM sırası.
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

  const titleId = useId();
  const panelRef = ref(null);
  let lastActive = null;

  const trapTab = (e) => trapTabKey(e, panelRef.value);

  const reasonOptions = computed(() =>
    REPRINT_REASONS.map((r) => ({ value: r.key, label: t(r.labelKey) }))
  );

  const isValid = computed(() => (reason.value === "other" ? note.value.trim().length > 0 : true));

  function confirm() {
    if (!isValid.value) return;
    emit("confirm", { reason: reason.value, note: note.value.trim() || null });
  }

  // Diyalog her açılışta temiz başlasın — önceki gerekçe yeni basıma
  // sessizce taşınmasın, denetim izi yanlış olur. Aynı watch odak
  // yönetimini de taşıyor: tek açılış/kapanış kapısı.
  watch(
    () => props.open,
    async (isOpen) => {
      if (!isOpen) {
        restoreFocus(lastActive);
        lastActive = null;
        return;
      }
      reason.value = "damaged";
      note.value = "";
      lastActive = document.activeElement;
      await nextTick();
      focusablesIn(panelRef.value)[0]?.focus();
    }
  );
</script>
