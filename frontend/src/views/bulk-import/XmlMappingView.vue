<script setup>
  import { ref, reactive, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useTaxonomy } from "@/composables/useTaxonomy";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const { attributes, listAttributes, saveAttribute } = useTaxonomy();

  // Route param — XML dosyasının Frappe File DocType name'i
  const fileId = computed(() => String(route.params.file_id || ""));

  // Backend'ten gelen tag listesi: [{ path, sample_values, count }]
  const tags = ref([]);
  // Suggested mapping (yeşil pre-fill kaynağı) — backend resolver çıktısı
  const suggestedMapping = ref({});
  // Kullanıcı seçimleri — `tag_path -> canonical_field` formatı
  const mapping = reactive({});
  // Hatırla checkbox'ı — default ON (sonraki yüklemelerde otomatik uygulansın)
  const rememberMapping = ref(true);
  // Canonical Listing field listesi (dropdown opsiyonları)
  const canonicalFields = ref([]);
  // Header bilgisi
  const totalItems = ref(0);
  const loading = ref(true);
  const saving = ref(false);

  // Canonical field anahtarları — UI'da dropdown'da i18n etiketle gösterilir.
  // Backend'den ayrı endpoint olmadığı için burada sabit; canonical_fields.py ile senkron tut.
  const FIELD_KEYS = [
    "sku",
    "title",
    "base_price",
    "selling_price",
    "stock_qty",
    "min_order_qty",
    "product_category",
    "brand",
    "short_description",
    "description",
    "tags",
    "weight",
    "barcode",
    "discount_percentage",
    "primary_image",
  ];

  // mini-PIM hedef alanları — persister bunları Link olarak çözer (product_type vb.).
  // canonical_fields.py'de yok; mapping payload'a pass-through olarak gider.
  const PIM_FIELD_KEYS = ["product_type", "product_family", "attribute_set"];

  // Varyant eksen kolonları — persister `variant_axis_N_type` / `_value` okur.
  // Varyantsız ürünlerde eşlenmez; backend _TEMPLATE_VARIANT_COLUMNS_EN ile senkron.
  const VARIANT_FIELD_KEYS = [
    "parent_sku",
    "variant_sku",
    "variant_axis_1_type",
    "variant_axis_1_value",
    "variant_axis_2_type",
    "variant_axis_2_value",
    "variant_axis_3_type",
    "variant_axis_3_value",
    "variant_price",
    "variant_stock",
  ];

  function fieldLabel(f) {
    return t(`xmlMapping.field.${f}`);
  }

  // `tag_path -> "suggested" | "manual" | null` — rozet için kaynak kaydı
  const sourceMap = reactive({});

  // attr:<code> hedefleri — persister'ın attribute_values child'ına yazacağı
  // özellik kolonları. Değer "attr:"+code, etiket Product Attribute.attribute_label.
  const attributeOptions = computed(() =>
    attributes.value.map((a) => ({
      value: `attr:${a.attribute_code}`,
      label: a.attribute_label || a.attribute_code,
    }))
  );

  // Gruplu dropdown — optgroup başlıkları i18n. "Yeni özellik" sentinel value
  // (__new_attr__) Özellikler grubunun sonunda ayrı seçenek olarak gösterilir.
  const NEW_ATTR_VALUE = "__new_attr__";

  const fieldGroups = computed(() => [
    {
      label: t("xmlMapping.groupBasic"),
      options: canonicalFields.value.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
    {
      label: t("xmlMapping.groupPim"),
      options: PIM_FIELD_KEYS.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
    {
      label: t("xmlMapping.groupAttributes"),
      options: [
        ...attributeOptions.value,
        { value: NEW_ATTR_VALUE, label: t("xmlMapping.newAttributeOption") },
      ],
    },
    {
      label: t("xmlMapping.groupVariant"),
      options: VARIANT_FIELD_KEYS.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
  ]);

  // Aynı canonical field iki tag'e atanmasın diye — kullanılan field set'i
  const usedFields = computed(() => {
    const used = new Set();
    for (const v of Object.values(mapping)) {
      if (v) used.add(v);
    }
    return used;
  });

  function isOptionDisabled(tagPath, fieldValue) {
    // Mevcut tag'in seçimini disable etme — diğer tag'lerin aldığı field'ları disable et
    return mapping[tagPath] !== fieldValue && usedFields.value.has(fieldValue);
  }

  function onMappingChange(tagPath) {
    const value = mapping[tagPath];
    // "Yeni özellik oluştur" seçilince inline form aç; dropdown'ı boşalt —
    // gerçek attr:<code> değeri oluşturma bitince atanır.
    if (value === NEW_ATTR_VALUE) {
      openNewAttribute(tagPath);
      mapping[tagPath] = undefined;
      sourceMap[tagPath] = null;
      return;
    }
    // Kullanıcı dropdown'ı değiştirdiyse "Manuel" rozeti ver
    if (!value) {
      sourceMap[tagPath] = null;
      return;
    }
    const suggestedTag = suggestedMapping.value[value];
    sourceMap[tagPath] = suggestedTag === tagPath ? "suggested" : "manual";
  }

  // Inline yeni Product Attribute oluşturma — hangi tag için açıldığını tutar.
  const newAttrTag = ref(null);
  const newAttrLabel = ref("");
  const creatingAttr = ref(false);

  function openNewAttribute(tagPath) {
    newAttrTag.value = tagPath;
    newAttrLabel.value = "";
  }

  function cancelNewAttribute() {
    newAttrTag.value = null;
    newAttrLabel.value = "";
  }

  // Etiketten attribute_code türet — küçük harf, alfanumerik dışı _ , Türkçe
  // karakterler ASCII'ye indirgenir (backend autoname field:attribute_code).
  function slugifyCode(label) {
    const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
    return label
      .trim()
      .toLowerCase()
      .replace(/[çğıöşü]/g, (ch) => map[ch] || ch)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  async function confirmNewAttribute() {
    const label = newAttrLabel.value.trim();
    const tagPath = newAttrTag.value;
    if (!label || !tagPath) return;
    const code = slugifyCode(label);
    if (!code) {
      toast.error(t("xmlMapping.errorAttrCodeInvalid"));
      return;
    }
    creatingAttr.value = true;
    try {
      await saveAttribute({
        attribute_code: code,
        attribute_label: label,
        data_type: "Text",
        is_active: 1,
      });
      await listAttributes();
      mapping[tagPath] = `attr:${code}`;
      sourceMap[tagPath] = "manual";
      cancelNewAttribute();
    } catch {
      // saveAttribute hatayı toast'ladı
    } finally {
      creatingAttr.value = false;
    }
  }

  async function loadCanonicalFields() {
    // Listing meta üzerinden gelmek yerine sabit listeyi gönderiyoruz çünkü
    // canonical_fields.py 15 sabit field tanımlıyor — bunlar import'un kabul ettiği
    // tek hedef seti. DocType meta tüm field'ları döndürür, çoğu bulk import için
    // anlamsız. Bu yüzden FIELD_KEYS anahtarlarını kullanıyoruz.
    canonicalFields.value = [...FIELD_KEYS];
  }

  async function discoverSchema() {
    if (!fileId.value) {
      toast.error(t("xmlMapping.errorMissingFileId"));
      return;
    }
    try {
      const res = await api.callMethodGET("tradehub_core.bulk_import.api.discover_xml_schema", {
        file_id: fileId.value,
      });
      const data = res.message || {};
      tags.value = data.tags || [];
      totalItems.value = data.total_items || 0;
      suggestedMapping.value = data.suggested_mapping || {};

      // Suggested mapping'i reactive'e yansıt — canonical → tag yerine
      // tag → canonical formatına çevir (UI dropdown'ları tag bazlı)
      for (const [field, tagPath] of Object.entries(suggestedMapping.value)) {
        if (tagPath && !mapping[tagPath]) {
          mapping[tagPath] = field;
          sourceMap[tagPath] = "suggested";
        }
      }
    } catch (e) {
      toast.error(e.message || t("xmlMapping.errorSchemaFailed"));
    }
  }

  async function saveMapping() {
    // Boş mapping engelle — en az 1 eşleşme gerek
    const cleaned = Object.fromEntries(Object.entries(mapping).filter(([, field]) => !!field));
    if (Object.keys(cleaned).length === 0) {
      toast.error(t("xmlMapping.errorNoMapping"));
      return;
    }
    // SKU zorunlu — onsuz import çalışmaz
    const hasSku = Object.values(cleaned).includes("sku");
    if (!hasSku) {
      toast.error(t("xmlMapping.errorSkuRequired"));
      return;
    }

    // Backend `canonical_field: tag_path` bekliyor — invert et
    const inverted = {};
    for (const [tagPath, field] of Object.entries(cleaned)) {
      inverted[field] = tagPath;
    }

    saving.value = true;
    try {
      if (rememberMapping.value) {
        await api.callMethod("tradehub_core.bulk_import.api.save_xml_mapping", {
          file_id: fileId.value,
          mapping: JSON.stringify(inverted),
          source_format: "xml",
        });
        toast.success(t("xmlMapping.mappingSaved"));
      } else {
        toast.success(t("xmlMapping.mappingApplied"));
      }
      router.push({
        path: "/bulk-import/new",
        query: { xml_mapped: 1, file_id: fileId.value },
      });
    } catch (e) {
      toast.error(e.message || t("xmlMapping.errorSaveFailed"));
    } finally {
      saving.value = false;
    }
  }

  function cancel() {
    router.push({ path: "/bulk-import/new" });
  }

  onMounted(async () => {
    loading.value = true;
    try {
      await Promise.all([
        discoverSchema(),
        loadCanonicalFields(),
        listAttributes({ is_active: 1 }),
      ]);
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <div class="max-w-6xl mx-auto py-6 px-4 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <i class="fas fa-sitemap text-violet-500"></i>
        {{ t("xmlMapping.title") }}
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {{ t("xmlMapping.subtitle") }}
      </p>
    </div>

    <!-- Özet bilgi -->
    <div
      v-if="!loading"
      class="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4 mb-6 flex items-start gap-3"
    >
      <i class="fas fa-file-code text-violet-600 dark:text-violet-400 mt-0.5"></i>
      <div class="text-sm">
        <div class="font-medium text-violet-900 dark:text-violet-100">
          {{ t("xmlMapping.tagsDetected", { count: tags.length }) }}
          <span class="text-violet-700 dark:text-violet-300">
            • {{ t("xmlMapping.itemsFound", { count: totalItems }) }}
          </span>
        </div>
        <div class="text-xs text-violet-700 dark:text-violet-300 mt-1">
          {{ t("xmlMapping.summaryHint") }}
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-500 dark:text-gray-400">
      <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
      <div>{{ t("xmlMapping.analyzing") }}</div>
    </div>

    <!-- Boş durum -->
    <div
      v-else-if="!tags.length"
      class="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
    >
      <i class="fas fa-exclamation-triangle text-3xl mb-3 text-amber-500"></i>
      <div class="font-medium mb-1">{{ t("xmlMapping.noTags") }}</div>
      <div class="text-xs">
        {{ t("xmlMapping.noTagsHint") }}
      </div>
    </div>

    <!-- Tag mapping tablosu -->
    <div
      v-else
      class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900/50 text-left text-xs uppercase tracking-wider">
          <tr>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              {{ t("xmlMapping.colXmlTag") }}
            </th>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              {{ t("xmlMapping.colSampleValues") }}
            </th>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              {{ t("xmlMapping.colIstocField") }}
            </th>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 w-28">
              {{ t("xmlMapping.colSource") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tag in tags"
            :key="tag.path"
            :class="[
              'border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40',
              mapping[tag.path] ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : '',
            ]"
          >
            <td class="px-4 py-3">
              <code class="font-mono text-xs text-violet-700 dark:text-violet-300">
                {{ tag.path }}
              </code>
              <div class="text-xs text-gray-400 mt-0.5">
                {{ t("xmlMapping.rowsCount", { count: tag.count }) }}
              </div>
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-md">
              <span v-if="tag.sample_values.length">
                {{ tag.sample_values.join(", ") }}
              </span>
              <span v-else class="italic text-gray-400">{{ t("xmlMapping.noSample") }}</span>
            </td>
            <td class="px-4 py-3">
              <select
                v-model="mapping[tag.path]"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                @change="onMappingChange(tag.path)"
              >
                <option :value="undefined">{{ t("xmlMapping.ignore") }}</option>
                <optgroup v-for="group in fieldGroups" :key="group.label" :label="group.label">
                  <option
                    v-for="opt in group.options"
                    :key="opt.value"
                    :value="opt.value"
                    :disabled="
                      opt.value !== NEW_ATTR_VALUE && isOptionDisabled(tag.path, opt.value)
                    "
                  >
                    {{ opt.label }}
                  </option>
                </optgroup>
              </select>

              <!-- Inline yeni özellik oluşturma — sadece bu tag için açıldıysa -->
              <div
                v-if="newAttrTag === tag.path"
                class="mt-2 flex items-center gap-2 rounded border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-2"
              >
                <input
                  v-model="newAttrLabel"
                  type="text"
                  :placeholder="t('xmlMapping.newAttributePlaceholder')"
                  class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  @keyup.enter="confirmNewAttribute"
                />
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs font-medium rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="creatingAttr || !newAttrLabel.trim()"
                  @click="confirmNewAttribute"
                >
                  <i v-if="creatingAttr" class="fas fa-spinner fa-spin"></i>
                  <span v-else>{{ t("xmlMapping.newAttributeCreate") }}</span>
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  :disabled="creatingAttr"
                  @click="cancelNewAttribute"
                >
                  {{ t("xmlMapping.cancel") }}
                </button>
              </div>
            </td>
            <td class="px-4 py-3">
              <span
                v-if="sourceMap[tag.path] === 'suggested'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                <i class="fas fa-magic-wand-sparkles text-[10px]"></i>
                {{ t("xmlMapping.sourceSuggested") }}
              </span>
              <span
                v-else-if="sourceMap[tag.path] === 'manual'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              >
                <i class="fas fa-user-pen text-[10px]"></i> {{ t("xmlMapping.sourceManual") }}
              </span>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form altı: hatırla + butonlar -->
    <div v-if="!loading && tags.length" class="flex flex-col gap-4">
      <label
        class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
      >
        <input
          v-model="rememberMapping"
          type="checkbox"
          class="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <span>{{ t("xmlMapping.rememberMapping") }}</span>
      </label>

      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :disabled="saving"
          @click="cancel"
        >
          {{ t("xmlMapping.cancel") }}
        </button>
        <button
          type="button"
          class="save-btn px-5 py-2 text-sm font-medium rounded text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="saveMapping"
        >
          <i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>
          {{ saving ? t("xmlMapping.saving") : t("xmlMapping.saveAndContinue") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .save-btn {
    background: $brand;
    transition: background $t-base;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, $brand 85%, #000);
    }
  }

  // Disabled option'lar dropdown'da soluk görünsün
  select option:disabled {
    color: #9ca3af;
  }
</style>
