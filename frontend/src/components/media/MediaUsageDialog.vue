<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useToast } from "@/composables/useToast";
  import { canRenderThumb, formatSize } from "@/utils/mediaFormat";
  import { storefrontUrl } from "@/utils/storefrontUrl";

  const props = defineProps({
    /** `{ name, file_name, file_url, file_size }` — liste satırı. */
    item: { type: Object, default: null },
    /** Kullanım dökümünü getiren fonksiyon: (fileUrl) => Promise<detay|null> */
    fetcher: { type: Function, required: true },
  });
  const open = defineModel("open", { type: Boolean, default: false });
  const emit = defineEmits(["open-record"]);
  const { t } = useI18n();
  const toast = useToast();

  const data = ref(null);
  const loading = ref(false);
  // Teknik ayrıntılar (geçmiş izleri + kayıt tablosu) katlanır; her açılışta
  // kapalı başlar — operatörün sorusu "silebilir miyim", kayıt dökümü değil.
  const techOpen = ref(false);

  watch(
    () => [open.value, props.item?.file_url],
    async ([isOpen, url]) => {
      if (!isOpen || !url) return;
      loading.value = true;
      techOpen.value = false;
      data.value = null;
      data.value = await props.fetcher(url);
      loading.value = false;
    },
    { immediate: true }
  );

  // Aynı ürünün birden fazla alanında geçiyor olabilir (ana görsel + galeri +
  // varyant) — ürün bazında grupla ki "8 üründe" sayısı satır sayısıyla uyuşsun.
  const grouped = computed(() => {
    const map = new Map();
    for (const u of data.value?.usages || []) {
      const key = `${u.doctype}:${u.name}`;
      if (!map.has(key)) {
        map.set(key, {
          doctype: u.doctype,
          name: u.name,
          label: u.label || u.name,
          status: u.status,
          // TUR-136'nın üçüncü boyutu: görselin göründüğü sayfa adresi.
          pageUrl: storefrontUrl(u.page_path),
          fields: [],
        });
      }
      map.get(key).fields.push(u);
    }
    return [...map.values()];
  });

  // "Bağlı olduğu" boş ama dosya kullanılıyorsa ekranda çelişki gibi duruyor:
  // `attached_to` Frappe'nin yükleme bağı, kullanım ise URL'in bir alanda
  // geçmesi. Bulk import ile gelen dosyalarda ilki hep boştur.
  const attachedMismatch = computed(
    () =>
      (data.value?.usages?.length || 0) > 0 &&
      (data.value?.records || []).every((r) => !r.attached_to_doctype)
  );

  const verdictTone = computed(
    () =>
      ({ in_use: "ok", order_only: "warn", history_only: "warn", unused: "danger" })[
        data.value?.verdict
      ] || ""
  );

  function fieldLabel(f) {
    if (f.variant) {
      const parts = [f.field, f.variant];
      if (f.variant_sku) parts.push(f.variant_sku);
      return parts.join(" · ");
    }
    if (f.position) return `${f.field} #${f.position}`;
    return f.field;
  }

  // ── Sol sütun: dosya kimliği ───────────────────────────────────────
  const ext = computed(() => {
    const name = props.item?.file_name || "";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : "?";
  });
  const isVideo = computed(() => ["MP4", "WEBM", "MOV", "M4V"].includes(ext.value));
  // Önizleme ORİJİNAL dosyayı çeker; diyalog tek dosya için bilinçli açıldığı
  // için boyut kapısı yok (ızgara da sayfa sayfa yüklü geliyor).
  const showImg = computed(() => canRenderThumb(props.item?.file_url));

  function shortDate(s) {
    if (!s) return "—";
    const [y, m, d] = String(s).slice(0, 10).split("-");
    return d && m && y ? `${d}.${m}.${y.slice(2)}` : "—";
  }
  const uploadedAt = computed(() => {
    const dates = (data.value?.records || []).map((r) => r.creation).sort();
    return shortDate(dates[0]);
  });
  const historyTotal = computed(() =>
    (data.value?.history || []).reduce((s, h) => s + (h.count || 0), 0)
  );

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(props.item?.file_url || "");
      toast.success(t("mediaUsage.copied"));
    } catch {
      toast.error(t("mediaUsage.copyFailed"));
    }
  }
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mud__scrim" @click.self="open = false">
      <section class="mud" role="dialog" aria-modal="true">
        <button
          type="button"
          class="mud__close"
          :aria-label="t('mediaUsage.close')"
          @click="open = false"
        >
          <AppIcon name="x" :size="18" />
        </button>

        <div class="mud__split">
          <!-- ── Sol: dosyanın kendisi ── -->
          <aside class="mud__side">
            <div class="mud__preview" :class="{ 'mud__preview--dark': !showImg }">
              <img v-if="showImg" :src="item?.file_url" :alt="item?.file_name" loading="lazy" />
              <AppIcon v-else-if="isVideo" name="circle-play" :size="34" />
              <span v-else class="mud__preview-ext">{{ ext }}</span>
            </div>
            <div class="mud__title">
              <span class="mud__name" :title="item?.file_name">{{ item?.file_name }}</span>
              <span class="mud__sub">{{ ext }}</span>
            </div>
            <dl class="mud__meta">
              <div class="mud__meta-row">
                <dt>{{ t("mediaUsage.meta.size") }}</dt>
                <dd>{{ formatSize(item?.file_size) }}</dd>
              </div>
              <div v-if="data" class="mud__meta-row">
                <dt>{{ t("mediaUsage.meta.uploaded") }}</dt>
                <dd>{{ uploadedAt }}</dd>
              </div>
              <div v-if="data" class="mud__meta-row">
                <dt>{{ t("mediaUsage.meta.records") }}</dt>
                <dd>{{ data.records.length }}</dd>
              </div>
              <div v-if="historyTotal" class="mud__meta-row">
                <dt>{{ t("mediaUsage.meta.history") }}</dt>
                <dd>{{ historyTotal }}</dd>
              </div>
            </dl>
            <button type="button" class="mud__copy" :title="item?.file_url" @click="copyPath">
              <AppIcon name="copy" :size="12" />
              {{ t("mediaUsage.copyPath") }}
            </button>
          </aside>

          <!-- ── Sağ: hüküm + kullanım ── -->
          <div class="mud__main">
            <div v-if="loading" class="mud__empty">{{ t("mediaUsage.loading") }}</div>

            <div v-else-if="data" class="mud__body">
              <!-- Karar şeridi: silinebilir mi sorusunun tek cümlelik cevabı -->
              <p class="mud__verdict" :class="`mud__verdict--${verdictTone}`">
                <AppIcon
                  :name="
                    data.verdict === 'in_use'
                      ? 'check-circle'
                      : data.verdict === 'unused'
                        ? 'trash-2'
                        : 'clock'
                  "
                  :size="15"
                />
                {{ t(`mediaUsage.verdict.${data.verdict}`) }}
              </p>

              <!-- Canlı kullanım — hangi üründe, hangi alanda, varyant mı -->
              <section v-if="grouped.length" class="mud__block">
                <h3 class="mud__sec-label">
                  <span>{{ t("mediaUsage.liveTitle", { n: grouped.length }) }}</span>
                </h3>
                <ul class="mud__list">
                  <li v-for="g in grouped" :key="`${g.doctype}:${g.name}`" class="mud__use">
                    <div class="mud__use-main">
                      <span class="mud__use-title" :title="g.label">{{ g.label }}</span>
                      <span class="mud__use-meta">
                        <span>{{ g.doctype }} · {{ g.name }}</span>
                        <a
                          v-if="g.pageUrl"
                          class="mud__url"
                          :href="g.pageUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          :title="`${t('mediaUsage.openPage')} — ${g.pageUrl}`"
                        >
                          {{ t("mediaUsage.openPageShort") }}
                          <AppIcon name="external-link" :size="11" />
                        </a>
                        <span v-else>{{ t("mediaUsage.noPage") }}</span>
                      </span>
                      <div class="mud__fields">
                        <span v-for="(f, i) in g.fields" :key="i" class="mud__chip mud__chip--slot">
                          {{ fieldLabel(f) }}
                          <b v-if="f.is_default">★</b>
                        </span>
                      </div>
                    </div>
                    <span v-if="g.status" class="mud__status" :class="`mud__status--${g.status}`">
                      {{ g.status }}
                    </span>
                    <!-- Ters arama girişi: bu üründeki TÜM görseller (TUR-136) -->
                    <button
                      type="button"
                      class="mud__allmedia"
                      :title="t('mediaUsage.allMediaHint')"
                      @click="
                        emit('open-record', { doctype: g.doctype, name: g.name, label: g.label })
                      "
                    >
                      <AppIcon name="image" :size="14" />
                    </button>
                  </li>
                </ul>
              </section>

              <!-- Sipariş kopyaları -->
              <section v-if="data.orders?.length" class="mud__block">
                <h3 class="mud__sec-label">
                  <span>{{ t("mediaUsage.orderTitle", { n: data.orders.length }) }}</span>
                </h3>
                <p class="mud__note">{{ t("mediaUsage.orderNote") }}</p>
                <div class="mud__fields">
                  <span v-for="(o, i) in data.orders" :key="i" class="mud__chip">
                    {{ o.field }} · {{ o.name }}
                  </span>
                </div>
              </section>

              <!-- Teknik ayrıntılar: geçmiş izleri + File kayıtları katlanır -->
              <div class="mud__fold" :class="{ 'mud__fold--open': techOpen }">
                <button
                  type="button"
                  class="mud__fold-head"
                  :aria-expanded="techOpen"
                  @click="techOpen = !techOpen"
                >
                  <span class="mud__fold-title">{{ t("mediaUsage.techTitle") }}</span>
                  <span class="mud__fold-badge">
                    {{
                      t("mediaUsage.techBadge", {
                        h: data.history?.length || 0,
                        r: data.records.length,
                      })
                    }}
                  </span>
                  <AppIcon name="chevron-down" :size="15" class="mud__fold-chev" />
                </button>
                <div v-show="techOpen" class="mud__fold-body">
                  <!-- Geçmiş izleri -->
                  <template v-if="data.history?.length">
                    <p class="mud__note">{{ t("mediaUsage.historyNote") }}</p>
                    <div class="mud__fields">
                      <span v-for="h in data.history" :key="h.kind" class="mud__chip">
                        {{ h.label }} <b>{{ h.count }}</b>
                      </span>
                    </div>
                  </template>

                  <!-- File kayıtları — "5 kez yüklenmiş" burada açılıyor -->
                  <h4 class="mud__fold-sub">
                    {{ t("mediaUsage.recordsTitle", { n: data.records.length }) }}
                    <span v-if="data.redundant_records" class="mud__redundant">
                      {{ t("mediaUsage.redundant", { n: data.redundant_records }) }}
                    </span>
                  </h4>
                  <p class="mud__note">{{ t("mediaUsage.recordsNote") }}</p>
                  <p v-if="attachedMismatch" class="mud__warn">
                    <AppIcon name="circle-alert" :size="13" />
                    {{ t("mediaUsage.attachedNote") }}
                  </p>
                  <table class="mud__table">
                    <thead>
                      <tr>
                        <th>{{ t("mediaUsage.col.record") }}</th>
                        <th>{{ t("mediaUsage.col.created") }}</th>
                        <th>{{ t("mediaUsage.col.attached") }}</th>
                        <th>{{ t("mediaUsage.col.targetAlive") }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in data.records" :key="r.name">
                        <td class="mud__mono">{{ r.name }}</td>
                        <td>{{ r.creation.slice(0, 16) }}</td>
                        <td>
                          <template v-if="r.attached_to_doctype">
                            {{ r.attached_to_doctype }} · {{ r.attached_to_name }}
                          </template>
                          <span v-else class="mud__muted">{{ t("mediaUsage.unattached") }}</span>
                        </td>
                        <td>
                          <span v-if="r.target_exists === true" class="mud__ok">✓</span>
                          <span v-else-if="r.target_exists === false" class="mud__danger">
                            {{ t("mediaUsage.targetGone") }}
                          </span>
                          <span v-else class="mud__muted">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mud__scrim {
    z-index: 70;
    @include media.scrim;
  }

  .mud {
    position: relative;
    overflow: hidden;
    @include media.dialog(52rem);
  }

  .mud__close {
    position: absolute;
    top: media.$s-2;
    inset-inline-end: media.$s-2;
    z-index: 2;
    @include media.icon-button;
  }

  // ── İki sütun ────────────────────────────────────────────────────
  .mud__split {
    display: grid;
    grid-template-columns: 15rem minmax(0, 1fr);
    flex: 1;
    min-height: 0;

    @media (max-width: 700px) {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
  }

  .mud__side {
    display: flex;
    flex-direction: column;
    gap: media.$s-3;
    padding: media.$s-4;
    background: $l-bg-subtle;
    border-inline-end: 1px solid $l-border-alt;

    @include dark {
      background: $d-bg;
      border-inline-end-color: $d-border-inner;
    }

    @media (max-width: 700px) {
      border-inline-end: 0;
      @include media.divider(bottom);
    }
  }

  .mud__preview {
    position: relative;
    // Kare kutu: ürün görsellerinin çoğu 1:1 — alan tamamen dolar, kırpma
    // olmaz; oranı farklı dosyada kalan boşluk nötr zeminle dolar.
    aspect-ratio: 1;
    border-radius: media.$r-lg;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: $l-bg-muted;

    img {
      // ÖLÇÜLDÜ (headless, 2026-08-31): akış içindeki img'de `height: 100%`,
      // aspect-ratio'lu kapsayıcıyla DÖNGÜSEL hesaba düşüp auto'ya dönüyor —
      // kare görsel kutudan taşıp kırpılıyordu (207px img / 129px kutu).
      // Mutlak konum döngüyü kırar; `contain` dosyanın tamamını sığdırır,
      // artan alan zeminin nötr rengiyle dolar.
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    @include dark {
      background: $d-bg-elevated;
    }
  }

  // Görsel önizlemesi olmayan dosya (video, PDF…) koyu karoda ikonla temsil
  // edilir — iki temada da aynı; kasıtlı sabit renk.
  .mud__preview--dark {
    background: linear-gradient(135deg, #2b2a27, #55524c);
    color: #fff;
  }

  .mud__preview-ext {
    font-family: ui-monospace, monospace;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .mud__title {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .mud__name {
    font-weight: 700;
    @include media.truncate;
  }

  .mud__sub {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mud__meta {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    margin: 0;
  }

  .mud__meta-row {
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
      @include media.numeric;
    }
  }

  .mud__copy {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    width: fit-content;
    border: 0;
    border-radius: media.$r-md;
    padding: media.$s-1 media.$s-2;
    background: none;
    color: $brand-text;
    font-weight: 700;
    cursor: pointer;
    @include media.text("xs");
    @include media.focus-ring;

    @include dark {
      color: $brand-light;
    }

    @include media.hoverable {
      &:hover {
        background: rgba($brand, 0.14);
      }
    }
  }

  // ── Sağ sütun ────────────────────────────────────────────────────
  .mud__main {
    min-width: 0;
    overflow-y: auto;
    padding: media.$s-4;
    // Kapatma düğmesi köşede yüzer; ilk satır altına girmesin.
    padding-inline-end: 3.25rem;

    @media (max-width: 700px) {
      overflow-y: visible;
    }
  }

  .mud__body {
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  .mud__verdict {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-lg;
    @include media.text("sm");
    font-weight: 600;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mud__verdict--ok {
    color: $c-success-text;
    background: media.$tint-success;

    @include dark {
      color: $c-success;
    }
  }

  .mud__verdict--warn {
    color: $c-warning-text;
    background: media.$tint-warning;

    @include dark {
      color: $c-warning;
    }
  }

  .mud__verdict--danger {
    color: $c-error-text;
    background: media.$tint-danger;

    @include dark {
      color: $c-error;
    }
  }

  .mud__sec-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 media.$s-2;
    @include media.text("xs");
    @include media.muted(1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mud__note {
    @include media.text("xs");
    @include media.muted(2);
    margin: 0 0 0.5rem;
  }

  .mud__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
  }

  // Kullanım kartı: başlık + meta solda, durum ve tüm-görseller sağda.
  .mud__use {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3;
    border: 1px solid $l-border-alt;
    border-radius: media.$r-lg;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .mud__use-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .mud__use-title {
    @include media.text("sm");
    font-weight: 700;
    @include media.truncate;
  }

  .mud__use-meta {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
    @include media.text("xs");
    @include media.muted(1);
  }

  .mud__url {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: $brand-text;
    font-weight: 600;
    text-decoration: none;

    @include dark {
      color: $brand-light;
    }

    &:hover {
      text-decoration: underline;
    }
  }

  .mud__status {
    flex: none;
    @include media.chip("neutral");
  }

  .mud__status--Active {
    @include media.chip("success");
  }

  .mud__allmedia {
    flex: none;
    @include media.icon-button;
    @include media.focus-ring;

    width: 2rem;
    height: 2rem;
  }

  .mud__fields {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .mud__chip {
    @include media.chip("neutral");
  }

  .mud__chip--slot {
    @include media.chip("brand");
  }

  .mud__redundant {
    @include media.chip("warning");
  }

  .mud__warn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.35rem 0 0.5rem;
    @include media.text("xs");
    color: $c-warning-text;

    @include dark {
      color: $c-warning;
    }
  }

  // ── Teknik ayrıntılar katlaması ──────────────────────────────────
  .mud__fold {
    border: 1px solid $l-border-alt;
    border-radius: media.$r-lg;
    overflow: hidden;

    @include dark {
      border-color: $d-border-inner;
    }
  }

  .mud__fold-head {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    width: 100%;
    padding: media.$s-2 media.$s-3;
    border: 0;
    background: none;
    cursor: pointer;
    font-family: inherit;
    text-align: start;
    @include media.focus-ring;

    @include media.hoverable {
      &:hover {
        background: $l-bg-subtle;

        @include dark {
          background: $d-item-hover;
        }
      }
    }
  }

  .mud__fold-title {
    flex: 1;
    @include media.text("sm");
    font-weight: 700;
  }

  .mud__fold-badge {
    @include media.chip("neutral");
    @include media.numeric;
  }

  .mud__fold-chev {
    color: $l-text-400;
    transition: transform $t-base;

    @include dark {
      color: $d-text-muted;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  .mud__fold--open .mud__fold-chev {
    transform: rotate(180deg);
  }

  .mud__fold-body {
    padding: media.$s-1 media.$s-3 media.$s-3;
  }

  .mud__fold-sub {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: media.$s-3 0 0.35rem;
    @include media.text("sm");
    font-weight: 700;
  }

  .mud__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("xs");

    th,
    td {
      text-align: left;
      padding: 0.3rem 0.4rem;
      @include media.divider(bottom);
    }

    th {
      @include media.muted(1);
      font-weight: 600;
    }
  }

  .mud__mono {
    font-family: ui-monospace, monospace;
  }

  .mud__muted {
    @include media.muted(2);
  }

  .mud__ok {
    color: $c-success;
  }

  .mud__danger {
    color: $c-error;
  }

  .mud__empty {
    padding: 3rem;
    text-align: center;
    @include media.muted(2);
  }
</style>
