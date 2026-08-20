import { computed, ref } from "vue";

import api from "@/utils/api";

/**
 * Öksüz dosya raporu — hiçbir taranan kaynak alanda geçmeyen ve
 * yüklenmesinin üzerinden N gün geçmiş dosyalar (T-043'ün ikinci yarısı).
 *
 * Uç uydurulmadı: `tradehub_core.api.seller_media.list_orphans`. Mağaza
 * parametresi YOK ve olmayacak — arka taraf mağazayı oturumdan çözüyor
 * (`get_my_usage` ile aynı kural, aynı gerekçe).
 *
 * ── Bu rapor bir SİLME listesi DEĞİL ─────────────────────────────
 *
 * Uç yalnız listeler; silme mevcut çöp akışından geçer. Rapor 57'nin
 * dersi: kullanım koruması yolun yarısına bağlıyken GC 3.821 dosyayı
 * silecekti. Bu ekran o hatanın görünürlük tarafı — karar değil, döküm.
 *
 * ── Taramanın SINIRI (ekran bunu gizlemez) ───────────────────────
 *
 * Öksüz kararı `media/usage.py`'deki SABİT kaynak listesinin istek anında
 * taranmasından çıkıyor — kalıcı bir kullanım dizini yok (`useMediaUsage`
 * scanNote'u ile aynı sınır). Kullanım taraması hangi alanı görmüyorsa
 * öksüz kararı da onu görmüyor: listede olmayan bir alanda geçen dosya
 * burada YANLIŞLIKLA öksüz görünebilir. Geçmiş izleri (sürüm / silinmiş
 * kayıt) karara dahil değil; arka taraf bunu `scan.history_scanned=false`
 * ile söylüyor, taranamayan alan olursa adları `scan.failed_sources`'ta.
 *
 * ── Boş durumlar BİRİNCİ SINIF (useMediaUsage sözleşmesi) ────────
 *
 *   total === null → HENÜZ SORULMADI ya da cevap gelmedi; "öksüz yok"
 *                    diye GÖSTERİLEMEZ.
 *   total === 0    → arka taraf yanıtladı: taranan kaynaklara göre öksüz yok.
 *   denied         → yetki reddi — arıza değil, ayrı bayrak.
 *   error          → gerçekten bir şey kırıldı.
 */

const YOL = "tradehub_core.api.seller_media";

/** Frappe yanıtı gövdeyi `message` içine sarar (bkz. useSellerMedia.ac). */
function ac(res) {
  return res?.message ?? res ?? {};
}

/** @param {unknown} e @returns {boolean} Yetki reddi mi, gerçek arıza mı. */
function isDenied(e) {
  return e?.status === 403 || e?.code === "PermissionError";
}

/** Arka taraf satırı → ekranın beklediği kayıt. */
function bicimle(row) {
  return {
    fileUrl: row.file_url || "",
    fileName: row.file_name || (row.file_url || "").split("/").pop() || "",
    bytes: Number(row.file_size) || 0,
    uploadedAt: row.uploaded_at || "",
    lastChecked: row.last_checked || "",
  };
}

export function useMediaOrphans(fetcher, { pageLength = 20 } = {}) {
  // Varsayılan kaynak satıcı ucu; test kendi getiricisini enjekte eder.
  const varsayilan = async (params) => ac(await api.callMethodGET(`${YOL}.list_orphans`, params));
  const getir = fetcher || varsayilan;

  /** Birikimli sayfa — `loadMore` üstüne ekler, `load` sıfırlar. */
  const items = ref([]);
  /** `null` = HENÜZ SORULMADI/CEVAP GELMEDİ. 0 ile karıştırılamaz. */
  const total = ref(null);
  const loading = ref(false);
  const denied = ref(false);
  const error = ref("");
  const daysUnused = ref(30);
  /** Arka tarafın tarama sınırı beyanı — ekran notu bunu da gösterir. */
  const scan = ref(null);
  const scannedAt = ref("");

  const hasMore = computed(() => total.value !== null && items.value.length < total.value);
  const isEmpty = computed(() => total.value === 0);

  async function _fetch(start) {
    loading.value = true;
    error.value = "";
    denied.value = false;
    try {
      const ham = await getir({
        days_unused: daysUnused.value,
        start,
        page_length: pageLength,
      });
      const yeni = (ham.items || []).map(bicimle);
      items.value = start === 0 ? yeni : [...items.value, ...yeni];
      total.value = Number(ham.total) || 0;
      scan.value = ham.scan || null;
      scannedAt.value = ham.scanned_at || "";
    } catch (e) {
      if (isDenied(e)) denied.value = true;
      else error.value = e?.message || "unknown";
      // Cevapsız durumda sayaç `null` kalır — hata "0 öksüz" diye okunamaz.
      if (start === 0) {
        items.value = [];
        total.value = null;
      }
    } finally {
      loading.value = false;
    }
  }

  /** Baştan yükle — gün eşiği değişince de bu çağrılır. */
  async function load(days) {
    if (days !== undefined) daysUnused.value = days;
    await _fetch(0);
  }

  /** Sonraki sayfayı mevcut listenin altına ekle. */
  async function loadMore() {
    if (loading.value || !hasMore.value) return;
    await _fetch(items.value.length);
  }

  return {
    items,
    total,
    loading,
    denied,
    error,
    daysUnused,
    scan,
    scannedAt,
    hasMore,
    isEmpty,
    load,
    loadMore,
  };
}
