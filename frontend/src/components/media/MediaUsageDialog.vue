<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatSize } from "@/utils/mediaFormat";
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

  const data = ref(null);
  const loading = ref(false);

  watch(
    () => [open.value, props.item?.file_url],
    async ([isOpen, url]) => {
      if (!isOpen || !url) return;
      loading.value = true;
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
    () => ({ in_use: "ok", order_only: "warn", history_only: "warn", unused: "danger" })[data.value?.verdict] || ""
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
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mud__scrim" @click.self="open = false">
      <section class="mud" role="dialog" aria-modal="true">
        <header class="mud__head">
          <div class="mud__title">
            <span class="mud__name">{{ item?.file_name }}</span>
            <span class="mud__sub">{{ formatSize(item?.file_size) }} · {{ item?.file_url }}</span>
          </div>
          <button type="button" class="mud__close" :aria-label="t('mediaUsage.close')" @click="open = false">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <div v-if="loading" class="mud__empty">{{ t("mediaUsage.loading") }}</div>

        <div v-else-if="data" class="mud__body">
          <!-- Karar şeridi: silinebilir mi sorusunun tek cümlelik cevabı -->
          <p class="mud__verdict" :class="`mud__verdict--${verdictTone}`">
            <AppIcon
              :name="data.verdict === 'in_use' ? 'check-circle' : data.verdict === 'unused' ? 'trash-2' : 'clock'"
              :size="15"
            />
            {{ t(`mediaUsage.verdict.${data.verdict}`) }}
          </p>

          <!-- Canlı kullanım — hangi üründe, hangi alanda, varyant mı -->
          <section v-if="grouped.length" class="mud__block">
            <h3>{{ t("mediaUsage.liveTitle", { n: grouped.length }) }}</h3>
            <ul class="mud__list">
              <li v-for="g in grouped" :key="`${g.doctype}:${g.name}`" class="mud__use">
                <div class="mud__use-head">
                  <span class="mud__row-label">{{ g.label }}</span>
                  <span v-if="g.status" class="mud__status" :class="`mud__status--${g.status}`">
                    {{ g.status }}
                  </span>
                  <!-- Ters arama girişi: bu üründeki TÜM görseller (TUR-136) -->
                  <button
                    type="button"
                    class="mud__link"
                    :title="t('mediaUsage.allMediaHint')"
                    @click="emit('open-record', { doctype: g.doctype, name: g.name, label: g.label })"
                  >
                    <AppIcon name="image" :size="12" />
                    {{ t("mediaUsage.allMedia") }}
                  </button>
                </div>
                <span class="mud__row-meta">{{ g.doctype }} · {{ g.name }}</span>
                <a
                  v-if="g.pageUrl"
                  class="mud__url"
                  :href="g.pageUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="t('mediaUsage.openPage')"
                >
                  <AppIcon name="external-link" :size="11" />
                  {{ g.pageUrl }}
                </a>
                <span v-else class="mud__row-meta">{{ t("mediaUsage.noPage") }}</span>
                <div class="mud__fields">
                  <span v-for="(f, i) in g.fields" :key="i" class="mud__chip mud__chip--slot">
                    {{ fieldLabel(f) }}
                    <b v-if="f.is_default">★</b>
                  </span>
                </div>
              </li>
            </ul>
          </section>

          <!-- Sipariş kopyaları -->
          <section v-if="data.orders?.length" class="mud__block">
            <h3>{{ t("mediaUsage.orderTitle", { n: data.orders.length }) }}</h3>
            <p class="mud__note">{{ t("mediaUsage.orderNote") }}</p>
            <div class="mud__fields">
              <span v-for="(o, i) in data.orders" :key="i" class="mud__chip">
                {{ o.field }} · {{ o.name }}
              </span>
            </div>
          </section>

          <!-- Geçmiş izleri -->
          <section v-if="data.history?.length" class="mud__block">
            <h3>{{ t("mediaUsage.historyTitle") }}</h3>
            <p class="mud__note">{{ t("mediaUsage.historyNote") }}</p>
            <div class="mud__fields">
              <span v-for="h in data.history" :key="h.kind" class="mud__chip">
                {{ h.label }} <b>{{ h.count }}</b>
              </span>
            </div>
          </section>

          <!-- File kayıtları — "5 kez yüklenmiş" burada açılıyor -->
          <section class="mud__block">
            <h3>
              {{ t("mediaUsage.recordsTitle", { n: data.records.length }) }}
              <span v-if="data.redundant_records" class="mud__redundant">
                {{ t("mediaUsage.redundant", { n: data.redundant_records }) }}
              </span>
            </h3>
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
          </section>
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
    @include media.dialog(44rem);
  }

  .mud__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    @include media.divider(bottom);
  }

  .mud__title {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .mud__name {
    font-weight: 700;
    @include media.truncate;
  }

  .mud__sub {
    @include media.text("xs");
    @include media.muted(1);
    @include media.truncate;
  }

  .mud__close {
    @include media.icon-button;
  }

  .mud__body {
    overflow-y: auto;
    padding: media.$s-3 media.$s-4 media.$s-4;
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  .mud__verdict {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: media.$s-2 media.$s-3;
    border-radius: 0.45rem;
    @include media.text("sm");
    font-weight: 600;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mud__verdict--ok {
    color: $c-success;
  }

  .mud__verdict--warn {
    color: $c-warning;
  }

  .mud__verdict--danger {
    color: $c-error;
  }

  .mud__block h3 {
    @include media.text("sm");
    font-weight: 700;
    margin: 0 0 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
  }

  .mud__use {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: media.$s-2 0;
    @include media.divider(bottom);
  }

  .mud__use-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .mud__chip--slot {
    @include media.chip("brand");
  }

  .mud__warn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.35rem 0 0;
    @include media.text("xs");
    color: $c-warning;
  }

  .mud__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-2 0;
    @include media.divider(bottom);
  }

  .mud__row-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .mud__row-label {
    @include media.text("sm");
    @include media.truncate;
  }

  .mud__row-meta {
    @include media.text("xs");
    @include media.muted(1);
  }

  .mud__status {
    margin-left: 0.3rem;
    @include media.chip("neutral");
  }

  .mud__url {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: $brand;
    text-decoration: none;
    word-break: break-all;
    @include media.text("xs");

    &:hover {
      text-decoration: underline;
    }
  }

  .mud__link {
    margin-inline-start: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    color: $brand;
    cursor: pointer;
    @include media.text("xs");

    &:hover {
      text-decoration: underline;
    }
  }

  .mud__status--Active {
    @include media.chip("success");
  }

  .mud__fields {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .mud__chip {
    @include media.chip("neutral");
  }

  .mud__redundant {
    @include media.chip("warning");
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
