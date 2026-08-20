import { computed, ref, shallowRef } from "vue";

import api from "@/utils/api";

/**
 * Simülatör karolarına GERÇEK görsel.
 *
 * Çerçevedeki karolar eskiden düz renkli kutuydu; şimdi seçilen basamağın
 * (`w384`, `w640` …) gerçekten üretilmiş `Media Rendition` dosyalarıyla
 * dolar. Yani ekranda görünen şey, o cihazın o bölgede **indireceği dosyanın
 * ta kendisi** — başka bir kaynaktan alınmış "temsili" ürün fotoğrafı değil.
 *
 * **Uydurma uç yok, tahmin yok.** Yalnız genel REST listesi okunur; satıcı
 * izolasyonu sunucuda (`media_rendition_query_conditions`) uygulanır. Seçilen
 * profilde türev yoksa `w384`'e düşülür; o da yoksa liste boş döner ve
 * karolar şematik kutuya geri döner — ekran bunu yazıyla söyler.
 *
 * Profil başına tek sorgu: sonuç önbelleğe alınır, cihaz değişince yeniden
 * sorulmaz (13 cihaz × 15 bölge seçimi aynı birkaç profile iner).
 */
export const FALLBACK_PROFILE = "w384";
/** Karo sayısından fazla ama sayfayı boğmayacak kadar: 7 sütun × 3 bant. */
export const IMAGE_LIMIT = 24;

export function useSimulatorImagery() {
  /** profil → `[{ url, width, height, asset }]` */
  const cache = shallowRef({});
  const loading = ref(false);
  /** Son başarılı yanıtın geldiği profil — ekran "w384'e düştü" diyebilsin. */
  const servedProfile = ref("");
  const requestedProfile = ref("");

  async function fetchProfile(profile) {
    const res = await api.getList("Media Rendition", {
      fields: ["name", "asset", "file_url", "width", "height", "format"],
      filters: [
        ["profile", "=", profile],
        ["format", "=", "webp"],
        ["file_url", "like", "/files/%"],
      ],
      order_by: "creation desc",
      limit_page_length: IMAGE_LIMIT * 2,
    });
    const seen = new Set();
    const out = [];
    for (const row of res?.data || []) {
      // Aynı varlığın birden fazla satırı olabilir; karolar çeşitlensin.
      if (!row.file_url || seen.has(row.asset)) continue;
      seen.add(row.asset);
      out.push({
        url: row.file_url,
        width: row.width,
        height: row.height,
        asset: row.asset,
      });
      if (out.length >= IMAGE_LIMIT) break;
    }
    return out;
  }

  /**
   * Seçilen profil için görselleri hazırla. Önbellekteyse istek atılmaz.
   * Hata (yetki, ağ) sessizce boş listeye düşer: görsel olmaması arıza değil,
   * çerçeve şematik karoyla çizilmeye devam eder.
   */
  async function load(profile) {
    const want = profile || FALLBACK_PROFILE;
    requestedProfile.value = want;
    if (cache.value[want]?.length) {
      servedProfile.value = want;
      return cache.value[want];
    }
    loading.value = true;
    try {
      let rows = cache.value[want] ?? (await fetchProfile(want));
      let served = want;
      if (!rows.length && want !== FALLBACK_PROFILE) {
        rows = cache.value[FALLBACK_PROFILE] ?? (await fetchProfile(FALLBACK_PROFILE));
        served = FALLBACK_PROFILE;
        cache.value = { ...cache.value, [want]: [], [FALLBACK_PROFILE]: rows };
      } else {
        cache.value = { ...cache.value, [want]: rows };
      }
      servedProfile.value = rows.length ? served : "";
      return rows;
    } catch {
      cache.value = { ...cache.value, [want]: [] };
      servedProfile.value = "";
      return [];
    } finally {
      loading.value = false;
    }
  }

  const images = computed(() => {
    const p = servedProfile.value;
    return p ? cache.value[p] || [] : [];
  });

  /** Düşüş oldu mu: istenen profil yok, `w384` gösteriliyor. */
  const fellBack = computed(
    () => !!servedProfile.value && servedProfile.value !== requestedProfile.value
  );

  return { images, loading, servedProfile, requestedProfile, fellBack, load };
}
