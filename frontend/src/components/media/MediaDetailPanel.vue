<template>
  <aside class="detail" :class="{ 'detail--sheet': sheet }" aria-labelledby="media-detail-title">
    <header class="detail__head">
      <h2 id="media-detail-title" class="detail__title">{{ t("media.detail.title") }}</h2>
      <button
        type="button"
        class="detail__close"
        :aria-label="t('media.detail.close')"
        @click="emit('close')"
      >
        <AppIcon name="x" :size="18" />
      </button>
    </header>

    <!--
      Beş sekme (Faz 9 · T-093): Özet · Türevler · Kullanım · Kalite · Sürüm.
      Sekme şeridi kaydırma alanının DIŞINDA: gezinme kontrolü, içerik ne kadar
      uzun olursa olsun elin altında kalmalı.

      Sekmeler tembel: bir sekmeye ilk kez girilene kadar içeriği DOM'a
      girmez ve isteği atılmaz. Kullanım ve Kalite ayrı ayrı ağ isteği
      yapıyor; hepsini panel açılır açılmaz atmak, satıcı yalnız adı
      düzeltmek istediğinde bile üç istek demekti.
    -->
    <div class="detail__tabs" role="tablist" :aria-label="t('media.detail.tabsLabel')">
      <button
        v-for="tab in TABS"
        :id="`${uid}-tab-${tab.id}`"
        :key="tab.id"
        ref="tabButtons"
        type="button"
        role="tab"
        class="detail__tab"
        :class="{ 'detail__tab--on': active === tab.id }"
        :aria-selected="active === tab.id ? 'true' : 'false'"
        :aria-controls="`${uid}-panel-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        @click="select(tab.id)"
        @keydown="onTabKey"
      >
        <AppIcon :name="tab.icon" :size="14" />
        {{ t(`media.detail.tab.${tab.id}`) }}
      </button>
    </div>

    <div class="detail__scroll">
      <!-- ── Özet ─────────────────────────────────────────────────── -->
      <section
        v-show="active === 'summary'"
        :id="`${uid}-panel-summary`"
        class="detail__pane"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-summary`"
      >
        <!--
          Video, kendi kutusunda OYNAR. Küçük resim bir videoyu yalnız donmuş
          bir kare gibi gösterir; satıcı yüklediği videonun sesini, süresini,
          gerçekten ne olduğunu göremezdi. `MediaVideo` kutuyu `width`/`height`
          ile ÖNCEDEN ayırır (poster tek başına ayırmaz) ve kaynakları
          görünürlüğe kadar bağlamaz.

          Poster GEÇİLMİYOR: bu listenin satır modelinde (`useSellerMedia`
          `bicimle`) poster adresi diye bir alan yok. Uydurulmuş bir adres
          404 verir; poster yokluğunda `MediaVideo` zaten ilk kareyi bekler.
        -->
        <MediaVideo
          v-if="item.kind === 'video' && item.fileUrl"
          class="detail__preview"
          :src="item.fileUrl"
          :width="item.width || 0"
          :height="item.height || 0"
          :label="item.title || item.fileName"
        />
        <MediaThumb
          v-else
          :item="item"
          region="detailPreview"
          ratio="wide"
          :icon-size="40"
          class="detail__preview"
        />

        <p v-if="!editable" class="detail__notice">
          <AppIcon name="lock" :size="14" />
          {{ t("media.detail.sharedReadonly") }}
        </p>

        <div class="detail__field">
          <label :for="`name-${item.id}`">{{ t("media.detail.fileName") }}</label>
          <div class="detail__inline">
            <input
              :id="`name-${item.id}`"
              v-model="draft.fileName"
              type="text"
              :disabled="!editable"
            />
            <button
              type="button"
              class="detail__mini"
              :title="t('media.actions.copyLink')"
              :aria-label="t('media.actions.copyLink')"
              @click="emit('action', 'copyLink')"
            >
              <AppIcon name="copy" :size="15" />
            </button>
          </div>
        </div>

        <dl class="detail__facts">
          <div class="detail__fact">
            <dt>{{ t("media.detail.size") }}</dt>
            <dd>{{ formatBytes(item.bytes) }}</dd>
          </div>
          <div class="detail__fact">
            <dt>{{ t("media.detail.dimensions") }}</dt>
            <dd>{{ formatDimensions(item) }}</dd>
          </div>
          <div class="detail__fact">
            <dt>{{ t("media.detail.uploadedAt") }}</dt>
            <dd>{{ formatDate(item.uploadedAt, locale) }}</dd>
          </div>
          <div v-if="item.kind === 'video' && item.videoStatus" class="detail__fact">
            <dt>{{ t("media.detail.videoStatus") }}</dt>
            <dd>{{ t(`media.video.${item.videoStatus}`) }}</dd>
          </div>
        </dl>

        <div class="detail__field">
          <label :for="`title-${item.id}`">{{ t("media.detail.mediaTitle") }}</label>
          <input :id="`title-${item.id}`" v-model="draft.title" type="text" :disabled="!editable" />
        </div>

        <div class="detail__field">
          <label :for="`alt-${item.id}`">{{ t("media.detail.alt") }}</label>
          <input :id="`alt-${item.id}`" v-model="draft.alt" type="text" :disabled="!editable" />
        </div>

        <div class="detail__field">
          <label :for="`desc-${item.id}`">{{ t("media.detail.description") }}</label>
          <textarea
            :id="`desc-${item.id}`"
            v-model="draft.description"
            rows="3"
            :disabled="!editable"
          />
        </div>

        <div class="detail__field">
          <label :for="`tag-${item.id}`">{{ t("media.detail.tags") }}</label>
          <ul class="detail__tags">
            <li v-for="tag in draft.tags" :key="tag" class="detail__tag">
              {{ tag }}
              <button
                v-if="editable"
                type="button"
                :aria-label="t('media.detail.removeTag', { tag })"
                @click="removeTag(tag)"
              >
                <AppIcon name="x" :size="12" />
              </button>
            </li>
            <li v-if="!draft.tags.length" class="detail__tag-empty">
              {{ t("media.detail.noTags") }}
            </li>
          </ul>
          <input
            :id="`tag-${item.id}`"
            v-model="tagInput"
            type="text"
            :placeholder="t('media.detail.tagPlaceholder')"
            :disabled="!editable"
            @keydown.enter.prevent="addTag"
          />
        </div>

        <div v-if="editable" class="detail__field">
          <span class="detail__label">{{ t("media.actions.replace") }}</span>
          <label class="detail__replace">
            <AppIcon name="refresh-cw" :size="15" />
            {{ t("media.detail.replaceHint") }}
            <input type="file" :accept="ACCEPT" @change="onReplace" />
          </label>
        </div>
      </section>

      <!-- ── Türevler ─────────────────────────────────────────────── -->
      <!-- Boru hattı bu dosyadan ne üretti. Tablo şu an BOŞ (bayraklar
           kapalı) — bileşen bunu arıza değil "henüz üretilmedi" diye
           gösterir. -->
      <section
        v-show="active === 'renditions'"
        :id="`${uid}-panel-renditions`"
        class="detail__pane"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-renditions`"
      >
        <template v-if="seen.includes('renditions')">
          <MediaRenditionList :file-name="item.docName || ''" />
        </template>
      </section>

      <!-- ── Kullanım ─────────────────────────────────────────────── -->
      <!--
        Üç durum ayrı tutuluyor: doğrulanmadı / kullanılıyor / kullanılmıyor.
        Eskiden yalnız ikisi vardı ve doğrulanmamış hâl "kullanılmıyor" diye
        gösteriliyordu. Silme kararını besleyen bir ekranda en tehlikeli hata
        budur: bilinmeyeni "boş" saymak. Bilinmiyorsa bilinmiyor yazar.
      -->
      <section
        v-show="active === 'usage'"
        :id="`${uid}-panel-usage`"
        class="detail__pane"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-usage`"
      >
        <MediaUsagePanel v-if="seen.includes('usage')" :file-url="item.fileUrl || item.id || ''" />
      </section>

      <!-- ── Kalite ───────────────────────────────────────────────── -->
      <section
        v-show="active === 'quality'"
        :id="`${uid}-panel-quality`"
        class="detail__pane"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-quality`"
      >
        <MediaQualityPanel
          v-if="seen.includes('quality')"
          :item="item"
          :file-name="item.docName || ''"
        />
      </section>

      <!-- ── Sürüm ────────────────────────────────────────────────── -->
      <!--
        `Media Version` artık GERÇEK (W4 zenginleştirme, rapor 73):
        `manifest_batch` yanıtı `version` anahtarında dpi / renk uzayı /
        alpha / sınıflandırma / format zinciri taşıyor. Bölüm bunu basar;
        eskiden buradaki "kurulu değil" notu doğruydu, artık yalan olurdu.

        Sürüm kaydı OLMAYAN dosyada boş tablo ya da "—" satırları
        GÖSTERİLMEZ: "sürüm kaydı yok" yazılır — yokluk ile ölçülmemişlik
        aynı şey değil. Yetki reddi ve arıza da ayrı ayrı söylenir.

        Sekme diğerleri gibi TEMBEL: ilk ziyarete kadar istek atılmaz
        (türev sekmesiyle aynı uç; iki sekme iki bağımsız örnek kullanıyor —
        MediaQualityPanel'in kendi örneği gibi).
      -->
      <section
        v-show="active === 'versions'"
        :id="`${uid}-panel-versions`"
        class="detail__pane"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-versions`"
      >
        <template v-if="seen.includes('versions')">
          <h3 class="detail__section-title">
            <AppIcon name="git-branch" :size="14" />
            {{ t("media.versions.title", {}, "Sürüm") }}
          </h3>

          <p
            v-if="versionNotice"
            class="detail__notice-flat"
            :data-test="versionNotice.test || 'versions-notice'"
          >
            <AppIcon :name="versionNotice.icon" :size="14" />
            {{ versionNotice.text }}
          </p>

          <template v-else>
            <dl class="detail__facts" data-test="versions-facts">
              <div v-for="f in versionFacts" :key="f.key" class="detail__fact">
                <dt>{{ f.label }}</dt>
                <dd :title="f.title || undefined">{{ f.value }}</dd>
              </div>
            </dl>
            <p class="detail__scope" data-test="versions-scope">
              {{
                t(
                  "media.versions.activeScopeNote",
                  {},
                  "Gösterilen, varlığın yayındaki (yoksa en yeni) sürümüdür; tam geçmiş listesi bu ekranda yok."
                )
              }}
            </p>
          </template>

          <!--
            Yeniden işleme: AYRI bir uç YOK (ölçüldü — `reprocess` adında
            whitelist ucu bulunmuyor; `_run_rendition_job` idempotent rerun'ı
            yükleme kancasından koşuyor). Düğme bu yüzden mevcut optimize
            akışına bağlı: `useMediaOptimize.start` tekil dosya kabul ediyor
            ve koşum durumu aynı job-polling'den okunuyor. Uç rolle korunur
            (System Manager / Marketplace Admin) — yetkisi olmayan oturumda
            sunucu reddi toast'ta görünür, düğme sahte başarı basmaz.
          -->
          <div v-if="editable" class="detail__field">
            <button
              type="button"
              class="detail__btn"
              data-test="versions-reprocess"
              :disabled="!item.docName || reprocessRunning"
              @click="reprocess"
            >
              <AppIcon name="refresh-cw" :size="15" />
              {{
                reprocessRunning
                  ? t("media.versions.reprocessRunning", {}, "Yeniden işleniyor…")
                  : t("media.versions.reprocess", {}, "Yeniden işle")
              }}
            </button>
            <p v-if="reprocessStatus" class="detail__scope" data-test="versions-job">
              {{ reprocessStatus }}
            </p>
          </div>
        </template>
      </section>
    </div>

    <footer class="detail__foot">
      <button
        type="button"
        class="detail__btn detail__btn--primary"
        :disabled="!editable || !dirty"
        @click="save"
      >
        {{ t("media.detail.save") }}
      </button>
      <button type="button" class="detail__btn" @click="emit('action', 'download')">
        <AppIcon name="download" :size="15" />
        {{ t("media.actions.download") }}
      </button>
      <!--
        Kırpma yalnız ÖLÇÜSÜ BİLİNEN görsellerde açılır. Kaynak pikseli
        bilinmeden kadraj hesaplanamaz; düğme açık kalsaydı stüdyo boş
        açılırdı. (`th_media_width` ölçümü 0/2853 dolu — çoğu dosyada ölçü
        yok, bu yüzden düğme çoğu satırda kapalı görünecek. Bu bir arıza
        değil, eksik metadatanın dürüst görünümü.)
      -->
      <button
        type="button"
        class="detail__btn"
        :disabled="!croppable"
        :title="croppable ? t('cropStudio.title') : t('media.actions.cropNoDims')"
        @click="emit('action', 'crop')"
      >
        <AppIcon name="crop" :size="15" />
        {{ t("media.actions.crop") }}
      </button>
      <button
        type="button"
        class="detail__btn"
        :disabled="!editable"
        @click="emit('action', 'archive')"
      >
        <AppIcon :name="item.archived ? 'archive-restore' : 'archive'" :size="15" />
        {{ item.archived ? t("media.actions.unarchive") : t("media.actions.archive") }}
      </button>
      <!--
        Ürününde kullanılan dosya silinemez. Düğme açık kalsaydı basılınca
        arka taraf reddeder, kullanıcı da sebebini göremezdi.
      -->
      <button
        type="button"
        class="detail__btn detail__btn--danger"
        :disabled="!editable || inUse"
        :title="inUse ? t('media.actions.deleteBlocked') : t('media.actions.purge')"
        @click="emit('action', 'delete')"
      >
        <AppIcon name="trash-2" :size="15" />
        {{ t("media.actions.purge") }}
      </button>
    </footer>
  </aside>
</template>

<script setup>
  import { computed, nextTick, ref, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaQualityPanel from "@/components/media/MediaQualityPanel.vue";
  import MediaRenditionList from "@/components/media/MediaRenditionList.vue";
  import MediaVideo from "@/components/media/MediaVideo.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import MediaUsagePanel from "@/components/media/MediaUsagePanel.vue";
  import { useMediaOptimize } from "@/composables/useMediaOptimize";
  import { useMediaRenditions } from "@/composables/useMediaRenditions";
  import { formatBytes, formatDate, formatDimensions } from "@/utils/mediaFormat";

  const props = defineProps({
    item: { type: Object, required: true },
    editable: { type: Boolean, default: true },
    /** Sütun olarak değil, ekrana sabit sheet olarak açıl (<1280px). */
    sheet: { type: Boolean, default: false },
  });
  const emit = defineEmits(["save", "action", "replace", "close"]);

  /** Kendi ürünlerinde kullanılıyor mu — silme buna göre kapanır. */
  const inUse = computed(() => (props.item.liveUsage || 0) > 0);

  /** Kırpma stüdyosu kaynak pikselini ister; ölçü yoksa açılmaz. */
  const croppable = computed(
    () => props.item.kind === "image" && props.item.width > 0 && props.item.height > 0
  );

  const { t, locale } = useI18n();

  /**
   * Faz 9'un beş sekmesi. Sıra karar sırası: önce dosyanın kendisi (Özet),
   * sonra ondan ne üretildiği (Türevler), nerede kullanıldığı (Kullanım),
   * ne kadar iyi olduğu (Kalite) ve nasıl değiştiği (Sürüm).
   */
  const TABS = [
    { id: "summary", icon: "info" },
    { id: "renditions", icon: "layers" },
    { id: "usage", icon: "package" },
    { id: "quality", icon: "gauge" },
    { id: "versions", icon: "git-branch" },
  ];
  const TAB_IDS = TABS.map((x) => x.id);

  const uid = `mdp-${useId()}`;
  const active = ref("summary");
  /** Ziyaret edilmiş sekmeler — içerik ve isteği tembel tutan tek kayıt. */
  const seen = ref(["summary"]);
  const tabButtons = ref([]);

  function select(id) {
    active.value = id;
    if (!seen.value.includes(id)) seen.value = [...seen.value, id];
  }

  /**
   * Ok tuşlarıyla sekme gezinme (WAI-ARIA tabs deseni).
   *
   * Roving tabindex kullanılıyor: yalnız etkin sekme Tab sırasında; şeritte
   * gezinme ok tuşlarıyla. Beş düğmeyi de Tab sırasına koymak, klavye
   * kullanıcısını içeriğe ulaşmak için beş kez Tab'a bastırırdı.
   */
  function onTabKey(event) {
    const yon = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    let hedef = -1;
    if (yon) hedef = (TAB_IDS.indexOf(active.value) + yon + TAB_IDS.length) % TAB_IDS.length;
    else if (event.key === "Home") hedef = 0;
    else if (event.key === "End") hedef = TAB_IDS.length - 1;
    if (hedef < 0) return;

    event.preventDefault();
    select(TAB_IDS[hedef]);
    // Odak DOM güncellendikten sonra taşınır; `tabindex` o ana kadar -1.
    nextTick(() => tabButtons.value[hedef]?.focus());
  }

  // ── Sürüm sekmesi (T-093) ─────────────────────────────────────────
  // Türev sekmesiyle AYNI toplu uç (`manifest_batch`), AYRI örnek: sekmeler
  // bağımsız tembel, biri diğerinin durumunu ezmiyor (Kalite de kendi
  // örneğini kullanıyor — desen aynı).
  const versiyon = useMediaRenditions();

  watch(
    () => [props.item.docName, seen.value.includes("versions")],
    ([docName, acik]) => {
      if (acik) versiyon.load(docName);
    }
  );

  const DASH = "—";

  /** Sürüm künyesi satırları — YALNIZ sürüm kaydı varken çizilir. */
  const versionFacts = computed(() => {
    const v = versiyon.version.value;
    if (!v) return [];
    const chain = Array.isArray(v.format_chain) ? v.format_chain : [];
    const guven = v.classification_confidence
      ? ` (${t("media.versions.confidence", {}, "güven")}: ${v.classification_confidence})`
      : "";
    return [
      {
        key: "state",
        label: t("media.versions.attr.state", {}, "Durum"),
        value: v.is_active
          ? t("media.versions.active", {}, "Yayında")
          : t("media.versions.latest", {}, "En yeni (yayında değil)"),
      },
      {
        key: "dimensions",
        label: t("media.versions.attr.dimensions", {}, "Ölçü"),
        value: v.width && v.height ? `${v.width} × ${v.height}` : DASH,
      },
      { key: "dpi", label: "DPI", value: v.dpi || DASH },
      {
        key: "colorspace",
        label: t("media.versions.attr.colorspace", {}, "Renk uzayı"),
        value: v.colorspace || DASH,
      },
      {
        key: "alpha",
        label: t("media.versions.attr.alpha", {}, "Alfa kanalı"),
        value: v.has_alpha
          ? t("media.versions.alphaYes", {}, "Var")
          : t("media.versions.alphaNo", {}, "Yok"),
      },
      {
        key: "classification",
        label: t("media.versions.attr.classification", {}, "Sınıflandırma"),
        value: v.classification ? `${v.classification}${guven}` : DASH,
      },
      {
        key: "formatChain",
        label: t("media.versions.attr.formatChain", {}, "Format zinciri"),
        value: chain.length ? chain.map((c) => c.fmt).join(" → ") : DASH,
      },
      {
        key: "hash",
        label: t("media.versions.attr.hash", {}, "Sürüm özeti"),
        // 12 karakter yeter: satır taşmasın; tam özet `title`ta duruyor.
        value: v.version_hash ? v.version_hash.slice(0, 12) : DASH,
        title: v.version_hash || "",
      },
    ];
  });

  /**
   * Boş/arıza durumlarının TEK metni (türev sekmesindeki `notice` deseni).
   * "Sürüm kaydı yok" bir ARIZA DEĞİL: boru hattı bu dosya için henüz sürüm
   * üretmedi ya da bakılamıyor — sunucu ikisini bilinçli ayırt ettirmiyor.
   */
  const versionNotice = computed(() => {
    if (versiyon.loading.value)
      return { icon: "loader", text: t("media.versions.loading", {}, "Yükleniyor…") };
    if (versiyon.denied.value)
      return {
        icon: "lock",
        text: t("media.versions.denied", {}, "Bu bilgiyi görme yetkiniz yok."),
      };
    if (versiyon.error.value)
      return {
        icon: "circle-alert",
        text: t("media.versions.failed", {}, "Sürüm bilgisi alınamadı."),
      };
    if (!versiyon.version.value)
      return {
        icon: "clock",
        test: "versions-none",
        text: t(
          "media.versions.none",
          {},
          "Bu dosya için sürüm kaydı yok — boru hattı henüz bir sürüm üretmedi."
        ),
      };
    return null;
  });

  // Yeniden işleme — mevcut optimize kuyruğu + job-polling. Bu panel envanter
  // listesi göstermiyor; iş bitince listeyi tazelemek yerine SÜRÜM yeniden
  // okunur (refreshOnDone: false, aşağıdaki watch).
  const optimize = useMediaOptimize({ refreshOnDone: false });
  const reprocessRunning = computed(() => optimize.job.state === "running");

  async function reprocess() {
    if (!props.item.docName) return;
    await optimize.start({ fileNames: [props.item.docName] });
  }

  /** Koşum satırı — polling'in yazdığı sayaçlardan, uydurma yüzde yok. */
  const reprocessStatus = computed(() => {
    const j = optimize.job;
    if (!j.state) return "";
    if (j.state === "running")
      return t(
        "media.versions.jobRunning",
        { done: j.processed, total: j.total },
        `${j.processed}/${j.total} işlendi`
      );
    const sonuc = `${j.optimized} ${t("media.versions.jobOptimized", {}, "işlendi")}, ${j.skipped} ${t(
      "media.versions.jobSkipped",
      {},
      "atlandı"
    )}, ${j.errors} ${t("media.versions.jobErrors", {}, "hata")}`;
    return `${t(`media.versions.jobState.${j.state}`, {}, j.state)} — ${sonuc}`;
  });

  // İş bittiğinde sürüm künyesi yeniden okunur — yeniden işleme yeni bir
  // sürüm ürettiyse ekran eski künyede kalmasın.
  watch(
    () => optimize.job.state,
    (state, onceki) => {
      if (onceki === "running" && state && state !== "running") {
        if (seen.value.includes("versions")) versiyon.load(props.item.docName);
      }
    }
  );

  const draft = ref(blank());
  const tagInput = ref("");

  const ACCEPT = "image/*,video/*,.pdf";

  function blank() {
    return { fileName: "", title: "", alt: "", description: "", tags: [] };
  }

  function onReplace(event) {
    const [file] = event.target.files || [];
    if (file) emit("replace", file);
    event.target.value = "";
  }

  const dirty = computed(
    () =>
      draft.value.fileName !== props.item.fileName ||
      draft.value.title !== props.item.title ||
      draft.value.alt !== props.item.alt ||
      draft.value.description !== props.item.description ||
      draft.value.tags.join("|") !== props.item.tags.join("|")
  );

  function addTag() {
    const value = tagInput.value.trim();
    if (!value || draft.value.tags.includes(value)) return;
    draft.value.tags = [...draft.value.tags, value];
    tagInput.value = "";
  }

  function removeTag(tag) {
    draft.value.tags = draft.value.tags.filter((x) => x !== tag);
  }

  function save() {
    emit("save", { ...draft.value, tags: [...draft.value.tags] });
  }

  // Seçili medya değişince taslağı tazele — kaydedilmemiş düzenleme taşınmasın.
  watch(
    () => props.item.id,
    () => {
      draft.value = {
        fileName: props.item.fileName,
        title: props.item.title,
        alt: props.item.alt,
        description: props.item.description,
        tags: [...props.item.tags],
      };
      tagInput.value = "";
      // Sekme de başa döner: önceki dosyanın Kullanım sekmesinde kalıp yeni
      // dosyanın verisini orada beklemek, iki dosyayı karıştırmaya davettir.
      active.value = "summary";
      seen.value = ["summary"];
    },
    { immediate: true }
  );
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .detail {
    display: flex;
    flex-direction: column;
    border: 1px solid $l-border;
    border-radius: media.$r-lg;
    background: $l-bg-soft;
    overflow: hidden;
    // Sticky sütun: header (56px) + sayfa payı kadar aşağıdan başlıyor.
    max-height: calc(100vh - #{media.$m-header-h} - 3rem);

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  // Sütun olarak sığmayan genişliklerde sheet:
  //   768–1279px → sağa yaslı yan sheet
  //   ≤767px     → tam ekran (medya.md §Responsive)
  .detail--sheet {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 60;
    width: min(26rem, 100%);
    max-height: none;
    height: 100dvh;
    border-radius: 0;
    border: 0;
    border-inline-start: 1px solid $l-border;
    box-shadow: -12px 0 40px rgb(0 0 0 / 18%);

    @include dark {
      border-color: $d-border;
    }

    @media (max-width: media.$m-bp-md) {
      inset: 0;
      width: auto;
      border-inline-start: 0;
    }
  }

  .detail__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // Panel flex-column + max-height: içerik uzayınca başlık/sekme EZİLMEMELİ —
    // shrink serbest kalırsa sekme satırı dikeyde sıkışıp kırpılıyor (ölçüldü:
    // uzun Özet sekmesinde tab etiketleri yarıya iniyordu).
    flex-shrink: 0;
    padding: media.$s-3 media.$s-4;
    border-bottom: 1px solid $l-border;

    @include dark {
      border-color: $d-border;
    }
  }

  .detail__title {
    margin: 0;
    @include media.text;
    font-weight: 620;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  .detail__close {
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    color: $l-text-500;
    cursor: pointer;
    border-radius: media.$r-md;
    @include media.press(0.94);

    @include dark {
      color: $d-text-muted;
    }
  }

  // Normal blok akışı — grid/flex DEĞİL: oran kutusu (MediaThumb) yüzde padding
  // kullanıyor, yüzde padding grid/flex intrinsic satır ölçümünde 0 sayılıyor ve
  // önizleme 2px'e çöküp altındaki içeriğin üstüne biniyor.
  .detail__scroll {
    flex: 1;
    min-height: 0; // flex çocuğunun taşmayı kendi içinde tutması için
    overflow-y: auto;
    padding: media.$s-4;
  }

  // Dikey ritim artık SEKME İÇİNDE: `.detail__scroll`'un doğrudan çocukları
  // paneller ve aynı anda yalnız biri görünür.
  .detail__pane > * + * {
    margin-top: media.$s-4;
  }

  // Sekme şeridi yatay kaydırılabilir: dar sheet'te (≤360px) beş etiket yan
  // yana sığmıyor ve sarmalanınca şerit iki satıra çıkıp içeriği aşağı itiyor.
  .detail__tabs {
    display: flex;
    flex-shrink: 0; // gerekçe .detail__head'de — kırpılan sekme hatası
    gap: media.$s-1;
    padding: 0 media.$s-2;
    overflow-x: auto;
    scrollbar-width: none;
    @include media.divider(bottom);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .detail__tab {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    flex: 0 0 auto;
    padding: 0 media.$s-2;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: $l-text-500;
    @include media.text("sm");
    font-weight: 560;
    cursor: pointer;
    @include media.tap-target;
    @include media.focus-ring;

    @include dark {
      color: $d-text-muted;
    }
  }

  .detail__tab--on {
    color: $l-text-900;
    border-bottom-color: $brand;
    font-weight: 640;

    @include dark {
      color: $d-text-hi;
    }
  }

  .detail__section-title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text("sm");
    font-weight: 700;
    @include media.heading;
  }

  // Tek başına ekranda kalabilen bilgi satırı: rengi kasıtlı `muted` DEĞİL.
  .detail__notice-flat {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    color: $l-text-900;
    background: $l-bg-muted;

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
    }
  }

  .detail__scope {
    margin: 0;
    @include media.text("xs");
    @include media.muted(1);
  }

  .detail__preview {
    border-radius: media.$r-md;
    border: 1px solid $l-border-alt;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .detail__notice {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    @include media.text;
    color: $c-info;
    background: rgb(59 130 246 / 12%);
  }

  .detail__facts {
    margin: 0;
    display: grid;
    gap: 0;
  }

  .detail__fact {
    display: flex;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-2 0;
    border-bottom: 1px solid $l-border-alt;
    @include media.text;

    @include dark {
      border-color: $d-border-inner;
    }

    &:last-child {
      border-bottom: 0;
    }

    dt {
      color: $l-text-500;

      @include dark {
        color: $d-text-muted;
      }
    }

    dd {
      margin: 0;
      font-weight: 550;
      color: $l-text-900;
      text-align: end;
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 60%;

      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .detail__field {
    display: grid;
    gap: media.$s-2;

    label,
    .detail__label {
      @include media.text;
      font-weight: 560;
      color: $l-text-600;

      @include dark {
        color: $d-text-muted;
      }
    }

    input,
    textarea {
      width: 100%;
      min-height: 2.75rem;
      padding: media.$s-2 media.$s-3;
      border: 1px solid $l-border;
      border-radius: media.$r-md;
      background: $l-bg;
      color: $l-text-900;
      font: inherit;
      @include media.text;

      @include dark {
        background: $d-bg;
        border-color: $d-border;
        color: $d-text;
      }

      &:focus {
        outline: 0;
        border-color: $brand;
        box-shadow: 0 0 0 3px $brand-glow;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    textarea {
      resize: vertical;
    }
  }

  .detail__inline {
    display: flex;
    gap: media.$s-2;

    input {
      flex: 1;
      min-width: 0;
    }
  }

  .detail__mini {
    @include media.button;
    @include media.focus-ring;

    flex-shrink: 0;
    width: 2.75rem;
    padding: 0;
    justify-content: center;
  }

  .detail__replace {
    @include media.button;
    @include media.focus-ring;

    justify-content: center;
    border-style: dashed;

    input {
      display: none;
    }
  }

  .detail__tags {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .detail__tag {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    padding: media.$s-1 media.$s-2;
    border-radius: media.$r-pill;
    background: $l-bg-muted;
    color: $l-text-700;
    @include media.text("sm");

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }

    button {
      display: grid;
      place-items: center;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.65;
    }
  }

  .detail__tag-empty {
    margin: 0;
    @include media.text("xs");
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .detail__foot {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-2;
    padding: media.$s-4;
    border-top: 1px solid $l-border;

    @include dark {
      border-color: $d-border;
    }
  }

  // Sheet ekranın en altına dayanıyor: butonlar home indicator'ın altında kalmasın.
  .detail--sheet .detail__foot {
    padding-bottom: calc(#{media.$s-4} + env(safe-area-inset-bottom));
  }

  .detail__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: media.$s-2;
    min-height: 2.75rem;
    padding: 0 media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    background: $l-bg;
    color: $l-text-700;
    @include media.text;
    font-weight: 540;
    cursor: pointer;
    transition:
      background $t-fast,
      transform $d-press $ease-out;

    // Panelin ana eylemleri (Kaydet/İndir/Arşivle/Sil) — dokunma tepkisi şart.
    &:active:not(:disabled) {
      transform: scale(0.97);
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .detail__btn--primary {
    grid-column: span 2;
    background: $brand;
    border-color: transparent;
    color: $brand-ink;
    font-weight: 620;
  }

  .detail__btn--danger {
    color: $c-error;
  }
</style>
