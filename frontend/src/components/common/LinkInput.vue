<template>
  <div ref="wrapperRef" class="relative">
    <AppIcon
      v-if="iconField && selectedIcon"
      :name="selectedIcon"
      :size="15"
      class="absolute left-3 top-1/2 -translate-y-1/2 text-brand-700 pointer-events-none"
    />
    <!-- ARIA combobox deseni (WCAG 2.1.1 / 4.1.2): öneriler klavyeyle
         ↑/↓/Enter/Esc üzerinden gezilir, aktif öğe aria-activedescendant ile
         okuyucuya bildirilir. -->
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="form-input pr-8 disabled:cursor-not-allowed disabled:opacity-60"
      :class="{ 'pl-9': iconField && selectedIcon }"
      :placeholder="placeholder || t('linkInput.searchPlaceholder')"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="show"
      :aria-controls="show ? listId : undefined"
      :aria-label="ariaLabel || undefined"
      :aria-labelledby="ariaLabelledby || undefined"
      :aria-required="required || undefined"
      :aria-activedescendant="show && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined"
      :disabled="disabled"
      @input="onInput($event.target.value)"
      @focus="onFocus"
      @blur="scheduleClose"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter="onEnter"
      @keydown.esc="onEsc"
    />
    <!-- gray-400 beyazda 2.76:1 idi — grafik nesne eşiği 3:1 (WCAG 1.4.11). -->
    <AppIcon
      name="search"
      :size="12"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
    />
    <!-- Sonuç sayısı okuyucuya duyurulur (WCAG 4.1.3). Kap kalıcı: v-if ile
         içerikle birlikte DOM'a girseydi duyuru okunmazdı. -->
    <span class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</span>
    <Teleport to="body">
      <div
        v-if="show"
        class="fixed z-[9999] bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-52 overflow-y-auto"
        :style="dropdownStyle"
      >
        <!-- Durum satırları listbox'ın DIŞINDA: `role="listbox"` kabında
             `option` olmayan çocuk bulunamaz (ARIA sahip-çocuk sözleşmesi). -->
        <div
          v-if="loading"
          class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2"
        >
          <AppIcon name="loader" :size="12" class="animate-spin" /> {{ t("linkInput.searching") }}
        </div>
        <div
          v-else-if="results.length === 0"
          class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400"
        >
          {{ t("linkInput.noResults") }}
        </div>
        <ul
          :id="listId"
          role="listbox"
          class="list-none m-0 p-0"
          :aria-label="ariaLabel || undefined"
          :aria-labelledby="ariaLabelledby || undefined"
        >
          <li
            v-for="(r, i) in results"
            :id="`${listId}-opt-${i}`"
            :key="r.value"
            role="option"
            :aria-selected="r.value === modelValue"
            class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-2"
            :class="{ 'bg-brand-50 dark:bg-white/5': i === activeIndex }"
            @mouseenter="activeIndex = i"
            @mousedown.prevent="select(r.value)"
          >
            <AppIcon v-if="r.icon" :name="r.icon" :size="14" class="text-brand-700 shrink-0" />
            <span>{{ r.value }}</span>
            <span v-if="r.description" class="text-xs text-gray-500 dark:text-gray-400 ml-1">{{
              r.description
            }}</span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch, useId } from "vue";
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
    // Erişilebilir isim — AppSelect ile AYNI sözleşme: verilmezse attribute
    // hiç basılmaz. Eski fallback zinciri (`ariaLabel || placeholder || t(...)`)
    // aria-label'ı HER ZAMAN basıyordu; görünür `<label>` varsa onu eziyordu ve
    // görünür ad ile erişilebilir ad ayrışıyordu (WCAG 2.5.3).
    ariaLabel: { type: String, default: "" },
    ariaLabelledby: { type: String, default: "" },
    // Salt-okunur formda alan gerçekten kilitlensin (yetki UI açığı).
    disabled: { type: Boolean, default: false },
    // Zorunluluk okuyucuya bildirilsin (WCAG 3.3.2) — yıldız tek başına yetmez.
    required: { type: Boolean, default: false },
  });
  const emit = defineEmits(["update:modelValue"]);

  const inputRef = ref(null);
  const wrapperRef = ref(null);
  const show = ref(false);
  const loading = ref(false);
  const results = ref([]);
  const selectedIcon = ref("");
  const listId = useId();
  const activeIndex = ref(-1);

  // Sonuç listesi her tazelendiğinde klavye imleci sıfırlanır.
  watch(results, () => {
    activeIndex.value = -1;
  });

  const liveMessage = computed(() => {
    if (!show.value || loading.value) return "";
    return results.value.length
      ? t("a11y.resultsCount", { count: results.value.length })
      : t("linkInput.noResults");
  });

  // Liste AÇIKKEN Esc yalnız listeyi kapatır; olay yukarı çıkarsa aynı tuş
  // sarmalayan diyalogu da kapatır (tek Esc → iki katman, WCAG 2.1.1 beklentisi
  // değil). Liste kapalıysa olay serbest bırakılır.
  function onEsc(e) {
    if (!show.value) return;
    e.stopPropagation();
    show.value = false;
  }

  function move(dir) {
    if (props.disabled) return;
    if (!show.value) {
      onInput(props.modelValue);
      return;
    }
    const n = results.value.length;
    if (!n) return;
    activeIndex.value = (activeIndex.value + dir + n) % n;
  }

  function onEnter(e) {
    if (!show.value || activeIndex.value < 0) return;
    e.preventDefault();
    select(results.value[activeIndex.value].value);
  }

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
    if (props.disabled) return;
    onInput(props.modelValue);
  }

  function onInput(val) {
    if (props.disabled) return;
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
    if (props.disabled) return;
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
