<template>
  <!-- Konum HİÇ taşınmıyorsa çizelge çizilmiyor: tek satırlık boş liste
       operasyona "hiç hareket yok" der ve bu yalan olur. -->
  <div v-if="locationUnavailable" class="flex items-start gap-2 text-[13px]">
    <AppIcon name="info" :size="14" class="mt-0.5 shrink-0 text-gray-600 dark:text-gray-400" />
    <div>
      <p class="text-gray-700 dark:text-gray-300">{{ t("logistics.station.noLocation") }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.station.noLocationHint") }}</p>
    </div>
  </div>

  <EmptyState v-else-if="!stations.length" :entity="t('logistics.station.title')" />

  <ol v-else class="space-y-2">
    <li
      v-for="(st, i) in stations"
      :key="`${st.location}-${st.first_event_at}`"
      class="card !p-3"
      :class="st.is_stuck ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10' : ''"
    >
      <div class="flex items-start gap-3">
        <div class="flex flex-col items-center pt-0.5">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="st.is_current ? 'bg-brand-500' : 'bg-gray-300 dark:bg-white/20'"
          />
          <span v-if="i < stations.length - 1" class="w-px flex-1 min-h-6 bg-gray-200 dark:bg-white/10" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <p class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              {{ st.location || "—" }}
            </p>
            <!-- Son istasyonda süre "ŞU AN"a göre: hâlâ orada duran gönderi
                 ancak böyle görünür. -->
            <span
              class="text-xs"
              :class="st.is_stuck ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400'"
            >
              {{
                st.is_current
                  ? t("logistics.station.stuck", { hours: st.dwell_hours })
                  : t("logistics.station.dwell", { hours: st.dwell_hours })
              }}
            </span>
          </div>

          <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {{ t("logistics.station.arrived") }}: {{ st.first_event_at }}
            <template v-if="st.departed_at"> · {{ t("logistics.station.departed") }}: {{ st.departed_at }}</template>
            · {{ t("logistics.station.eventCount", { count: st.event_count }) }}
          </p>

          <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <!-- Kaynak rozeti her istasyonda: taşıyıcı API'sinden gelen konum
                 ile operatörün elle girdiği aynı güvenilirlikte değil. -->
            <span
              v-for="src in st.sources"
              :key="src"
              class="px-1.5 py-0.5 rounded text-[11px] bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
            >
              {{ sourceLabel(src) }}
            </span>
            <button
              v-if="st.location_branch"
              type="button"
              class="text-[11px] text-brand-800 dark:text-brand-400 hover:underline"
              @click="$emit('open-branch', st.location_branch)"
            >
              {{ t("logistics.delivery.point.title") }}
            </button>
          </div>
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import EmptyState from "@/components/logistics/EmptyState.vue";

  defineProps({
    /** `utils/stationTimeline.toStations()` çıktısı — indirgeme burada YAPILMAZ. */
    stations: { type: Array, default: () => [] },
    /** Olay var ama `location` alanı taşınmıyor (11-BE bekleniyor). */
    locationUnavailable: { type: Boolean, default: false },
  });
  defineEmits(["open-branch"]);

  const { t } = useI18n();

  /** Olay kaynağı sözlüğü `logistics.timeline` altında zaten var; yoksa ham değer. */
  const sourceLabel = (src) => src;
</script>
