<template>
  <div ref="rootEl" class="relative">
    <button
      class="hdr-icon-btn flex items-center gap-1"
      :title="t('common.language')"
      @click.stop="open = !open"
    >
      <AppIcon name="globe" :size="15" />
      <span class="text-[11px] font-semibold uppercase">{{ current }}</span>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute top-[calc(100%+8px)] end-0 w-44 bg-white border border-gray-200 rounded-lg shadow-2xl shadow-black/12 z-[60] overflow-hidden py-1"
        @click.stop
      >
        <button
          v-for="lang in LANGS"
          :key="lang.code"
          type="button"
          class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
          :class="lang.code === current ? 'text-brand-800 font-semibold' : 'text-gray-700'"
          @click="select(lang.code)"
        >
          <span>{{ lang.label }}</span>
          <AppIcon v-if="lang.code === current" name="check" :size="14" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { setLanguage, SUPPORTED_LANGS } from "@/i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t, locale } = useI18n();

  const LABELS = { en: "English", tr: "Türkçe", ar: "العربية", ru: "Русский" };
  const LANGS = SUPPORTED_LANGS.map((code) => ({ code, label: LABELS[code] || code }));

  const open = ref(false);
  const rootEl = ref(null);
  const current = computed(() => locale.value);

  function select(code) {
    open.value = false;
    if (code === locale.value) return;
    setLanguage(code); // persists th-lang + sets <html dir/lang>
    // Full reload so both frontend t() strings AND backend-localized metadata
    // (Frappe doctype labels sent via Accept-Language, plus already-fetched
    // list/form data) refresh consistently in the newly selected language.
    window.location.reload();
  }

  function onDocClick(e) {
    if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false;
  }
  onMounted(() => document.addEventListener("click", onDocClick));
  onUnmounted(() => document.removeEventListener("click", onDocClick));
</script>
