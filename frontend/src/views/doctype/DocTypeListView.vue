<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">{{ doctypeLabel }}</h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ t("docTypeList.recordsFound", { count: totalCount }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <ViewModeToggle v-model="viewMode" />
        <button
          v-if="doctype === 'Currency Rate Pair'"
          class="hdr-btn-outlined"
          :disabled="tcmbLoading"
          @click="tcmbRefresh"
        >
          <AppIcon
            :name="tcmbLoading ? 'loader' : 'download-cloud'"
            :size="14"
            :class="tcmbLoading ? 'animate-spin' : ''"
          />
          <span>{{ t("docTypeList.refreshFromTcmb") }}</span>
        </button>
        <button class="hdr-btn-outlined" @click="refreshList">
          <AppIcon name="refresh-cw" :size="14" />
          <span>{{ t("docTypeList.refresh") }}</span>
        </button>
        <button v-if="canCreate" class="hdr-btn-primary" data-tour="dtl-new" @click="createNew">
          <AppIcon name="plus" :size="14" />
          <span>{{ t("docTypeList.addNew") }}</span>
        </button>
      </div>
    </div>

    <!-- Status Filter Pills (Ürünlerim sayfasındaki gibi hızlı filtre) -->
    <StatusFilterPills
      v-if="hasStatusField && statusPillOptions.length > 1"
      v-model="statusFilter"
      :options="statusPillOptions"
    />

    <!-- Filters Bar -->
    <div class="card mb-5 !p-3" data-tour="dtl-filters">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div class="relative flex-1 min-w-0 sm:min-w-[200px]">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('docTypeList.searchPlaceholder', { label: doctypeLabel })"
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        <!-- Fallback: status fieldi var ama meta'da option yoksa eski dropdown'ı göster -->
        <div v-if="hasStatusField && statusPillOptions.length <= 1" class="flex items-center gap-2">
          <AppIcon name="filter" :size="13" class="text-gray-400 dark:text-gray-500" />
          <select v-model="statusFilter" class="form-input-sm w-auto">
            <option value="">{{ t("docTypeList.allStatuses") }}</option>
            <option value="Active">{{ t("docTypeList.statusActive") }}</option>
            <option value="Draft">{{ t("docTypeList.statusDraft") }}</option>
            <option value="Disabled">{{ t("docTypeList.statusDisabled") }}</option>
          </select>
        </div>
        <div v-for="f in extraFilterFields" :key="f.fieldname" class="flex items-center gap-2">
          <AppIcon name="filter" :size="13" class="text-gray-400 dark:text-gray-500" />
          <select
            :value="extraFilters[f.fieldname] || ''"
            class="form-input-sm w-auto"
            @change="extraFilters[f.fieldname] = $event.target.value"
          >
            <option value="">{{ t("docTypeList.allOfField", { label: f.label }) }}</option>
            <option v-for="opt in optionsFor(f)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <AppIcon
            name="arrow-down-wide-narrow"
            :size="13"
            class="text-gray-400 dark:text-gray-500"
          />
          <select v-model="sortBy" class="form-input-sm w-auto">
            <option value="modified desc">{{ t("docTypeList.sortLastModified") }}</option>
            <option value="creation desc">{{ t("docTypeList.sortLastCreated") }}</option>
            <option value="name asc">{{ t("docTypeList.sortNameAsc") }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("docTypeList.loading") }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="card text-center py-12">
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"
      >
        <AppIcon name="inbox" :size="24" class="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
        {{ t("docTypeList.emptyTitle") }}
      </h3>
      <p class="text-xs text-gray-400 mb-4">
        {{
          canCreate
            ? t("docTypeList.emptyCreatePrompt", { label: doctypeLabel })
            : t("docTypeList.emptyNoRecords", { label: doctypeLabel })
        }}
      </p>
      <button v-if="canCreate" class="hdr-btn-primary" @click="createNew">
        <AppIcon name="plus" :size="14" />
        <span>{{ t("docTypeList.addNew") }}</span>
      </button>
    </div>

    <!-- Content -->
    <div v-else class="card p-0 overflow-hidden" data-tour="dtl-table">
      <!-- TABLE VIEW -->
      <div v-if="viewMode === 'table'" class="overflow-hidden">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th w-8">
                <input type="checkbox" class="form-checkbox rounded text-violet-600" />
              </th>
              <th class="tbl-th">{{ t("docTypeList.colName") }}</th>
              <th
                v-for="col in listViewFields"
                :key="col.fieldname"
                class="tbl-th"
                :class="['title', 'subject', 'description'].includes(col.fieldname) ? 'w-2/5' : ''"
              >
                {{ col.label.toUpperCase() }}
              </th>
              <th v-if="!doctypeHasStatusField && isSubmittable" class="tbl-th">
                {{ t("docTypeList.colStatus") }}
              </th>
              <th class="tbl-th">{{ t("docTypeList.colCreated") }}</th>
              <th class="tbl-th">{{ t("docTypeList.colModified") }}</th>
              <th class="tbl-th w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              @click="openDoc(item.name)"
            >
              <td class="tbl-td" @click.stop>
                <input type="checkbox" class="form-checkbox rounded text-violet-600" />
              </td>
              <td class="tbl-td font-semibold text-gray-900 dark:text-gray-100">
                <span class="inline-flex items-center gap-2">
                  <AppIcon
                    v-if="item.icon_class"
                    :name="item.icon_class"
                    :size="15"
                    class="text-violet-500 shrink-0"
                  />
                  {{ primaryDisplay(item) }}
                </span>
              </td>
              <td v-for="col in listViewFields" :key="col.fieldname" class="tbl-td">
                <template v-if="col.fieldtype === 'Select' || col.fieldname === 'status'">
                  <span class="badge" :class="getStatusClass(item[col.fieldname])">
                    {{ item[col.fieldname] || "—" }}
                  </span>
                </template>
                <template v-else-if="col.fieldtype === 'Check'">
                  <span
                    class="badge text-[10px] font-medium"
                    :class="
                      item[col.fieldname]
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-500/10 text-gray-500'
                    "
                  >
                    {{ item[col.fieldname] ? t("docTypeList.yes") : t("docTypeList.no") }}
                  </span>
                </template>
                <template
                  v-else-if="
                    col.fieldtype === 'Currency' ||
                    col.fieldtype === 'Float' ||
                    col.fieldtype === 'Int'
                  "
                >
                  <span class="text-gray-700 dark:text-gray-300">{{
                    formatNumber(item[col.fieldname], col.fieldtype)
                  }}</span>
                </template>
                <template v-else-if="col.fieldtype === 'Date' || col.fieldtype === 'Datetime'">
                  <span class="text-gray-400">{{ formatDate(item[col.fieldname]) }}</span>
                </template>
                <template v-else>
                  <span class="text-gray-700 dark:text-gray-300">{{
                    item[col.fieldname] || "—"
                  }}</span>
                </template>
              </td>
              <td v-if="!doctypeHasStatusField && isSubmittable" class="tbl-td">
                <span class="badge" :class="getDocstatusClass(item.docstatus)">
                  {{ getDocstatusLabel(item.docstatus) }}
                </span>
              </td>
              <td class="tbl-td text-gray-400">{{ formatDate(item.creation) }}</td>
              <td class="tbl-td text-gray-400">{{ formatDate(item.modified) }}</td>
              <td class="tbl-td" @click.stop>
                <div v-if="getRowActions(item).length > 0" class="flex items-center gap-1.5">
                  <button
                    v-for="act in getRowActions(item)"
                    :key="act.key"
                    :disabled="rowActionLoading[item.name + ':' + act.key]"
                    :title="act.label"
                    :class="['inline-row-btn', act.class]"
                    @click.stop="runInlineAction(item, act)"
                  >
                    <AppIcon
                      :name="rowActionLoading[item.name + ':' + act.key] ? 'loader' : act.icon"
                      :size="13"
                      :class="rowActionLoading[item.name + ':' + act.key] ? 'animate-spin' : ''"
                    />
                    <span class="text-[11px] font-medium">{{ act.label }}</span>
                  </button>
                </div>
                <button v-else class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <AppIcon name="more-vertical" :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- LIST VIEW (compact) -->
      <div v-else-if="viewMode === 'list'">
        <div
          v-for="item in items"
          :key="item.name"
          class="list-compact-item"
          @click="openDoc(item.name)"
        >
          <input
            type="checkbox"
            class="form-checkbox rounded text-violet-600 flex-shrink-0"
            @click.stop
          />
          <AppIcon
            v-if="item.icon_class"
            :name="item.icon_class"
            :size="15"
            class="text-violet-500 shrink-0"
          />
          <span class="list-compact-name">{{ primaryDisplay(item) }}</span>
          <!-- Primary status badge -->
          <template v-if="hasStatusField">
            <span class="badge" :class="getStatusClass(item[statusFieldName])">
              {{ item[statusFieldName] || "—" }}
            </span>
          </template>
          <template v-else>
            <span class="badge" :class="getDocstatusClass(item.docstatus)">
              {{ getDocstatusLabel(item.docstatus) }}
            </span>
          </template>
          <!-- Extra in_list_view fields (skip status, already shown) -->
          <template
            v-for="col in listViewFields.filter(
              (c) => c.fieldname !== statusFieldName && c.fieldtype !== 'Select'
            )"
            :key="col.fieldname"
          >
            <span class="text-xs text-gray-400 hidden sm:inline">{{
              item[col.fieldname] || ""
            }}</span>
          </template>
          <span class="list-compact-date">{{ formatDate(item.modified) }}</span>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            @click.stop
          >
            <AppIcon name="more-vertical" :size="14" />
          </button>
        </div>
      </div>

      <!-- GRID VIEW (cards) -->
      <div v-else-if="viewMode === 'grid'" class="list-grid">
        <div
          v-for="item in items"
          :key="item.name"
          class="list-grid-card"
          @click="openDoc(item.name)"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="list-grid-card-title inline-flex items-center gap-2">
              <AppIcon
                v-if="item.icon_class"
                :name="item.icon_class"
                :size="15"
                class="text-violet-500 shrink-0"
              />
              {{ primaryDisplay(item) }}
            </span>
            <template v-if="hasStatusField">
              <span class="badge text-[10px]" :class="getStatusClass(item[statusFieldName])">
                {{ item[statusFieldName] || "—" }}
              </span>
            </template>
            <template v-else>
              <span class="badge text-[10px]" :class="getDocstatusClass(item.docstatus)">
                {{ getDocstatusLabel(item.docstatus) }}
              </span>
            </template>
          </div>
          <!-- Extra in_list_view fields -->
          <div
            v-for="col in listViewFields.filter((c) => c.fieldname !== statusFieldName)"
            :key="col.fieldname"
            class="text-xs text-gray-500 dark:text-gray-400 mb-1"
          >
            <span class="font-medium">{{ col.label }}:</span> {{ item[col.fieldname] || "—" }}
          </div>
          <div class="list-grid-card-meta">
            <span>{{ formatDate(item.creation) }}</span>
            <span>{{ formatDate(item.modified) }}</span>
          </div>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      <div v-else-if="viewMode === 'kanban'" class="list-kanban">
        <div v-for="col in kanbanColumns" :key="col.status" class="kanban-col">
          <div class="kanban-col-header" :style="{ borderColor: col.color }">
            <span>{{ col.label }}</span>
            <span class="kanban-col-count">{{ col.items.length }}</span>
          </div>
          <draggable
            :list="col.items"
            :group="isKanbanDraggable ? 'kanban' : { name: 'kanban', pull: false, put: false }"
            :disabled="!isKanbanDraggable"
            item-key="name"
            class="kanban-col-body"
            :animation="150"
            ghost-class="kanban-card-ghost"
            drag-class="kanban-card-dragging"
            @change="(e) => onKanbanChange(e, col.status)"
          >
            <template #item="{ element: item }">
              <div
                class="kanban-card"
                :class="{
                  'kanban-card-updating': kanbanUpdating.includes(item.name),
                  'kanban-card-draggable': isKanbanDraggable,
                }"
                @click="openDoc(item.name)"
              >
                <div class="kanban-card-title">{{ primaryDisplay(item) }}</div>
                <div class="kanban-card-meta">{{ formatDate(item.modified) }}</div>
                <AppIcon
                  v-if="kanbanUpdating.includes(item.name)"
                  name="loader"
                  :size="12"
                  class="absolute top-2 right-2 text-violet-500 animate-spin"
                />
              </div>
            </template>
          </draggable>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            {{ t("docTypeList.noRecords") }}
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <ListPagination
        v-model="currentPage"
        :total="totalCount"
        :page-size="pageSize"
        @update:model-value="loadData()"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";
  import api from "@/utils/api";
  import { useAuthStore } from "@/stores/auth";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();
  const toast = useToast();
  const { t, te } = useI18n();

  // Sayfa-içi onboarding: filtreler → kayıt listesi → yeni kayıt.
  usePageTour("doctype-list", () => [
    {
      target: '[data-tour="dtl-filters"]',
      title: t("tourSteps.page.dtlFilters_t"),
      desc: t("tourSteps.page.dtlFilters_d"),
    },
    {
      target: '[data-tour="dtl-table"]',
      title: t("tourSteps.page.dtlTable_t"),
      desc: t("tourSteps.page.dtlTable_d"),
    },
    {
      target: '[data-tour="dtl-new"]',
      title: t("tourSteps.page.dtlNew_t"),
      desc: t("tourSteps.page.dtlNew_d"),
    },
  ]);

  // ── Satıcı bazlı otomatik filtreler ──────────────────────────────────────────
  // Satıcı rolündeki kullanıcı belirli doctype'lara eriştiğinde sadece
  // kendi verilerini görmesi için arka plana filtre eklenir.
  // admin_seller_profile: { name, seller_code } — auth.py'den geliyor
  const SELLER_AUTO_FILTERS = {
    // Listing.seller_profile = Admin Seller Profile.seller_code
    Listing: (user) =>
      user.admin_seller_profile?.seller_code
        ? [["seller_profile", "=", user.admin_seller_profile.seller_code]]
        : [],
    // Order.seller = Admin Seller Profile.name
    Order: (user) =>
      user.admin_seller_profile?.name ? [["seller", "=", user.admin_seller_profile.name]] : [],
    // User Profile.name = email (autoname=field:user) — satıcı sadece kendi User Profile'ını görür
    "User Profile": (user) => (user.email ? [["name", "=", user.email]] : []),
    // Admin Seller Profile — satıcı sadece kendi profilini görür
    "Admin Seller Profile": (user) =>
      user.admin_seller_profile?.name ? [["name", "=", user.admin_seller_profile.name]] : [],
    // KYB Verification — sadece kendi KYB kaydı
    "KYB Verification": (user) => (user.email ? [["user", "=", user.email]] : []),
    // Aşağıdakiler seller = Admin Seller Profile.name
    "Seller Balance": (user) =>
      user.admin_seller_profile?.name ? [["seller", "=", user.admin_seller_profile.name]] : [],
    "Seller Review": (user) =>
      user.admin_seller_profile?.name ? [["seller", "=", user.admin_seller_profile.name]] : [],
    "Seller Inquiry": (user) =>
      user.admin_seller_profile?.name ? [["seller", "=", user.admin_seller_profile.name]] : [],
    "Seller Category": (user) =>
      user.admin_seller_profile?.name ? [["seller", "=", user.admin_seller_profile.name]] : [],
    "Seller Gallery Image": (user) =>
      user.admin_seller_profile?.name ? [["parent", "=", user.admin_seller_profile.name]] : [],
    // Certification Type: seller sees only Approved certs (Pending/Rejected shown in SuggestCertificationView)
    "Certification Type": (_user) => [["status", "=", "Approved"]],
  };

  // Sadece admin görebilecek doctype'lar (satıcı erişemez)
  // Seller Category: satıcının kendi kategori yönetimi /seller-categories
  // özel view'ı üzerinden yürür — generic doctype list'e direkt URL ile
  // gelmesini engelliyoruz, dashboard'a redirect.
  const ADMIN_ONLY_DOCTYPES = new Set([
    "User Profile",
    "Cart",
    "Currency Rate Pair",
    "Seller Application",
    "Seller Category",
  ]);

  // Hiç kimsenin yeni kayıt oluşturamayacağı doctype'lar (otomatik yönetilen veriler)
  const NO_CREATE_DOCTYPES = new Set(["Currency Rate Pair"]);

  // Satıcının yeni kayıt oluşturamayacağı doctype'lar (sistem tarafından yönetilir)
  const NO_CREATE_FOR_SELLER = new Set([
    "User Profile",
    "Seller Balance",
    "Seller Application",
    "User Profile",
    "Admin Seller Profile",
    "KYB Verification",
    "Certification Type",
    // Admin-only katalog master data
    "Product Type",
    "Attribute Set",
  ]);

  const canCreate = computed(() => {
    if (NO_CREATE_DOCTYPES.has(doctype.value)) return false;
    if (auth.isAdmin) return true;
    if (NO_CREATE_FOR_SELLER.has(doctype.value)) return false;
    return true;
  });

  function getSellerAutoFilter() {
    if (auth.isAdmin || !auth.isSeller) return [];
    const filterFn = SELLER_AUTO_FILTERS[doctype.value];
    return filterFn ? filterFn(auth.user) : [];
  }

  const items = ref([]);
  const totalCount = ref(0);
  const loading = ref(false);
  const tcmbLoading = ref(false);
  const searchQuery = ref("");
  const statusFilter = ref("");
  const extraFilters = ref({});

  const extraFilterFields = computed(() =>
    metaFields.value.filter(
      (f) =>
        f.in_standard_filter &&
        f.fieldname !== statusFieldName.value &&
        f.fieldtype === "Select" &&
        f.options
    )
  );

  function optionsFor(f) {
    return (f.options || "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  const sortBy = ref("modified desc");
  const currentPage = ref(1);
  const pageSize = 12;
  const viewMode = ref("table");

  // DocType meta
  const metaFields = ref([]);
  const isSubmittable = ref(false);
  const metaTitleField = ref(null);
  const metaLoaded = ref(false);

  const doctype = computed(() => {
    const raw = route.params.doctype || "";
    return decodeURIComponent(raw);
  });

  const doctypeLabel = computed(() => {
    if (!doctype.value) return t("docTypeList.documentFallback");
    const key = `doctypeNames.${doctype.value}`;
    return te(key) ? t(key) : doctype.value;
  });

  // Fields marked as in_list_view (excluding name/creation/modified/docstatus)
  // Doctype'a özel olarak listede gizlenecek alanlar — name kolonu zaten
  // ana sütun olarak gösterildiği için kod/kimlik alanlarını tekrar etmek
  // tabloyu gereksiz şişiriyor.
  const HIDDEN_LIST_FIELDS = {
    Listing: new Set(["listing_code"]),
  };

  // "AD" (name) kolonu autoincrement/anlamsız bir name taşıyan doctype'larda
  // bir Link alanının okunabilir adını göstersin. { field, doctype, titleField }
  // örn. Seller Category'nin name'i 31/32… → seller'ın Mağaza Adı görünür.
  const PRIMARY_DISPLAY_LINK = {
    "Seller Category": {
      field: "seller",
      doctype: "Admin Seller Profile",
      titleField: "seller_name",
    },
  };
  const primaryDisplayLink = computed(() => PRIMARY_DISPLAY_LINK[doctype.value] || null);
  // Link id → okunabilir başlık eşlemesi (loadData sonrası doldurulur)
  const linkTitleMap = ref({});

  // AD kolonunda gösterilecek değer: override varsa Link başlığı, yoksa name.
  function primaryDisplay(item) {
    const cfg = primaryDisplayLink.value;
    if (!cfg) return item.name;
    const id = item[cfg.field];
    return (id && linkTitleMap.value[id]) || id || item.name;
  }

  const listViewFields = computed(() => {
    const hidden = HIDDEN_LIST_FIELDS[doctype.value] || new Set();
    return metaFields.value.filter(
      (f) =>
        f.in_list_view &&
        !hidden.has(f.fieldname) &&
        !["name", "creation", "modified", "docstatus", "owner", "modified_by"].includes(
          f.fieldname
        ) &&
        ![
          "Section Break",
          "Column Break",
          "Tab Break",
          "HTML",
          "Table",
          "Table MultiSelect",
          "Button",
        ].includes(f.fieldtype)
    );
  });

  // Find status Select field
  const statusFieldName = computed(() => {
    const field = metaFields.value.find(
      (f) => f.fieldname === "status" && f.fieldtype === "Select"
    );
    return field ? field.fieldname : null;
  });

  // Hide status filter for sellers on Certification Type (they only see Approved + own suggestions)
  const HIDE_STATUS_FILTER_FOR_SELLER = new Set(["Certification Type"]);
  // Whether the doctype actually has a status field (regardless of visibility)
  const doctypeHasStatusField = computed(() => !!statusFieldName.value);
  // Whether to show the status filter dropdown (hidden for sellers on some doctypes)
  const hasStatusField = computed(() => {
    if (!auth.isAdmin && auth.isSeller && HIDE_STATUS_FILTER_FOR_SELLER.has(doctype.value))
      return false;
    return doctypeHasStatusField.value;
  });

  // Status options from meta
  const statusOptions = computed(() => {
    const field = metaFields.value.find(
      (f) => f.fieldname === "status" && f.fieldtype === "Select"
    );
    if (!field || !field.options) return [];
    return field.options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
  });

  // ── Hızlı filtre (pill) konfigürasyonu ────────────────────────────────────────
  // SellerListingsView'daki "Tümü / Aktif / Stokta Yok / ..." pill'lerinin
  // generic karşılığı. Status değerleri doctype meta'sından geldiği için
  // İngilizce — kullanıcıya Türkçe göstermek için label/dot maplerini burada
  // topluyoruz. Eşleşme yoksa raw değer + nötr renk düşer.
  // Maps backend status codes (English) to i18n keys for display.
  const STATUS_LABEL_KEY = {
    Active: "statusActive",
    Approved: "statusApproved",
    Enabled: "statusEnabled",
    Published: "statusPublished",
    Completed: "statusCompleted",
    Paid: "statusPaid",
    Pending: "statusPending",
    Submitted: "statusSubmitted",
    "Under Review": "statusUnderReview",
    Draft: "statusDraft",
    "Out of Stock": "statusOutOfStock",
    Paused: "statusPaused",
    Rejected: "statusRejected",
    Cancelled: "statusCancelled",
    Disabled: "statusDisabled",
    Suspended: "statusSuspended",
    Revoked: "statusRevoked",
    Archived: "statusArchived",
    Verified: "statusVerified",
    Unverified: "statusUnverified",
    "Waiting for payment": "statusWaitingForPayment",
    Confirming: "statusConfirming",
    Delivering: "statusDelivering",
    Processing: "statusProcessing",
    "In Transit": "statusInTransit",
    "Preparing Shipment": "statusPreparingShipment",
    New: "statusNew",
    Open: "statusOpen",
    Closed: "statusClosed",
  };

  // Returns a localized status label, falling back to the raw status code.
  function statusLabel(status) {
    const key = STATUS_LABEL_KEY[status];
    return key ? t(`docTypeList.${key}`) : status;
  }
  const STATUS_DOT_TW = {
    Active: "bg-emerald-400",
    Approved: "bg-emerald-400",
    Enabled: "bg-emerald-400",
    Published: "bg-emerald-400",
    Completed: "bg-emerald-400",
    Paid: "bg-emerald-400",
    Verified: "bg-emerald-400",
    Pending: "bg-amber-400",
    Submitted: "bg-amber-400",
    "Waiting for payment": "bg-amber-400",
    "Under Review": "bg-blue-400",
    Confirming: "bg-blue-400",
    Delivering: "bg-blue-400",
    Processing: "bg-blue-400",
    "In Transit": "bg-blue-400",
    "Preparing Shipment": "bg-violet-400",
    "Out of Stock": "bg-amber-400",
    Paused: "bg-gray-400",
    Draft: "bg-slate-400",
    New: "bg-blue-400",
    Open: "bg-blue-400",
    Rejected: "bg-red-400",
    Cancelled: "bg-red-400",
    Disabled: "bg-red-400",
    Suspended: "bg-red-400",
    Revoked: "bg-red-400",
    Closed: "bg-gray-400",
    Archived: "bg-gray-400",
    Unverified: "bg-gray-400",
  };

  const statusPillOptions = computed(() => {
    if (!hasStatusField.value || statusOptions.value.length === 0) return [];
    return [
      { value: "", label: t("docTypeList.all"), dot: "bg-violet-400" },
      ...statusOptions.value.map((opt) => ({
        value: opt,
        label: statusLabel(opt),
        dot: STATUS_DOT_TW[opt] || "bg-gray-400",
      })),
    ];
  });

  // Doctype'ın bir lucide ikon alanı (icon_class) var mı? Product Type gibi
  // doctype'larda satır başına ikon göstermek için kullanılır.
  const hasIconClass = computed(() =>
    metaFields.value.some((f) => f.fieldname === "icon_class")
  );

  // Fields to request from API
  const fieldsToFetch = computed(() => {
    const base = ["name", "creation", "modified", "docstatus"];
    const listFields = listViewFields.value.map((f) => f.fieldname);
    if (statusFieldName.value && !listFields.includes(statusFieldName.value)) {
      listFields.push(statusFieldName.value);
    }
    if (primaryDisplayLink.value) {
      listFields.push(primaryDisplayLink.value.field);
    }
    // icon_class form'da gizli olsa da listede ikon basmak için çekilir.
    if (hasIconClass.value) {
      listFields.push("icon_class");
    }
    return [...new Set([...base, ...listFields])];
  });

  // Kanban: vuedraggable kolon array'lerini mutate eder; computed yerine
  // ref tutup items değişikliklerinde manuel rebuild ediyoruz. Bu sayede drag
  // sırasında reactive cache çakışmaz.
  const KANBAN_COLORS = [
    "#7c3aed",
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#ef4444",
    "#06b6d4",
    "#8b5cf6",
    "#ec4899",
  ];
  const kanbanColumns = ref([]);
  const isKanbanDraggable = computed(
    () => !!statusFieldName.value && statusOptions.value.length > 0
  );

  function rebuildKanbanColumns() {
    if (isKanbanDraggable.value) {
      kanbanColumns.value = statusOptions.value.map((status, i) => ({
        status,
        label: statusLabel(status),
        color: KANBAN_COLORS[i % KANBAN_COLORS.length],
        items: items.value.filter((item) => item[statusFieldName.value] === status),
      }));
      return;
    }
    kanbanColumns.value = [
      {
        status: 0,
        label: t("docTypeList.docstatusDraft"),
        color: "#f59e0b",
        items: items.value.filter((i) => i.docstatus === 0),
      },
      {
        status: 1,
        label: t("docTypeList.docstatusActive"),
        color: "#10b981",
        items: items.value.filter((i) => i.docstatus === 1),
      },
      {
        status: 2,
        label: t("docTypeList.docstatusCancelled"),
        color: "#ef4444",
        items: items.value.filter((i) => i.docstatus === 2),
      },
    ];
  }

  watch([items, statusFieldName, statusOptions], rebuildKanbanColumns, { immediate: true });

  const kanbanUpdating = ref([]);

  async function onKanbanChange(e, newStatus) {
    if (!e.added) return;
    const movedItem = e.added.element;
    const fname = statusFieldName.value;
    if (!fname || !isKanbanDraggable.value) return;
    const oldStatus = movedItem[fname];
    if (oldStatus === newStatus) return;

    movedItem[fname] = newStatus;
    kanbanUpdating.value = [...kanbanUpdating.value, movedItem.name];

    try {
      await api.updateDoc(doctype.value, movedItem.name, { [fname]: newStatus });
      toast.success(`${movedItem.name}: ${statusLabel(newStatus)}`);
    } catch (err) {
      movedItem[fname] = oldStatus;
      rebuildKanbanColumns();
      toast.error(err.message || t("docTypeList.statusUpdateFailed"));
    } finally {
      kanbanUpdating.value = kanbanUpdating.value.filter((n) => n !== movedItem.name);
    }
  }

  function createNew() {
    router.push(`/app/${encodeURIComponent(doctype.value)}/new`);
  }

  async function loadMeta() {
    metaLoaded.value = false;
    metaFields.value = [];
    isSubmittable.value = false;
    metaTitleField.value = null;
    try {
      const res = await api.getMeta(doctype.value);
      metaFields.value = res?.message?.fields || [];
      isSubmittable.value = !!res?.message?.is_submittable;
      // Resolve the searchable title field: prefer meta.title_field,
      // otherwise fall back to a Data field named "title" if it exists.
      const explicit = res?.message?.title_field;
      if (explicit) {
        metaTitleField.value = explicit;
      } else {
        const titleField = metaFields.value.find(
          (f) => f.fieldname === "title" && ["Data", "Small Text"].includes(f.fieldtype)
        );
        metaTitleField.value = titleField ? "title" : null;
      }
    } catch {
      metaFields.value = [];
      isSubmittable.value = false;
      metaTitleField.value = null;
    } finally {
      metaLoaded.value = true;
    }
  }

  // AD kolonu override'lı doctype'larda Link id'lerinin okunabilir adlarını çek.
  async function resolvePrimaryDisplayTitles() {
    const cfg = primaryDisplayLink.value;
    if (!cfg) {
      linkTitleMap.value = {};
      return;
    }
    const ids = [...new Set(items.value.map((i) => i[cfg.field]).filter(Boolean))];
    if (ids.length === 0) {
      linkTitleMap.value = {};
      return;
    }
    try {
      const res = await api.getList(cfg.doctype, {
        fields: ["name", cfg.titleField],
        filters: [["name", "in", ids]],
        limit_page_length: ids.length,
      });
      const map = {};
      for (const row of res.data || []) {
        map[row.name] = row[cfg.titleField] || row.name;
      }
      linkTitleMap.value = map;
    } catch {
      linkTitleMap.value = {};
    }
  }

  async function loadData() {
    // Satıcı admin-only doctype'a erişmeye çalışıyorsa dashboard'a yönlendir
    if (!auth.isAdmin && auth.isSeller && ADMIN_ONLY_DOCTYPES.has(doctype.value)) {
      router.push("/dashboard");
      return;
    }

    loading.value = true;
    try {
      const filters = [];
      const orFilters = [];
      if (searchQuery.value) {
        const q = `%${searchQuery.value}%`;
        orFilters.push(["name", "like", q]);
        if (metaTitleField.value && metaTitleField.value !== "name") {
          orFilters.push([metaTitleField.value, "like", q]);
        }
      }
      if (statusFilter.value) {
        const filterField = statusFieldName.value || "status";
        filters.push([filterField, "=", statusFilter.value]);
      }
      for (const [fname, value] of Object.entries(extraFilters.value)) {
        if (value) filters.push([fname, "=", value]);
      }
      // URL query'den Link/Data filtreleri ekle (örn. ?listing=LST-00013)
      const reservedQuery = new Set(["status", "page", "sortBy", "search", "q", "returnTo"]);
      const metaFieldSet = new Set((metaFields.value || []).map((f) => f.fieldname));
      for (const [key, val] of Object.entries(route.query || {})) {
        if (reservedQuery.has(key) || !val) continue;
        if (metaFieldSet.has(key)) {
          filters.push([key, "=", String(Array.isArray(val) ? val[0] : val)]);
        }
      }
      // Satıcı için otomatik filtreler ekle
      const sellerFilters = getSellerAutoFilter();
      filters.push(...sellerFilters);

      const isSearching = !!searchQuery.value;
      const res = await api.getList(doctype.value, {
        fields: fieldsToFetch.value,
        filters,
        or_filters: orFilters,
        order_by: sortBy.value,
        limit_start: isSearching ? 0 : (currentPage.value - 1) * pageSize,
        limit_page_length: isSearching ? 2000 : pageSize,
      });
      items.value = res.data || [];
      await resolvePrimaryDisplayTitles();

      // Satıcı kendi profilini görüyorsa (tek kayıt) direkt form'a yönlendir
      if (!auth.isAdmin && items.value.length === 1 && sellerFilters.length > 0) {
        const singleDocTypes = new Set(["Admin Seller Profile", "Seller Balance"]);
        if (singleDocTypes.has(doctype.value)) {
          router.replace(
            `/app/${encodeURIComponent(doctype.value)}/${encodeURIComponent(items.value[0].name)}`
          );
          return;
        }
      }

      if (isSearching) {
        totalCount.value = items.value.length;
      } else {
        const countRes = await api.getCount(doctype.value, filters);
        totalCount.value = countRes.message || 0;
      }
    } catch {
      items.value = [];
      totalCount.value = 0;
    } finally {
      loading.value = false;
    }
  }

  // ── Inline row actions (doctype-specific) ────────────────────────────────────
  const rowActionLoading = ref({});

  function getRowActions(item) {
    if (!auth.isAdmin) return [];
    if (doctype.value === "Brand") {
      const s = item.status || "";
      const actions = [];
      if (s !== "Approved") {
        actions.push({
          key: "approve",
          label: t("docTypeList.approve"),
          icon: "check-circle",
          class: "inline-row-btn-approve",
          apiMethod: "tradehub_core.api.brand.approve",
        });
      }
      if (s !== "Rejected") {
        actions.push({
          key: "reject",
          label: t("docTypeList.reject"),
          icon: "x-circle",
          class: "inline-row-btn-reject",
          apiMethod: "tradehub_core.api.brand.reject",
          requiresReason: true,
        });
      }
      return actions;
    }
    return [];
  }

  async function runInlineAction(item, act) {
    const loadKey = item.name + ":" + act.key;
    if (rowActionLoading.value[loadKey]) return;

    let reason = "";
    if (act.requiresReason) {
      reason = window.prompt(t("docTypeList.reasonPrompt", { action: act.label }));
      if (reason === null) return;
      reason = reason.trim();
      if (!reason) {
        alert(t("docTypeList.reasonRequired"));
        return;
      }
    }

    rowActionLoading.value = { ...rowActionLoading.value, [loadKey]: true };
    try {
      const args = { name: item.name };
      if (act.requiresReason) args.reason = reason;
      const res = await api.callMethod(act.apiMethod, args);
      const newStatus = res?.message?.status;
      if (newStatus) item.status = newStatus;
      const resultKey = act.key === "approve" ? "approvedResult" : "rejectedResult";
      alert(t(`docTypeList.${resultKey}`, { name: item.name }));
    } catch (err) {
      alert(err.message || t("docTypeList.actionFailed"));
    } finally {
      const copy = { ...rowActionLoading.value };
      delete copy[loadKey];
      rowActionLoading.value = copy;
    }
  }

  function applyQueryFilters() {
    const q = route.query || {};
    if (q.status && statusFieldName.value) {
      statusFilter.value = String(q.status);
    } else if (q.status) {
      statusFilter.value = String(q.status);
    }
  }

  async function init() {
    await loadMeta();
    applyQueryFilters();
    await loadData();
  }

  function refreshList() {
    currentPage.value = 1;
    loadData();
  }

  async function tcmbRefresh() {
    tcmbLoading.value = true;
    try {
      await api.callMethod("tradehub_core.services.tcmb.manual_refresh");
      refreshList();
    } catch {
      // silent
    } finally {
      tcmbLoading.value = false;
    }
  }

  function openDoc(name) {
    router.push({
      path: `/app/${encodeURIComponent(doctype.value)}/${encodeURIComponent(name)}`,
      query: { returnTo: route.fullPath },
    });
  }

  // Status coloring for Select fields
  const STATUS_COLOR_MAP = {
    // Green
    Approved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    Active: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    Completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    Enabled: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    Published: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    Paid: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    // Amber
    Draft: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    Submitted: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    Pending: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    "Waiting for payment": "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    // Blue
    "Under Review": "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    Confirming: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    Delivering: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    Processing: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    "In Transit": "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    // Red
    Rejected: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    Cancelled: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    Disabled: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    Suspended: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    Revoked: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    // Violet
    "Preparing Shipment": "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
  };

  function getStatusClass(val) {
    if (!val) return "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400";
    return STATUS_COLOR_MAP[val] || "bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400";
  }

  function getDocstatusClass(docstatus) {
    const map = {
      0: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
      1: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
      2: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    };
    return map[docstatus] || "bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400";
  }

  function getDocstatusLabel(docstatus) {
    const map = {
      0: t("docTypeList.docstatusDraft"),
      1: t("docTypeList.docstatusActive"),
      2: t("docTypeList.docstatusCancelled"),
    };
    return map[docstatus] || t("docTypeList.docstatusUnknown");
  }

  function formatDate(dt) {
    if (!dt) return "-";
    return new Date(dt).toLocaleDateString("tr-TR");
  }

  function formatNumber(val, fieldtype) {
    if (val === null || val === undefined || val === "") return "—";
    if (fieldtype === "Currency")
      return Number(val).toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (fieldtype === "Float")
      return Number(val).toLocaleString("tr-TR", { maximumFractionDigits: 4 });
    return String(val);
  }

  watch(
    () => route.params.doctype,
    () => {
      currentPage.value = 1;
      statusFilter.value = "";
      extraFilters.value = {};
      init();
    }
  );

  watch(
    () => route.query.status,
    (val) => {
      if (val && String(val) !== statusFilter.value) {
        statusFilter.value = String(val);
        currentPage.value = 1;
        loadData();
      }
    }
  );

  let searchTimeout;
  watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage.value = 1;
      loadData();
    }, 400);
  });

  watch([statusFilter, sortBy], () => {
    currentPage.value = 1;
    loadData();
  });

  watch(
    extraFilters,
    () => {
      currentPage.value = 1;
      loadData();
    },
    { deep: true }
  );

  onMounted(init);
</script>
