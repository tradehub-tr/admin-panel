import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  adminPanelSections,
  adminSectionTitles,
  sellerPanelSections,
  sellerSectionTitles,
} from "@/data/navigation";
import { useSidebarStore } from "@/stores/sidebar";
import { useAuthStore } from "@/stores/auth";
import { useEntitlement } from "@/composables/useEntitlement";
import { resolveNavItemRoute } from "@/utils/navItemRoute";
import api from "@/utils/api";

const STORAGE_KEY = "th_nav_state";
const NAV_ENDPOINT = "tradehub_core.api.v1.navigation.get_navigation";

// Backend response'unu mevcut frontend formatına (section_key → groups[])
// adapte eder. Hidden modüller backend tarafından zaten filtrelendiği için
// burada ekstra filtre yok.
function transformBackendNav(payload) {
  if (!payload?.sections) return {};
  const result = {};
  for (const section of payload.sections) {
    const groups = (section.items || []).map((g) => ({
      title: g.label || null,
      color: g.color || "",
      mode: g.mode || "visible",
      moduleKey: g.module_key,
      items: (g.items || []).map((it) => ({
        label: it.label,
        icon: it.icon || "",
        route: it.route || undefined,
        doctype: it.doctype || undefined,
        sellerOwned: !!it.seller_owned,
        moduleKey: it.module_key,
        mode: it.mode || "visible",
      })),
    }));
    result[section.section_key] = groups;
  }
  return result;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(section, groups) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        section,
        groups: [...groups],
      })
    );
  } catch {
    /* ignore */
  }
}

export const useNavigationStore = defineStore("navigation", () => {
  const saved = loadState();

  // Plan yetkinlikleri — feature-gated menü item'larını (örn. XML Feed)
  // kilitli/açık göstermek için. Snapshot reactive; yüklenince currentGroups
  // otomatik yeniden hesaplanır.
  const { snapshot: entitlementSnapshot, load: loadEntitlement } = useEntitlement();
  loadEntitlement();

  const activeSection = ref(saved?.section || "dashboard");
  const activePanelItem = ref(null);
  const openGroups = ref(new Set(saved?.groups || []));

  // Sprint 6 — DB-driven sidebar: backend TH Module Registry/Policy'den
  // hesaplanmış section→groups haritası. Hidden modüller backend tarafından
  // zaten filtreleniyor, frontend ekstra filtre yapmaz.
  const dbAdminSections = ref({});
  const dbSellerSections = ref({});
  const dbLoaded = ref(false);
  const dbLoading = ref(false);

  // Sprint 6 — Hidden modül pointer listeleri (sub-user'ın URL ile bypass
  // edemeyeceği doctype/route adları). Backend hidden modülleri tree'den
  // düşürdüğü için bu liste router guard'ın fail-closed davranışı için tek
  // kaynaktır.
  const hiddenDoctypes = ref({ admin: new Set(), seller: new Set() });
  const hiddenRoutes = ref({ admin: new Set(), seller: new Set() });

  async function loadDbSections({ force = false } = {}) {
    if (dbLoading.value) return;
    if (dbLoaded.value && !force) return;
    dbLoading.value = true;
    try {
      const [adminRes, sellerRes] = await Promise.all([
        api.callMethodGET(NAV_ENDPOINT, { panel: "admin" }),
        api.callMethodGET(NAV_ENDPOINT, { panel: "seller" }),
      ]);
      dbAdminSections.value = transformBackendNav(adminRes?.message);
      dbSellerSections.value = transformBackendNav(sellerRes?.message);
      hiddenDoctypes.value = {
        admin: new Set(adminRes?.message?.hidden_doctypes || []),
        seller: new Set(sellerRes?.message?.hidden_doctypes || []),
      };
      hiddenRoutes.value = {
        admin: new Set(adminRes?.message?.hidden_routes || []),
        seller: new Set(sellerRes?.message?.hidden_routes || []),
      };
      dbLoaded.value = true;
    } catch (e) {
      // Fail-safe: backend ulaşılamazsa hard-coded fallback kullanılır.
      console.warn("DB navigation yüklenemedi, fallback kullanılacak:", e?.message);
    } finally {
      dbLoading.value = false;
    }
  }

  // Role-aware panel sections — auth store'dan dinamik okuma.
  // Sprint 6:
  //   - Seller panel tam DB-driven (Module Registry seed edildi).
  //   - Admin panel henüz tam seed edilmedi (sadece `system` section).
  //     Bu yüzden admin için hard-coded `adminPanelSections` kullanılmaya devam
  //     eder. Sprint 7'de admin tarafı seed tamamlanınca buradaki kontrol kalkar.
  function getActiveSections() {
    const auth = useAuthStore();
    const isSeller = auth.isSeller && !auth.isAdmin;
    if (isSeller && dbLoaded.value) {
      // Sprint 6 fail-secure: backend gating tamamlandıktan sonra hard-coded
      // sellerPanelSections fallback'ine asla düşme — boş map dahi olsa
      // sub-user'a gizli modülleri sızdırmamalıyız.
      return dbSellerSections.value || {};
    }
    return isSeller ? sellerPanelSections : adminPanelSections;
  }

  // Sprint 6 — Modül key → mode Map (composable.useNavigation için O(1) lookup).
  // dbSellerSections + dbAdminSections içindeki tüm group/item'ları gezip
  // moduleKey → mode haritası kurar. Hidden modüller backend'de zaten filtrelenmiş
  // olduğu için burada görmeyiz; visible/masked olanları kayıt ederiz.
  const moduleModeMap = computed(() => {
    const map = new Map();
    if (!dbLoaded.value) return map;
    const auth = useAuthStore();
    const sections =
      (auth.isSeller && !auth.isAdmin ? dbSellerSections.value : dbAdminSections.value) || {};
    for (const sectionKey in sections) {
      for (const group of sections[sectionKey]) {
        if (group.moduleKey) map.set(group.moduleKey, group.mode || "visible");
        for (const item of group.items || []) {
          if (item.moduleKey) map.set(item.moduleKey, item.mode || "visible");
        }
      }
    }
    return map;
  });

  function getModuleMode(moduleKey) {
    if (!moduleKey) return "visible";
    // Seller panel denylist semantiği: normal satıcı modülleri Registry'de
    // açıkça kayıtlı olmasa da görünür kalmalı → bilinmeyen key = visible.
    // GÜVENLİK NOTU: Bu fail-OPEN varsayılan admin route'ları için yetki
    // KAYNAĞI DEĞİLDİR. Admin-yönelimli route'lar router guard'da
    // `requiresSuperAdmin` / `meta.roles` ile fail-CLOSED korunur ve bu kontrol
    // module-mode mantığından ÖNCE çalışır; dolayısıyla yüklenmemiş/eksik bir
    // modül politikası bir admin route'una erişim AÇAMAZ. Bu yüzden burada
    // satıcı panelini bozmamak için denylist varsayılanı korunur.
    return moduleModeMap.value.get(moduleKey) || "visible";
  }

  // Sprint 6 — Route/doctype → module key lookup (router guard için).
  // Backend get_navigation_tree hidden modülleri zaten filtreler; bu yüzden
  // dbLoaded olup map'te o doctype/route YOKSA, kullanıcı için modül "hidden"
  // sayılır. Dönüş: { key, mode } veya null (eşleşme yoksa).
  function _scanModulesForMatch(predicate) {
    const auth = useAuthStore();
    const sections =
      (auth.isSeller && !auth.isAdmin ? dbSellerSections.value : dbAdminSections.value) || {};
    for (const sectionKey in sections) {
      for (const group of sections[sectionKey]) {
        for (const item of group.items || []) {
          if (predicate(item)) {
            return { key: item.moduleKey, mode: item.mode || "visible" };
          }
        }
      }
    }
    return null;
  }

  function findModuleByDoctype(doctype) {
    if (!doctype) return null;
    return _scanModulesForMatch((it) => it.doctype === doctype);
  }

  // Sub-user için doctype/route URL bypass kontrolü.
  // Whitelist yaklaşımı: navigation tree'de görünen tüm doctype'lar
  // accessible kabul edilir. Backend hidden modülleri tree'den düşürdüğü
  // için, tree'de olmayan bir doctype sub-user için kapalıdır.
  // Owner ve Admin bu kontrolden muaf — onlar tree dışı doctype'lara
  // (Listing, Order, CRM Contact vb.) erişmek zorunda.
  function isDoctypeAccessibleForSubUser(doctype) {
    if (!doctype) return true;
    const auth = useAuthStore();
    const sections =
      (auth.isSeller && !auth.isAdmin ? dbSellerSections.value : dbAdminSections.value) || {};
    for (const sectionKey in sections) {
      for (const group of sections[sectionKey]) {
        for (const item of group.items || []) {
          if (item.doctype === doctype && (item.mode || "visible") !== "hidden") {
            return true;
          }
        }
      }
    }
    return false;
  }

  function isDoctypeHidden(doctype) {
    if (!doctype) return false;
    const auth = useAuthStore();
    const panel = auth.isSeller && !auth.isAdmin ? "seller" : "admin";
    return hiddenDoctypes.value[panel]?.has(doctype) || false;
  }

  function isRouteHidden(path) {
    if (!path) return false;
    const auth = useAuthStore();
    const panel = auth.isSeller && !auth.isAdmin ? "seller" : "admin";
    const set = hiddenRoutes.value[panel];
    if (!set || set.size === 0) return false;
    for (const r of set) {
      if (path === r || path.startsWith(r + "/") || path.startsWith(r + "?")) return true;
    }
    return false;
  }

  function findModuleByRoute(path) {
    if (!path) return null;
    // En spesifik (en uzun) route prefix kazansın
    const auth = useAuthStore();
    const sections =
      (auth.isSeller && !auth.isAdmin ? dbSellerSections.value : dbAdminSections.value) || {};
    let bestMatch = null;
    let bestLen = 0;
    for (const sectionKey in sections) {
      for (const group of sections[sectionKey]) {
        for (const item of group.items || []) {
          if (!item.route) continue;
          if (path === item.route || path.startsWith(item.route + "/")) {
            if (item.route.length > bestLen) {
              bestLen = item.route.length;
              bestMatch = { key: item.moduleKey, mode: item.mode || "visible" };
            }
          }
        }
      }
    }
    return bestMatch;
  }

  function getActiveSectionTitles() {
    const auth = useAuthStore();
    return auth.isSeller && !auth.isAdmin ? sellerSectionTitles : adminSectionTitles;
  }

  const sectionTitle = computed(() => getActiveSectionTitles()[activeSection.value] || "TradeHub");

  /**
   * FAZ 1.5 — Role-based filtering.
   * Her grup ve item `requires` field'ında tag listesi taşıyabilir.
   * canAccess(requires) tag'lerden birini sağlarsa görünür.
   * Tag yoksa herkese açık.
   */
  function filterByRole(groups) {
    const auth = useAuthStore();
    // entitlementSnapshot.value erişimi computed'ın snapshot'a reactive bağlanmasını
    // sağlar — plan yüklenince/değişince currentGroups otomatik güncellenir.
    const flags = entitlementSnapshot.value?.features;
    return groups
      .map((g) => {
        if (g.requires && !auth.canAccess(g.requires)) return null;
        const items = (g.items || [])
          .filter((it) => !it.requires || auth.canAccess(it.requires))
          .map((it) => (it.feature ? { ...it, locked: !flags?.[it.feature] } : it));
        if (!items.length && g.title) return null;
        return { ...g, items };
      })
      .filter(Boolean);
  }

  const currentGroups = computed(() => {
    const raw = getActiveSections()[activeSection.value] || [];
    return filterByRole(raw);
  });

  // İlk açılışta kaydedilmiş grup yoksa ilk grubu aç
  if (!saved?.groups?.length) {
    const sections = getActiveSections();
    const groups = sections[activeSection.value] || [];
    const first = groups.find((g) => g.title);
    if (first) openGroups.value.add(first.title);
  }

  // URL'e göre aktif grubu ve section'ı geri yükle
  function restoreFromUrl(path) {
    const sections = getActiveSections();
    const groups = sections[activeSection.value] || [];
    for (const group of groups) {
      if (!group.title) continue;
      for (const item of group.items) {
        const itemRoute =
          item.route || (item.doctype ? `/app/${encodeURIComponent(item.doctype)}` : null);
        if (itemRoute && path.startsWith(itemRoute)) {
          openGroups.value.add(group.title);
          openGroups.value = new Set(openGroups.value);
          activePanelItem.value = item.doctype || item.report || item.route;
          saveState(activeSection.value, openGroups.value);
          return;
        }
      }
    }
  }

  // Route değişiminde aktif section'ı URL'in meta.section'ından senkronla.
  // switchSection sadece rail tıklamasında çağrılıyordu; dashboard hızlı linkleri,
  // breadcrumb ve router.push ile gidildiğinde rail/panel güncellenmiyordu.
  // Bilinmeyen (panel map'inde karşılığı olmayan) section gelirse mevcut seçimi koru.
  function syncActiveFromRoute(path, section) {
    const sections = getActiveSections();
    if (section && sections[section] && section !== activeSection.value) {
      activeSection.value = section;
      openGroups.value = new Set();
      const first = (sections[section] || []).find((g) => g.title);
      if (first) openGroups.value.add(first.title);
    }
    restoreFromUrl(path);
  }

  function switchSection(sectionId) {
    activeSection.value = sectionId;
    openGroups.value = new Set();
    const sections = getActiveSections();
    const groups = sections[sectionId] || [];
    const firstCollapsible = groups.find((g) => g.title);
    if (firstCollapsible) {
      openGroups.value.add(firstCollapsible.title);
    }
    saveState(sectionId, openGroups.value);
    useSidebarStore().openPanel();

    // Section'in ilk navigable item'ina otomatik git (UX iyilestirmesi).
    // Route hesabı SidePanel ile aynı resolver'dan gelir; aksi halde sellerOwned
    // doctype'lar (ör. "Mağazam" → User Profile) generic liste route'una gider
    // ve DocTypeListView admin-only kontrolu kullaniciyi dashboard'a atardi.
    try {
      const auth = useAuthStore();
      const ctx = { isAdmin: auth.isAdmin, user: auth.user };
      for (const g of groups) {
        for (const it of g.items || []) {
          const target = resolveNavItemRoute(it, ctx);
          if (target && target !== "#") {
            // Router lazy-load: window kullanarak yumusak gecis
            if (typeof window !== "undefined" && window.__router) {
              window.__router.push(target).catch(() => {});
            }
            return;
          }
        }
      }
    } catch {
      /* sessizce yok say */
    }
  }

  function setActiveItem(itemKey) {
    activePanelItem.value = itemKey;
  }

  function toggleGroup(groupTitle) {
    if (openGroups.value.has(groupTitle)) {
      openGroups.value.delete(groupTitle);
    } else {
      openGroups.value.add(groupTitle);
    }
    openGroups.value = new Set(openGroups.value);
    saveState(activeSection.value, openGroups.value);
  }

  function isGroupOpen(groupTitle) {
    return openGroups.value.has(groupTitle);
  }

  // Sprint 6 — Logout veya user değişimi sonrası state'i sıfırla.
  // Pinia setup store $reset desteklemediği için manuel temizlik.
  function resetState() {
    activeSection.value = "dashboard";
    activePanelItem.value = null;
    openGroups.value = new Set();
    dbAdminSections.value = {};
    dbSellerSections.value = {};
    hiddenDoctypes.value = { admin: new Set(), seller: new Set() };
    hiddenRoutes.value = { admin: new Set(), seller: new Set() };
    dbLoaded.value = false;
    dbLoading.value = false;
    useEntitlement().reset();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return {
    activeSection,
    activePanelItem,
    openGroups,
    sectionTitle,
    currentGroups,
    switchSection,
    setActiveItem,
    toggleGroup,
    isGroupOpen,
    restoreFromUrl,
    syncActiveFromRoute,
    // Sprint 6 — DB-driven navigation
    dbLoaded,
    dbLoading,
    loadDbSections,
    moduleModeMap,
    getModuleMode,
    findModuleByDoctype,
    findModuleByRoute,
    isDoctypeHidden,
    isRouteHidden,
    isDoctypeAccessibleForSubUser,
    resetState,
  };
});
