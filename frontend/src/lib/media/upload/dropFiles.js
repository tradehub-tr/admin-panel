/**
 * Bırakılan / yapıştırılan şeyden dosya listesi çıkar.
 *
 * **Klasör bırakma neden ayrı iş.** `DataTransfer.files` klasörü ya hiç
 * vermez ya da 0 baytlık sahte bir girdi olarak verir; klasörün İÇİNDEKİLERE
 * ulaşmanın tek yolu `webkitGetAsEntry()` ile ağacı gezmek. T-091 "klasör
 * bırakma" istiyor ve bu olmadan kullanıcı klasörü bırakır, ekranda hiçbir
 * şey belirmez.
 *
 * **`items` ile `files` aynı olaydan iki ayrı okuma.** `items` gezilebilir
 * ama tarayıcı desteği eskiye gidildikçe zayıflıyor; `files` her yerde var
 * ama klasörü açamıyor. Önce `items` denenir, yoksa `files`e düşülür — ikisi
 * birden kullanılırsa aynı dosya iki kez eklenir.
 *
 * **Derinlik sınırlı.** Bir kullanıcı bütün ev dizinini bırakabilir; sınırsız
 * gezmek sekmeyi kilitler. Derinlik ve dosya sayısı açıkça sınırlı, sınır
 * aşılırsa okunanlar döner — hata değil, kesme.
 */

/** Ağaçta bu kadar aşağı inilir. Ürün görselleri iki klasörden derin durmuyor. */
export const MAX_DEPTH = 5;

/** Tek bırakmada bu kadar dosya alınır. */
export const MAX_FILES = 200;

/** Gizli dosyalar (macOS `.DS_Store`, `._` başlıkları) atılır. */
function gizliMi(ad) {
  return String(ad || "").startsWith(".");
}

function entryFile(entry) {
  return new Promise((resolve) => {
    entry.file(
      (f) => resolve(f),
      () => resolve(null)
    );
  });
}

function readDirBatch(reader) {
  return new Promise((resolve) => {
    reader.readEntries(
      (girdiler) => resolve(girdiler || []),
      () => resolve([])
    );
  });
}

/**
 * `readEntries` bir seferde en fazla ~100 girdi döndürür ve tükendiğini boş
 * dizi ile bildirir. Tek çağrıyla yetinmek, 150 dosyalı bir klasörden 100
 * dosya almak demekti — sessiz veri kaybı.
 */
async function readAllEntries(dir) {
  const reader = dir.createReader();
  const hepsi = [];
  for (;;) {
    const parca = await readDirBatch(reader);
    if (!parca.length) break;
    hepsi.push(...parca);
    if (hepsi.length > MAX_FILES) break;
  }
  return hepsi;
}

async function gez(entry, cikti, derinlik) {
  if (!entry || cikti.length >= MAX_FILES) return;
  if (gizliMi(entry.name)) return;

  if (entry.isFile) {
    const f = await entryFile(entry);
    if (f && f.size >= 0) cikti.push(f);
    return;
  }
  if (entry.isDirectory && derinlik < MAX_DEPTH) {
    for (const alt of await readAllEntries(entry)) {
      if (cikti.length >= MAX_FILES) break;
      await gez(alt, cikti, derinlik + 1);
    }
  }
}

/**
 * `DataTransfer`'dan dosyaları topla — klasörler dâhil.
 *
 * @param {DataTransfer} dt
 * @returns {Promise<File[]>}
 */
export async function collectDroppedFiles(dt) {
  if (!dt) return [];

  const items = Array.from(dt.items || []);
  const girdiler = items
    .filter((i) => i.kind === "file")
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter(Boolean);

  if (girdiler.length) {
    const cikti = [];
    for (const g of girdiler) {
      if (cikti.length >= MAX_FILES) break;
      await gez(g, cikti, 0);
    }
    return cikti;
  }

  return Array.from(dt.files || []).filter((f) => f && !gizliMi(f.name));
}

/**
 * Pano olayından dosya çıkar.
 *
 * Ekran görüntüsü yapıştırıldığında dosyanın adı `image.png` gibi genel bir
 * şey olur ya da hiç olmaz; adsız dosya sunucuda `upload_name_required` ile
 * reddedilirdi. Zaman damgalı bir ad veriliyor — kullanıcı kütüphanede
 * hangisinin hangisi olduğunu ayırt edebilsin.
 */
export function collectPastedFiles(event, { now = () => new Date() } = {}) {
  const items = Array.from(event?.clipboardData?.items || []);
  const cikti = [];
  for (const item of items) {
    if (item.kind !== "file") continue;
    const f = item.getAsFile?.();
    if (!f) continue;
    if (f.name && !gizliMi(f.name) && f.name !== "image.png") {
      cikti.push(f);
      continue;
    }
    const uzanti = (f.type || "").split("/")[1] || "png";
    const d = now();
    const damga = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
      String(d.getHours()).padStart(2, "0"),
      String(d.getMinutes()).padStart(2, "0"),
      String(d.getSeconds()).padStart(2, "0"),
    ].join("");
    cikti.push(new File([f], `yapistirilan-${damga}.${uzanti}`, { type: f.type }));
  }
  return cikti;
}
