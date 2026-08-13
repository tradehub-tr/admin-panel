<template>
  <div class="space-y-6">
    <h1 class="text-lg font-semibold">{{ t("logistics.settings.title") }}</h1>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="64px" />
    </div>

    <template v-else>
      <!-- Ana anahtar ayrı ve vurgulu: kapalıyken diğer 12 bayrak etkisiz -->
      <section
        class="rounded-lg border p-4"
        :class="
          masterEnabled
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
            : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
        "
      >
        <BaseSwitch
          :model-value="settings.logistics_enabled"
          :on-value="1"
          :off-value="0"
          :label="t('logistics.settings.masterFlag')"
          :description="t('logistics.settings.masterFlagHint')"
          :disabled="!can.write"
          @update:model-value="$emit('update-setting', { key: 'logistics_enabled', value: $event })"
        />
      </section>

      <section class="space-y-1">
        <h2 class="text-sm font-semibold">{{ t("logistics.settings.featureFlags") }}</h2>
        <p v-if="!masterEnabled" class="mb-3 text-xs text-amber-700 dark:text-amber-400">
          {{ t("logistics.settings.masterOffWarning") }}
        </p>

        <div class="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          <div v-for="(enabled, flag) in featureFlags" :key="flag" class="flex items-center gap-4 p-3">
            <div class="min-w-0 grow">
              <code class="text-xs font-medium">{{ flag }}</code>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ flagHint(flag) }}</p>
            </div>
            <BaseSwitch
              :model-value="enabled ? 1 : 0"
              :on-value="1"
              :off-value="0"
              :disabled="!can.write || !masterEnabled"
              @update:model-value="$emit('toggle-flag', { flag, enabled: Boolean($event) })"
            />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold">{{ t("logistics.settings.defaults") }}</h2>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div v-for="key in DEFAULT_KEYS" :key="key" class="rounded border border-slate-200 p-3 dark:border-slate-700">
            <dt class="text-xs text-slate-500">{{ key }}</dt>
            <dd class="text-sm font-medium">{{ settings[key] ?? "—" }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";

  /**
   * **M3 · Lojistik ayarları.**
   *
   * Ana anahtar (`logistics_enabled`) bilinçli olarak AYRI ve vurgulu:
   * kapalıyken diğer 12 bayrağın değeri okunmuyor (backend `is_enabled`
   * mantığı). Alt bayraklar o durumda devre dışı bırakılıyor — açık
   * görünüp etkisiz kalmaları yanıltıcı olurdu.
   */
  const props = defineProps({
    settings: { type: Object, default: () => ({}) },
    featureFlags: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["update-setting", "toggle-flag", "retry"]);

  const { t, te } = useI18n();

  const DEFAULT_KEYS = [
    "default_currency",
    "shipment_naming_series",
    "default_logistics_provider",
    "default_package_type",
    "default_vehicle_type",
    "tracking_poll_interval_minutes",
    "sla_breach_notify_hours",
    "max_delivery_attempts",
    "return_window_days",
  ];

  const masterEnabled = computed(() => Boolean(props.settings.logistics_enabled));

  function flagHint(flag) {
    const key = `logistics.flagHint.${flag}`;
    return te(key) ? t(key) : "";
  }
</script>
