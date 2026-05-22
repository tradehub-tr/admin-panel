import { ref } from "vue";
import api from "@/utils/api";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Frappe File API'ye dosya upload helper.
 * api.uploadFile (utils/api.js) sarmalayıcısı — CSRF + credentials
 * yönetimini merkez api modülüne devreder; burada sadece validation
 * + reactive state (progress, error, uploading) yönetilir.
 *
 * Kullanım:
 *   const { upload, progress, error } = useFileUpload();
 *   const url = await upload(file);
 */
export function useFileUpload() {
  const progress = ref(0);
  const error = ref(null);
  const uploading = ref(false);

  function validate(file) {
    if (!file) return "Dosya seçilmedi";
    if (file.size > MAX_SIZE_BYTES) return "Dosya 5MB üstünde";
    if (!ALLOWED_TYPES.includes(file.type)) return "Sadece JPG/PNG/WebP";
    return null;
  }

  async function upload(file, options = {}) {
    error.value = null;
    const validationError = validate(file);
    if (validationError) {
      error.value = validationError;
      throw new Error(validationError);
    }

    uploading.value = true;
    progress.value = 0;

    try {
      const url = await api.uploadFile(file, options.folder || "Home");
      progress.value = 100;
      return url;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      uploading.value = false;
    }
  }

  return { upload, progress, error, uploading, validate };
}
