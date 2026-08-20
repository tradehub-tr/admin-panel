<template>
  <div>
    <ol v-if="events.length" class="relative space-y-0">
      <li v-for="(event, index) in orderedEvents" :key="eventKey(event, index)" class="flex gap-3">
        <!-- Dikey çizgi + nokta -->
        <div class="flex flex-col items-center">
          <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="dotClass(event)" />
          <span
            v-if="index < orderedEvents.length - 1"
            class="w-px grow bg-gray-200 dark:bg-gray-700"
            aria-hidden="true"
          />
        </div>

        <div class="min-w-0 grow pb-5">
          <div class="flex flex-wrap items-center gap-2">
            <StatusBadge :status="event.status" :show-dot="false" />
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatTime(event.event_time) }}
            </span>
            <span
              class="rounded px-1.5 py-0.5 text-[11px] font-medium"
              :class="sourceClass(event)"
              :title="t('logistics.timeline.sourceHint')"
            >
              {{ sourceLabel(event) }}
            </span>
          </div>

          <p v-if="event.description" class="mt-1 text-sm text-gray-700 dark:text-gray-200">
            {{ event.description }}
          </p>

          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="event.location">{{ event.location }}</span>

            <!-- Ham taşıyıcı kodu: TUR-112 "kaynak olay standart duruma
                 İZLENEBİLİR biçimde çevrilir" — operasyon eşlemeyi
                 doğrulayabilmeli. -->
            <span v-if="event.carrier_status_code" class="font-mono">
              {{ event.carrier_status_code }}<template v-if="event.carrier_status_text">
                · {{ event.carrier_status_text }}</template>
            </span>

            <span v-if="event.actor">{{ t("logistics.timeline.by", { user: event.actor }) }}</span>
          </div>

          <!-- Manuel değişiklikte gerekçe zorunlu (TUR-107 audit kriteri) -->
          <p
            v-if="event.reason"
            class="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          >
            {{ t("logistics.timeline.reason") }}: {{ event.reason }}
          </p>
        </div>
      </li>
    </ol>

    <p v-else class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
      {{ emptyText || t("logistics.timeline.empty") }}
    </p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import StatusBadge from "./StatusBadge.vue";
  import { EVENT_SOURCE_META, TONE_CLASSES } from "./constants";

  /**
   * Sevkiyat olay akışı (TUR-112, TUR-115).
   *
   * Her olayın KAYNAĞINI gösterir (manuel / api / webhook / polling) — çünkü
   * manuel bir müdahale ile taşıyıcıdan gelen olay operasyon açısından farklı
   * ağırlıkta. Ham taşıyıcı kodu da görünür: durum eşlemesinin doğruluğu
   * ancak böyle denetlenebilir.
   */
  const props = defineProps({
    events: { type: Array, default: () => [] },
    /** En yeni olay üstte mi? Operasyon genelde tersini ister. */
    newestFirst: { type: Boolean, default: true },
    emptyText: { type: String, default: "" },
  });

  const { t, te } = useI18n();

  const orderedEvents = computed(() => {
    const copy = [...props.events];
    copy.sort((a, b) => String(a.event_time).localeCompare(String(b.event_time)));
    return props.newestFirst ? copy.reverse() : copy;
  });

  /** dedupe_key varsa onu kullan — aynı olayın iki kez render'ını da yakalar. */
  function eventKey(event, index) {
    return event.dedupe_key || `${event.event_time}-${event.status}-${index}`;
  }

  /**
   * Object.hasOwn şart: `source: "constructor"` gibi bir değer düz köşeli
   * erişimde prototype zincirinden truthy döner → TONE_CLASSES[undefined]
   * TypeError'ı tüm sekmeyi çökertir. Ton erişimi de aynı nedenle
   * `?? neutral` ile güvenli fallback'e bağlı.
   */
  function sourceMeta(event) {
    return Object.hasOwn(EVENT_SOURCE_META, event.source)
      ? EVENT_SOURCE_META[event.source]
      : null;
  }

  function dotClass(event) {
    return (TONE_CLASSES[sourceMeta(event)?.tone] ?? TONE_CLASSES.neutral).dot;
  }

  function sourceClass(event) {
    return (TONE_CLASSES[sourceMeta(event)?.tone] ?? TONE_CLASSES.neutral).badge;
  }

  function sourceLabel(event) {
    const meta = sourceMeta(event);
    if (meta && te(meta.labelKey)) return t(meta.labelKey);
    return event.source || "—";
  }

  /**
   * Tarih biçimi tarayıcı yereline bırakılıyor; sabit bir biçim yazmak
   * Arapça/Rusça arayüzde yanlış görünürdü.
   */
  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>
