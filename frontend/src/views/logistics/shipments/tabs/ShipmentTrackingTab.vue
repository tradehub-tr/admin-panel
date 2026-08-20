<template>
  <div class="space-y-4">
    <!-- Aşama çubuğu + tahmini teslim: kullanıcının ilk aradığı iki bilgi
         (Baymard) listeden ÖNCE gelir. -->
    <div class="space-y-2">
      <ShipmentProgressBar :status="shipment.status" />
      <p
        v-if="shipment.estimated_delivery"
        class="text-center text-xs text-gray-600 dark:text-gray-400"
      >
        {{ t("logistics.timeline.eta", { date: formatDate(shipment.estimated_delivery) }) }}
      </p>
    </div>

    <!-- Takip numarası: taşıyıcı sayfası linki varsa tıklanır (Baymard'ın en
         çok çiğnenen kuralı), yoksa kopyalanabilir düz metin. href'e SÜZGEÇSİZ
         değer basılmaz — sunucudan gelse bile (api-security.md §3). -->
    <p v-if="shipment.tracking_number" class="text-xs text-gray-600 dark:text-gray-400">
      {{ t("logistics.timeline.trackingNo") }}:
      <a
        v-if="safeTrackingUrl"
        :href="safeTrackingUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="font-mono text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
      >
        {{ shipment.tracking_number }} ↗
      </a>
      <code v-else class="font-mono">{{ shipment.tracking_number }}</code>
    </p>

    <ErrorState v-if="error" :error="error" @retry="load" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="52px" />
    </div>

    <template v-else>
      <!-- Sessizlik şeridi: Cainiao'nun dört "sınır problemi" bizde alarma
           dönüşür — son olayın üstünden eşik kadar süre geçtiyse operasyon
           bunu listede kaybolmadan görmeli. Eşikler A2 ile aynı dil
           (24 sa uyarı / 72 sa kritik). Terminal durumda şerit YOK: teslim
           edilmiş sevkiyatın "sessizliği" sorun değil. -->
      <p
        v-if="silenceHours !== null"
        class="rounded-lg border px-3 py-2 text-xs font-medium"
        :class="
          silenceHours >= 72
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
        "
        role="status"
      >
        {{ t("logistics.timeline.silence", { hours: silenceHours }) }}
      </p>

      <!-- Filtreler: uzun geçmişte gürültü ayıklama (11-FE kapsam maddesi).
           Kaynak filtresi panelin hap dilinde; "yalnız durum değişimleri"
           anahtarı ardışık aynı-durum olaylarını (taşıyıcı ara taramaları)
           gizler. -->
      <div class="flex flex-wrap items-center gap-3">
        <StatusFilterPills
          v-if="sourceOptions.length"
          :model-value="sourceFilter"
          :options="sourceOptions"
          @change="sourceFilter = $event"
        />
        <label class="ms-auto flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <input v-model="statusChangesOnly" type="checkbox" class="rounded border-gray-300" />
          {{ t("logistics.timeline.statusOnly") }}
        </label>
      </div>

      <EventTimeline
        :events="filteredEvents"
        :empty-text="events.length ? t('logistics.timeline.filterEmpty') : ''"
      />
    </template>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import EventTimeline from "@/components/logistics/EventTimeline.vue";
  import { listShipmentEvents } from "@/api/shipmentEvents";
  import { safeExternalUrl } from "@/utils/sanitize";

  import ShipmentProgressBar from "./components/ShipmentProgressBar.vue";

  /**
   * **B6 · Takip sekmesi** (11-FE) — sevkiyatın olay akışı.
   *
   * 11-FE genişletmesi (2026-08-20): aşama çubuğu + tahmini teslim +
   * tıklanabilir takip no + kaynak/durum filtreleri + sessizlik şeridi.
   * Platform araştırması: Amazon aşama çubuğu, Baymard 6 kural, Cainiao
   * sınır-sessizliği (rapor: 11-FE araştırma, 2026-08-20).
   *
   * Sekme verisini KENDİSİ yükler (C1/A2/A3 container deseni): olaylar ayrı
   * DocType olduğundan detay yanıtında gelmiyor; ayrı uç sözleşmesi
   * `api/shipmentEvents.js`'te (mock — 11-BE'de canlıya bağlanır, Bora).
   * `EventTimeline` ortak sunum bileşeni olarak kalır; filtre/çubuk gibi
   * sekme kararları bu sarmalayıcıda yaşar (sekme sınırı sözleşmesi).
   */
  const props = defineProps({
    shipment: { type: Object, default: () => ({}) },
  });

  const { t } = useI18n();

  const events = ref([]);
  const trackingUrl = ref(null);
  const loading = ref(false);
  const error = ref(null);
  // Computed içinde Date.now() yasak (reaktif değil — workflow.md §3);
  // "şimdi" her yüklemede bir kez damgalanır, sessizlik ona göre hesaplanır.
  const loadedAt = ref(0);

  const sourceFilter = ref("");
  const statusChangesOnly = ref(false);

  const TERMINAL = new Set(["Delivered", "Returned", "Cancelled"]);
  const SILENCE_WARN_HOURS = 24;

  async function load() {
    // Shipment henüz yüklenmediyse fetch atma — canlıda gereksiz hata gösterirdi.
    if (!props.shipment?.name) return;
    loading.value = true;
    error.value = null;
    try {
      const data = await listShipmentEvents(props.shipment.name);
      events.value = data?.items ?? [];
      trackingUrl.value = data?.tracking_url ?? null;
      loadedAt.value = Date.now();
    } catch (e) {
      error.value = { code: e?.code ?? "INTERNAL_ERROR", message: e?.message };
      events.value = [];
    } finally {
      loading.value = false;
    }
  }

  const safeTrackingUrl = computed(() => safeExternalUrl(trackingUrl.value));

  const sourceOptions = computed(() => {
    const present = [...new Set(events.value.map((e) => e.source).filter(Boolean))];
    if (present.length < 2) return []; // tek kaynaklı akışta filtre gürültü
    return [
      { value: "", label: t("logistics.timeline.allSources"), count: events.value.length },
      ...present.map((source) => ({
        value: source,
        label: t(`logistics.eventSource.${source}`),
        count: events.value.filter((e) => e.source === source).length,
      })),
    ];
  });

  const filteredEvents = computed(() => {
    let rows = events.value;
    if (sourceFilter.value) rows = rows.filter((e) => e.source === sourceFilter.value);
    if (statusChangesOnly.value) {
      const sorted = [...rows].sort((a, b) =>
        String(a.event_time).localeCompare(String(b.event_time))
      );
      let last = null;
      rows = sorted.filter((e) => {
        const changed = e.status !== last;
        last = e.status;
        return changed;
      });
    }
    return rows;
  });

  /** Son olaydan bu yana geçen saat — eşik altında veya terminalde null. */
  const silenceHours = computed(() => {
    if (!events.value.length || TERMINAL.has(props.shipment.status)) return null;
    const newest = events.value.reduce((max, e) =>
      String(e.event_time) > String(max.event_time) ? e : max
    );
    const parsed = new Date(String(newest.event_time).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return null;
    const hours = Math.floor((loadedAt.value - parsed.getTime()) / 3_600_000);
    return hours >= SILENCE_WARN_HOURS ? hours : null;
  });

  function formatDate(value) {
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "long" });
  }

  onMounted(load);
</script>
