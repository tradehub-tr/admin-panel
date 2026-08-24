<template>
  <span role="status" class="sr-only">{{ text }}</span>
</template>

<script setup>
  /**
   * Ekran okuyucuya durum duyuran, GÖRÜNMEZ ve KALICI canlı bölge.
   *
   * NEDEN BİLEŞEN (SOLID denetimi, 2026-08-25):
   *   Aynı üç satır 16 dosyada, 17 kez elle yazılmıştı. Asıl şişme işaretleme
   *   değil, yanına iliştirilen 4 satırlık GEREKÇE yorumuydu: kabın neden
   *   koşulsuz durması gerektiği 16 kez anlatılıyordu. Gerekçe artık burada,
   *   tek yerde.
   *
   * KAP KOŞULSUZ DOĞAR, İÇERİK DEĞİŞİR (WCAG 4.1.3):
   *   Canlı bölge, içeriğiyle BİRLİKTE DOM'a girerse çoğu ekran okuyucu
   *   duyuruyu okumaz — `aria-live` yalnız var olan bir bölgedeki MUTASYONU
   *   izler. Bu yüzden bileşen `v-if` ile sarılmaz; boş metinle render edilir
   *   ve yalnız `text` değişir:
   *
   *     <LiveStatus :text="loading ? t('a11y.loading') : ''" />
   *
   *   `role="status"` zaten `aria-live="polite"` + `aria-atomic="true"`
   *   demektir; ikisini ayrıca yazmak gereksiz.
   *
   * SKELETON'A ALINMADI (bilinçli):
   *   Skeleton koşullu render ediliyor, canlı bölge ise KALICI olmak zorunda.
   *   İkisini birleştirmek, bu desenin var oluş sebebi olan hatayı (duyuru
   *   okunmuyor) geri getirirdi.
   */
  defineProps({
    /** Duyurulacak metin; boş dize "duyuracak bir şey yok" demektir. */
    text: { type: String, default: "" },
  });
</script>
