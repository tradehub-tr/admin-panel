<template>
  <div class="rounded-lg border border-dashed border-slate-300 py-12 text-center dark:border-slate-600">
    <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ filtered ? t("logistics.empty.filteredTitle") : t("logistics.empty.title", { entity }) }}
    </p>
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
      {{ filtered ? t("logistics.empty.filteredHint") : t("logistics.empty.hint") }}
    </p>

    <!-- "Sonuç yok" ile "hiç kayıt yok" ayrımı önemli: ilkinde kullanıcı
         filtreyi temizlemek ister, ikincisinde kayıt oluşturmak. -->
    <button
      v-if="filtered"
      type="button"
      class="th-btn-outline mt-4 text-xs"
      @click="$emit('clear-filters')"
    >
      {{ t("logistics.empty.clearFilters") }}
    </button>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  defineProps({
    /** Filtre yüzünden mi boş, yoksa hiç kayıt mı yok? */
    filtered: { type: Boolean, default: false },
    entity: { type: String, default: "" },
  });
  defineEmits(["clear-filters"]);

  const { t } = useI18n();
</script>
