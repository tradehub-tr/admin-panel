import { ref } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const CATALOG_API = "tradehub_core.api.catalog_integration";

/**
 * Ürün API'si bağlantı yönetimi (MOGEM-665) — satıcı paneli servis katmanı.
 * — Bağlantı bilgisi oluştur/yenile/kapat (sır yalnız oluşturma cevabında döner).
 * — Webhook adresi + imza sırrı.
 * — Giden stok olayları (webhook iletim durumu) + elle yeniden kuyruğa alma.
 *
 * Her instance kendi state'ini tutar (modul-level değil) — useFeed ile aynı desen.
 */
export function useCatalogApi() {
  const toast = useToast();

  const loading = ref(false);
  const saving = ref(false);
  const rotating = ref(false);
  const loadingEvents = ref(false);

  /** Bağlantı özeti — sır içermez (`has_secret` bayrağı döner). */
  async function getConnection() {
    loading.value = true;
    try {
      const res = await api.callMethod(`${CATALOG_API}.get_connection`);
      return res.message;
    } catch (e) {
      toast.error(e.message || "Bağlantı bilgisi yüklenemedi");
      return null;
    } finally {
      loading.value = false;
    }
  }

  /** Yoksa oluştur, varsa sırrı yenile — `client_secret` YALNIZ bu cevapta gelir. */
  async function createOrRotate() {
    rotating.value = true;
    try {
      const res = await api.callMethod(`${CATALOG_API}.create_or_rotate_credentials`);
      return res.message;
    } catch (e) {
      toast.error(e.message || "Bağlantı oluşturulamadı");
      return null;
    } finally {
      rotating.value = false;
    }
  }

  async function setWebhook(webhookUrl, webhookSecret) {
    saving.value = true;
    try {
      const res = await api.callMethod(`${CATALOG_API}.set_webhook`, {
        webhook_url: webhookUrl || "",
        webhook_secret: webhookSecret || "",
      });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Webhook kaydedilemedi");
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function revoke() {
    saving.value = true;
    try {
      const res = await api.callMethod(`${CATALOG_API}.revoke_credentials`);
      return res.message;
    } catch (e) {
      toast.error(e.message || "Bağlantı kapatılamadı");
      return null;
    } finally {
      saving.value = false;
    }
  }

  /** Giden stok olayları: {events, total, counts} — sayfalı, isteğe bağlı durum süzgeci. */
  async function listEvents({ status = "", limit = 20, offset = 0 } = {}) {
    loadingEvents.value = true;
    try {
      const res = await api.callMethod(`${CATALOG_API}.list_outbound_events`, {
        status,
        limit,
        offset,
      });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Stok olayları yüklenemedi");
      return null;
    } finally {
      loadingEvents.value = false;
    }
  }

  async function retryEvent(name) {
    try {
      const res = await api.callMethod(`${CATALOG_API}.retry_outbound_event`, { name });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Olay yeniden kuyruğa alınamadı");
      return null;
    }
  }

  return {
    loading,
    saving,
    rotating,
    loadingEvents,
    getConnection,
    createOrRotate,
    setWebhook,
    revoke,
    listEvents,
    retryEvent,
  };
}
