<script setup>
  import { ref, reactive, computed, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

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

  // Canonical field için TR etiket — UI'da dropdown'da gösterilir.
  // Backend'den ayrı endpoint olmadığı için burada sabit; canonical_fields.py ile senkron tut.
  const FIELD_LABELS = {
    sku: "SKU / Stok Kodu",
    title: "Ürün Adı",
    base_price: "Liste Fiyatı",
    selling_price: "Satış Fiyatı",
    stock_qty: "Stok Adedi",
    min_order_qty: "Min. Sipariş",
    product_category: "Kategori",
    brand: "Marka",
    short_description: "Kısa Açıklama",
    description: "Açıklama",
    tags: "Etiketler",
    weight: "Ağırlık",
    barcode: "Barkod",
    discount_percentage: "İndirim %",
    primary_image: "Ana Resim",
  };

  // `tag_path -> "suggested" | "manual" | null` — rozet için kaynak kaydı
  const sourceMap = reactive({});

  const fieldOptions = computed(() =>
    canonicalFields.value.map((f) => ({
      value: f,
      label: FIELD_LABELS[f] || f,
    }))
  );

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
    // Kullanıcı dropdown'ı değiştirdiyse "Manuel" rozeti ver
    const value = mapping[tagPath];
    if (!value) {
      sourceMap[tagPath] = null;
      return;
    }
    const suggestedTag = suggestedMapping.value[value];
    sourceMap[tagPath] = suggestedTag === tagPath ? "suggested" : "manual";
  }

  async function loadCanonicalFields() {
    // Listing meta üzerinden gelmek yerine sabit listeyi gönderiyoruz çünkü
    // canonical_fields.py 15 sabit field tanımlıyor — bunlar import'un kabul ettiği
    // tek hedef seti. DocType meta tüm field'ları döndürür, çoğu bulk import için
    // anlamsız. Bu yüzden FIELD_LABELS anahtarlarını kullanıyoruz.
    canonicalFields.value = Object.keys(FIELD_LABELS);
  }

  async function discoverSchema() {
    if (!fileId.value) {
      toast.error("Dosya kimliği eksik");
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
      toast.error(e.message || "XML şeması alınamadı");
    }
  }

  async function saveMapping() {
    // Boş mapping engelle — en az 1 eşleşme gerek
    const cleaned = Object.fromEntries(Object.entries(mapping).filter(([, field]) => !!field));
    if (Object.keys(cleaned).length === 0) {
      toast.error("En az bir alan eşleştirmelisiniz");
      return;
    }
    // SKU zorunlu — onsuz import çalışmaz
    const hasSku = Object.values(cleaned).includes("sku");
    if (!hasSku) {
      toast.error("SKU alanı eşleştirilmelidir");
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
        toast.success("Eşleştirme kaydedildi");
      } else {
        toast.success("Eşleştirme uygulandı (kayıt edilmedi)");
      }
      router.push({
        path: "/bulk-import/new",
        query: { xml_mapped: 1, file_id: fileId.value },
      });
    } catch (e) {
      toast.error(e.message || "Eşleştirme kaydedilemedi");
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
      await Promise.all([discoverSchema(), loadCanonicalFields()]);
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
        XML Alan Eşleştirme
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        XML dosyanızdaki etiketleri İstoç ürün alanlarına eşleyin. Önerilen eşleşmeler otomatik
        seçildi — değiştirebilirsiniz.
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
          {{ tags.length }} etiket tespit edildi
          <span class="text-violet-700 dark:text-violet-300">
            • {{ totalItems }} ürün bulundu
          </span>
        </div>
        <div class="text-xs text-violet-700 dark:text-violet-300 mt-1">
          Aşağıdaki tablodan her etiket için karşılık gelen İstoç alanını seçin. "Yok say" işaretli
          etiketler import sırasında atlanır.
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-500 dark:text-gray-400">
      <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
      <div>XML şeması analiz ediliyor…</div>
    </div>

    <!-- Boş durum -->
    <div
      v-else-if="!tags.length"
      class="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
    >
      <i class="fas fa-exclamation-triangle text-3xl mb-3 text-amber-500"></i>
      <div class="font-medium mb-1">Etiket bulunamadı</div>
      <div class="text-xs">
        XML dosyası ürün listesi içermiyor veya tanınmadı. Lütfen dosya formatını kontrol edin.
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
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">XML Etiketi</th>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Örnek Değerler</th>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">İstoç Alanı</th>
            <th class="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 w-28">Kaynak</th>
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
              <div class="text-xs text-gray-400 mt-0.5">{{ tag.count }} satır</div>
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-md">
              <span v-if="tag.sample_values.length">
                {{ tag.sample_values.join(", ") }}
              </span>
              <span v-else class="italic text-gray-400">— örnek yok —</span>
            </td>
            <td class="px-4 py-3">
              <select
                v-model="mapping[tag.path]"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                @change="onMappingChange(tag.path)"
              >
                <option :value="undefined">— Yok say —</option>
                <option
                  v-for="opt in fieldOptions"
                  :key="opt.value"
                  :value="opt.value"
                  :disabled="isOptionDisabled(tag.path, opt.value)"
                >
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td class="px-4 py-3">
              <span
                v-if="sourceMap[tag.path] === 'suggested'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                <i class="fas fa-magic-wand-sparkles text-[10px]"></i> Önerilen
              </span>
              <span
                v-else-if="sourceMap[tag.path] === 'manual'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              >
                <i class="fas fa-user-pen text-[10px]"></i> Manuel
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
        <span>Bu eşleştirmeyi sonraki yüklemelerde otomatik uygula</span>
      </label>

      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :disabled="saving"
          @click="cancel"
        >
          İptal
        </button>
        <button
          type="button"
          class="save-btn px-5 py-2 text-sm font-medium rounded text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="saveMapping"
        >
          <i v-if="saving" class="fas fa-spinner fa-spin mr-1"></i>
          {{ saving ? "Kaydediliyor…" : "Eşleştirmeyi Kaydet ve Yüklemeye Geç" }}
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
