<script setup>
  import { ref, reactive, computed, watch, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { downloadFile } from "@/utils/downloadFile";
  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import { useToast } from "@/composables/useToast";
  import { useDropzone } from "@/composables/useDropzone";
  import { useBulkImport } from "@/composables/useBulkImport";
  import { useTaxonomy } from "@/composables/useTaxonomy";
  import { usePageTour } from "@/composables/usePageTour";

  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();

  // Sayfa-içi onboarding: dosya yükleme → kolon eşleştirme → içe aktarımı başlat.
  usePageTour("bulk-product-import", () => [
    {
      target: '[data-tour="bpi-upload"]',
      title: t("tourSteps.page.bpiUpload_t"),
      desc: t("tourSteps.page.bpiUpload_d"),
    },
    {
      target: '[data-tour="bpi-mapping"]',
      title: t("tourSteps.page.bpiMapping_t"),
      desc: t("tourSteps.page.bpiMapping_d"),
    },
    {
      target: '[data-tour="bpi-start"]',
      title: t("tourSteps.page.bpiStart_t"),
      desc: t("tourSteps.page.bpiStart_d"),
    },
  ]);

  const { attributes, listAttributes } = useTaxonomy();

  onMounted(() => {
    listAttributes({ is_active: 1 });
    loadExportCategories();
  });

  // ── Mevcut ürünleri dışa aktar (round-trip: export → düzenle → upsert) ──────
  const exportCategoryOptions = ref([]);
  const exportFilters = reactive({ status: "", product_category: "", search: "" });
  const EXPORT_STATUS_OPTIONS = [
    { value: "Active", label: "Aktif" },
    { value: "Out of Stock", label: "Stokta Yok" },
    { value: "Pending", label: "Onay Bekliyor" },
    { value: "Paused", label: "Duraklatıldı" },
    { value: "Draft", label: "Taslak" },
    { value: "Rejected", label: "Reddedildi" },
  ];

  async function loadExportCategories() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.listing.get_seller_listing_categories"
      );
      exportCategoryOptions.value = res?.message?.categories || [];
    } catch {
      exportCategoryOptions.value = [];
    }
  }

  async function downloadExport(format) {
    // fetch+blob ile indir — boş sonuç/hata olursa toast göster (sunucu hata
    // sayfasına atma).
    const p = new URLSearchParams({ format });
    if (exportFilters.status) p.set("status", exportFilters.status);
    if (exportFilters.product_category) p.set("product_category", exportFilters.product_category);
    if (exportFilters.search.trim()) p.set("search", exportFilters.search.trim());
    try {
      await downloadFile(
        `/api/method/tradehub_core.bulk_import.export.export_seller_listings?${p.toString()}`
      );
    } catch (err) {
      toast.error(err.message);
    }
  }

  const {
    currentStep,
    dataFileId,
    dataFileName,
    dataFileUrl,
    imagesZipId,
    imagesZipName,
    imagesZipUrl,
    headerRow,
    sheetName,
    sheetNames,
    showHeaderPicker,
    previewData,
    imagePreview,
    imageOverrides,
    loadImagePreview,
    columnMapping,
    updateMode,
    uploading,
    submitting,
    activeJob,
    uploadFile,
    loadPreview,
    startImport,
    resetWizard,
  } = useBulkImport();

  // Hatırla toggle'ları — her header için ayrı. Map kullanmıyoruz çünkü
  // template'te key-based reactivity için plain reactive obje yeterli.
  const rememberMap = ref({});

  // Sniffer fallback için fake preview rows. Backend dry_run_preview
  // "sample_rows" döndürebilir; sample'i array olarak bulamazsak boş kalır.
  const sampleRows = computed(() => previewData.value?.sample_rows || []);

  function _validationMsg(kind, file, maxMb, allowedHint) {
    if (kind === "tooLarge") return t("bulkProductImport.fileTooLarge", { name: file.name, maxMb });
    if (kind === "unreadable") return t("bulkProductImport.fileUnreadable");
    return t("bulkProductImport.fileInvalid", { name: file.name, hint: allowedHint });
  }

  const dropzoneData = useDropzone((files) => handleDataFile(files[0]), {
    accept: ".xlsx,.csv,.xml",
    multiple: false,
    maxBytes: 25 * 1024 * 1024,
    onValidationError: (kind, file) => {
      toast.error(_validationMsg(kind, file, 25, t("bulkProductImport.hintUnsupportedFormat")));
    },
  });

  const dropzoneZip = useDropzone((files) => handleZipFile(files[0]), {
    accept: ".zip,application/zip,application/x-zip-compressed",
    multiple: false,
    maxBytes: 50 * 1024 * 1024,
    onValidationError: (kind, file) => {
      toast.error(_validationMsg(kind, file, 200, t("bulkProductImport.hintMustBeZip")));
    },
  });

  const dataInputRef = ref(null);
  const zipInputRef = ref(null);

  const DATA_EXTS = [".xlsx", ".xls", ".csv", ".tsv", ".xml"];

  async function handleDataFile(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!DATA_EXTS.some((e) => name.endsWith(e))) {
      toast.error(
        t("bulkProductImport.unsupportedFormatAllowed", {
          name: file.name,
          allowed: DATA_EXTS.join(", "),
        })
      );
      return;
    }
    if (file.size === 0) {
      toast.error(t("bulkProductImport.fileEmpty"));
      return;
    }
    const result = await uploadFile(file, false);
    if (result) {
      dataFileId.value = result.id;
      dataFileName.value = result.name;
      dataFileUrl.value = result.url;
      toast.success(t("bulkProductImport.fileUploaded"));
    }
  }

  async function handleZipFile(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".zip")) {
      toast.error(t("bulkProductImport.mustBeZipArchive", { name: file.name }));
      return;
    }
    if (file.size === 0) {
      toast.error(t("bulkProductImport.fileEmpty"));
      return;
    }
    const result = await uploadFile(file, true);
    if (result) {
      imagesZipId.value = result.id;
      imagesZipName.value = result.name;
      imagesZipUrl.value = result.url;
      toast.success(t("bulkProductImport.imageArchiveUploaded"));
    }
  }

  function onDataInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleDataFile(file);
    e.target.value = "";
  }

  function onZipInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleZipFile(file);
    e.target.value = "";
  }

  function removeDataFile() {
    dataFileId.value = null;
    dataFileName.value = "";
    dataFileUrl.value = "";
  }

  function removeZipFile() {
    imagesZipId.value = null;
    imagesZipName.value = "";
    imagesZipUrl.value = "";
  }

  function downloadTemplate(format) {
    // Statik şablon — tüm kolonlar hazır. Backend frappe.local.response ile
    // direkt binary stream gönderir; window.open Content-Disposition attachment
    // header'ı sayesinde indirmeyi tetikler.
    const params = new URLSearchParams({ format });
    window.open(`/api/method/tradehub_core.bulk_import.api.download_template?${params}`, "_blank");
  }

  function downloadImageSample() {
    // Örnek görsel arşivi (ZIP): doğru klasör/adlandırma yapısını + OKUBENI.txt
    // rehberini içerir. Backend frappe.local.response ile binary stream gönderir.
    window.open(
      "/api/method/tradehub_core.bulk_import.api.download_image_archive_sample",
      "_blank"
    );
  }

  async function goNextFromFiles() {
    if (!dataFileId.value) {
      toast.error(t("bulkProductImport.uploadDataFileFirst"));
      return;
    }
    // dry_run preview çek; backend low_confidence_fields varsa header picker
    // tetiklenir, yoksa direkt preview adımına geç.
    const result = await loadPreview();
    if (!result) return;
    // Sniffer fallback flag — backend "needs_header_pick" döndürebilir;
    // yoksa unmapped_headers + low confidence durumuyla tahmin et.
    if (result.needs_header_pick) {
      showHeaderPicker.value = true;
      currentStep.value = 1.5;
    } else {
      showHeaderPicker.value = false;
      currentStep.value = 2;
    }
  }

  async function confirmHeaderRow() {
    // Header satırı seçildikten sonra preview'i yenile.
    const result = await loadPreview();
    if (!result) return;
    showHeaderPicker.value = false;
    currentStep.value = 2;
  }

  async function onSheetChange() {
    // Sayfa değişti → başlık satırını yeni sayfa için yeniden tespit ettir.
    headerRow.value = null;
    await loadPreview();
  }

  function goBackToFiles() {
    currentStep.value = 1;
  }

  function goNextFromPreview() {
    // Fiyat sütunu hiç eşleşmediyse devam etme — aksi halde yükleme sırasında
    // tüm satırlar zorunlu-alan hatasıyla reddedilir (BİRİM/BİRİM FİYAT vakası).
    if (!columnMapping.base_price) {
      toast.error(t("bulkProductImport.priceUnmappedBlock"));
      return;
    }
    // Manuel seçilmesi gereken alan kontrolü — unmapped header'lar boşsa uyar.
    const unmapped = previewData.value?.unmapped_headers || [];
    const missingChoices = unmapped.filter((h) => !Object.values(columnMapping).includes(h));
    if (missingChoices.length && missingChoices.some((h) => !pickedFor(h))) {
      toast.info(t("bulkProductImport.manualMappingPending", { count: missingChoices.length }));
    }
    // Görsel ZIP varsa "Görseller" adımına (2.5) gir; yoksa doğrudan Mod'a (3).
    if (imagesZipId.value) {
      loadImagePreview();
      currentStep.value = 2.5;
    } else {
      currentStep.value = 3;
    }
  }

  function confirmImages() {
    currentStep.value = 3;
  }

  // Yetim klasör → SKU ata / yoksay. Boş seçim → atamayı kaldır (varsayılan: yetim kalır).
  function assignOrphan(folder, value) {
    if (!value) delete imageOverrides[folder];
    else imageOverrides[folder] = value;
  }

  function pickedFor(header) {
    // Kullanıcı manuel olarak bir canonical field'a atadı mı?
    return Object.entries(columnMapping).some(([, v]) => v === header);
  }

  function goNextFromMode() {
    // Mod değişti — preview'i yeniden çek (will_update/will_skip değişebilir).
    loadPreview().then(() => {
      currentStep.value = 4;
    });
  }

  async function onStartImport() {
    const result = await startImport();
    if (result?.job_name) {
      // Adım 4'ten progress ekranına geç — özel "progress" step
      currentStep.value = 99;
    }
  }

  function cancelWizard() {
    if (currentStep.value > 1 && !confirm(t("bulkProductImport.confirmExitWizard"))) return;
    resetWizard();
    router.push({ name: "bulk-import-history" }).catch(() => {});
  }

  function viewJobDetail() {
    if (activeJob.name) {
      router.push({ name: "bulk-import-detail", params: { name: activeJob.name } }).catch(() => {});
    }
  }

  function startAnother() {
    resetWizard();
  }

  const stateLabel = computed(() => {
    const s = activeJob.state || "queued";
    if (s === "queued") return t("bulkProductImport.stateQueued");
    if (s === "running" || s === "in_progress") return t("bulkProductImport.stateRunning");
    if (s === "completed" || s === "done") return t("bulkProductImport.stateCompleted");
    if (s === "partial") return t("bulkProductImport.statePartial");
    if (s === "failed" || s === "error") return t("bulkProductImport.stateFailed");
    return s;
  });

  const stateClass = computed(() => {
    const s = activeJob.state || "queued";
    if (["queued", "running", "in_progress"].includes(s)) return "bg-blue-100 text-blue-700";
    if (["completed", "done"].includes(s)) return "bg-emerald-100 text-emerald-700";
    if (s === "partial") return "bg-amber-100 text-amber-700";
    if (["failed", "error"].includes(s)) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  });

  const progressPct = computed(() => {
    if (!activeJob.total) return 0;
    return Math.round((activeJob.processed / activeJob.total) * 100);
  });

  const isTerminal = computed(() =>
    ["completed", "done", "partial", "failed", "error"].includes(activeJob.state)
  );

  // Görsel ZIP varsa "Görseller" adımı (2.5) eklenir. Stepper bu listeden render edilir.
  const wizardSteps = computed(() => {
    const s = [
      { key: 1, label: t("bulkProductImport.stepFiles") },
      { key: 2, label: t("bulkProductImport.stepPreview") },
    ];
    if (imagesZipId.value) s.push({ key: 2.5, label: t("bulkProductImport.stepImages") });
    s.push({ key: 3, label: t("bulkProductImport.stepMode") });
    s.push({ key: 4, label: t("bulkProductImport.stepConfirm") });
    return s;
  });

  // 2.5 gibi ara adımlar için durum: aktif anahtar = listede varsa cur, yoksa floor(cur).
  function stepStateKey(key) {
    const cur = currentStep.value;
    if (cur === 99) return "done";
    const keys = wizardSteps.value.map((x) => x.key);
    const active = keys.includes(cur) ? cur : Math.floor(cur);
    if (key === active) return "current";
    if (key < active) return "done";
    return "pending";
  }

  // Confidence bar rengi (skor 0..1 arası)
  function confidenceColorClass(score) {
    if (score >= 0.85) return "bg-brand-500";
    if (score >= 0.7) return "bg-blue-500";
    if (score >= 0.5) return "bg-green-500";
    return "bg-amber-400";
  }

  // Kaynak rozet rengi (Adaptive Resolver kaynakları)
  function sourceBadgeClass(source) {
    const s = String(source || "").toLowerCase();
    if (s.includes("profile")) return "bg-brand-100 text-brand-800";
    if (s.includes("regex")) return "bg-blue-100 text-blue-700";
    if (s.includes("semantic")) return "bg-emerald-100 text-emerald-700";
    if (s.includes("manuel") || s.includes("manual")) return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  }

  function sourceLabel(source) {
    const s = String(source || "").toLowerCase();
    if (s.includes("profile")) return "Profile";
    if (s.includes("regex")) return "Regex";
    if (s.includes("semantic")) return "Semantic";
    if (s.includes("manuel") || s.includes("manual")) return t("bulkProductImport.sourceManual");
    return source || "—";
  }

  // Mapping satırları için template helper — backend `sources` map'i
  // {canonical_field: source_string} formatında dönüyor.
  const mappingRows = computed(() => {
    const sources = previewData.value?.sources || {};
    const lowConf = previewData.value?.low_confidence_fields || [];
    const conf = previewData.value?.confidence_by_field || {};
    return Object.entries(columnMapping).map(([field, header]) => ({
      field,
      header,
      source: sources[field] || "manual",
      confidence: conf[field] ?? (lowConf.includes(field) ? 0.42 : 0.9),
      isLowConf: lowConf.includes(field),
    }));
  });

  const unmappedHeaders = computed(() => previewData.value?.unmapped_headers || []);

  // Aynı canonical alana birden çok başlık yarıştığında resolver en yüksek
  // skorluyu seçer; kaybeden başlıklar burada raporlanır (ve unmapped listesine
  // düşer). Kullanıcı kazanan yanlışsa kaybedeni dropdown'dan yeniden atayabilir.
  const mappingConflicts = computed(() => previewData.value?.conflicts || []);

  // Manuel eşleme dropdown'ı için sabit canonical hedefler — statik şablonun
  // tüm kolon ailelerini (mini-PIM, varyant) kapsar ki satıcı elle eşlerken
  // attr:/product_type/variant_axis gibi hedefleri de seçebilsin. Etiketler
  // xmlMapping.field.* ile tek kaynaktan paylaşılır.
  const BASIC_FIELD_KEYS = [
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
    "weight",
    "barcode",
    "discount_percentage",
  ];

  // mini-PIM hedefleri — persister Link olarak çözer (product_type vb.).
  const PIM_FIELD_KEYS = ["product_type", "product_family", "attribute_set"];

  // Varyant eksen kolonları — persister variant_axis_N_type/_value okur.
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

  // Çekirdek ek alanlar (Faz 1) — stok/fiyat/kargo detayları + kapak görseli.
  // Bunlar manuel/yeniden eşlemede seçilebilir olmalı (örn. KOLİ İÇİ ADET → stock_uom).
  const DETAIL_FIELD_KEYS = [
    "currency",
    "condition",
    "stock_uom",
    "max_order_qty",
    "low_stock_threshold",
    "sell_in_moq_multiples",
    "track_inventory",
    "allow_backorders",
    "is_free_shipping",
    "shipping_weight",
    "handling_days",
    "ships_from_country",
    "ships_from_city",
    "country_of_origin",
    "video_url",
    "primary_image",
  ];

  // attr:<code> hedefleri — persister attribute_values child'ına yazar.
  // Değer "attr:"+code, etiket Product Attribute.attribute_label.
  const attributeOptions = computed(() =>
    attributes.value.map((a) => ({
      value: `attr:${a.attribute_code}`,
      label: a.attribute_label || a.attribute_label_en || a.attribute_code,
    }))
  );

  const fieldLabel = (f) => t(`xmlMapping.field.${f}`);

  // Gruplu dropdown — optgroup başlıkları bulkProductImport.mapGroup* i18n.
  const fieldGroups = computed(() => [
    {
      label: t("bulkProductImport.mapGroupBasic"),
      options: BASIC_FIELD_KEYS.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
    {
      label: t("bulkProductImport.mapGroupDetails"),
      options: DETAIL_FIELD_KEYS.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
    {
      label: t("bulkProductImport.mapGroupPim"),
      options: PIM_FIELD_KEYS.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
    {
      label: t("bulkProductImport.mapGroupAttributes"),
      options: attributeOptions.value,
    },
    {
      label: t("bulkProductImport.mapGroupVariant"),
      options: VARIANT_FIELD_KEYS.map((f) => ({ value: f, label: fieldLabel(f) })),
    },
  ]);

  function assignUnmapped(header, field) {
    if (!field) {
      // Boş seçim → mevcut atamayı kaldır
      Object.keys(columnMapping).forEach((k) => {
        if (columnMapping[k] === header) delete columnMapping[k];
      });
      return;
    }
    columnMapping[field] = header;
  }

  // Otomatik algılanan alanı kullanıcı yeniden eşler/kaldırır (örn. yanlış
  // KOLİ İÇİ ADET → stock_qty'yi düzeltmek). Eski anahtarı kaldır, yeniyi ata;
  // boş seçim → sütun "eşleşmeyenler"e düşer.
  function reassignField(currentField, newField, header) {
    if (currentField && columnMapping[currentField] === header) {
      delete columnMapping[currentField];
    }
    if (newField) {
      columnMapping[newField] = header;
    }
  }

  // fieldGroups'taki tüm seçilebilir alan değerleri — select'te mevcut alan
  // gruplarda yoksa (örn. image_2, bilinmeyen attr) ham değeri seçenek olarak göster.
  const knownFieldValues = computed(
    () => new Set(fieldGroups.value.flatMap((g) => g.options.map((o) => o.value)))
  );
  const fieldKnown = (f) => knownFieldValues.value.has(f);

  // "Hatırla" değişimi → sadece reactive ref'e yaz; gerçek persist
  // importStart zamanı column_mapping ile birlikte gider (backend remember flag).
  // Şu an template-only state.
  function toggleRemember(field) {
    rememberMap.value[field] = !rememberMap.value[field];
  }

  // Beforeunload uyarısı — aktif job çalışıyorken kapatmasın
  watch(
    () => activeJob.state,
    (s) => {
      const running = ["queued", "running", "in_progress"].includes(s);
      if (running) {
        window.onbeforeunload = (e) => {
          e.preventDefault();
          e.returnValue = "";
        };
      } else {
        window.onbeforeunload = null;
      }
    }
  );
</script>

<template>
  <div class="bulk-import-wizard">
    <!-- Üst başlık -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("bulkProductImport.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ t("bulkProductImport.subtitle") }}
        </p>
      </div>
      <button
        class="hdr-btn-outlined flex items-center gap-1.5"
        @click="$router.push({ name: 'bulk-import-history' })"
      >
        <AppIcon name="history" :size="13" />
        {{ t("bulkProductImport.pastImports") }}
      </button>
    </div>

    <!-- Adım göstergesi (wizard adımları için) -->
    <div v-if="currentStep !== 99" class="step-indicator card !p-4 mb-5">
      <div class="flex items-center gap-4 flex-wrap">
        <template v-for="(step, i) in wizardSteps" :key="step.key">
          <div v-if="i > 0" class="connector" />
          <div class="flex items-center gap-2">
            <div class="step-circle" :class="`step-${stepStateKey(step.key)}`">
              <AppIcon v-if="stepStateKey(step.key) === 'done'" name="check" :size="14" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              class="text-sm font-medium"
              :class="stepStateKey(step.key) === 'pending' ? 'text-gray-400' : ''"
              >{{ step.label }}</span
            >
          </div>
        </template>
      </div>
    </div>

    <!-- ADIM 1: DOSYALAR -->
    <div v-if="currentStep === 1" class="card !p-6" data-tour="bpi-upload">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
            {{ t("bulkProductImport.productDataFile") }}
            <span class="text-red-500">*</span>
          </label>
          <div
            v-if="!dataFileId"
            class="dropzone"
            :class="{ 'dz-over': dropzoneData.isOver.value }"
            @dragenter="dropzoneData.onDragEnter"
            @dragover="dropzoneData.onDragOver"
            @dragleave="dropzoneData.onDragLeave"
            @drop="dropzoneData.onDrop"
            @click="dataInputRef?.click()"
          >
            <AppIcon name="file-spreadsheet" :size="32" class="dz-icon" />
            <p class="text-sm font-medium mb-1">{{ t("bulkProductImport.dropOrClick") }}</p>
            <p class="text-xs text-gray-500">{{ t("bulkProductImport.dataFileHint") }}</p>
            <button type="button" class="tpl-btn mt-3" @click.stop="dataInputRef?.click()">
              <AppIcon name="upload" :size="14" />
              {{ t("bulkProductImport.chooseFile") }}
            </button>
            <input
              ref="dataInputRef"
              type="file"
              accept=".xlsx,.csv,.xml"
              class="hidden"
              @change="onDataInputChange"
            />
          </div>
          <div v-else class="file-pill">
            <AppIcon name="file-spreadsheet" :size="16" class="text-brand-700" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ dataFileName }}</p>
              <p class="text-[11px] text-gray-500">{{ t("bulkProductImport.uploaded") }}</p>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-red-500 transition-colors"
              :title="t('bulkProductImport.removeFile')"
              @click="removeDataFile"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </div>

          <!-- Tek statik şablon — tüm kolonlar hazır, doldurup yükle. -->
          <div class="tpl-download mt-4">
            <div class="tpl-download-head">
              <AppIcon name="download" :size="14" class="text-brand-700" />
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {{ t("bulkProductImport.downloadTemplate") }}
              </span>
            </div>
            <p class="text-[11px] text-gray-500 mb-2.5">
              {{ t("bulkProductImport.downloadTemplateHint") }}
            </p>
            <div class="flex gap-2 flex-wrap">
              <button class="tpl-btn" @click="downloadTemplate('xlsx')">
                <AppIcon name="download" :size="12" />
                {{ t("bulkProductImport.excelTemplate") }}
              </button>
              <button class="tpl-btn" @click="downloadTemplate('csv')">
                <AppIcon name="download" :size="12" />
                {{ t("bulkProductImport.csvTemplate") }}
              </button>
              <button class="tpl-btn" @click="downloadTemplate('xml')">
                <AppIcon name="download" :size="12" />
                {{ t("bulkProductImport.xmlTemplate") }}
              </button>
            </div>
          </div>

          <!-- Mevcut ürünleri dışa aktar — düzenle → upsert ile geri yükle (round-trip) -->
          <div class="tpl-download mt-4">
            <div class="tpl-download-head">
              <AppIcon name="file-down" :size="14" class="text-brand-700" />
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Mevcut ürünlerimi dışa aktar
              </span>
            </div>
            <p class="text-[11px] text-gray-500 mb-2.5">
              Ürünlerini şablon formatında indir, düzenle, "Güncelle (upsert)" moduyla tekrar yükle.
              Aynı kalan SKU'lar güncellenir, çoğalmaz.
            </p>
            <div class="flex flex-col sm:flex-row gap-2 mb-2.5">
              <select
                v-model="exportFilters.status"
                class="form-input-sm w-full sm:w-auto"
                title="Duruma göre"
              >
                <option value="">Tüm durumlar</option>
                <option v-for="o in EXPORT_STATUS_OPTIONS" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
              <select
                v-model="exportFilters.product_category"
                class="form-input-sm w-full sm:w-auto"
                title="Kategoriye göre"
              >
                <option value="">Tüm kategoriler</option>
                <option v-for="c in exportCategoryOptions" :key="c.value" :value="c.value">
                  {{ c.label }}
                </option>
              </select>
              <input
                v-model="exportFilters.search"
                type="text"
                placeholder="Ürün adı / SKU / ilan kodu ara…"
                class="form-input-sm flex-1 min-w-0"
              />
            </div>
            <div class="flex gap-2 flex-wrap">
              <button class="tpl-btn" @click="downloadExport('xlsx')">
                <AppIcon name="file-down" :size="12" />
                Excel olarak indir
              </button>
              <button class="tpl-btn" @click="downloadExport('csv')">
                <AppIcon name="file-down" :size="12" />
                CSV olarak indir
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
            {{ t("bulkProductImport.imageArchive") }}
            <span class="text-gray-400 text-xs font-normal">{{
              t("bulkProductImport.optional")
            }}</span>
          </label>
          <div
            v-if="!imagesZipId"
            class="dropzone"
            :class="{ 'dz-over': dropzoneZip.isOver.value }"
            @dragenter="dropzoneZip.onDragEnter"
            @dragover="dropzoneZip.onDragOver"
            @dragleave="dropzoneZip.onDragLeave"
            @drop="dropzoneZip.onDrop"
            @click="zipInputRef?.click()"
          >
            <AppIcon name="archive" :size="32" class="dz-icon" />
            <p class="text-sm font-medium mb-1">{{ t("bulkProductImport.dropZipOrClick") }}</p>
            <p class="text-xs text-gray-500">{{ t("bulkProductImport.zipHint") }}</p>
            <button type="button" class="tpl-btn mt-3" @click.stop="zipInputRef?.click()">
              <AppIcon name="upload" :size="14" />
              {{ t("bulkProductImport.chooseFile") }}
            </button>
            <input
              ref="zipInputRef"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              class="hidden"
              @change="onZipInputChange"
            />
          </div>
          <div v-else class="file-pill">
            <AppIcon name="archive" :size="16" class="text-blue-500" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ imagesZipName }}</p>
              <p class="text-[11px] text-gray-500">{{ t("bulkProductImport.uploaded") }}</p>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-red-500 transition-colors"
              :title="t('bulkProductImport.removeFile')"
              @click="removeZipFile"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </div>

          <div class="note-info mt-3">
            <AppIcon name="info" :size="13" class="inline-block mr-1" />
            <strong>{{ t("bulkProductImport.autoMatchLabel") }}</strong>
            {{ t("bulkProductImport.autoMatchTextBefore") }} <strong>SKU.jpg</strong>
            {{ t("bulkProductImport.autoMatchTextMiddle") }}
            <strong>{{ t("bulkProductImport.autoMatchFolder") }}</strong>
            {{ t("bulkProductImport.autoMatchTextAfter") }}
          </div>
          <button type="button" class="tpl-btn mt-3" @click="downloadImageSample">
            <AppIcon name="download" :size="14" />
            {{ t("bulkProductImport.downloadImageSample") }}
          </button>
        </div>
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined" @click="cancelWizard">
          {{ t("bulkProductImport.cancel") }}
        </button>
        <button
          class="hdr-btn-primary flex items-center gap-1.5"
          :disabled="!dataFileId || uploading"
          @click="goNextFromFiles"
        >
          <span>{{ t("bulkProductImport.next") }}</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 1.5: HEADER SATIRI SEÇİMİ (KOŞULLU) -->
    <div v-else-if="currentStep === 1.5" class="card !p-6">
      <div class="note-warning mb-4">
        <AppIcon name="alert-triangle" :size="14" class="inline-block mr-1" />
        <strong>{{ t("bulkProductImport.headerDetectFailedTitle") }}</strong>
        {{ t("bulkProductImport.headerDetectFailedText") }}
      </div>

      <div v-if="sheetNames.length > 1" class="field mb-4">
        <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
          {{ t("bulkProductImport.sheetLabel") }}
        </label>
        <select v-model="sheetName" class="header-row-select" @change="onSheetChange">
          <option v-for="s in sheetNames" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div v-if="sampleRows.length" class="field mb-4">
        <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
          Başlık satırı
        </label>
        <select v-model.number="headerRow" class="header-row-select">
          <option v-for="(row, idx) in sampleRows" :key="idx" :value="idx + 1">
            Satır {{ idx + 1 }} — {{ row?.length ? (row || []).join(" | ") : "(boş satır)" }}
          </option>
        </select>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#2a2a35]">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-gray-50 dark:bg-[#1a1a25]">
              <th class="px-3 py-2 text-center w-12">{{ t("bulkProductImport.colSelect") }}</th>
              <th class="px-3 py-2 text-left w-12">#</th>
              <th class="px-3 py-2 text-left">{{ t("bulkProductImport.colPreview") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in sampleRows"
              :key="idx"
              class="border-t border-gray-100 dark:border-[#2a2a35]"
              :class="Number(headerRow) === idx + 1 ? 'bg-brand-50 dark:bg-brand-500/10' : ''"
            >
              <td class="px-3 py-2 font-mono">{{ idx + 1 }}</td>
              <td class="px-3 py-2 text-gray-700 dark:text-gray-300">
                <span v-if="!row?.length" class="italic text-gray-400">{{
                  t("bulkProductImport.emptyRow")
                }}</span>
                <span v-else>{{ (row || []).join(" | ") }}</span>
              </td>
            </tr>
            <tr v-if="!sampleRows.length">
              <td colspan="3" class="px-3 py-6 text-center text-gray-400">
                {{ t("bulkProductImport.noPreviewRow") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="note-info mt-4">
        <AppIcon name="info" :size="13" class="inline-block mr-1" />
        {{ t("bulkProductImport.headerAnalysisNote") }}
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="goBackToFiles">
          <AppIcon name="arrow-left" :size="13" />
          {{ t("bulkProductImport.back") }}
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="confirmHeaderRow">
          <span>{{ t("bulkProductImport.confirmHeader") }}</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 2: PREVIEW + KOLON EŞLEŞTİRME -->
    <div v-else-if="currentStep === 2" class="card !p-6">
      <div class="note-success mb-4">
        <AppIcon name="check-circle" :size="14" class="inline-block mr-1" />
        <strong>{{ t("bulkProductImport.fileScanned") }}</strong>
        <code class="font-mono text-[11px]">{{ dataFileName }}</code>
        — {{ t("bulkProductImport.rowsCount", { count: previewData?.total || 0 }) }}
        <span v-if="imagesZipName">
          {{ t("bulkProductImport.imageArchiveColon") }}
          <code class="font-mono text-[11px]">{{ imagesZipName }}</code>
        </span>
      </div>

      <!-- Confidence skor başlığı -->
      <div class="confidence-card mb-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div
              class="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide"
            >
              {{ t("bulkProductImport.matchConfidenceScore") }}
            </div>
            <div class="text-3xl font-bold text-brand-800 mt-1">
              {{ (previewData?.confidence_score ?? 0).toFixed(2) }}
              <span class="text-base text-gray-500">/ 1.00</span>
            </div>
          </div>
          <div class="text-xs space-y-1">
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-brand-100 text-brand-800">Profile</span>
              <span>{{ t("bulkProductImport.legendProfile") }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-blue-100 text-blue-700">Regex</span>
              <span>{{ t("bulkProductImport.legendRegex") }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-emerald-100 text-emerald-700">Semantic</span>
              <span>{{ t("bulkProductImport.legendSemantic") }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-amber-100 text-amber-700">{{
                t("bulkProductImport.sourceManual")
              }}</span>
              <span>{{ t("bulkProductImport.legendManual") }}</span>
            </div>
          </div>
        </div>
      </div>

      <h4 class="minor-title" data-tour="bpi-mapping">
        {{ t("bulkProductImport.detectedColumns") }}
      </h4>
      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#2a2a35]">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-gray-50 dark:bg-[#1a1a25]">
              <th class="px-3 py-2 text-left">{{ t("bulkProductImport.colExcelHeader") }}</th>
              <th class="px-3 py-2 text-left">{{ t("bulkProductImport.colDetectedField") }}</th>
              <th class="px-3 py-2 text-left">{{ t("bulkProductImport.colSource") }}</th>
              <th class="px-3 py-2 text-left">{{ t("bulkProductImport.colConfidence") }}</th>
              <th class="px-3 py-2 text-center w-20">{{ t("bulkProductImport.colRemember") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in mappingRows"
              :key="row.field"
              class="border-t border-gray-100 dark:border-[#2a2a35]"
              :class="row.isLowConf ? 'bg-amber-50 dark:bg-amber-500/10' : ''"
            >
              <td class="px-3 py-2 font-mono">{{ row.header || "—" }}</td>
              <td class="px-3 py-2">
                <select
                  class="field-input text-xs py-1 w-full"
                  :value="row.field"
                  @change="(e) => reassignField(row.field, e.target.value, row.header)"
                >
                  <option value="">{{ t("bulkProductImport.unmapField") }}</option>
                  <option v-if="!fieldKnown(row.field)" :value="row.field">
                    {{ fieldLabel(row.field) }}
                  </option>
                  <optgroup v-for="group in fieldGroups" :key="group.label" :label="group.label">
                    <option v-for="opt in group.options" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </optgroup>
                </select>
              </td>
              <td class="px-3 py-2">
                <span class="legend-badge" :class="sourceBadgeClass(row.source)">
                  {{ sourceLabel(row.source) }}
                </span>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <div class="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded">
                    <div
                      class="h-1.5 rounded"
                      :class="confidenceColorClass(row.confidence)"
                      :style="{ width: Math.round(row.confidence * 100) + '%' }"
                    />
                  </div>
                  <span class="text-[11px] font-mono">{{ row.confidence.toFixed(2) }}</span>
                </div>
              </td>
              <td class="px-3 py-2 text-center">
                <input
                  v-if="row.isLowConf || row.source === 'semantic'"
                  type="checkbox"
                  :checked="rememberMap[row.field] !== false"
                  class="rounded"
                  @change="toggleRemember(row.field)"
                />
                <span v-else class="text-gray-400">—</span>
              </td>
            </tr>
            <tr v-if="!mappingRows.length">
              <td colspan="5" class="px-3 py-6 text-center text-gray-400">
                {{ t("bulkProductImport.noMappedColumns") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Aynı alana yarışan başlıklar (çakışma uyarısı) -->
      <div v-if="mappingConflicts.length" class="mt-5">
        <h4 class="minor-title">{{ t("bulkProductImport.conflictsTitle") }}</h4>
        <div class="space-y-2">
          <div
            v-for="conflict in mappingConflicts"
            :key="conflict.field"
            class="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-700 text-xs"
          >
            {{
              t("bulkProductImport.conflictRow", {
                field: fieldLabel(conflict.field),
                winner: conflict.winner_header,
                losers: conflict.loser_headers.map((l) => l.header).join(", "),
              })
            }}
          </div>
        </div>
      </div>

      <!-- Eşleştirilemeyen kolonlar -->
      <div v-if="unmappedHeaders.length" class="mt-5">
        <h4 class="minor-title">{{ t("bulkProductImport.columnsAwaitingManualMapping") }}</h4>
        <div class="space-y-2">
          <div
            v-for="header in unmappedHeaders"
            :key="header"
            class="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-700"
          >
            <code class="font-mono text-xs flex-shrink-0 min-w-[140px]">{{ header }}</code>
            <AppIcon name="arrow-right" :size="14" class="text-amber-600" />
            <select
              class="field-input flex-1 text-xs py-1.5"
              @change="(e) => assignUnmapped(header, e.target.value)"
            >
              <option value="">{{ t("bulkProductImport.ignore") }}</option>
              <optgroup v-for="group in fieldGroups" :key="group.label" :label="group.label">
                <option v-for="opt in group.options" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <!-- Sayısal özet -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div class="stat-card">
          <div class="text-2xl font-bold text-emerald-600">
            {{ previewData?.will_insert ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willInsert") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-blue-600">
            {{ previewData?.will_update ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willUpdate") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-amber-600">
            {{ previewData?.will_skip ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willSkip") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-red-500">
            {{ previewData?.will_error ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willError") }}</div>
        </div>
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="goBackToFiles">
          <AppIcon name="arrow-left" :size="13" />
          {{ t("bulkProductImport.back") }}
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="goNextFromPreview">
          <span>{{ t("bulkProductImport.next") }}</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 2.5: GÖRSEL EŞLEŞTİRME (KOŞULLU — ZIP varsa) -->
    <div v-else-if="currentStep === 2.5" class="card !p-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="minor-title !mb-0">{{ t("bulkProductImport.imageStepTitle") }}</h4>
        <span class="text-xs text-gray-500">
          {{
            t("bulkProductImport.imageSummary", {
              images: imagePreview?.total_images || 0,
              groups: (imagePreview?.matched?.length || 0) + (imagePreview?.orphans?.length || 0),
            })
          }}
        </span>
      </div>

      <!-- Eşleşen ürünler -->
      <div v-if="imagePreview?.matched?.length" class="mb-5">
        <h5 class="text-xs font-semibold text-emerald-600 mb-2">
          {{ t("bulkProductImport.imageMatched", { n: imagePreview.matched.length }) }}
        </h5>
        <div class="space-y-1.5">
          <div
            v-for="m in imagePreview.matched"
            :key="m.sku"
            class="flex items-center gap-3 p-2 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-500/5 dark:border-emerald-800"
          >
            <img
              v-if="m.thumb"
              :src="m.thumb"
              class="w-9 h-9 rounded object-cover flex-shrink-0"
              alt=""
            />
            <code class="font-mono text-xs">{{ m.sku }}</code>
            <span class="text-xs text-gray-500 ml-auto">{{
              t("bulkProductImport.imageCount", { n: m.count })
            }}</span>
            <AppIcon name="check" :size="14" class="text-emerald-600" />
          </div>
        </div>
      </div>

      <!-- Eşleşmeyen klasörler -->
      <div v-if="imagePreview?.orphans?.length">
        <h5 class="text-xs font-semibold text-amber-600 mb-2">
          {{ t("bulkProductImport.imageOrphans", { n: imagePreview.orphans.length }) }}
        </h5>
        <div class="space-y-2">
          <div
            v-for="o in imagePreview.orphans"
            :key="o.folder"
            class="flex items-center gap-3 p-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-800"
          >
            <div class="flex -space-x-1 flex-shrink-0">
              <img
                v-for="(th, ti) in (o.thumbs || []).slice(0, 4)"
                :key="ti"
                :src="th"
                class="w-8 h-8 rounded border-2 border-white dark:border-[#16161d] object-cover"
                alt=""
              />
            </div>
            <div class="min-w-0">
              <div class="text-xs font-mono truncate">{{ o.label }}</div>
              <div class="text-[11px] text-gray-500">
                {{ t("bulkProductImport.imageCount", { n: o.count }) }}
              </div>
            </div>
            <select
              class="field-input text-xs py-1.5 ml-auto max-w-[220px]"
              :value="imageOverrides[o.folder] || ''"
              @change="(e) => assignOrphan(o.folder, e.target.value)"
            >
              <option value="">{{ t("bulkProductImport.imageNoAssign") }}</option>
              <option value="__ignore__">{{ t("bulkProductImport.imageIgnore") }}</option>
              <optgroup :label="t('bulkProductImport.imageAssignTo')">
                <option v-for="sku in imagePreview?.skus || []" :key="sku" :value="sku">
                  {{ sku }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <p
        v-if="!imagePreview?.matched?.length && !imagePreview?.orphans?.length"
        class="text-center text-xs text-gray-500 py-6"
      >
        {{ t("bulkProductImport.imageEmpty") }}
      </p>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="currentStep = 2">
          <AppIcon name="arrow-left" :size="13" />
          {{ t("bulkProductImport.back") }}
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="confirmImages">
          <span>{{ t("bulkProductImport.next") }}</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 3: GÜNCELLEME MODU -->
    <div v-else-if="currentStep === 3" class="card !p-6">
      <h4 class="minor-title">{{ t("bulkProductImport.existingSkuBehavior") }}</h4>
      <div>
        <BaseSwitch
          v-model="updateMode"
          on-value="upsert"
          off-value="insert_only"
          :label="t('bulkProductImport.modeUpsertTitle')"
          :description="t('bulkProductImport.modeSwitchDesc')"
        />
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-3">
          <template v-if="updateMode === 'insert_only'">
            {{ t("bulkProductImport.modeInsertOnlyDesc") }}
          </template>
          <template v-else>
            {{ t("bulkProductImport.modeUpsertDescBefore") }}
            <strong>{{ t("bulkProductImport.modeUpsertDescBold") }}</strong>
            {{ t("bulkProductImport.modeUpsertDescAfter") }}
          </template>
        </p>
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          @click="currentStep = imagesZipId ? 2.5 : 2"
        >
          <AppIcon name="arrow-left" :size="13" />
          {{ t("bulkProductImport.back") }}
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="goNextFromMode">
          <span>{{ t("bulkProductImport.calculatePreview") }}</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 4: ONAY -->
    <div v-else-if="currentStep === 4" class="card !p-6">
      <h4 class="minor-title">{{ t("bulkProductImport.importSummary") }}</h4>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-2xl font-bold text-emerald-600">
            {{ previewData?.will_insert ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willInsert") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-blue-600">
            {{ previewData?.will_update ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willUpdate") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-amber-600">
            {{ previewData?.will_skip ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.willSkip") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-red-500">
            {{ previewData?.will_error ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">
            {{ t("bulkProductImport.willErrorPredetected") }}
          </div>
        </div>
      </div>

      <!-- Detay bilgi blokları -->
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">{{ t("bulkProductImport.infoFile") }}</span>
          <span class="info-value font-mono">{{ dataFileName }}</span>
        </div>
        <div v-if="imagesZipName" class="info-item">
          <span class="info-label">{{ t("bulkProductImport.infoImageArchive") }}</span>
          <span class="info-value font-mono">{{ imagesZipName }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ t("bulkProductImport.infoMode") }}</span>
          <span class="info-value">
            {{
              updateMode === "insert_only"
                ? t("bulkProductImport.modeValueInsertOnly")
                : t("bulkProductImport.modeValueUpsert")
            }}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ t("bulkProductImport.infoTotalRows") }}</span>
          <span class="info-value">{{ previewData?.total ?? 0 }}</span>
        </div>
      </div>

      <!-- Örnek hata uyarısı -->
      <div v-if="previewData?.sample_errors?.length" class="note-warning mt-4">
        <AppIcon name="alert-triangle" :size="13" class="inline-block mr-1" />
        <strong>{{ t("bulkProductImport.possibleErrorsDetected") }}</strong>
        <ul class="mt-1 ml-5 list-disc text-[11px]">
          <li v-for="(err, idx) in (previewData?.sample_errors || []).slice(0, 5)" :key="idx">
            {{ t("bulkProductImport.rowLabel", { row: err.row }) }}: {{ err.message }}
          </li>
        </ul>
      </div>

      <div class="note-info mt-4">
        <AppIcon name="info" :size="13" class="inline-block mr-1" />
        {{ t("bulkProductImport.backgroundRunNote") }}
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          :disabled="submitting"
          @click="currentStep = 3"
        >
          <AppIcon name="arrow-left" :size="13" />
          {{ t("bulkProductImport.back") }}
        </button>
        <button
          class="hdr-btn-primary flex items-center gap-1.5"
          :disabled="submitting"
          data-tour="bpi-start"
          @click="onStartImport"
        >
          <AppIcon
            :name="submitting ? 'loader' : 'rocket'"
            :size="13"
            :class="submitting ? 'animate-spin' : ''"
          />
          <span>{{
            submitting ? t("bulkProductImport.starting") : t("bulkProductImport.startImport")
          }}</span>
        </button>
      </div>
    </div>

    <!-- PROGRESS EKRANI -->
    <div v-else-if="currentStep === 99" class="card !p-6">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <p class="text-xs text-gray-500">{{ t("bulkProductImport.bulkImport") }}</p>
          <p class="text-base font-bold font-mono">{{ activeJob.name }}</p>
        </div>
        <span class="state-pill" :class="stateClass">{{ stateLabel }}</span>
      </div>

      <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-3 bg-brand-500 transition-all duration-500"
          :style="{ width: progressPct + '%' }"
        />
      </div>
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>{{
          t("bulkProductImport.rowsProcessed", {
            processed: activeJob.processed,
            total: activeJob.total,
          })
        }}</span>
        <span>%{{ progressPct }}</span>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div class="stat-card">
          <div class="text-lg font-bold text-emerald-600">{{ activeJob.inserted }}</div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.inserted") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-lg font-bold text-blue-600">{{ activeJob.updated }}</div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.updated") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-lg font-bold text-amber-600">{{ activeJob.skipped }}</div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.skipped") }}</div>
        </div>
        <div class="stat-card">
          <div class="text-lg font-bold text-red-500">{{ activeJob.error_count }}</div>
          <div class="text-[11px] text-gray-500">{{ t("bulkProductImport.errors") }}</div>
        </div>
      </div>

      <div v-if="!isTerminal" class="note-info mt-4">
        <AppIcon name="clock" :size="13" class="inline-block mr-1" />
        {{ t("bulkProductImport.autoRefreshNote") }}
      </div>
      <div v-else-if="activeJob.state === 'partial'" class="note-warning mt-4">
        <AppIcon name="alert-triangle" :size="13" class="inline-block mr-1" />
        <strong>{{ t("bulkProductImport.partialDoneTitle") }}</strong>
        {{ t("bulkProductImport.partialDoneText", { count: activeJob.error_count }) }}
      </div>
      <div v-else-if="['failed', 'error'].includes(activeJob.state)" class="note-error mt-4">
        <AppIcon name="x-circle" :size="13" class="inline-block mr-1" />
        <strong>{{ t("bulkProductImport.importFailedTitle") }}</strong>
        {{ t("bulkProductImport.importFailedText") }}
      </div>
      <div v-else class="note-success mt-4">
        <AppIcon name="check-circle" :size="13" class="inline-block mr-1" />
        <strong>{{ t("bulkProductImport.importDoneTitle") }}</strong>
        {{ t("bulkProductImport.importDoneText") }}
      </div>

      <div class="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]">
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          :disabled="!activeJob.name"
          @click="viewJobDetail"
        >
          <AppIcon name="external-link" :size="13" />
          {{ t("bulkProductImport.viewDetail") }}
        </button>
        <button
          v-if="isTerminal"
          class="hdr-btn-outlined flex items-center gap-1.5"
          @click="startAnother"
        >
          <AppIcon name="plus" :size="13" />
          {{ t("bulkProductImport.newImport") }}
        </button>
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          @click="$router.push({ name: 'bulk-import-history' })"
        >
          <AppIcon name="history" :size="13" />
          {{ t("bulkProductImport.backToHistory") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .bulk-import-wizard {
    max-width: 1100px;
    margin: 0 auto;
  }

  .step-indicator {
    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 600;
      transition: background $t-spring;

      &.step-done {
        background: $c-success;
        color: #fff;
      }
      &.step-current {
        background: $brand;
        color: #fff;
      }
      &.step-pending {
        background: $l-bg-muted;
        color: $l-text-500;
      }

      @include dark {
        &.step-pending {
          background: $d-bg-elevated;
          color: $d-text-muted;
        }
      }
    }

    .connector {
      width: 32px;
      height: 1px;
      background: $l-border;
      @include dark {
        background: $d-border;
      }
    }
  }

  .dropzone {
    border: 2px dashed $l-border;
    border-radius: 0.5rem;
    padding: 2rem 1rem;
    text-align: center;
    cursor: pointer;
    transition:
      border-color $t-base,
      background $t-base;

    &:hover,
    &.dz-over {
      border-color: $brand;
      background: rgba($brand, 0.04);
    }

    @include dark {
      border-color: $d-border;
      &:hover,
      &.dz-over {
        border-color: $brand;
        background: rgba($brand, 0.08);
      }
    }

    .dz-icon {
      color: $l-text-400;
      margin-bottom: 0.5rem;
    }
  }

  .file-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: $l-bg-soft;
    border: 1px solid $l-border;
    border-radius: 0.5rem;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .tpl-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
    border: 1px solid $l-border;
    border-radius: 0.4rem;
    background: $l-bg;
    color: $l-text-700;
    transition:
      border-color $t-base,
      color $t-base;

    &:hover:not(:disabled) {
      border-color: $brand;
      color: $brand;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
      &:hover:not(:disabled) {
        border-color: $brand;
        color: $brand-light;
      }
    }
  }

  .tpl-download {
    padding: 0.875rem 1rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    background: $l-bg-soft;

    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
    }

    .tpl-download-head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.25rem;
    }
  }

  .note-info {
    padding: 0.625rem 0.875rem;
    font-size: 0.75rem;
    background: rgba($c-info, 0.08);
    color: #1e40af;
    border: 1px solid rgba($c-info, 0.25);
    border-radius: 0.4rem;
  }

  .note-success {
    padding: 0.625rem 0.875rem;
    font-size: 0.75rem;
    background: rgba($c-success, 0.08);
    color: #15803d;
    border: 1px solid rgba($c-success, 0.25);
    border-radius: 0.4rem;
  }

  .note-warning {
    padding: 0.625rem 0.875rem;
    font-size: 0.75rem;
    background: rgba($c-warning, 0.1);
    color: #9a3412;
    border: 1px solid rgba($c-warning, 0.3);
    border-radius: 0.4rem;
  }

  .note-error {
    padding: 0.625rem 0.875rem;
    font-size: 0.75rem;
    background: rgba($c-error, 0.08);
    color: #b91c1c;
    border: 1px solid rgba($c-error, 0.25);
    border-radius: 0.4rem;
  }

  .minor-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: $l-text-700;
    margin-bottom: 0.75rem;
    margin-top: 0.5rem;

    @include dark {
      color: $d-text;
    }
  }

  .confidence-card {
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    background: linear-gradient(90deg, rgba($brand, 0.06), rgba($c-info, 0.06));
    border: 1px solid rgba($brand, 0.2);

    @include dark {
      background: linear-gradient(90deg, rgba($brand, 0.12), rgba($c-info, 0.1));
      border-color: rgba($brand, 0.3);
    }
  }

  .legend-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 9999px;
  }

  .field-input {
    width: 100%;
    padding: 0.4rem 0.6rem;
    border: 1px solid $l-border;
    border-radius: 0.4rem;
    font-size: 0.8rem;
    background: $l-bg;
    color: $l-text-700;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
      &:focus {
        border-color: $brand;
      }
    }
  }

  .stat-card {
    padding: 1rem;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    text-align: center;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .header-row-select {
    width: 100%;
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    color: $l-text-900;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    outline: none;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus {
      border-color: $brand;
      box-shadow: 0 0 0 2px rgba($brand, 0.18);
    }

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .mode-switch-card {
    padding: 1rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;

    @include dark {
      border-color: $d-border;
    }
  }

  .mode-warning {
    padding: 0.625rem 0.75rem;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #92400e;
    background: rgba($c-warning, 0.12);
    border: 1px solid rgba($c-warning, 0.35);
    border-radius: 0.4rem;

    @include dark {
      color: #fcd34d;
      background: rgba($c-warning, 0.12);
      border-color: rgba($c-warning, 0.3);
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    background: $l-bg-soft;
    border-radius: 0.4rem;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .info-label {
    font-size: 0.7rem;
    color: $l-text-500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .info-value {
    font-size: 0.85rem;
    color: $l-text-900;
    font-weight: 500;

    @include dark {
      color: $d-text-hi;
    }
  }

  .state-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 9999px;
  }
</style>
