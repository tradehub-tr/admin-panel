import { computed, ref, shallowRef } from "vue";

import api from "@/utils/api";
import {
  ALL_REGIONS,
  DEFAULT_SOURCE_WIDTH,
  DEVICES,
  PAGES,
  PRIMARY_REGIONS,
  deviceById,
  regionByKey,
  renditionsFor,
  simulate,
  simulateMatrix,
  sizesFor,
  srcsetAttribute,
  summarize,
} from "@/lib/media/simulator";

/**
 * Önizleme simülatörünün ekran durumu.
 *
 * **Hesap burada YAPILMAZ.** Kutu genişliği, gereken piksel ve basamak seçimi
 * `@/lib/media/simulator`'dan gelir; o modül `srcset.py` ile her `npm test`'te
 * karşılaştırılır (`src/lib/media/simulator/__tests__/srcsetParity.test.js`,
 * 195 + 13 vektör, ölçülen sapma 0). Bu composable yalnız seçimi tutar ve
 * gerçek `Media Rendition` satırını sorar.
 *
 * **Gerçek türev sorgusu neden var.** Simülatör "w384 seçilir" der; kullanıcı
 * haklı olarak "peki o dosya var mı" diye sorar. Bugün `Media Rendition`
 * tablosu BOŞ (boru hattı bayrakları kapalı). Sorguyu atmamak, boşluğu
 * saklamak olurdu; atıp "henüz üretilmedi, hedef genişlik şu" demek
 * durumu birinci sınıf yapar.
 */

/** Sorgunun sonucu — ekran metni buna bakar, üç ayrı bayrağa değil. */
export const PROBE_IDLE = "idle";
export const PROBE_LOADING = "loading";
export const PROBE_FOUND = "found";
export const PROBE_EMPTY = "empty";
export const PROBE_DENIED = "denied";
export const PROBE_FAILED = "failed";

export function useSrcsetSimulator() {
  const deviceId = ref(DEVICES[0]?.id || "");
  const regionKey = ref(PRIMARY_REGIONS[0]?.key || "");
  /** Kaynak görselin genişliği — FR-028 upscale yasağı bunu kullanır. */
  const sourceWidth = ref(DEFAULT_SOURCE_WIDTH);
  /** Matris yalnız 5 birincil bölgeyi mi (65) yoksa 15'ini mi (195) gösterir. */
  const matrixAllRegions = ref(false);

  const device = computed(() => deviceById(deviceId.value) || DEVICES[0]);
  const region = computed(() => regionByKey(regionKey.value) || PRIMARY_REGIONS[0]);

  const ladder = computed(() => renditionsFor(region.value.slotKey, sourceWidth.value));
  const selection = computed(() => simulate(device.value, region.value, ladder.value));
  const sizes = computed(() => sizesFor(region.value));
  const srcset = computed(() => srcsetAttribute(ladder.value));

  const matrixRegions = computed(() => (matrixAllRegions.value ? ALL_REGIONS : PRIMARY_REGIONS));
  const matrix = computed(() => simulateMatrix(DEVICES, matrixRegions.value, sourceWidth.value));
  const summary = computed(() => summarize(matrix.value));

  /** Cihaz seçeneği listesi — etiket + tek satırlık gerekçe. */
  const deviceOptions = computed(() =>
    DEVICES.map((d) => ({
      id: d.id,
      label: d.label,
      hint: `${d.cssWidth}×${d.cssHeight} · DPR ${d.dpr}`,
      group: d.deviceClass,
    }))
  );

  /** Yerleşim seçenekleri — sayfa başlığı altında gruplanır. */
  const placementOptions = computed(() =>
    PAGES.flatMap((p) =>
      p.regions.map((r) => ({
        id: r.key,
        label: r.title,
        hint: r.lcpCandidate ? "LCP" : "",
        group: p.title,
        primary: r.region === p.primaryRegion,
      }))
    )
  );

  // ── Gerçek türev satırı ────────────────────────────────────────

  const probeState = ref(PROBE_IDLE);
  /** Bulunan satır; `shallowRef` — iç alanları hiç mutasyona uğramıyor. */
  const probeRow = shallowRef(null);

  /**
   * Seçilen basamağın gerçekten üretilmiş bir satırı var mı.
   *
   * `Media Rendition.profile` politika profil adını tutar (`w384` gibi).
   * Yetki `hooks.py::media_rendition_query_conditions` ile sunucuda uygulanır;
   * burada ayrıca süzülmez — süzseydik izolasyon istemciye taşınmış olurdu.
   */
  async function probe() {
    const profile = selection.value.chosen?.name;
    probeRow.value = null;
    if (!profile) {
      probeState.value = PROBE_IDLE;
      return null;
    }
    probeState.value = PROBE_LOADING;
    try {
      const res = await api.getList("Media Rendition", {
        fields: ["name", "profile", "width", "height", "format", "file_url", "bytes"],
        filters: [["profile", "=", profile]],
        order_by: "creation desc",
        limit_page_length: 1,
      });
      const row = (res?.data || [])[0] || null;
      probeRow.value = row;
      probeState.value = row ? PROBE_FOUND : PROBE_EMPTY;
      return row;
    } catch (e) {
      probeState.value =
        e?.status === 403 || e?.code === "PermissionError" ? PROBE_DENIED : PROBE_FAILED;
      return null;
    }
  }

  return {
    // seçim
    deviceId,
    regionKey,
    sourceWidth,
    matrixAllRegions,
    device,
    region,
    deviceOptions,
    placementOptions,
    // sonuç
    ladder,
    selection,
    sizes,
    srcset,
    matrix,
    matrixRegions,
    summary,
    // gerçek satır
    probe,
    probeState,
    probeRow,
  };
}
