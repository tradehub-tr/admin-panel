<script setup>
  /**
   * Yetim AVIF türevleri (Sistem → Medya, yalnız System Manager) — 2026-09-30.
   *
   * Ürün görseli türevleri AVIF'ten WebP'ye geçti. Eski AVIF dosyaları
   * kullanıcı kararıyla SİLİNMEDİ; bu ekran önce onları GÖSTERİR: toplam
   * sayı/boyut, sebep dağılımı, varlık bazında gruplar ve önizleme.
   *
   * Silme düğmesi yalnız KURU KOŞU yapar ("ne silinirdi"). Gerçek işlem ayrı
   * bir onay diyaloğunda, kuru koşunun onay jetonuyla ve backend'in denetimli
   * çöp kapısından geçer (soft-delete, 30 gün geri alınabilir).
   */
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import api from "@/utils/api";
  import { formatSize } from "@/utils/mediaFormat";
  import {
    ORPHAN_API,
    ORPHAN_REASONS,
    canConfirmDelete,
    deletePayload,
    reasonChips,
    reasonKey,
  } from "@/lib/media/orphanAvif";

  const { t } = useI18n();

  const loading = ref(false);
  const error = ref("");
  const data = ref(null);
  const page = ref(1);
  const pageSize = ref(20);
  const slot = ref("product.image");

  const dryRun = ref(null);
  const dryRunAssets = ref([]);
  const dialogOpen = ref(false);
  const busy = ref(false);
  const confirmText = ref("");

  const groups = computed(() => data.value?.groups || []);

  async function load(refresh = false) {
    loading.value = true;
    error.value = "";
    try {
      const r = await api.callMethodGET(`${ORPHAN_API}.orphan_avif_overview`, {
        page: page.value,
        page_size: pageSize.value,
        slot: slot.value,
        refresh: refresh ? 1 : 0,
      });
      data.value = r?.message || null;
    } catch (e) {
      error.value = e?.message || t("mediaOrphanAvif.loadError");
    } finally {
      loading.value = false;
    }
  }

  function changePage(n) {
    page.value = n;
    load();
  }

  function changeSlot() {
    page.value = 1;
    load();
  }

  /** Kuru koşu: hiçbir dosyaya dokunmaz, "ne silinirdi" döner. */
  async function preview(assets) {
    busy.value = true;
    try {
      const r = await api.callMethod(
        `${ORPHAN_API}.orphan_avif_delete`,
        deletePayload(assets, null)
      );
      dryRun.value = r?.message || null;
      dryRunAssets.value = assets;
      confirmText.value = "";
      dialogOpen.value = true;
    } catch (e) {
      error.value = e?.message || t("mediaOrphanAvif.loadError");
    } finally {
      busy.value = false;
    }
  }

  const confirmWord = computed(() => t("mediaOrphanAvif.dialog.confirmWord"));
  const confirmReady = computed(
    () => canConfirmDelete(dryRun.value) && confirmText.value.trim() === confirmWord.value
  );

  async function executeDelete() {
    if (!confirmReady.value) return;
    busy.value = true;
    try {
      await api.callMethod(
        `${ORPHAN_API}.orphan_avif_delete`,
        deletePayload(dryRunAssets.value, dryRun.value, { confirm: true })
      );
      dialogOpen.value = false;
      await load(true);
    } catch (e) {
      error.value = e?.message || t("mediaOrphanAvif.loadError");
    } finally {
      busy.value = false;
    }
  }

  onMounted(() => load());
</script>

<template>
  <section class="moa">
    <header class="moa__head">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("mediaOrphanAvif.title") }}
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t("mediaOrphanAvif.subtitle") }}</p>
      </div>
      <div class="moa__actions">
        <select
          v-model="slot"
          class="moa__select"
          :aria-label="t('mediaOrphanAvif.slotFilter')"
          @change="changeSlot"
        >
          <option value="product.image">{{ t("mediaOrphanAvif.slot.product") }}</option>
          <option value="">{{ t("mediaOrphanAvif.slot.all") }}</option>
        </select>
        <button type="button" class="hdr-btn-outlined" :disabled="loading" @click="load(true)">
          <AppIcon name="refresh-cw" :size="14" />
          {{ t("mediaOrphanAvif.refresh") }}
        </button>
        <button
          type="button"
          class="hdr-btn-outlined"
          :disabled="busy || !data?.deletable_files"
          data-testid="moa-preview-all"
          @click="preview([])"
        >
          <AppIcon name="trash-2" :size="14" />
          {{ t("mediaOrphanAvif.previewDeleteAll") }}
        </button>
      </div>
    </header>

    <p v-if="error" class="moa__error" role="alert">{{ error }}</p>

    <div v-if="data" class="moa__stats">
      <div class="card moa__stat">
        <span class="moa__stat-label">{{ t("mediaOrphanAvif.stat.files") }}</span>
        <strong>{{ data.total_files }}</strong>
      </div>
      <div class="card moa__stat">
        <span class="moa__stat-label">{{ t("mediaOrphanAvif.stat.size") }}</span>
        <strong>{{ formatSize(data.total_bytes) }}</strong>
      </div>
      <div class="card moa__stat">
        <span class="moa__stat-label">{{ t("mediaOrphanAvif.stat.groups") }}</span>
        <strong>{{ data.total_groups }}</strong>
      </div>
      <div class="card moa__stat">
        <span class="moa__stat-label">{{ t("mediaOrphanAvif.stat.deletable") }}</span>
        <strong>{{ data.deletable_files }} · {{ formatSize(data.deletable_bytes) }}</strong>
      </div>
    </div>

    <ul v-if="data" class="moa__reasons">
      <li v-for="r in ORPHAN_REASONS" :key="r">
        <span class="moa__chip" :class="`moa__chip--${r}`">{{ t(reasonKey(r)) }}</span>
        {{ data.by_reason?.[r]?.count || 0 }} · {{ formatSize(data.by_reason?.[r]?.bytes || 0) }}
      </li>
    </ul>

    <p v-if="loading" class="text-xs text-gray-500">{{ t("mediaOrphanAvif.loading") }}</p>
    <p v-else-if="data && !groups.length" class="moa__empty">{{ t("mediaOrphanAvif.empty") }}</p>

    <ul v-else class="moa__list">
      <li v-for="g in groups" :key="g.asset" class="card moa__group" data-testid="moa-group">
        <img
          v-if="g.preview"
          :src="g.preview"
          :alt="g.file_name || g.asset"
          class="moa__thumb"
          width="72"
          height="72"
          loading="lazy"
          decoding="async"
        />
        <div class="moa__group-body">
          <div class="moa__group-title">
            <strong>{{ g.file_name || g.asset }}</strong>
            <span class="text-xs text-gray-500">{{ g.asset }}</span>
            <span v-if="g.listing" class="text-xs text-gray-500">· {{ g.listing }}</span>
          </div>
          <div class="moa__group-meta">
            <span
              >{{ t("mediaOrphanAvif.groupFiles", { n: g.count }) }} ·
              {{ formatSize(g.bytes) }}</span
            >
            <span
              v-for="c in reasonChips(g.reasons)"
              :key="c.reason"
              class="moa__chip"
              :class="`moa__chip--${c.reason}`"
            >
              {{ t(c.key) }} ({{ c.count }})
            </span>
          </div>
          <details class="moa__files">
            <summary>{{ t("mediaOrphanAvif.showFiles") }}</summary>
            <ul>
              <li v-for="f in g.files" :key="f.file_url">
                <a :href="f.file_url" target="_blank" rel="noopener">{{ f.file_url }}</a>
                · {{ formatSize(f.bytes) }}
              </li>
            </ul>
          </details>
        </div>
        <button
          type="button"
          class="hdr-btn-outlined text-xs"
          :disabled="busy"
          @click="preview([g.asset])"
        >
          {{ t("mediaOrphanAvif.previewDelete") }}
        </button>
      </li>
    </ul>

    <ListPagination
      v-if="data && data.total_groups > pageSize"
      :model-value="page"
      :total="data.total_groups"
      :page-size="pageSize"
      @update:model-value="changePage"
    />

    <div v-if="dialogOpen && dryRun" class="moa__dialog-backdrop" @click.self="dialogOpen = false">
      <div
        class="card moa__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moa-dialog-title"
      >
        <h2 id="moa-dialog-title" class="text-sm font-bold">
          {{ t("mediaOrphanAvif.dialog.title") }}
        </h2>
        <p class="text-xs">{{ t("mediaOrphanAvif.dialog.dryRunNote") }}</p>
        <p class="moa__dialog-sum">
          {{
            t("mediaOrphanAvif.dialog.wouldDelete", {
              n: dryRun.would_delete_files,
              size: formatSize(dryRun.would_delete_bytes),
            })
          }}
        </p>
        <p v-if="dryRun.skipped_unregistered" class="text-xs text-gray-500">
          {{ t("mediaOrphanAvif.dialog.skippedUnregistered", { n: dryRun.skipped_unregistered }) }}
        </p>
        <ul class="moa__dialog-sample">
          <li v-for="u in dryRun.sample" :key="u">{{ u }}</li>
        </ul>
        <label class="text-xs">
          {{ t("mediaOrphanAvif.dialog.typeToConfirm", { word: confirmWord }) }}
          <input v-model="confirmText" type="text" class="moa__input" autocomplete="off" />
        </label>
        <div class="moa__dialog-actions">
          <button type="button" class="hdr-btn-outlined" @click="dialogOpen = false">
            {{ t("mediaOrphanAvif.dialog.cancel") }}
          </button>
          <button
            type="button"
            class="hdr-btn-outlined moa__danger"
            :disabled="!confirmReady || busy"
            @click="executeDelete"
          >
            {{ t("mediaOrphanAvif.dialog.confirm") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .moa {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .moa__head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
  }
  .moa__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .moa__select,
  .moa__input {
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
    background: transparent;
  }
  .moa__input {
    display: block;
    width: 100%;
    margin-top: 4px;
  }
  .moa__error {
    color: $c-error;
    font-size: 13px;
  }
  .moa__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
  }
  .moa__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
  }
  .moa__stat-label {
    font-size: 12px;
    opacity: 0.7;
  }
  .moa__reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
  }
  .moa__chip {
    display: inline-block;
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 11px;
    background: rgba(0, 0, 0, 0.06);
  }
  .moa__chip--unregistered {
    background: rgba($c-warning, 0.18);
  }
  .moa__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .moa__group {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px;
  }
  .moa__thumb {
    width: 72px;
    height: 72px;
    object-fit: contain;
    border-radius: 8px;
    background: #fff;
    flex: none;
  }
  .moa__group-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }
  .moa__group-title,
  .moa__group-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .moa__files {
    font-size: 12px;
    word-break: break-all;
  }
  .moa__empty {
    font-size: 13px;
    opacity: 0.7;
  }
  .moa__dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
    padding: 16px;
  }
  .moa__dialog {
    width: min(520px, 100%);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .moa__dialog-sum {
    font-weight: 600;
    font-size: 13px;
  }
  .moa__dialog-sample {
    max-height: 140px;
    overflow: auto;
    font-size: 11px;
    word-break: break-all;
    opacity: 0.8;
  }
  .moa__dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .moa__danger:not(:disabled) {
    color: $c-error;
    border-color: $c-error;
  }
  @media (max-width: 640px) {
    .moa__group {
      flex-wrap: wrap;
    }
  }
</style>
