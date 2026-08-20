<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
        @click.self="$emit('cancel')"
      >
        <div
          class="mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {{ t("logistics.exception.resolveTitle") }}
          </h3>
          <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {{ exception?.exception_label || exception?.exception_code }} ·
            <span class="font-mono">{{ exception?.shipment }}</span>
          </p>

          <label class="mt-4 block">
            <span class="form-label">{{ t("logistics.exception.resolveNoteLabel") }} *</span>
            <!-- eslint-disable-next-line vuejs-accessibility/no-autofocus -->
            <textarea
              v-model="note"
              rows="3"
              class="form-input resize-y"
              autofocus
              :placeholder="t('logistics.exception.resolveNotePlaceholder')"
            ></textarea>
          </label>
          <!-- TUR-113: çözüm notu zorunlu — buton notsuz hiç aktifleşmiyor;
               asıl doğrulama backend'de (VALIDATION_FAILED). -->
          <p v-if="showRequired" class="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {{ t("logistics.exception.resolveNoteRequired") }}
          </p>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="hdr-btn-outlined" @click="$emit('cancel')">
              {{ t("logistics.form.cancel") }}
            </button>
            <button
              type="button"
              class="hdr-btn-primary"
              :disabled="saving || !note.trim()"
              @click="submit"
            >
              {{ saving ? t("logistics.form.saving") : t("logistics.exception.resolve") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * **A3 · Çözüm notu diyalogu** — istisna kapatma TUR-113 gereği not ister.
   *
   * Ekran-yerel bileşen (`exceptions/components/`): başka ekranın not
   * toplama ihtiyacı doğarsa ortak `components/common`'a terfi ettirilir,
   * önceden genelleştirilmez.
   */
  const props = defineProps({
    open: { type: Boolean, default: false },
    exception: { type: Object, default: null },
    saving: { type: Boolean, default: false },
  });

  const emit = defineEmits(["confirm", "cancel"]);

  const { t } = useI18n();

  const note = ref("");
  const showRequired = ref(false);

  // Her açılışta temiz not — önceki istisnanın notu yeni kayda sızmasın.
  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        note.value = "";
        showRequired.value = false;
      }
    }
  );

  function submit() {
    if (!note.value.trim()) {
      showRequired.value = true;
      return;
    }
    emit("confirm", note.value.trim());
  }
</script>
