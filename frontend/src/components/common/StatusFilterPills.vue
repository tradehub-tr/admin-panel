<script setup>
  /**
   * StatusFilterPills — Liste sayfaları için hızlı status filtre pill'leri.
   *
   * Kullanım:
   *   <StatusFilterPills
   *     v-model="activeStatus"
   *     :options="[
   *       { value: '', label: 'Tümü', dot: 'bg-brand-400' },
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
    transition:
      background-color 0.15s,
      color 0.15s,
      border-color 0.15s;
    background: var(--th-surface-card, #1e1e2e);
    color: var(--th-text-secondary, #9ca3af);
    border: 1px solid var(--th-surface-border, #2d2d3d);
  }
  /* Hover metni AÇIK temada daha koyu.
     `#a87b00` koyu kartta (#191816) 4.65:1 ile geçiyor ama BEYAZ kartta
     3.82:1 — WCAG AA (1.4.3) 12px/600 metin için 4.5:1 istiyor. Tek renk
     iki zemine yetmiyor; açık temada koyulaştırılıyor (#8a6500 → 5.33:1).
     Ölçüm: `panel-lojistik-kontrast.spec.ts` hover taraması, 2026-08-21.
     Bu ihlal geçişler açıkken GİZLENİYORDU: hover'dan hemen sonra ölçülen
     renk `transition: color .15s`'in ARA değeriydi. */
  .status-pill:hover {
    border-color: #ffd54d;
    color: #8a6500;
  }

  :global(html.dark) .status-pill:hover {
    color: #a87b00;
  }
  .status-pill.active {
    background: #f5b800;
    color: #1a1a1a;
    border-color: #f5b800;
  }
</style>
