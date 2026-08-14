import { ref } from "vue";

import api from "@/utils/api";

const ADMIN = "tradehub_core.api.media_admin";
const ACCESS = "tradehub_core.api.media_access";

/**
 * Medya erişim seviyesi işlemleri (TUR-126 §3–§4).
 *
 * İki uç sarılır: `set_access_level` (süper-admin public↔private çevirir,
 * fiziksel taşıma + referans güncelleme backend'de atomik) ve `get_signed_url`
 * (private dosya için HMAC-imzalı süreli paylaşım linki). Toast/onay/kopyalama
 * görünümün işi — burası yalnız çağrı + meşguliyet durumu tutar.
 */
export function useMediaAccess() {
  const busy = ref(false);

  /**
   * Dosyanın erişim seviyesini değiştir.
   * Backend KYB/KYC bağlı dosyayı public yapmayı reddeder (PII koruması) —
   * hata mesajı olduğu gibi fırlatılır, görünüm gösterir.
   */
  async function setAccessLevel(fileUrl, makePrivate) {
    busy.value = true;
    try {
      const res = await api.callMethod(`${ADMIN}.set_access_level`, {
        file_url: fileUrl,
        make_private: makePrivate ? 1 : 0,
      });
      return res.message || {};
    } finally {
      busy.value = false;
    }
  }

  /**
   * Private dosya için imzalı süreli link üret.
   * Dönen `{ url, exp, ttl_seconds }` — url site köküne göre relatif.
   */
  async function createSignedLink(fileUrl, ttlSeconds = 900) {
    busy.value = true;
    try {
      const res = await api.callMethod(`${ACCESS}.get_signed_url`, {
        file_url: fileUrl,
        ttl_seconds: ttlSeconds,
      });
      return res.message || {};
    } finally {
      busy.value = false;
    }
  }

  return { busy, setAccessLevel, createSignedLink };
}
