import { computed, ref } from "vue";

import api from "@/utils/api";
import { toTimestamp } from "@/utils/dateFormat";

const METHOD = "tradehub_core.api.seller_media.get_my_media_history";

/**
 * Üç ayrı kayıt dizisini tek, kararlı zaman çizgisine indir.
 * Sunucu satırları olduğu gibi saklanır; ekran türüne göre güvenli alanları
 * seçer. Aynı zamandaki satırlar kimlikle sıralanır, çizgi yenilemede zıplamaz.
 */
export function mergeMediaHistory(data = {}) {
  const versions = (data.versions || []).map((row) => ({
    id: `version:${row.name}`,
    kind: "version",
    at: row.created_at || row.creation || "",
    row,
  }));
  const jobs = (data.jobs || []).map((row) => ({
    id: `job:${row.name}`,
    kind: "job",
    at: row.finished_at || row.started_at || row.creation || "",
    row,
  }));
  const audit = (data.audit || []).map((row) => ({
    id: `audit:${row.name}`,
    kind: "audit",
    at: row.timestamp || "",
    row,
  }));
  return [...versions, ...jobs, ...audit].sort(
    (a, b) => toTimestamp(b.at) - toTimestamp(a.at) || a.id.localeCompare(b.id)
  );
}

function isDenied(error) {
  return error?.status === 403 || error?.code === "PermissionError";
}

export function useMediaHistory(transport = api) {
  const data = ref({ versions: [], jobs: [], audit: [], totals: {}, truncated: {} });
  const loading = ref(false);
  const error = ref("");
  const denied = ref(false);
  let requestId = 0;

  const timeline = computed(() => mergeMediaHistory(data.value));

  function clear() {
    requestId += 1;
    data.value = { versions: [], jobs: [], audit: [], totals: {}, truncated: {} };
    loading.value = false;
    error.value = "";
    denied.value = false;
  }

  async function load(fileUrl) {
    const url = String(fileUrl || "").trim();
    if (!url) {
      clear();
      return data.value;
    }

    const ticket = ++requestId;
    loading.value = true;
    error.value = "";
    denied.value = false;
    try {
      const response = await transport.callMethodGET(METHOD, { file_url: url });
      if (ticket !== requestId) return data.value;
      const body = response?.message ?? response ?? {};
      data.value = {
        versions: Array.isArray(body.versions) ? body.versions : [],
        jobs: Array.isArray(body.jobs) ? body.jobs : [],
        audit: Array.isArray(body.audit) ? body.audit : [],
        totals: body.totals && typeof body.totals === "object" ? body.totals : {},
        truncated: body.truncated && typeof body.truncated === "object" ? body.truncated : {},
      };
      return data.value;
    } catch (e) {
      if (ticket !== requestId) return data.value;
      if (isDenied(e)) denied.value = true;
      else error.value = e?.message || "unknown";
      data.value = { versions: [], jobs: [], audit: [], totals: {}, truncated: {} };
      return data.value;
    } finally {
      if (ticket === requestId) loading.value = false;
    }
  }

  return { data, timeline, loading, error, denied, load, clear };
}
