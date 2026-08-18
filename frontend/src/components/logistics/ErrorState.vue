<template>
  <div
    class="rounded-lg border p-6 text-center"
    :class="
      isFeatureDisabled
        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30'
        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
    "
    role="alert"
  >
    <p class="text-sm font-bold text-gray-900 dark:text-gray-100">{{ title }}</p>
    <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">{{ error.message }}</p>

    <!-- Kod görünür: destek kaydında "hata aldım" yerine kodu söyleyebilsin -->
    <p v-if="error.code" class="mt-2 font-mono text-[11px] text-gray-400 dark:text-gray-500">
      {{ error.code }}
    </p>

    <!-- Yetki hatasında yeniden denemek anlamsız — buton gösterilmez -->
    <button
      v-if="canRetry"
      type="button"
      class="hdr-btn-outlined mx-auto mt-4"
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
