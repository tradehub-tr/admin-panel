// SEO admin endpoint client.
// Backend: tradehub_core.api.seo_admin
//
// utils/api.js'in callMethod/callMethodGET wrapper'ını kullanır (CSRF + auth
// + error handling merkezi).

import api from "@/utils/api";

const PREFIX = "tradehub_core.api.seo_admin";

export async function checkSlugUnique({ doctype, slug, excludeName = "" }) {
  const res = await api.callMethodGET(`${PREFIX}.check_slug_unique`, {
    doctype,
    slug,
    exclude_name: excludeName,
  });
  return res.message ?? res;
}

export async function getSeoFields({ doctype, name }) {
  const res = await api.callMethodGET(`${PREFIX}.get_seo_fields`, {
    doctype,
    name,
  });
  return res.message ?? res;
}

export async function saveSeoFields({ doctype, name, fields }) {
  const res = await api.callMethod(`${PREFIX}.save_seo_fields`, {
    doctype,
    name,
    fields: JSON.stringify(fields),
  });
  return res.message ?? res;
}

// Faz 4c — Statik sayfa SEO listesi (registry + DB override durumu)
export async function listStaticPages() {
  const res = await api.callMethodGET(`${PREFIX}.list_static_pages`);
  return res.message ?? res ?? [];
}
