<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
    :class="toneClass"
  >
    <span v-if="showDot" class="h-1.5 w-1.5 rounded-full" :class="dotClass" aria-hidden="true" />
    <slot>{{ label }}</slot>
    <span v-if="isTerminal" class="sr-only">{{ t("logistics.status.terminalHint") }}</span>
  </span>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import {
    LEG_STATUS_TONE,
    SEVERITY_TONE,
    SHIPMENT_STATUS_TONE,
    TERMINAL_STATUSES,
    TONE_CLASSES,
    toneFor,
  } from "./constants";

  /**
   * Durum rozeti — sevkiyat, bacak ve istisna durumları için tek bileşen.
   *
   * Renk seçimi `constants.js`'teki ton haritalarından gelir; ekranlar kendi
   * renk kararını VERMEZ. Böylece liste, detay ve zaman çizelgesi aynı durumu
   * aynı renkle gösterir.
   */
  const props = defineProps({
    /** Ham durum değeri (sözleşmedeki enum değeri). */
    status: { type: String, required: true },
    /** Hangi ton haritası kullanılsın. */
    kind: {
      type: String,
      default: "shipment",
      validator: (v) => ["shipment", "leg", "severity"].includes(v),
    },
    /** Gösterilecek metin; verilmezse çeviriden aranır, o da yoksa ham değer. */
    label: { type: String, default: "" },
    /**
     * Ton haritasını atlayıp doğrudan ton seç. Sözleşmede enum OLMAYAN
     * ikili durumlar için (ör. katalog aktiflik bayrağı) — sırf rozet
     * rengi uğruna `constants.js`'e sahte durum eklemekten iyi.
     */
    tone: { type: String, default: "" },
    showDot: { type: Boolean, default: true },
  });

  const { t, te } = useI18n();

  const TONE_MAPS = {
    shipment: SHIPMENT_STATUS_TONE,
    leg: LEG_STATUS_TONE,
    severity: SEVERITY_TONE,
  };

  const tone = computed(() =>
    props.tone && TONE_CLASSES[props.tone]
      ? props.tone
      : toneFor(TONE_MAPS[props.kind], props.status)
  );
  const toneClass = computed(() => TONE_CLASSES[tone.value].badge);
  const dotClass = computed(() => TONE_CLASSES[tone.value].dot);

  /** Terminal durum ekran okuyucuya bildirilir — renk tek başına bilgi taşımamalı. */
  const isTerminal = computed(
    () => props.kind === "shipment" && TERMINAL_STATUSES.includes(props.status)
  );

  /**
   * Her ton haritasının kendi çeviri ad alanı var. Hepsini
   * `logistics.status` altında toplamak "Cancelled"ı hem sevkiyat hem bacak
   * için tek çeviriye mahkûm ederdi — bunlar farklı sözlüklerden geliyor.
   */
  const LABEL_NAMESPACE = { shipment: "status", leg: "legStatus", severity: "severity" };

  const label = computed(() => {
    if (props.label) return props.label;
    const key = `logistics.${LABEL_NAMESPACE[props.kind]}.${props.status}`;
    return te(key) ? t(key) : props.status;
  });
</script>
