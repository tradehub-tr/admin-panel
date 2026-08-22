<template>
  <span
    v-if="value == null"
    class="cursor-help border-b border-dotted border-gray-400 text-gray-600 dark:border-gray-500 dark:text-gray-400"
    :title="hint"
    >—</span
  >
  <span v-else class="tabular-nums" :class="toneClass">{{ display }}</span>
</template>

<script setup>
  import { computed } from "vue";

  /**
   * Maskelenmiş para alanı.
   *
   * NEDEN AYRI BİLEŞEN: maskeleme dört ekranda birden geçiyor (K1 tablosu,
   * K2 satırları, K3/K8 teklifleri) ve her birinde iki şey doğru olmalı —
   * "—" işareti OKUNABİLİR olacak (silik bir tire "veri yok" sanılır) ve
   * ÜZERİNE GELİNCE nedenini söyleyecek. Dört yerde tekrarlanan bir kural,
   * birinde unutulur.
   *
   * Sözleşme §7.2: yetkisi olmayan kullanıcıya alan HİÇ GÖNDERİLMİYOR —
   * `null` değil, alan yok. Bu bileşen `undefined`ı da `null`ı da aynı
   * şekilde ele alıyor çünkü ikisi de "göremiyorsun" demek.
   */
  const props = defineProps({
    value: { type: Number, default: null },
    hint: { type: String, default: "" },
    /** Pozitif değerleri yeşil, negatifleri kırmızı göster (marj sütunu). */
    positive: { type: Boolean, default: false },
  });

  const display = computed(() => {
    const tutar = Number(props.value).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
    return props.positive && props.value > 0 ? `+${tutar}` : tutar;
  });

  const toneClass = computed(() => {
    if (!props.positive) return "";
    return props.value < 0
      ? "font-semibold text-red-700 dark:text-red-400"
      : "font-semibold text-emerald-700 dark:text-emerald-400";
  });
</script>
