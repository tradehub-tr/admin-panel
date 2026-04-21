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
          :placeholder="placeholder"
          class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-100"
          @input="onInput"
        />
      </div>

      <div
        v-if="views.length"
        class="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 p-0.5 bg-gray-50 dark:bg-white/5"
      >
        <button
          v-for="v in views"
          :key="v.value"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all"
          :class="
            activeView === v.value
              ? 'bg-white dark:bg-white/10 text-violet-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          "
          @click="$emit('update:activeView', v.value)"
        >
          <AppIcon :name="v.icon" :size="13" />
          <span>{{ v.label }}</span>
        </button>
      </div>

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
  import { ref, watch } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    search: { type: String, default: "" },
    placeholder: { type: String, default: "Ara..." },
    views: { type: Array, default: () => [] }, // [{value, label, icon}]
    activeView: { type: String, default: "" },
    orderBy: { type: String, default: "" },
    orderByOptions: { type: Array, default: () => [] },
    debounce: { type: Number, default: 300 },
  });

  const emit = defineEmits(["update:search", "update:activeView", "update:orderBy", "search"]);

  const inputValue = ref(props.search);
  let t = null;

  watch(
    () => props.search,
    (v) => {
      inputValue.value = v;
    }
  );

  function onInput() {
    clearTimeout(t);
    t = setTimeout(() => {
      emit("update:search", inputValue.value);
      emit("search", inputValue.value);
    }, props.debounce);
  }
</script>
