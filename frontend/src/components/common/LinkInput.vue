<template>
  <div ref="wrapperRef" class="relative">
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="form-input pr-8"
      :placeholder="placeholder"
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
          <AppIcon name="loader" :size="12" class="animate-spin" /> Aranıyor...
        </div>
        <div v-else-if="results.length === 0" class="px-3 py-3 text-xs text-gray-400">
          Sonuç bulunamadı
        </div>
        <div
          v-for="r in results"
          :key="r.value"
          class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          @mousedown.prevent="select(r.value)"
        >
          {{ r.value }}
          <span v-if="r.description" class="text-xs text-gray-400 ml-2">{{ r.description }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from "vue";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    modelValue: { type: String, default: "" },
    doctype: { type: String, required: true },
    placeholder: { type: String, default: "Ara..." },
    filters: { type: Array, default: () => [] },
  });
  const emit = defineEmits(["update:modelValue"]);

  const inputRef = ref(null);
  const wrapperRef = ref(null);
  const show = ref(false);
  const loading = ref(false);
  const results = ref([]);
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
  });
  onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleScrollOrResize, true);
    window.removeEventListener("resize", handleScrollOrResize);
  });
</script>
