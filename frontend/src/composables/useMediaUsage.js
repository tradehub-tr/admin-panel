import { ref } from "vue";

import { useSellerMedia } from "@/composables/useSellerMedia";
import { storefrontUrl } from "@/utils/storefrontUrl";

/**
 * Bir dosyanın KULLANIM dökümü — "bunu silersem ne kırılır" sorusunun cevabı.
 *
 * Uç uydurulmadı: `tradehub_core.api.seller_media.get_my_usage`. Mağaza
 * parametresi YOK ve olmayacak — arka taraf mağazayı oturumdan çözüyor,
 * istemciden gelseydi başkasının kodu yazılıp verisi istenebilirdi.
 *
 * ── Bu dökümün SINIRI (ekran bunu gizlemez) ───────────────────────
 *
 * Arka taraf kalıcı bir "kullanım dizini" tutmuyor. `media/usage.py` istek
 * anında SABİT bir kaynak listesini (canlı alanlar, sipariş kopyaları, geçmiş
 * izleri) tarıyor; `Media Usage` DocType'ı kalıcı kayıt değil (bkz.
 * `tradehub_core/docs/reports/34-dogrulama-faz4-7.md`). Sonuç: listede
 * OLMAYAN bir alanda geçen bir adres burada görünmez. Ekran bu yüzden
 * "hiçbir yerde kullanılmıyor" demez, "taranan kaynaklarda bulunamadı" der —
 * silme kararını besleyen bir ekranda bilinmeyeni "boş" saymak en pahalı
 * hatadır.
 *
 * ── Boş durumlar BİRİNCİ SINIF ────────────────────────────────────
 *
 * `useMediaRenditions` ile aynı sözleşme: boşluğun SEBEBİ ayrı bir bayrakta
 * durur, çünkü dördü farklı şeyler söyler ve ekran metni farklı olmalı.
 *
 *   noFile  → sorulacak bir adres yok (istek hiç atılmadı)
 *   notUsed → arka taraf yanıtladı, taranan kaynakların hiçbirinde yok
 *   denied  → sunucu "bakamazsın" dedi — arıza değil, yetki
 *   error   → gerçekten bir şey kırıldı
 *
 * Hiçbiri dolu değilse ve `report` hâlâ `null` ise cevap HENÜZ GELMEDİ;
 * o hâl de "kullanılmıyor" diye gösterilemez.
 */

/** @param {unknown} e @returns {boolean} Yetki reddi mi, gerçek arıza mı. */
function isDenied(e) {
  return e?.status === 403 || e?.code === "PermissionError";
}

/**
 * Aynı ürünün birden çok alanında geçebilir (ana görsel + galeri + varyant).
 * Ürün bazında gruplanır ki "3 üründe" sayısı satır sayısıyla uyuşsun —
 * gruplanmasaydı tek ürün üç satır olur, satıcı üç ürün sanırdı.
 */
function groupUsages(usages) {
  const map = new Map();
  for (const u of usages) {
    const key = `${u.doctype}:${u.name}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        doctype: u.doctype || "",
        name: u.name || "",
        label: u.label || u.name || "",
        status: u.status || "",
        // Görselin yayında göründüğü sayfa. Yol boşsa kayıt yayında değil —
        // uydurma bir adres üretmek yerine bağlantı hiç çizilmez.
        pageUrl: storefrontUrl(u.page_path),
        fields: [],
      });
    }
    map.get(key).fields.push({
      field: u.field || "",
      kind: u.kind || "",
      position: u.position || 0,
      variant: u.variant || "",
      variantSku: u.variant_sku || "",
      isDefault: Boolean(u.is_default),
    });
  }
  return [...map.values()];
}

export function useMediaUsage(fetcher) {
  // Varsayılan kaynak satıcı ucu. Yönetici gezgini başka bir uç kullanıyorsa
  // kendi getiricisini geçer — uç adresi burada ikinci kez yazılmasın.
  const varsayilan = () => useSellerMedia().usageOf;

  /** `null` = HENÜZ SORULMADI/CEVAP GELMEDİ. Boş dizi ile karıştırılamaz. */
  const report = ref(null);
  const loading = ref(false);
  /** "" | "noFile" | "notUsed" */
  const emptyReason = ref("");
  const error = ref("");
  const denied = ref(false);

  function clear() {
    report.value = null;
    emptyReason.value = "";
    error.value = "";
    denied.value = false;
  }

  /**
   * @param {string} fileUrl Dosya ADRESİ (`/files/...`) — `get_my_usage` bunu
   *   ister, docname'i değil. Türev zinciri tam tersini istiyor; ikisi
   *   karıştırılırsa uç sessizce boş döner.
   */
  async function load(fileUrl) {
    clear();
    if (!fileUrl) {
      emptyReason.value = "noFile";
      return report.value;
    }

    loading.value = true;
    try {
      const ham = (await (fetcher || varsayilan())(fileUrl)) || {};
      const groups = groupUsages(ham.usages || []);
      const orders = (ham.orders || []).map((o) => ({
        kind: o.kind || "",
        field: o.field || "",
        name: o.name || "",
      }));
      const history = (ham.history || []).map((h) => ({
        kind: h.kind || "",
        label: h.label || "",
        count: Number(h.count) || 0,
      }));
      const records = (ham.records || []).map((r) => ({
        name: r.name || "",
        fileName: r.file_name || "",
        createdAt: r.creation || "",
        owner: r.owner || "",
        attachedTo:
          r.attached_to_doctype && r.attached_to_name
            ? `${r.attached_to_doctype} · ${r.attached_to_name}`
            : "",
        // `null` = bağ yok, yani "hedef silinmiş" DEĞİL. Üç değerli kalıyor.
        targetExists: r.target_exists === null ? null : Boolean(r.target_exists),
      }));

      report.value = {
        // Arka tarafın kararı olduğu gibi taşınır; ekran yeniden hesaplamaz —
        // iki yerin aynı soruya farklı cevap vermesi silme akışında kabul
        // edilemez (aynı hata `extract_file_urls` öncesinde yaşandı).
        verdict: ham.verdict || "unknown",
        groups,
        orders,
        history,
        records,
        redundantRecords: Number(ham.redundant_records) || 0,
      };
      if (!groups.length && !orders.length && !history.length) emptyReason.value = "notUsed";
      return report.value;
    } catch (e) {
      if (isDenied(e)) denied.value = true;
      else error.value = e?.message || "unknown";
      return report.value;
    } finally {
      loading.value = false;
    }
  }

  return { report, loading, emptyReason, error, denied, load, clear };
}
