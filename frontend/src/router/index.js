import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// Layout
import AppLayout from "@/layouts/AppLayout.vue";

// Views (lazy-loaded)
const LoginView = () => import("@/views/auth/LoginView.vue");
const DocTypeListView = () => import("@/views/doctype/DocTypeListView.vue");
const SellerOrdersView = () => import("@/views/seller/SellerOrdersView.vue");
const ListingModerationView = () => import("@/views/products/ListingModerationView.vue");
const CategoryModerationView = () => import("@/views/products/CategoryModerationView.vue");
const CategoryManagementView = () => import("@/views/products/CategoryManagementView.vue");
const SellerListingsView = () => import("@/views/seller/SellerListingsView.vue");
const SellerCategoriesView = () => import("@/views/seller/SellerCategoriesView.vue");
const ListingFormView = () => import("@/views/seller/ListingFormView.vue");
const RfqList = () => import("@/views/sales/RfqList.vue");
const RfqDetail = () => import("@/views/sales/RfqDetail.vue");
const MyQuotesList = () => import("@/views/sales/MyQuotesList.vue");
const StorefrontLayoutEditor = () => import("@/views/seller/StorefrontLayoutEditor.vue");
const SuggestCertificationView = () => import("@/views/seller/SuggestCertificationView.vue");
const ThemeManagerView = () => import("@/views/system/ThemeManagerView.vue");
const DashboardManagerView = () => import("@/views/system/DashboardManagerView.vue");
const RecommendationsSettingsView = () => import("@/views/system/RecommendationsSettingsView.vue");
const NotificationsView = () => import("@/views/messaging/NotificationsView.vue");
const CrmLeadsListView = () => import("@/views/crm/LeadsListView.vue");
const CrmLeadDetailView = () => import("@/views/crm/LeadDetailView.vue");
const CrmDashboardView = () => import("@/views/crm/CrmDashboardView.vue");
const CrmDealsListView = () => import("@/views/crm/DealsListView.vue");
const CrmDealDetailView = () => import("@/views/crm/DealDetailView.vue");
const CrmTasksListView = () => import("@/views/crm/TasksListView.vue");
const CrmNotesListView = () => import("@/views/crm/NotesListView.vue");
const CrmCallsListView = () => import("@/views/crm/CallsListView.vue");
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
        path: "seller-orders",
        name: "SellerOrders",
        component: SellerOrdersView,
        meta: { title: "Siparişlerim", breadcrumb: "Siparişlerim", section: "orders" },
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
        path: "suggest-certification",
        name: "SuggestCertification",
        component: SuggestCertificationView,
        meta: { title: "Sertifika Öner", breadcrumb: "Sertifika Öner", section: "store" },
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
      // Bildirimler
      {
        path: "messaging/notifications",
        name: "Notifications",
        component: NotificationsView,
        meta: { title: "Bildirimler", breadcrumb: "Bildirimler", section: "messaging" },
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
        path: "crm/calls",
        name: "CrmCalls",
        component: CrmCallsListView,
        meta: { title: "Arama Kayıtları", breadcrumb: "Aramalar", section: "crm" },
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
      // Listing için özel form (tab'lı, child table editörlü)
      {
        path: "app/Listing/:name",
        name: "ListingForm",
        component: ListingFormView,
        meta: { title: "Ürün", breadcrumb: "Ürün", section: "products" },
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

// Storefront URL for redirect
const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5500/";

router.beforeEach(async (to, from, next) => {
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
    if (!auth.isAdmin && !auth.isSeller) {
      await auth.logout();
      auth.error = "Bu panel yalnızca satıcı ve yöneticilere açıktır.";
      return next("/login");
    }
    return next("/dashboard");
  }
  // Admins and sellers can access the panel
  if (!to.meta.guest && auth.isAuthenticated && !auth.isAdmin && !auth.isSeller) {
    await auth.logout();
    auth.error = "Bu panel yalnızca satıcı ve yöneticilere açıktır.";
    return next("/login");
  }
  // Super-admin gerektiren sayfalar (ör. Site Teması) — satıcı giremez
  if (to.meta.requiresSuperAdmin && !auth.isAdmin) {
    return next("/dashboard");
  }
  next();
});

export default router;
