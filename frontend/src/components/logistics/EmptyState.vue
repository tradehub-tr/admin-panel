<template>
  <div class="card text-center py-12">
    <div
      class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"
    >
      <AppIcon name="inbox" :size="24" class="text-gray-600 dark:text-gray-400" />
    </div>

    <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
      {{ filtered ? t("logistics.empty.filteredTitle") : t("logistics.empty.title", { entity }) }}
    </h3>
    <p class="text-xs text-gray-600 dark:text-gray-400 mb-4">
      {{ filtered ? t("logistics.empty.filteredHint") : t("logistics.empty.hint") }}
    </p>

    <!-- "Sonuç yok" ile "hiç kayıt yok" ayrımı önemli: ilkinde kullanıcı
         filtreyi temizlemek ister, ikincisinde kayıt oluşturmak. -->
    <button
      v-if="filtered"
      type="button"
      class="hdr-btn-outlined mx-auto"
      @click="$emit('clear-filters')"
    >
      {{ t("logistics.empty.clearFilters") }}
    </button>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    /** Filtre yüzünden mi boş, yoksa hiç kayıt mı yok? */
    filtered: { type: Boolean, default: false },
    entity: { type: String, default: "" },
  });
  defineEmits(["clear-filters"]);

  const { t } = useI18n();
</script>
