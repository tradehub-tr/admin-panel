// Bildirim şablonları store'u — olay kataloğu, şablon taslağı, sürümler (gerçek uç, B4).
//
// Sunucu durumu burada; ekran durumu (seçili sekme, önizleme ayarı) bileşenlerde.
// Olay kataloğu sınırlı bir platform listesi (26 olay) olduğu için tek seferde
// çekilir; sayaçlar, arama ve filtre listeden türetilir (`utils/notificationTemplates/catalog.js`).
//
// YETKİ: görünümü sunucunun döndürdüğü `template_role` + `capabilities` belirler (her olay
// ve şablon yanıtında gelir). İstemci tahmini (`resolveTemplateRole`) yalnız ilk yanıt
// gelene kadar yedektir. Asıl denetim her uçta sunucudadır.

import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";

import * as service from "@/api/notificationTemplates";
import { CHANNEL_IDS, LANGS, PAGE_SIZE } from "@/constants/notificationTemplates";
import { NOTIFICATION_TEMPLATE_POLICY } from "@/constants/notificationTemplatePolicy";
import { useAuthStore } from "@/stores/auth";
import {
  EMPTY_FILTERS,
  activeFilterChips,
  filterEvents,
  stats as deriveStats,
} from "@/utils/notificationTemplates/catalog";
import { hasDraftDiff } from "@/utils/notificationTemplates/diff";
import {
  capabilitiesOf,
  denyReason,
  resolveTemplateRole,
  roleLabel,
} from "@/utils/notificationTemplates/permissions";

/** Katalog tek istekte bu kadar olay ister; `total` daha büyükse kalan sayfalar da çekilir. */
const CATALOG_PAGE = 100;
/** Sürüm geçmişi sayfa boyu ("Daha fazla yükle" adımı). */
const VERSIONS_PAGE = 20;

const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const useNotificationTemplatesStore = defineStore("notificationTemplates", () => {
  // ── Rol ────────────────────────────────────────────────────────────────
  // Sunucunun çözdüğü rol ve yetenekler; hangi kullanıcı için geldiği de tutulur ki
  // aynı sekmede başka kullanıcıyla giriş yapılınca öncekinin yetkisi sızmasın.
  const access = ref(null); // { user, role, capabilities: string[] | null }

  function adoptAccess(payload) {
    if (!payload) return;
    const event = payload.event || payload.events?.[0] || payload;
    const role = payload.template_role ?? event.template_role;
    if (role === undefined) return;
    access.value = {
      user: useAuthStore().user?.email || null,
      role,
      capabilities: Array.isArray(event.capabilities) ? [...event.capabilities] : null,
    };
  }

  const serverAccess = computed(() =>
    access.value && access.value.user === (useAuthStore().user?.email || null) ? access.value : null
  );
  const role = computed(() => {
    if (serverAccess.value) return serverAccess.value.role;
    const auth = useAuthStore();
    return resolveTemplateRole({ isAdmin: auth.isAdmin, roles: auth.userRoles });
  });
  const capabilities = computed(
    () => serverAccess.value?.capabilities || capabilitiesOf(role.value)
  );
  const can = (action) => capabilities.value.includes(action);
  const roleName = computed(() => roleLabel(role.value));
  const canEdit = computed(() => can("duzenle"));
  const canPublish = computed(() => can("yayinla"));
  const canChannels = computed(() => can("kanal"));
  const canTest = computed(() => can("test"));
  const canRestore = computed(() => can(NOTIFICATION_TEMPLATE_POLICY.restoreRequires));
  /** "publish" doğrudan yayınlar · "request" onaya gönderir · "none" hiçbiri. */
  const publishMode = computed(() => {
    if (canPublish.value) return "publish";
    if (canEdit.value && NOTIFICATION_TEMPLATE_POLICY.approvalFlow) return "request";
    return "none";
  });
  const reasonFor = (action) => (can(action) ? "" : denyReason(null, action));

  // ── Olay kataloğu ─────────────────────────────────────────────────────
  const events = shallowRef([]);
  const eventsLoading = ref(false);
  const eventsLoaded = ref(false);
  const eventsError = ref(null);
  const filters = ref({ ...EMPTY_FILTERS });
  const shown = ref(PAGE_SIZE);
  let eventsRequest = 0;

  const stats = computed(() => deriveStats(events.value));
  const filteredEvents = computed(() => filterEvents(events.value, filters.value));
  const visibleEvents = computed(() => filteredEvents.value.slice(0, shown.value));
  const filterChips = computed(() => activeFilterChips(filters.value));
  const remaining = computed(() => filteredEvents.value.length - visibleEvents.value.length);

  async function fetchEvents() {
    const request = ++eventsRequest;
    eventsLoading.value = true;
    eventsError.value = null;
    try {
      const all = [];
      let total = Infinity;
      while (all.length < total) {
        const page = await service.listEvents({ start: all.length, page_length: CATALOG_PAGE });
        if (request !== eventsRequest) return;
        adoptAccess(page);
        const rows = page?.events || [];
        all.push(...rows);
        total = Number(page?.total ?? all.length);
        if (!rows.length) break;
      }
      events.value = all;
      eventsLoaded.value = true;
    } catch (e) {
      if (request !== eventsRequest) return;
      eventsError.value = e.message || "Olay listesi yüklenemedi.";
      throw e;
    } finally {
      if (request === eventsRequest) eventsLoading.value = false;
    }
  }

  function setFilter(key, value) {
    filters.value = { ...filters.value, [key]: value };
    shown.value = PAGE_SIZE;
  }

  function clearFilters() {
    filters.value = { ...EMPTY_FILTERS };
    shown.value = PAGE_SIZE;
  }

  function showMore() {
    shown.value += PAGE_SIZE;
  }

  const eventByKey = (key) => events.value.find((e) => e.key === key) || null;

  function replaceEvent(event) {
    if (!event?.key) return;
    adoptAccess(event);
    events.value = events.value.some((e) => e.key === event.key)
      ? events.value.map((e) => (e.key === event.key ? event : e))
      : events.value;
    if (template.value?.event?.key === event.key) template.value = { ...template.value, event };
  }

  /** Kayıt/yayın sonrası olayın güncel hâlini (yayın durumu, son değişiklik) çeker. */
  async function refreshEvent(key) {
    try {
      replaceEvent(await service.getEvent(key));
    } catch {
      /* görünüm tazelemesi — asıl işlem zaten tamamlandı */
    }
  }

  /** Kanal çekmecesi kaydı. Hata çağırana fırlatılır (çekmece kendi içinde gösterir). */
  async function saveChannels(key, payload) {
    const current = eventByKey(key) || template.value?.event;
    const updated = await service.saveEventChannels({
      key,
      ...payload,
      revision: current?.revision,
    });
    replaceEvent(updated);
    // Yeni açılan kanalın içeriği sunucuda boş başlar; taslak temizse yeniden çek.
    if (template.value?.event?.key === key && !isDirty.value)
      await loadTemplate(key, { force: true });
    return updated;
  }

  // ── Şablon (düzenleyici) ───────────────────────────────────────────────
  const template = ref(null); // get_template yanıtı (sunucudaki son hâl)
  const working = ref(null); // düzenlenen kopya: { <kanal>: { <dil>: alanlar | null } }
  const templateLoading = ref(false);
  const templateError = ref(null);
  const saving = ref(false);
  const saveFailed = ref(false);
  const saveError = ref("");
  const conflict = ref(null); // { theirs, saved_by, saved_at, revision? }
  let templateRequest = 0;

  const dirtyScopes = computed(() => {
    if (!template.value || !working.value) return [];
    const out = [];
    for (const channel of CHANNEL_IDS)
      for (const lang of LANGS)
        if (!same(working.value[channel]?.[lang.id], template.value.draft?.[channel]?.[lang.id]))
          out.push({ channel, lang: lang.id });
    return out;
  });
  const isDirty = computed(() => dirtyScopes.value.length > 0);

  /** Taslak (kaydedilmemiş değişiklikler dahil) yayındakinden farklı mı? */
  const draftDiffers = computed(() =>
    template.value ? hasDraftDiff(template.value.published, working.value) : false
  );

  /** Kayıt durumu: temiz | degisti | kaydediliyor | basarisiz | cakisma */
  const saveState = computed(() => {
    if (saving.value) return "kaydediliyor";
    if (conflict.value) return "cakisma";
    if (saveFailed.value) return "basarisiz";
    return isDirty.value ? "degisti" : "temiz";
  });

  async function loadTemplate(key, { force = false } = {}) {
    if (!force && template.value?.event?.key === key && working.value) return template.value;
    const request = ++templateRequest;
    templateLoading.value = true;
    templateError.value = null;
    if (template.value?.event?.key !== key) {
      template.value = null;
      working.value = null;
    }
    try {
      const data = await service.getTemplate(key);
      if (request !== templateRequest) return null;
      adoptAccess(data);
      template.value = data;
      working.value = clone(data.draft);
      saveFailed.value = false;
      saveError.value = "";
      conflict.value = null;
      return data;
    } catch (e) {
      if (request !== templateRequest) return null;
      templateError.value = { code: e.code || "", message: e.message || "Şablon yüklenemedi." };
      throw e;
    } finally {
      if (request === templateRequest) templateLoading.value = false;
    }
  }

  /** Yazma yanıtındaki (WriteReceipt) revizyonu, zamanı ve taslağı benimser. */
  function adoptReceipt(res) {
    template.value = {
      ...template.value,
      revision: res.revision ?? template.value.revision,
      saved_at: res.saved_at ?? template.value.saved_at,
      saved_by: res.saved_by ?? template.value.saved_by,
      ...(res.draft ? { draft: clone(res.draft) } : {}),
    };
  }

  function setField(channel, lang, field, value) {
    const scope = working.value?.[channel]?.[lang];
    if (!scope) return;
    scope[field] = value;
    saveFailed.value = false;
  }

  function setScope(channel, lang, fields) {
    if (!working.value?.[channel]) return;
    working.value[channel][lang] = fields ? clone(fields) : null;
    saveFailed.value = false;
  }

  /**
   * Değişen kapsamları (kanal × dil) TEK istekte kaydeder (`save_draft_bulk`: tek
   * transaction, tek revizyon). Sunucu HTML'i temizleyip normalize eder; dönen taslak
   * benimsenir. Kayıt sürerken yazılmaya devam eden kapsam ezilmez.
   * @returns {"saved" | "clean" | "conflict" | "failed"}
   */
  async function saveDraft() {
    if (!template.value || saving.value) return "clean";
    if (!isDirty.value) return "clean";
    const key = template.value.event.key;
    // Sunucu kapsamı silmeyi (null) kabul etmez; içerik taşıyan kapsamlar gider.
    const changes = dirtyScopes.value
      .map(({ channel, lang }) => ({ channel, lang, fields: clone(working.value[channel][lang]) }))
      .filter((c) => c.fields);
    if (!changes.length) return "clean";
    saving.value = true;
    saveFailed.value = false;
    saveError.value = "";
    try {
      const res = await service.saveDraftBulk({
        key,
        changes,
        revision: template.value.revision,
      });
      adoptReceipt(res);
      for (const c of changes) {
        // Gönderilenle aynı kalan kapsam sunucunun normalize hâlini alır.
        if (same(working.value[c.channel]?.[c.lang], c.fields))
          working.value[c.channel][c.lang] = clone(template.value.draft?.[c.channel]?.[c.lang]);
      }
      versionsKey.value = null;
      await refreshEvent(key);
      return "saved";
    } catch (e) {
      const payload = service.conflictOf(e);
      if (payload) {
        conflict.value = payload;
        return "conflict";
      }
      saveFailed.value = true;
      saveError.value = e.message || "Kaydedilemedi.";
      return "failed";
    } finally {
      saving.value = false;
    }
  }

  /** Çakışma çözümü: "theirs" onların sürümünü yükler, "mine" benimkini yazar. */
  async function resolveConflict(choice) {
    const payload = conflict.value;
    if (!payload || !template.value) return "clean";
    const key = template.value.event.key;
    // 409 gövdesi revizyonu ve tüm taslağı (`theirs`) taşır; eksikse güncel şablondan okunur.
    let revision = payload.revision;
    let theirs = payload.theirs;
    if (revision === undefined || !theirs) {
      const fresh = await service.getTemplate(key);
      revision = fresh.revision;
      theirs = fresh.draft;
    }
    template.value = {
      ...template.value,
      draft: clone(theirs),
      revision,
      saved_at: payload.saved_at ?? template.value.saved_at,
      saved_by: payload.saved_by ?? template.value.saved_by,
    };
    conflict.value = null;
    if (choice === "theirs") {
      working.value = clone(theirs);
      await refreshEvent(key);
      return "saved";
    }
    return saveDraft();
  }

  function discardChanges() {
    if (template.value) working.value = clone(template.value.draft);
    saveFailed.value = false;
    conflict.value = null;
  }

  /** Sunucu doğrulaması (kaydedilmiş taslak üzerinde). */
  const validateOnServer = (key) => service.validateTemplate(key);

  /**
   * Yayınlar ya da (yayın yetkisi yoksa) onaya gönderir. Önce kaydedilmemiş
   * değişiklikleri yazar. Doğrulama sunucudadır: engelleyici sorun 422 olarak
   * fırlar (`validationOf`); ayrı bir ön doğrulama isteği atılmaz.
   * @returns {{ status: "published" | "requested" | "conflict" | "save-failed", version? }}
   */
  async function publish() {
    const key = template.value.event.key;
    if (isDirty.value) {
      const saved = await saveDraft();
      if (saved === "conflict") return { status: "conflict" };
      if (saved === "failed") return { status: "save-failed" };
    }
    const revision = template.value.revision;
    if (publishMode.value === "publish") {
      const res = await service.publishTemplate({ key, revision });
      template.value = {
        ...template.value,
        published: clone(template.value.draft),
        revision: res.revision ?? revision,
      };
      versionsKey.value = null;
      await refreshEvent(key);
      return { status: "published", version: res.version };
    }
    const res = await service.requestPublish({ key, revision });
    template.value = { ...template.value, revision: res.revision ?? revision };
    await refreshEvent(key);
    return { status: "requested" };
  }

  /** Çeviri durumunu değiştirir (revizyonla korunur); yeni revizyonu benimser. */
  async function setTranslationState(lang, state) {
    const key = template.value.event.key;
    const res = await service.setTranslationState({
      key,
      lang,
      state,
      revision: template.value.revision,
    });
    const event = { ...template.value.event, langs: res.langs || template.value.event.langs };
    template.value = { ...template.value, revision: res.revision ?? template.value.revision };
    replaceEvent(event);
    await refreshEvent(key);
    return { contentChanged: false };
  }

  /** Test gönderimi; `request_id` çağıran tarafından üretilir (yeniden denemede aynısı). */
  const sendTest = (payload) => service.sendTest(payload);

  // ── Sürümler ───────────────────────────────────────────────────────────
  const versions = shallowRef([]);
  const versionsTotal = ref(0);
  const versionsKey = ref(null);
  const versionsLoading = ref(false);
  const versionsError = ref(null);
  const versionContents = shallowRef({}); // { "<key>@<version>": content }
  const versionsRemaining = computed(() =>
    Math.max(0, versionsTotal.value - versions.value.length)
  );

  /** İlk sayfayı çeker; geçmiş ilk 20'de kesilmez, devamı `loadMoreVersions` ile gelir. */
  async function loadVersions(key, { force = false } = {}) {
    if (!force && versionsKey.value === key && versions.value.length) return versions.value;
    versionsLoading.value = true;
    versionsError.value = null;
    try {
      const res = await service.listVersions({ key, start: 0, page_length: VERSIONS_PAGE });
      versions.value = res?.versions || [];
      versionsTotal.value = Number(res?.total ?? versions.value.length);
      versionsKey.value = key;
      versionContents.value = {};
      return versions.value;
    } catch (e) {
      versionsError.value = { code: e.code || "", message: e.message || "Sürümler yüklenemedi." };
      throw e;
    } finally {
      versionsLoading.value = false;
    }
  }

  async function loadMoreVersions(key) {
    if (versionsKey.value !== key || !versionsRemaining.value || versionsLoading.value) return;
    versionsLoading.value = true;
    try {
      const res = await service.listVersions({
        key,
        start: versions.value.length,
        page_length: VERSIONS_PAGE,
      });
      const seen = new Set(versions.value.map((v) => v.version));
      versions.value = [
        ...versions.value,
        ...(res?.versions || []).filter((v) => !seen.has(v.version)),
      ];
      versionsTotal.value = Number(res?.total ?? versionsTotal.value);
    } finally {
      versionsLoading.value = false;
    }
  }

  async function loadVersionContent(key, version) {
    const id = `${key}@${version}`;
    if (versionContents.value[id]) return versionContents.value[id];
    const res = await service.getVersion({ key, version });
    const content = res?.content || res;
    versionContents.value = { ...versionContents.value, [id]: content };
    return content;
  }

  /** Sürümün içeriğini yeni taslak yapar (sözleşme: `restore_version` → yeni taslak). */
  async function restoreVersion(key, version) {
    if (template.value?.event?.key !== key) await loadTemplate(key);
    const res = await service.restoreVersion({
      key,
      version,
      revision: template.value.revision,
    });
    adoptReceipt(res);
    working.value = clone(res.draft);
    await Promise.all([loadVersions(key, { force: true }), refreshEvent(key)]);
    return res;
  }

  return {
    // rol
    access,
    role,
    roleName,
    capabilities,
    canEdit,
    canPublish,
    canChannels,
    canTest,
    canRestore,
    publishMode,
    reasonFor,
    // katalog
    events,
    eventsLoading,
    eventsLoaded,
    eventsError,
    filters,
    shown,
    stats,
    filteredEvents,
    visibleEvents,
    filterChips,
    remaining,
    fetchEvents,
    setFilter,
    clearFilters,
    showMore,
    eventByKey,
    refreshEvent,
    saveChannels,
    // şablon
    template,
    working,
    templateLoading,
    templateError,
    saving,
    saveFailed,
    saveError,
    conflict,
    dirtyScopes,
    isDirty,
    draftDiffers,
    saveState,
    loadTemplate,
    setField,
    setScope,
    saveDraft,
    resolveConflict,
    discardChanges,
    validateOnServer,
    publish,
    setTranslationState,
    sendTest,
    // sürümler
    versions,
    versionsTotal,
    versionsRemaining,
    versionsKey,
    versionsLoading,
    versionsError,
    versionContents,
    loadVersions,
    loadMoreVersions,
    loadVersionContent,
    restoreVersion,
  };
});
