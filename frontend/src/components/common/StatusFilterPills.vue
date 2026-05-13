<script setup>
  /**
   * StatusFilterPills — Liste sayfaları için hızlı status filtre pill'leri.
   *
   * Kullanım:
   *   <StatusFilterPills
   *     v-model="activeStatus"
   *     :options="[
   *       { value: '', label: 'Tümü', dot: 'bg-violet-400' },
   *       { value: 'Pending', label: 'Beklemede', dot: 'bg-amber-400' },
   *       ...
   *     ]"
   *     @change="loadData"
   *   />
   *
   * Tasarım kaynağı: RfqList.vue'deki orijinal "status-pill" pattern'i.
   */
  defineProps({
    options: { type: Array, required: true },
    // Wrapper class — bazı sayfalarda mb-4, bazılarında mb-5 olabiliyor.
    wrapperClass: { type: String, default: "flex items-center gap-2 flex-wrap mb-4" },
  });
  const model = defineModel({ type: [String, Number], default: "" });
  const emit = defineEmits(["change"]);

  function selectOption(value) {
    if (model.value === value) return;
    model.value = value;
    emit("change", value);
  }
</script>

<template>
  <div :class="wrapperClass">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="status-pill"
      :class="{ active: model === opt.value }"
      @click="selectOption(opt.value)"
    >
      <span v-if="opt.dot" class="w-2 h-2 rounded-full mr-2" :class="opt.dot"></span>
      {{ opt.label }}
      <span
        v-if="typeof opt.count === 'number' && opt.count > 0"
        class="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
        :class="
          model === opt.value
            ? 'bg-white/25 text-white'
            : 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300'
        "
      >
        {{ opt.count }}
      </span>
    </button>
  </div>
</template>

<style scoped>
  .status-pill {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    background: var(--th-surface-card, #1e1e2e);
    color: var(--th-text-secondary, #9ca3af);
    border: 1px solid var(--th-surface-border, #2d2d3d);
  }
  .status-pill:hover {
    border-color: #a78bfa;
    color: #c4b5fd;
  }
  .status-pill.active {
    background: #7c3aed;
    color: white;
    border-color: #7c3aed;
  }
</style>
