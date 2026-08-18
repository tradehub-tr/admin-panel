<template>
  <div>
    <!-- Page Header — panel deseni (DocTypeListView ile aynı) -->
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.settings.title") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ subtitle }}</p>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="5" />
    </div>

    <template v-else>
      <!-- Ana anahtar ayrı ve vurgulu: kapalıyken diğer 12 bayrak etkisiz.
           Yetki yoksa GİZLENMEZ, devre dışı bırakılır — gizlemek "böyle bir
           ayar yok" izlenimi verirdi. -->
      <section
        class="card mb-5 border-2"
        :class="
          masterEnabled
            ? 'border-emerald-200 dark:border-emerald-800'
            : 'border-amber-200 dark:border-amber-800'
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

      <section class="card mb-5">
        <h3
          class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5"
        >
          <AppIcon name="flag" :size="14" class="text-brand-700" />
          {{ t("logistics.settings.featureFlags") }}
        </h3>

        <div
          v-if="!masterEnabled"
          class="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded p-3 mb-5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
        >
          <AppIcon
            name="triangle-alert"
            :size="14"
            class="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
          />
          <span>{{ t("logistics.settings.masterOffWarning") }}</span>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-white/5">
          <div
            v-for="(enabled, flag) in featureFlags"
            :key="flag"
            class="flex items-center gap-4 py-3"
          >
            <div class="min-w-0 grow">
              <!-- Ham bayrak adı (`carrier_api_enabled`) yalnız `title`'da:
                   ekranda okunur ad, destek/hata kaydında sözleşme adı. -->
              <p class="text-[13px] font-medium text-gray-900 dark:text-gray-100" :title="flag">
                {{ flagLabel(flag) }}
              </p>
              <p v-if="flagHint(flag)" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {{ flagHint(flag) }}
              </p>
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

      <section class="card">
        <h3
          class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5"
        >
          <AppIcon name="settings-2" :size="14" class="text-brand-700" />
          {{ t("logistics.settings.defaults") }}
        </h3>

        <dl class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="key in DEFAULT_KEYS"
            :key="key"
            class="rounded-lg border border-gray-200 dark:border-white/10 p-3"
          >
            <dt class="form-label !mb-1" :title="key">{{ settingLabel(key) }}</dt>
            <dd class="text-[13px] font-medium text-gray-900 dark:text-gray-100">
              {{ settings[key] ?? "—" }}
            </dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
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

  /** Başlık alt satırı — anahtar tr ve en sözlüklerinde tanımlı. */
  const subtitle = computed(() => t("logistics.settings.subtitle"));

  /** Ayar anahtarının okunur adı; çeviri yoksa ham anahtar (sessiz kaybolmasın). */
  function settingLabel(key) {
    const i18nKey = `logistics.settingKey.${key}`;
    return te(i18nKey) ? t(i18nKey) : key;
  }

  /** Bayrağın okunur adı; çeviri yoksa ham ad. */
  function flagLabel(flag) {
    const key = `logistics.flagName.${flag}`;
    return te(key) ? t(key) : flag;
  }

  /** Açıklama isteğe bağlı — yoksa sessizce boş döner, satır kısalır. */
  function flagHint(flag) {
    const key = `logistics.flagHint.${flag}`;
    return te(key) ? t(key) : "";
  }
</script>
