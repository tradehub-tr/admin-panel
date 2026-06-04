<template>
  <div class="card mb-4 !p-3">
    <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
      <div class="relative flex-1 min-w-0">
        <AppIcon
          name="search"
          :size="13"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="inputValue"
          type="text"
          :placeholder="placeholderText"
          class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-100"
          @input="onInput"
        />
      </div>

      <ViewModeToggle
        v-if="viewModes.length"
        :model-value="activeView"
        :modes="viewModes"
        @update:model-value="$emit('update:activeView', $event)"
      />

      <select
        v-if="orderByOptions.length"
        :value="orderBy"
        class="form-input-sm w-auto"
        @change="$emit('update:orderBy', $event.target.value)"
      >
        <option v-for="o in orderByOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>

      <slot name="extra" />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const VALID_MODES = ["table", "grid", "kanban", "list"];

  const { t } = useI18n();

  const props = defineProps({
    search: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    // [{value, label, icon}] veya doğrudan mode id dizisi ("list" | "kanban" ...)
    views: { type: Array, default: () => [] },
    activeView: { type: String, default: "" },
    orderBy: { type: String, default: "" },
    orderByOptions: { type: Array, default: () => [] },
    debounce: { type: Number, default: 300 },
  });

  // ViewModeToggle standart mod id'lerini bekler; eski {value,...} formatından da türet.
  const viewModes = computed(() =>
    props.views
      .map((v) => (typeof v === "string" ? v : v.value))
      .filter((m) => VALID_MODES.includes(m))
  );

  const emit = defineEmits(["update:search", "update:activeView", "update:orderBy", "search"]);

  const placeholderText = computed(
    () => props.placeholder || t("crmListToolbar.searchPlaceholder")
  );

  const inputValue = ref(props.search);
  let timer = null;

  watch(
    () => props.search,
    (v) => {
      inputValue.value = v;
    }
  );

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      emit("update:search", inputValue.value);
      emit("search", inputValue.value);
    }, props.debounce);
  }
</script>
