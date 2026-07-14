<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useTaxonomy } from "@/composables/useTaxonomy";

  /**
   * VariantWizard — sıfır-bilgi varyant sihirbazı.
   *
   * Kullanıcı JSON / regex GÖRMEZ. Akış:
   *   1. Eksen için taksonomi ÖZELLİĞİ seç (is_variant_axis=1 olanlar önce listelenir).
   *   2. O özelliğin tanımlı option'larından değerleri ÇİP olarak işaretle (serbest yazı yok).
   *   3. Seçilen eksen/değerlerden kartezyen kombinasyon sayısı önizlenir.
   *   4. "Uygula" → parent'a eksen yapılandırması emit edilir; parent mevcut
   *      generateSkuMatrix() akışını çalıştırır (yeni backend yazılmaz).
   *
   * Emit edilen config: [{ name, valuesStr, hasImage }] — ListingFormView'in
   * variantAxes/variant_axes_config modeliyle birebir aynı.
   */

  const { t } = useI18n();
  const { attributes, listAttributes, getAttribute } = useTaxonomy();

  const emit = defineEmits(["apply", "cancel"]);

  const props = defineProps({
    // Mevcut eksen yapılandırması (varsa) — sihirbazı önceden doldurmak için.
    initialAxes: { type: Array, default: () => [] },
  });

  const loading = ref(true);

  // Her eksen: seçili özellik + o özelliğin tüm option'ları + işaretli değerler.
  // axisDef: { attributeName, label, options:[{value,label}], selected:Set, hasImage }
  const axes = ref([]);

  // Özellik option cache'i (attributeName -> [{value,label,colorHex}])
  const optionsCache = new Map();

  const variantAttributes = computed(() => {
    // is_variant_axis=1 olanlar üstte; sadece option'lı tipler eksen olabilir.
    const optionTypes = ["Select", "Multi-Select", "Color"];
    return [...attributes.value]
      .filter((a) => a.is_active && optionTypes.includes(a.data_type))
      .sort((a, b) => {
        if (!!b.is_variant_axis - !!a.is_variant_axis !== 0)
          return !!b.is_variant_axis - !!a.is_variant_axis;
        return (a.attribute_label || "").localeCompare(b.attribute_label || "");
      });
  });

  // Aynı özellik iki eksende seçilemesin diye, bir eksende seçilebilecek özellikler
  // = tümü eksi diğer eksenlerde seçili olanlar.
  function availableAttributes(axisIdx) {
    const usedElsewhere = axes.value
      .filter((_, i) => i !== axisIdx)
      .map((ax) => ax.attributeName)
      .filter(Boolean);
    return variantAttributes.value.filter((a) => !usedElsewhere.includes(a.name));
  }

  function attributeLabel(attr) {
    return attr.attribute_label || attr.attribute_code || attr.name;
  }

  async function loadOptions(attributeName) {
    if (optionsCache.has(attributeName)) return optionsCache.get(attributeName);
    const doc = await getAttribute(attributeName);
    const opts = (doc?.value_options || []).map((o) => ({
      value: o.option_value,
      label: o.option_label || o.option_value,
      colorHex: o.color_hex || "",
    }));
    optionsCache.set(attributeName, opts);
    return opts;
  }

  async function onSelectAttribute(axisIdx) {
    const axis = axes.value[axisIdx];
    axis.options = [];
    axis.selected = new Set();
    if (!axis.attributeName) {
      axis.label = "";
      return;
    }
    const attr = variantAttributes.value.find((a) => a.name === axis.attributeName);
    axis.label = attr ? attributeLabel(attr) : axis.attributeName;
    axis.hasImage = attr?.data_type === "Color";
    axis.options = await loadOptions(axis.attributeName);
  }

  function toggleValue(axis, value) {
    if (axis.selected.has(value)) axis.selected.delete(value);
    else axis.selected.add(value);
    // Set mutasyonu reaktif değil — yeni referans ata.
    axis.selected = new Set(axis.selected);
  }

  function selectAll(axis) {
    axis.selected = new Set(axis.options.map((o) => o.value));
  }

  function clearSelection(axis) {
    axis.selected = new Set();
  }

  function addAxis() {
    if (axes.value.length >= 4) return;
    axes.value.push({
      attributeName: "",
      label: "",
      options: [],
      selected: new Set(),
      hasImage: false,
    });
  }

  function removeAxis(idx) {
    axes.value.splice(idx, 1);
  }

  const previewCount = computed(() => {
    let count = 1;
    let hasAny = false;
    for (const ax of axes.value) {
      if (ax.selected.size > 0) {
        count *= ax.selected.size;
        hasAny = true;
      }
    }
    return hasAny ? count : 0;
  });

  const canApply = computed(() =>
    axes.value.some((ax) => ax.attributeName && ax.selected.size > 0)
  );

  function apply() {
    const config = axes.value
      .filter((ax) => ax.attributeName && ax.selected.size > 0)
      .map((ax) => {
        // Çiplerin görsel sırasını koru (options sırası), seçili olanları al.
        const orderedValues = ax.options
          .filter((o) => ax.selected.has(o.value))
          .map((o) => o.label);
        return {
          name: ax.label,
          valuesStr: orderedValues.join(", "),
          hasImage: !!ax.hasImage,
        };
      });
    emit("apply", config);
  }

  async function hydrateFromInitial() {
    if (!Array.isArray(props.initialAxes) || props.initialAxes.length === 0) {
      addAxis();
      return;
    }
    for (const init of props.initialAxes) {
      // Mevcut eksen adı bir taksonomi özelliğinin label'ıyla eşleşirse o özelliği seç.
      const attr = variantAttributes.value.find(
        (a) => attributeLabel(a) === init.name || a.attribute_code === init.name
      );
      const axis = {
        attributeName: attr?.name || "",
        label: attr ? attributeLabel(attr) : init.name || "",
        options: [],
        selected: new Set(),
        hasImage: !!init.hasImage,
      };
      if (attr) {
        axis.options = await loadOptions(attr.name);
        const wanted = (init.valuesStr || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        // Hem label hem value ile eşleştir (eski kayıtlar value tutmuş olabilir).
        for (const w of wanted) {
          const match = axis.options.find((o) => o.label === w || o.value === w);
          if (match) axis.selected.add(match.value);
        }
        axis.selected = new Set(axis.selected);
      }
      axes.value.push(axis);
    }
    if (axes.value.length === 0) addAxis();
  }

  onMounted(async () => {
    loading.value = true;
    try {
      await listAttributes({ is_active: 1 });
      await hydrateFromInitial();
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="flex items-center justify-center py-8 text-gray-400">
      <AppIcon name="loader" :size="18" class="animate-spin" />
    </div>

    <template v-else>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ t("variantWizard.intro") }}
      </p>

      <div
        v-for="(axis, ai) in axes"
        :key="ai"
        class="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3 space-y-3"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {{ t("variantWizard.axis", { n: ai + 1 }) }}
          </span>
          <button
            v-if="axes.length > 1"
            type="button"
            class="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
            :title="t('variantWizard.removeAxis')"
            @click="removeAxis(ai)"
          >
            <AppIcon name="trash-2" :size="13" />
          </button>
        </div>

        <!-- Özellik seçimi -->
        <div>
          <label class="text-[11px] text-gray-500 mb-1 block">
            {{ t("variantWizard.selectAttribute") }}
          </label>
          <select
            v-model="axis.attributeName"
            class="form-input py-1.5 text-sm w-full"
            @change="onSelectAttribute(ai)"
          >
            <option value="">{{ t("variantWizard.choosePlaceholder") }}</option>
            <option v-for="attr in availableAttributes(ai)" :key="attr.name" :value="attr.name">
              {{ attributeLabel(attr) }}{{ attr.is_variant_axis ? " ★" : "" }}
            </option>
          </select>
        </div>

        <!-- Değer çipleri -->
        <div v-if="axis.attributeName">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-[11px] text-gray-500">
              {{ t("variantWizard.selectValues", { count: axis.selected.size }) }}
            </label>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="text-[10px] text-brand-800 dark:text-brand-500 hover:underline"
                @click="selectAll(axis)"
              >
                {{ t("variantWizard.selectAllValues") }}
              </button>
              <button
                v-if="axis.selected.size > 0"
                type="button"
                class="text-[10px] text-gray-400 hover:text-gray-600 hover:underline"
                @click="clearSelection(axis)"
              >
                {{ t("variantWizard.clearValues") }}
              </button>
            </div>
          </div>

          <p v-if="axis.options.length === 0" class="text-[11px] text-amber-500">
            {{ t("variantWizard.noOptions") }}
          </p>

          <div v-else class="flex flex-wrap gap-1.5">
            <button
              v-for="opt in axis.options"
              :key="opt.value"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
              :class="
                axis.selected.has(opt.value)
                  ? 'variant-chip-on'
                  : 'border-gray-200 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-brand-300'
              "
              @click="toggleValue(axis, opt.value)"
            >
              <span
                v-if="opt.colorHex"
                class="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                :style="{ backgroundColor: opt.colorHex }"
              ></span>
              {{ opt.label }}
              <AppIcon v-if="axis.selected.has(opt.value)" name="check" :size="12" />
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="axes.length < 4"
        type="button"
        class="flex items-center gap-1 text-xs text-brand-800 dark:text-brand-500 hover:underline"
        @click="addAxis"
      >
        <AppIcon name="plus" :size="12" />
        {{ t("variantWizard.addAxis") }}
      </button>

      <div
        class="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-white/5"
      >
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ t("variantWizard.preview", { count: previewCount }) }}
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            @click="emit('cancel')"
          >
            {{ t("variantWizard.cancel") }}
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-brand-ink text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canApply"
            @click="apply"
          >
            <AppIcon name="grid" :size="14" />
            {{ t("variantWizard.generate", { count: previewCount }) }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .variant-chip-on {
    border-color: $brand;
    background: rgba($brand, 0.12);
    color: $brand;
    @include dark {
      background: rgba($brand, 0.22);
      color: $brand-light;
    }
  }
</style>
