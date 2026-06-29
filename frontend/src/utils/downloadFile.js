/**
 * Binary (dosya) endpoint indirme — fetch + blob.
 *
 * `window.open(url)` yerine kullanılır: endpoint hata fırlatırsa (örn. boş
 * sonuç, kayıt yok) tarayıcıyı çirkin "Server Error" SAYFASINA atmaz; hatayı
 * okunur bir mesaja çevirip fırlatır → çağıran toast gösterebilir. Başarıda
 * blob'u Content-Disposition'daki dosya adıyla indirir.
 *
 * @param {string} url - /api/method/... (GET, cookie auth)
 * @throws {Error} Türkçe/okunur mesajla (Frappe _server_messages / exception)
 */
export async function downloadFile(url) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    let msg = "";
    try {
      const data = await res.json();
      if (data?._server_messages) {
        // Frappe: _server_messages = JSON string[] → her biri JSON {message}
        const arr = JSON.parse(data._server_messages);
        if (arr.length) msg = JSON.parse(arr[0]).message || "";
      }
      if (!msg && data?.exception) {
        msg = String(data.exception).replace(/^.*?Error:\s*/, "");
      }
    } catch {
      /* JSON değil (HTML hata sayfası) — genel mesaja düş */
    }
    throw new Error(msg || "İndirme başarısız oldu");
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : "download";

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}
