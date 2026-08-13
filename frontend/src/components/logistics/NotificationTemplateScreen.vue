<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.notifyTemplate.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.notifyTemplate.subtitle") }}
        </p>
      </div>
      <button v-if="can.write" type="button" class="ms-auto th-btn-primary text-sm" @click="$emit('create')">
        {{ t("logistics.notifyTemplate.new") }}
      </button>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <p v-else-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.notifyTemplate.empty") }}
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.name"
        class="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
        :class="row.is_active ? '' : 'opacity-70'"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium">{{ eventLabel(row.event) }}</span>
          <StatusBadge
            :status="row.channel"
            tone="info"
            :label="t(`logistics.channel.${row.channel}`)"
            :show-dot="false"
          />
          <span class="text-xs text-slate-500">→ {{ t(`logistics.recipient.${row.recipient_role}`) }}</span>

          <!-- Zorunlu şablon: tercih ekranında kapatılamayacağı BURADA da
               görünmeli, yoksa yönetici "kullanıcı kapatabilir" sanır. -->
          <span
            v-if="row.is_mandatory"
            class="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            :title="t('logistics.notifyTemplate.mandatoryHint')"
          >
            {{ t("logistics.notifyTemplate.mandatory") }}
          </span>

          <StatusBadge
            class="ms-auto"
            :status="row.is_active ? 'active' : 'passive'"
            :tone="row.is_active ? 'success' : 'neutral'"
            :label="row.is_active ? t('logistics.catalog.active') : t('logistics.catalog.passive')"
            :show-dot="false"
          />
        </div>

        <p v-if="row.subject" class="mt-2 text-sm">{{ row.subject }}</p>

        <!-- Şablon gövdesi HTML. `v-html` KULLANILMIYOR: gövde kullanıcı
             girdisi ve panelde çalıştırılabilir hâle getirmek XSS olurdu.
             Önizleme metin olarak gösteriliyor, gerçek render e-posta
             gönderiminde backend'de yapılıyor. -->
        <pre class="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs dark:bg-slate-800"><code>{{ row.body }}</code></pre>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-500">{{ t("logistics.notifyTemplate.variables") }}</span>
          <code v-for="variable in usedVariables(row.body)" :key="variable" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-700">
            {{ variable }}
          </code>
        </div>

        <div v-if="can.write" class="mt-3 flex gap-2">
          <button type="button" class="th-btn-outline text-xs" @click="$emit('edit', row)">
            {{ t("logistics.legOps.edit") }}
          </button>
          <button type="button" class="th-btn-outline text-xs" @click="$emit('preview', row)">
            {{ t("logistics.notifyTemplate.preview") }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **J1 · Bildirim şablonu yönetimi** (TUR-113).
   *
   * Şablon gövdesi HTML ama `v-html` ile basılmıyor: gövde kullanıcı girdisi
   * ve panelde çalıştırılabilir kılmak XSS açardı. Önizleme ayrı bir eylem
   * ve gerçek render backend'de.
   */
  defineProps({
    rows: { type: Array, default: () => [] },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["create", "edit", "preview", "retry"]);

  const { t, te } = useI18n();

  function eventLabel(event) {
    const key = `logistics.notifyEvent.${event}`;
    return te(key) ? t(key) : event;
  }

  /** Gövdedeki `{{ değişken }}` yer tutucularını çıkarır. */
  function usedVariables(body) {
    if (!body) return [];
    return [...new Set([...String(body).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))];
  }
</script>
