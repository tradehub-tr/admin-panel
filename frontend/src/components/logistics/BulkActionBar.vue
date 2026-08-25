<template>
  <!-- KALICI canlı bölge (WCAG 4.1.3): çubuğun kendisi `count > 0` olunca
       DOM'a giriyor, yani kap+içerik birlikte doğuyor ve polite duyuru çoğu
       ekran okuyucuda okunmuyordu — kullanıcı bir satırı işaretlediğinde yeni
       aksiyon bölgesinin belirdiğini ve seçili sayının değiştiğini
       duymuyordu. Bu span çubuk gizliyken de DOM'da, yalnız metni boşalıyor.
       Görünür sayaç `aria-hidden`: aynı cümle iki kez okunmasın. -->
  <span role="status" aria-live="polite" class="sr-only">
    {{ count > 0 ? t("logistics.bulk.selected", { count }) : "" }}
  </span>

  <Transition name="fade">
    <div
      v-if="count > 0"
      class="card mb-4 !py-2.5 !px-4 flex items-center justify-between gap-3 border-brand-300 dark:border-brand-700"
      role="region"
      :aria-label="t('logistics.bulk.region')"
    >
      <span aria-hidden="true" class="text-[13px] font-medium text-gray-700 dark:text-gray-200">
        {{ t("logistics.bulk.selected", { count }) }}
      </span>

      <div class="ms-auto flex flex-wrap items-center gap-2">
        <button type="button" class="hdr-btn-outlined" @click="$emit('clear')">
          {{ t("logistics.bulk.clear") }}
        </button>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  /**
   * Toplu aksiyon çubuğu (TUR-117).
   *
   * Aksiyon butonları slot ile gelir — her ekran kendi aksiyonunu koyar ama
   * seçim sayacı, temizleme ve yerleşim ortaktır.
   *
   * `ms-auto` kullanılıyor (`ml-auto` değil): arayüz Arapça'da sağdan sola
   * çalışıyor, mantıksal yön özelliği gerekli.
   *
   * ÇOK KÖKLÜ — SESSİZ BEDELİ (SOLID denetimi 2026-08-25):
   *   Kalıcı `sr-only` canlı bölge, koşullu `Transition`ın DIŞINDA duruyor;
   *   bu bilinçli ve doğru (kap içeriğiyle birlikte doğarsa polite duyuru
   *   okunmaz — WCAG 4.1.3). Bedeli şu: bileşenin tek kökü yok, dolayısıyla
   *   FALLTHROUGH NİTELİKLERİ DEVRALINMAZ. Dışarıdan verilen `class`, `id`,
   *   `style` hiçbir köke inmez ve Vue geliştirme modunda uyarır. Dış boşluğu
   *   (margin) ya da konumlandırmayı ÇAĞIRAN SARMALAYICI vermeli; bu bileşene
   *   `class="mt-4"` geçmek sessizce hiçbir şey yapmaz.
   */
  defineProps({
    count: { type: Number, default: 0 },
  });
  defineEmits(["clear"]);

  const { t } = useI18n();
</script>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.15s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
