// Bildirim şablonları API istemcisi (B4 — gerçek uç).
//
// Uç: `tradehub_core.api.v1.notification_templates.*` (tradehub_core, aşama B2). Sözleşme:
// `desing/bildirim-sablonlari-2026-10-02/BACKEND-API.openapi.json`. Okumalar GET, yazmalar POST;
// yanıt gövdesi `message` içinde.
//
// SÖZLEŞME (özet):
//   list_events({ q?, module?, channel?, publish?, translation?, delivery?, start, page_length })
//       → { events[], total, stats, template_role }      bilinmeyen filtre değeri 422
//   get_event({ key }) → Event (template_role + capabilities dahil)
//   save_event_channels({ key, channels, defaults, delivery, revision }) → Event
//   get_template({ key })
//       → { event, variables[], required_by_channel, draft, published, revision, saved_at, saved_by, template_role }
//   save_draft_bulk({ key, changes: [{ channel, lang, fields }] (1–16), revision })
//       → WriteReceipt { revision, saved_at, saved_by, draft }   `draft` sunucunun normalize ettiği tüm taslak
//   validate({ key }) → { blocking[], warnings[] }
//   publish({ key, revision }) → { version, published_at, revision }; engelleyici hata 422
//   request_publish({ key, revision }) → { state: "onay-bekliyor", revision }
//   set_translation_state({ key, lang, state, revision }) → { langs, revision }
//   send_test({ key, channel, lang, version, target, request_id }) → 202 { state: "queued", delivery_id, queued_at, sent_at }
//   list_versions({ key, start, page_length }) → { versions[], total }
//   get_version({ key, version }) → { content, version, langs }
//   restore_version({ key, version, revision }) → WriteReceipt
//
// Hata gövdesi her zaman `message.error_code` taşır: REVISION_CONFLICT (409), VALIDATION_FAILED
// (422), NOT_FOUND (404), RATE_LIMITED (429), PROVIDER_UNAVAILABLE (503). `request()` bu gövdede
// metni çözemiyor ("HTTP 422" yazıyor); aşağıdaki `call` sunucunun Türkçe metnini hataya taşır.
//
// Yetki: sunucu her çağrıda rolü kendisi denetler; frontend yalnız görünümü kısar.
//
// MOCK YOK: F2'deki mock adaptörü B4'te kaldırıldı (gerekçe `notificationTemplatesGate.js`).

import api from "@/utils/api";
import { errorText, payloadOf, serverFilters } from "@/utils/notificationTemplates/contract";

export {
  conflictOf,
  errorText,
  newRequestId,
  providerUnavailable,
  rateLimited,
  serverFilters,
  validationOf,
} from "@/utils/notificationTemplates/contract";

const METHOD = "tradehub_core.api.v1.notification_templates";

/** `request()` hatasını makine kodu ve sunucu metniyle zenginleştirir (durum + gövde korunur). */
function enrich(err) {
  const p = payloadOf(err);
  if (p.error_code) {
    err.code = p.error_code;
    err.message = errorText(err);
  }
  return err;
}

async function call(kind, name, args) {
  try {
    const res =
      kind === "GET"
        ? await api.callMethodGET(`${METHOD}.${name}`, args)
        : await api.callMethod(`${METHOD}.${name}`, args);
    return res.message;
  } catch (err) {
    throw enrich(err);
  }
}

const read = (name, args) => call("GET", name, args);
const write = (name, args) => call("POST", name, args);

export const listEvents = (params = {}) =>
  read("list_events", { start: 0, page_length: 20, ...serverFilters(params) });

export const getEvent = (key) => read("get_event", { key });

export const saveEventChannels = ({ key, channels, defaults, delivery, revision }) =>
  write("save_event_channels", { key, channels, defaults, delivery, revision });

export const getTemplate = (key) => read("get_template", { key });

/** Tek kanal × dil kaydı (tekil düzeltmeler için; çok kapsamda `saveDraftBulk`). */
export const saveDraft = ({ key, channel, lang, fields, revision }) =>
  write("save_draft", { key, channel, lang, fields, revision });

/** Çok kanallı/dilli kayıt: tek transaction, tek revizyon. `changes` 1–16, kanal/dil tekrarı yok. */
export const saveDraftBulk = ({ key, changes, revision }) =>
  write("save_draft_bulk", { key, changes, revision });

export const validateTemplate = (key) => read("validate", { key });

export const publishTemplate = ({ key, revision }) => write("publish", { key, revision });

export const requestPublish = ({ key, revision }) => write("request_publish", { key, revision });

export const setTranslationState = ({ key, lang, state, revision }) =>
  write("set_translation_state", { key, lang, state, revision });

export const sendTest = ({ key, channel, lang, version, target, request_id }) =>
  write("send_test", { key, channel, lang, version, target, request_id });

export const listVersions = ({ key, start = 0, page_length = 20 }) =>
  read("list_versions", { key, start, page_length });

export const getVersion = ({ key, version }) => read("get_version", { key, version });

export const restoreVersion = ({ key, version, revision }) =>
  write("restore_version", { key, version, revision });
