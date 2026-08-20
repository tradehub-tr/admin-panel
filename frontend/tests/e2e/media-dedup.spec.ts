import { expect, test } from "@playwright/test";

import { call, e2eName, sha256Hex, tinyWebp, toBase64 } from "./helpers";

/**
 * T-141 — S9: dedup 2× yükleme. tradehubfront'tan TAŞINDI, skip kaldırıldı.
 *
 * ETİKET: KOŞUYOR (sunucu dedup'ı + `find_in_my_library` ölçülüyor).
 *
 * WebP kullanılıyor, PNG DEĞİL — ölçülmüş gerekçe: sunucu PNG'yi WebP'ye
 * ÇEVİRİR, böylece diskteki içerik-adresli ad (`/files/xx/sha[:32]`) istemcinin
 * ORİJİNAL PNG hash'inden sapar ve `find_in_my_library` eşleşmez. Zaten-WebP
 * içerik "dokunulmaz" olduğu için adres = istemci hash'i; dedup gerçek çalışır.
 * (Bu yüzden PANEL UI'ında PNG yüklerken istemci dedup rozeti GÖRÜNMEZ — S9'un
 * UI yarısı görselde çalışmaz; rapora bulgu olarak yazıldı. Burada sunucu dedup
 * sözleşmesi doğrulanıyor: "depoda ikinci nesne oluşmaz" — kabul ölçütü budur.)
 */

const M = "tradehub_core.api.seller_media";

test.describe("T-141 · satıcı medya konsolu — tekilleştirme (canlı)", () => {
  test("[NFR-050] S9 — aynı dosya iki kez yüklendiğinde tek asset kalır (dedup)", async ({
    request,
  }) => {
    const bytes = tinyWebp();
    const content = toBase64(bytes);
    const sha = sha256Hex(bytes);

    // 1) Aynı baytları iki kez yükle — dosya adı farklı, içerik aynı.
    const first = await call(request, `${M}.upload_media`, {
      file_name: e2eName("dedup-a", "webp"),
      content,
    });
    expect(first.status).toBe(200);
    const firstUrl = (first.message as { file_url?: string }).file_url;
    expect(firstUrl).toBeTruthy();

    const second = await call(request, `${M}.upload_media`, {
      file_name: e2eName("dedup-b", "webp"),
      content,
    });
    expect(second.status).toBe(200);
    const secondUrl = (second.message as { file_url?: string }).file_url;

    // 2) İkinci yükleme MEVCUT nesnenin kimliğini döndürmeli — içerik-adresli
    //    ad aynı. Depoda ikinci bir nesne AÇILMADI: bunu satır sayısı değil,
    //    URL'in birebir aynı olması kanıtlar (dedup'ın kendisi).
    expect(secondUrl).toBe(firstUrl);

    // 3) `find_in_my_library` bu içeriği satıcının kütüphanesinde görmeli —
    //    panelin yükleme-öncesi dedup uyarısını besleyen GERÇEK uç (T-042).
    const found = await call(request, `${M}.find_in_my_library`, { sha256: sha });
    expect(found.status).toBe(200);
    const fm = found.message as { found?: boolean; file?: { file_url?: string } };
    expect(fm.found).toBe(true);
    expect(fm.file?.file_url).toBe(firstUrl);
  });
});
