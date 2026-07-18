<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'full'"
    :empty="!links.length"
  >
    <!-- Not: bu projenin Tailwind config'i screens'i yeniden tanımlıyor (lg/xl/...);
         `sm:` varyantı yok — masaüstü kırılımı için lg (≥768px) kullanılır. -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="ql-item flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
        style="border-color: var(--th-border)"
      >
        <div
          class="ql-icon w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          :class="link.icon_class"
        >
          <i :class="link.icon"></i>
        </div>
        <div class="ql-body min-w-0">
          <div class="ql-label text-sm font-medium" style="color: var(--th-text-primary)">
            {{ link.label }}
          </div>
          <div
            v-if="link.count !== null"
            class="ql-count text-[11px]"
            style="color: var(--th-text-tertiary)"
          >
            {{ t("dynamicQuickLinks.records", { count: link.count }) }}
          </div>
        </div>
      </router-link>
    </div>
  </WidgetWrapper>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import WidgetWrapper from "@/components/dashboard/layout/WidgetWrapper.vue";

  const { t } = useI18n();

  const props = defineProps({
    widget: { type: Object, required: true },
  });

  const links = computed(() => props.widget.data?.links || []);
</script>

<style scoped lang="scss">
  /* ── Mobil (≤767px): dikey kompakt kutucuk ──────────────────
     Yatay düzen (ikon solda) 2'li grid'de etiketi 70-80px'e sıkıştırıp
     satır kırdırıyordu. Mobilde ikon üste alınır; etiket tam genişlikte
     en fazla 2 satır sarar, 2 satırlık alan her kartta rezervedir —
     kutucuklar eşit yükseklikte kalır. */
  @media (max-width: 767px) {
    .ql-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
    }

    .ql-icon {
      width: 28px;
      height: 28px;
      font-size: 12px;
      border-radius: 8px;
    }

    .ql-label {
      font-size: 12px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(2 * 1.3em);
    }

    .ql-count {
      font-size: 10px;
      margin-top: 1px;
    }
  }
</style>
