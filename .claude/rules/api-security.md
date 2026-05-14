---
paths:
  - "src/utils/api.js"
  - "src/stores/**/*.js"
  - "src/composables/**/*.js"
  - "**/*.vue"
---

# API katmanı + güvenlik

## 1. API katmanı (`src/utils/api.js`) — Asla yapma

- `fetch(...)` doğrudan çağırma — `api.request` üzerinden git.
- Multipart upload dışında `Content-Type` veya `X-Frappe-CSRF-Token` header'ını manuel set etme.
- Filter/field array'lerini elle string'e çevirme.
- 401 redirect mantığını component'te tekrar yazma — `request()` yapıyor.
- `_csrf_token`'ı localStorage dışında bir yere yazma.

## 2. Yeni endpoint eklerken

1. **Frappe whitelisted method:** `api.callMethod("tradehub_core.api.v1.module.fn", { ... })` (POST) veya `api.callMethodGET(...)` (GET).
2. **Generic doctype CRUD:** `api.getList / getDoc / createDoc / updateDoc / deleteDoc`.
3. **Permission-aware count:** `api.getCount` (CRM override eder).
4. **Hata:** `request()` zaten `_server_messages` / `exception` / `exc_type`'ı çözüp `Error.message` üretir. `try/catch (e) { toast.error(e.message) }` yeterli.

## 3. Güvenlik checklist

> Vue 3 `{{ }}` ve `:attr` binding'lerini otomatik escape eder. Aşağıdakiler **manuel** dikkat gerektirir.

| Risk | Ne yapma | Ne yap |
|---|---|---|
| **XSS via v-html** | `<div v-html="userInput" />` | Backend sanitize ettiği HTML için + neden güvenli olduğunu yorumda yaz. |
| **Open redirect** | `window.location.href = route.query.next` | `router.push(internal)`; `/` ile başlamalı, `//` veya protokol içermemeli. |
| **JS injection** | `<a :href="userUrl">` (sanitize edilmemiş) | `^(https?:|/|mailto:)` regex; `javascript:`, `data:` blokla. |
| **Style injection** | `<div :style="userStyleObject">` (whitelist'siz) | Sadece bilinen property'leri al. |
| **Dynamic component** | `<component :is="userInput">` | İzin verilen map'ten seç (`COMPONENT_MAP[key] ?? Fallback`). |
| **Token sızıntısı** | Token'ı log / error / URL'e yazma | Sadece header'a koy. |
| **VITE_ env** | `VITE_API_SECRET` | **Bundle'a inline edilir, herkes görür.** Sadece public config için. |

## 4. CRM doctype permission desenleri

CRM doctype'ları (`utils/api.js:218` `CRM_DOCTYPES` listesi) için `api.getCount` özel davranır. Liste:
- `CRM Lead`, `CRM Deal`, `CRM Organization`, `CRM Contact`, `CRM Task`, `CRM Call Log`, `CRM Note`, vs.

Yeni CRM doctype eklenirse bu listeye ekle yoksa count yanlış döner.
