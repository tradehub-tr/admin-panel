// GitHub Pages'te tam URL, sunucuda relative path
const BASE_URL = import.meta.env.VITE_API_BASE || "";

// CSRF token cache — login/logout'ta sıfırlanır
let _csrfToken = localStorage.getItem("_csrf_token") || null;
let _csrfFetchPromise = null;

async function _fetchCsrfToken() {
  if (_csrfToken) return _csrfToken;
  // Tek seferlik fetch — paralel çağrılar aynı promise'i bekler
  if (!_csrfFetchPromise) {
    _csrfFetchPromise = fetch(`${BASE_URL}/api/method/tradehub_core.api.v1.auth.get_session_user`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        _csrfToken = d?.message?.csrf_token || null;
        if (_csrfToken) localStorage.setItem("_csrf_token", _csrfToken);
        _csrfFetchPromise = null;
        return _csrfToken;
      })
      .catch(() => {
        _csrfFetchPromise = null;
        return null;
      });
  }
  return _csrfFetchPromise;
}

function _clearCsrfCache() {
  _csrfToken = null;
  _csrfFetchPromise = null;
  localStorage.removeItem("_csrf_token");
}

async function request(method, endpoint, data = null) {
  const csrfToken = ["POST", "PUT", "DELETE"].includes(method)
    ? (await _fetchCsrfToken()) || "None"
    : "None";
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Frappe-CSRF-Token": csrfToken,
    },
    credentials: "include",
  };
  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  const url = `${BASE_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new Error("Sunucuya bağlanılamadı. Lütfen Frappe backend'in çalıştığından emin olun.");
  }

  // Handle non-JSON responses gracefully
  const contentType = response.headers.get("content-type") || "";
  let result;
  if (contentType.includes("application/json")) {
    try {
      result = await response.json();
    } catch {
      throw new Error(`Sunucudan geçersiz JSON yanıtı alındı (HTTP ${response.status})`);
    }
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Sunucu hatası: HTTP ${response.status}`);
    }
    // Some Frappe endpoints return text (e.g. login returns "Logged In")
    result = { message: text };
  }

  if (!response.ok) {
    // Session expired — 401 (Unauthorized) veya Frappe-spesifik 417 ValidationError
    // ("User None is disabled" gibi). Frappe v15'te invalid/expired session
    // resume edilemediğinde 417 + ValidationError döner. Bunu da session expired
    // olarak yakalayıp cookie'leri temizleyip login'e atmamız gerek.
    // NOT: "not permitted" (PermissionError) burada yakalanmaz — yetki hatası
    // session expired değildir; toast olarak gösterilip kullanıcı sayfada kalmalı.
    const isSessionExpired =
      response.status === 401 ||
      (response.status === 417 &&
        (result?.exception?.includes?.("is disabled") ||
          (result?._server_messages || "").includes?.("disabled") ||
          result?.exc_type === "AuthenticationError"));
    if (isSessionExpired) {
      const isAuthEndpoint =
        endpoint.includes("login") ||
        endpoint.includes("logout") ||
        endpoint.includes("get_session_user") ||
        endpoint.includes("get_logged_user");
      if (!isAuthEndpoint) {
        // Bozuk cookie'leri temizle — yeni login fresh state alsın
        _clearCsrfCache();
        // JS'ten erişilebilir cookie'ler (user_id, full_name, system_user vs.)
        try {
          document.cookie.split(";").forEach((c) => {
            const eq = c.indexOf("=");
            const name = (eq > -1 ? c.substring(0, eq) : c).trim();
            if (name) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            }
          });
        } catch {
          /* cookie temizleme defansif */
        }
        // CRITICAL: `sid` cookie httpOnly=true (Frappe auth.py:382). JS'ten silemeyiz.
        // fetch() ile gelen Set-Cookie'ler bazen browser tarafından (özellikle
        // httpOnly) ignore edilebiliyor. HTML navigation Set-Cookie'leri kesin
        // uygular. `/panel/reset` endpoint'i tüm session cookies'i expire ile
        // siler ve 302 ile /panel/login'e yönlendirir.
        window.location.href = `/panel/reset`;
        throw new Error("Oturum süresi doldu. Giriş sayfasına yönlendiriliyorsunuz.");
      }
    }

    // Frappe hata mesajını düzgün çözümle
    let msg = result?.message || "";

    // _server_messages: JSON-encoded array of JSON-encoded message objects
    if (!msg && result?._server_messages) {
      try {
        const msgs = JSON.parse(result._server_messages);
        const first = msgs?.[0];
        if (first) {
          const parsed = typeof first === "string" ? JSON.parse(first) : first;
          msg = parsed?.message || parsed?.title || String(first);
        }
      } catch {
        /* ignore */
      }
    }

    // exception field (stack trace summary)
    if (!msg && result?.exception) {
      msg = result.exception.split("\n").pop()?.trim() || result.exception;
    }

    msg = msg || result?.exc_type || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return result;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
}

export default {
  // Auth
  async login(usr, pwd) {
    _clearCsrfCache();
    const res = await request("POST", "/api/method/login", { usr, pwd });
    _clearCsrfCache(); // login sonrası yeni session için token'ı yenile
    return res;
  },
  async logout() {
    const res = await request("POST", "/api/method/logout");
    _clearCsrfCache();
    return res;
  },
  async getLoggedUser() {
    const res = await request("GET", "/api/method/frappe.auth.get_logged_user");
    const email = res.message;
    if (!email || email === "Guest") {
      throw new Error("Oturum açılmamış");
    }
    const userRes = await request("GET", `/api/resource/User/${encodeURIComponent(email)}`);
    return userRes.data;
  },

  // Registration
  async register(email, fullName) {
    return request("POST", "/api/method/frappe.core.doctype.user.user.sign_up", {
      email,
      full_name: fullName,
      redirect_to: "/",
    });
  },

  // Forgot password
  async forgotPassword(email) {
    return request("POST", "/api/method/frappe.core.doctype.user.user.reset_password", {
      user: email,
    });
  },

  // Generic CRUD
  async getList(doctype, params = {}) {
    const qs = new URLSearchParams({
      fields: JSON.stringify(params.fields || ["*"]),
      filters: JSON.stringify(params.filters || []),
      order_by: params.order_by || "modified desc",
      limit_start: params.limit_start || 0,
      limit_page_length: params.limit_page_length || 20,
    });
    if (params.or_filters && params.or_filters.length) {
      qs.set("or_filters", JSON.stringify(params.or_filters));
    }
    return request("GET", `/api/resource/${encodeURIComponent(doctype)}?${qs}`);
  },
  async getDoc(doctype, name) {
    return request(
      "GET",
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );
  },
  async createDoc(doctype, data) {
    return request("POST", `/api/resource/${encodeURIComponent(doctype)}`, data);
  },
  async updateDoc(doctype, name, data) {
    return request(
      "PUT",
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      data
    );
  },
  async deleteDoc(doctype, name) {
    return request(
      "DELETE",
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );
  },
  async callMethod(method, args = {}) {
    return request("POST", `/api/method/${method}`, args);
  },
  async callMethodGET(method, args = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null) qs.set(k, v);
    }
    const query = qs.toString();
    return request("GET", `/api/method/${method}${query ? "?" + query : ""}`);
  },
  async getCount(doctype, filters = []) {
    // Frappe `frappe.client.get_count` permission_query_conditions'ı bypass
    // ediyor — multi-tenant'ta CRM doctype'ları için tradehub_core'un
    // permission-aware endpoint'ine yönlendir. Diğer doctype'lar default'a gider.
    const CRM_DOCTYPES = new Set([
      "CRM Lead",
      "CRM Deal",
      "CRM Organization",
      "CRM Task",
      "CRM Call Log",
      "FCRM Note",
      "Contact",
    ]);
    if (CRM_DOCTYPES.has(doctype)) {
      const qs = new URLSearchParams({
        doctype,
        filters: JSON.stringify(filters),
      });
      const res = await request(
        "GET",
        `/api/method/tradehub_core.api.v1.crm_overrides.crm_get_count?${qs}`
      );
      // Frappe whitelisted method response: { message: <count> }
      // getCount caller'ları `res.message` bekliyor (DealsListView vb.); aynı şekli koru.
      return { message: res.message ?? 0 };
    }
    const qs = new URLSearchParams({ filters: JSON.stringify(filters) });
    return request(
      "GET",
      `/api/method/frappe.client.get_count?doctype=${encodeURIComponent(doctype)}&${qs}`
    );
  },
  async getSessionUser() {
    return request("GET", "/api/method/tradehub_core.api.v1.auth.get_session_user");
  },
  async getCsrfToken() {
    return (await _fetchCsrfToken()) || "None";
  },
  setCsrfToken(token) {
    _csrfToken = token;
    if (token) localStorage.setItem("_csrf_token", token);
  },
  async uploadFile(file, folder = "Home") {
    const csrfToken = await this.getCsrfToken();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("is_private", "0");
    fd.append("folder", folder);
    const res = await fetch(`${BASE_URL}/api/method/upload_file`, {
      method: "POST",
      body: fd,
      headers: { "X-Frappe-CSRF-Token": csrfToken },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data._server_messages
        ? JSON.parse(JSON.parse(data._server_messages)[0])?.message
        : data.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data.message?.file_url || "";
  },
  async uploadCertDocument(file) {
    // Sertifika belgesi yükleme — base64 JSON POST.
    //
    // ÖNEMLİ: Multipart/form-data Frappe'nin session/cookie middleware'inde
    // yan etki yaratıyor (sid cookie değişip CSRF mismatch 417 dönüyor).
    // Standart JSON API call ile bu sorun TAMAMEN ortadan kalkar.
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data:...;base64,<content>
      reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı"));
      reader.readAsDataURL(file);
    });
    const res = await this.callMethod(
      "tradehub_core.api.seller_certifications.upload_seller_cert_document",
      { file_name: file.name, file_content: base64 }
    );
    return res?.message?.file_url || "";
  },
  async getMeta(doctype) {
    // frappe.desk.form.load.getdoctype — tüm authenticated user'lar için çalışır
    // Yanıt formatı: { "docs": [{ name, fields, ... }], "message": null }
    // cached_timestamp'e Date.now() koymak HTTP cache'i atlatır — DocType JSON
    // değişikliklerinden sonra eski meta'yı görmemek için kritik.
    const qs = new URLSearchParams({
      doctype,
      with_parent: 0,
      cached_timestamp: Date.now().toString(),
    });
    const res = await request("GET", `/api/method/frappe.desk.form.load.getdoctype?${qs}`);
    // docs top-level'da gelir, message içinde değil
    // docs dizisi birden fazla DocType içerebilir (parent + child'lar).
    // İstenen DocType'ı name'e göre bul, bulunamazsa ilk öğeyi kullan.
    const docs = res.docs || res.message?.docs || [];
    const meta = docs.find((d) => d.name === doctype) || docs[0] || {};
    return { message: meta };
  },

  /** Link alanı için bağlı DocType'ta arama yapar */
  async searchLink(doctype, query = "", filters = []) {
    const qs = new URLSearchParams({
      doctype,
      txt: query,
      page_length: 10,
      filters: JSON.stringify(filters),
    });
    return request("GET", `/api/method/frappe.desk.search.search_link?${qs}`);
  },
};
