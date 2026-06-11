import { ref } from "vue";
import api from "@/utils/api";
import { useToast } from "@/composables/useToast";

const FEED_API = "tradehub_core.bulk_import.feed_api";

/**
 * XML feed (otomatik ürün çekme) servis katmanı.
 * — Satıcı: kendi feed'lerini test/kaydet/sil/önizle/çalıştır.
 * — Admin: tüm satıcıların feed'lerini durumlarıyla listele.
 *
 * Her instance kendi state'ini tutar (modul-level değil) — satıcı view ile
 * admin view aynı anda açılırsa state karışmasın.
 */
export function useFeed() {
  const toast = useToast();

  const feeds = ref([]);
  const loading = ref(false);
  const testing = ref(false);
  const saving = ref(false);
  const running = ref(false);
  const dryRunning = ref(false);
  const loadingRuns = ref(false);

  /** Feed URL'sini çek + parse et, ürün sayısını döndür. */
  async function testFeedUrl(feedUrl) {
    testing.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.test_feed_url`, { feed_url: feedUrl });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Feed testi başarısız");
      return null;
    } finally {
      testing.value = false;
    }
  }

  /** Satıcının kendi feed'lerini yükle. */
  async function listFeeds() {
    loading.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.list_feeds`);
      feeds.value = res.message || [];
      return feeds.value;
    } catch (e) {
      toast.error(e.message || "Feed'ler yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  /** Feed oluştur veya güncelle — backend JSON payload bekliyor. */
  async function saveFeed(payload) {
    saving.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.save_feed`, {
        payload: JSON.stringify(payload),
      });
      toast.success("Feed kaydedildi");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Feed kaydedilemedi");
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function deleteFeed(name) {
    try {
      await api.callMethod(`${FEED_API}.delete_feed`, { name });
      toast.success("Feed silindi");
      feeds.value = feeds.value.filter((f) => f.name !== name);
    } catch (e) {
      toast.error(e.message || "Feed silinemedi");
      throw e;
    }
  }

  /** Feed'i çek + parse et, dry-run özeti döndür. */
  async function previewFeed(feedName) {
    try {
      const res = await api.callMethod(`${FEED_API}.preview_feed`, { feed_name: feedName });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Feed önizlemesi alınamadı");
      return null;
    }
  }

  /** Feed'i çek + parse et, kaydetmeden eklenecek/güncellenecek/atlanacak özeti döndür. */
  async function feedDryRun(feedName) {
    dryRunning.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.feed_dry_run`, { feed_name: feedName });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Deneme çalıştırması başarısız");
      return null;
    } finally {
      dryRunning.value = false;
    }
  }

  /** Feed'in çalıştırma geçmişi + sağlık özetini döndür. */
  async function listFeedRuns(feedName) {
    loadingRuns.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.list_feed_runs`, { feed_name: feedName });
      return res.message;
    } catch (e) {
      toast.error(e.message || "Çalıştırma geçmişi yüklenemedi");
      return null;
    } finally {
      loadingRuns.value = false;
    }
  }

  /** Feed'i hemen çalıştır — backend kuyruğa alır. */
  async function runNow(feedName) {
    running.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.run_now`, { feed_name: feedName });
      toast.success("Feed çekimi kuyruğa alındı");
      return res.message;
    } catch (e) {
      toast.error(e.message || "Feed çalıştırılamadı");
      return null;
    } finally {
      running.value = false;
    }
  }

  /** Admin — tüm satıcıların feed'lerini durumlarıyla yükle. */
  async function listAllFeeds() {
    loading.value = true;
    try {
      const res = await api.callMethod(`${FEED_API}.list_all_feeds`);
      feeds.value = res.message || [];
      return feeds.value;
    } catch (e) {
      toast.error(e.message || "Feed'ler yüklenemedi");
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    feeds,
    loading,
    testing,
    saving,
    running,
    dryRunning,
    loadingRuns,
    testFeedUrl,
    listFeeds,
    saveFeed,
    deleteFeed,
    previewFeed,
    feedDryRun,
    listFeedRuns,
    runNow,
    listAllFeeds,
  };
}
