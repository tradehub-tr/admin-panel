<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import MediaBulkBar from "@/components/media/MediaBulkBar.vue";
  import MediaCrumbs from "@/components/media/MediaCrumbs.vue";
  import MediaFolderGrid from "@/components/media/MediaFolderGrid.vue";
  import MediaImage from "@/components/media/MediaImage.vue";
  import api from "@/utils/api";
  import { formatDay } from "@/utils/dateFormat";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import { useMediaBrowser } from "@/composables/useMediaBrowser";
  import { useSellerMedia } from "@/composables/useSellerMedia";
  import { useToast } from "@/composables/useToast";

  /**
   * Satıcı Medya Gezgini.
   *
   * Kütüphane ekranı (`MediaLibraryView`) düz bir listedir: dosya çoksa hangi
   * görselin hangi üründe durduğu görünmez. Burada aynı dosyalar ağaç olarak
   * geziliyor:
   *
   *     Mağaza dosyalarım/     Özel dosyalarım/     Sohbet eklerim/
   *       <kategori>/            (dosyalar)           (dosyalar)
   *         <ürün>/
   *           (dosyalar)
   *
   * **Mağaza istemciden GÖNDERİLMEZ.** Sunucu mağazayı oturumdan çözer; bu
   * yüzden ekranda mağaza seçtiren hiçbir alan yok ve uca `store` parametresi
   * geçilmiyor. Parametre olsaydı konsoldan başka bir mağazanın kodu yazılıp
   * verisi istenebilirdi — izolasyon buna dayanıyor (`useSellerMedia.js` ile
   * aynı kural).
   *
   * Uç henüz yayında olmayabilir: `useMediaBrowser.load` hata fırlatmaz, boş
   * klasör + açıklama satırı gösterir.
   */

  const { t, locale } = useI18n();
  const router = useRouter();

  const YOL = "tradehub_core.api.seller_media";

  const browser = useMediaBrowser({
    keys: ["scope", "category", "listing"],
    rootLabel: () => t("sellerMediaExplorer.root"),
    fetchLevel: async ({ scope, category, listing, page, page_size, search }) => {
      const res = await api.callMethodGET(`${YOL}.browse_my_media`, {
        scope,
        category,
        listing,
        page,
        page_size,
        search,
      });
      // Frappe gövdeyi `message` içine sarar.
      return res?.message ?? res ?? {};
    },
  });

  const {
    path,
    folders,
    files,
    total,
    page,
    pageSize,
    search,
    loading,
    error,
    atFileLevel,
    breadcrumb,
    currentCount,
    load,
    enter,
    jump,
    setPage,
    applySearch,
  } = browser;

  onMounted(load);

  // ── Gerçek klasörler (T-094) ─────────────────────────────────────
  //
  // Sanal ağacın (yukarıdaki browser) yanına satıcının KENDİ açtığı klasörler
  // geliyor. İki ağaç bilerek ayrı durumda tutuluyor: sanal ağaç sunucuda
  // kategoriden türetilir ve `useMediaBrowser`'ın sabit seviye anahtarlarıyla
  // (`scope/category/listing`) gezilir; gerçek ağacın derinliği ise satıcının
  // elinde. Aynı composable'a sıkıştırmak iki modeli de eğip bükerdi.

  const media = useSellerMedia();
  const toast = useToast();

  /** Mağazanın tüm klasörleri — düz liste, ağaç `parent_folder` ile kurulur. */
  const realFolders = ref([]);
  /** Sunucunun derinlik tavanı — `list_folders` söyler, ekran uydurmaz. */
  const maxDepth = ref(5);

  async function loadFolders() {
    try {
      const res = await media.listFolders();
      realFolders.value = res.folders || [];
      if (res.max_depth) maxDepth.value = res.max_depth;
    } catch {
      // Uç henüz yayında olmayabilir — sanal gezgin çalışmaya devam eder.
      realFolders.value = [];
    }
  }
  onMounted(loadFolders);

  /** İçinde bulunulan gerçek klasör zinciri — boşsa gerçek klasörde değiliz. */
  const folderStack = ref([]);
  const inFolders = computed(() => folderStack.value.length > 0);
  const currentFolder = computed(() => folderStack.value[folderStack.value.length - 1] || null);

  const folderFiles = ref([]);
  const folderTotal = ref(0);
  const folderPage = ref(1);
  const FOLDER_PAGE_SIZE = 50;
  const folderSearch = ref("");
  const folderLoading = ref(false);
  const folderError = ref(false);

  async function loadFolderFiles() {
    if (!currentFolder.value) return;
    folderLoading.value = true;
    folderError.value = false;
    try {
      const res = await media.folderMedia(currentFolder.value.id, {
        page: folderPage.value,
        pageSize: FOLDER_PAGE_SIZE,
        search: folderSearch.value,
      });
      folderFiles.value = res.items;
      folderTotal.value = res.total;
    } catch {
      folderError.value = true;
      folderFiles.value = [];
      folderTotal.value = 0;
    } finally {
      folderLoading.value = false;
    }
  }

  function childrenOf(parent) {
    return realFolders.value.filter((f) => (f.parent_folder || "") === (parent || ""));
  }

  function enterFolder(item) {
    clearSelection();
    folderStack.value = [...folderStack.value, { id: item.id, label: item.label }];
    folderPage.value = 1;
    folderSearch.value = "";
    return loadFolderFiles();
  }

  // ── Klasör CRUD ──────────────────────────────────────────────────
  //
  // Ad `prompt`, silme `confirm` ile soruluyor — panelin diğer satıcı
  // ekranlarıyla aynı dil (SellerCategoriesView). Dolu klasörü SUNUCU
  // reddeder; buradaki onay metni kural değil nezakettir.

  const opBusy = ref(false);

  /** Sanal alt ağacın içinde klasör açmak anlamsız — yalnız kökte ve gerçek
   *  klasör içinde açılır; tavana dayanınca düğme gizlenir. */
  const canCreateHere = computed(() => {
    if (inFolders.value) return folderStack.value.length < maxDepth.value;
    return !path.value.scope;
  });

  async function createFolderHere() {
    const ad = window.prompt(
      t("sellerMediaExplorer.folderOps.createPrompt", {}, "Yeni klasörün adı:")
    );
    if (!ad || !ad.trim() || opBusy.value) return;
    opBusy.value = true;
    try {
      await media.createFolder(ad.trim(), currentFolder.value?.id || "");
      toast.success(t("sellerMediaExplorer.folderOps.created", {}, "Klasör oluşturuldu"));
      await loadFolders();
    } catch (e) {
      toast.error(
        e?.message || t("sellerMediaExplorer.folderOps.failed", {}, "İşlem tamamlanamadı")
      );
    } finally {
      opBusy.value = false;
    }
  }

  async function renameCurrentFolder() {
    if (!currentFolder.value || opBusy.value) return;
    const ad = window.prompt(
      t("sellerMediaExplorer.folderOps.renamePrompt", {}, "Klasörün yeni adı:"),
      currentFolder.value.label
    );
    if (!ad || !ad.trim() || ad.trim() === currentFolder.value.label) return;
    opBusy.value = true;
    try {
      await media.renameFolder(currentFolder.value.id, ad.trim());
      folderStack.value = folderStack.value.map((f, i) =>
        i === folderStack.value.length - 1 ? { ...f, label: ad.trim() } : f
      );
      toast.success(t("sellerMediaExplorer.folderOps.renamed", {}, "Klasör adı değiştirildi"));
      await loadFolders();
    } catch (e) {
      toast.error(
        e?.message || t("sellerMediaExplorer.folderOps.failed", {}, "İşlem tamamlanamadı")
      );
    } finally {
      opBusy.value = false;
    }
  }

  async function deleteCurrentFolder() {
    if (!currentFolder.value || opBusy.value) return;
    const onay = window.confirm(
      t(
        "sellerMediaExplorer.folderOps.deleteConfirm",
        { name: currentFolder.value.label },
        "'{name}' klasörü silinsin mi? İçinde dosya ya da alt klasör varsa sunucu silmeyi reddeder."
      )
    );
    if (!onay) return;
    opBusy.value = true;
    try {
      await media.deleteFolder(currentFolder.value.id);
      toast.success(t("sellerMediaExplorer.folderOps.deleted", {}, "Klasör silindi"));
      folderStack.value = folderStack.value.slice(0, -1);
      await loadFolders();
      if (inFolders.value) await loadFolderFiles();
    } catch (e) {
      // En sık sebep: klasör dolu. Sunucunun gerekçesi kullanıcıya aynen gider.
      toast.error(
        e?.message || t("sellerMediaExplorer.folderOps.failed", {}, "İşlem tamamlanamadı")
      );
    } finally {
      opBusy.value = false;
    }
  }

  // ── Seçim + klasöre taşıma ───────────────────────────────────────

  const selected = ref(new Set());

  function toggleSelect(fileUrl) {
    const s = new Set(selected.value);
    if (s.has(fileUrl)) s.delete(fileUrl);
    else s.add(fileUrl);
    selected.value = s;
  }

  function clearSelection() {
    if (selected.value.size) selected.value = new Set();
  }

  /** Taşıma hedefleri — ağaç sırasında, derinlik "— " ile girintili. */
  const folderOptions = computed(() => {
    const out = [];
    const walk = (parent, depth) => {
      for (const f of childrenOf(parent)) {
        out.push({
          name: f.name,
          folder_name: f.folder_name,
          label: `${"— ".repeat(depth)}${f.folder_name}`,
        });
        walk(f.name, depth + 1);
      }
    };
    walk("", 0);
    return out;
  });

  const moveBusy = ref(false);
  /** Kısmi sonuç dökümü — MediaBulkBar'ın beklediği `{ok, failed, skipped}`. */
  const moveReport = ref(null);

  async function onMove(folderId) {
    if (!selected.value.size || moveBusy.value) return;
    moveBusy.value = true;
    moveReport.value = null;
    try {
      const res = await media.moveToFolder([...selected.value], folderId || "");
      const failed = (res.failed || []).map((f) => ({ id: f.file_url, error: f.error }));
      if (failed.length || res.skipped) {
        moveReport.value = { ok: res.moved || 0, failed, skipped: res.skipped || 0 };
      } else {
        toast.success(
          t("sellerMediaExplorer.folderOps.moved", { n: res.moved || 0 }, "{n} dosya taşındı")
        );
        clearSelection();
      }
      // Sayaçlar ve içinde durulan klasörün listesi değişmiş olabilir.
      await loadFolders();
      if (inFolders.value) await loadFolderFiles();
    } catch (e) {
      toast.error(
        e?.message || t("sellerMediaExplorer.folderOps.failed", {}, "İşlem tamamlanamadı")
      );
    } finally {
      moveBusy.value = false;
    }
  }

  // ── Kök klasörler ────────────────────────────────────────────────
  const ROOTS = {
    public: { icon: "globe", label: "sellerMediaExplorer.folder.public" },
    private: { icon: "lock", label: "sellerMediaExplorer.folder.private" },
    chat: { icon: "message-circle", label: "sellerMediaExplorer.folder.chat" },
  };

  /** Kök sayıları üst şeritte sabit kalır — klasöre girince sıfırlanmaz. */
  const rootStats = ref({ public: 0, private: 0, chat: 0 });
  watch(folders, (list) => {
    if (path.value.scope) return;
    const byId = Object.fromEntries(list.map((f) => [f.id, f.count || 0]));
    rootStats.value = {
      public: byId.public || 0,
      private: byId.private || 0,
      chat: byId.chat || 0,
    };
  });

  /** Gerçek klasörü ızgara kalemine çevir — sanal kalemlerden `real` ayırır. */
  function realGridItem(f) {
    return {
      id: f.name,
      real: true,
      label: f.folder_name,
      icon: "folder-open",
      countText: t("sellerMediaExplorer.fileCount", { n: f.file_count || 0 }),
    };
  }

  const gridItems = computed(() => {
    // Gerçek klasörün içi: yalnız alt klasörler.
    if (inFolders.value) return childrenOf(currentFolder.value.id).map(realGridItem);

    const sanal = folders.value.map((f) => ({
      ...f,
      label: folderLabel(f),
      icon: ROOTS[f.id]?.icon || "folder",
      countText: t("sellerMediaExplorer.fileCount", { n: f.count || 0 }),
    }));
    // Kökte iki ağaç yan yana: önce sanal kökler, sonra satıcının klasörleri.
    if (!path.value.scope) return [...sanal, ...childrenOf("").map(realGridItem)];
    return sanal;
  });

  function folderLabel(folder) {
    const root = !path.value.scope && ROOTS[folder.id];
    if (root) return t(root.label);
    return folder.label || folder.id;
  }

  function onSelect(item) {
    if (item.real) return enterFolder(item);
    clearSelection();
    // Kırıntı ham kimliği değil, kullanıcının tıkladığı adı göstersin.
    return enter(item, item.label);
  }

  // ── Mod köprüsü: sanal gezgin ↔ gerçek klasörler ─────────────────
  //
  // Şablon tek dil konuşur (kırıntı, arama, satır listesi, sayfalama);
  // aşağıdaki computed'lar hangi modda hangi durumun okunacağını seçer.

  const crumbItems = computed(() => {
    if (!inFolders.value) return breadcrumb.value;
    return [
      { key: "root", label: t("sellerMediaExplorer.root") },
      ...folderStack.value.map((f) => ({ key: f.id, label: f.label })),
    ];
  });

  function onJump(key) {
    clearSelection();
    if (!inFolders.value) return jump(key);
    if (key === "root") {
      folderStack.value = [];
      return;
    }
    const i = folderStack.value.findIndex((f) => f.id === key);
    if (i < 0 || i === folderStack.value.length - 1) return;
    folderStack.value = folderStack.value.slice(0, i + 1);
    folderPage.value = 1;
    folderSearch.value = "";
    return loadFolderFiles();
  }

  const isLoading = computed(() => loading.value || folderLoading.value);
  const showFiles = computed(() => (inFolders.value ? true : atFileLevel.value));
  /** Klasör modunda alt klasör yoksa ızgara hiç çizilmez — boş metni liste taşır. */
  const showGrid = computed(() =>
    inFolders.value ? gridItems.value.length > 0 : !atFileLevel.value
  );

  /**
   * Satır listesi — iki modda aynı şablon. Klasör satırları `bicimle`
   * biçiminden sanal satır biçimine çevrilir; şablon tek sözlük konuşur.
   */
  const rows = computed(() => {
    if (!inFolders.value) return files.value;
    return folderFiles.value.map((i) => ({
      name: i.docName || i.fileUrl,
      file_url: i.fileUrl,
      file_name: i.fileName,
      file_size: i.bytes,
      creation: i.uploadedAt,
    }));
  });

  const listTotal = computed(() => (inFolders.value ? folderTotal.value : total.value));
  const listPage = computed(() => (inFolders.value ? folderPage.value : page.value));
  const listPageSize = computed(() => (inFolders.value ? FOLDER_PAGE_SIZE : pageSize.value));

  function onSetPage(v) {
    clearSelection();
    if (!inFolders.value) return setPage(v);
    folderPage.value = v;
    return loadFolderFiles();
  }

  const searchModel = computed({
    get: () => (inFolders.value ? folderSearch.value : search.value),
    set: (v) => {
      if (inFolders.value) folderSearch.value = v;
      else search.value = v;
    },
  });

  function onSearch() {
    clearSelection();
    if (!inFolders.value) return applySearch();
    folderPage.value = 1;
    return loadFolderFiles();
  }

  /** Satır seçilebilir mi — sohbet ekinin dosya adresi yok, taşınamaz. */
  function selectable(item) {
    return Boolean(item.file_url) && !item.chat;
  }

  // ── Dosya satırları ──────────────────────────────────────────────
  /**
   * Satır küçük resminin kenarı — CSS'teki `.sx__thumb` ile aynı sayı.
   * `<img>`'e öznitelik olarak da basılıyor: kaynak inmeden önce tarayıcı
   * kutuyu 1:1 ayırsın, satırlar görsel indikçe zıplamasın.
   */
  const THUMB_PX = 44;

  const fmtDate = (v) => formatDay(v, locale.value);
  const canThumb = (item) => !item.is_private && canRenderThumb(item.file_url || "");

  /** Uzantı rozeti — kütüphane satırlarıyla aynı dil. */
  function extOf(item) {
    const m = /\.([a-z0-9]+)$/i.exec(item.file_name || item.file_url || "");
    return (m?.[1] || "?").toUpperCase().slice(0, 4);
  }

  /**
   * Dosyayı açan bağlantı.
   *
   * Adres sunucudan geliyor ama satır içine konmadan önce doğrulanıyor:
   * yalnız site-içi mutlak yol açılır (`javascript:` / `data:` engellenir).
   */
  function safeHref(url) {
    return typeof url === "string" && /^\/[^/]/.test(url) ? url : null;
  }

  const hasError = computed(() => (inFolders.value ? folderError.value : Boolean(error.value)));

  const emptyText = computed(() =>
    hasError.value ? t("sellerMediaExplorer.loadFailed") : t("sellerMediaExplorer.empty")
  );

  const hereCount = computed(() => (inFolders.value ? folderTotal.value : currentCount.value));
  const hereLabel = computed(() => crumbItems.value[crumbItems.value.length - 1]?.label || "");

  /**
   * Ekran okuyucu duyurusu. Klasöre girmek sayfayı yeniden yüklemiyor; canlı
   * bölge olmadan görme engelli kullanıcıya hiçbir şey olmamış gibi geliyordu.
   */
  const statusText = computed(() => {
    if (isLoading.value) return t("sellerMediaExplorer.loading");
    if (hasError.value) return t("sellerMediaExplorer.loadFailed");
    if (showFiles.value) return t("sellerMediaExplorer.status.files", { n: rows.value.length });
    return t("sellerMediaExplorer.status.folders", { n: gridItems.value.length });
  });
</script>

<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="folder" :size="16" class="mpage__title-icon" />
          {{ t("sellerMediaExplorer.title") }}
        </h1>
        <p class="mpage__subtitle">{{ t("sellerMediaExplorer.pageSubtitle") }}</p>
      </div>

      <div class="mpage__actions">
        <button type="button" class="hdr-btn-outlined" @click="router.push('/media-library')">
          <AppIcon name="image" :size="13" />
          {{ t("sellerMediaExplorer.action.library") }}
        </button>
      </div>
    </header>

    <!-- ── Özet kartları ── -->
    <div class="sx__stats">
      <div v-for="(meta, id) in ROOTS" :key="id" class="sx__stat">
        <span class="sx__stat-label">{{ t(meta.label) }}</span>
        <strong>{{ rootStats[id] || 0 }}</strong>
        <small>{{ t(`sellerMediaExplorer.stat.${id}Note`) }}</small>
      </div>
      <div class="sx__stat sx__stat--here">
        <span class="sx__stat-label">{{ t("sellerMediaExplorer.stat.here") }}</span>
        <strong>{{ hereCount }}</strong>
        <small class="sx__truncate">{{ hereLabel }}</small>
      </div>
    </div>

    <!-- ── Araç şeridi: kırıntı + klasör eylemleri + arama ── -->
    <div class="card sx__toolbar">
      <MediaCrumbs
        :items="crumbItems"
        :aria-label="t('sellerMediaExplorer.title')"
        @jump="onJump"
      />

      <!-- Gerçek klasör eylemleri (T-094). Sanal klasörlerde görünmezler:
           kategori/ürün klasörleri sunucuda türetilir, adlandırılamaz ve
           silinemezler. -->
      <div v-if="canCreateHere || inFolders" class="sx__folder-actions">
        <button
          v-if="canCreateHere"
          type="button"
          class="hdr-btn-outlined"
          :disabled="opBusy"
          @click="createFolderHere"
        >
          <AppIcon name="folder-plus" :size="13" />
          {{ t("sellerMediaExplorer.folderOps.new", {}, "Yeni klasör") }}
        </button>
        <button
          v-if="inFolders"
          type="button"
          class="hdr-btn-outlined"
          :disabled="opBusy"
          @click="renameCurrentFolder"
        >
          <AppIcon name="pencil" :size="13" />
          {{ t("sellerMediaExplorer.folderOps.rename", {}, "Adı değiştir") }}
        </button>
        <button
          v-if="inFolders"
          type="button"
          class="hdr-btn-outlined sx__danger"
          :disabled="opBusy"
          @click="deleteCurrentFolder"
        >
          <AppIcon name="trash-2" :size="13" />
          {{ t("sellerMediaExplorer.folderOps.delete", {}, "Klasörü sil") }}
        </button>
      </div>

      <div v-if="showFiles" class="sx__search">
        <AppIcon name="search" :size="13" class="sx__search-icon" />
        <input
          v-model="searchModel"
          type="text"
          class="form-input-sm w-full !pl-9"
          :placeholder="t('sellerMediaExplorer.searchPlaceholder')"
          @keyup.enter="onSearch"
        />
      </div>
    </div>

    <p class="sx__sr" role="status" aria-live="polite">{{ statusText }}</p>

    <div v-if="isLoading" class="card sx__empty-card">{{ t("sellerMediaExplorer.loading") }}</div>

    <!-- ── Klasör seviyesi ──
         Gerçek klasör modunda ızgara ve dosya listesi BİRLİKTE çizilir:
         bir klasör aynı anda alt klasör de dosya da taşıyabilir. -->
    <MediaFolderGrid
      v-if="!isLoading && showGrid"
      :class="{ 'sx__grid-gap': showFiles }"
      :items="gridItems"
      :empty-text="emptyText"
      :aria-label="t('sellerMediaExplorer.folderGridAria')"
      @select="onSelect"
    />

    <!-- ── Dosya seviyesi ── -->
    <template v-if="!isLoading && showFiles">
      <div class="card sx__list">
        <div v-for="item in rows" :key="item.name" class="sx__row">
          <input
            v-if="selectable(item)"
            type="checkbox"
            class="sx__check"
            :checked="selected.has(item.file_url)"
            :aria-label="
              t(
                'sellerMediaExplorer.selectFile',
                { name: item.file_name || item.file_url },
                'Dosyayı seç: {name}'
              )
            "
            @change="toggleSelect(item.file_url)"
          />
          <MediaImage
            v-if="canThumb(item)"
            class="sx__thumb"
            :src="item.file_url"
            :alt="item.file_name"
            :width="THUMB_PX"
            :height="THUMB_PX"
          />
          <span v-else class="sx__thumb sx__thumb--ph">{{ extOf(item) }}</span>

          <div class="sx__row-main">
            <span class="sx__file-name">{{ item.file_name || item.file_url }}</span>
            <span class="sx__row-sub">
              {{ formatSize(item.file_size || 0) }} · {{ fmtDate(item.creation) }}
            </span>
          </div>

          <span v-if="item.is_private" class="sx__pill">
            {{ t("sellerMediaExplorer.badge.private") }}
          </span>

          <!-- Sohbet eki dış serviste durur; dosya adresi yok, kim gönderdi
               ve hangi konuşma bilgisi gösterilir. -->
          <template v-if="item.chat">
            <span class="sx__pill" :title="t('sellerMediaExplorer.chatSender')">
              {{ item.sender }}
            </span>
            <span class="sx__pill">#{{ item.conversation_id }}</span>
          </template>
          <a
            v-else-if="safeHref(item.file_url)"
            class="sx__link"
            :href="safeHref(item.file_url)"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t("sellerMediaExplorer.action.open") }}
          </a>
        </div>
        <p v-if="!rows.length" class="sx__empty">{{ emptyText }}</p>
      </div>

      <div class="mpage__pagination">
        <ListPagination
          v-if="listTotal > listPageSize"
          :model-value="listPage"
          :total="listTotal"
          :page-size="listPageSize"
          @update:model-value="onSetPage"
        />
      </div>
    </template>

    <!-- ── Seçim çubuğu: yalnız klasöre taşıma (T-094) ──
         Diğer toplu işlemler kütüphane ekranında; gezgin dosyaların YERİNİ
         düzenler, içeriğini değil. -->
    <MediaBulkBar
      v-if="selected.size"
      :count="selected.size"
      :busy="moveBusy"
      :move-only="true"
      :folders="folderOptions"
      :report="moveReport"
      @move="onMove"
      @clear="clearSelection"
      @dismiss-report="moveReport = null"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Ölçüler Medya Kütüphanesi ve yönetici gezginiyle birebir — üç ekran aynı
  // ailenin yüzleri, ayrı görünmemeli.
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

  .sx__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    margin-bottom: media.$s-4;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .sx__stat {
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

  .sx__stat--here strong {
    color: $brand;
  }

  .sx__stat-label {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .sx__truncate {
    @include media.truncate;
  }

  .sx__toolbar {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    flex-wrap: wrap;
    margin-bottom: media.$s-3;
  }

  .sx__folder-actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  // Silme diğer eylemlerle aynı boyda ama rengiyle ayrışır — yanlışlıkla
  // basılacak kadar benzemesin.
  .sx__danger {
    color: $c-error;
  }

  // Klasör modunda ızgara ile dosya listesi alt alta — arada nefes payı.
  .sx__grid-gap {
    margin-bottom: media.$s-3;
  }

  .sx__search {
    position: relative;
    flex: 0 1 18rem;
    min-width: 12rem;
  }

  .sx__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: $l-text-300;
  }

  .sx__list {
    display: flex;
    flex-direction: column;
  }

  .sx__row {
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

  // Seçim kutusu satırın en solunda — tıklama alanı 16px'ten küçük kalmasın.
  .sx__check {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    accent-color: $brand;
    cursor: pointer;
  }

  .sx__thumb {
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

  .sx__row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .sx__file-name {
    font-weight: 600;
    @include media.text("sm");
    @include media.truncate;
  }

  .sx__row-sub {
    @include media.text("xs");
    @include media.muted(1);
  }

  .sx__pill {
    padding: 2px 8px;
    border-radius: 999px;
    @include media.text("xs");
    font-weight: 600;
    white-space: nowrap;
    @include media.muted(1);
  }

  .sx__link {
    @include media.text("xs");
    font-weight: 600;
    color: $brand;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }

  // Duyuru görsel olarak gizli: aynı bilgi zaten ekranda yazıyor.
  .sx__sr {
    @include media.sr-only;
  }

  .sx__empty,
  .sx__empty-card {
    padding: media.$s-6 media.$s-3;
    text-align: center;
    @include media.text("sm");
    @include media.muted(1);
  }
</style>
