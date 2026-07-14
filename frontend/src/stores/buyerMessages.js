/**
 * Buyer ↔ Seller mesajlaşma store'u — TeamsLike (tradehub_core proxy) üzerinden.
 *
 * Frappe session'da seller user oturum açtığında backend `_is_seller` döner ve
 * çağrılar `/v1/inbox/*` endpoint'lerine yönlenir. Bu store hem aktif
 * conversation hem de inbox listesi için polling yapar:
 *
 * - Inbox: 10 sn (kullanıcı pasifken)
 * - Aktif thread: 3 sn (testbaba pattern)
 *
 * Realtime push yerine polling tercih ettik çünkü teamslike WebSocket sunmuyor;
 * kullanıcı arka plana geçince poller durdurulur (start/stop methodları view
 * tarafından lifecycle hook'larında çağrılır).
 */

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/utils/api";

const INBOX_POLL_MS = 10_000;
const ACTIVE_POLL_MS = 3_000;

function toDate(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toHHMM(d) {
  if (!d) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toRelative(d) {
  if (!d) return "";
  const diffSec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "Şimdi";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
  if (diffSec < 172800) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function threadToConversation(t) {
  const contact = t.contact || {};
  const last = t.last_non_activity_message || null;
  const lastDate = toDate(last?.created_at);
  return {
    id: String(t.id ?? ""),
    buyerName: contact.name || contact.email || "Alıcı",
    buyerEmail: contact.email || "",
    buyerInitial: (contact.name || contact.email || "A").trim().charAt(0).toUpperCase(),
    status: t.status || "open",
    lastMessage: last?.content || "",
    lastTime: toRelative(lastDate),
    lastTimestamp: lastDate ? lastDate.getTime() : 0,
    unread: typeof t.unread_count === "number" ? t.unread_count : 0,
    _raw: t,
  };
}

const VIDEO_CALL_MARKER = "🎥";
const URL_REGEX_G = /(https?:\/\/[^\s]+)/g;

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkify(text) {
  let last = 0;
  let out = "";
  for (const m of text.matchAll(URL_REGEX_G)) {
    const start = m.index ?? 0;
    out += escapeHtml(text.slice(last, start));
    const url = m[1];
    const safe = escapeHtml(url);
    out +=
      `<a href="${safe}" target="_blank" rel="noopener noreferrer" ` +
      `class="underline break-all opacity-90 hover:opacity-100">${safe}</a>`;
    last = start + url.length;
  }
  out += escapeHtml(text.slice(last));
  return out;
}

function extractVideoCallUrl(text) {
  if (!text || !text.includes(VIDEO_CALL_MARKER)) return null;
  const m = text.match(URL_REGEX_G);
  return m ? m[0] : null;
}

// Chatwoot FRONTEND_URL = http://0.0.0.0:3000 olduğunda attachment URL'leri
// bind address ile döner; browser bunu çözemez (NS_ERROR_CONNECTION_REFUSED).
// Geçici rewrite — kalıcı çözüm chatwoot .env'de FRONTEND_URL=http://localhost:3000.
function rewriteAttachmentUrl(url) {
  if (!url) return url;
  return url.replace(
    /^https?:\/\/0\.0\.0\.0(:\d+)?\//,
    (_m, port) => `http://localhost${port || ""}/`
  );
}

function messageToView(m) {
  const date = toDate(m.created_at);
  // Seller (admin-panel) için: outgoing=ben gönderdim, incoming=buyer
  const isOutgoing = m.message_type === 1;
  const text = m.content || "";
  // Tek attachment beklentisi — backend send_attachment her zaman tek dosya gönderir.
  const att = m.attachments && m.attachments[0];
  const view = {
    id: String(m.id ?? `m-${Date.now()}`),
    direction: isOutgoing ? "me" : "them",
    text,
    textHtml: linkify(text),
    time: toHHMM(date),
    timestamp: date ? date.getTime() : 0,
    read: true,
    videoCallUrl: extractVideoCallUrl(text),
    attachmentType: null, // "image" | "file" | null
    attachmentUrl: "",
    attachmentName: "",
    attachmentSize: 0,
    attachmentMime: "",
  };
  if (att && att.data_url) {
    view.attachmentType = att.file_type === "image" ? "image" : "file";
    view.attachmentUrl = rewriteAttachmentUrl(att.data_url);
    view.attachmentName = att.file_name || "Dosya";
    view.attachmentSize = att.file_size || 0;
    view.attachmentMime = att.file_type || "application/octet-stream";
  }
  return view;
}

function extractMessages(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.payload)) return raw.payload;
  return [];
}

function isUserMessage(m) {
  if (m.message_type === 2) return false;
  const hasText = m.content && m.content.trim();
  const hasAttachment = m.attachments && m.attachments.length > 0;
  return Boolean(hasText || hasAttachment);
}

export const useBuyerMessagesStore = defineStore("buyerMessages", () => {
  const conversations = ref([]);
  const activeConversationId = ref(null);
  const activeMessages = ref([]);
  const loadingInbox = ref(false);
  const loadingMessages = ref(false);
  const sending = ref(false);
  const startingCall = ref(false);
  const error = ref(null);

  let inboxTimer = null;
  let activeTimer = null;

  const activeConversation = computed(
    () => conversations.value.find((c) => c.id === activeConversationId.value) || null
  );

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + (c.unread || 0), 0)
  );

  const sortedConversations = computed(() =>
    [...conversations.value].sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  );

  async function fetchConversations() {
    loadingInbox.value = true;
    error.value = null;
    try {
      const res = await api.callMethodGET("tradehub_core.api.chat.list_my_threads", {
        perspective: "seller",
      });
      const threads = Array.isArray(res?.message) ? res.message : [];
      conversations.value = threads.map(threadToConversation).filter((c) => c.id);
    } catch (e) {
      error.value = e?.message || "Mesajlar yüklenemedi";
    } finally {
      loadingInbox.value = false;
    }
  }

  async function fetchMessages(conversationId) {
    if (!conversationId) return;
    loadingMessages.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.chat.list_messages", {
        conversation_id: conversationId,
        perspective: "seller",
      });
      const raw = res?.message;
      const arr = extractMessages(raw)
        .filter(isUserMessage)
        .sort((a, b) => {
          const da = toDate(a.created_at)?.getTime() ?? 0;
          const db = toDate(b.created_at)?.getTime() ?? 0;
          return da - db;
        });
      activeMessages.value = arr.map(messageToView);
    } catch (e) {
      error.value = e?.message || "Konuşma yüklenemedi";
    } finally {
      loadingMessages.value = false;
    }
  }

  async function setActiveConversation(id) {
    activeConversationId.value = id;
    activeMessages.value = [];
    if (id) await fetchMessages(id);
  }

  async function startVideoCall() {
    const id = activeConversationId.value;
    if (!id || startingCall.value) return null;
    startingCall.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.chat.start_video_call", {
        conversation_id: id,
      });
      const joinUrl = res?.message?.join_url;
      if (joinUrl) {
        window.open(joinUrl, "_blank", "noopener,noreferrer");
        return joinUrl;
      }
      error.value = "Görüşme URL'i alınamadı";
      return null;
    } catch (e) {
      error.value = e?.message || "Görüntülü görüşme başlatılamadı";
      return null;
    } finally {
      startingCall.value = false;
    }
  }

  async function sendMessage(text) {
    const id = activeConversationId.value;
    if (!id || !text || !text.trim() || sending.value) return;
    sending.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.chat.send_message", {
        conversation_id: id,
        content: text.trim(),
        perspective: "seller",
      });
      const m = res?.message ?? {};
      const view = messageToView(m);
      view.direction = "me";
      if (!view.text) view.text = text.trim();
      if (!view.textHtml) view.textHtml = linkify(view.text);
      if (!view.videoCallUrl) view.videoCallUrl = extractVideoCallUrl(view.text);
      activeMessages.value = [...activeMessages.value, view];
    } catch (e) {
      error.value = e?.message || "Mesaj gönderilemedi";
      throw e;
    } finally {
      sending.value = false;
    }
  }

  function startPolling() {
    stopPolling();
    // İlk yükleme
    fetchConversations();
    inboxTimer = setInterval(fetchConversations, INBOX_POLL_MS);
    activeTimer = setInterval(() => {
      if (activeConversationId.value && !sending.value) {
        fetchMessages(activeConversationId.value);
      }
    }, ACTIVE_POLL_MS);
  }

  function stopPolling() {
    if (inboxTimer) {
      clearInterval(inboxTimer);
      inboxTimer = null;
    }
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
  }

  return {
    conversations,
    activeConversationId,
    activeMessages,
    loadingInbox,
    loadingMessages,
    sending,
    startingCall,
    error,
    activeConversation,
    totalUnread,
    sortedConversations,
    fetchConversations,
    fetchMessages,
    setActiveConversation,
    sendMessage,
    startVideoCall,
    startPolling,
    stopPolling,
  };
});
