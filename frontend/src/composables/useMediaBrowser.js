import { computed, ref, toValue } from "vue";

/**
 * Sanal klasör gezgininin gezinme çekirdeği.
 *
 * Medya klasörleri SANALDIR: disk hash-shard'lı kalır, ağaç sunucuda
 * metadata'dan türetilir. Panelde bunun karşılığı hep aynı üç davranıştır —
 * bir seviyeyi yükle, klasöre gir, kırıntıdan geri dön — ve bu davranış
 * yönetici gezgininde (`views/system/MediaExplorerView.vue`) satır satır
 * yazılıydı. Satıcı gezgini eklenirken aynı 80 satırı ikinci kez yazmak
 * yerine buraya alındı; iki ekran ayrışırsa gezinme de ayrışır.
 *
 * Uç bilgisi burada YOK: çağrıyı `fetchLevel` yapar. Composable ne adres
 * bilir ne parametre adı — böylece hangi ucun hangi kapsamı gördüğü
 * (yönetici hepsini, satıcı yalnız kendisininkini) tek bir yerde, çağıran
 * ekranda kalır.
 *
 * @param {object} opts
 * @param {string[]} opts.keys      Klasör seviyeleri, kökten yaprağa sıralı.
 * @param {Function} opts.fetchLevel `(params) => {folders} | {items,total}`
 * @param {string|Function} [opts.rootLabel] Kırıntının ilk halkası.
 * @param {number} [opts.pageSize]
 */
export function useMediaBrowser({ keys, fetchLevel, rootLabel = "", pageSize: initialSize = 50 }) {
  const blankPath = () => Object.fromEntries(keys.map((k) => [k, ""]));

  const path = ref(blankPath());
  const folders = ref([]);
  const files = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(initialSize);
  const search = ref("");
  const loading = ref(false);
  /** Boş dize = sorun yok. Dolu ise sunucunun anlattığı hata. */
  const error = ref("");
  /**
   * Dosya seviyesinde miyiz — derinlikten DEĞİL, yanıttan anlaşılır.
   * Kapsamlar farklı derinlikte yaprağa iniyor (satıcıda `private` kökün
   * hemen altında dosya verir, `public` iki klasör daha açar).
   */
  const atFileLevel = ref(false);

  /** Klasör kimliği → girerken görülen ad. Kırıntı ham kimlik göstermesin. */
  const crumbLabels = ref({});

  const currentCount = computed(() =>
    atFileLevel.value ? total.value : folders.value.reduce((sum, f) => sum + (f.count || 0), 0)
  );

  const breadcrumb = computed(() => {
    const items = [{ key: "root", value: "", label: toValue(rootLabel) }];
    for (const key of keys) {
      const value = path.value[key];
      if (!value) break;
      items.push({ key, value, label: crumbLabels.value[value] || value });
    }
    return items;
  });

  /** Tıklanan klasörün dolduracağı seviye — ilk boş olan. */
  function nextKey() {
    return keys.find((k) => !path.value[k]) || "";
  }

  /**
   * Bir seviyeyi yükle.
   *
   * **Asla fırlatmaz.** Uç henüz yayına girmemiş ya da hata döndürmüş olabilir;
   * o durumda ekran çökmemeli, boş klasör göstermeli. Hata metni `error`'da
   * durur, çağıran ekran onu boş durumun altında gösterir.
   */
  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const data =
        (await fetchLevel({
          ...path.value,
          page: page.value,
          page_size: pageSize.value,
          search: search.value,
        })) || {};
      atFileLevel.value = Array.isArray(data.items);
      folders.value = data.folders || [];
      files.value = data.items || [];
      total.value = data.total || 0;
    } catch (e) {
      error.value = e?.message || "unknown";
      atFileLevel.value = false;
      folders.value = [];
      files.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  /** Klasöre gir. `label` verilmezse klasörün kendi adı kırıntıya yazılır. */
  function enter(folder, label = "") {
    const key = nextKey();
    if (!key || !folder?.id) return Promise.resolve();
    crumbLabels.value = { ...crumbLabels.value, [folder.id]: label || folder.label || folder.id };
    path.value = { ...path.value, [key]: folder.id };
    page.value = 1;
    search.value = "";
    return load();
  }

  /** Kırıntıdan geri dön — `key`'in ALTINDAKİ seviyeler temizlenir. */
  function jump(key) {
    const from = key === "root" ? 0 : keys.indexOf(key) + 1;
    if (from <= 0 && key !== "root") return Promise.resolve();
    const next = { ...path.value };
    for (const k of keys.slice(from)) next[k] = "";
    path.value = next;
    page.value = 1;
    search.value = "";
    return load();
  }

  function setPage(value) {
    page.value = value;
    return load();
  }

  function applySearch() {
    page.value = 1;
    return load();
  }

  return {
    path,
    folders,
    files,
    total,
    page,
    pageSize,
    search,
    loading,
    error,
    atFileLevel,
    breadcrumb,
    currentCount,
    load,
    enter,
    jump,
    setPage,
    applySearch,
  };
}
