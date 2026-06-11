<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          @click="$router.push('/dashboard')"
        >
          <i class="fas fa-arrow-left text-xs"></i>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900">
            {{ t("recommendationsSettings.title") }}
          </h1>
          <p class="text-xs text-gray-400">
            {{ t("recommendationsSettings.subtitle") }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <button
          class="hdr-btn-outlined text-xs"
          :class="{ 'opacity-50 cursor-not-allowed': rebuilding }"
          :disabled="rebuilding"
          :title="t('recommendationsSettings.rebuildTooltip')"
          @click="triggerRebuild"
        >
          <i
            :class="rebuilding ? 'fas fa-spinner fa-spin' : 'fas fa-rotate'"
            class="mr-1.5 text-xs"
          ></i>
          {{
            rebuilding
              ? t("recommendationsSettings.triggering")
              : t("recommendationsSettings.rebuild")
          }}
        </button>
        <button
          class="hdr-btn-outlined text-xs"
          :class="{ 'opacity-50 cursor-not-allowed': !hasChanges || saving }"
          :disabled="!hasChanges || saving"
          :title="t('recommendationsSettings.discardTooltip')"
          @click="discardChanges"
        >
          <i class="fas fa-undo mr-1.5 text-xs"></i>{{ t("recommendationsSettings.discard") }}
        </button>
        <button
          class="hdr-btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': !hasChanges || saving }"
          :disabled="!hasChanges || saving"
          data-tour="rec-save"
          @click="saveChanges"
        >
          <i
            :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'"
            class="mr-1.5 text-xs"
          ></i>
          {{ saving ? t("recommendationsSettings.saving") : t("recommendationsSettings.save") }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
      <p class="text-sm text-gray-400 mt-3">{{ t("recommendationsSettings.loading") }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
        <i class="fas fa-triangle-exclamation text-2xl text-red-500"></i>
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">
        {{ t("recommendationsSettings.loadErrorTitle") }}
      </h3>
      <p class="text-xs text-gray-400 mb-3">{{ loadError }}</p>
      <button class="hdr-btn-outlined text-xs" @click="loadAll">
        <i class="fas fa-rotate mr-1.5"></i>{{ t("recommendationsSettings.retry") }}
      </button>
    </div>

    <!-- Editor -->
    <template v-else>
      <!-- Status panel -->
      <div class="card p-4 mb-4">
        <h3 class="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
          {{ t("recommendationsSettings.systemStatus") }}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded border border-gray-100 bg-gray-50 p-3">
            <div class="text-[11px] text-gray-500 uppercase tracking-wide">
              {{ t("recommendationsSettings.activeListings") }}
            </div>
            <div class="text-base font-bold text-gray-900 mt-0.5">
              {{ formatNum(status.active_listings) }}
            </div>
          </div>
          <div class="rounded border border-gray-100 bg-gray-50 p-3">
            <div class="text-[11px] text-gray-500 uppercase tracking-wide">
              {{ t("recommendationsSettings.activeCategories") }}
            </div>
            <div class="text-base font-bold text-gray-900 mt-0.5">
              {{ formatNum(status.active_categories) }}
            </div>
          </div>
          <div class="rounded border border-gray-100 bg-gray-50 p-3">
            <div class="text-[11px] text-gray-500 uppercase tracking-wide">
              {{ t("recommendationsSettings.cacheRows") }}
            </div>
            <div class="text-base font-bold text-gray-900 mt-0.5">
              {{ formatNum(status.cache_total) }}
            </div>
          </div>
          <div class="rounded border border-gray-100 bg-gray-50 p-3">
            <div class="text-[11px] text-gray-500 uppercase tracking-wide">
              {{ t("recommendationsSettings.neighbourMatches") }}
            </div>
            <div class="text-base font-bold text-gray-900 mt-0.5">
              {{ formatNum(status.neighbour_count) }}
            </div>
          </div>
        </div>
        <div
          v-if="status.shadow_in_progress"
          class="mt-3 rounded border border-amber-200 bg-amber-50 p-2 flex items-center gap-2"
        >
          <i class="fas fa-spinner fa-spin text-amber-600 text-xs"></i>
          <span class="text-xs text-amber-800">{{
            t("recommendationsSettings.rebuildInProgress")
          }}</span>
        </div>
      </div>

      <!-- Per-tab cache breakdown -->
      <div v-if="hasCacheBreakdown" class="card p-4 mb-4">
        <h3 class="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
          {{ t("recommendationsSettings.recommendationsByTab") }}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="tab in tabBreakdown"
            :key="tab.key"
            class="rounded border border-gray-100 bg-white p-3"
          >
            <div class="text-[11px] text-gray-500">{{ tab.label }}</div>
            <div class="text-sm font-bold text-gray-900 mt-0.5">{{ formatNum(tab.count) }}</div>
            <div v-if="tab.last" class="text-[10px] text-gray-400 mt-0.5">{{ tab.last }}</div>
          </div>
        </div>
      </div>

      <!-- Top-level controls -->
      <div class="card p-4 mb-4" data-tour="rec-settings">
        <h3 class="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
          {{ t("recommendationsSettings.generalThresholds") }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldNumber
            :label="t('recommendationsSettings.maxResultsPerTab')"
            :model-value="form.max_results_per_tab"
            :min="1"
            :max="50"
            :step="1"
            :help="t('recommendationsSettings.maxResultsPerTabHelp')"
            @update:model-value="setFlat('max_results_per_tab', $event)"
          />
          <FieldNumber
            :label="t('recommendationsSettings.minScoreThreshold')"
            :model-value="form.min_score_threshold"
            :min="0"
            :max="1"
            :step="0.05"
            :help="t('recommendationsSettings.minScoreThresholdHelp')"
            @update:model-value="setFlat('min_score_threshold', $event)"
          />
          <FieldNumber
            :label="t('recommendationsSettings.copurchaseLiftThreshold')"
            :model-value="form.copurchase_lift_threshold"
            :min="1"
            :max="10"
            :step="0.1"
            :help="t('recommendationsSettings.copurchaseLiftThresholdHelp')"
            @update:model-value="setFlat('copurchase_lift_threshold', $event)"
          />
          <FieldNumber
            :label="t('recommendationsSettings.embeddingCosineThreshold')"
            :model-value="form.embedding_cosine_threshold"
            :min="0"
            :max="1"
            :step="0.05"
            :help="t('recommendationsSettings.embeddingCosineThresholdHelp')"
            @update:model-value="setFlat('embedding_cosine_threshold', $event)"
          />
          <FieldNumber
            :label="t('recommendationsSettings.accessoryPriceRatioThreshold')"
            :model-value="form.accessory_price_ratio_threshold"
            :min="0"
            :max="1"
            :step="0.05"
            :help="t('recommendationsSettings.accessoryPriceRatioThresholdHelp')"
            @update:model-value="setFlat('accessory_price_ratio_threshold', $event)"
          />
        </div>
      </div>

      <!-- Per-scorer weight grids -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" data-tour="rec-weights">
        <WeightCard
          :title="t('recommendationsSettings.weightSimilar')"
          :weights="form.similar"
          :schema="weightSchemas.similar"
          @update="setNested('similar', $event)"
        />
        <WeightCard
          :title="t('recommendationsSettings.weightSubstitute')"
          :weights="form.substitute"
          :schema="weightSchemas.substitute"
          @update="setNested('substitute', $event)"
        />
        <WeightCard
          :title="t('recommendationsSettings.weightComplementary')"
          :weights="form.complementary"
          :schema="weightSchemas.complementary"
          @update="setNested('complementary', $event)"
        />
        <WeightCard
          :title="t('recommendationsSettings.weightAccessory')"
          :weights="form.accessory"
          :schema="weightSchemas.accessory"
          @update="setNested('accessory', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, h } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: genel eşikler → skorlama ağırlıkları → kaydet.
  usePageTour("recommendations-settings", () => [
    {
      target: '[data-tour="rec-settings"]',
      title: t("tourSteps.page.recSettings_t"),
      desc: t("tourSteps.page.recSettings_d"),
    },
    {
      target: '[data-tour="rec-weights"]',
      title: t("tourSteps.page.recWeights_t"),
      desc: t("tourSteps.page.recWeights_d"),
    },
    {
      target: '[data-tour="rec-save"]',
      title: t("tourSteps.page.recSave_t"),
      desc: t("tourSteps.page.recSave_d"),
    },
  ]);

  // ─── State ───────────────────────────────────────────────
  const loading = ref(true);
  const loadError = ref("");
  const saving = ref(false);
  const rebuilding = ref(false);
  const original = ref(null);
  const form = ref(null);
  const status = ref({
    active_listings: 0,
    active_categories: 0,
    cache_total: 0,
    neighbour_count: 0,
    embedding_count: 0,
    cache_by_relation: {},
    shadow_in_progress: false,
  });

  // ─── Schemas ─────────────────────────────────────────────
  const weightSchemas = {
    similar: [
      { key: "category", label: t("recommendationsSettings.wSimilarCategory") },
      { key: "attribute", label: t("recommendationsSettings.wSimilarAttribute") },
      { key: "price_tier", label: t("recommendationsSettings.wSimilarPriceTier") },
      { key: "rating", label: t("recommendationsSettings.wSimilarRating") },
    ],
    substitute: [
      { key: "same_category", label: t("recommendationsSettings.wSubstituteSameCategory") },
      { key: "different_seller", label: t("recommendationsSettings.wSubstituteDifferentSeller") },
      { key: "attribute", label: t("recommendationsSettings.wSubstituteAttribute") },
      { key: "price_proximity", label: t("recommendationsSettings.wSubstitutePriceProximity") },
    ],
    complementary: [
      { key: "copurchase", label: t("recommendationsSettings.wComplementaryCopurchase") },
      { key: "coview", label: t("recommendationsSettings.wComplementaryCoview") },
      { key: "embedding", label: t("recommendationsSettings.wComplementaryEmbedding") },
    ],
    accessory: [
      { key: "token", label: t("recommendationsSettings.wAccessoryToken") },
      { key: "price_ratio", label: t("recommendationsSettings.wAccessoryPriceRatio") },
      { key: "category_pattern", label: t("recommendationsSettings.wAccessoryCategoryPattern") },
      { key: "copurchase", label: t("recommendationsSettings.wAccessoryCopurchase") },
    ],
  };

  const TAB_LABELS = {
    Similar: t("recommendationsSettings.tabSimilar"),
    Substitute: t("recommendationsSettings.tabSubstitute"),
    Complementary: t("recommendationsSettings.tabComplementary"),
    Accessory: t("recommendationsSettings.tabAccessory"),
  };

  // ─── Computed ────────────────────────────────────────────
  const hasChanges = computed(() => {
    if (!form.value || !original.value) return false;
    return JSON.stringify(form.value) !== JSON.stringify(original.value);
  });

  const tabBreakdown = computed(() => {
    const out = [];
    for (const [k, label] of Object.entries(TAB_LABELS)) {
      const entry = status.value.cache_by_relation?.[k];
      out.push({
        key: k,
        label,
        count: entry?.count || 0,
        last: entry?.last_computed_at || "",
      });
    }
    return out;
  });

  const hasCacheBreakdown = computed(
    () => Object.keys(status.value.cache_by_relation || {}).length > 0
  );

  // ─── API ─────────────────────────────────────────────────
  async function loadAll() {
    loading.value = true;
    loadError.value = "";
    try {
      const [settingsRes, statusRes] = await Promise.all([
        api.callMethodGET("tradehub_core.api.recommendations.get_settings"),
        api.callMethodGET("tradehub_core.api.recommendations.get_status"),
      ]);
      const settings = settingsRes?.message || {};
      form.value = JSON.parse(JSON.stringify(settings));
      original.value = JSON.parse(JSON.stringify(settings));
      status.value = statusRes?.message || status.value;
    } catch (err) {
      loadError.value = err?.message || t("recommendationsSettings.loadFailed");
    } finally {
      loading.value = false;
    }
  }

  async function saveChanges() {
    if (!hasChanges.value || saving.value) return;
    saving.value = true;
    try {
      await api.callMethod("tradehub_core.api.recommendations.update_settings", {
        payload: form.value,
      });
      original.value = JSON.parse(JSON.stringify(form.value));
      // Refresh status to reflect any side effects
      const statusRes = await api.callMethodGET("tradehub_core.api.recommendations.get_status");
      status.value = statusRes?.message || status.value;
    } catch (err) {
      alert(err?.message || t("recommendationsSettings.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function triggerRebuild() {
    if (rebuilding.value) return;
    if (!confirm(t("recommendationsSettings.rebuildConfirm"))) return;
    rebuilding.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.recommendations.trigger_rebuild");
      const msg = res?.message || {};
      alert(
        t("recommendationsSettings.rebuildTriggered", {
          chunks: msg.chunks || 0,
          listings: msg.listings || 0,
        })
      );
      setTimeout(loadAll, 2000);
    } catch (err) {
      alert(err?.message || t("recommendationsSettings.rebuildFailed"));
    } finally {
      rebuilding.value = false;
    }
  }

  function discardChanges() {
    form.value = JSON.parse(JSON.stringify(original.value));
  }

  function setFlat(key, value) {
    form.value[key] = value;
  }

  function setNested(scorer, payload) {
    form.value[scorer] = { ...form.value[scorer], ...payload };
  }

  function formatNum(n) {
    if (typeof n !== "number") return "0";
    return n.toLocaleString("tr-TR");
  }

  // ─── Inline subcomponents ────────────────────────────────
  const FieldNumber = {
    props: ["label", "modelValue", "min", "max", "step", "help"],
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h("label", { class: "flex flex-col gap-1" }, [
          h("span", { class: "text-xs font-medium text-gray-700" }, props.label),
          h("input", {
            type: "number",
            class:
              "rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-amber-400 focus:outline-none",
            value: props.modelValue,
            min: props.min,
            max: props.max,
            step: props.step,
            onInput: (e) => emit("update:modelValue", Number(e.target.value)),
          }),
          props.help ? h("span", { class: "text-[11px] text-gray-400" }, props.help) : null,
        ]);
    },
  };

  const WeightCard = {
    props: ["title", "weights", "schema"],
    emits: ["update"],
    setup(props, { emit }) {
      return () => {
        const total = props.schema.reduce(
          (sum, item) => sum + (Number(props.weights?.[item.key]) || 0),
          0
        );
        const isUnit = Math.abs(total - 1) < 0.0005;
        return h("div", { class: "card p-4" }, [
          h("div", { class: "flex items-center justify-between mb-3" }, [
            h(
              "h3",
              { class: "text-xs font-bold text-gray-700 uppercase tracking-wide" },
              props.title
            ),
            h(
              "span",
              {
                class: [
                  "text-[11px] font-medium rounded px-1.5 py-0.5",
                  isUnit ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                ],
                title: t("recommendationsSettings.weightSumHint"),
              },
              `Σ ${total.toFixed(2)}`
            ),
          ]),
          h(
            "div",
            { class: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
            props.schema.map((item) =>
              h("label", { key: item.key, class: "flex flex-col gap-1" }, [
                h("span", { class: "text-xs text-gray-600" }, item.label),
                h("input", {
                  type: "number",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  class:
                    "rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-amber-400 focus:outline-none",
                  value: props.weights?.[item.key] ?? 0,
                  onInput: (e) => emit("update", { [item.key]: Number(e.target.value) }),
                }),
              ])
            )
          ),
        ]);
      };
    },
  };

  // ─── Lifecycle ───────────────────────────────────────────
  onMounted(loadAll);
</script>

<style scoped>
  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }
  .hdr-btn-outlined {
    display: inline-flex;
    align-items: center;
    padding: 0.4rem 0.8rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: #fff;
    color: #374151;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .hdr-btn-outlined:hover:not(:disabled) {
    background: #f9fafb;
  }
  .hdr-btn-primary {
    display: inline-flex;
    align-items: center;
    padding: 0.45rem 0.9rem;
    border: 1px solid #f59e0b;
    border-radius: 0.375rem;
    background: #f59e0b;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .hdr-btn-primary:hover:not(:disabled) {
    background: #d97706;
  }
</style>
