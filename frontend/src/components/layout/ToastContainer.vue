<template>
  <!-- İki KALICI canlı bölge (WCAG 4.1.3).
       Önceki sürümde `role`/`aria-live` toast'ın KENDİSİNDEYDİ: kap ile içerik
       aynı anda DOM'a girdiği için çoğu ekran okuyucu polite duyuruları hiç
       okumuyordu. Bölgeler artık v-if'siz, boşken de DOM'da duruyor; toast
       içeri sonradan enjekte ediliyor ve mutasyon duyuruluyor.
       Dikey boşluk kapta `gap` ile değil toast'ta `mt-2` ile veriliyor —
       boş bölge fazladan aralık yaratmasın (görsel yerleşim korunur). -->
  <div class="fixed bottom-6 right-6 z-[100] flex flex-col">
    <div role="status" aria-live="polite" class="flex flex-col">
      <TransitionGroup name="toast">
        <div
          v-for="toast in politeToasts"
          :key="toast.id"
          class="toast mt-2"
          :class="`toast-${toast.type}`"
        >
          <AppIcon :name="toastIcon(toast.type)" :size="14" />
          <span class="text-xs flex-1">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            :aria-label="t('a11y.dismissNotification')"
            @click="remove(toast.id)"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
      </TransitionGroup>
    </div>

    <div role="alert" aria-live="assertive" class="flex flex-col">
      <TransitionGroup name="toast">
        <div
          v-for="toast in alertToasts"
          :key="toast.id"
          class="toast mt-2"
          :class="`toast-${toast.type}`"
        >
          <AppIcon :name="toastIcon(toast.type)" :size="14" />
          <span class="text-xs flex-1">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            :aria-label="t('a11y.dismissNotification')"
            @click="remove(toast.id)"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const { toasts, remove } = useToast();

  // Hata kesintili (assertive), başarı/bilgi sıraya girer (polite).
  const alertToasts = computed(() => toasts.value.filter((x) => x.type === "error"));
  const politeToasts = computed(() => toasts.value.filter((x) => x.type !== "error"));

  function toastIcon(type) {
    if (type === "success") return "check-circle";
    if (type === "error") return "alert-circle";
    return "info";
  }
</script>
