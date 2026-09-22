// SEO Helper (MOGEM-663) süper admin ekranı — backend: seo_helper_cms.api.panel (+ mcp.api / mcp.ops).
// utils/api.js callMethod/callMethodGET (CSRF + auth + hata) üzerinden.

import api from "@/utils/api";

const P = "seo_helper_cms.api.panel";
const MCP = "seo_helper_cms.mcp.api";
const OPS = "seo_helper_cms.mcp.ops";

const unwrap = (res) => res?.message ?? res;

export const getSummary = () => api.callMethodGET(`${P}.summary`).then(unwrap);
export const listDrafts = (params) => api.callMethodGET(`${P}.drafts`, params).then(unwrap);
export const getDraft = (name) => api.callMethodGET(`${P}.draft_detail`, { name }).then(unwrap);
export const approveDraft = (draft, note = "") =>
  api.callMethod(`${MCP}.approve_draft`, { draft, note }).then(unwrap);
export const rejectDraft = (draft, note = "") =>
  api.callMethod(`${MCP}.reject_draft`, { draft, note }).then(unwrap);

export const listPages = (params) => api.callMethodGET(`${P}.pages`, params).then(unwrap);
export const listFindings = (params) => api.callMethodGET(`${P}.findings`, params).then(unwrap);
export const listCrawlRuns = () => api.callMethodGET(`${P}.crawl_runs`).then(unwrap);
export const runAudit = (routes) =>
  api.callMethod(`${P}.audit_run`, { routes: JSON.stringify(routes || []) }).then(unwrap);

export const getQueue = (params) => api.callMethodGET(`${P}.queue`, params).then(unwrap);
export const requeueJobs = ({ jobs = [], allDead = false } = {}) =>
  api
    .callMethod(`${P}.requeue_jobs`, { jobs: JSON.stringify(jobs), all_dead: allDead ? 1 : 0 })
    .then(unwrap);

export const listClients = () => api.callMethodGET(`${P}.clients`).then(unwrap);
export const listToolCalls = (params) => api.callMethodGET(`${P}.tool_calls`, params).then(unwrap);
export const createClient = (payload) =>
  api.callMethod(`${OPS}.create_client`, payload).then(unwrap);
export const rotateKey = (client) => api.callMethod(`${OPS}.rotate_key`, { client }).then(unwrap);
export const disableClient = (client) =>
  api.callMethod(`${OPS}.disable_client`, { client }).then(unwrap);
