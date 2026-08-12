<template>
  <div>
    <ul v-if="documents.length" class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="doc in documents" :key="doc.url" class="flex items-center gap-3 py-3">
        <div class="min-w-0 grow">
          <p class="truncate text-sm font-medium">{{ doc.label }}</p>
          <p class="text-xs text-slate-500">{{ doc.type }} · {{ doc.uploaded_at }}</p>
        </div>
        <a :href="doc.url" class="th-btn-outline text-xs" target="_blank" rel="noopener">
          {{ t("logistics.document.open") }}
        </a>
      </li>
    </ul>
    <p v-else class="py-6 text-center text-sm text-slate-500">{{ t("logistics.document.empty") }}</p>

    <button v-if="can.write" type="button" class="th-btn-outline mt-4 text-xs" @click="$emit('upload')">
      {{ t("logistics.document.upload") }}
    </button>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  /** **B5 · Belgeler sekmesi** (TUR-107) — fiş, irsaliye, ek belgeler. */
  defineProps({
    documents: { type: Array, default: () => [] },
    can: { type: Object, default: () => ({ write: false }) },
  });
  defineEmits(["upload"]);
  const { t } = useI18n();
</script>
