<template>
  <div
    class="rounded-lg border p-4"
    :class="
      failed.length
        ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
        : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
    "
    role="status"
  >
    <p class="text-sm font-medium">
      {{ t("logistics.bulk.result", { ok: succeeded, fail: failed.length }) }}
    </p>

    <!-- TUR-117 kabul kriteri: "Toplu işlemler KISMİ HATA ÖZETİ verir."
         Sessizce "tamamlandı" demek yanıltıcı olur. -->
    <details v-if="failed.length" class="mt-2">
      <summary class="cursor-pointer text-xs font-medium">
        {{ t("logistics.bulk.showFailed", { count: failed.length }) }}
      </summary>
      <ul class="mt-2 space-y-1 text-xs">
        <li v-for="item in failed" :key="item.name" class="flex gap-2">
          <code class="shrink-0 font-mono">{{ item.name }}</code>
          <span class="text-slate-600 dark:text-slate-300">{{ item.message }}</span>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  /** Toplu işlem sonucu — başarılı sayısı + başarısızların GEREKÇESİ. */
  defineProps({
    succeeded: { type: Number, default: 0 },
    /** [{ name, message }] */
    failed: { type: Array, default: () => [] },
  });

  const { t } = useI18n();
</script>
