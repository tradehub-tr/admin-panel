<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import MediaCrumbs from "@/components/media/MediaCrumbs.vue";
  import MediaFolderGrid from "@/components/media/MediaFolderGrid.vue";
  import MediaImage from "@/components/media/MediaImage.vue";
  import MediaRenditionList from "@/components/media/MediaRenditionList.vue";
  import api from "@/utils/api";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import { useMediaAccess } from "@/composables/useMediaAccess";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const access = useMediaAccess();

  const M = "tradehub_core.api.media_admin";

  // Backend'in sanal klasör sabitleri (media/browse.py) — birebir aynı.
  const PLATFORM_STORE = "__platform__";
  const NO_CATEGORY = "__none__";
  const UNUSED = "__unused__";
  const OTHER_GROUP = "__other__";

  // ── Konum: klasör derinliği bu altı alandan türer ─────────────────
  const path = ref({ scope: "", store: "", category: "", group: "", sub: "", docField: "" });
  const folders = ref([]);
  const files = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const search = ref("");
  const loading = ref(false);
  const loadFailed = ref(false);
  const rootStatsReady = ref(false);

  // Sol ağaç için kök sayıları — konumdan bağımsız sabit kalır.
  const rootStats = ref({ public: 0, private: 0, chat: 0 });

  // Dosya seviyesinde miyiz — yanıttan anlaşılır (data.items var/yok):
  // KYB/KYC gibi detaylı gruplar grup klasörünün altında bir mağaza seviyesi
  // daha açar, derinliği path'ten türetmek bu yüzden artık yeterli değil.
  const atFileLevel = ref(false);

  const currentCount = computed(() =>
    atFileLevel.value ? total.value : folders.value.reduce((s, f) => s + (f.count || 0), 0)
  );

  async function load() {
    loading.value = true;
    loadFailed.value = false;
    try {
      const p = path.value;
      const res = await api.callMethodGET(`${M}.browse_media`, {
        scope: p.scope,
        store: p.store,
        category: p.category,
        group: p.group,
        sub: p.sub,
        doc_field: p.docField,
        page: page.value,
        page_size: pageSize.value,
        search: search.value,
      });
      const data = res.message;
      if (!data || (!Array.isArray(data.folders) && !Array.isArray(data.items))) {
        throw new Error(t("mediaExplorer.loadFailed"));
      }
      atFileLevel.value = Array.isArray(data.items);
      folders.value = data.folders || [];
      files.value = data.items || [];
      total.value = data.total || 0;
      if (!path.value.scope) {
        rootStatsReady.value = true;
        const byId = Object.fromEntries((data.folders || []).map((f) => [f.id, f.count || 0]));
        rootStats.value = {
          public: byId.public || 0,
          private: byId.private || 0,
          chat: byId.chat || 0,
        };
      }
    } catch {
      loadFailed.value = true;
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
    if (folder.id === "chat") return t("mediaExplorer.folder.chat");
    if (folder.id === PLATFORM_STORE) return t("mediaExplorer.folder.platform");
    if (folder.id === NO_CATEGORY) return t("mediaExplorer.folder.uncategorized");
    if (folder.id === UNUSED) return t("mediaExplorer.folder.unused");
    if (folder.id === OTHER_GROUP) {
      // Bağlam: grup listesinde "bağsız belge", mağaza listesinde "mağazasız",
      // belge-alanı listesinde "serbest ekler".
      if (path.value.sub) return t("mediaExplorer.folder.freeAttach");
      if (path.value.group || path.value.scope === "chat")
        return t("mediaExplorer.folder.storeless");
      return t("mediaExplorer.folder.other");
    }
    // Belge-alanı klasörleri (mağaza seçiliyken): alan adını Türkçeleştir.
    if (path.value.sub && !path.value.docField) return docFieldLabel(folder.id);
    return folder.label || folder.id;
  }

  function docFieldLabel(id) {
    const key = `mediaExplorer.docField.${id}`;
    const label = t(key);
    return label === key ? id : label;
  }

  function folderIcon(folder) {
    if (folder.id === "private") return "lock";
    if (folder.id === "public") return "globe";
    if (folder.id === "chat") return "message-circle";
    if (folder.id === PLATFORM_STORE) return "layout-grid";
    if (folder.id === UNUSED) return "unlink";
    return "folder";
  }

  /** Izgaranın çizeceği hâl — ad, ikon ve sayaç metni burada hazırlanır. */
  const gridItems = computed(() =>
    folders.value.map((f) => ({
      ...f,
      label: specialLabel(f),
      icon: folderIcon(f),
      countText: t("mediaExplorer.fileCount", { n: f.count }),
    }))
  );

  function enter(folder) {
    const p = { ...path.value };
    if (!p.scope) p.scope = folder.id;
    else if (p.scope === "chat") p.store = folder.id;
    else if (p.scope === "public" && !p.store) p.store = folder.id;
    else if (p.scope === "public") p.category = folder.id;
    else if (p.scope === "private" && !p.group) p.group = folder.id;
    else if (p.scope === "private" && !p.sub) p.sub = folder.id;
    else if (p.scope === "private") p.docField = folder.id;
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
          p.sub === OTHER_GROUP
            ? t("mediaExplorer.folder.storeless")
            : crumbLabels.value[p.sub] || p.sub,
      });
    if (p.docField)
      items.push({
        key: "docField",
        label:
          p.docField === OTHER_GROUP
            ? t("mediaExplorer.folder.freeAttach")
            : docFieldLabel(p.docField),
      });
    return items;
  });

  function jump(key) {
    const p = { ...path.value };
    if (key === "root")
      Object.assign(p, { scope: "", store: "", category: "", group: "", sub: "", docField: "" });
    else if (key === "scope")
      Object.assign(p, { store: "", category: "", group: "", sub: "", docField: "" });
    else if (key === "store") Object.assign(p, { category: "" });
    else if (key === "group") Object.assign(p, { sub: "", docField: "" });
    else if (key === "sub") Object.assign(p, { docField: "" });
    path.value = p;
    page.value = 1;
    search.value = "";
    load();
  }

  function enterAndRemember(folder) {
    // Izgara kalemi görünen adı zaten taşıyor (`gridItems`).
    crumbLabels.value[folder.id] = folder.label || specialLabel(folder);
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
        toast.success(
          t("mediaAccess.toast.linkCopied", { minutes: Math.round((ttl || 900) / 60) })
        );
      } else {
        toast.error(t("mediaAccess.toast.copyFailed"));
      }
    } catch (e) {
      toast.error(e.message || t("mediaAccess.toast.failed"));
    }
  }

  // Medya ekranıyla aynı kısa sayısal tarih: "12.08.26".
  function fmtDate(v) {
    if (!v) return "";
    const d = new Date(String(v).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
  }
  // Türevi olan dosya uzantıdan bağımsız gösterilebilir; özel dosyanın
  // önizlemesi imzalı bağlantı olmadan servis edilmediği için hep kapalı.
  const canThumb = (item) =>
    !item.is_private && (!!item.thumb_url || canRenderThumb(item.file_url || ""));

  /** "TIF" / "PNG" tip rozeti — Medya ekranındaki liste satırlarıyla aynı dil. */
  function extOf(item) {
    const m2 = /\.([a-z0-9]+)$/i.exec(item.file_name || item.file_url || "");
    return (m2?.[1] || "?").toUpperCase().slice(0, 4);
  }

  // Önizlemesi gösterilemeyen dosyanın karo tonu — Medya mozaiğiyle aynı dil.
  const TILE_TONES = {
    MP4: "video",
    WEBM: "video",
    MOV: "video",
    M4V: "video",
    TIF: "tif",
    TIFF: "tif",
    PNG: "png",
    JPG: "warm",
    JPEG: "warm",
    WEBP: "warm",
    GIF: "warm",
    AVIF: "warm",
  };
  const tileTone = (item) => TILE_TONES[extOf(item)] || "file";

  // ── Sol ağaç ──────────────────────────────────────────────────────
  const treeScopes = computed(() => [
    {
      id: "public",
      label: t("mediaExplorer.folder.public"),
      icon: "globe",
      count: rootStats.value.public,
    },
    {
      id: "private",
      label: t("mediaExplorer.folder.private"),
      icon: "lock",
      count: rootStats.value.private,
    },
    {
      id: "chat",
      label: t("mediaExplorer.folder.chat"),
      icon: "message-circle",
      count: rootStats.value.chat,
    },
  ]);

  // Aktif kapsamın altında inilen yolun omurgası (breadcrumb'ın kapsam
  // sonrası kalemleri) — ağaçta konum daima görünür kalır.
  const treeSpine = computed(() => breadcrumb.value.slice(2));

  function goScope(id) {
    path.value = { scope: id, store: "", category: "", group: "", sub: "", docField: "" };
    page.value = 1;
    search.value = "";
    load();
  }

  // ── Denetçi: seçili dosya ─────────────────────────────────────────
  const selected = ref(null);
  const renditionsOpen = ref(false);

  watch(files, (list) => {
    selected.value = list?.[0] || null;
    renditionsOpen.value = false;
  });

  function pick(item) {
    if (selected.value?.name !== item.name) renditionsOpen.value = false;
    selected.value = item;
  }

  function accessLabel(item) {
    if (item.chat) return t("mediaExplorer.folder.chat");
    return item.is_private ? t("mediaExplorer.folder.private") : t("mediaExplorer.folder.public");
  }

  /**
   * Ekran okuyucu duyurusu. Klasör değiştirmek sayfayı yeniden yüklemiyor;
   * canlı bölge olmadan görme engelli kullanıcı için hiçbir şey olmuyor gibi
   * görünüyordu.
   */
  const statusText = computed(() => {
    if (loading.value) return t("mediaExplorer.loading");
    if (loadFailed.value) return t("mediaExplorer.loadFailed");
    if (atFileLevel.value) return t("mediaExplorer.status.files", { n: files.value.length });
    return t("mediaExplorer.status.folders", { n: folders.value.length });
  });

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
        <p v-if="rootStatsReady && !loadFailed" class="mpage__subtitle">
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

    <!-- ── Ağaç + içerik yerleşimi ── -->
    <div class="mx__layout">
      <!-- Sol ağaç: kapsamlar + inilen yolun omurgası. Konum hep görünür. -->
      <aside class="card mx__nav" :aria-label="t('mediaExplorer.folderGridAria')">
        <button
          type="button"
          class="mx__tr"
          :class="{ 'mx__tr--on': !path.scope }"
          @click="jump('root')"
        >
          <AppIcon name="folder" :size="13" />
          <span class="mx__tr-label">{{ t("mediaExplorer.root") }}</span>
          <span v-if="rootStatsReady && !loadFailed" class="mx__tr-n">{{
            rootStats.public + rootStats.private + rootStats.chat
          }}</span>
        </button>
        <div class="mx__tr-kids">
          <template v-for="s in treeScopes" :key="s.id">
            <button
              type="button"
              class="mx__tr"
              :class="{ 'mx__tr--on': path.scope === s.id && breadcrumb.length === 2 }"
              @click="goScope(s.id)"
            >
              <AppIcon :name="s.icon" :size="13" />
              <span class="mx__tr-label">{{ s.label }}</span>
              <span v-if="rootStatsReady && !loadFailed" class="mx__tr-n">{{ s.count }}</span>
            </button>
            <div v-if="path.scope === s.id && treeSpine.length" class="mx__tr-kids">
              <button
                v-for="(c, i) in treeSpine"
                :key="c.key"
                type="button"
                class="mx__tr"
                :class="{ 'mx__tr--on': i === treeSpine.length - 1 }"
                :style="{ paddingInlineStart: `${10 + i * 12}px` }"
                @click="jump(c.key)"
              >
                <span class="mx__tr-label">{{ c.label }}</span>
                <span
                  v-if="i === treeSpine.length - 1 && !loading && !loadFailed"
                  class="mx__tr-n"
                  >{{ currentCount }}</span
                >
              </button>
            </div>
          </template>
        </div>
      </aside>

      <div class="mx__main">
        <!-- ── Araç şeridi: breadcrumb + arama ── -->
        <div class="card mx__toolbar">
          <MediaCrumbs :items="breadcrumb" :aria-label="t('mediaExplorer.title')" @jump="jump" />

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

        <!-- Klasör değişimi sayfa yenilemiyor; duyuru bu bölgeden gider. -->
        <p class="mx__sr" role="status" aria-live="polite">{{ statusText }}</p>

        <div v-if="loading" class="card mx__empty-card">{{ t("mediaExplorer.loading") }}</div>

        <div v-else-if="loadFailed" class="card mx__empty-card" role="alert">
          <p>{{ t("mediaExplorer.loadFailed") }}</p>
          <button type="button" class="hdr-btn-outlined mt-3" @click="load">
            <AppIcon name="refresh-cw" :size="13" />
            {{ t("mediaExplorer.retry") }}
          </button>
        </div>

        <!-- ── Klasör ızgarası ── -->
        <MediaFolderGrid
          v-else-if="!atFileLevel"
          :items="gridItems"
          :empty-text="t('mediaExplorer.empty')"
          :aria-label="t('mediaExplorer.folderGridAria')"
          @select="enterAndRemember"
        />

        <!-- ── Dosya seviyesi: mozaik + denetçi ── -->
        <template v-else>
          <div class="mx__workspace">
            <div class="mx__mosaic-col">
              <div v-if="files.length" class="mx__mosaic">
                <button
                  v-for="item in files"
                  :key="item.name"
                  type="button"
                  class="mx__tile"
                  :class="{ 'mx__tile--on': selected?.name === item.name }"
                  :title="item.file_name || item.file_url"
                  @click="pick(item)"
                >
                  <MediaImage
                    v-if="canThumb(item)"
                    class="mx__tile-img"
                    :src="item.thumb_url || item.file_url"
                    :alt="item.file_name"
                    :width="160"
                    :height="160"
                  />
                  <span v-else class="mx__tile-ph" :class="`mx__tile-ph--${tileTone(item)}`">
                    <AppIcon v-if="tileTone(item) === 'video'" name="circle-play" :size="18" />
                    {{ extOf(item) }}
                  </span>
                  <span v-if="item.is_private" class="mx__tile-lock" aria-hidden="true">
                    <AppIcon name="lock" :size="10" />
                  </span>
                  <span class="mx__tile-strip">{{ item.file_name || item.file_url }}</span>
                </button>
              </div>
              <p v-else class="card mx__empty">{{ t("mediaExplorer.empty") }}</p>

              <div class="mpage__pagination">
                <ListPagination
                  v-if="total > pageSize"
                  :model-value="page"
                  :total="total"
                  :page-size="pageSize"
                  @update:model-value="setPage"
                />
              </div>
            </div>

            <!-- Denetçi: seçili dosyanın kimliği ve eylemleri -->
            <aside v-if="selected" class="card mx__insp">
              <div class="mx__insp-prev">
                <MediaImage
                  v-if="canThumb(selected)"
                  class="mx__insp-img"
                  :src="selected.preview_url || selected.file_url"
                  :alt="selected.file_name"
                  :width="480"
                  :height="330"
                />
                <span
                  v-else
                  class="mx__tile-ph mx__insp-ph"
                  :class="`mx__tile-ph--${tileTone(selected)}`"
                >
                  <AppIcon v-if="tileTone(selected) === 'video'" name="circle-play" :size="26" />
                  {{ extOf(selected) }}
                </span>
              </div>
              <div class="mx__insp-body">
                <div class="mx__insp-name" :title="selected.file_name || selected.file_url">
                  {{ selected.file_name || selected.file_url }}
                </div>
                <dl class="mx__insp-meta">
                  <div class="mx__insp-row">
                    <dt>{{ t("mediaExplorer.insp.size") }}</dt>
                    <dd>{{ formatSize(selected.file_size || 0) }}</dd>
                  </div>
                  <div class="mx__insp-row">
                    <dt>{{ t("mediaExplorer.insp.date") }}</dt>
                    <dd>{{ fmtDate(selected.creation) }}</dd>
                  </div>
                  <div class="mx__insp-row">
                    <dt>{{ t("mediaExplorer.insp.access") }}</dt>
                    <dd>{{ accessLabel(selected) }}</dd>
                  </div>
                  <!-- Sohbet eki: dosya dış serviste — kim gönderdi + hangi konuşma. -->
                  <div v-if="selected.chat" class="mx__insp-row">
                    <dt>{{ t("mediaExplorer.chatSender") }}</dt>
                    <dd>{{ selected.sender }} · #{{ selected.conversation_id }}</dd>
                  </div>
                </dl>
                <span
                  v-if="selected.pii"
                  class="mx__pill mx__pill--warn"
                  :title="t('mediaAccess.badge.piiHint')"
                >
                  {{ t("mediaAccess.badge.pii") }}
                </span>
                <div class="mx__insp-acts">
                  <template v-if="selected.is_private && !selected.chat">
                    <button
                      type="button"
                      class="mx__link"
                      :disabled="access.busy.value"
                      :title="t('mediaAccess.action.signedLinkHint')"
                      @click="copySignedLink(selected)"
                    >
                      {{ t("mediaAccess.action.signedLink") }}
                    </button>
                    <button
                      v-if="!selected.pii"
                      type="button"
                      class="mx__link"
                      :disabled="access.busy.value"
                      @click="accessConfirm = { item: selected, makePrivate: false }"
                    >
                      {{ t("mediaAccess.action.makePublic") }}
                    </button>
                  </template>
                  <button
                    v-else-if="!selected.chat"
                    type="button"
                    class="mx__link"
                    :disabled="access.busy.value"
                    :title="t('mediaAccess.action.makePrivateHint')"
                    @click="accessConfirm = { item: selected, makePrivate: true }"
                  >
                    {{ t("mediaAccess.action.makePrivate") }}
                  </button>
                  <!-- Sohbet ekinin dosyası bizde değil; türev de üretilmez. -->
                  <button
                    v-if="!selected.chat"
                    type="button"
                    class="mx__link"
                    :aria-expanded="renditionsOpen"
                    aria-controls="mx-insp-rend"
                    @click="renditionsOpen = !renditionsOpen"
                  >
                    {{ t("mediaExplorer.action.renditions") }}
                  </button>
                </div>
                <div v-if="renditionsOpen" id="mx-insp-rend" class="mx__insp-rend">
                  <MediaRenditionList :file-name="selected.name" />
                </div>
              </div>
            </aside>
          </div>
        </template>
      </div>
    </div>

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

  // ── Ağaç + içerik yerleşimi ──────────────────────────────────────
  .mx__layout {
    display: grid;
    grid-template-columns: 15rem minmax(0, 1fr);
    gap: media.$s-3;
    align-items: start;

    @media (max-width: 1023px) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .mx__nav {
    padding: media.$s-2;
    position: sticky;
    top: media.$m-sticky-top;

    // Telefonda ray ayrı sütun değil, içeriğin ÜSTÜNDE tek sütunda duruyor.
    // Sticky kalınca klasör ağacı ekranın yarısını kaplayıp satıcı kartlarının
    // üstüne biniyordu; kullanıcı "sabit yerinde kalsın" dedi.
    @media (max-width: 1023px) {
      position: static;
    }
  }

  .mx__main {
    min-width: 0;
  }

  .mx__tr {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    width: 100%;
    padding: 0.375rem 0.625rem;
    border: 0;
    border-radius: media.$r-md;
    background: none;
    font: inherit;
    @include media.text("sm");
    font-weight: 600;
    color: $l-text-700;
    text-align: start;
    cursor: pointer;
    @include media.focus-ring;

    @include dark {
      color: $d-text;
    }

    @include media.hoverable {
      &:hover {
        background: $l-bg-subtle;

        @include dark {
          background: $d-item-hover;
        }
      }
    }
  }

  .mx__tr--on {
    background: rgba($brand, 0.16);
    color: $brand-text;

    @include dark {
      background: rgba($brand, 0.14);
      color: $brand-light;
    }
  }

  .mx__tr-label {
    flex: 1;
    min-width: 0;
    @include media.truncate;
  }

  .mx__tr-n {
    @include media.text("xs");
    font-weight: 700;
    @include media.muted(2);
    @include media.numeric;
  }

  .mx__tr--on .mx__tr-n {
    color: inherit;
    opacity: 0.75;
  }

  .mx__tr-kids {
    margin-inline-start: 0.875rem;
    padding-inline-start: 0.25rem;
    border-inline-start: 1px solid $l-border-alt;

    @include dark {
      border-inline-start-color: $d-border-inner;
    }
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

  // ── Dosya seviyesi: mozaik + denetçi ─────────────────────────────
  .mx__workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 16.5rem;
    gap: media.$s-3;
    align-items: start;

    @media (max-width: 1023px) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .mx__mosaic-col {
    min-width: 0;
  }

  .mx__mosaic {
    display: grid;
    // Medya ve SEO mozaikleriyle aynı geometri — üç ekran tek dil.
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: media.$s-2;
  }

  .mx__tile {
    position: relative;
    aspect-ratio: 1;
    padding: 0;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg;
    overflow: hidden;
    cursor: pointer;
    @include media.focus-ring;

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }

    @include media.hoverable {
      &:hover {
        box-shadow: 0 6px 16px rgb(29 28 25 / 12%);
      }
    }
  }

  .mx__tile--on {
    border-color: $brand;
    box-shadow: 0 0 0 2px rgba($brand, 0.45);
  }

  .mx__tile-img,
  .mx__tile :deep(img) {
    // Aynı döngüsel hesap tuzağı (bkz. mo__mcard-tile): mutlak konum şart.
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    // Görsel kırpılmaz, karoya sığar (öneri 6, 2026-09-09): `cover` ürünün
    // kenarını kesiyordu. İç pay + alttaki ad şeridi kadar boşluk.
    object-fit: contain;
    box-sizing: border-box;
    padding: media.$s-2 media.$s-2 calc(1.75rem + #{media.$s-1});
    background: $l-bg;

    @include dark {
      background: $d-bg-card;
    }
  }

  .mx__tile-ph {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: media.$s-1;
    width: 100%;
    height: 100%;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;

    &--video {
      background: linear-gradient(135deg, #2b2a27, #514e48);
      color: #fff;
    }

    &--warm {
      background: #fdf4d8;
      color: $c-warning-text;

      @include dark {
        background: media.$tint-warning;
        color: $c-warning;
      }
    }

    &--png {
      background: #e6eefc;
      color: $c-info-text;

      @include dark {
        background: media.$tint-info;
        color: $c-info;
      }
    }

    &--tif {
      background: #f0e9fb;
      color: #6d28d9;

      @include dark {
        background: rgb(139 92 246 / 14%);
        color: media.$c-archive;
      }
    }

    &--file {
      background: $l-bg-muted;
      color: $l-text-500;

      @include dark {
        background: $d-bg-elevated;
        color: $d-text-muted;
      }
    }
  }

  // Ad şeridi — Medya/SEO mozaikleriyle aynı davranış: imleçte hover,
  // dokunmatikte kalıcı.
  // Ad şeridi görselin ÜSTÜNE değil ALTINA: gradyan üstündeki beyaz yazı
  // açık ürün fotoğrafında kontrastı kaybediyordu; düz bant 4.5:1 garanti
  // (öneri 6). Hover'a bağlı gizlenme kalktı — ad her zaman okunur.
  .mx__tile-strip {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 1;
    min-height: 1.75rem;
    padding: media.$s-1 media.$s-2;
    box-sizing: border-box;
    background: $l-bg;
    border-top: 1px solid $l-border-alt;
    color: $l-text-700;
    @include media.text("xs");
    font-weight: 600;
    text-align: start;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include dark {
      background: $d-bg-card;
      border-top-color: $d-border;
      color: $d-text;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .mx__tile-lock {
    position: absolute;
    top: 6px;
    inset-inline-end: 6px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    background: rgb(29 28 25 / 55%);
    color: #fff;
  }

  // ── Denetçi ──────────────────────────────────────────────────────
  .mx__insp {
    padding: 0;
    overflow: hidden;
    position: sticky;
    top: media.$m-sticky-top;

    // Aynı gerekçe: tek sütunda denetçi de akışta kalsın.
    @media (max-width: 1023px) {
      position: static;
    }
  }

  .mx__insp-prev {
    position: relative;
    // Kare kutu — kullanım diyaloğuyla aynı karar.
    aspect-ratio: 1;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }

    :deep(img) {
      // Akış içi `height: 100%` aspect-ratio'lu kutuyla döngüsel hesaba
      // düşüyor (bkz. MediaUsageDialog'daki ölçüm) — mutlak konum şart.
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  }

  .mx__insp-ph {
    font-size: 0.8rem;
  }

  .mx__insp-body {
    padding: media.$s-3;
  }

  .mx__insp-name {
    @include media.text("sm");
    font-weight: 700;
    word-break: break-all;
  }

  .mx__insp-meta {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    margin: media.$s-2 0 0;
  }

  .mx__insp-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: media.$s-2;
    @include media.text("xs");

    dt {
      @include media.muted(1);
    }

    dd {
      margin: 0;
      font-weight: 600;
      text-align: end;
      @include media.numeric;
    }
  }

  .mx__insp-acts {
    display: flex;
    gap: media.$s-3;
    flex-wrap: wrap;
    margin-top: media.$s-3;
  }

  .mx__insp-rend {
    margin-top: media.$s-2;
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
    color: $brand-text;
    cursor: pointer;
    white-space: nowrap;

    @include dark {
      color: $brand;
    }

    &:hover {
      text-decoration: underline;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  // Duyuru bölgesi görsel olarak gizli: bilgi zaten ekranda var, ekranda
  // ikinci kez yazmak görene gürültü olurdu.
  .mx__sr {
    @include media.sr-only;
  }

  .mx__empty,
  .mx__empty-card {
    padding: media.$s-6 media.$s-3;
    text-align: center;
    @include media.text("sm");
    @include media.muted(1);
  }
</style>
