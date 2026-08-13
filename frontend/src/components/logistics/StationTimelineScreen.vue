<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.station.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.station.subtitle", { shipment: shipmentName }) }}
      </p>
    </header>

    <p v-if="!stations.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.station.empty") }}
    </p>

    <template v-else>
      <ol class="space-y-0">
        <li v-for="(station, index) in stations" :key="station.key" class="flex gap-3">
          <div class="flex flex-col items-center">
            <span class="mt-1.5 h-3 w-3 shrink-0 rounded-full" :class="TONE_CLASSES[station.tone].dot" />
            <span v-if="index < stations.length - 1" class="w-px grow bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          </div>

          <div class="min-w-0 grow pb-5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium">{{ station.location }}</span>
              <StatusBadge :status="station.status" :show-dot="false" />
              <span class="text-xs text-slate-500">{{ formatTime(station.arrivedAt) }}</span>

              <!-- TUR-115: konum KAYNAĞI görünür olmalı. Taşıyıcı API'sinden
                   gelen bir konum ile operatörün elle girdiği konum aynı
                   güvenilirlikte değil; ihtilafta bu ayrım belirleyici. -->
              <span
                class="rounded px-1.5 py-0.5 text-[11px] font-medium"
                :class="TONE_CLASSES[sourceTone(station.source)].badge"
                :title="t('logistics.station.sourceHint')"
              >
                {{ sourceLabel(station.source) }}
              </span>
            </div>

            <p v-if="station.description" class="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {{ station.description }}
            </p>

            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span v-if="station.carrierCode" class="font-mono">{{ station.carrierCode }}</span>
              <!-- İstasyonda geçen süre: takılan gönderi ancak böyle görünür -->
              <span v-if="station.dwellLabel" :class="station.dwellExceeded ? 'font-medium text-amber-600 dark:text-amber-400' : ''">
                {{ t("logistics.station.dwell", { duration: station.dwellLabel }) }}
              </span>
            </div>
          </div>
        </li>
      </ol>

      <p class="text-xs text-slate-500">
        {{ t("logistics.station.dwellHint", { hours: DWELL_WARN_HOURS }) }}
      </p>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import StatusBadge from "./StatusBadge.vue";
  import { EVENT_SOURCE_META, SHIPMENT_STATUS_TONE, TONE_CLASSES } from "./constants";

  /**
   * **H1 · İstasyon zaman çizelgesi** (TUR-115).
   *
   * Olay akışından (`EventTimeline`) farkı: bu ekran KONUMA odaklanıyor.
   * Aynı istasyondaki ardışık olaylar tek satırda toplanıyor ve orada
   * geçen süre hesaplanıyor — takılan bir gönderi ancak böyle görünür.
   *
   * Konum kaynağı (manuel/API/webhook/polling) her satırda: ihtilafta
   * "kim söyledi" sorusunun cevabı bu.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    /** `shipment.events` — konumu olan olaylar kullanılır. */
    events: { type: Array, default: () => [] },
    /** "Şu an" — son istasyonda geçen süre için. */
    now: { type: String, default: "" },
  });

  const { t, te } = useI18n();

  /** Bu süreyi aşan bekleme operasyonda "takıldı" sayılıyor. */
  const DWELL_WARN_HOURS = 24;

  function parse(value) {
    if (!value) return null;
    const parsed = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Ardışık aynı-konum olayları tek istasyona indiriyor. Her olayı ayrı
   * satır yapmak "üç kez Ostim" gibi bir liste üretirdi; asıl soru orada
   * NE KADAR kalındığı.
   */
  const stations = computed(() => {
    const withLocation = props.events
      .filter((event) => event.location)
      .sort((a, b) => String(a.event_time).localeCompare(String(b.event_time)));

    const grouped = [];
    for (const event of withLocation) {
      const last = grouped.at(-1);
      if (last && last.location === event.location) {
        last.status = event.status;
        last.description = event.description || last.description;
        last.carrierCode = event.carrier_status_code || last.carrierCode;
        last.leftAt = event.event_time;
        continue;
      }
      grouped.push({
        key: `${event.location}-${event.event_time}`,
        location: event.location,
        status: event.status,
        source: event.source,
        description: event.description,
        carrierCode: event.carrier_status_code,
        arrivedAt: event.event_time,
        leftAt: null,
      });
    }

    return grouped.map((station, index) => {
      // Son istasyonda hâlâ bekleniyor: bitiş yerine "şu an" kullanılıyor.
      const isLast = index === grouped.length - 1;
      const end = parse(station.leftAt) ?? (isLast ? parse(props.now) : parse(grouped[index + 1]?.arrivedAt));
      const start = parse(station.arrivedAt);
      const hours = start && end ? (end - start) / 3_600_000 : null;
      return {
        ...station,
        tone: SHIPMENT_STATUS_TONE[station.status] ?? "neutral",
        dwellLabel: hours == null ? "" : t("logistics.station.hours", { count: hours.toFixed(1) }),
        dwellExceeded: hours != null && hours >= DWELL_WARN_HOURS,
      };
    });
  });

  function sourceTone(source) {
    return EVENT_SOURCE_META[source]?.tone ?? "neutral";
  }

  function sourceLabel(source) {
    const key = EVENT_SOURCE_META[source]?.labelKey;
    return key && te(key) ? t(key) : source || "—";
  }

  function formatTime(value) {
    const parsed = parse(value);
    if (!parsed) return "—";
    return parsed.toLocaleString(undefined, {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }
</script>
