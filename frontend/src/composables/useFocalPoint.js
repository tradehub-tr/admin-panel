import { computed, ref, shallowRef } from "vue";

import { clampFocal } from "../lib/media/crop/geometry.js";
import { fromServerSuggestion } from "../lib/media/crop/focusSuggest.js";

/**
 * Önizleme penceresinin odak noktası durumu (spec §4.3).
 *
 * Saf kalır: i18n yok (bildirimler `{key, params}` olarak döner), HTTP
 * `deps` ile enjekte edilir; varsayılan `cropIntentApi.js` TEMBEL yüklenir
 * çünkü `@/utils/api` Vite dışında import edilemez. `useCropStudio.js`'e
 * dokunulmaz.
 */

const STEP = 0.01;
const BIG_STEP = 0.1;
const round4 = (v) => Math.round(v * 10000) / 10000;
const pct = (v) => Math.round(clampFocal(v) * 100);
const same = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

async function defaultDeps() {
  const m = await import("../lib/media/crop/cropIntentApi.js");
  return { getIntent: m.getCropIntent, suggest: m.suggestCropFocal, saveFocal: m.saveFocalOnly };
}

export function useFocalPoint({ asset = "", initialFocal = null, deps = null } = {}) {
  const focal = ref({ x: 0.5, y: 0.5 });
  const saved = ref({ x: 0.5, y: 0.5 });
  const etag = ref("");
  const loading = ref(false);
  const saving = ref(false);
  const conflict = ref(false);
  const failed = ref(false);
  const announce = shallowRef(null);
  const viewed = new Map();
  let origin = "manual";
  let suggestion = null;
  let api = deps;

  const percent = computed(() => ({ x: pct(focal.value.x), y: pct(focal.value.y) }));
  const dirty = computed(() => !same(focal.value, saved.value));

  async function getApi() {
    api ||= await defaultDeps();
    return api;
  }
  function say(key, params = {}) {
    announce.value = { key, params };
  }

  function setFocal(x, y) {
    focal.value = { x: clampFocal(x), y: clampFocal(y) };
    origin = "manual";
    say("imagePlacement.status.moved", { ...percent.value });
  }
  function setPercent(axis, value) {
    const n = Number(value);
    const v = value === "" || !Number.isFinite(n) ? 0.5 : n / 100;
    if (axis === "x") setFocal(v, focal.value.y);
    else setFocal(focal.value.x, v);
  }
  function nudge(dx, dy, big = false) {
    const s = big ? BIG_STEP : STEP;
    setFocal(round4(focal.value.x + dx * s), round4(focal.value.y + dy * s));
  }
  function center() {
    focal.value = { x: 0.5, y: 0.5 };
    origin = "manual";
    say("imagePlacement.status.centered");
  }
  function markViewed(place, device) {
    viewed.set(`${device}:${place}`, { place, device });
  }

  async function suggest() {
    if (!asset) return false;
    try {
      const s = fromServerSuggestion(await (await getApi()).suggest(asset));
      if (!s) return false;
      focal.value = { x: s.x, y: s.y };
      origin = "smartcrop";
      suggestion = s;
      say("imagePlacement.status.suggested");
      return true;
    } catch {
      // spec §7: öneri başarısız → odak ortada kalır, bildirim yok.
      return false;
    }
  }

  async function load() {
    loading.value = true;
    conflict.value = false;
    failed.value = false;
    try {
      if (initialFocal)
        focal.value = { x: clampFocal(initialFocal.x), y: clampFocal(initialFocal.y) };
      if (!asset) return;
      const body = await (await getApi()).getIntent(asset);
      etag.value = body?.etag || "";
      const fx = body?.intent?.focal_x;
      const fy = body?.intent?.focal_y;
      if (fx !== null && fx !== undefined && fy !== null && fy !== undefined) {
        focal.value = { x: clampFocal(fx), y: clampFocal(fy) };
        return;
      }
      if (initialFocal) return;
      saved.value = { ...focal.value };
      await suggest();
      return;
    } catch {
      // Okuma hatası: elimizdeki değerle devam; Kaydet yine denenebilir (ETag'siz).
    } finally {
      if (!(origin === "smartcrop" && suggestion)) saved.value = { ...focal.value };
      loading.value = false;
    }
  }

  async function save() {
    if (!asset) return { ok: false, reason: "no-asset" };
    saving.value = true;
    failed.value = false;
    conflict.value = false;
    try {
      const smart = origin === "smartcrop" && suggestion;
      const body = await (
        await getApi()
      ).saveFocal({
        asset,
        focalX: round4(focal.value.x),
        focalY: round4(focal.value.y),
        ifMatch: etag.value,
        previewed: [...viewed.values()],
        method: smart ? "smartcrop" : "manual",
        algorithm: smart ? suggestion.algorithm || "" : "",
        algorithmVersion: smart ? suggestion.algorithmVersion || "" : "",
      });
      etag.value = body?.etag || "";
      saved.value = { ...focal.value };
      say("imagePlacement.status.saved");
      return { ok: true };
    } catch (err) {
      if (err?.status === 412) {
        conflict.value = true;
        say("imagePlacement.status.conflict");
        return { ok: false, reason: "conflict" };
      }
      failed.value = true;
      say("imagePlacement.status.saveFailed");
      return { ok: false, reason: "error" };
    } finally {
      saving.value = false;
    }
  }

  return {
    focal,
    percent,
    dirty,
    loading,
    saving,
    conflict,
    failed,
    announce,
    load,
    suggest,
    setFocal,
    setPercent,
    nudge,
    center,
    markViewed,
    save,
  };
}
