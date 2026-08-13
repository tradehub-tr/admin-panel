<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.integrationLog.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.integrationLog.subtitle") }}
        </p>
      </div>
      <label class="ms-auto flex items-center gap-2 text-sm">
        <input v-model="onlyFailed" type="checkbox" />
        {{ t("logistics.integrationLog.onlyFailed") }}
      </label>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 5" :key="i" variant="rect" height="88px" />
    </div>

    <p v-else-if="!visibleRows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ onlyFailed ? t("logistics.integrationLog.noFailures") : t("logistics.integrationLog.empty") }}
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="row in visibleRows"
        :key="row.name"
        class="rounded-lg border p-3"
        :class="row.succeeded ? 'border-slate-200 dark:border-slate-700' : 'border-red-300 dark:border-red-800'"
      >
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge
            :status="row.operation"
            :tone="row.succeeded ? 'success' : 'danger'"
            :label="t(`logistics.operation.${row.operation}`)"
            :show-dot="false"
          />
          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-700">
            {{ t(`logistics.direction.${row.direction}`) }}
          </span>
          <span class="text-xs text-slate-500">{{ row.carrier }}</span>
          <button
            v-if="row.shipment"
            type="button"
            class="font-mono text-xs underline-offset-2 hover:underline"
            @click="$emit('open-shipment', row.shipment)"
          >
            {{ row.shipment }}
          </button>

          <span class="ms-auto flex items-center gap-3 text-xs tabular-nums text-slate-500">
            <span v-if="row.attempt > 1">{{ t("logistics.integrationLog.attempt", { n: row.attempt }) }}</span>
            <span v-if="row.http_status">HTTP {{ row.http_status }}</span>
            <span>{{ row.duration_ms }} ms</span>
            <span>{{ row.created_at }}</span>
          </span>
        </div>

        <p v-if="row.error_message" class="mt-1 text-sm text-red-700 dark:text-red-400">
          <code class="text-xs">{{ row.error_code }}</code> — {{ row.error_message }}
        </p>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" class="th-btn-outline text-xs" @click="toggle(row.name)">
            {{ expanded.has(row.name) ? t("logistics.integrationLog.hideBody") : t("logistics.integrationLog.showBody") }}
          </button>
          <!-- Yeniden çalıştırma YALNIZ retriable kayıtlarda. Kalıcı bir
               doğrulama hatasını tekrar denemek taşıyıcıya gereksiz yük ve
               operatöre yanlış umut. -->
          <button
            v-if="can.write && !row.succeeded && row.is_retriable"
            type="button"
            class="th-btn-dark text-xs"
            @click="$emit('retry-job', row)"
          >
            {{ t("logistics.integrationLog.retryJob") }}
          </button>
          <span v-else-if="!row.succeeded && !row.is_retriable" class="text-xs text-slate-500">
            {{ t("logistics.integrationLog.notRetriable") }}
          </span>
        </div>

        <div v-if="expanded.has(row.name)" class="mt-2 space-y-2">
          <!-- Gövdeler backend'de MASKELENMİŞ geliyor (sözleşme:
               integration_log.masked_fields). İstemcide maskelemek yetersizdi:
               ham gövde yanıtta dolaşırsa tarayıcı geçmişinde kalır. -->
          <p class="text-xs text-slate-500">{{ t("logistics.integrationLog.maskNote") }}</p>
          <div v-for="body in bodies(row)" :key="body.key">
            <p class="text-xs font-medium text-slate-500">{{ body.label }}</p>
            <pre class="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs dark:bg-slate-800"><code>{{ body.value }}</code></pre>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **F3 · Entegrasyon logu / başarısız işler** (TUR-110).
   *
   * İstek ve yanıt gövdeleri backend'de maskelenmiş geliyor; ekran maskeleme
   * YAPMIYOR, yapamaz da — istemcide maskelemek ham gövdenin yanıtta,
   * tarayıcı geçmişinde ve ara sunucu loglarında dolaşmasını engellemez.
   * Sözleşmedeki `masked_fields` bu sınırı yazıya döküyor.
   *
   * `<pre>` içeriği `{{ }}` ile basılıyor — Vue escape ediyor. `v-html`
   * kullanmak taşıyıcı yanıtını çalıştırılabilir hâle getirirdi.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["retry", "retry-job", "open-shipment"]);

  const { t } = useI18n();

  const onlyFailed = ref(false);
  const expanded = ref(new Set());

  const visibleRows = computed(() =>
    onlyFailed.value ? props.rows.filter((row) => !row.succeeded) : props.rows
  );

  function toggle(name) {
    // Set mutasyonu reaktif değil — yeni referans atanıyor.
    const next = new Set(expanded.value);
    next.has(name) ? next.delete(name) : next.add(name);
    expanded.value = next;
  }

  function bodies(row) {
    return [
      { key: "request", label: t("logistics.integrationLog.request"), value: row.request_body || "—" },
      { key: "response", label: t("logistics.integrationLog.response"), value: row.response_body || "—" },
    ];
  }
</script>
