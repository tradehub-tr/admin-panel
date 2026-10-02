// MOGEM-662 — Crawl Manager, bot logu, pano, denetim raporlayıcı, Search Console, deneyler.
// Backend: tradehub_core.seo_helper.api.panel662 (yalnız süper admin).
import api from "@/utils/api";

const P = "tradehub_core.seo_helper.api.panel662";
const unwrap = (res) => res?.message ?? res;
const get = (m, params) => api.callMethodGET(`${P}.${m}`, params).then(unwrap);
const post = (m, params) => api.callMethod(`${P}.${m}`, params).then(unwrap);

// 13.1
export const crawlStart = (p) =>
  post("crawl_start", { ...p, routes: JSON.stringify(p.routes || []) });
export const crawlPause = (run) => post("crawl_pause", { run });
export const crawlResume = (run) => post("crawl_resume", { run });
export const crawlCancel = (run) => post("crawl_cancel", { run });
export const crawlRuns = (params) => get("crawl_runs", params);
export const crawlPages = (params) => get("crawl_pages", params);
export const crawlTrend = (limit = 20) => get("crawl_trend", { limit });
// 13.2
export const botlogImport = (text, host = "") => post("botlog_import", { text, host });
export const botlogImportScheduled = () => post("botlog_import_scheduled");
export const botlogCoverage = (days) => get("botlog_coverage", { days });
export const botlogVisits = (params) => get("botlog_visits", params);
// 13.3
export const boardOverview = () => get("board_overview");
export const boardVisibility = (dimension) => get("board_visibility", { dimension });
export const boardConversions = (dimension, days) => get("board_conversions", { dimension, days });
export const boardSnapshotNow = () => post("board_snapshot_now");
// 13.4
export const auditReport = (params) => get("audit_report", params);
// 662 §2/§3 — var olan sinyalleri (404 / medya / bot-log) ayrı etiketle al; denetlenebilir dışa rapor (indirme)
export const auditImportSignals = (kind = "all") => post("audit_import_signals", { kind });
export const auditExportUrl = (params) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== "" && v != null))
  );
  return `/api/method/${P}.audit_export?${q.toString()}`;
};
export const auditMarkFixed = (finding, recrawl = 1) =>
  post("audit_mark_fixed", { finding, recrawl });
export const auditClose = (finding, note = "") => post("audit_close", { finding, note });
export const auditReopen = (finding) => post("audit_reopen", { finding });
export const auditRerun = (crawl_run) => post("audit_rerun", { crawl_run });
// 13.5
export const gscStatus = () => get("gsc_status");
export const gscAuthUrl = () => get("gsc_auth_url");
export const gscSyncNow = (days = 14, inspect = 0) => post("gsc_sync_now", { days, inspect });
export const gscSubmitSitemap = () => post("gsc_submit_sitemap");
// 13.6
export const changelog = (params) => get("changelog", params);
export const changelogAdd = (p) => post("changelog_add", p);
export const experimentsList = () => get("experiments_list");
export const experimentCreate = (p) =>
  post("experiment_create", {
    ...p,
    treatment_routes: JSON.stringify(p.treatment_routes || []),
    control_routes: JSON.stringify(p.control_routes || []),
  });
export const experimentEvaluate = (experiment) => post("experiment_evaluate", { experiment });
export const conversionsSeries = (days = 30) => get("conversions_series", { days });
