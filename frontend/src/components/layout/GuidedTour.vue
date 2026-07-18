<script setup>
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
  import { useI18n } from "vue-i18n";
  import { useTourStore } from "@/stores/tour";

  const { t, te, locale } = useI18n();
  const tour = useTourStore();
  const isRtl = computed(() => locale.value === "ar");

  const rect = ref(null); // hedef öğenin viewport koordinatları

  function titleFor(step) {
    if (!step) return "";
    return step.title || (step.titleKey ? t(step.titleKey) : "");
  }
  function descFor(step) {
    if (!step) return "";
    if (step.desc) return step.desc;
    if (step.descKey && te(step.descKey)) return t(step.descKey);
    return t("tourSteps.itemGeneric", { name: titleFor(step) });
  }

  function locate() {
    const s = tour.current;
    if (!s) {
      rect.value = null;
      return;
    }
    const el = document.querySelector(s.target);
    if (!el) {
      rect.value = null;
      return;
    }
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {
      /* eski tarayıcı */
    }
    const r = el.getBoundingClientRect();
    rect.value = {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
    };
  }

  const spotStyle = computed(() => {
    const r = rect.value;
    if (!r) return { display: "none" };
    return {
      top: r.top - 4 + "px",
      left: r.left - 4 + "px",
      width: r.width + 8 + "px",
      height: r.height + 8 + "px",
      boxShadow: "0 0 0 9999px rgba(17,16,24,0.62)",
    };
  });

  const COACH_W = 300;
  const coachStyle = computed(() => {
    const r = rect.value;
    if (!r) return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.right + 14;
    let top = Math.max(12, Math.min(r.top - 8, vh - 220));
    if (left + COACH_W > vw - 12) {
      left = r.left - COACH_W - 14;
      if (left < 12) {
        left = Math.min(r.left, vw - COACH_W - 12);
        top = r.bottom + 14;
      }
    }
    return { top: top + "px", left: Math.max(12, left) + "px" };
  });

  function reposition() {
    if (tour.active) locate();
  }

  // Hedef öğe geç render olabilir (tablo veri yüklenirken vb.) — bulana kadar dene.
  function locateWithRetry(attempt = 0) {
    locate();
    if (!rect.value && attempt < 6) setTimeout(() => locateWithRetry(attempt + 1), 150);
  }

  watch(
    () => tour.current,
    async () => {
      await nextTick();
      setTimeout(() => locateWithRetry(), 80);
    }
  );
  watch(
    () => tour.active,
    async (a) => {
      if (a) {
        await nextTick();
        setTimeout(() => locateWithRetry(), 80);
      }
    }
  );

  function onKey(e) {
    if (!tour.active) return;
    if (e.key === "Escape") tour.skip();
    else if (e.key === "ArrowRight") tour.next();
    else if (e.key === "ArrowLeft") tour.prev();
  }
  onMounted(() => {
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("keydown", onKey);
  });
  onUnmounted(() => {
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    window.removeEventListener("keydown", onKey);
  });
</script>

<template>
  <Teleport to="body">
    <div v-if="tour.active && tour.current" class="fixed inset-0 z-[9999]">
      <!-- karanlık zemin (spotlight box-shadow ile delik açar); tıklama tura kilitli -->
      <div class="absolute inset-0" @click.self="tour.skip()"></div>

      <div
        class="absolute rounded-lg transition-all duration-300 pointer-events-none"
        :style="spotStyle"
      ></div>

      <div
        class="absolute w-[300px] max-w-[92vw] bg-white dark:bg-gray-900 rounded-xl shadow-2xl transition-all duration-300"
        :style="coachStyle"
        :dir="isRtl ? 'rtl' : 'ltr'"
      >
        <div class="flex items-center justify-between px-4 pt-3">
          <span class="text-[11px] font-bold text-brand-800 dark:text-brand-500">
            {{ tour.index + 1 }} / {{ tour.total }}
          </span>
          <button class="text-[11px] text-gray-400 hover:text-gray-600" @click="tour.skip()">
            {{ t("tourSteps.skip") }} ✕
          </button>
        </div>
        <h4 class="mx-4 mt-1.5 mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {{ titleFor(tour.current) }}
        </h4>
        <p class="mx-4 mb-3 text-xs text-gray-600 dark:text-gray-400">
          {{ descFor(tour.current) }}
        </p>
        <div class="flex items-center gap-2 px-4 pb-3.5">
          <div class="flex-1 mr-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-brand-500 transition-all duration-300"
              :style="{ width: ((tour.index + 1) / tour.total) * 100 + '%' }"
            ></div>
          </div>
          <button
            class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40"
            :disabled="tour.isFirst"
            @click="tour.prev()"
          >
            {{ t("tourSteps.back") }}
          </button>
          <button
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 text-brand-ink hover:bg-brand-600"
            @click="tour.next()"
          >
            {{ tour.isLast ? t("tourSteps.finish") + " ✓" : t("tourSteps.next") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
