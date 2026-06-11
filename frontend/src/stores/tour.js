import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";
import {
  adminRailSections,
  sellerRailSections,
  adminPanelSections,
  sellerPanelSections,
} from "@/data/navigation";

// Rehberli onboarding — iki katman, tek overlay:
//  1) BÖLÜM turu: bir bölüme (IconRail) ilk girişte o bölümün menü öğelerini tanıtır.
//  2) SAYFA turu: bir view kendi içeriğindeki alanları (tablo/form/filtre…) tanıtır;
//     view `usePageTour` ile adımlarını kaydeder (data-tour anchor'ları + açıklama).
// Her ikisi de kısa ve bağlamsaldır; bağımsız "görüldü" işaretlenir (localStorage).
const SEEN_KEY = "panel_tour_seen_v4";
const loadSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
};
const saveSeen = (set) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    /* localStorage yoksa sessiz geç */
  }
};

const itemKey = (item) => item.route || item.doctype || item.report || item.label;
// "nav.item.categoryManagement" -> "tourSteps.item.categoryManagement"
const itemDescKey = (labelKey) => "tourSteps.item." + String(labelKey).replace(/^nav\.(item|rail)\./, "");

export const useTourStore = defineStore("tour", () => {
  const auth = useAuthStore();
  const nav = useNavigationStore();

  const active = ref(false);
  const steps = ref([]);
  const index = ref(0);
  const mode = ref("section"); // section | page
  const sectionId = ref(null);
  const pageKey = ref(null);
  const currentPage = ref(null); // aktif view'ın kaydettiği { key, steps }
  const seen = ref(loadSeen());

  const current = computed(() => steps.value[index.value] || null);
  const total = computed(() => steps.value.length);
  const isFirst = computed(() => index.value === 0);
  const isLast = computed(() => index.value === steps.value.length - 1);

  const seenId = () => (mode.value === "page" ? "page:" + pageKey.value : sectionId.value);

  // ── BÖLÜM turu ────────────────────────────────────────
  function buildSectionSteps(secId) {
    const isSeller = auth.isSeller && !auth.isAdmin;
    const rail = isSeller ? sellerRailSections : adminRailSections;
    const sectionsMap = isSeller ? sellerPanelSections : adminPanelSections;
    const sec = rail.find((s) => s.id === secId);
    if (!sec) return [];
    const entries = [];
    for (const g of sectionsMap[secId] || []) {
      if (g.requires && !auth.canAccess(g.requires)) continue;
      for (const it of g.items || []) {
        if (it.requires && !auth.canAccess(it.requires)) continue;
        entries.push({ it, group: g.title || null });
      }
    }
    if (!entries.length) return [];
    const out = [
      { target: `[data-section="${sec.id}"]`, titleKey: sec.label, descKey: `tourSteps.sec.${sec.id}` },
    ];
    for (const { it, group } of entries) {
      out.push({
        target: `[data-tour-item="${itemKey(it)}"]`,
        titleKey: it.label,
        descKey: itemDescKey(it.label),
        group, // kapalı (accordion) grupsa adım gelince açılır
      });
    }
    return out;
  }

  function start(secId) {
    const s = buildSectionSteps(secId);
    if (!s.length) return;
    mode.value = "section";
    sectionId.value = secId;
    pageKey.value = null;
    steps.value = s;
    index.value = 0;
    active.value = true;
    ensureGroupOpen();
  }
  function maybeAutoStart(secId) {
    if (active.value) return;
    // Aktif sayfanın kendi (henüz görülmemiş) sayfa-turu varsa, bölüm turunu atla —
    // sayfa turu önceliklidir (aksi halde bölüm turu sayfa turunu önler).
    const p = currentPage.value;
    if (p && p.steps.length && !seen.value.has("page:" + p.key)) return;
    if (secId && !seen.value.has(secId)) start(secId);
  }
  function restart(secId) {
    start(secId);
  }

  // ── SAYFA turu ────────────────────────────────────────
  // steps: [{ target, title?, titleKey?, desc?, descKey? }] — yalnızca DOM'da bulunan
  // hedefler gösterilir (eksik anchor'lar atlanır).
  function startPageTour(key, rawSteps) {
    const s = (rawSteps || []).filter((st) => st && st.target);
    if (!s.length) return;
    mode.value = "page";
    pageKey.value = key;
    sectionId.value = null;
    steps.value = s;
    index.value = 0;
    active.value = true;
  }
  function maybeAutoStartPage(key, rawSteps) {
    if (key && !seen.value.has("page:" + key) && !active.value) startPageTour(key, rawSteps);
  }
  function registerPage(key, rawSteps) {
    currentPage.value = { key, steps: rawSteps || [] };
  }
  function unregisterPage(key) {
    if (currentPage.value && currentPage.value.key === key) currentPage.value = null;
  }
  // Yardım(?) / context restart: aktif sayfada sayfa turu varsa onu, yoksa bölüm turunu.
  function restartContext(secId) {
    if (currentPage.value && currentPage.value.steps.length) {
      startPageTour(currentPage.value.key, currentPage.value.steps);
    } else {
      start(secId);
    }
  }

  // ── Ortak gezinme ─────────────────────────────────────
  // Aktif adım kapalı (accordion) bir gruba aitse o grubu aç — öğe görünür olsun
  // (overlay retry ile yeniden konumlanır).
  function ensureGroupOpen() {
    const s = current.value;
    if (s && s.group && !nav.isGroupOpen(s.group)) nav.toggleGroup(s.group);
  }
  function next() {
    if (index.value < steps.value.length - 1) {
      index.value++;
      ensureGroupOpen();
    } else {
      finish();
    }
  }
  function prev() {
    if (index.value > 0) {
      index.value--;
      ensureGroupOpen();
    }
  }
  function markSeen() {
    const id = seenId();
    if (id) {
      seen.value.add(id);
      saveSeen(seen.value);
    }
  }
  function end() {
    active.value = false;
    steps.value = [];
    index.value = 0;
  }
  function finish() {
    markSeen();
    end();
  }
  function skip() {
    markSeen();
    end();
  }

  return {
    active,
    steps,
    index,
    mode,
    current,
    total,
    isFirst,
    isLast,
    sectionId,
    currentPage,
    start,
    maybeAutoStart,
    restart,
    startPageTour,
    maybeAutoStartPage,
    registerPage,
    unregisterPage,
    restartContext,
    next,
    prev,
    finish,
    skip,
    end,
  };
});
