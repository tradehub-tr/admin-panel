import { ref } from "vue";
import api from "@/utils/api";

const ENTITLEMENT_API = "tradehub_core.api.v1.entitlement_snapshot";
const STORAGE_KEY = "th_entitlement_snapshot";

/**
 * Satıcı entitlement (plan yetkinlikleri) servis katmanı.
 *
 * Backend `get_snapshot` endpoint'i planın açık feature key'lerini döner;
 * menü/ekran gating'i bu snapshot'a bakar. Snapshot **güvenlik sınırı değil**
 * — gerçek koruma backend'de her korumalı eylemde tekrar sorulur (feed_api
 * `check_feature_or_throw`). Bu yüzden burada UI ipucu olarak kullanıyoruz.
 *
 * State modül seviyesinde (shared) — hem navigation store hem SellerFeedView
 * aynı reactive snapshot'ı okusun, ikinci kez network isteği atılmasın.
 */
const snapshot = ref(loadCached());
const loading = ref(false);

function loadCached() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // ttl_seconds backend'den geliyor (varsayılan 300sn); süresi geçtiyse yok say.
    const ttlMs = (parsed?.ttl_seconds ?? 300) * 1000;
    if (Date.now() - (parsed?._cachedAt ?? 0) > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useEntitlement() {
  /** Snapshot'ı yükle (cache geçerliyse network'e gitmez). */
  async function load(force = false) {
    if (!force && snapshot.value) return snapshot.value;
    loading.value = true;
    try {
      const res = await api.callMethod(`${ENTITLEMENT_API}.get_snapshot`);
      const data = res.message || {};
      data._cachedAt = Date.now();
      snapshot.value = data;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch {
      // Sessiz başarısızlık — fail-open yerine fail-closed: feature yokmuş gibi
      // davranır, gerçek koruma backend'de. Boş snapshot bırak.
      snapshot.value = snapshot.value || { features: {} };
      return snapshot.value;
    } finally {
      loading.value = false;
    }
  }

  /** Plan bu feature'a sahip mi? Snapshot yoksa false (fail-closed). */
  function hasFeature(featureKey) {
    return !!snapshot.value?.features?.[featureKey];
  }

  /** Snapshot cache'ini temizle (logout/plan değişimi sonrası). */
  function reset() {
    snapshot.value = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sessizce yok say */
    }
  }

  return { snapshot, loading, load, hasFeature, reset };
}
