/**
 * İstemci tarafı yükleme ön kontrolü (TUR-123).
 *
 * **Bu dosya karar VERMEZ, karar HIZLANDIRIR.** Sunucu her kuralı yeniden
 * uyguluyor ve son söz onun. Buradaki kontrollerin tek amacı kullanıcıyı
 * beklemekten kurtarmak: 21 MB'lık bir dosya base64'e çevrilince ~28 MB'lık
 * bir isteğe dönüşüyor, gönderiliyor ve sunucuda reddediliyordu. Aynı cevap
 * dosya seçilir seçilmez verilebilir.
 *
 * **Sınırlar sunucudan alınıyor, buraya YAZILMIYOR.** İki tarafa ayrı sabit
 * koymak, biri değişince sessizce ayrışan iki kural demek: kullanıcı ekranda
 * kabul edilen dosyanın sunucuda reddedildiğini görürdü. Sunucu ulaşılamazsa
 * ön kontrol atlanır — kapıyı kapatmak değil, açık bırakıp sunucuya sormak
 * doğru davranış, çünkü asıl kapı zaten orada.
 *
 * **İçerik de okunuyor.** Uzantı yalan söyleyebilir; adı `.jpg` olan bir
 * dosyanın içi HTML olabilir. İlk baytlara bakıp bunu daha tarayıcıda
 * yakalıyoruz — yine sunucu da bakıyor, bu yalnız erken uyarı.
 */

const M = "tradehub_core.api.seller_media";

/** Sunucudan gelen sınırlar. Oturum boyunca bir kez alınır. */
let sinirlar = null;
let bekleyen = null;

/**
 * API modülü GEÇ yükleniyor.
 *
 * Üstte içe aktarılsaydı bu dosya yalnız tarayıcıda çalışabilirdi; kurallar
 * ise saf mantık ve testleri tarayıcı kurmadan koşabilmeli. Devingen içe
 * aktarma yalnız gerçekten sunucuya sorulduğunda değerlendiriliyor.
 */
export async function loadLimits() {
  if (sinirlar) return sinirlar;
  if (!bekleyen) {
    bekleyen = import("@/utils/api")
      .then((m) => m.default.callMethodGET(`${M}.upload_limits`))
      .then((r) => {
        sinirlar = r?.message || null;
        return sinirlar;
      })
      .catch(() => null)
      .finally(() => {
        bekleyen = null;
      });
  }
  return bekleyen;
}

export function cachedLimits() {
  return sinirlar;
}

/** Sınırları doğrudan ver — testler ve sunucusuz önizleme için. */
export function setLimits(deger) {
  sinirlar = deger;
}

/**
 * Uzantıyı sunucuyla AYNI kuralla ayıkla.
 *
 * Basit "son noktadan sonrası" kuralı sunucudan sapıyordu: `" .pdf"` gibi bir
 * ad sunucuda *uzantısız gizli dosya* sayılıp reddedilirken istemci onu geçerli
 * bir PDF sanıyordu. 20.000 girdilik karşılaştırmada 16 ayrışmanın tamamı bu
 * kalıptandı.
 *
 * Kural: baştaki noktalar ad sayılır, uzantı ayıracı değil. Son noktadan
 * öncesi tamamen noktaysa uzantı YOKTUR.
 */
export function extensionOf(name) {
  const ad = String(name || "").trim();
  const son = ad.lastIndexOf(".");
  if (son < 0) return "";
  let bas = 0;
  while (bas < son && ad[bas] === ".") bas += 1;
  if (bas === son) return "";
  return ad.slice(son).toLowerCase();
}

/** Tarayıcının çalıştırabileceği içerikler — görsel diye gelemezler. */
const TEHLIKELI = ["<!doctype html", "<html", "<svg", "<?xml", "<script", "<%", "#!/"];

/**
 * Dosyanın ilk baytlarını oku ve çalıştırılabilir içerik mi bak.
 *
 * Yalnız ilk 512 bayt okunuyor: 200 MB'lık bir videoyu kontrol için tümüyle
 * belleğe almak, önlemeye çalıştığımız sorunun aynısı olurdu.
 */
export async function sniffDangerous(file) {
  try {
    const bas = await file.slice(0, 512).text();
    // Baştaki boşluklar ve BOM atlanıyor: "   <svg…" ile "<svg…"
    // tarayıcıda aynı şekilde çalışır, yalnız ilk karaktere bakmak boşluk
    // eklenerek atlatılabilirdi.
    const t = bas.replace(/^[\s\uFEFF]+/, "").toLowerCase();
    return TEHLIKELI.some((m) => t.startsWith(m));
  } catch {
    // Okunamadıysa karar verme; sunucu bakacak.
    return false;
  }
}

/**
 * Dosyayı ön kontrolden geçir.
 *
 * `{ ok: true }` ya da `{ ok: false, code, params }` döner. Metin üretmiyor —
 * çeviri ekranın işi, burası yalnız sebebi söyler.
 */
export async function precheck(file, { media = true } = {}) {
  const s = sinirlar;
  // Ad KIRPILARAK değerlendiriliyor — sunucu da öyle yapıyor. Kırpılmasaydı
  // yalnız boşluktan oluşan bir ad burada "tür kabul edilmiyor", sunucuda
  // "ad zorunlu" derdi: aynı dosya, iki farklı sebep.
  const ad = String(file?.name ?? "").trim();
  const ext = extensionOf(ad);

  if (!ad) return { ok: false, code: "upload_name_required" };
  if (/[/\\\0]/.test(ad)) return { ok: false, code: "upload_name_invalid" };
  if (ad === "." || ad === "..") return { ok: false, code: "upload_name_invalid" };
  if (!file.size) return { ok: false, code: "upload_content_empty" };

  // Sunucudan sınır alınamadıysa ön kontrol yapılmaz; sunucu karar verir.
  if (!s) return { ok: true, unchecked: true };

  // Yasak liste ÖNCE bakılıyor — sunucudaki sıra da bu. Sonra bakılsaydı
  // `.svg` için istemci "kabul edilmiyor", sunucu "güvenlik nedeniyle kabul
  // edilmiyor" derdi: aynı dosya, iki farklı sebep. Fark ölçümle yakalandı.
  if (s.denied_extensions?.includes(ext)) {
    return { ok: false, code: "upload_ext_denied", params: { ext: ext || "?" } };
  }

  const izinli = media ? s.media_extensions : s.extensions;
  if (izinli?.length && !izinli.includes(ext)) {
    return { ok: false, code: "upload_ext_not_allowed", params: { ext: ext || "?" } };
  }

  const tur = s.kinds?.[ext];
  const sinir = (tur && s.max_bytes?.[tur]) || s.max_bytes_unknown;
  if (sinir && file.size > sinir) {
    return {
      ok: false,
      code: "upload_too_large",
      params: { size: (file.size / 1048576).toFixed(1), limit: Math.round(sinir / 1048576) },
    };
  }

  if (await sniffDangerous(file)) {
    return { ok: false, code: "upload_content_dangerous" };
  }

  return { ok: true };
}

/** Bu dosya parçalı gönderilmeli mi. */
export function needsChunking(file) {
  const limit = sinirlar?.single_shot_limit;
  return Boolean(limit && file?.size > limit);
}

/**
 * Bu hata yeniden denenmeli mi.
 *
 * Kullanıcının dosyasıyla ilgili hatalar denenmez — aynı dosya aynı cevabı
 * verir, tekrar denemek yalnız gürültü. Ağ ve geçici sunucu hataları denenir.
 */
export function isRetryable(err) {
  const kod = err?.code || "";
  if (kod && sinirlar?.retryable_codes?.includes(kod)) return true;
  // Politika reddi kesin karardır; tekrar denemek anlamsız.
  if (kod.startsWith("upload_")) return false;
  if (err?.status === 0 || !err?.status) return true; // ağ kopması
  return err.status >= 500 || err.status === 429;
}
