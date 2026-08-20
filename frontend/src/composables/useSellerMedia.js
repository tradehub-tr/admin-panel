import { ref } from "vue";

import api from "@/utils/api";
import { prepareMedia } from "@/lib/media/compress.js";
import * as policy from "@/utils/uploadPolicy";

/**
 * Satıcının kendi medya kütüphanesi — GERÇEK veri katmanı.
 *
 * Bu ekran bugüne kadar tamamen uydurma veriyle çalışıyordu: listelediği
 * dosyalar bellekte üretiliyor, "şu üründe kullanılıyor" listesi de öyle.
 * En tehlikeli kısım oydu — satıcı "hiçbir yerde kullanılmıyor" yazısını
 * görüp kendi üç ürününde duran görseli silebilirdi. Boş ekran bilgi vermez;
 * yanlış bilgi veren ekran kullanıcıyı hataya sürükler.
 *
 * Arka taraf mağazayı OTURUMDAN çözer. Buradan mağaza kodu gönderilmiyor ve
 * gönderilmemeli: parametre olsaydı başkasının kodu yazılarak verisi
 * istenebilirdi.
 *
 * Kapsam: liste, kullanım dökümü, bırakma/geri alma, başlık ve alternatif
 * metin, etiket, favori, çözünürlük, yeniden adlandırma, kopyalama, içerik
 * değiştirme, yükleme ve depolama kullanımı. Ekrandaki her işlemin arka
 * tarafta karşılığı var.
 */

const YOL = "tradehub_core.api.seller_media";

/**
 * Frappe yanıtı gövdeyi `message` içine sarar.
 *
 * Bu açılmadığı için liste hep boş dönüyordu: `res.items` diye okunuyordu ama
 * veri `res.message.items` altındaydı. Tek yerden açılıyor ki bir sonraki
 * çağrıda tekrar unutulmasın.
 */
function ac(res) {
  return res?.message ?? res ?? {};
}

/** Arka taraftaki satır → ekranın beklediği kayıt. */
function bicimle(row) {
  const ad = row.file_name || (row.file_url || "").split("/").pop() || "";
  const uzanti = ad.includes(".") ? ad.split(".").pop().toUpperCase() : "";
  return {
    id: row.file_url,
    fileUrl: row.file_url,
    // `File` docname — türev listesi (`Media Asset.source_file`) BUNU ister,
    // dosya adresini değil. Adres kimliğin kendisi değil, bir bağ.
    docName: row.name || "",
    fileName: ad,
    ext: uzanti,
    bytes: row.file_size || 0,
    uploadedAt: row.creation || "",
    optimizedAt: row.optimized_at || "",
    // Kullanım kararı ve sayısı KENDİ kapsamında geliyor: aynı dosyayı başka
    // bir mağaza kullanıyorsa bu satıcı onu ne görür ne sayar.
    verdict: row.usage_verdict || "unknown",
    liveUsage: row.live_usage || 0,
    // Satıcının yazdığı üstveri — arka taraftan geliyor, artık uydurma değil.
    title: row.title || ad,
    alt: row.alt || "",
    description: row.description || "",
    tags: row.tags || [],
    favorite: Boolean(row.favorite),
    width: row.width || null,
    height: row.height || null,
    // T-065: sunucu artık en yeni sürümün LQIP data-URI'sini (yoksa baskın
    // rengi) taşıyor; `MediaThumb → MediaImage` bu alanı zaten kabul ediyordu
    // ve bugüne dek hiç beslenmemişti (rapor 61d).
    lqip: row.lqip_data_uri || row.dominant_color || "",
    kind: kindOf(uzanti),
    // Video işleme durumu (TUR-296): "" (video değil / eski kayıt) |
    // "processing" | "ready" | "failed". Rozet ve "yeniden dene" buna bakar.
    videoStatus: row.video_status || "",
    // Zararlı içerik taraması (TUR-125): "" (hiç taranmadı) | "pending" |
    // "clean" | "infected" | "failed". Boş, BİLEREK "temiz" değil — taranmamış
    // dosyayı temiz göstermek bu alanın en tehlikeli yanlışı olurdu.
    scanStatus: row.scan_status || "",
  };
}

/** Uzantıdan tür — ayrı bir alan tutmaya değmez, ad zaten söylüyor. */
function kindOf(uzanti) {
  const u = (uzanti || "").toLowerCase();
  if (["mp4", "webm", "mov", "avi", "mkv", "m4v"].includes(u)) return "video";
  if (["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"].includes(u)) return "document";
  return "image";
}

export function useSellerMedia() {
  const items = ref([]);
  const total = ref(0);
  const summary = ref({ active: 0, trashed: 0 });
  const loading = ref(false);
  const error = ref("");

  async function load({
    page = 1,
    pageSize = 50,
    search = "",
    state = "",
    sortBy = "date",
    sortDir = "desc",
    usageState = "",
  } = {}) {
    loading.value = true;
    error.value = "";
    try {
      const ham = await api.callMethodGET(`${YOL}.get_my_media`, {
        page,
        page_size: pageSize,
        search,
        state,
        sort_by: sortBy,
        sort_dir: sortDir,
        usage_state: usageState,
      });
      const res = ac(ham);
      items.value = (res.items || []).map(bicimle);
      total.value = res.total || 0;
    } catch (e) {
      error.value = e.message || "Medya listesi yüklenemedi";
      items.value = [];
      total.value = 0;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadSummary() {
    summary.value = ac(await api.callMethodGET(`${YOL}.get_my_summary`));
    return summary.value;
  }

  /**
   * Bir dosyanın KENDİ ürünlerimdeki kullanımı.
   *
   * Silme kararını besleyen bilgi bu. Uydurma olamaz: yanıt gelene kadar
   * ekran "yükleniyor" göstermeli, hata olursa da boş liste değil hata
   * göstermeli — "kullanılmıyor" izlenimi vermek en kötü sonuç.
   */
  async function usageOf(fileUrl) {
    return ac(await api.callMethodGET(`${YOL}.get_my_usage`, { file_url: fileUrl }));
  }

  /** Bırakmadan önce özet — onay metni buna göre kurulur. */
  async function previewRelease(fileUrls) {
    return ac(await api.callMethod(`${YOL}.preview_release`, { file_urls: fileUrls }));
  }

  /**
   * ARŞİVLE — geri alınabilir.
   *
   * Diske dokunmaz, hiçbir kayıt silmez. Kullanımdaki dosyayı arka taraf
   * reddeder ve bu hiçbir parametreyle aşılamaz; ekrandaki kapalı düğme tek
   * başına koruma sayılmaz, konsoldan istek atılabilir.
   */
  async function archive(fileUrls) {
    return ac(await api.callMethod(`${YOL}.archive_media`, { file_urls: fileUrls }));
  }

  async function unarchive(fileUrls) {
    return ac(await api.callMethod(`${YOL}.unarchive_media`, { file_urls: fileUrls }));
  }

  /**
   * KALICI SİL — geri alınamaz.
   *
   * Satıcının payı tamamen kalkar. Dosya diskten YALNIZ son sahip de
   * sildiğinde silinir; o ana kadar diğer mağazalar için olduğu gibi durur.
   * Yalnız arşivdeki dosyaya uygulanır.
   */
  async function purge(fileUrls) {
    return ac(await api.callMethod(`${YOL}.purge_media`, { file_urls: fileUrls }));
  }

  /** Başlık, alternatif metin, açıklama, etiket, favori. */
  async function update(fileUrl, patch) {
    return ac(await api.callMethod(`${YOL}.update_media`, { file_url: fileUrl, patch }));
  }

  async function toggleFavorite(fileUrl) {
    return ac(await api.callMethod(`${YOL}.toggle_favorite`, { file_url: fileUrl }));
  }

  async function addTag(fileUrls, tag) {
    return ac(await api.callMethod(`${YOL}.add_tag`, { file_urls: fileUrls, tag }));
  }

  // ── Gerçek klasörler (T-094) ─────────────────────────────────────
  //
  // Sanal ağaç (browse_my_media) kategorilerden TÜRETİLİR; buradakiler
  // satıcının kendi elleriyle açtığı klasörler. Mağaza yine oturumdan
  // çözülür — hiçbir klasör ucuna mağaza parametresi gönderilmez.

  /** Mağazanın tüm klasörleri (düz liste) + klasör başına dosya sayısı. */
  async function listFolders() {
    return ac(await api.callMethodGET(`${YOL}.list_folders`));
  }

  async function createFolder(folderName, parentFolder = "") {
    return ac(
      await api.callMethod(`${YOL}.create_folder`, {
        folder_name: folderName,
        parent_folder: parentFolder,
      })
    );
  }

  /** Klasörün görünen adını değiştir. Kimliği (docname) değişmez. */
  async function renameFolder(folder, newName) {
    return ac(await api.callMethod(`${YOL}.rename_folder`, { folder, new_name: newName }));
  }

  /** Klasörü sil. DOLU klasörü arka taraf reddeder — dosya kaybolmaz. */
  async function deleteFolder(folder) {
    return ac(await api.callMethod(`${YOL}.delete_folder`, { folder }));
  }

  /**
   * Seçili dosyaları klasöre taşı — `folder` boşsa köke (bağ silinir).
   * Sahibi olunmayan dosyayı arka taraf atlar ve `skipped` altında sayar.
   */
  async function moveToFolder(fileUrls, folder = "") {
    return ac(await api.callMethod(`${YOL}.move_media`, { file_urls: fileUrls, folder }));
  }

  /** Bir klasördeki dosyalar — satırlar kütüphane listesiyle aynı biçime çevrilir. */
  async function folderMedia(folder, { page = 1, pageSize = 50, search = "" } = {}) {
    const res = ac(
      await api.callMethodGET(`${YOL}.list_folder_media`, {
        folder,
        page,
        page_size: pageSize,
        search,
      })
    );
    return { items: (res.items || []).map(bicimle), total: res.total || 0 };
  }

  /** Gerçek çözünürlük — ilk soruluşta diskten okunup saklanıyor. */
  async function dimensions(fileUrl) {
    return ac(await api.callMethodGET(`${YOL}.get_dimensions`, { file_url: fileUrl }));
  }

  /**
   * Başarısız video işlemesini yeniden başlat (TUR-296).
   *
   * Arka taraf yalnız `failed` durumunu kabul eder ve sahipliği doğrular;
   * ekrandaki düğmenin görünürlüğü tek başına koruma sayılmaz.
   */
  async function retryVideo(fileUrl) {
    return ac(await api.callMethod(`${YOL}.retry_video`, { file_url: fileUrl }));
  }

  /** Görünen adı değiştir. Dosyanın YOLU değişmez. */
  async function rename(fileUrl, newName) {
    return ac(
      await api.callMethod(`${YOL}.rename_media`, { file_url: fileUrl, new_name: newName })
    );
  }

  async function duplicate(fileUrl) {
    return ac(await api.callMethod(`${YOL}.duplicate_media`, { file_url: fileUrl }));
  }

  /**
   * İçeriği değiştir. Paylaşılan dosyada arka taraf REDDEDER — başka bir
   * mağazanın ürününde bambaşka bir görsel çıkmasın diye.
   */
  async function replace(fileUrl, file) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı"));
      reader.readAsDataURL(file);
    });
    return ac(
      await api.callMethod(`${YOL}.replace_media`, {
        file_url: fileUrl,
        content: base64,
        file_name: file.name,
      })
    );
  }

  /** Blob parçasını base64'e çevir — `data:` öneki olmadan. */
  function toBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
      reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı"));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Dosya yükle — büyükse parçalı, küçükse tek seferde (TUR-123).
   *
   * Frappe'nin genel yükleme ucu DEĞİL, kütüphanenin kendi ucu kullanılıyor:
   * ekrandaki "sadece görsel, video, PDF" kuralının ve boyut sınırının
   * sunucuda da uygulanması için. Genel uçta yalnız tehlikeli uzantılar
   * engelleniyor; aradaki türler (zip, docx…) geçebiliyordu.
   *
   * base64'e çevirmeden ÖNCE tarayıcıda küçültülür (görsel→WebP, video→WebM);
   * PDF gibi desteklenmeyen türler dokunmadan geçer. Parçalama kararı da
   * küçültülmüş boyuta göre verilir. Genişlik/yükseklik gibi üstveri sunucuda
   * `probe` ile okunuyor, burada değişmedi.
   *
   * `onProgress` gerçek ilerlemeyi bildirir. Eskiden yüzde 0'dan doğrudan
   * 100'e atlıyordu çünkü dosya tek istekte gidiyordu ve arada ölçülecek bir
   * şey yoktu; kullanıcı büyük dosyada ekranı donmuş sanıyordu.
   *
   * `signal` iptali gerçekten iptal eder. Eskiden iptale basınca satır
   * listeden siliniyor ama istek sunucuya gitmeye devam ediyordu — dosya
   * yüklenip kütüphanede beliriyordu.
   */
  async function upload(file, { onProgress = null, signal = null } = {}) {
    await policy.loadLimits();

    const ilerle = (p) => onProgress?.(Math.max(0, Math.min(100, Math.round(p))));

    const prepared = await prepareMedia(file);
    if (signal?.aborted) throw yarida();
    // Sıkıştırıcılar çıplak Blob döndürür; parçalı akış `name`/`size`/`slice`
    // bekliyor — küçültülmüş içerik File'a sarılır, dokunulmamışsa aynen geçer.
    const hazir =
      prepared.blob === file
        ? file
        : new File([prepared.blob], prepared.name, { type: prepared.blob.type });

    if (!policy.needsChunking(hazir)) {
      ilerle(5);
      const base64 = await toBase64(hazir);
      if (signal?.aborted) throw yarida();
      const sonuc = ac(
        await api.callMethod(`${YOL}.upload_media`, { file_name: hazir.name, content: base64 })
      );
      ilerle(100);
      return sonuc;
    }

    return uploadChunked(hazir, { onProgress: ilerle, signal });
  }

  function yarida() {
    const e = new Error("Yükleme iptal edildi");
    e.name = "AbortError";
    return e;
  }

  /**
   * Parçalı yükleme: başlat → parçaları gönder → bitir.
   *
   * Parçalar SIRAYLA gönderiliyor. Paralel göndermek daha hızlı olurdu ama
   * ilerleme çubuğunu zıplatır ve kopma hâlinde hangi parçanın gittiği
   * belirsizleşir; sunucu sırasızlığı kabul ediyor, istemcinin karmaşıklığa
   * girmesi için sebep yok.
   */
  async function uploadChunked(file, { onProgress, signal }) {
    const baslangic = ac(
      await api.callMethod(`${YOL}.upload_begin`, {
        file_name: file.name,
        total_bytes: file.size,
      })
    );
    const { upload_id: id, chunk_bytes: parcaBoyutu, chunk_count: adet } = baslangic;

    try {
      for (let i = 0; i < adet; i++) {
        if (signal?.aborted) throw yarida();
        const dilim = file.slice(i * parcaBoyutu, (i + 1) * parcaBoyutu);
        const veri = await toBase64(dilim);
        await api.callMethod(`${YOL}.upload_chunk`, { upload_id: id, index: i, content: veri });
        // Son yüzde bitirme adımına ayrılıyor: birleştirme ve doğrulama da
        // zaman alıyor, %100 gösterip beklemek yalan olurdu.
        onProgress(((i + 1) / adet) * 95);
      }
      const sonuc = ac(await api.callMethod(`${YOL}.upload_finish`, { upload_id: id }));
      onProgress(100);
      return sonuc;
    } catch (e) {
      // Yarıda kalan oturum sunucuda parça bırakır; temizliği beklemek yerine
      // hemen bildiriyoruz. Bu çağrının başarısız olması asıl hatayı
      // gölgelememeli.
      try {
        await api.callMethod(`${YOL}.upload_abort`, { upload_id: id });
      } catch {
        /* asıl hata daha önemli */
      }
      throw e;
    }
  }

  return {
    items,
    total,
    summary,
    loading,
    error,
    load,
    loadSummary,
    usageOf,
    previewRelease,
    archive,
    unarchive,
    purge,
    update,
    toggleFavorite,
    addTag,
    listFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    folderMedia,
    dimensions,
    retryVideo,
    rename,
    duplicate,
    replace,
    upload,
  };
}
