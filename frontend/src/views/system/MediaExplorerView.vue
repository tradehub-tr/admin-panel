<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import api from "@/utils/api";
  import { formatDay } from "@/utils/dateFormat";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import { useMediaAccess } from "@/composables/useMediaAccess";
  import { useToast } from "@/composables/useToast";

  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const access = useMediaAccess();

  const M = "tradehub_core.api.media_admin";

  // Backend'in sanal klasör sabitleri (media/browse.py) — birebir aynı.
  const PLATFORM_STORE = "__platform__";
  const NO_CATEGORY = "__none__";
  const UNUSED = "__unused__";
  const OTHER_GROUP = "__other__";

  // ── Konum: klasör derinliği bu beş alandan türer ──────────────────
  const path = ref({ scope: "", store: "", category: "", group: "", sub: "" });
  const folders = ref([]);
  const files = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const search = ref("");
  const loading = ref(false);

  // Üst şerit kartları için kök sayıları — konumdan bağımsız sabit kalır.
  const rootStats = ref({ public: 0, private: 0 });

  // Dosya seviyesinde miyiz — yanıttan anlaşılır (data.items var/yok):
  // KYB/KYC gibi detaylı gruplar grup klasörünün altında bir mağaza seviyesi
  // daha açar, derinliği path'ten türetmek bu yüzden artık yeterli değil.
  const atFileLevel = ref(false);

  const currentCount = computed(() =>
    atFileLevel.value ? total.value : folders.value.reduce((s, f) => s + (f.count || 0), 0)
  );

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
      atFileLevel.value = Array.isArray(data.items);
      folders.value = data.folders || [];
      files.value = data.items || [];
      total.value = data.total || 0;
      if (!path.value.scope) {
        const byId = Object.fromEntries((data.folders || []).map((f) => [f.id, f.count || 0]));
        rootStats.value = { public: byId.public || 0, private: byId.private || 0 };
      }
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
    if (folder.id === OTHER_GROUP)
      // Grup listesinde "bağsız belge", mağaza alt listesinde "mağazasız".
      return path.value.group
        ? t("mediaExplorer.folder.storeless")
        : t("mediaExplorer.folder.other");
    return folder.label || folder.id;
  }

  function folderIcon(folder) {
    if (folder.id === "private") return "lock";
    if (folder.id === "public") return "globe";
    if (folder.id === PLATFORM_STORE) return "layout-grid";
    if (folder.id === UNUSED) return "unlink";
    return "folder";
  }

  function enter(folder) {
    const p = { ...path.value };
    if (!p.scope) p.scope = folder.id;
    else if (p.scope === "public" && !p.store) p.store = folder.id;
    else if (p.scope === "public") p.category = folder.id;
    else if (p.scope === "private" && !p.group) p.group = folder.id;
    else if (p.scope === "private") p.sub = folder.id;
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
    if (p.scope) items.push({ key: "scope", label: t(`mediaExplorer.folder.${p.scope}`) });
    if (p.store)
      items.push({
        key: "store",
        label:
          p.store === PLATFORM_STORE
            ? t("mediaExplorer.folder.platform")
            : crumbLabels.value[p.store] || p.store,
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
    if (p.sub)
      items.push({
        key: "sub",
        label:
          p.sub === OTHER_GROUP ? t("mediaExplorer.folder.storeless") : crumbLabels.value[p.sub] || p.sub,
      });
    return items;
  });

  function jump(key) {
    const p = { ...path.value };
    if (key === "root")
      Object.assign(p, { scope: "", store: "", category: "", group: "", sub: "" });
    else if (key === "scope") Object.assign(p, { store: "", category: "", group: "", sub: "" });
    else if (key === "store") Object.assign(p, { category: "" });
    else if (key === "group") Object.assign(p, { sub: "" });
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

  /** "TIF" / "PNG" tip rozeti — Medya ekranındaki liste satırlarıyla aynı dil. */
  function extOf(item) {
    const m2 = /\.([a-z0-9]+)$/i.exec(item.file_name || item.file_url || "");
    return (m2?.[1] || "?").toUpperCase().slice(0, 4);
  }

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
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="folder" :size="16" class="mpage__title-icon" />
          {{ t("mediaExplorer.title") }}
        </h1>
        <p class="mpage__subtitle">
          {{
            t("mediaExplorer.pageSubtitle", {
              total: rootStats.public + rootStats.private,
              pub: rootStats.public,
              priv: rootStats.private,
            })
          }}
        </p>
      </div>

      <div class="mpage__actions">
        <button type="button" class="hdr-btn-outlined" @click="router.push('/media-optimize')">
          <AppIcon name="image" :size="13" />
          {{ t("mediaExplorer.action.mediaPanel") }}
        </button>
        <button type="button" class="hdr-btn-outlined" @click="router.push('/media-audit')">
          <AppIcon name="history" :size="13" />
          {{ t("mediaExplorer.action.audit") }}
        </button>
      </div>
    </header>

    <!-- ── Özet kartları — Medya ekranıyla aynı şerit dili ── -->
    <div class="mx__stats">
      <div class="mx__stat">
        <span class="mx__stat-label">{{ t("mediaExplorer.stat.total") }}</span>
        <strong>{{ rootStats.public + rootStats.private }}</strong>
        <small>{{ t("mediaExplorer.stat.totalNote") }}</small>
      </div>
      <div class="mx__stat">
        <span class="mx__stat-label">{{ t("mediaExplorer.folder.public") }}</span>
        <strong>{{ rootStats.public }}</strong>
        <small>{{ t("mediaExplorer.stat.publicNote") }}</small>
      </div>
      <div class="mx__stat">
        <span class="mx__stat-label">{{ t("mediaExplorer.folder.private") }}</span>
        <strong>{{ rootStats.private }}</strong>
        <small>{{ t("mediaExplorer.stat.privateNote") }}</small>
      </div>
      <div class="mx__stat mx__stat--here">
        <span class="mx__stat-label">{{ t("mediaExplorer.stat.here") }}</span>
        <strong>{{ currentCount }}</strong>
        <small class="mx__truncate">{{ breadcrumb[breadcrumb.length - 1].label }}</small>
      </div>
    </div>

    <!-- ── Araç şeridi: breadcrumb + arama ── -->
    <div class="card mx__toolbar">
      <nav class="mx__crumbs" :aria-label="t('mediaExplorer.title')">
        <template v-for="(c, i) in breadcrumb" :key="c.key">
          <button
            v-if="i < breadcrumb.length - 1"
            type="button"
            class="mx__crumb mx__crumb--link"
            @click="jump(c.key)"
          >
            <AppIcon v-if="i === 0" name="folder" :size="13" />
            {{ c.label }}
          </button>
          <span v-else class="mx__crumb mx__crumb--here">{{ c.label }}</span>
          <AppIcon
            v-if="i < breadcrumb.length - 1"
            name="chevron-right"
            :size="13"
            class="mx__sep"
          />
        </template>
      </nav>

      <div v-if="atFileLevel" class="mx__search">
        <AppIcon name="search" :size="13" class="mx__search-icon" />
        <input
          v-model="search"
          type="text"
          class="form-input-sm w-full !pl-9"
          :placeholder="t('mediaExplorer.searchPlaceholder')"
          @keyup.enter="applySearch"
        />
      </div>
    </div>

    <div v-if="loading" class="card mx__empty-card">{{ t("mediaExplorer.loading") }}</div>

    <!-- ── Klasör ızgarası ── -->
    <div v-else-if="!atFileLevel" class="mx__grid">
      <button
        v-for="f in folders"
        :key="f.id"
        type="button"
        class="card mx__folder"
        @click="enterAndRemember(f)"
      >
        <span class="mx__folder-icon"><AppIcon :name="folderIcon(f)" :size="22" /></span>
        <span class="mx__folder-name">{{ specialLabel(f) }}</span>
        <span class="mx__folder-count">{{ t("mediaExplorer.fileCount", { n: f.count }) }}</span>
      </button>
      <p v-if="!folders.length" class="card mx__empty-card">{{ t("mediaExplorer.empty") }}</p>
    </div>

    <!-- ── Dosya listesi — Medya ekranının liste görünümüyle aynı dil ── -->
    <template v-else>
      <div class="card mx__list">
        <div v-for="item in files" :key="item.name" class="mx__row">
          <img
            v-if="canThumb(item)"
            class="mx__thumb"
            :src="item.file_url"
            :alt="item.file_name"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="mx__thumb mx__thumb--ph">{{ extOf(item) }}</span>

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

      <div class="mpage__pagination">
        <ListPagination
          v-if="total > pageSize"
          :model-value="page"
          :total="total"
          :page-size="pageSize"
          @update:model-value="setPage"
        />
      </div>
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
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Yerleşim ve başlık ölçüleri Medya (MediaOptimize) ekranıyla birebir —
  // iki ekran aynı ailenin iki yüzü, ayrı görünmemeli.
  .mpage {
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;
  }

  .mpage__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
    flex-wrap: wrap;
    margin-bottom: media.$s-5;

    @include dark {
      background-color: transparent !important;
    }
  }

  .mpage__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    @include media.heading;
  }

  .mpage__title-icon {
    color: $brand;
  }

  .mpage__subtitle {
    margin: 2px 0 0;
    font-size: 12px;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .mpage__actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  .mpage__pagination {
    margin-top: media.$s-3;
  }

  // ── Özet kartları — mo__stats ile aynı ölçüler ───────────────────
  .mx__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin-bottom: media.$s-4;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .mx__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: 0.6rem;
    @include media.surface("soft");

    strong {
      font-size: 0.95rem;
      font-weight: 700;
      @include media.numeric;
    }

    small {
      @include media.text("xs");
      @include media.muted(2);
    }
  }

  .mx__stat--here strong {
    color: $brand;
  }

  .mx__stat-label {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mx__truncate {
    @include media.truncate;
  }

  // ── Araç şeridi ──────────────────────────────────────────────────
  .mx__toolbar {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    flex-wrap: wrap;
    margin-bottom: media.$s-3;
  }

  .mx__crumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    flex: 1 1 auto;
    min-width: 0;
    @include media.text("sm");
  }

  .mx__crumb {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
  }

  .mx__crumb--link {
    cursor: pointer;
    @include media.muted(1);
    @include media.hoverable;
  }

  .mx__crumb--here {
    color: $brand;
  }

  .mx__sep {
    @include media.muted(2);
  }

  .mx__search {
    position: relative;
    flex: 0 1 18rem;
    min-width: 12rem;
  }

  .mx__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: $l-text-300;
  }

  // ── Klasör ızgarası ──────────────────────────────────────────────
  .mx__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: media.$s-3;
  }

  .mx__folder {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: media.$s-1;
    padding: media.$s-4;
    text-align: left;
    cursor: pointer;
    @include media.hoverable;
    @include media.press;
  }

  .mx__folder-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    color: $brand;
    background: rgba(217, 165, 20, 0.1);
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

  // ── Dosya listesi — mo__list satır dili ──────────────────────────
  .mx__list {
    display: flex;
    flex-direction: column;
  }

  .mx__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3;
    @include media.divider(bottom);
    @include media.hoverable;

    &:last-child {
      border-bottom: none;
    }
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
      border: 1px dashed $l-border;
      background: $l-bg-soft;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      @include media.muted(1);

      @include dark {
        border-color: $d-border;
        background: $d-bg-card;
      }
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
    @include media.truncate;
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
    white-space: nowrap;

    &--warn {
      background: rgba(217, 119, 6, 0.12);
      color: #b45309;
    }
  }

  .mx__link {
    @include media.text("xs");
    font-weight: 600;
    color: $brand;
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

  .mx__empty,
  .mx__empty-card {
    padding: media.$s-6 media.$s-3;
    text-align: center;
    @include media.text("sm");
    @include media.muted(1);
  }

  .mx__empty-card {
    grid-column: 1 / -1;
  }
</style>
