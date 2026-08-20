<template>
  <!-- K-C: teslim noktası için AYRI EKRAN açılmıyor. Kargo şubesi kaydı
       katalogda kalıyor (Bora'nın M1/M2 ekranı); nokta bilgisi ihtiyaç
       duyulan ekranlarda KART olarak gösteriliyor. -->
  <div class="card !p-3">
    <div class="flex items-start justify-between gap-2 flex-wrap">
      <div class="min-w-0">
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.delivery.point.title") }}</p>
        <p class="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
          {{ branch.name }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ branch.branch_type }}<template v-if="branch.city"> · {{ branch.city }}</template>
          <template v-if="branch.district"> / {{ branch.district }}</template>
        </p>
      </div>
      <span :class="branch.is_open ? openClass : closedClass">
        {{ branch.is_open ? t("logistics.delivery.point.open") : t("logistics.delivery.point.closed") }}
      </span>
    </div>

    <p v-if="branch.address" class="mt-2 text-xs text-gray-600 dark:text-gray-400">{{ branch.address }}</p>

    <dl class="mt-2 grid gap-2 sm:grid-cols-2">
      <div v-if="branch.operating_hours">
        <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.delivery.point.hours") }}</dt>
        <dd class="text-xs text-gray-900 dark:text-gray-100">{{ branch.operating_hours }}</dd>
      </div>
      <div v-if="branch.phone">
        <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.delivery.point.phone") }}</dt>
        <dd class="text-xs text-gray-900 dark:text-gray-100">{{ branch.phone }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  defineProps({ branch: { type: Object, required: true } });

  const { t } = useI18n();

  const openClass =
    "px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
  const closedClass =
    "px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
</script>
