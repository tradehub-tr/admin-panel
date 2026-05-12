// ======================================================
// TradeHub B2B - Navigation Data
// Gerçek Frappe backend doctypelarına göre (tradehub_core)
// Rol bazlı: admin ve satıcı ayrı navigasyon
// ======================================================

// ══════════════════════════════════════════════════════
// ADMİN NAVİGASYON
// ══════════════════════════════════════════════════════

export const adminRailSections = [
  { id: "dashboard", icon: "house", label: "Ana Sayfa" },
  { id: "catalog", icon: "package", label: "Katalog" },
  { id: "commerce", icon: "shopping-cart", label: "Ticaret" },
  { id: "sellers", icon: "store", label: "Satıcılar" },
  { id: "crm", icon: "users-round", label: "CRM" },
  { id: "helpdesk", icon: "life-buoy", label: "Destek" },
  { id: "system", icon: "settings", label: "Sistem" },
];

export const adminSectionTitles = {
  dashboard: "Dashboard",
  catalog: "Ürün Katalogu",
  commerce: "Ticaret & Siparişler",
  sellers: "Satıcı Yönetimi",
  crm: "Müşteri İlişkileri (CRM)",
  helpdesk: "Destek Yönetimi",
  system: "Sistem & Kullanıcılar",
};

export const adminPanelSections = {
  // ── DASHBOARD ─────────────────────────────────────
  dashboard: [
    {
      title: null,
      color: "#7c3aed",
      items: [{ label: "Dashboard", icon: "layout-grid", route: "/dashboard" }],
    },
  ],

  // ── ÜRÜN KATALOGU ─────────────────────────────────
  catalog: [
    {
      title: "Ürün İlanları",
      color: "#7c3aed",
      items: [
        { label: "Ürün İlanları", icon: "list", doctype: "Listing" },
        { label: "Ürün Moderasyonu", icon: "shield-check", route: "/listing-moderation" },
        { label: "Kategori Moderasyonu", icon: "folder-check", route: "/category-moderation" },
        { label: "Kategori Yönetimi", icon: "folder-tree", route: "/category-management" },
      ],
    },
    {
      title: "Katalog Yapısı",
      color: "#8b5cf6",
      items: [
        { label: "Markalar", icon: "bookmark", doctype: "Brand" },
        { label: "Ürün Tipleri", icon: "layers", doctype: "Product Type" },
        { label: "Ürün Aileleri", icon: "package-2", doctype: "Product Family" },
      ],
    },
    {
      title: "Özellik Yönetimi",
      color: "#6366f1",
      items: [
        { label: "Ürün Özellikleri", icon: "settings-2", doctype: "Product Attribute" },
        { label: "Özellik Setleri", icon: "grid", doctype: "Attribute Set" },
      ],
    },
    {
      title: "Finans",
      color: "#8b5cf6",
      items: [
        { label: "Kuponlar", icon: "ticket", doctype: "Coupon" },
        { label: "Para Birimi Yönetimi", icon: "coins", doctype: "Supported Currency" },
        { label: "TCMB Kurları", icon: "refresh-cw", doctype: "Currency Rate Pair" },
      ],
    },
    {
      title: "Kargo",
      color: "#06b6d4",
      items: [{ label: "Kargo Yöntemleri", icon: "truck", doctype: "Shipping Method" }],
    },
  ],

  // ── TİCARET & SİPARİŞLER ──────────────────────────
  commerce: [
    {
      title: "RFQ Yönetimi",
      color: "#f59e0b",
      items: [
        { label: "RFQ Talepleri", icon: "file-text", route: "/rfq-list" },
        { label: "RFQ Teklifleri", icon: "message-square", doctype: "RFQ Quote" },
        { label: "Tekliflerim", icon: "send", route: "/my-quotes" },
      ],
    },
    {
      title: "Siparişler",
      color: "#10b981",
      items: [
        { label: "Satıcı Siparişleri", icon: "package", route: "/seller-orders" },
        { label: "Tüm Siparişler", icon: "shopping-bag", doctype: "Order" },
      ],
    },
    {
      title: "Sepetler",
      color: "#3b82f6",
      items: [{ label: "Sepetler", icon: "shopping-cart", doctype: "Cart" }],
    },
  ],

  // ── SATICI YÖNETİMİ ────────────────────────────────
  sellers: [
    {
      title: "Başvuru & Profil",
      color: "#f59e0b",
      items: [
        { label: "Satıcı Başvuruları", icon: "file-text", doctype: "Seller Application" },
        { label: "Satıcı Profilleri", icon: "user-check", doctype: "Seller Profile" },
        { label: "Mağazalar", icon: "store", doctype: "Admin Seller Profile" },
        { label: "Tedarikçi Profili", icon: "building-2", doctype: "Supplier Profile" },
        { label: "KYB Doğrulama", icon: "shield-check", doctype: "KYB Verification" },
      ],
    },
    {
      title: "Sertifika Yönetimi",
      color: "#059669",
      items: [
        { label: "Sertifika Tipleri", icon: "award", doctype: "Certification Type" },
        {
          label: "Doğrulama Bekleyen Belgeler",
          icon: "shield-check",
          route: "/admin/cert-verification",
        },
      ],
    },
    {
      title: "Finans & Performans",
      color: "#f59e0b",
      items: [{ label: "Satıcı Bakiyeleri", icon: "wallet", doctype: "Seller Balance" }],
    },
    {
      title: "Müşteri & Sosyal",
      color: "#8b5cf6",
      items: [
        { label: "Yorum Moderasyonu", icon: "star", route: "/review-moderation" },
        { label: "Satıcı Soruları", icon: "message-circle", doctype: "Seller Inquiry" },
        { label: "Satıcı Kategorileri", icon: "folder", doctype: "Seller Category" },
        { label: "Galeri", icon: "image", doctype: "Seller Gallery Image" },
      ],
    },
  ],

  // ── CRM (headless: frappe/crm UI kapali, API ile konusuluyor) ─
  crm: [
    {
      title: null,
      color: "#8b5cf6",
      items: [{ label: "CRM Özet", icon: "layout-dashboard", route: "/crm" }],
    },
    {
      title: "Satış",
      color: "#8b5cf6",
      items: [
        { label: "Anlaşmalar", icon: "trending-up", route: "/crm/deals" },
        { label: "Talepler (Lead)", icon: "user-plus", route: "/crm/leads" },
      ],
    },
    {
      title: "Çalışma",
      color: "#7c3aed",
      items: [
        { label: "Görevlerim", icon: "check-square", route: "/crm/tasks?scope=mine" },
        { label: "Tüm Görevler", icon: "list-todo", route: "/crm/tasks" },
        { label: "Notlar", icon: "sticky-note", route: "/crm/notes" },
      ],
    },
    {
      title: "Kişiler",
      color: "#6366f1",
      items: [
        { label: "Kişiler", icon: "users", route: "/crm/contacts" },
        { label: "Kurumlar", icon: "building-2", route: "/crm/organizations" },
      ],
    },
    {
      title: "Ayarlar",
      color: "#64748b",
      items: [{ label: "CRM Ayarları", icon: "settings-2", route: "/crm/settings/general" }],
    },
  ],

  // ── DESTEK (headless: frappe/helpdesk UI kapali) ──
  helpdesk: [
    {
      title: null,
      color: "#06b6d4",
      items: [
        { label: "Tüm Talepler", icon: "life-buoy", route: "/helpdesk/tickets" },
        { label: "Mağaza Soruları", icon: "message-circle", route: "/helpdesk/inquiries" },
      ],
    },
    {
      title: "Yapılandırma",
      color: "#7c3aed",
      items: [
        { label: "Talep Tipleri", icon: "tag", route: "/helpdesk/types" },
        { label: "Hazır Yanıtlar", icon: "message-square", route: "/helpdesk/canned-responses" },
        { label: "Ajanlar", icon: "user-check", route: "/helpdesk/agents" },
        { label: "Ekipler", icon: "users", route: "/helpdesk/teams" },
      ],
    },
  ],

  // ── SİSTEM & KULLANICILAR ──────────────────────────
  system: [
    {
      title: "Kullanıcılar",
      color: "#6b7280",
      items: [{ label: "Alıcı Profilleri", icon: "user", doctype: "Buyer Profile" }],
    },
    {
      title: "Görünüm",
      color: "#f59e0b",
      items: [
        { label: "Site Teması", icon: "palette", route: "/theme-manager" },
        { label: "Dashboard Banner", icon: "megaphone", doctype: "Dashboard Banner" },
        { label: "Header Duyuruları", icon: "megaphone", route: "/header-notices" },
      ],
    },
    {
      title: "Dashboard",
      color: "#8b5cf6",
      items: [{ label: "Dashboard Yönetimi", icon: "gauge", route: "/dashboard-manager" }],
    },
    {
      title: "Öneri Motoru",
      color: "#10b981",
      items: [
        { label: "İlgili Ürünler Ayarları", icon: "sparkles", route: "/recommendations-settings" },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════
// SATICI NAVİGASYON
// ══════════════════════════════════════════════════════

export const sellerRailSections = [
  { id: "dashboard", icon: "house", label: "Ana Sayfa" },
  { id: "products", icon: "package", label: "Ürünlerim" },
  { id: "orders", icon: "shopping-bag", label: "Siparişler" },
  { id: "crm", icon: "briefcase", label: "CRM" },
  { id: "store", icon: "store", label: "Mağazam" },
  { id: "helpdesk", icon: "life-buoy", label: "Destek" },
];

export const sellerSectionTitles = {
  dashboard: "Dashboard",
  products: "Ürünlerim",
  orders: "Siparişlerim",
  crm: "Müşteri İlişkileri (CRM)",
  store: "Mağazam",
  helpdesk: "Destek Talepleri",
};

export const sellerPanelSections = {
  // ── DASHBOARD ─────────────────────────────────────
  dashboard: [
    {
      title: null,
      color: "#7c3aed",
      items: [{ label: "Dashboard", icon: "layout-grid", route: "/dashboard" }],
    },
  ],

  // ── ÜRÜNLERİM ─────────────────────────────────────
  products: [
    {
      title: "Ürünler",
      color: "#7c3aed",
      items: [
        { label: "Ürünlerim", icon: "list", route: "/seller-listings" },
        { label: "Kategorilerim", icon: "folder", route: "/seller-categories" },
      ],
    },
    {
      title: "Katalog Yapısı",
      color: "#8b5cf6",
      items: [
        { label: "Markalar", icon: "bookmark", doctype: "Brand" },
        { label: "Ürün Tipleri", icon: "layers", doctype: "Product Type" },
        { label: "Ürün Aileleri", icon: "package-2", doctype: "Product Family" },
      ],
    },
    {
      title: "Özellik Yönetimi",
      color: "#6366f1",
      items: [
        { label: "Ürün Özellikleri", icon: "settings-2", doctype: "Product Attribute" },
        { label: "Özellik Setleri", icon: "grid", doctype: "Attribute Set" },
      ],
    },
  ],

  // ── SİPARİŞLERİM ──────────────────────────────────
  orders: [
    {
      title: "RFQ",
      color: "#f59e0b",
      items: [
        { label: "RFQ Talepleri", icon: "file-text", route: "/rfq-list" },
        { label: "Tekliflerim", icon: "send", route: "/my-quotes" },
      ],
    },
    {
      title: "Siparişler",
      color: "#10b981",
      items: [{ label: "Siparişlerim", icon: "shopping-bag", route: "/seller-orders" }],
    },
  ],

  // ── MAĞAZAM ───────────────────────────────────────
  store: [
    {
      title: "Profil & Finans",
      color: "#f59e0b",
      items: [
        { label: "Profilim", icon: "user-check", doctype: "Seller Profile", sellerOwned: true },
        {
          label: "Mağaza Ayarları",
          icon: "store",
          doctype: "Admin Seller Profile",
          sellerOwned: true,
        },
        {
          label: "KYB Doğrulama",
          icon: "shield-check",
          doctype: "KYB Verification",
          sellerOwned: true,
        },
        { label: "Bakiyem", icon: "wallet", doctype: "Seller Balance", sellerOwned: true },
      ],
    },
    {
      title: "Sertifikalar",
      color: "#059669",
      items: [{ label: "Sertifikalarım", icon: "award", route: "/my-certifications" }],
    },
    {
      title: "Vitrin",
      color: "#6366f1",
      items: [{ label: "Sayfa Düzeni", icon: "layout-grid", route: "/storefront-layout" }],
    },
    {
      title: "Müşteri & Sosyal",
      color: "#8b5cf6",
      items: [
        { label: "Yorumlarım", icon: "star", route: "/review-moderation" },
        {
          label: "Sorularım",
          icon: "message-circle",
          route: "/seller-questions",
        },
        { label: "Kategorilerim", icon: "folder", doctype: "Seller Category", sellerOwned: true },
        { label: "Galerim", icon: "image", doctype: "Seller Gallery Image", sellerOwned: true },
      ],
    },
  ],

  // ── CRM (satıcının kendi mağazasının lead/deal'ları) ──
  crm: [
    {
      title: null,
      color: "#8b5cf6",
      items: [{ label: "CRM Özet", icon: "layout-dashboard", route: "/crm" }],
    },
    {
      title: "Satış",
      color: "#8b5cf6",
      items: [
        { label: "Anlaşmalarım", icon: "trending-up", route: "/crm/deals" },
        { label: "Lead'lerim", icon: "user-plus", route: "/crm/leads" },
      ],
    },
    {
      title: "Çalışma",
      color: "#7c3aed",
      items: [
        { label: "Görevlerim", icon: "check-square", route: "/crm/tasks?scope=mine" },
        { label: "Tüm Görevler", icon: "list-todo", route: "/crm/tasks" },
        { label: "Notlar", icon: "sticky-note", route: "/crm/notes" },
      ],
    },
    {
      title: "Kişiler",
      color: "#6366f1",
      items: [
        { label: "Kişiler", icon: "users", route: "/crm/contacts" },
        { label: "Kurumlar", icon: "building-2", route: "/crm/organizations" },
      ],
    },
  ],

  // ── DESTEK (saticinin kendi team'ine dusen ticket'lar) ──
  helpdesk: [
    {
      title: null, // her zaman açık
      color: "#06b6d4",
      items: [{ label: "Destek Talepleri", icon: "life-buoy", route: "/helpdesk/tickets" }],
    },
  ],
};

// ── Geriye dönük uyum (admin default olarak export) ──

export const railSections = adminRailSections;
export const sectionTitles = adminSectionTitles;
export const panelSections = adminPanelSections;

// ── Yardımcı fonksiyonlar ────────────────────────────

/** GlobalSearch için düz arama indeksi (admin) */
export const searchData = Object.entries(adminPanelSections).flatMap(([sectionId, groups]) =>
  groups.flatMap((group) =>
    group.items.map((item) => ({
      label: item.label,
      icon: item.icon,
      section: sectionId,
      sectionLabel: adminSectionTitles[sectionId] || sectionId,
      route: item.route || (item.doctype ? `/app/${encodeURIComponent(item.doctype)}` : null),
      doctype: item.doctype || null,
    }))
  )
);

/** Route, doctype veya report ile navigasyon öğesi ara */
export function lookupNavItem(value, type = "route", sections = adminPanelSections) {
  const titles = sections === sellerPanelSections ? sellerSectionTitles : adminSectionTitles;
  for (const [sectionId, groups] of Object.entries(sections)) {
    for (const group of groups) {
      for (const item of group.items) {
        if (type === "route" && item.route === value) {
          return { ...item, section: sectionId, sectionTitle: titles[sectionId] };
        }
        if (type === "doctype" && item.doctype === value) {
          return { ...item, section: sectionId, sectionTitle: titles[sectionId] };
        }
      }
    }
  }
  return null;
}

/** Belirtilen section için ilk navigable route'u döndür */
export function getFirstSectionRoute(sectionId, sections = adminPanelSections) {
  const groups = sections[sectionId];
  if (!groups) return "/dashboard";
  for (const group of groups) {
    for (const item of group.items) {
      if (item.route) return item.route;
      if (item.doctype) return `/app/${encodeURIComponent(item.doctype)}`;
    }
  }
  return "/dashboard";
}
