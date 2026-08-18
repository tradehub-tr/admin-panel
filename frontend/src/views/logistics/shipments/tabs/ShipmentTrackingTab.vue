<template>
  <EventTimeline :events="events" />
</template>

<script setup>
  import EventTimeline from "@/components/logistics/EventTimeline.vue";

  /**
   * **B6 · Takip sekmesi** (11-FE) — sevkiyatın olay akışı.
   *
   * Neden `EventTimeline`'ı doğrudan kaydetmiyoruz: `EventTimeline` yeniden
   * kullanılabilir bir sunum bileşeni (`components/logistics/`) ve başka
   * ekranlarda da yaşayacak. Sekme sözleşmesi ise bileşenin SAHİBİNİN
   * dizininde olmasını istiyor. Bu ince sarmalayıcı ikisini uzlaştırıyor:
   * sekme sınırı `shipments/tabs`'te kalıyor, timeline ortak kalıyor.
   *
   * 11-FE bu sekmeyi genişletecek (filtre, kaynak rozetleri, canlı yenileme);
   * sarmalayıcı o işin doğal yeri.
   */
  defineProps({
    events: { type: Array, default: () => [] },
  });
</script>
