import { shallowReactive } from "vue";

/**
 * Önizleme penceresini açan taraf (spec §4.4). Ekranlar bunu bir kez kurar,
 * `ImagePlacementButton@open` → `show`, yükleme bitince → `afterUpload`.
 * `shallowReactive`: `returnFocus` bir DOM öğesi ya da fonksiyon; derin
 * proxy'ye sokulmamalı.
 */
async function defaultPrefs() {
  const m = await import("../lib/media/preview/previewApi.js");
  return m.getPreviewPrefs();
}

function fileNameOf(url) {
  const last =
    String(url || "")
      .split("/")
      .pop() || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function usePlacementLauncher({ getPrefs = defaultPrefs } = {}) {
  const state = shallowReactive({
    open: false,
    fileUrl: "",
    slotKey: "",
    fileName: "",
    context: {},
    returnFocus: null,
    auto: false,
  });

  function show({ fileUrl, slotKey, context = {}, trigger = null, auto = false } = {}) {
    if (!fileUrl || !slotKey) return false;
    Object.assign(state, {
      open: true,
      fileUrl,
      slotKey,
      context,
      returnFocus: trigger,
      auto,
      fileName: fileNameOf(fileUrl),
    });
    return true;
  }

  /** Yalnız TEK dosya seçilip yüklendiyse ve kullanıcı tercihi kapalı değilse açar. */
  async function afterUpload({
    selected,
    fileUrl,
    slotKey,
    context = {},
    canOpen = () => true,
  } = {}) {
    if (selected !== 1 || !fileUrl || !slotKey) return false;
    let prefs;
    try {
      prefs = (await getPrefs()) || { autoopen: true };
    } catch {
      // Tercih okunamadı: sessizce AÇMA (kapalı tercih sahibini şaşırtma);
      // "Nerelerde görünecek?" düğmesi yine kullanılabilir.
      return false;
    }
    if (prefs.autoopen === false) return false;
    // Açık pencere başka bir görselin üzerinde: kendiliğinden açılış onu ele
    // geçirmemeli (Kaydet eski varlığa yazardı). Kontrol `await`ten SONRA —
    // pencere tercih okunurken de açılmış olabilir.
    if (state.open || !canOpen()) return false;
    const trigger = () =>
      document.querySelector(`[data-placement-url="${CSS.escape(fileUrl)}"] .ipb__btn`);
    return show({ fileUrl, slotKey, context, trigger, auto: true });
  }

  function hide() {
    state.open = false;
  }

  return { state, show, afterUpload, hide };
}
