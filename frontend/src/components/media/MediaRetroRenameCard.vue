<script setup>
  /**
   * Eski adlandırma (retro-rename) operatör kartı (MOGEM-582).
   *
   * Akış: kart açılışında ucuz sayaç (`loadCount`) + geri alınabilir iş
   * geçmişi (`loadHistory`) yüklenir — `loadPlan()` MOUNT'TA ÇAĞRILMAZ, çünkü
   * ~20 sn sürebilir (bkz. `useMediaRetroRename.js`). "Önizle" tıklanınca
   * `loadPlan()` tetiklenir ve süresince `planLoading` göstergesi basılır.
   */
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useMediaRetroRename } from "@/composables/useMediaRetroRename";
  import { formatDay } from "@/utils/dateFormat";

  const DAYS = 90;
  const { t, locale } = useI18n();
  const r = useMediaRetroRename();

  const previewOpen = ref(false);
  const dryRun = ref(false);
  const confirmOpen = ref(false);
  const rollbackOpen = ref(false);
  const rollbackTarget = ref(null);

  onMounted(() => {
    r.loadCount();
    r.loadHistory();
  });

  const pendingCount = computed(() => r.pendingCount.value);
  // `count` ucunun kırılımı: `renamable` bu araçla taşınabilenler, `diskMissing`
  // `tabFile` eski adresi gösteriyor ama blob diskte yok. Kart eskiden `total`'a
  // bakıyordu ve yalnız bayat satır kalan bir sitede sonsuza dek "N dosya
  // bekliyor" diyip taşınamaz bir "Önizle" düğmesi gösteriyordu.
  const renamableCount = computed(() => r.renamableCount.value);
  const diskMissingCount = computed(() => r.diskMissingCount.value);
  const allDone = computed(() => renamableCount.value === 0 && diskMissingCount.value === 0);
  const onlyDiskMissing = computed(() => renamableCount.value === 0 && diskMissingCount.value > 0);
  const percent = computed(() => (r.job.total ? Math.round((r.job.processed / r.job.total) * 100) : 0));
  const terminal = computed(() => !!r.job.key && !r.running.value);
  const refsTotal = computed(() => (r.plan.value?.refs_exact || 0) + (r.plan.value?.refs_embedded || 0));

  function openPreview() {
    previewOpen.value = true;
    r.loadPlan();
  }
  function askStart() {
    confirmOpen.value = true;
  }
  async function onConfirm() {
    confirmOpen.value = false;
    previewOpen.value = false;
    await r.start({ dryRun: dryRun.value });
  }
  function askRollback(job) {
    rollbackTarget.value = job;
    rollbackOpen.value = true;
  }
  async function onRollback() {
    rollbackOpen.value = false;
    if (rollbackTarget.value) await r.rollback(rollbackTarget.value.job_key);
  }

  // Yalnız İŞ ÇALIŞIRKEN "prova/çalışıyor/geri alınıyor" gösterir; terminal
  // durumda mode her zaman son işin türünü taşıdığından (rename ya da
  // rollback) "geri alınıyor" başlığı bittikten sonra da yapışıp kalırdı.
  const jobTitle = computed(() => {
    if (r.running.value) {
      if (r.job.mode === "rollback") return t("mediaRetroRename.rollingBack");
      return r.job.dry_run ? t("mediaRetroRename.dryRunning") : t("mediaRetroRename.running");
    }
    const s = r.job.state;
    if (s === "not_found") return t("mediaRetroRename.error");
    return t(`mediaRetroRename.${s === "completed" ? "done" : s || "done"}`);
  });
</script>

<template>
  <div class="card mb-3 mrr" data-testid="retro-rename-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold">{{ t("mediaRetroRename.title") }}</h3>
        <p v-if="pendingCount === null" class="text-sm opacity-70">…</p>
        <p v-else-if="allDone" class="text-sm text-emerald-700 dark:text-emerald-300">
          {{ t("mediaRetroRename.allDone") }}
        </p>
        <p v-else-if="onlyDiskMissing" class="text-sm opacity-80">
          {{ t("mediaRetroRename.onlyDiskMissing", { count: diskMissingCount }) }}
        </p>
        <template v-else>
          <p class="text-sm">{{ t("mediaRetroRename.pending", { count: pendingCount }) }}</p>
          <p class="text-xs opacity-70">{{ t("mediaRetroRename.hint", { days: DAYS }) }}</p>
        </template>
        <p v-if="r.lastError.value" class="text-sm text-red-600">{{ r.lastError.value }}</p>
      </div>
      <button
        v-if="renamableCount > 0 && !r.running.value"
        type="button"
        class="hdr-btn-outlined"
        @click="openPreview"
      >
        {{ t("mediaRetroRename.preview") }}
      </button>
    </div>

    <!-- Önizleme -->
    <div v-if="previewOpen" class="mt-3 border-t pt-3">
      <strong>{{ t("mediaRetroRename.previewTitle") }}</strong>

      <p v-if="r.planLoading.value" class="text-sm opacity-70 mt-2">
        {{ t("mediaRetroRename.planLoading") }}
      </p>
      <p v-else-if="r.planError.value" class="text-sm text-red-600 mt-2">{{ r.planError.value }}</p>
      <dl v-else-if="r.plan.value" class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
        <div>
          <dt class="opacity-70">{{ t("mediaRetroRename.stats.renamable") }}</dt>
          <dd><b>{{ r.plan.value.renamable }}</b></dd>
        </div>
        <div>
          <dt class="opacity-70">{{ t("mediaRetroRename.stats.refs") }}</dt>
          <dd><b>{{ refsTotal }}</b></dd>
        </div>
        <div>
          <dt class="opacity-70">{{ t("mediaRetroRename.stats.orphans") }}</dt>
          <dd><b>{{ r.plan.value.orphans }}</b></dd>
        </div>
        <div>
          <dt class="opacity-70">{{ t("mediaRetroRename.stats.diskMissing") }}</dt>
          <dd><b>{{ r.plan.value.disk_missing }}</b></dd>
        </div>
        <div>
          <dt class="opacity-70">{{ t("mediaRetroRename.stats.collisions") }}</dt>
          <dd><b>{{ r.plan.value.collisions }}</b></dd>
        </div>
        <div>
          <dt class="opacity-70">{{ t("mediaRetroRename.stats.readonly") }}</dt>
          <dd><b>{{ r.plan.value.refs_readonly }}</b></dd>
        </div>
      </dl>

      <label v-if="r.plan.value" class="flex items-center gap-2 mt-3 text-sm">
        <input v-model="dryRun" type="checkbox" /> {{ t("mediaRetroRename.dryRun") }}
      </label>

      <div class="flex justify-end gap-2 mt-3">
        <button type="button" class="hdr-btn-outlined" @click="previewOpen = false">
          {{ t("mediaRetroRename.cancel") }}
        </button>
        <button
          v-if="r.plan.value"
          type="button"
          class="hdr-btn-primary"
          :disabled="!r.plan.value.renamable"
          @click="askStart"
        >
          {{ t("mediaRetroRename.start") }}
        </button>
      </div>
    </div>

    <!-- İlerleme / sonuç -->
    <div v-if="r.job.key" class="mt-3 border-t pt-3">
      <div class="flex items-center justify-between">
        <strong>{{ jobTitle }}</strong>
        <span class="text-sm">
          {{ r.job.processed }} / {{ r.job.total }} — %{{ percent }}
          <button
            v-if="terminal"
            type="button"
            class="mrr__close ml-2"
            :title="t('mediaRetroRename.close')"
            @click="r.resetJob()"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </span>
      </div>
      <div class="mrr__progress mt-2">
        <span class="mrr__progress-fill" :style="{ width: percent + '%' }" />
      </div>
      <div class="flex flex-wrap gap-3 text-sm mt-1">
        <span>{{ t("mediaRetroRename.renamed") }}: <b>{{ r.job.renamed }}</b></span>
        <span>{{ t("mediaRetroRename.skipped") }}: <b>{{ r.job.skipped }}</b></span>
        <span v-if="r.job.errors" class="text-red-600">
          {{ t("mediaRetroRename.errors") }}: <b>{{ r.job.errors }}</b>
        </span>
      </div>
      <!-- Dosya sayısı ≠ referans sayısı: tek blob onlarca alanda geçebilir.
           `refsSkipped` "kaç referans 301 köprüsüne muhtaç kaldı" demek. -->
      <div class="text-sm mt-1 opacity-80">
        {{ t("mediaRetroRename.refsUpdated") }}: <b>{{ r.job.refs_updated }}</b>
        · {{ t("mediaRetroRename.refsSkipped") }}: <b>{{ r.job.refs_skipped }}</b>
      </div>
      <div v-if="Object.keys(r.job.skip_reasons).length" class="mrr__reasons mt-1">
        <span v-for="(count, reason) in r.job.skip_reasons" :key="reason" class="mrr__chip">
          {{ t(`mediaRetroRename.skip.${reason}`) }} <b>{{ count }}</b>
        </span>
      </div>
      <p v-if="r.job.message" class="text-sm mt-1 opacity-80">{{ r.job.message }}</p>
      <p v-if="terminal && !r.job.dry_run && r.job.mode === 'rename' && r.job.expires_at" class="text-sm mt-1">
        {{ t("mediaRetroRename.redirectUntil", { date: formatDay(r.job.expires_at, locale) }) }}
      </p>
      <button
        v-if="r.running.value && r.job.mode === 'rename'"
        type="button"
        class="hdr-btn-outlined mt-2"
        @click="r.stop()"
      >
        {{ t("mediaRetroRename.stop") }}
      </button>
    </div>

    <!-- Geri alınabilir işler -->
    <div v-if="r.canRollback.value" class="mt-3 border-t pt-3 text-sm">
      <div v-for="j in r.history.value" :key="j.job_key" class="flex items-center justify-between py-1">
        <span>{{ j.count }} · {{ t("mediaRetroRename.redirectUntil", { date: formatDay(j.expires_at, locale) }) }}</span>
        <button type="button" class="hdr-btn-outlined" @click="askRollback(j)">
          {{ t("mediaRetroRename.rollback") }}
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('mediaRetroRename.confirmTitle')"
      :message="t('mediaRetroRename.confirmMessage', { count: r.plan.value?.renamable || 0, refs: refsTotal, days: DAYS })"
      :confirm-label="t('mediaRetroRename.confirmOk')"
      tone="warning"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
    <ConfirmDialog
      v-model:open="rollbackOpen"
      :title="t('mediaRetroRename.rollback')"
      :message="t('mediaRetroRename.rollbackConfirm', { count: rollbackTarget?.count || 0 })"
      :confirm-label="t('mediaRetroRename.rollback')"
      tone="danger"
      @confirm="onRollback"
      @cancel="rollbackOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mrr__progress {
    height: 5px;
    border-radius: media.$r-sm;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mrr__progress-fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;
  }

  .mrr__reasons {
    display: flex;
    gap: media.$s-1;
    flex-wrap: wrap;
  }

  .mrr__chip {
    @include media.chip("neutral");
  }

  .mrr__close {
    @include media.icon-button;
  }
</style>
