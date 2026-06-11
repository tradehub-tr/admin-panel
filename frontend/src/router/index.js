import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";
import { useSubscriptionStore } from "@/stores/subscription";

// Layout
import AppLayout from "@/layouts/AppLayout.vue";

// Views (lazy-loaded)
const LoginView = () => import("@/views/auth/LoginView.vue");
const DocTypeListView = () => import("@/views/doctype/DocTypeListView.vue");
const SellerOrdersView = () => import("@/views/seller/SellerOrdersView.vue");
const ListingModerationView = () => import("@/views/products/ListingModerationView.vue");
const CategoryModerationView = () => import("@/views/products/CategoryModerationView.vue");
const CategoryManagementView = () => import("@/views/products/CategoryManagementView.vue");
const CategoryTranslationsView = () => import("@/views/products/CategoryTranslationsView.vue");
const SellerListingsView = () => import("@/views/seller/SellerListingsView.vue");
const SellerCategoriesView = () => import("@/views/seller/SellerCategoriesView.vue");
const ListingFormView = () => import("@/views/seller/ListingFormView.vue");
// Bulk Import (toplu ürün yükleme)
const BulkProductImportView = () => import("@/views/bulk-import/BulkProductImportView.vue");
const BulkImportHistoryView = () => import("@/views/bulk-import/BulkImportHistoryView.vue");
const BulkImportDetailView = () => import("@/views/bulk-import/BulkImportDetailView.vue");
const XmlMappingView = () => import("@/views/bulk-import/XmlMappingView.vue");
// XML Feed (otomatik ürün çekme)
const SellerFeedView = () => import("@/views/bulk-import/SellerFeedView.vue");
const AdminFeedsView = () => import("@/views/feed/AdminFeedsView.vue");
// ECA Rules
const EcaRulesView = () => import("@/views/eca/EcaRulesView.vue");
const MyEcaRulesView = () => import("@/views/eca/MyEcaRulesView.vue");
const EcaRuleFormView = () => import("@/views/eca/EcaRuleFormView.vue");
const EcaRuleLogView = () => import("@/views/eca/EcaRuleLogView.vue");
// Regex Patterns
const RegexPatternsView = () => import("@/views/regex/RegexPatternsView.vue");
const MyRegexPatternsView = () => import("@/views/regex/MyRegexPatternsView.vue");
// Taksonomi (Ürün Tipleri + Özellikler + İçe/Dışa Aktar)
const RfqList = () => import("@/views/sales/RfqList.vue");
const RfqDetail = () => import("@/views/sales/RfqDetail.vue");
const MyQuotesList = () => import("@/views/sales/MyQuotesList.vue");
const StorefrontLayoutEditor = () => import("@/views/seller/StorefrontLayoutEditor.vue");
const MyCertificationsView = () => import("@/views/seller/MyCertificationsView.vue");
const CertVerificationView = () => import("@/views/admin/CertVerificationView.vue");
const ThemeManagerView = () => import("@/views/system/ThemeManagerView.vue");
const DashboardManagerView = () => import("@/views/system/DashboardManagerView.vue");
const HeaderNoticesView = () => import("@/views/system/HeaderNoticesView.vue");
const RecommendationsSettingsView = () => import("@/views/system/RecommendationsSettingsView.vue");
// FAZ 1.6 — Permission Console (Süper Admin) + Satıcı Sub-User Yönetimi
const PermissionConsoleView = () => import("@/views/system/PermissionConsoleView.vue");
const SubUserManagementView = () => import("@/views/seller/SubUserManagementView.vue");
// FAZ 2.4 — B2B alıcı ekip yönetimi (Süper Admin / Buyer Admin için)
const BuyerTeamManagementView = () => import("@/views/buyer/BuyerTeamManagementView.vue");
// FAZ 2.5 — Onay kuyruğu (B2B Approver L1/L2 için)
const ApprovalQueueView = () => import("@/views/orders/ApprovalQueueView.vue");
// FAZ 3.1 — Yetki simülatörü (Süper Admin + Tenant Owner)
const AuthorizationSimulatorView = () => import("@/views/system/AuthorizationSimulatorView.vue");
// FAZ 3.2 — Compliance / PII mask matrix (Compliance Officer + Süper Admin)
const ComplianceMaskMatrixView = () => import("@/views/system/ComplianceMaskMatrixView.vue");
// FAZ 3.3 — Procurement: cost center tree + approved suppliers
const CostCenterTreeView = () => import("@/views/buyer/procurement/CostCenterTreeView.vue");
const ApprovedSuppliersView = () => import("@/views/buyer/procurement/ApprovedSuppliersView.vue");
// FAZ 3.4 — OpenClaw anomaly dashboard
const AnomalyDashboardView = () => import("@/views/system/AnomalyDashboardView.vue");
// FAZ 3.5 — Geçici yetki + owner transfer
const DelegationManagerView = () => import("@/views/system/DelegationManagerView.vue");
const OwnerTransferView = () => import("@/views/system/OwnerTransferView.vue");
const SocialProofSettingsView = () => import("@/views/system/SocialProofSettingsView.vue");
const TrackingSettingsView = () => import("@/views/system/TrackingSettingsView.vue");
const NotificationsView = () => import("@/views/messaging/NotificationsView.vue");
const BuyerMessagesView = () => import("@/views/messaging/BuyerMessagesView.vue");
const AvailabilityView = () => import("@/views/messaging/AvailabilityView.vue");
const CrmLeadsListView = () => import("@/views/crm/LeadsListView.vue");
const CrmLeadDetailView = () => import("@/views/crm/LeadDetailView.vue");
const CrmDashboardView = () => import("@/views/crm/CrmDashboardView.vue");
const CrmDealsListView = () => import("@/views/crm/DealsListView.vue");
const CrmDealDetailView = () => import("@/views/crm/DealDetailView.vue");
const CrmTasksListView = () => import("@/views/crm/TasksListView.vue");
const MyCommissionsView = () => import("@/views/crm/MyCommissionsView.vue");
const CommissionAdminView = () => import("@/views/crm/CommissionAdminView.vue");
const CommissionSettingsView = () => import("@/views/crm/CommissionSettingsView.vue");
const CommissionTeamView = () => import("@/views/crm/CommissionTeamView.vue");
const CrmNotesListView = () => import("@/views/crm/NotesListView.vue");
const CrmContactsListView = () => import("@/views/crm/ContactsListView.vue");
const CrmContactDetailView = () => import("@/views/crm/ContactDetailView.vue");
const CrmOrganizationsListView = () => import("@/views/crm/OrganizationsListView.vue");
const CrmOrganizationDetailView = () => import("@/views/crm/OrganizationDetailView.vue");
const CrmSettingsShell = () => import("@/views/crm/settings/CrmSettingsShell.vue");
const CrmGeneralSettings = () => import("@/views/crm/settings/GeneralSettings.vue");
const CrmTaxonomySettings = () => import("@/views/crm/settings/TaxonomySettings.vue");
const CrmSlaSettings = () => import("@/views/crm/settings/SlaSettings.vue");
const CrmAssignmentRulesSettings = () => import("@/views/crm/settings/AssignmentRulesSettings.vue");
const CrmIntegrationsSettings = () => import("@/views/crm/settings/IntegrationsSettings.vue");
const CrmEmailAccountsSettings = () => import("@/views/crm/settings/EmailAccountsSettings.vue");
const HelpdeskTicketsListView = () => import("@/views/helpdesk/TicketsListView.vue");
const HelpdeskTicketDetailView = () => import("@/views/helpdesk/TicketDetailView.vue");
const HelpdeskTicketTypesView = () => import("@/views/helpdesk/TicketTypesView.vue");
const HelpdeskAgentsView = () => import("@/views/helpdesk/AgentsView.vue");
const HelpdeskTeamsView = () => import("@/views/helpdesk/TeamsView.vue");
const HelpdeskCannedResponsesView = () => import("@/views/helpdesk/CannedResponsesView.vue");
const SellerInquiriesListView = () => import("@/views/helpdesk/SellerInquiriesListView.vue");
const SellerInquiryDetailView = () => import("@/views/helpdesk/SellerInquiryDetailView.vue");
const SellerQuestionsView = () => import("@/views/seller/SellerQuestionsView.vue");
const ListingReviewModerationView = () => import("@/views/seller/ListingReviewModerationView.vue");

// Dashboard — role-based routing
function resolveDashboardComponent() {
  // Lazy resolver: select component based on role at navigation time
  return async () => {
    const { useAuthStore } = await import("@/stores/auth");
    const auth = useAuthStore();
    if (auth.isAdmin) return (await import("@/views/dashboard/PlatformOverview.vue")).default;
    if (auth.isSeller) return (await import("@/views/dashboard/SellerOverview.vue")).default;
    return (await import("@/views/dashboard/PlatformOverview.vue")).default;
  };
}

const routes = [
  {
    path: "/login",
    name: "Login",
    component: LoginView,
    meta: { guest: true },
  },
  {
    // FAZ 1.5 — Sub-user davet kabul sayfası (guest erişim, token bazlı)
    path: "/accept-invite",
    name: "AcceptInvite",
    component: () => import("@/views/auth/AcceptInviteView.vue"),
    meta: { guest: true },
  },
  {
    path: "/",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: "", redirect: "/dashboard" },
      {
        path: "dashboard",
        name: "Dashboard",
        component: resolveDashboardComponent(),
        meta: { title: "Dashboard", breadcrumb: "Dashboard", section: "dashboard" },
      },
      {
        // Abonelik kapısı (paywall) — kilitli satıcı buraya yönlendirilir;
        // ayrıca aktif satıcı paketini yükseltmek için de kullanabilir.
        path: "abonelik",
        name: "SubscriptionGate",
        component: () => import("@/views/billing/SubscriptionGateView.vue"),
        meta: { title: "Abonelik", breadcrumb: "Abonelik", section: "store" },
      },
      {
        // Admin: havale/EFT abonelik ödemelerini onayla/reddet.
        path: "abonelik-odemeleri",
        name: "SubscriptionPayments",
        component: () => import("@/views/billing/SubscriptionPaymentsView.vue"),
        meta: {
          title: "Abonelik Ödemeleri",
          breadcrumb: "Abonelik Ödemeleri",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "seller-orders",
        name: "SellerOrders",
        component: SellerOrdersView,
        meta: { title: "Siparişlerim", breadcrumb: "Siparişlerim", section: "orders" },
      },
      {
        path: "seller-questions",
        name: "SellerQuestions",
        component: SellerQuestionsView,
        meta: { title: "Sorularım", breadcrumb: "Sorularım", section: "store" },
      },
      {
        path: "review-moderation",
        name: "ListingReviewModeration",
        component: ListingReviewModerationView,
        meta: { title: "Yorum Moderasyonu", breadcrumb: "Yorum Moderasyonu", section: "store" },
      },
      {
        path: "listing-moderation",
        name: "ListingModeration",
        component: ListingModerationView,
        meta: { title: "Ürün Moderasyonu", breadcrumb: "Ürün Moderasyonu", section: "catalog" },
      },
      {
        path: "seller-listings",
        name: "SellerListings",
        component: SellerListingsView,
        meta: { title: "Ürünlerim", breadcrumb: "Ürünlerim", section: "products" },
      },
      {
        path: "category-moderation",
        name: "CategoryModeration",
        component: CategoryModerationView,
        meta: {
          title: "Kategori Moderasyonu",
          breadcrumb: "Kategori Moderasyonu",
          section: "catalog",
        },
      },
      {
        path: "category-management",
        name: "CategoryManagement",
        component: CategoryManagementView,
        meta: { title: "Kategori Yönetimi", breadcrumb: "Kategori Yönetimi", section: "catalog" },
      },
      {
        path: "category-translations",
        name: "CategoryTranslations",
        component: CategoryTranslationsView,
        meta: {
          title: "Kategori Çevirileri",
          breadcrumb: "Kategori Çevirileri",
          section: "catalog",
        },
      },
      // SEO route'ları — sıra önemli: spesifik path'ler önce, generic catch-all en sonda.
      // Tümü süper-admin (System Manager / Marketplace Admin) için.
      {
        path: "seo",
        name: "SeoPages",
        component: () => import("@/views/seo/SeoPagesView.vue"),
        meta: {
          title: "SEO Yönetimi",
          breadcrumb: "Tüm Sayfalar",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "seo/redirects",
        name: "SeoRedirects",
        component: () => import("@/views/seo/SeoRedirectListView.vue"),
        meta: {
          title: "URL Yönlendirmeleri",
          breadcrumb: "URL Yönlendirmeleri",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "seo/404s",
        name: "Seo404Report",
        component: () => import("@/views/seo/Seo404ReportView.vue"),
        meta: {
          title: "404 Logları",
          breadcrumb: "404 Logları",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        // Bu rota /seo/:doctypeKey/:name'den önce gelmeli — `static` "doctypeKey"
        // olarak yanlış parse edilmesin
        path: "seo/static/:path(.*)",
        name: "SeoStaticPageEdit",
        component: () => import("@/views/seo/SeoStaticPageEditView.vue"),
        meta: {
          title: "Statik Sayfa SEO",
          breadcrumb: "Statik Sayfa SEO",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "seo/:doctypeKey/:name",
        name: "SeoEdit",
        component: () => import("@/views/seo/SeoEditView.vue"),
        meta: {
          title: "SEO Ayarları",
          breadcrumb: "SEO Ayarları",
          section: "catalog",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "seller-categories",
        name: "SellerCategories",
        component: SellerCategoriesView,
        meta: { title: "Kategorilerim", breadcrumb: "Kategorilerim", section: "products" },
      },
      // RFQ yönetimi
      {
        path: "rfq-list",
        name: "RfqList",
        component: RfqList,
        meta: { title: "RFQ Talepleri", breadcrumb: "RFQ Talepleri", section: "commerce" },
      },
      {
        path: "my-quotes",
        name: "MyQuotesList",
        component: MyQuotesList,
        meta: { title: "Tekliflerim", breadcrumb: "Tekliflerim", section: "commerce" },
      },
      {
        path: "app/rfq/:name",
        name: "RfqDetail",
        component: RfqDetail,
        meta: { title: "RFQ Detay", breadcrumb: "RFQ Detay", section: "commerce" },
      },
      {
        path: "storefront-layout",
        name: "StorefrontLayout",
        component: StorefrontLayoutEditor,
        meta: { title: "Sayfa Düzeni", breadcrumb: "Sayfa Düzeni", section: "products" },
      },
      {
        path: "my-certifications",
        name: "MyCertifications",
        component: MyCertificationsView,
        meta: { title: "Sertifikalarım", breadcrumb: "Sertifikalarım", section: "store" },
      },
      {
        path: "admin/cert-verification",
        name: "AdminCertVerification",
        component: CertVerificationView,
        meta: {
          title: "Sertifika Doğrulama",
          breadcrumb: "Sertifika Doğrulama",
          section: "admin",
          requiresAdmin: true,
        },
      },
      {
        // Eski sayfa — link'ler kırılmasın diye yeni sayfanın Önerdiklerim tab'ına yönlendir.
        path: "suggest-certification",
        redirect: { name: "MyCertifications", hash: "#suggestions" },
      },
      {
        path: "theme-manager",
        name: "ThemeManager",
        component: ThemeManagerView,
        meta: {
          title: "Site Teması",
          breadcrumb: "Site Teması",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "hero-slider",
        name: "HeroSlider",
        component: () => import("@/views/system/HeroSliderView.vue"),
        meta: {
          title: "Hero Slider",
          breadcrumb: "Hero Slider",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "dashboard-manager",
        name: "DashboardManager",
        component: DashboardManagerView,
        meta: {
          title: "Dashboard Yönetimi",
          breadcrumb: "Dashboard Yönetimi",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "header-notices",
        name: "HeaderNotices",
        component: HeaderNoticesView,
        meta: {
          title: "Header Duyuruları",
          breadcrumb: "Header Duyuruları",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "category-showcase",
        name: "CategoryShowcase",
        component: () => import("@/views/system/CategoryShowcaseView.vue"),
        meta: {
          title: "Kategori Vitrini",
          breadcrumb: "Kategori Vitrini",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "recommendations-settings",
        name: "RecommendationsSettings",
        component: RecommendationsSettingsView,
        meta: {
          title: "Öneri Motoru",
          breadcrumb: "Öneri Motoru",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // FAZ 1.6 — Süper Admin yetki yönetim konsolu (4 sekme).
      {
        path: "permission-console",
        name: "PermissionConsole",
        component: PermissionConsoleView,
        meta: {
          title: "Yetki Yönetimi",
          breadcrumb: "Yetki Yönetimi",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "social-proof-settings",
        name: "SocialProofSettings",
        component: SocialProofSettingsView,
        meta: {
          title: "Sosyal Kanıt Ayarları",
          breadcrumb: "Sosyal Kanıt Ayarları",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "tracking-settings",
        name: "TrackingSettings",
        component: TrackingSettingsView,
        meta: {
          title: "Tracking Ayarları",
          breadcrumb: "Tracking Ayarları",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // FAZ 1.6 — Satıcının kendi ekip yönetimi (davet, rol, pasifleştir).
      {
        path: "seller-team",
        name: "SellerTeam",
        component: SubUserManagementView,
        meta: {
          title: "Ekibim",
          breadcrumb: "Ekibim",
          section: "store",
        },
      },
      // FAZ 2.4 — B2B alıcı ekip yönetimi (Süper Admin için).
      {
        path: "buyer-team",
        name: "BuyerTeam",
        component: BuyerTeamManagementView,
        meta: {
          title: "B2B Alıcı Ekibi",
          breadcrumb: "B2B Alıcı Ekibi",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // FAZ 2.5 — B2B onay kuyruğu (B2B Approver L1/L2 + admin)
      {
        path: "approval-queue",
        name: "ApprovalQueue",
        component: ApprovalQueueView,
        meta: {
          title: "Onay Kuyruğum",
          breadcrumb: "Onay Kuyruğum",
          section: "commerce",
        },
      },
      // FAZ 3.1 — Yetki simülatörü (debug aracı)
      {
        path: "authorization-simulator",
        name: "AuthorizationSimulator",
        component: AuthorizationSimulatorView,
        meta: {
          title: "Yetki Simülatörü",
          breadcrumb: "Yetki Simülatörü",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // FAZ 3.2 — PII Mask Matrix (Compliance Officer + System Manager)
      {
        path: "compliance/pii-mask-matrix",
        name: "ComplianceMaskMatrix",
        component: ComplianceMaskMatrixView,
        meta: {
          title: "Uyum Maskeleme Matrisi",
          breadcrumb: "PII Mask Matrix",
          section: "system",
        },
      },
      // FAZ 3.3 — Cost center tree + approved suppliers
      {
        path: "procurement/cost-centers",
        name: "CostCenterTree",
        component: CostCenterTreeView,
        meta: {
          title: "Cost Center Yönetimi",
          breadcrumb: "Cost Center",
          section: "commerce",
        },
      },
      {
        path: "procurement/approved-suppliers",
        name: "ApprovedSuppliers",
        component: ApprovedSuppliersView,
        meta: {
          title: "Onaylı Tedarikçiler",
          breadcrumb: "Onaylı Tedarikçiler",
          section: "commerce",
        },
      },
      // FAZ 3.4 — Anomaly dashboard
      {
        path: "compliance/anomaly-dashboard",
        name: "AnomalyDashboard",
        component: AnomalyDashboardView,
        meta: {
          title: "Anomali Dashboard",
          breadcrumb: "Anomali Dashboard",
          section: "system",
        },
      },
      // FAZ 3.5 — Delegation + Owner Transfer
      {
        path: "delegation",
        name: "DelegationManager",
        component: DelegationManagerView,
        meta: {
          title: "Yetki Devri",
          breadcrumb: "Yetki Devri",
          section: "store",
        },
      },
      {
        path: "owner-transfer",
        name: "OwnerTransfer",
        component: OwnerTransferView,
        meta: {
          title: "Mağaza Sahibi Devri",
          breadcrumb: "Owner Transfer",
          section: "store",
          requiresSuperAdmin: true,
        },
      },
      // Bildirimler
      {
        path: "messaging/notifications",
        name: "Notifications",
        component: NotificationsView,
        meta: { title: "Bildirimler", breadcrumb: "Bildirimler", section: "messaging" },
      },
      // Buyer ↔ Seller mesajlaşma (TeamsLike proxy)
      {
        path: "messaging/buyer-messages",
        name: "BuyerMessages",
        component: BuyerMessagesView,
        meta: { title: "Mesajlarım", breadcrumb: "Mesajlarım", section: "messaging" },
      },
      // Müsaitlik + Rezervasyonlar (Plus tier için)
      {
        path: "messaging/availability",
        name: "Availability",
        component: AvailabilityView,
        meta: { title: "Müsaitlik & Rezervasyon", breadcrumb: "Müsaitlik", section: "messaging" },
      },
      // CRM (headless — kendi UI'i kapali, bu view'lar API ile konusur)
      {
        path: "crm",
        name: "CrmDashboard",
        component: CrmDashboardView,
        meta: { title: "CRM Özet", breadcrumb: "CRM", section: "crm" },
      },
      {
        path: "crm/leads",
        name: "CrmLeads",
        component: CrmLeadsListView,
        meta: { title: "CRM Talepleri", breadcrumb: "Talepler", section: "crm" },
      },
      {
        path: "crm/leads/:name",
        name: "CrmLeadDetail",
        component: CrmLeadDetailView,
        meta: { title: "Talep Detayı", breadcrumb: "Talep", section: "crm" },
      },
      {
        path: "crm/deals",
        name: "CrmDeals",
        component: CrmDealsListView,
        meta: { title: "Anlaşmalar", breadcrumb: "Anlaşmalar", section: "crm" },
      },
      {
        path: "crm/deals/:name",
        name: "CrmDealDetail",
        component: CrmDealDetailView,
        meta: { title: "Anlaşma Detayı", breadcrumb: "Anlaşma", section: "crm" },
      },
      {
        path: "hakedislerim",
        name: "MyCommissions",
        component: MyCommissionsView,
        meta: { title: "Hakedişlerim", breadcrumb: "Hakedişlerim", section: "crm" },
      },
      {
        path: "hakedis-ekip",
        name: "CommissionTeam",
        component: CommissionTeamView,
        meta: {
          title: "Ekip Hakedişleri",
          breadcrumb: "Ekip Hakedişleri",
          section: "crm",
        },
      },
      {
        path: "hakedis-yonetimi",
        name: "CommissionAdmin",
        component: CommissionAdminView,
        meta: {
          title: "Hakediş Yönetimi",
          breadcrumb: "Hakediş Yönetimi",
          section: "crm",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "hakedis-ayarlari",
        name: "CommissionSettings",
        component: CommissionSettingsView,
        meta: {
          title: "Hakediş Ayarları",
          breadcrumb: "Hakediş Ayarları",
          section: "crm",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "crm/tasks",
        name: "CrmTasks",
        component: CrmTasksListView,
        meta: { title: "CRM Görevleri", breadcrumb: "Görevler", section: "crm" },
      },
      {
        path: "crm/notes",
        name: "CrmNotes",
        component: CrmNotesListView,
        meta: { title: "CRM Notları", breadcrumb: "Notlar", section: "crm" },
      },
      {
        path: "crm/contacts",
        name: "CrmContacts",
        component: CrmContactsListView,
        meta: { title: "Kişiler", breadcrumb: "Kişiler", section: "crm" },
      },
      {
        path: "crm/contacts/:name",
        name: "CrmContactDetail",
        component: CrmContactDetailView,
        meta: { title: "Kişi Detayı", breadcrumb: "Kişi", section: "crm" },
      },
      {
        path: "crm/organizations",
        name: "CrmOrganizations",
        component: CrmOrganizationsListView,
        meta: { title: "Kurumlar", breadcrumb: "Kurumlar", section: "crm" },
      },
      {
        path: "crm/organizations/:name",
        name: "CrmOrganizationDetail",
        component: CrmOrganizationDetailView,
        meta: { title: "Kurum Detayı", breadcrumb: "Kurum", section: "crm" },
      },
      {
        path: "crm/settings",
        component: CrmSettingsShell,
        meta: {
          title: "CRM Ayarları",
          breadcrumb: "Ayarlar",
          section: "crm",
          requiresSuperAdmin: true,
        },
        children: [
          { path: "", redirect: "/crm/settings/general" },
          { path: "general", name: "CrmSettingsGeneral", component: CrmGeneralSettings },
          {
            path: "lead-statuses",
            name: "CrmSettingsLeadStatus",
            component: CrmTaxonomySettings,
            props: { preset: "lead-status" },
          },
          {
            path: "deal-statuses",
            name: "CrmSettingsDealStatus",
            component: CrmTaxonomySettings,
            props: { preset: "deal-status" },
          },
          {
            path: "lead-sources",
            name: "CrmSettingsLeadSource",
            component: CrmTaxonomySettings,
            props: { preset: "lead-source" },
          },
          {
            path: "industries",
            name: "CrmSettingsIndustry",
            component: CrmTaxonomySettings,
            props: { preset: "industry" },
          },
          {
            path: "territories",
            name: "CrmSettingsTerritory",
            component: CrmTaxonomySettings,
            props: { preset: "territory" },
          },
          {
            path: "lost-reasons",
            name: "CrmSettingsLostReason",
            component: CrmTaxonomySettings,
            props: { preset: "lost-reason" },
          },
          {
            path: "communication",
            name: "CrmSettingsComm",
            component: CrmTaxonomySettings,
            props: { preset: "communication" },
          },
          { path: "sla", name: "CrmSettingsSla", component: CrmSlaSettings },
          {
            path: "assignment-rules",
            name: "CrmSettingsAssign",
            component: CrmAssignmentRulesSettings,
          },
          {
            path: "integrations",
            name: "CrmSettingsIntegrations",
            component: CrmIntegrationsSettings,
          },
          { path: "email-accounts", name: "CrmSettingsEmail", component: CrmEmailAccountsSettings },
        ],
      },
      // Helpdesk (headless)
      {
        path: "helpdesk/tickets",
        name: "HelpdeskTickets",
        component: HelpdeskTicketsListView,
        meta: { title: "Destek Talepleri", breadcrumb: "Talepler", section: "helpdesk" },
      },
      {
        path: "helpdesk/tickets/:name",
        name: "HelpdeskTicketDetail",
        component: HelpdeskTicketDetailView,
        meta: { title: "Talep Detayı", breadcrumb: "Talep", section: "helpdesk" },
      },
      {
        path: "helpdesk/types",
        name: "HelpdeskTicketTypes",
        component: HelpdeskTicketTypesView,
        meta: { title: "Talep Tipleri", breadcrumb: "Tipler", section: "helpdesk" },
      },
      {
        path: "helpdesk/agents",
        name: "HelpdeskAgents",
        component: HelpdeskAgentsView,
        meta: { title: "Destek Ajanları", breadcrumb: "Ajanlar", section: "helpdesk" },
      },
      {
        path: "helpdesk/teams",
        name: "HelpdeskTeams",
        component: HelpdeskTeamsView,
        meta: { title: "Destek Ekipleri", breadcrumb: "Ekipler", section: "helpdesk" },
      },
      {
        path: "helpdesk/canned-responses",
        name: "HelpdeskCannedResponses",
        component: HelpdeskCannedResponsesView,
        meta: { title: "Hazır Yanıtlar", breadcrumb: "Şablonlar", section: "helpdesk" },
      },
      {
        path: "helpdesk/inquiries",
        name: "SellerInquiriesList",
        component: SellerInquiriesListView,
        meta: { title: "Mağaza Soruları", breadcrumb: "Sorular", section: "helpdesk" },
      },
      {
        path: "helpdesk/inquiries/:name",
        name: "SellerInquiryDetail",
        component: SellerInquiryDetailView,
        meta: { title: "Soru Detayı", breadcrumb: "Soru", section: "helpdesk" },
      },
      // Listing için özel form (tab'lı, child table editörlü)
      {
        path: "app/Listing/:name",
        name: "ListingForm",
        component: ListingFormView,
        meta: { title: "Ürün", breadcrumb: "Ürün", section: "products" },
      },
      // ── Bulk Import (toplu ürün yükleme) ─────────────────────────────
      // NOT: View'lar kebab-case route name kullanıyor — router da aynı
      // konvansiyonu izler. Aksi halde router.push() name-not-found ile fail.
      {
        path: "bulk-import",
        name: "bulk-import-history",
        component: BulkImportHistoryView,
        meta: { title: "Toplu Yükleme Geçmişi", breadcrumb: "Toplu Yükleme", section: "products" },
      },
      {
        path: "bulk-import/new",
        name: "bulk-import-new",
        component: BulkProductImportView,
        meta: { title: "Yeni Toplu Yükleme", breadcrumb: "Yeni Yükleme", section: "products" },
      },
      {
        path: "bulk-import/xml-mapping/:file_id",
        name: "bulk-import-xml-mapping",
        component: XmlMappingView,
        meta: { title: "XML Alan Eşleştirme", breadcrumb: "XML Mapping", section: "products" },
      },
      {
        path: "bulk-import/:name",
        name: "bulk-import-detail",
        component: BulkImportDetailView,
        meta: { title: "Yükleme Detayı", breadcrumb: "Detay", section: "products" },
      },
      // ── XML Feed (otomatik ürün çekme) ────────────────────────────────
      {
        path: "seller-feed",
        name: "seller-feed",
        component: SellerFeedView,
        meta: { title: "XML Feed", breadcrumb: "XML Feed", section: "products" },
      },
      {
        path: "admin-feeds",
        name: "admin-feeds",
        component: AdminFeedsView,
        meta: {
          title: "Satıcı Feed'leri",
          breadcrumb: "Feed'ler",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // ── ECA Kurallar ──────────────────────────────────────────────────
      {
        path: "my-eca-rules",
        name: "MyEcaRules",
        component: MyEcaRulesView,
        meta: { title: "Kurallarım", breadcrumb: "Kurallarım", section: "products" },
      },
      {
        path: "my-eca-rules/:name",
        name: "MyEcaRuleForm",
        component: EcaRuleFormView,
        meta: { title: "Kural Düzenle", breadcrumb: "Kural", section: "products" },
      },
      {
        path: "eca-rules",
        name: "EcaRules",
        component: EcaRulesView,
        meta: {
          title: "ECA Kural Yönetimi",
          breadcrumb: "ECA Kurallar",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "eca-rules/:name",
        name: "EcaRuleForm",
        component: EcaRuleFormView,
        meta: {
          title: "ECA Kural Düzenle",
          breadcrumb: "ECA Kural",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      {
        path: "eca-rule-log",
        name: "EcaRuleLog",
        component: EcaRuleLogView,
        meta: {
          title: "ECA Kural Log",
          breadcrumb: "Kural Log",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // ── Regex Pattern Kütüphanesi ─────────────────────────────────────
      {
        path: "my-regex-patterns",
        name: "MyRegexPatterns",
        component: MyRegexPatternsView,
        meta: { title: "Eşleştirmelerim", breadcrumb: "Eşleştirmelerim", section: "products" },
      },
      {
        path: "regex-patterns",
        name: "RegexPatterns",
        component: RegexPatternsView,
        meta: {
          title: "Regex Pattern Yönetimi",
          breadcrumb: "Pattern'ler",
          section: "system",
          requiresSuperAdmin: true,
        },
      },
      // Generic DocType list/form — works for any existing DocType
      {
        path: "app/:doctype",
        name: "DocTypeList",
        component: DocTypeListView,
        meta: { title: "Liste", breadcrumb: "Liste", section: "management" },
      },
      {
        path: "app/:doctype/:name",
        name: "DocTypeForm",
        component: () => import("@/views/doctype/DocTypeFormView.vue"),
        meta: { title: "Detay", breadcrumb: "Detay", section: "management" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/login",
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated && !to.meta.guest) {
    try {
      await auth.fetchUser();
    } catch {
      // User not authenticated — routing guard aşağıda ele alır
    }
  }
  if (!to.meta.guest && !auth.isAuthenticated) {
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }
  if (to.meta.guest && auth.isAuthenticated) {
    if (!auth.isAdmin && !auth.isSeller && !auth.isFieldAgent) {
      await auth.logout();
      auth.error = "Bu panel yalnızca satıcı ve yöneticilere açıktır.";
      return next("/login");
    }
    return next("/dashboard");
  }
  // Admins and sellers can access the panel
  if (
    !to.meta.guest &&
    auth.isAuthenticated &&
    !auth.isAdmin &&
    !auth.isSeller &&
    !auth.isFieldAgent
  ) {
    await auth.logout();
    auth.error = "Bu panel yalnızca satıcı ve yöneticilere açıktır.";
    return next("/login");
  }
  // Super-admin gerektiren sayfalar (ör. Site Teması) — satıcı giremez
  if (to.meta.requiresSuperAdmin && !auth.isAdmin) {
    return next("/dashboard");
  }

  // Abonelik kapısı (paywall) — satıcı (admin değil) aboneliği yoksa/expired ise
  // panele giremez; /abonelik (paket-seçme) sayfasına yönlendirilir. Platform
  // admin ve mağazası olmayan kullanıcılar (backend "no_store" döndürür) muaf.
  if (!to.meta.guest && auth.isAuthenticated && auth.isSeller && !auth.isAdmin) {
    const sub = useSubscriptionStore();
    try {
      await sub.ensureChecked();
    } catch {
      // Kapı kararı alınamazsa kilitleme — asıl enforcement backend'de (Faz 4).
    }
    if (sub.isLocked && to.path !== "/abonelik") {
      return next("/abonelik");
    }
  }

  // Sprint 6 — DB-driven module gating.
  // Sub-user URL'i elle yazıp gating'i bypass edemesin: navigation tree'de
  // doctype/route'a karşılık gelen modülün mode'una bak; "hidden" ise dashboard'a
  // yönlendir. Platform admin (isAdmin) zaten bu kontrolden muaftır.
  if (!to.meta.guest && auth.isAuthenticated && !auth.isAdmin) {
    const nav = useNavigationStore();
    if (!nav.dbLoaded) {
      try {
        await nav.loadDbSections();
      } catch {
        // Fail-safe: backend ulaşılamıyorsa kapı açık kalmasın, ama hard-block
        // da yapma — kullanıcı 401 görmez, sidebar boş kalır
      }
    }
    if (nav.dbLoaded) {
      // 1) Hidden modüller backend tarafından tree'den düşürüldü.
      //    Tree'de olmayan ama hidden_doctypes/hidden_routes listesinde olan
      //    URL'lere doğrudan erişim engellenir.
      if (to.params?.doctype && nav.isDoctypeHidden(to.params.doctype)) {
        return next("/dashboard");
      }
      if (to.path && nav.isRouteHidden(to.path)) {
        return next("/dashboard");
      }
      // 2) Tree'de olup açıkça mode=hidden olarak işaretlenmiş modül
      //    (defansif — normalde backend zaten filtreler).
      let resolvedModule = null;
      if (to.meta.module) {
        resolvedModule = { key: to.meta.module, mode: nav.getModuleMode(to.meta.module) };
      } else if (to.params?.doctype) {
        resolvedModule = nav.findModuleByDoctype(to.params.doctype);
      } else if (to.path) {
        resolvedModule = nav.findModuleByRoute(to.path);
      }
      if (resolvedModule && resolvedModule.mode === "hidden") {
        return next("/dashboard");
      }
      // 3) Sub-user (Owner ve Admin değil) için DocType list/form route'ları
      //    sadece navigation tree'sinde bulunan doctype'lar üzerinden açık.
      //    Tree dışı bir doctype (örn. Admin Seller Profile, KYB Verification)
      //    sub-user'a kapalı — backend response'da hidden_doctypes listesi
      //    boş gelse bile bu whitelist fail-closed davranır.
      if (
        to.params?.doctype &&
        auth.isSeller &&
        !auth.isSellerOwner &&
        !nav.isDoctypeAccessibleForSubUser(to.params.doctype)
      ) {
        return next("/dashboard");
      }
    }
  }

  next();
});

export default router;
