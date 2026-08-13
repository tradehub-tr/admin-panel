<template>
  <div
    class="rounded-lg border p-6 text-center"
    :class="
      isFeatureDisabled
        ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/20'
        : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
    "
    role="alert"
  >
    <p class="text-sm font-medium">{{ title }}</p>
    <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">{{ error.message }}</p>

    <!-- Kod görünür: destek kaydında "hata aldım" yerine kodu söyleyebilsin -->
    <p v-if="error.code" class="mt-2 font-mono text-[11px] text-slate-400">{{ error.code }}</p>

    <!-- Yetki hatasında yeniden denemek anlamsız — buton gösterilmez -->
    <button
      v-if="canRetry"
      type="button"
      class="th-btn-outline mt-4 text-xs"
      @click="$emit('retry')"
    >
      {{ t("logistics.error.retry") }}
    </button>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Hata durumu — hata KODUNA göre farklı anlatım.
   *
   * "Bu özellik henüz açık değil" ile "yetkiniz yok" farklı şeyler; ikisini
   * aynı kırmızı kutuda göstermek kullanıcıyı yanlış yönlendirir. Dallanma
   * mesaj metnine değil koda bakar (i18n ile kırılmasın).
   */
  const props = defineProps({
    /** { code, message } */
    error: { type: Object, required: true },
  });
  defineEmits(["retry"]);

  const { t } = useI18n();

  const isFeatureDisabled = computed(() => props.error.code === "FEATURE_DISABLED");
  const isPermission = computed(() =>
    ["PERMISSION_DENIED", "CAPABILITY_REQUIRED"].includes(props.error.code)
  );

  const title = computed(() => {
    if (isFeatureDisabled.value) return t("logistics.error.featureDisabled");
    if (isPermission.value) return t("logistics.error.noPermission");
    if (props.error.code === "NOT_FOUND") return t("logistics.error.notFound");
    return t("logistics.error.generic");
  });

  /** Yetki ve kapalı özellik yeniden denemekle düzelmez. */
  const canRetry = computed(() => !isFeatureDisabled.value && !isPermission.value);
</script>
