// ======================================================
// TradeHub B2B - Navigation Data
// Gerçek Frappe backend doctypelarına göre (tradehub_core)
// Rol bazlı: admin ve satıcı ayrı navigasyon
// ======================================================
//
// NOTE: label/title values are i18n KEY STRINGS (nav.* namespace), not display
// text. They are translated at render time via t(key) in the consumer
// components. English values live in src/i18n/locales/en.js under `nav`.
// Keys are stable & unique; admin/seller reuse the same key when the English
// text is identical. `title: null` stays null (those groups have no title).

// ══════════════════════════════════════════════════════
// ADMİN NAVİGASYON
// ══════════════════════════════════════════════════════

export const adminRailSections = [
  { id: "dashboard", icon: "house", label: "nav.rail.home" },
  { id: "catalog", icon: "package", label: "nav.rail.catalog" },
  { id: "commerce", icon: "shopping-cart", label: "nav.rail.commerce" },
  { id: "sellers", icon: "store", label: "nav.rail.sellers" },
  { id: "crm", icon: "users-round", label: "nav.rail.crm" },
  { id: "helpdesk", icon: "life-buoy", label: "nav.rail.helpdesk" },
  { id: "system", icon: "settings", label: "nav.rail.system" },
];

export const adminSectionTitles = {
  dashboard: "nav.section.dashboard",
  catalog: "nav.section.catalog",
  commerce: "nav.section.commerce",
  sellers: "nav.section.sellers",
  crm: "nav.section.crm",
  helpdesk: "nav.section.helpdesk",
  system: "nav.section.system",
};

export const adminPanelSections = {
  // ── DASHBOARD ─────────────────────────────────────
  dashboard: [
    {
      title: null,
      color: "#7c3aed",
      items: [{ label: "nav.item.dashboard", icon: "layout-grid", route: "/dashboard" }],
    },
  ],

  // ── ÜRÜN KATALOGU ─────────────────────────────────
  catalog: [
    {
      title: "nav.group.listings",
      color: "#7c3aed",
      items: [
        { label: "nav.item.listings", icon: "list", doctype: "Listing" },
        { label: "nav.item.listingModeration", icon: "shield-check", route: "/listing-moderation" },
        {
          label: "nav.item.categoryModeration",
          icon: "folder-check",
          route: "/category-moderation",
        },
        {
          label: "nav.item.categoryManagement",
          icon: "folder-tree",
          route: "/category-management",
        },
        {
          label: "nav.item.categoryTranslations",
          icon: "languages",
          route: "/category-translations",
        },
      ],
    },
    {
      title: "nav.group.catalogStructure",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.brands", icon: "bookmark", doctype: "Brand" },
        { label: "nav.item.productTypes", icon: "layers", doctype: "Product Type" },
        { label: "nav.item.productFamilies", icon: "package-2", doctype: "Product Family" },
      ],
    },
    {
      title: "nav.group.attributeManagement",
      color: "#6366f1",
      items: [
        { label: "nav.item.productAttributes", icon: "settings-2", doctype: "Product Attribute" },
        { label: "nav.item.attributeSets", icon: "grid", doctype: "Attribute Set" },
      ],
    },
    {
      title: "nav.group.finance",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.coupons", icon: "ticket", doctype: "Coupon" },
        { label: "nav.item.currencyManagement", icon: "coins", doctype: "Supported Currency" },
        { label: "nav.item.cbrtRates", icon: "refresh-cw", doctype: "Currency Rate Pair" },
      ],
    },
    {
      title: "nav.group.shipping",
      color: "#06b6d4",
      items: [{ label: "nav.item.shippingMethods", icon: "truck", doctype: "Shipping Method" }],
    },
  ],

  // ── TİCARET & SİPARİŞLER ──────────────────────────
  commerce: [
    {
      title: "nav.group.rfqManagement",
      color: "#f59e0b",
      items: [
        { label: "nav.item.rfqRequests", icon: "file-text", route: "/rfq-list" },
        { label: "nav.item.rfqQuotes", icon: "message-square", doctype: "RFQ Quote" },
        { label: "nav.item.myQuotes", icon: "send", route: "/my-quotes" },
      ],
    },
    {
      title: "nav.group.orders",
      color: "#10b981",
      items: [
        // "Satıcı Siparişleri" (/seller-orders) kaldırıldı: sayfa satıcıya-özel
        // (get_seller_orders sadece login satıcının profilini filtreler), admin
        // için "all sellers" modu yok → süper-admin'de hep boş/işlevsiz.
        // Admin platform genelini "Tüm Siparişler" (Order doctype) ile yönetir.
        { label: "nav.item.allOrders", icon: "shopping-bag", doctype: "Order" },
      ],
    },
    {
      title: "nav.group.carts",
      color: "#3b82f6",
      items: [{ label: "nav.item.carts", icon: "shopping-cart", doctype: "Cart" }],
    },
  ],

  // ── SATICI YÖNETİMİ ────────────────────────────────
  sellers: [
    {
      title: "nav.group.applicationProfile",
      color: "#f59e0b",
      items: [
        { label: "nav.item.sellerApplications", icon: "file-text", doctype: "Seller Application" },
        { label: "nav.item.sellerProfiles", icon: "user-check", doctype: "User Profile" },
        { label: "nav.item.stores", icon: "store", doctype: "Admin Seller Profile" },
        { label: "nav.item.kycVerificationBuyer", icon: "user-check", doctype: "KYC Verification" },
        {
          label: "nav.item.kybVerificationSeller",
          icon: "shield-check",
          doctype: "KYB Verification",
        },
      ],
    },
    {
      title: "nav.group.certificationManagement",
      color: "#059669",
      items: [
        { label: "nav.item.certificationTypes", icon: "award", doctype: "Certification Type" },
        {
          label: "nav.item.documentsPendingVerification",
          icon: "shield-check",
          route: "/admin/cert-verification",
        },
        {
          label: "nav.item.verificationSources",
          icon: "badge-check",
          route: "/admin/verification-sources",
        },
        {
          label: "nav.item.sellerVerificationQueue",
          icon: "shield-alert",
          route: "/admin/seller-verification-queue",
        },
      ],
    },
    {
      title: "nav.group.financePerformance",
      color: "#f59e0b",
      items: [{ label: "nav.item.sellerBalances", icon: "wallet", doctype: "Seller Balance" }],
    },
    {
      title: "nav.group.customerSocial",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.reviewModeration", icon: "star", route: "/review-moderation" },
        { label: "nav.item.sellerInquiries", icon: "message-circle", doctype: "Seller Inquiry" },
        { label: "nav.item.sellerCategories", icon: "folder", doctype: "Seller Category" },
        { label: "nav.item.gallery", icon: "image", doctype: "Seller Gallery Image" },
      ],
    },
  ],

  // ── CRM (headless: frappe/crm UI kapali, API ile konusuluyor) ─
  crm: [
    {
      title: null,
      color: "#8b5cf6",
      items: [{ label: "nav.item.crmOverview", icon: "layout-dashboard", route: "/crm" }],
    },
    {
      title: "nav.group.sales",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.deals", icon: "trending-up", route: "/crm/deals" },
        { label: "nav.item.leads", icon: "user-plus", route: "/crm/leads" },
      ],
    },
    {
      title: "nav.group.work",
      color: "#7c3aed",
      items: [
        { label: "nav.item.myTasks", icon: "check-square", route: "/crm/tasks?scope=mine" },
        { label: "nav.item.allTasks", icon: "list-todo", route: "/crm/tasks" },
        { label: "nav.item.notes", icon: "sticky-note", route: "/crm/notes" },
      ],
    },
    {
      title: "Hakediş",
      color: "#10b981",
      items: [
        { label: "Hakedişlerim", icon: "wallet", route: "/hakedislerim" },
        // Lider: yalnız kendi ekibinin hakedişleri — lider onay/red.
        {
          label: "Ekip Hakedişleri",
          icon: "users",
          route: "/hakedis-ekip",
          requires: ["leader", "admin"],
        },
        // Saha hakediş onay/ödeme konsolu — yalnız Süper Admin.
        // `requires: ["admin"]` nav store'un filterByRole'u tarafından honor edilir;
        // route guard ayrıca `requiresSuperAdmin` meta ile korur.
        {
          label: "Hakediş Yönetimi",
          icon: "badge-dollar-sign",
          route: "/hakedis-yonetimi",
          requires: ["admin"],
        },
        {
          label: "Hakediş Ayarları",
          icon: "settings",
          route: "/hakedis-ayarlari",
          requires: ["admin"],
        },
      ],
    },
    {
      title: "nav.group.contacts",
      color: "#6366f1",
      items: [
        { label: "nav.item.contacts", icon: "users", route: "/crm/contacts" },
        { label: "nav.item.organizations", icon: "building-2", route: "/crm/organizations" },
      ],
    },
    {
      title: "nav.group.settings",
      color: "#64748b",
      items: [
        { label: "nav.item.crmSettings", icon: "settings-2", route: "/crm/settings/general" },
      ],
    },
  ],

  // ── DESTEK (headless: frappe/helpdesk UI kapali) ──
  helpdesk: [
    {
      title: null,
      color: "#06b6d4",
      items: [
        { label: "nav.item.allTickets", icon: "life-buoy", route: "/helpdesk/tickets" },
        { label: "nav.item.storeInquiries", icon: "message-circle", route: "/helpdesk/inquiries" },
      ],
    },
    {
      title: "nav.group.configuration",
      color: "#7c3aed",
      items: [
        { label: "nav.item.ticketTypes", icon: "tag", route: "/helpdesk/types" },
        {
          label: "nav.item.cannedResponses",
          icon: "message-square",
          route: "/helpdesk/canned-responses",
        },
        { label: "nav.item.agents", icon: "user-check", route: "/helpdesk/agents" },
        { label: "nav.item.teams", icon: "users", route: "/helpdesk/teams" },
      ],
    },
  ],

  // ── SİSTEM & KULLANICILAR ──────────────────────────
  // `requires`: ["admin"] sadece Super Admin görür; ["owner", "co_owner"] vs.
  // canAccess(requires) tag listesinden birini sağlarsa görünür.
  system: [
    {
      title: "nav.group.authorizationUser",
      color: "#7c3aed",
      requires: ["admin", "compliance"],
      items: [
        // FAZ 1.6 — Süper Admin yetki yönetim konsolu
        {
          label: "nav.item.permissionManagement",
          icon: "shield-check",
          route: "/permission-console",
          requires: ["admin"],
        },
        // FAZ 3.1 — Yetki simülatörü (debug aracı)
        {
          label: "nav.item.authorizationSimulator",
          icon: "search",
          route: "/authorization-simulator",
          requires: ["admin"],
        },
        // FAZ 2.4 — B2B alıcı ekip yönetimi
        {
          label: "nav.item.b2bBuyerTeam",
          icon: "users-round",
          route: "/buyer-team",
          requires: ["admin"],
        },
        // FAZ 2.5 — Onay kuyruğu (B2B approver'lar için)
        {
          label: "nav.item.myApprovalQueue",
          icon: "check-circle",
          route: "/approval-queue",
          requires: ["Buyer Approver L1", "Buyer Approver L2", "admin"],
        },
        // FAZ 3.5 — Vekalet + Owner devri (Owner kendi için, Süper Admin platform için)
        {
          label: "nav.item.delegation",
          icon: "refresh-cw",
          route: "/delegation",
          requires: ["owner_or_co", "admin"],
        },
        {
          label: "nav.item.ownerTransfer",
          icon: "crown",
          route: "/owner-transfer",
          requires: ["owner", "admin"],
        },
        {
          label: "nav.item.buyerProfiles",
          icon: "user",
          doctype: "User Profile",
          requires: ["admin"],
        },
      ],
    },
    // FAZ 3.2-3.4 — Uyum + Anomali (Compliance Officer + Super Admin)
    {
      title: "nav.group.complianceSecurity",
      color: "#ef4444",
      requires: ["admin", "compliance"],
      items: [
        {
          label: "nav.item.piiMaskMatrix",
          icon: "shield",
          route: "/compliance/pii-mask-matrix",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.anomalyDashboard",
          icon: "alert-triangle",
          route: "/compliance/anomaly-dashboard",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.consentLogs",
          icon: "check-circle",
          doctype: "User Consent Log",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.dataExportRequests",
          icon: "download",
          doctype: "Data Export Request",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.dataProcessingAgreements",
          icon: "file-text",
          doctype: "Data Processing Agreement",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.dataRetentionPolicies",
          icon: "clock",
          doctype: "Data Retention Policy",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.ropaRecords",
          icon: "list-checks",
          doctype: "Processing Activity Record",
          requires: ["admin", "compliance"],
        },
        {
          label: "nav.item.policyVersions",
          icon: "git-branch",
          doctype: "Consent Policy Version",
          requires: ["admin", "compliance"],
        },
      ],
    },
    // FAZ 3.3 — Procurement (Buyer Owner / Buyer Full Access)
    {
      title: "nav.group.procurement",
      color: "#10b981",
      requires: ["admin", "Buyer", "Buyer Full Access"],
      items: [
        {
          label: "nav.item.costCenter",
          icon: "wallet",
          route: "/procurement/cost-centers",
          requires: ["admin", "Buyer"],
        },
        {
          label: "nav.item.approvedSuppliers",
          icon: "handshake",
          route: "/procurement/approved-suppliers",
          requires: ["admin", "Buyer"],
        },
      ],
    },
    {
      title: "nav.group.appearance",
      color: "#f59e0b",
      requires: ["admin"],
      items: [
        {
          label: "nav.item.siteTheme",
          icon: "palette",
          route: "/theme-manager",
          requires: ["admin"],
        },
        {
          label: "Hero Slider",
          icon: "gallery-horizontal-end",
          route: "/hero-slider",
          requires: ["admin"],
        },
        {
          label: "nav.item.dashboardBanner",
          icon: "megaphone",
          doctype: "Dashboard Banner",
          requires: ["admin"],
        },
        {
          label: "nav.item.headerNotices",
          icon: "megaphone",
          route: "/header-notices",
          requires: ["admin"],
        },
        {
          label: "nav.item.categoryShowcase",
          icon: "layout-grid",
          route: "/category-showcase",
          requires: ["admin"],
        },
      ],
    },
    {
      title: "nav.section.dashboard",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.dashboardManagement", icon: "gauge", route: "/dashboard-manager" },
      ],
    },
    {
      title: "nav.group.recommendationEngine",
      color: "#10b981",
      items: [
        {
          label: "nav.item.relatedProductsSettings",
          icon: "sparkles",
          route: "/recommendations-settings",
        },
        {
          label: "nav.item.socialProofSettings",
          icon: "trending-up",
          route: "/social-proof-settings",
        },
      ],
    },
    {
      title: "nav.group.integrations",
      color: "#6366f1",
      items: [
        { label: "nav.item.trackingSettings", icon: "activity", route: "/tracking-settings" },
      ],
    },
    {
      title: "nav.group.seoManagement",
      color: "#0ea5e9",
      items: [
        { label: "nav.item.allPages", icon: "list-checks", route: "/seo" },
        { label: "nav.item.urlRedirects", icon: "git-fork", route: "/seo/redirects" },
        { label: "nav.item.notFoundLogs", icon: "file-warning", route: "/seo/404s" },
      ],
    },
    {
      title: "nav.group.automation",
      color: "#7c3aed",
      items: [
        { label: "nav.item.ecaRules", icon: "zap", route: "/eca-rules" },
        { label: "nav.item.ecaRuleLog", icon: "list-checks", route: "/eca-rule-log" },
        { label: "nav.item.regexPatternLibrary", icon: "regex", route: "/regex-patterns" },
        { label: "nav.item.bulkImportHistory", icon: "upload-cloud", route: "/bulk-import" },
        { label: "nav.item.sellerFeeds", icon: "rss", route: "/admin-feeds" },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════
// SATICI NAVİGASYON
// ══════════════════════════════════════════════════════

export const sellerRailSections = [
  { id: "dashboard", icon: "house", label: "nav.rail.home" },
  { id: "products", icon: "package", label: "nav.rail.myProducts" },
  { id: "orders", icon: "shopping-bag", label: "nav.rail.orders" },
  { id: "crm", icon: "briefcase", label: "nav.rail.crm" },
  { id: "store", icon: "store", label: "nav.rail.myStore" },
  { id: "helpdesk", icon: "life-buoy", label: "nav.rail.helpdesk" },
];

export const sellerSectionTitles = {
  dashboard: "nav.section.dashboard",
  products: "nav.section.myProducts",
  orders: "nav.section.myOrders",
  crm: "nav.section.crm",
  store: "nav.section.myStore",
  helpdesk: "nav.section.supportTickets",
};

export const sellerPanelSections = {
  // ── DASHBOARD ─────────────────────────────────────
  dashboard: [
    {
      title: null,
      color: "#7c3aed",
      items: [{ label: "nav.item.dashboard", icon: "layout-grid", route: "/dashboard" }],
    },
  ],

  // ── ÜRÜNLERİM ─────────────────────────────────────
  products: [
    {
      title: "nav.group.products",
      color: "#7c3aed",
      items: [
        { label: "nav.item.myProducts", icon: "list", route: "/seller-listings" },
        { label: "nav.item.myCategories", icon: "folder", route: "/seller-categories" },
      ],
    },
    {
      title: "nav.group.bulkUpload",
      color: "#7c3aed",
      items: [
        { label: "nav.item.newBulkUpload", icon: "upload", route: "/bulk-import/new" },
        { label: "nav.item.myUploadHistory", icon: "history", route: "/bulk-import" },
        { label: "nav.item.myRules", icon: "zap", route: "/my-eca-rules" },
        { label: "nav.item.myPatterns", icon: "wand", route: "/my-regex-patterns" },
        {
          label: "nav.item.xmlFeed",
          icon: "cloud-download",
          route: "/seller-feed",
          feature: "feature.import.xml_feed",
        },
      ],
    },
    {
      title: "nav.group.catalogStructure",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.brands", icon: "bookmark", doctype: "Brand" },
        { label: "nav.item.productTypes", icon: "layers", doctype: "Product Type" },
        { label: "nav.item.productFamilies", icon: "package-2", doctype: "Product Family" },
      ],
    },
  ],

  // ── SİPARİŞLERİM ──────────────────────────────────
  orders: [
    {
      title: "nav.group.rfq",
      color: "#f59e0b",
      items: [
        { label: "nav.item.rfqRequests", icon: "file-text", route: "/rfq-list" },
        { label: "nav.item.myQuotes", icon: "send", route: "/my-quotes" },
      ],
    },
    {
      title: "nav.group.orders",
      color: "#10b981",
      items: [{ label: "nav.item.myOrders", icon: "shopping-bag", route: "/seller-orders" }],
    },
  ],

  // ── MAĞAZAM ───────────────────────────────────────
  store: [
    {
      title: "nav.group.profileFinance",
      color: "#f59e0b",
      items: [
        // Profil herkese açık (kendi profilini görsün)
        {
          label: "nav.item.myProfile",
          icon: "user-check",
          doctype: "User Profile",
          sellerOwned: true,
        },
        // Mağaza Ayarları sadece Owner/Co-Owner (banka/vergi düzenleyebilir)
        {
          label: "nav.item.storeSettings",
          icon: "store",
          doctype: "Admin Seller Profile",
          sellerOwned: true,
          requires: ["owner_or_co", "admin"],
        },
        // KYB sadece Owner (Owner-Lock)
        {
          label: "nav.item.kybVerification",
          icon: "shield-check",
          doctype: "KYB Verification",
          sellerOwned: true,
          requires: ["owner", "admin"],
        },
        // Saha/tedarikçi doğrulama başvurusu — KYB ile aynı "başvuru" niteliğinde,
        // bu yüzden Sertifikalar grubu yerine burada (KYB komşusu). Rol kısıtı yok:
        // create_my_verification session kullanıcısının satıcı profiline bağlı.
        {
          label: "nav.item.myVerifications",
          icon: "badge-check",
          route: "/my-verifications",
        },
        // Abonelik (paket/havale) — Owner/Co-Owner (billing)
        {
          label: "nav.item.subscription",
          icon: "credit-card",
          route: "/abonelik",
          sellerOwned: true,
          requires: ["owner_or_co", "admin"],
        },
      ],
    },
    {
      title: "nav.group.certifications",
      color: "#059669",
      items: [
        { label: "nav.item.myCertifications", icon: "award", route: "/my-certifications" },
      ],
    },
    {
      title: "nav.group.storefront",
      color: "#6366f1",
      items: [{ label: "nav.item.pageLayout", icon: "layout-grid", route: "/storefront-layout" }],
    },
    {
      title: "nav.group.customerSocial",
      color: "#8b5cf6",
      items: [
        {
          label: "nav.item.myMessages",
          icon: "message-square",
          route: "/messaging/buyer-messages",
        },
        { label: "nav.item.availability", icon: "calendar", route: "/messaging/availability" },
        { label: "nav.item.myReviews", icon: "star", route: "/review-moderation" },
        {
          label: "nav.item.myInquiries",
          icon: "message-circle",
          route: "/seller-questions",
        },
        // Kategorilerim Ürünler bölümünde /seller-categories ile zaten var —
        // generic doctype view burada gösterilince çift link oluşuyordu, kaldırıldı.
        {
          label: "nav.item.myGallery",
          icon: "image",
          doctype: "Seller Gallery Image",
          sellerOwned: true,
        },
      ],
    },
    // FAZ 1.6 — Satıcının kendi ekip yönetimi (sadece Owner ve Co-Owner görür)
    {
      title: "nav.group.team",
      color: "#7c3aed",
      requires: ["owner_or_co", "admin"],
      items: [
        {
          label: "nav.item.myTeam",
          icon: "users",
          route: "/seller-team",
          requires: ["owner_or_co", "admin"],
        },
      ],
    },
  ],

  // ── CRM (satıcının kendi mağazasının lead/deal'ları) ──
  crm: [
    {
      title: null,
      color: "#8b5cf6",
      items: [{ label: "nav.item.crmOverview", icon: "layout-dashboard", route: "/crm" }],
    },
    {
      title: "nav.group.sales",
      color: "#8b5cf6",
      items: [
        { label: "nav.item.myDeals", icon: "trending-up", route: "/crm/deals" },
        { label: "nav.item.myLeads", icon: "user-plus", route: "/crm/leads" },
      ],
    },
    {
      title: "nav.group.work",
      color: "#7c3aed",
      items: [
        { label: "nav.item.myTasks", icon: "check-square", route: "/crm/tasks?scope=mine" },
        { label: "nav.item.allTasks", icon: "list-todo", route: "/crm/tasks" },
        { label: "nav.item.notes", icon: "sticky-note", route: "/crm/notes" },
      ],
    },
    {
      title: "nav.group.contacts",
      color: "#6366f1",
      items: [
        { label: "nav.item.contacts", icon: "users", route: "/crm/contacts" },
        { label: "nav.item.organizations", icon: "building-2", route: "/crm/organizations" },
      ],
    },
  ],

  // ── DESTEK (saticinin kendi team'ine dusen ticket'lar) ──
  helpdesk: [
    {
      title: null, // her zaman açık
      color: "#06b6d4",
      items: [{ label: "nav.item.supportTickets", icon: "life-buoy", route: "/helpdesk/tickets" }],
    },
  ],
};

// ── Geriye dönük uyum (admin default olarak export) ──

export const railSections = adminRailSections;
export const sectionTitles = adminSectionTitles;
export const panelSections = adminPanelSections;

// ── Yardımcı fonksiyonlar ────────────────────────────

/** GlobalSearch için düz arama indeksi (admin) — label/sectionLabel i18n KEY'leridir */
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
