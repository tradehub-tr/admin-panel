import { ref, reactive, onUnmounted } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATES = new Set(["done", "error", "completed", "partial", "failed"]);

/**
 * Toplu ürün yükleme wizard state + polling composable.
 * — Frappe `upload_file` ile dosya yüklenip File DocType name/url alınır.
 * — `dry_run_preview` ile kolon eşleştirme + sayısal özet alınır.
 * — `start_product_import` job kuyruğa alır, `get_import_status` 3sn'de polled.
 *
 * Composable her instance'ta kendi state'ini tutar (modul-level değil) —
 * wizard ile history detail aynı sayfada açılırsa state karışmasın.
 */
export function useBulkImport() {
  const toast = useToast();

  // Wizard navigasyon: 1 = dosyalar, 1.5 = header pick (koşullu),
  // 2 = önizleme + mapping, 3 = mod, 4 = onay özeti
  const currentStep = ref(1);

  // Yüklenen dosyaların Frappe File DocType bilgisi
  const dataFileId = ref(null);
  const dataFileName = ref("");
  const dataFileUrl = ref("");
  const imagesZipId = ref(null);
  const imagesZipName = ref("");
  const imagesZipUrl = ref("");

  // Sniffer fallback (header satırı + sayfa seçimi)
  // null → ilk preview'da backend sniffer ile tahmin eder; sonra detected_* ile dolar.
  const headerRow = ref(null);
  const sheetName = ref("");
  const showHeaderPicker = ref(false);
  const sheetNames = ref([]);

  // dry_run_preview yanıtı (total, will_insert, sample_errors, ...)
  const previewData = ref(null);

  // Görsel önizleme (preview_image_archive yanıtı): {matched, orphans, total_images}
  const imagePreview = ref(null);
  // Yetim klasör atamaları — { folderKey: sku | "__ignore__" | "__pending__:SKU" }
  const imageOverrides = reactive({});

  // Kolon eşleştirmesi — `{ canonical_field: header }` formatı.
  // reactive object: kullanıcı dropdown'dan değiştirince template güncellensin.
  const columnMapping = reactive({});

  const updateMode = ref("insert_only"); // insert_only | upsert
  const uploading = ref(false);
  const submitting = ref(false);

  // Aktif job polling — sayfa kapanırsa stopPolling onUnmounted ile.
  const activeJob = reactive({
    name: null,
    state: "queued",
    total: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    error_count: 0,
  });

  let pollTimer = null;

  /**
   * Bulk import dosya yükleme — base64 JSON POST.
   *
   * **Neden multipart değil?** Frappe `upload_file` multipart/form-data CSRF
   * mismatch (417 / ALPN negotiation failed) hatasına düşer. Aynı sorun
   * `api.uploadCertDocument`'ta çözüldü (base64 JSON), aynı pattern burada.
   *
   * **Neden custom endpoint?** `.xml` security filter tarafından reject
   * ediliyor; bulk_import kontrollü kanal olduğu için bypass'lı.
   */
  async function uploadFile(file, isZip = false) {
    if (!file) return null;
    const maxSize = isZip ? 200 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Dosya çok büyük (en fazla ${isZip ? "200" : "25"} MB)`);
      return null;
    }
    uploading.value = true;
    try {
      // FileReader → base64 data URL
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı"));
        reader.readAsDataURL(file);
      });
      const res = await api.callMethod("tradehub_core.bulk_import.api.upload_bulk_file", {
        file_name: file.name,
        file_content: base64,
        kind: isZip ? "images" : "data",
      });
      const fileDoc = res?.message || {};
      return {
        id: fileDoc.file_id,
        name: fileDoc.file_name,
        url: fileDoc.file_url,
      };
    } catch (e) {
      // DEBUG: tam hata detayını console'a yaz ki teşhis edebilelim
      console.warn("[bulk-import upload] FAIL:", {
        file: file.name,
        size: file.size,
        type: file.type,
        kind: isZip ? "images" : "data",
        error: e,
        message: e.message,
        stack: e.stack,
      });
      toast.error(e.message || "Dosya yüklenemedi");
      return null;
    } finally {
      uploading.value = false;
    }
  }

  async function loadPreview() {
    if (!dataFileUrl.value) return null;
    try {
      const res = await api.callMethod("tradehub_core.bulk_import.api.dry_run_preview", {
        file_id: dataFileId.value,
        mode: updateMode.value,
        header_row: headerRow.value ?? undefined,
        sheet_name: sheetName.value || undefined,
      });
      previewData.value = res.message;
      // Sniffer tespitini ref'lere yansıt — startImport bu kesinleşmiş değerleri
      // gönderir; preview ile import aynı başlık/sayfayı kullanır.
      if (res.message?.detected_header_row != null) headerRow.value = res.message.detected_header_row;
      if (res.message?.detected_sheet) sheetName.value = res.message.detected_sheet;
      sheetNames.value = res.message?.sheet_names || [];
      // Backend'den gelen mapping'i reactive object'e yansıt — eski anahtarları
      // temizleyip yenisini yaz; dropdown defaultları doğru görünsün.
      Object.keys(columnMapping).forEach((k) => delete columnMapping[k]);
      Object.assign(columnMapping, res.message?.resolved_mapping || {});
      return res.message;
    } catch (e) {
      toast.error(e.message || "Önizleme alınamadı");
      return null;
    }
  }

  // Commit öncesi görsel eşleştirme önizlemesi — 'Görseller' adımı bunu kullanır.
  async function loadImagePreview() {
    if (!imagesZipId.value || !dataFileId.value) return null;
    try {
      const res = await api.callMethod("tradehub_core.bulk_import.api.preview_image_archive", {
        images_zip_id: imagesZipId.value,
        file_id: dataFileId.value,
        column_mapping: JSON.stringify(columnMapping),
        header_row: headerRow.value ?? undefined,
        sheet_name: sheetName.value || undefined,
      });
      imagePreview.value = res.message;
      Object.keys(imageOverrides).forEach((k) => delete imageOverrides[k]);
      return res.message;
    } catch (e) {
      toast.error(e.message || "Görsel önizleme alınamadı");
      return null;
    }
  }

  async function startImport() {
    submitting.value = true;
    try {
      const res = await api.callMethod("tradehub_core.bulk_import.api.start_product_import", {
        file_id: dataFileId.value,
        images_zip_id: imagesZipId.value || undefined,
        mode: updateMode.value,
        column_mapping: JSON.stringify(columnMapping),
        header_row: headerRow.value ?? 1,
        sheet_name: sheetName.value || undefined,
        // Onaylanan eşleştirmeyi satıcı profili olarak hatırla (öğrenme döngüsü)
        remember_mapping: 1,
        // Yetim klasör atamaları (SKU'ya ata / yoksay / ileride eşleşsin)
        image_overrides: Object.keys(imageOverrides).length ? JSON.stringify(imageOverrides) : undefined,
      });
      const jobName = res.message?.job_name;
      activeJob.name = jobName;
      activeJob.state = "queued";
      activeJob.total = previewData.value?.total || 0;
      activeJob.processed = 0;
      activeJob.inserted = 0;
      activeJob.updated = 0;
      activeJob.skipped = 0;
      activeJob.error_count = 0;
      toast.success("Toplu yükleme başlatıldı");
      startPolling(jobName);
      return res.message;
    } catch (e) {
      toast.error(e.message || "Yükleme başlatılamadı");
      return null;
    } finally {
      submitting.value = false;
    }
  }

  function startPolling(jobName) {
    stopPolling();
    if (!jobName) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await api.callMethodGET("tradehub_core.bulk_import.api.get_import_status", {
          job_name: jobName,
        });
        const data = res.message || {};
        activeJob.state = data.state || "running";
        activeJob.total = data.total || 0;
        activeJob.processed = data.processed || 0;
        activeJob.inserted = data.inserted || 0;
        activeJob.updated = data.updated || 0;
        activeJob.skipped = data.skipped || 0;
        activeJob.error_count = data.error_count || 0;
        if (TERMINAL_STATES.has(data.state)) stopPolling();
      } catch (e) {
        // Polling sırasında geçici hata olabilir — toast ile gürültü yapma,
        // sadece warn'a yaz. Terminal state gelmezse sonraki tick'te
        // tekrar denenir.
        console.warn("Bulk import polling failed:", e?.message || e);
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function resetWizard() {
    currentStep.value = 1;
    dataFileId.value = null;
    dataFileName.value = "";
    dataFileUrl.value = "";
    imagesZipId.value = null;
    imagesZipName.value = "";
    imagesZipUrl.value = "";
    headerRow.value = null;
    sheetName.value = "";
    sheetNames.value = [];
    showHeaderPicker.value = false;
    previewData.value = null;
    imagePreview.value = null;
    Object.keys(imageOverrides).forEach((k) => delete imageOverrides[k]);
    Object.keys(columnMapping).forEach((k) => delete columnMapping[k]);
    updateMode.value = "insert_only";
    activeJob.name = null;
    activeJob.state = "queued";
    activeJob.total = 0;
    activeJob.processed = 0;
    activeJob.inserted = 0;
    activeJob.updated = 0;
    activeJob.skipped = 0;
    activeJob.error_count = 0;
    stopPolling();
  }

  onUnmounted(stopPolling);

  return {
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
    startPolling,
    stopPolling,
    resetWizard,
  };
}
