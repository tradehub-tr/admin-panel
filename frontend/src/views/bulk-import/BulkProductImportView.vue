<script setup>
  import { ref, computed, watch } from "vue";
  import { useRouter } from "vue-router";
  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import { useToast } from "@/composables/useToast";
  import { useDropzone } from "@/composables/useDropzone";
  import { useBulkImport } from "@/composables/useBulkImport";

  const router = useRouter();
  const toast = useToast();

  const {
    currentStep,
    dataFileId,
    dataFileName,
    dataFileUrl,
    imagesZipId,
    imagesZipName,
    imagesZipUrl,
    headerRow,
    showHeaderPicker,
    previewData,
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

  // Şablon indirme — backend file_url döner, yeni sekmede aç
  const templateDownloading = ref("");

  // Sniffer fallback için fake preview rows. Backend dry_run_preview
  // "sample_rows" döndürebilir; sample'i array olarak bulamazsak boş kalır.
  const sampleRows = computed(() => previewData.value?.sample_rows || []);

  function _validationMsg(kind, file, maxMb, allowedHint) {
    if (kind === "tooLarge") return `"${file.name}" ${maxMb} MB'tan büyük`;
    if (kind === "unreadable")
      return (
        `Dosya okunamadı. Tarayıcı sürükleme sırasında dosya referansını kaybetti. ` +
        `Çözüm: DevTools'u kapatın (F12) veya "Dosyayı seç" butonunu kullanın.`
      );
    return `"${file.name}" ${allowedHint}`;
  }

  const dropzoneData = useDropzone((files) => handleDataFile(files[0]), {
    accept: ".xlsx,.csv,.xml",
    multiple: false,
    maxBytes: 25 * 1024 * 1024,
    onValidationError: (kind, file) => {
      toast.error(_validationMsg(kind, file, 25, "desteklenmeyen format"));
    },
  });

  const dropzoneZip = useDropzone((files) => handleZipFile(files[0]), {
    accept: ".zip,application/zip,application/x-zip-compressed",
    multiple: false,
    maxBytes: 200 * 1024 * 1024,
    onValidationError: (kind, file) => {
      toast.error(_validationMsg(kind, file, 200, "ZIP dosyası olmalı"));
    },
  });

  const dataInputRef = ref(null);
  const zipInputRef = ref(null);

  const DATA_EXTS = [".xlsx", ".xls", ".csv", ".tsv", ".xml"];

  async function handleDataFile(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!DATA_EXTS.some((e) => name.endsWith(e))) {
      toast.error(`"${file.name}" desteklenmeyen format. İzinli: ${DATA_EXTS.join(", ")}`);
      return;
    }
    if (file.size === 0) {
      toast.error("Dosya boş (0 byte). Sayfayı tam yenileyin (Ctrl+Shift+R) ve tekrar deneyin.");
      return;
    }
    const result = await uploadFile(file, false);
    if (result) {
      dataFileId.value = result.id;
      dataFileName.value = result.name;
      dataFileUrl.value = result.url;
      toast.success("Dosya yüklendi");
    }
  }

  async function handleZipFile(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".zip")) {
      toast.error(`"${file.name}" ZIP dosyası olmalı. Resim arşivi yalnız .zip kabul eder.`);
      return;
    }
    if (file.size === 0) {
      toast.error("Dosya boş (0 byte). Sayfayı tam yenileyin (Ctrl+Shift+R) ve tekrar deneyin.");
      return;
    }
    const result = await uploadFile(file, true);
    if (result) {
      imagesZipId.value = result.id;
      imagesZipName.value = result.name;
      imagesZipUrl.value = result.url;
      toast.success("Resim arşivi yüklendi");
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
    // Backend frappe.local.response ile direkt binary stream gönderir.
    // window.open browser'ın download mekanizmasını tetikler — Content-Disposition
    // attachment header'ı dosyayı indirir.
    const url = `/api/method/tradehub_core.bulk_import.api.download_template?format=${encodeURIComponent(format)}`;
    window.open(url, "_blank");
  }

  async function goNextFromFiles() {
    if (!dataFileId.value) {
      toast.error("Önce ürün verisi dosyasını yükleyin");
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

  function goBackToFiles() {
    currentStep.value = 1;
  }

  function goNextFromPreview() {
    // Manuel seçilmesi gereken alan kontrolü — unmapped header'lar boşsa uyar.
    const unmapped = previewData.value?.unmapped_headers || [];
    const missingChoices = unmapped.filter((h) => !Object.values(columnMapping).includes(h));
    if (missingChoices.length && missingChoices.some((h) => !pickedFor(h))) {
      toast.info(`${missingChoices.length} kolon için manuel eşleştirme bekleniyor`);
    }
    currentStep.value = 3;
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
    if (currentStep.value > 1 && !confirm("Sihirbazdan çıkmak istiyor musunuz?")) return;
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
    if (s === "queued") return "Sırada";
    if (s === "running" || s === "in_progress") return "Çalışıyor";
    if (s === "completed" || s === "done") return "Tamamlandı";
    if (s === "partial") return "Kısmen Tamamlandı";
    if (s === "failed" || s === "error") return "Başarısız";
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

  // Adım indicator için yardımcı — adım numarası → durumu (done|current|pending)
  function stepState(n) {
    const cur = currentStep.value;
    if (cur === 99) return "done"; // Progress ekranında hepsi done görünsün
    if (n < cur) return "done";
    if (n === Math.floor(cur)) return "current";
    return "pending";
  }

  // Confidence bar rengi (skor 0..1 arası)
  function confidenceColorClass(score) {
    if (score >= 0.85) return "bg-violet-500";
    if (score >= 0.7) return "bg-blue-500";
    if (score >= 0.5) return "bg-green-500";
    return "bg-amber-400";
  }

  // Kaynak rozet rengi (Adaptive Resolver kaynakları)
  function sourceBadgeClass(source) {
    const s = String(source || "").toLowerCase();
    if (s.includes("profile")) return "bg-violet-100 text-violet-700";
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
    if (s.includes("manuel") || s.includes("manual")) return "Manuel";
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

  // Canonical field listesi — manuel dropdown için. Backend'den gelen sources
  // içindeki anahtarları + sık kullanılan listing field'larını birleştir.
  const canonicalFieldOptions = computed(() => {
    const baseFields = [
      "sku",
      "title",
      "description",
      "base_price",
      "selling_price",
      "stock_qty",
      "available_qty",
      "min_order_qty",
      "product_category",
      "brand",
      "currency",
      "weight",
      "barcode",
    ];
    const fromSources = Object.keys(previewData.value?.sources || {});
    return Array.from(new Set([...baseFields, ...fromSources])).sort();
  });

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
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Toplu Ürün Yükleme</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          Excel, CSV veya XML dosyanızla yüzlerce ürünü tek seferde ekleyin
        </p>
      </div>
      <button
        class="hdr-btn-outlined flex items-center gap-1.5"
        @click="$router.push({ name: 'bulk-import-history' })"
      >
        <AppIcon name="history" :size="13" />
        Geçmiş Yüklemeler
      </button>
    </div>

    <!-- Adım göstergesi (wizard adımları için) -->
    <div v-if="currentStep !== 99" class="step-indicator card !p-4 mb-5">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <div class="step-circle" :class="`step-${stepState(1)}`">
            <AppIcon v-if="stepState(1) === 'done'" name="check" :size="14" />
            <span v-else>1</span>
          </div>
          <span
            class="text-sm font-medium"
            :class="stepState(1) === 'pending' ? 'text-gray-400' : ''"
            >Dosyalar</span
          >
        </div>
        <div class="connector" />
        <div class="flex items-center gap-2">
          <div class="step-circle" :class="`step-${stepState(2)}`">
            <AppIcon v-if="stepState(2) === 'done'" name="check" :size="14" />
            <span v-else>2</span>
          </div>
          <span
            class="text-sm font-medium"
            :class="stepState(2) === 'pending' ? 'text-gray-400' : ''"
            >Önizleme</span
          >
        </div>
        <div class="connector" />
        <div class="flex items-center gap-2">
          <div class="step-circle" :class="`step-${stepState(3)}`">
            <AppIcon v-if="stepState(3) === 'done'" name="check" :size="14" />
            <span v-else>3</span>
          </div>
          <span
            class="text-sm font-medium"
            :class="stepState(3) === 'pending' ? 'text-gray-400' : ''"
            >Mod</span
          >
        </div>
        <div class="connector" />
        <div class="flex items-center gap-2">
          <div class="step-circle" :class="`step-${stepState(4)}`">
            <AppIcon v-if="stepState(4) === 'done'" name="check" :size="14" />
            <span v-else>4</span>
          </div>
          <span
            class="text-sm font-medium"
            :class="stepState(4) === 'pending' ? 'text-gray-400' : ''"
            >Onay</span
          >
        </div>
      </div>
    </div>

    <!-- ADIM 1: DOSYALAR -->
    <div v-if="currentStep === 1" class="card !p-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
            Ürün verisi dosyası
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
            <p class="text-sm font-medium mb-1">Dosyayı sürükleyin veya tıklayın</p>
            <p class="text-xs text-gray-500">.xlsx, .csv, .xml — en fazla 25 MB</p>
            <input
              ref="dataInputRef"
              type="file"
              accept=".xlsx,.csv,.xml"
              class="hidden"
              @change="onDataInputChange"
            />
          </div>
          <div v-else class="file-pill">
            <AppIcon name="file-spreadsheet" :size="16" class="text-violet-500" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ dataFileName }}</p>
              <p class="text-[11px] text-gray-500">Yüklendi</p>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-red-500 transition-colors"
              :title="'Dosyayı kaldır'"
              @click="removeDataFile"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </div>

          <div class="mt-3 flex gap-2 flex-wrap">
            <button
              class="tpl-btn"
              :disabled="templateDownloading === 'xlsx'"
              @click="downloadTemplate('xlsx')"
            >
              <AppIcon name="download" :size="12" />
              Excel Şablonu
            </button>
            <button
              class="tpl-btn"
              :disabled="templateDownloading === 'csv'"
              @click="downloadTemplate('csv')"
            >
              <AppIcon name="download" :size="12" />
              CSV Şablonu
            </button>
            <button
              class="tpl-btn"
              :disabled="templateDownloading === 'xml'"
              @click="downloadTemplate('xml')"
            >
              <AppIcon name="download" :size="12" />
              XML Şablonu
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
            Resim arşivi
            <span class="text-gray-400 text-xs font-normal">(opsiyonel)</span>
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
            <p class="text-sm font-medium mb-1">ZIP dosyasını sürükleyin veya tıklayın</p>
            <p class="text-xs text-gray-500">.zip — en fazla 200 MB</p>
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
              <p class="text-[11px] text-gray-500">Yüklendi</p>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-red-500 transition-colors"
              :title="'Dosyayı kaldır'"
              @click="removeZipFile"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </div>

          <div class="note-info mt-3">
            <AppIcon name="info" :size="13" class="inline-block mr-1" />
            <strong>Otomatik eşleşme:</strong> Resimleri <strong>SKU.jpg</strong> olarak adlandırın
            veya her ürün için <strong>SKU adlı bir klasör</strong> açın. Sistem otomatik tanır.
          </div>
        </div>
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined" @click="cancelWizard">İptal</button>
        <button
          class="hdr-btn-primary flex items-center gap-1.5"
          :disabled="!dataFileId || uploading"
          @click="goNextFromFiles"
        >
          <span>İleri</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 1.5: HEADER SATIRI SEÇİMİ (KOŞULLU) -->
    <div v-else-if="currentStep === 1.5" class="card !p-6">
      <div class="note-warning mb-4">
        <AppIcon name="alert-triangle" :size="14" class="inline-block mr-1" />
        <strong>Otomatik başlık tespiti başarısız oldu.</strong>
        Dosyanın başında başlık dışı satırlar (form, açıklama vb.) bulunmuş olabilir. Lütfen başlık
        satırını seçin.
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
              <th class="px-3 py-2 text-left w-12">#</th>
              <th class="px-3 py-2 text-left">Önizleme</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in sampleRows"
              :key="idx"
              class="border-t border-gray-100 dark:border-[#2a2a35]"
              :class="Number(headerRow) === idx + 1 ? 'bg-violet-50 dark:bg-violet-500/10' : ''"
            >
              <td class="px-3 py-2 font-mono">{{ idx + 1 }}</td>
              <td class="px-3 py-2 text-gray-700 dark:text-gray-300">
                <span v-if="!row?.length" class="italic text-gray-400">(boş satır)</span>
                <span v-else>{{ (row || []).join(" | ") }}</span>
              </td>
            </tr>
            <tr v-if="!sampleRows.length">
              <td colspan="2" class="px-3 py-6 text-center text-gray-400">
                Önizleme satırı alınamadı. Default başlık satırı: 1
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="note-info mt-4">
        <AppIcon name="info" :size="13" class="inline-block mr-1" />
        Sistem ilk 10 satırı analiz eder. %85+ vakada bu ekran otomatik geçilir.
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="goBackToFiles">
          <AppIcon name="arrow-left" :size="13" />
          Geri
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="confirmHeaderRow">
          <span>Başlığı Onayla</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 2: PREVIEW + KOLON EŞLEŞTİRME -->
    <div v-else-if="currentStep === 2" class="card !p-6">
      <div class="note-success mb-4">
        <AppIcon name="check-circle" :size="14" class="inline-block mr-1" />
        <strong>Dosya tarandı:</strong>
        <code class="font-mono text-[11px]">{{ dataFileName }}</code>
        — {{ previewData?.total || 0 }} satır.
        <span v-if="imagesZipName">
          Resim arşivi: <code class="font-mono text-[11px]">{{ imagesZipName }}</code>
        </span>
      </div>

      <!-- Confidence skor başlığı -->
      <div class="confidence-card mb-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div
              class="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide"
            >
              Eşleşme Güven Skoru
            </div>
            <div class="text-3xl font-bold text-violet-600 mt-1">
              {{ (previewData?.confidence_score ?? 0).toFixed(2) }}
              <span class="text-base text-gray-500">/ 1.00</span>
            </div>
          </div>
          <div class="text-xs space-y-1">
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-violet-100 text-violet-700">Profile</span>
              <span>Öğrenilmiş eşleşme</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-blue-100 text-blue-700">Regex</span>
              <span>Sistem pattern</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-emerald-100 text-emerald-700">Semantic</span>
              <span>TF-IDF benzerlik</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="legend-badge bg-amber-100 text-amber-700">Manuel</span>
              <span>Kullanıcı seçimi</span>
            </div>
          </div>
        </div>
      </div>

      <h4 class="minor-title">Tespit Edilen Kolonlar</h4>
      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#2a2a35]">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-gray-50 dark:bg-[#1a1a25]">
              <th class="px-3 py-2 text-left">Excel Başlığı</th>
              <th class="px-3 py-2 text-left">Tespit Edilen Alan</th>
              <th class="px-3 py-2 text-left">Kaynak</th>
              <th class="px-3 py-2 text-left">Confidence</th>
              <th class="px-3 py-2 text-center w-20">Hatırla</th>
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
              <td class="px-3 py-2 font-medium">{{ row.field }}</td>
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
                Eşleştirilmiş kolon bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Eşleştirilemeyen kolonlar -->
      <div v-if="unmappedHeaders.length" class="mt-5">
        <h4 class="minor-title">Manuel Eşleştirme Bekleyen Kolonlar</h4>
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
              <option value="">(yok say)</option>
              <option v-for="opt in canonicalFieldOptions" :key="opt" :value="opt">
                {{ opt }}
              </option>
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
          <div class="text-[11px] text-gray-500">Yeni eklenecek</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-blue-600">
            {{ previewData?.will_update ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Güncellenecek</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-amber-600">
            {{ previewData?.will_skip ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Atlanacak</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-red-500">
            {{ previewData?.will_error ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Hata</div>
        </div>
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="goBackToFiles">
          <AppIcon name="arrow-left" :size="13" />
          Geri
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="goNextFromPreview">
          <span>İleri</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 3: GÜNCELLEME MODU -->
    <div v-else-if="currentStep === 3" class="card !p-6">
      <h4 class="minor-title">Mevcut SKU'lar için davranış</h4>
      <div class="mode-switch-card">
        <BaseSwitch
          v-model="updateMode"
          on-value="upsert"
          off-value="insert_only"
          label="Mevcut ürünleri de güncelle"
          description="Kapalı = sadece yeni ürünler eklenir (önerilen). Açık = aynı SKU varsa üzerine yazılır."
        />
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-3">
          <template v-if="updateMode === 'insert_only'">
            Mevcut SKU'lar atlanır. Yanlışlıkla fiyat/stok ezilmez.
          </template>
          <template v-else>
            Aynı SKU varsa tüm alanlar dosyadan alınır.
            <strong>Dosyada boş bırakılan alan korunur.</strong>
          </template>
        </p>
        <div v-if="updateMode === 'upsert'" class="mode-warning mt-3">
          <AppIcon name="alert-triangle" :size="14" class="inline-block mr-1" />
          <strong>Dikkat:</strong>
          Mevcut ürünlerin alanları dosyadan üzerine yazılır. Geri alınamaz; önizleme önerilir.
        </div>
      </div>

      <div
        class="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]"
      >
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="currentStep = 2">
          <AppIcon name="arrow-left" :size="13" />
          Geri
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="goNextFromMode">
          <span>Önizleme Hesapla</span>
          <AppIcon name="arrow-right" :size="13" />
        </button>
      </div>
    </div>

    <!-- ADIM 4: ONAY -->
    <div v-else-if="currentStep === 4" class="card !p-6">
      <h4 class="minor-title">Yükleme Özeti</h4>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-2xl font-bold text-emerald-600">
            {{ previewData?.will_insert ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Yeni eklenecek</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-blue-600">
            {{ previewData?.will_update ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Güncellenecek</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-amber-600">
            {{ previewData?.will_skip ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Atlanacak</div>
        </div>
        <div class="stat-card">
          <div class="text-2xl font-bold text-red-500">
            {{ previewData?.will_error ?? 0 }}
          </div>
          <div class="text-[11px] text-gray-500">Hata (önceden tespit)</div>
        </div>
      </div>

      <!-- Detay bilgi blokları -->
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Dosya</span>
          <span class="info-value font-mono">{{ dataFileName }}</span>
        </div>
        <div v-if="imagesZipName" class="info-item">
          <span class="info-label">Resim Arşivi</span>
          <span class="info-value font-mono">{{ imagesZipName }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Mod</span>
          <span class="info-value">
            {{ updateMode === "insert_only" ? "Sadece yeni ürünler" : "Güncelleme dahil" }}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Toplam Satır</span>
          <span class="info-value">{{ previewData?.total ?? 0 }}</span>
        </div>
      </div>

      <!-- Örnek hata uyarısı -->
      <div v-if="previewData?.sample_errors?.length" class="note-warning mt-4">
        <AppIcon name="alert-triangle" :size="13" class="inline-block mr-1" />
        <strong>Bazı satırlarda olası hatalar tespit edildi:</strong>
        <ul class="mt-1 ml-5 list-disc text-[11px]">
          <li v-for="(err, idx) in (previewData?.sample_errors || []).slice(0, 5)" :key="idx">
            Satır {{ err.row }}: {{ err.message }}
          </li>
        </ul>
      </div>

      <div class="note-info mt-4">
        <AppIcon name="info" :size="13" class="inline-block mr-1" />
        Yükleme arka planda çalışır. Tarayıcıyı kapatabilirsiniz — Geçmiş Yüklemeler sayfasından
        durumu izleyebilirsiniz.
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
          Geri
        </button>
        <button
          class="hdr-btn-primary flex items-center gap-1.5"
          :disabled="submitting"
          @click="onStartImport"
        >
          <AppIcon
            :name="submitting ? 'loader' : 'rocket'"
            :size="13"
            :class="submitting ? 'animate-spin' : ''"
          />
          <span>{{ submitting ? "Başlatılıyor..." : "Yüklemeyi Başlat" }}</span>
        </button>
      </div>
    </div>

    <!-- PROGRESS EKRANI -->
    <div v-else-if="currentStep === 99" class="card !p-6">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <p class="text-xs text-gray-500">Toplu Yükleme</p>
          <p class="text-base font-bold font-mono">{{ activeJob.name }}</p>
        </div>
        <span class="state-pill" :class="stateClass">{{ stateLabel }}</span>
      </div>

      <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-3 bg-violet-500 transition-all duration-500"
          :style="{ width: progressPct + '%' }"
        />
      </div>
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>{{ activeJob.processed }} / {{ activeJob.total }} satır işlendi</span>
        <span>%{{ progressPct }}</span>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div class="stat-card">
          <div class="text-lg font-bold text-emerald-600">{{ activeJob.inserted }}</div>
          <div class="text-[11px] text-gray-500">Eklendi</div>
        </div>
        <div class="stat-card">
          <div class="text-lg font-bold text-blue-600">{{ activeJob.updated }}</div>
          <div class="text-[11px] text-gray-500">Güncellendi</div>
        </div>
        <div class="stat-card">
          <div class="text-lg font-bold text-amber-600">{{ activeJob.skipped }}</div>
          <div class="text-[11px] text-gray-500">Atlandı</div>
        </div>
        <div class="stat-card">
          <div class="text-lg font-bold text-red-500">{{ activeJob.error_count }}</div>
          <div class="text-[11px] text-gray-500">Hata</div>
        </div>
      </div>

      <div v-if="!isTerminal" class="note-info mt-4">
        <AppIcon name="clock" :size="13" class="inline-block mr-1" />
        Frontend her 3 saniyede durumu yeniler. Tarayıcıyı kapatabilirsiniz — Geçmiş Yüklemeler
        sayfasından izleyebilirsiniz.
      </div>
      <div v-else-if="activeJob.state === 'partial'" class="note-warning mt-4">
        <AppIcon name="alert-triangle" :size="13" class="inline-block mr-1" />
        <strong>Kısmen tamamlandı.</strong>
        {{ activeJob.error_count }} satırda hata var. Detay sayfasından inceleyin.
      </div>
      <div v-else-if="['failed', 'error'].includes(activeJob.state)" class="note-error mt-4">
        <AppIcon name="x-circle" :size="13" class="inline-block mr-1" />
        <strong>Yükleme başarısız.</strong>
        Detay sayfasından hata mesajını görebilirsiniz.
      </div>
      <div v-else class="note-success mt-4">
        <AppIcon name="check-circle" :size="13" class="inline-block mr-1" />
        <strong>Yükleme tamamlandı!</strong>
        Ürünleriniz onay bekliyor durumunda eklendi.
      </div>

      <div class="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a35]">
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          :disabled="!activeJob.name"
          @click="viewJobDetail"
        >
          <AppIcon name="external-link" :size="13" />
          Detayı Gör
        </button>
        <button
          v-if="isTerminal"
          class="hdr-btn-outlined flex items-center gap-1.5"
          @click="startAnother"
        >
          <AppIcon name="plus" :size="13" />
          Yeni Yükleme
        </button>
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          @click="$router.push({ name: 'bulk-import-history' })"
        >
          <AppIcon name="history" :size="13" />
          Geçmişe Dön
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
