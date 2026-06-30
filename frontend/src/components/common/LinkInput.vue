<template>
  <div ref="wrapperRef" class="relative">
    <AppIcon
      v-if="iconField && selectedIcon"
      :name="selectedIcon"
      :size="15"
      class="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none"
    />
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="form-input pr-8"
      :class="{ 'pl-9': iconField && selectedIcon }"
      :placeholder="placeholder || t('linkInput.searchPlaceholder')"
      autocomplete="off"
      @input="onInput($event.target.value)"
      @focus="onFocus"
      @blur="scheduleClose"
    />
    <AppIcon
      name="search"
      :size="12"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
    <Teleport to="body">
      <div
        v-if="show"
        class="fixed z-[9999] bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-52 overflow-y-auto"
        :style="dropdownStyle"
      >
        <div v-if="loading" class="px-3 py-3 text-xs text-gray-400 flex items-center gap-2">
          <AppIcon name="loader" :size="12" class="animate-spin" /> {{ t("linkInput.searching") }}
        </div>
        <div v-else-if="results.length === 0" class="px-3 py-3 text-xs text-gray-400">
          {{ t("linkInput.noResults") }}
        </div>
        <div
          v-for="r in results"
          :key="r.value"
          class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-2"
          @mousedown.prevent="select(r.value)"
        >
          <AppIcon v-if="r.icon" :name="r.icon" :size="14" class="text-violet-500 shrink-0" />
          <span>{{ r.value }}</span>
          <span v-if="r.description" class="text-xs text-gray-400 ml-1">{{ r.description }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: String, default: "" },
    doctype: { type: String, required: true },
    placeholder: { type: String, default: "" },
    filters: { type: Array, default: () => [] },
    // Verilirse: bağlı doctype'tan bu lucide-ikon alanı çekilip hem dropdown
    // seçeneklerinde hem seçili değerin solunda gösterilir (ör. "icon_class").
    iconField: { type: String, default: "" },
  });
  const emit = defineEmits(["update:modelValue"]);

  const inputRef = ref(null);
  const wrapperRef = ref(null);
  const show = ref(false);
  const loading = ref(false);
  const results = ref([]);
  const selectedIcon = ref("");

  // Dropdown sonuçlarına icon_class ekle (tek toplu sorgu).
  async function enrichResultIcons() {
    if (!props.iconField || !results.value.length) return;
    const names = results.value.map((r) => r.value);
    try {
      const res = await api.getList(props.doctype, {
        filters: [["name", "in", names]],
        fields: ["name", props.iconField],
        limit_page_length: names.length,
      });
      const map = Object.fromEntries((res.data || []).map((d) => [d.name, d[props.iconField]]));
      results.value = results.value.map((r) => ({ ...r, icon: map[r.value] || "" }));
    } catch {
      /* ikon kozmetik — hata sessizce yutulur */
    }
  }

  // Seçili (tam eşleşen) değerin ikonunu çek; eşleşme yoksa temizle.
  async function fetchSelectedIcon() {
    if (!props.iconField || !props.modelValue) {
      selectedIcon.value = "";
      return;
    }
    try {
      const res = await api.getList(props.doctype, {
        filters: [["name", "=", props.modelValue]],
        fields: ["name", props.iconField],
        limit_page_length: 1,
      });
      selectedIcon.value = res.data?.[0]?.[props.iconField] || "";
    } catch {
      selectedIcon.value = "";
    }
  }

  watch(
    () => props.modelValue,
    () => fetchSelectedIcon()
  );
  const dropdownStyle = reactive({ top: "0px", left: "0px", width: "200px" });
  let timer = null;

  function updatePosition() {
    if (!inputRef.value) return;
    const rect = inputRef.value.getBoundingClientRect();
    dropdownStyle.top = `${rect.bottom + 4}px`;
    dropdownStyle.left = `${rect.left}px`;
    dropdownStyle.width = `${Math.max(rect.width, 220)}px`;
  }

  function onFocus() {
    onInput(props.modelValue);
  }

  function onInput(val) {
    emit("update:modelValue", val);
    clearTimeout(timer);
    show.value = true;
    loading.value = true;
    nextTick(updatePosition);
    timer = setTimeout(async () => {
      try {
        const res = await api.searchLink(props.doctype, val || "", props.filters);
        results.value = res.results || res.message || res || [];
        await enrichResultIcons();
      } catch {
        results.value = [];
      } finally {
        loading.value = false;
        nextTick(updatePosition);
      }
    }, 300);
  }

  function select(val) {
    emit("update:modelValue", val);
    show.value = false;
  }

  function scheduleClose() {
    setTimeout(() => {
      show.value = false;
    }, 200);
  }

  function handleScrollOrResize() {
    if (show.value) updatePosition();
  }

  onMounted(() => {
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    fetchSelectedIcon();
  });
  onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleScrollOrResize, true);
    window.removeEventListener("resize", handleScrollOrResize);
  });
</script>
