<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import api from "@/utils/api";
  import { formatDay } from "@/utils/dateFormat";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import { useMediaAccess } from "@/composables/useMediaAccess";
  import { useToast } from "@/composables/useToast";

  const { t, locale } = useI18n();
  const toast = useToast();
  const access = useMediaAccess();

  const M = "tradehub_core.api.media_admin";

  // Backend'in sanal klasör sabitleri (media/browse.py) — birebir aynı.
  const PLATFORM_STORE = "__platform__";
  const NO_CATEGORY = "__none__";
  const UNUSED = "__unused__";
  const OTHER_GROUP = "__other__";

  // ── Konum: klasör derinliği bu dört alandan türer ─────────────────
  const path = ref({ scope: "", store: "", category: "", group: "" });
  const folders = ref([]);
  const files = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const search = ref("");
  const loading = ref(false);

  // Dosya listesi yalnız en derin seviyede gelir; üst seviyeler klasör ızgarası.
  const atFileLevel = computed(() => {
    const p = path.value;
    if (p.scope === "private") return !!p.group;
    if (p.scope === "public") return !!p.category || p.store === PLATFORM_STORE;
    return false;
  });

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.browse_media`, {
        ...path.value,
        page: page.value,
        page_size: pageSize.value,
        search: search.value,
      });
      const data = res.message || {};
      folders.value = data.folders || [];
      files.value = data.items || [];
      total.value = data.total || 0;
    } catch (e) {
      toast.error(e.message || t("mediaExplorer.loadFailed"));
      folders.value = [];
      files.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);

  function specialLabel(folder) {
    if (folder.id === "public") return t("mediaExplorer.folder.public");
    if (folder.id === "private") return t("mediaExplorer.folder.private");
    if (folder.id === PLATFORM_STORE) return t("mediaExplorer.folder.platform");
    if (folder.id === NO_CATEGORY) return t("mediaExplorer.folder.uncategorized");
    if (folder.id === UNUSED) return t("mediaExplorer.folder.unused");
    if (folder.id === OTHER_GROUP) return t("mediaExplorer.folder.other");
    return folder.label || folder.id;
  }

  function folderIcon(folder) {
    if (folder.id === "private") return "lock";
    if (folder.id === "public") return "globe";
    return "folder";
  }

  function enter(folder) {
    const p = { ...path.value };
    if (!p.scope) p.scope = folder.id;
    else if (p.scope === "public" && !p.store) p.store = folder.id;
    else if (p.scope === "public") p.category = folder.id;
    else if (p.scope === "private") p.group = folder.id;
    path.value = p;
    page.value = 1;
    search.value = "";
    load();
  }

  // ── Breadcrumb ────────────────────────────────────────────────────
  const crumbLabels = ref({}); // id → görünen ad (klasöre girerken yakalanır)

  const breadcrumb = computed(() => {
    const p = path.value;
    const items = [{ key: "root", label: t("mediaExplorer.root") }];
    if (p.scope)
      items.push({ key: "scope", label: t(`mediaExplorer.folder.${p.scope}`) });
    if (p.store)
      items.push({
        key: "store",
        label: p.store === PLATFORM_STORE ? t("mediaExplorer.folder.platform") : crumbLabels.value[p.store] || p.store,
      });
    if (p.category)
      items.push({
        key: "category",
        label:
          p.category === NO_CATEGORY
            ? t("mediaExplorer.folder.uncategorized")
            : p.category === UNUSED
              ? t("mediaExplorer.folder.unused")
              : crumbLabels.value[p.category] || p.category,
      });
    if (p.group)
      items.push({
        key: "group",
        label: p.group === OTHER_GROUP ? t("mediaExplorer.folder.other") : p.group,
      });
    return items;
  });

  function jump(key) {
    const p = { ...path.value };
    if (key === "root") Object.assign(p, { scope: "", store: "", category: "", group: "" });
    else if (key === "scope") Object.assign(p, { store: "", category: "", group: "" });
    else if (key === "store") Object.assign(p, { category: "" });
    path.value = p;
    page.value = 1;
    search.value = "";
    load();
  }

  function enterAndRemember(folder) {
    crumbLabels.value[folder.id] = specialLabel(folder);
    enter(folder);
  }

  // ── Dosya aksiyonları — Medya ekranıyla aynı davranış ─────────────
  const accessConfirm = ref(null); // { item, makePrivate }

  async function onAccessConfirm() {
    const { item, makePrivate } = accessConfirm.value || {};
    accessConfirm.value = null;
    if (!item) return;
    try {
      await access.setAccessLevel(item.file_url, makePrivate);
      toast.success(
        makePrivate
          ? t("mediaAccess.toast.movedPrivate", { name: item.file_name })
          : t("mediaAccess.toast.movedPublic", { name: item.file_name })
      );
      await load();
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
  }

  async function copySignedLink(item) {
    try {
      const { url, ttl_seconds: ttl } = await access.createSignedLink(item.file_url);
      const absolute = new URL(url, window.location.origin).href;
      const copied = await access.copyText(absolute);
      if (copied) {
        toast.success(t("mediaAccess.toast.linkCopied", { minutes: Math.round((ttl || 900) / 60) }));
      } else {
        toast.error(t("mediaAccess.toast.copyFailed"));
      }
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
  }

  const fmtDate = (v) => formatDay(v, locale.value);
  const canThumb = (item) => !item.is_private && canRenderThumb(item.file_url || "");

  function applySearch() {
    page.value = 1;
    load();
  }

  function setPage(p) {
    page.value = p;
    load();
  }
</script>

<template>
  <div class="mx">
    <header class="mx__head">
      <div>
        <h1 class="mx__title">
          <AppIcon name="folder" :size="20" />
          {{ t("mediaExplorer.title") }}
        </h1>
        <p class="mx__sub">{{ t("mediaExplorer.subtitle") }}</p>
      </div>
    </header>

    <!-- Breadcrumb -->
    <nav class="mx__crumbs" :aria-label="t('mediaExplorer.title')">
      <template v-for="(c, i) in breadcrumb" :key="c.key">
        <button
          v-if="i < breadcrumb.length - 1"
          type="button"
          class="mx__crumb mx__crumb--link"
          @click="jump(c.key)"
        >
          {{ c.label }}
        </button>
        <span v-else class="mx__crumb">{{ c.label }}</span>
        <AppIcon v-if="i < breadcrumb.length - 1" name="chevron-right" :size="13" class="mx__sep" />
      </template>
    </nav>

    <div v-if="loading" class="mx__loading">{{ t("mediaExplorer.loading") }}</div>

    <!-- Klasör ızgarası -->
    <div v-else-if="!atFileLevel" class="mx__grid">
      <button
        v-for="f in folders"
        :key="f.id"
        type="button"
        class="mx__folder"
        @click="enterAndRemember(f)"
      >
        <AppIcon :name="folderIcon(f)" :size="26" class="mx__folder-icon" />
        <span class="mx__folder-name">{{ specialLabel(f) }}</span>
        <span class="mx__folder-count">{{ t("mediaExplorer.fileCount", { n: f.count }) }}</span>
      </button>
      <p v-if="!folders.length" class="mx__empty">{{ t("mediaExplorer.empty") }}</p>
    </div>

    <!-- Dosya listesi -->
    <template v-else>
      <div class="mx__toolbar">
        <input
          v-model="search"
          type="search"
          class="mx__search"
          :placeholder="t('mediaExplorer.searchPlaceholder')"
          @keyup.enter="applySearch"
        />
        <span class="mx__total">{{ t("mediaExplorer.fileCount", { n: total }) }}</span>
      </div>

      <div class="mx__files">
        <div v-for="item in files" :key="item.name" class="mx__row">
          <img
            v-if="canThumb(item)"
            class="mx__thumb"
            :src="item.file_url"
            :alt="item.file_name"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="mx__thumb mx__thumb--ph">
            <AppIcon :name="item.is_private ? 'lock' : 'file'" :size="16" />
          </span>

          <div class="mx__row-main">
            <span class="mx__file-name">{{ item.file_name || item.file_url }}</span>
            <span class="mx__row-sub">
              {{ formatSize(item.file_size || 0) }} · {{ fmtDate(item.creation) }}
            </span>
          </div>

          <span
            v-if="item.pii"
            class="mx__pill mx__pill--warn"
            :title="t('mediaAccess.badge.piiHint')"
          >
            {{ t("mediaAccess.badge.pii") }}
          </span>

          <template v-if="item.is_private">
            <button
              type="button"
              class="mx__link"
              :disabled="access.busy.value"
              :title="t('mediaAccess.action.signedLinkHint')"
              @click="copySignedLink(item)"
            >
              {{ t("mediaAccess.action.signedLink") }}
            </button>
            <button
              v-if="!item.pii"
              type="button"
              class="mx__link"
              :disabled="access.busy.value"
              @click="accessConfirm = { item, makePrivate: false }"
            >
              {{ t("mediaAccess.action.makePublic") }}
            </button>
          </template>
          <button
            v-else
            type="button"
            class="mx__link"
            :disabled="access.busy.value"
            :title="t('mediaAccess.action.makePrivateHint')"
            @click="accessConfirm = { item, makePrivate: true }"
          >
            {{ t("mediaAccess.action.makePrivate") }}
          </button>
        </div>
        <p v-if="!files.length" class="mx__empty">{{ t("mediaExplorer.empty") }}</p>
      </div>

      <ListPagination
        v-if="total > pageSize"
        :model-value="page"
        :total="total"
        :page-size="pageSize"
        @update:model-value="setPage"
      />
    </template>

    <ConfirmDialog
      :open="!!accessConfirm"
      :title="t('mediaAccess.confirm.title')"
      :message="
        accessConfirm?.makePrivate
          ? t('mediaAccess.confirm.makePrivate', { name: accessConfirm?.item?.file_name || '' })
          : t('mediaAccess.confirm.makePublic', { name: accessConfirm?.item?.file_name || '' })
      "
      :confirm-label="t('mediaAccess.confirm.ok')"
      tone="warning"
      @confirm="onAccessConfirm"
      @cancel="accessConfirm = null"
      @update:open="(v) => !v && (accessConfirm = null)"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/media" as media;

  .mx {
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;
    max-width: 1100px;
  }

  .mx__head {
    margin-bottom: media.$s-4;
  }

  .mx__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    @include media.text("xl");
    font-weight: 700;
  }

  .mx__sub {
    margin-top: 2px;
    @include media.text("sm");
    @include media.muted(1);
  }

  .mx__crumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    margin-bottom: media.$s-4;
    @include media.text("sm");
  }

  .mx__crumb {
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
  }

  .mx__crumb--link {
    cursor: pointer;
    @include media.muted(1);

    &:hover {
      text-decoration: underline;
    }
  }

  .mx__sep {
    @include media.muted(2);
  }

  .mx__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: media.$s-3;
  }

  .mx__folder {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: media.$s-1;
    padding: media.$s-4;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  .mx__folder-icon {
    color: #d9a514;
  }

  .mx__folder-name {
    font-weight: 600;
    @include media.text("sm");
    word-break: break-word;
  }

  .mx__folder-count {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mx__toolbar {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    margin-bottom: media.$s-3;
  }

  .mx__search {
    flex: 1;
    max-width: 380px;
    padding: 8px 12px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    border-radius: 8px;
    @include media.text("sm");
  }

  .mx__total {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mx__files {
    display: flex;
    flex-direction: column;
  }

  .mx__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 0;
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  }

  .mx__thumb {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;

    &--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.05);
      @include media.muted(1);
    }
  }

  .mx__row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .mx__file-name {
    font-weight: 600;
    @include media.text("sm");
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mx__row-sub {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mx__pill {
    padding: 2px 8px;
    border-radius: 999px;
    @include media.text("xs");
    font-weight: 600;

    &--warn {
      background: rgba(217, 119, 6, 0.12);
      color: #b45309;
    }
  }

  .mx__link {
    @include media.text("xs");
    font-weight: 600;
    color: #b45309;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .mx__loading,
  .mx__empty {
    padding: media.$s-6 0;
    text-align: center;
    @include media.text("sm");
    @include media.muted(1);
  }
</style>
