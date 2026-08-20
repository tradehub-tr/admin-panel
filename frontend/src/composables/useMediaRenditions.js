import { ref } from "vue";

import api from "@/utils/api";

/**
 * Bir dosyanın türevleri (renditions) — hangi genişlikte, hangi biçimde,
 * kaç bayt üretildi.
 *
 * **Toplu uç:** `tradehub_core.api.media_manifest.manifest_batch`. Eskiden
 * özel bir uç yoktu ve veri 2 adımlı genel REST ile çekiliyordu
 * (File.name → Media Asset → Media Rendition; dosya başına 2 istek). Toplu
 * uç aynı zinciri sunucuda tek çağrıda yürütür: dosya başına 1 istek.
 *
 * Yetki yine SUNUCUDA: uç `frappe.get_list` üzerinden `hooks.py`'deki
 * `media_asset/rendition_query_conditions` süzgeçlerinden geçiyor — satıcı
 * yalnız kendi varlıklarının türevlerini görür, burada ayrıca süzmüyoruz
 * (süzseydik izolasyon istemciye taşınmış olurdu). Erişilemeyen ya da
 * olmayan adres haritada `null` gelir ve İKİSİ AYIRT EDİLMEZ — sunucu bir
 * adresin varlığını sızdırmaz; ekran ikisini de "boru hattında yok" sayar.
 *
 * Tablo şu an BOŞ: bayraklar kapalı, hiçbir türev üretilmedi. Bu yüzden boş
 * yanıt bir hata değil, ekranın BEKLENEN hâli — çağıran "henüz üretilmedi"
 * gösterir, kırmızı uyarı değil.
 */

const BATCH_METHOD = "tradehub_core.api.media_manifest.manifest_batch";

/**
 * @param {unknown} error
 * @returns {boolean} Sunucu "bakamazsın" mı dedi (yetki), yoksa gerçekten
 *                    bir şey mi kırıldı.
 */
function isDenied(error) {
  return error?.status === 403 || error?.code === "PermissionError";
}

/** Uçtan gelen ham türev satırı → ekranın satırı. Şekil DEĞİŞMEDİ. */
function toRow(r) {
  return {
    id: r.name,
    profile: r.profile || "",
    width: Number(r.width) || 0,
    height: Number(r.height) || 0,
    format: (r.format || "").toUpperCase(),
    fileUrl: r.file_url || "",
    bytes: Number(r.bytes) || 0,
    // SSIM 0..1; ölçülmemişse 0 gelir ve gösterilmez — "0,00 benzerlik"
    // yazmak, ölçüm yapılmadığını kalite sorunu gibi gösterirdi.
    ssim: Number(r.ssim) || 0,
    generation: r.generation || "",
  };
}

export function useMediaRenditions() {
  const rows = ref([]);
  const loading = ref(false);
  /** "" | "noAsset" | "noRenditions" — boşluğun SEBEBİ, ekran metni buna bakar. */
  const emptyReason = ref("");
  /** Dolu ise gerçek bir arıza; yetki reddi ayrı bayrakta. */
  const error = ref("");
  const denied = ref(false);
  /**
   * `manifest.version` — varlığın zenginleştirilmiş sürüm künyesi (T-093).
   * Uç zaten taşıyor (rapor 73 §3.3: dpi, renk uzayı, alpha, sınıflandırma,
   * format zinciri, lqip); ikinci bir istek ATILMAZ, aynı yanıttan okunur.
   * `null` = bu dosya için sürüm kaydı yok (boru hattı üretmedi ya da
   * bakılamaz — sunucu ikisini ayırt ettirmez).
   */
  const version = ref(null);

  function clear() {
    rows.value = [];
    emptyReason.value = "";
    error.value = "";
    denied.value = false;
    version.value = null;
  }

  /**
   * @param {string} fileDocName `File` DocType'ının docname'i (`item.name`).
   *   Uç adresle de çözer ama panelin elindeki kimlik docname:
   *   `Media Asset.source_file` bir `Link` ve docname tutar.
   */
  async function load(fileDocName) {
    clear();
    if (!fileDocName) {
      emptyReason.value = "noAsset";
      return rows.value;
    }

    loading.value = true;
    try {
      const res = await api.callMethod(BATCH_METHOD, { file_urls: [fileDocName] });
      const manifest = res?.message?.manifests?.[fileDocName] ?? null;
      if (!manifest) {
        // Adres çözülmedi: yok ya da bakılamaz — sunucu ayırt ettirmez.
        // Bayrak kapalıyken de buraya düşülmez; manifest gelir, listesi boştur.
        emptyReason.value = "noAsset";
        return rows.value;
      }

      version.value = manifest.version || null;
      rows.value = (manifest.renditions || []).map(toRow);
      if (!rows.value.length) {
        // Varlık kaydı var ama türev yok → "henüz üretilmedi"; varlık da
        // yoksa dosya boru hattından hiç geçmemiş — bayrak kapalıyken normal.
        emptyReason.value = manifest.assets?.length ? "noRenditions" : "noAsset";
      }
      return rows.value;
    } catch (e) {
      if (isDenied(e)) denied.value = true;
      else error.value = e?.message || "unknown";
      return rows.value;
    } finally {
      loading.value = false;
    }
  }

  return { rows, loading, emptyReason, error, denied, version, load, clear };
}
