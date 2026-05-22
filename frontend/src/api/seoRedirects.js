// SEO Redirect + 404 Log admin API client.
// utils/api.js üzerinden CSRF + auth merkezi.

import api from "@/utils/api";

const PREFIX = "tradehub_core.api.seo_admin";

export async function listRedirects({ enabledOnly = 1 } = {}) {
  const res = await api.callMethodGET(`${PREFIX}.list_redirects`, {
    enabled_only: enabledOnly,
  });
  return res.message ?? res;
}

export async function list404s({ resolved = 0, limit = 100 } = {}) {
  const res = await api.callMethodGET(`${PREFIX}.list_404s`, {
    resolved,
    limit,
  });
  return res.message ?? res;
}

export async function addRedirectFrom404({ logName, targetPath, statusCode = "301" }) {
  const res = await api.callMethod(`${PREFIX}.add_redirect_from_404`, {
    log_name: logName,
    target_path: targetPath,
    status_code: statusCode,
  });
  return res.message ?? res;
}

// Generic doctype CRUD — Frappe REST
export async function createRedirect(data) {
  return api.createDoc("SEO Redirect", data);
}

export async function updateRedirect(name, data) {
  return api.updateDoc("SEO Redirect", name, data);
}

export async function deleteRedirect(name) {
  return api.deleteDoc("SEO Redirect", name);
}
