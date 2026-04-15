import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Layout
import AppLayout from '@/layouts/AppLayout.vue'

// Views (lazy-loaded)
const LoginView = () => import('@/views/auth/LoginView.vue')
const DocTypeListView = () => import('@/views/doctype/DocTypeListView.vue')
const SellerOrdersView = () => import('@/views/seller/SellerOrdersView.vue')
const ListingModerationView = () => import('@/views/products/ListingModerationView.vue')
const CategoryModerationView = () => import('@/views/products/CategoryModerationView.vue')
const CategoryManagementView = () => import('@/views/products/CategoryManagementView.vue')
const SellerListingsView = () => import('@/views/seller/SellerListingsView.vue')
const SellerCategoriesView = () => import('@/views/seller/SellerCategoriesView.vue')
const ListingFormView = () => import('@/views/seller/ListingFormView.vue')
const RfqList = () => import('@/views/sales/RfqList.vue')
const RfqDetail = () => import('@/views/sales/RfqDetail.vue')
const MyQuotesList = () => import('@/views/sales/MyQuotesList.vue')
const StorefrontLayoutEditor = () => import('@/views/seller/StorefrontLayoutEditor.vue')
const SuggestCertificationView = () => import('@/views/seller/SuggestCertificationView.vue')
const ThemeManagerView = () => import('@/views/system/ThemeManagerView.vue')
const DashboardManagerView = () => import('@/views/system/DashboardManagerView.vue')
const NotificationsView = () => import('@/views/messaging/NotificationsView.vue')
const CrmLeadsListView = () => import('@/views/crm/LeadsListView.vue')
const CrmLeadDetailView = () => import('@/views/crm/LeadDetailView.vue')
const HelpdeskTicketsListView = () => import('@/views/helpdesk/TicketsListView.vue')
const HelpdeskTicketDetailView = () => import('@/views/helpdesk/TicketDetailView.vue')

// Dashboard — role-based routing
function resolveDashboardComponent() {
  // Lazy resolver: select component based on role at navigation time
  return async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    if (auth.isAdmin) return (await import('@/views/dashboard/PlatformOverview.vue')).default
    if (auth.isSeller) return (await import('@/views/dashboard/SellerOverview.vue')).default
    return (await import('@/views/dashboard/PlatformOverview.vue')).default
  }
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: resolveDashboardComponent(),
        meta: { title: 'Dashboard', breadcrumb: 'Dashboard', section: 'dashboard' },
      },
      {
        path: 'seller-orders',
        name: 'SellerOrders',
        component: SellerOrdersView,
        meta: { title: 'Siparişlerim', breadcrumb: 'Siparişlerim', section: 'orders' },
      },
      {
        path: 'listing-moderation',
        name: 'ListingModeration',
        component: ListingModerationView,
        meta: { title: 'Ürün Moderasyonu', breadcrumb: 'Ürün Moderasyonu', section: 'catalog' },
      },
      {
        path: 'seller-listings',
        name: 'SellerListings',
        component: SellerListingsView,
        meta: { title: 'Ürünlerim', breadcrumb: 'Ürünlerim', section: 'products' },
      },
      {
        path: 'category-moderation',
        name: 'CategoryModeration',
        component: CategoryModerationView,
        meta: { title: 'Kategori Moderasyonu', breadcrumb: 'Kategori Moderasyonu', section: 'catalog' },
      },
      {
        path: 'category-management',
        name: 'CategoryManagement',
        component: CategoryManagementView,
        meta: { title: 'Kategori Yönetimi', breadcrumb: 'Kategori Yönetimi', section: 'catalog' },
      },
      {
        path: 'seller-categories',
        name: 'SellerCategories',
        component: SellerCategoriesView,
        meta: { title: 'Kategorilerim', breadcrumb: 'Kategorilerim', section: 'products' },
      },
      // RFQ yönetimi
      {
        path: 'rfq-list',
        name: 'RfqList',
        component: RfqList,
        meta: { title: 'RFQ Talepleri', breadcrumb: 'RFQ Talepleri', section: 'commerce' },
      },
      {
        path: 'my-quotes',
        name: 'MyQuotesList',
        component: MyQuotesList,
        meta: { title: 'Tekliflerim', breadcrumb: 'Tekliflerim', section: 'commerce' },
      },
      {
        path: 'app/rfq/:name',
        name: 'RfqDetail',
        component: RfqDetail,
        meta: { title: 'RFQ Detay', breadcrumb: 'RFQ Detay', section: 'commerce' },
      },
      {
        path: 'storefront-layout',
        name: 'StorefrontLayout',
        component: StorefrontLayoutEditor,
        meta: { title: 'Sayfa Düzeni', breadcrumb: 'Sayfa Düzeni', section: 'products' },
      },
      {
        path: 'suggest-certification',
        name: 'SuggestCertification',
        component: SuggestCertificationView,
        meta: { title: 'Sertifika Öner', breadcrumb: 'Sertifika Öner', section: 'store' },
      },
      {
        path: 'theme-manager',
        name: 'ThemeManager',
        component: ThemeManagerView,
        meta: {
          title: 'Site Teması',
          breadcrumb: 'Site Teması',
          section: 'system',
          requiresSuperAdmin: true,
        },
      },
      {
        path: 'dashboard-manager',
        name: 'DashboardManager',
        component: DashboardManagerView,
        meta: {
          title: 'Dashboard Yönetimi',
          breadcrumb: 'Dashboard Yönetimi',
          section: 'system',
          requiresSuperAdmin: true,
        },
      },
      // Bildirimler
      {
        path: 'messaging/notifications',
        name: 'Notifications',
        component: NotificationsView,
        meta: { title: 'Bildirimler', breadcrumb: 'Bildirimler', section: 'messaging' },
      },
      // CRM (headless — kendi UI'i kapali, bu view'lar API ile konusur)
      {
        path: 'crm/leads',
        name: 'CrmLeads',
        component: CrmLeadsListView,
        meta: { title: 'CRM Talepleri', breadcrumb: 'Talepler', section: 'crm' },
      },
      {
        path: 'crm/leads/:name',
        name: 'CrmLeadDetail',
        component: CrmLeadDetailView,
        meta: { title: 'Talep Detayı', breadcrumb: 'Talep', section: 'crm' },
      },
      // Helpdesk (headless)
      {
        path: 'helpdesk/tickets',
        name: 'HelpdeskTickets',
        component: HelpdeskTicketsListView,
        meta: { title: 'Destek Talepleri', breadcrumb: 'Talepler', section: 'helpdesk' },
      },
      {
        path: 'helpdesk/tickets/:name',
        name: 'HelpdeskTicketDetail',
        component: HelpdeskTicketDetailView,
        meta: { title: 'Talep Detayı', breadcrumb: 'Talep', section: 'helpdesk' },
      },
      // Listing için özel form (tab'lı, child table editörlü)
      {
        path: 'app/Listing/:name',
        name: 'ListingForm',
        component: ListingFormView,
        meta: { title: 'Ürün', breadcrumb: 'Ürün', section: 'products' },
      },
      // Generic DocType list/form — works for any existing DocType
      {
        path: 'app/:doctype',
        name: 'DocTypeList',
        component: DocTypeListView,
        meta: { title: 'Liste', breadcrumb: 'Liste', section: 'management' },
      },
      {
        path: 'app/:doctype/:name',
        name: 'DocTypeForm',
        component: () => import('@/views/doctype/DocTypeFormView.vue'),
        meta: { title: 'Detay', breadcrumb: 'Detay', section: 'management' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Storefront URL for redirect
const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5500/'

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated && !to.meta.guest) {
    try { await auth.fetchUser() } catch { }
  }
  if (!to.meta.guest && !auth.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guest && auth.isAuthenticated) {
    if (!auth.isAdmin && !auth.isSeller) {
      await auth.logout()
      auth.error = 'Bu panel yalnızca satıcı ve yöneticilere açıktır.'
      return next('/login')
    }
    return next('/dashboard')
  }
  // Admins and sellers can access the panel
  if (!to.meta.guest && auth.isAuthenticated && !auth.isAdmin && !auth.isSeller) {
    await auth.logout()
    auth.error = 'Bu panel yalnızca satıcı ve yöneticilere açıktır.'
    return next('/login')
  }
  // Super-admin gerektiren sayfalar (ör. Site Teması) — satıcı giremez
  if (to.meta.requiresSuperAdmin && !auth.isAdmin) {
    return next('/dashboard')
  }
  next()
})

export default router
