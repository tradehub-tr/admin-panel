<template>
  <div class="seller-picker relative" :class="{ 'is-open': open }">
    <!-- Compact "chip" trigger when a seller is selected -->
    <button
      v-if="modelValue && !open"
      type="button"
      class="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
      style="
        border-color: rgba(245, 184, 0, 0.35);
        background: rgba(245, 184, 0, 0.08);
        color: var(--th-text-primary);
      "
      :title="t('sellerPicker.sellerTitle', { name: selectedLabel })"
      @click="openPicker"
    >
      <i class="fas fa-store text-[10px] text-brand-700"></i>
      <span class="max-w-[140px] truncate">{{ selectedLabel }}</span>
      <span
        class="w-5 h-5 rounded hover:bg-red-500/15 flex items-center justify-center transition-colors"
        :title="t('sellerPicker.clearSelection')"
        @click.stop="clearSelection"
      >
        <i class="fas fa-xmark text-[10px] text-gray-400 hover:text-red-500"></i>
      </span>
    </button>

    <!-- Default "Tüm satıcılar" trigger -->
    <button
      v-else-if="!open"
      type="button"
      class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
      style="border-color: var(--th-border); color: var(--th-text-primary)"
      @click="openPicker"
    >
      <i class="fas fa-store text-[10px]" style="color: var(--th-text-tertiary)"></i>
      <span>{{ t("sellerPicker.allSellers") }}</span>
      <i class="fas fa-chevron-down text-[8px]" style="color: var(--th-text-tertiary)"></i>
    </button>

    <!-- Open state: search input + dropdown -->
    <div v-if="open" class="relative">
      <input
        ref="inputEl"
        :value="searchText"
        type="text"
        class="seller-picker-input px-3 pr-9 py-1 text-xs rounded-lg border outline-none w-56"
        :placeholder="t('sellerPicker.searchPlaceholder')"
        autocomplete="off"
        :style="{
          borderColor: 'var(--th-border)',
          background: 'var(--th-surface-elevated)',
          color: 'var(--th-text-primary)',
        }"
        @input="onInput($event.target.value)"
        @keydown.escape="close"
        @blur="scheduleClose"
      />
      <i
        class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
        style="color: var(--th-text-tertiary)"
      ></i>

      <div
        class="seller-picker-dropdown absolute z-30 w-72 mt-1 right-0 rounded-lg border shadow-2xl max-h-72 overflow-y-auto"
        style="background: var(--th-surface-card); border-color: var(--th-border)"
      >
        <!-- "Tüm satıcılar" option -->
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-xs font-medium border-b transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          :class="!modelValue ? 'bg-brand-500/10 text-brand-700' : ''"
          style="border-color: var(--th-border); color: var(--th-text-primary)"
          @mousedown.prevent="select(null)"
        >
          <i
            class="fas fa-globe text-[10px] mr-1.5"
            :class="!modelValue ? 'text-brand-700' : 'opacity-50'"
          ></i>
          {{ t("sellerPicker.allSellers") }}
          <span v-if="!modelValue" class="float-right text-[10px]"
            ><i class="fas fa-check"></i
          ></span>
        </button>

        <div
          v-if="loading"
          class="px-3 py-3 text-xs flex items-center gap-2"
          style="color: var(--th-text-tertiary)"
        >
          <i class="fas fa-spinner fa-spin text-[10px] text-brand-700"></i>
          {{ t("sellerPicker.searching") }}
        </div>

        <div
          v-else-if="results.length === 0"
          class="px-3 py-3 text-xs"
          style="color: var(--th-text-tertiary)"
        >
          {{ t("sellerPicker.noMatch") }}
        </div>

        <button
          v-for="r in results"
          :key="r.name"
          type="button"
          class="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          :class="modelValue === r.name ? 'bg-brand-500/10' : ''"
          :style="{ color: 'var(--th-text-primary)' }"
          @mousedown.prevent="select(r.name)"
        >
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <div class="font-medium truncate">{{ r.seller_name || r.name }}</div>
              <div class="text-[10px] mt-0.5" style="color: var(--th-text-tertiary)">
                {{ r.name }}<span v-if="r.status"> · {{ r.status }}</span>
              </div>
            </div>
            <i v-if="modelValue === r.name" class="fas fa-check text-[10px] text-brand-700"></i>
          </div>
        </button>

        <div
          v-if="!loading && results.length >= LIMIT"
          class="px-3 py-2 text-[10px] border-t"
          style="color: var(--th-text-tertiary); border-color: var(--th-border)"
        >
          {{ t("sellerPicker.limitNote", { limit: LIMIT }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, nextTick, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: [String, null], default: null },
  });
  const emit = defineEmits(["update:modelValue", "selected"]);

  const LIMIT = 30;

  const open = ref(false);
  const searchText = ref("");
  const inputEl = ref(null);
  const loading = ref(false);
  const results = ref([]);
  const cache = ref(new Map()); // name → seller_name (for label resolution)
  let timer = null;

  const selectedLabel = computed(() => {
    if (!props.modelValue) return t("sellerPicker.allSellers");
    return cache.value.get(props.modelValue) || props.modelValue;
  });

  async function fetchSellers(query) {
    loading.value = true;
    try {
      const params = {
        fields: ["name", "seller_name", "status"],
        filters: [["status", "=", "Active"]],
        order_by: "seller_name asc",
        limit_page_length: LIMIT,
      };
      if (query) {
        params.or_filters = [
          ["seller_name", "like", `%${query}%`],
          ["name", "like", `%${query}%`],
        ];
      }
      const res = await api.getList("Admin Seller Profile", params);
      results.value = res.data || [];
      // Cache labels for chip display when only the id is known
      for (const s of results.value) {
        cache.value.set(s.name, s.seller_name || s.name);
      }
    } catch (e) {
      console.warn("Satıcı arama başarısız:", e);
      results.value = [];
    } finally {
      loading.value = false;
    }
  }

  function openPicker() {
    open.value = true;
    searchText.value = "";
    fetchSellers("");
    nextTick(() => inputEl.value?.focus());
  }

  function close() {
    open.value = false;
  }

  function scheduleClose() {
    setTimeout(() => {
      open.value = false;
    }, 180);
  }

  function onInput(val) {
    searchText.value = val;
    loading.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => fetchSellers(val), 250);
  }

  function select(name) {
    const seller = name ? results.value.find((r) => r.name === name) : null;
    emit("update:modelValue", name);
    emit("selected", seller || (name ? { name, seller_name: cache.value.get(name) } : null));
    open.value = false;
    searchText.value = "";
  }

  function clearSelection() {
    emit("update:modelValue", null);
    emit("selected", null);
  }

  // When the modelValue changes externally (e.g. parent reset), keep the
  // label cache aware so the chip can render properly.
  watch(
    () => props.modelValue,
    (v) => {
      if (v && !cache.value.has(v)) {
        fetchSellers(v);
      }
    },
    { immediate: true }
  );
</script>

<style scoped lang="scss">
  /* ── Mobil (≤767px) ──────────────────────────────────────────
     Dropdown sabit 288px + right-0 ile dar ekranda sola taşıp
     rail'in (z-50) altına giriyordu; metinlerin solu kesiliyordu.
     Mobilde: picker açılınca tam satır kaplar, dropdown input
     genişliğine kilitlenir — taşma imkânsız. */
  @media (max-width: 767px) {
    .seller-picker.is-open {
      flex: 1 1 100%;
    }

    .seller-picker.is-open .seller-picker-input {
      width: 100%;
    }

    .seller-picker-dropdown {
      left: 0;
      right: 0;
      width: auto;
    }
  }
</style>
