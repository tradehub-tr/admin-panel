<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import { useCatalogApi } from "@/composables/useCatalogApi";
  import { useToast } from "@/composables/useToast";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { isIosApp } from "@/utils/platform";

  // MOGEM-665 · 6. aşama — satıcı ERP bağlantısını panelden yönetir:
  // kimlik bilgisi (sır bir kez görünür), webhook, giden stok olayları (retry/dead-letter).
  const { t } = useI18n();
  const toast = useToast();
  const { isLg } = useBreakpoint();
  const {
    loading,
    saving,
    rotating,
    loadingEvents,
    getConnection,
    createOrRotate,
    setWebhook,
    revoke,
    listEvents,
    retryEvent,
  } = useCatalogApi();

  // AC-1 (Apple 3.1.1 anti-steering): iOS'ta gate metni yükseltmeye atıf yapamaz.
  const gateTextKey = isIosApp() ? "apiConnection.gateTextIos" : "apiConnection.gateText";

  const conn = ref(null);
  const freshSecret = ref(""); // yalnız oluşturma/yenileme cevabından; sayfa yenilenince kaybolur
  const pendingAction = ref(null); // "rotate" | "revoke" — satır içi onay (tarayıcı diyaloğu YOK)

  const webhookForm = ref({ url: "", secret: "" });

  const eventStatus = ref("");
  const events = ref([]);
  const eventsTotal = ref(0);
  const eventCounts = ref({ queued: 0, sent: 0, failed: 0, dead: 0 });
  const page = ref(1);
  const PAGE_SIZE = 20;

  const canUseApi = computed(() => !!conn.value?.features?.api_access);
  const canUseWebhook = computed(() => !!conn.value?.features?.webhook);
  const hasConnection = computed(() => !!conn.value?.client_id);
  const isActive = computed(() => !!conn.value?.is_active);
  const tokenUrl = computed(
    () => conn.value?.token_url || "/api/method/tradehub_core.api.v1.public_api.token"
  );

  const STATUS_KEYS = ["queued", "sent", "failed", "dead"];

  async function load() {
    conn.value = await getConnection();
    webhookForm.value = { url: conn.value?.webhook_url || "", secret: "" };
    if (hasConnection.value) await loadEvents();
  }

  async function loadEvents() {
    const res = await listEvents({
      status: eventStatus.value,
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE,
    });
    if (!res) return;
    events.value = res.events || [];
    eventsTotal.value = res.total || 0;
    eventCounts.value = { ...eventCounts.value, ...(res.counts || {}) };
  }

  function setEventStatus(status) {
    eventStatus.value = status;
    page.value = 1;
    loadEvents();
  }

  function onPage(p) {
    page.value = p;
    loadEvents();
  }

  async function onCreate() {
    const res = await createOrRotate();
    if (!res) return;
    freshSecret.value = res.client_secret || "";
    toast.success(
      t(res.created ? "apiConnection.connectionCreated" : "apiConnection.secretRotated")
    );
    pendingAction.value = null;
    await load();
  }

  async function onRevoke() {
    const res = await revoke();
    if (!res) return;
    freshSecret.value = "";
    pendingAction.value = null;
    toast.success(t("apiConnection.revoked"));
    await load();
  }

  async function onSaveWebhook() {
    const res = await setWebhook(webhookForm.value.url.trim(), webhookForm.value.secret);
    if (!res) return;
    toast.success(t("apiConnection.webhookSaved"));
    webhookForm.value.secret = "";
    await load();
  }

  async function onRetry(ev) {
    const res = await retryEvent(ev.name);
    if (!res) return;
    toast.success(t("apiConnection.retried"));
    await loadEvents();
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("apiConnection.copied"));
    } catch {
      toast.error(t("apiConnection.copyFailed"));
    }
  }

  function statusCls(status) {
    switch (status) {
      case "sent":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "failed":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "dead":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "queued":
        return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  function statusLabel(status) {
    return STATUS_KEYS.includes(status) || status === "skipped"
      ? t(`apiConnection.st_${status}`)
      : status || "—";
  }

  function reasonLabel(reason) {
    return ["reserve", "release", "deduct", "refund", "manual"].includes(reason)
      ? t(`apiConnection.reason_${reason}`)
      : reason || "—";
  }

  function fmtDate(value) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  const canRetry = (ev) => ev.status === "failed" || ev.status === "dead";

  onMounted(load);
</script>

<template>
  <div class="api-connection">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("apiConnection.title") }}
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t("apiConnection.subtitle") }}</p>
      </div>
      <button class="hdr-btn-outlined" data-testid="api-refresh" @click="load">
        <AppIcon name="refresh-cw" :size="14" /><span>{{ t("apiConnection.refresh") }}</span>
      </button>
    </div>

    <div v-if="loading || !conn" class="card p-5">
      <Skeleton variant="title" />
      <Skeleton variant="text" :count="5" />
    </div>

    <!-- Paket kapısı: free pakette API yok — form gösterilmez -->
    <div v-else-if="!canUseApi" class="card upgrade-gate" data-testid="api-gate">
      <AppIcon name="lock" :size="28" class="upgrade-gate-icon" />
      <h2 class="upgrade-gate-title">{{ t("apiConnection.gateTitle") }}</h2>
      <p class="upgrade-gate-text">{{ t(gateTextKey) }}</p>
    </div>

    <template v-else>
      <!-- 1 · Bağlantı bilgileri -->
      <section class="card mb-5" data-testid="api-credentials">
        <h2 class="card-title">{{ t("apiConnection.credentialsHeading") }}</h2>

        <div v-if="!hasConnection" class="empty-box">
          <AppIcon name="plug" :size="26" class="text-gray-400 mb-2" />
          <p class="text-sm text-gray-700 dark:text-gray-200 font-semibold">
            {{ t("apiConnection.noConnection") }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            {{ t("apiConnection.noConnectionHint") }}
          </p>
          <button
            class="hdr-btn-primary"
            :disabled="rotating"
            data-testid="api-create"
            @click="onCreate"
          >
            <AppIcon name="key-round" :size="14" />
            <span>{{ rotating ? t("apiConnection.creating") : t("apiConnection.create") }}</span>
          </button>
        </div>

        <template v-else>
          <div class="status-grid">
            <div class="status-cell status-cell--wide">
              <span class="status-key">{{ t("apiConnection.clientId") }}</span>
              <span class="mono-row">
                <code class="mono" data-testid="api-client-id">{{ conn.client_id }}</code>
                <button
                  type="button"
                  class="icon-btn"
                  :title="t('apiConnection.copy')"
                  @click="copy(conn.client_id)"
                >
                  <AppIcon name="copy" :size="13" />
                </button>
              </span>
            </div>
            <div class="status-cell">
              <span class="status-key">{{ t("apiConnection.status") }}</span>
              <span
                class="health-badge"
                :class="isActive ? 'health-badge--ok' : 'health-badge--error'"
              >
                <AppIcon :name="isActive ? 'check-circle' : 'ban'" :size="13" />
                <span>{{
                  isActive ? t("apiConnection.active") : t("apiConnection.inactive")
                }}</span>
              </span>
            </div>
            <div class="status-cell">
              <span class="status-key">{{ t("apiConnection.rateLimit") }}</span>
              <span class="status-val">
                {{ t("apiConnection.perMinute", { n: conn.rate_limit_per_minute || 0 }) }}
              </span>
            </div>
            <div class="status-cell">
              <span class="status-key">{{ t("apiConnection.tier") }}</span>
              <span class="status-val">{{ conn.rate_limit_tier || "—" }}</span>
            </div>
            <div class="status-cell">
              <span class="status-key">{{ t("apiConnection.createdAt") }}</span>
              <span class="status-val">{{ fmtDate(conn.created_at) }}</span>
            </div>
            <div class="status-cell status-cell--wide">
              <span class="status-key">{{ t("apiConnection.tokenUrl") }}</span>
              <span class="mono-row">
                <code class="mono">{{ tokenUrl }}</code>
                <button
                  type="button"
                  class="icon-btn"
                  :title="t('apiConnection.copy')"
                  @click="copy(tokenUrl)"
                >
                  <AppIcon name="copy" :size="13" />
                </button>
              </span>
            </div>
            <div class="status-cell status-cell--wide">
              <span class="status-key">{{ t("apiConnection.scopes") }}</span>
              <span class="flex flex-wrap gap-1">
                <span v-for="s in conn.scopes" :key="s" class="hdr-chip">{{ s }}</span>
              </span>
            </div>
          </div>

          <!-- Sır: yalnız oluşturma/yenileme cevabında — bir kez -->
          <div v-if="freshSecret" class="secret-box" data-testid="api-secret-box">
            <div class="flex items-start gap-2">
              <AppIcon
                name="alert-triangle"
                :size="16"
                class="flex-none text-amber-600 dark:text-amber-400"
              />
              <p class="text-[11px] leading-relaxed">{{ t("apiConnection.secretOnce") }}</p>
            </div>
            <span class="status-key mt-2">{{ t("apiConnection.clientSecret") }}</span>
            <span class="mono-row">
              <code class="mono break-all" data-testid="api-secret">{{ freshSecret }}</code>
              <button
                type="button"
                class="icon-btn"
                :title="t('apiConnection.copy')"
                @click="copy(freshSecret)"
              >
                <AppIcon name="copy" :size="13" />
              </button>
            </span>
          </div>
          <p
            v-else
            class="text-[11px] mt-3"
            :class="
              conn.has_secret
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-red-600 dark:text-red-400'
            "
          >
            <AppIcon
              :name="conn.has_secret ? 'shield-check' : 'alert-triangle'"
              :size="12"
              class="inline-block align-[-2px] mr-1"
            />
            {{
              conn.has_secret ? t("apiConnection.secretStored") : t("apiConnection.secretMissing")
            }}
          </p>

          <!-- Satır içi onay — pencere diyaloğu kullanılmaz -->
          <div v-if="pendingAction" class="confirm-box" data-testid="api-confirm">
            <p class="text-xs">
              {{
                pendingAction === "rotate"
                  ? t("apiConnection.rotateConfirm")
                  : t("apiConnection.revokeConfirm")
              }}
            </p>
            <div class="flex gap-2 mt-2">
              <button
                type="button"
                :class="pendingAction === 'revoke' ? 'hdr-btn-danger' : 'hdr-btn-primary'"
                :disabled="saving || rotating"
                data-testid="api-confirm-yes"
                @click="pendingAction === 'rotate' ? onCreate() : onRevoke()"
              >
                {{ t("apiConnection.confirm") }}
              </button>
              <button type="button" class="hdr-btn-outlined" @click="pendingAction = null">
                {{ t("apiConnection.cancel") }}
              </button>
            </div>
          </div>
          <div v-else class="form-foot">
            <button
              type="button"
              class="hdr-btn-outlined"
              :disabled="rotating"
              data-testid="api-rotate"
              @click="pendingAction = 'rotate'"
            >
              <AppIcon name="rotate-ccw" :size="14" /><span>{{ t("apiConnection.rotate") }}</span>
            </button>
            <button
              v-if="isActive"
              type="button"
              class="hdr-btn-danger"
              :disabled="saving"
              data-testid="api-revoke"
              @click="pendingAction = 'revoke'"
            >
              <AppIcon name="ban" :size="14" /><span>{{ t("apiConnection.revoke") }}</span>
            </button>
          </div>
        </template>
      </section>

      <!-- 2 · Webhook -->
      <form
        v-if="hasConnection"
        class="card mb-5"
        data-testid="api-webhook"
        @submit.prevent="onSaveWebhook"
      >
        <h2 class="card-title">{{ t("apiConnection.webhookHeading") }}</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {{ t("apiConnection.webhookText") }}
        </p>
        <p v-if="!canUseWebhook" class="note note--warn">
          <AppIcon name="lock" :size="14" class="flex-none" />
          <span>{{ t("apiConnection.webhookGate") }}</span>
        </p>
        <template v-else>
          <label class="lbl">
            <span>{{ t("apiConnection.webhookUrl") }}</span>
            <input
              v-model="webhookForm.url"
              type="url"
              class="font-mono text-xs"
              :placeholder="t('apiConnection.webhookUrlPlaceholder')"
              data-testid="api-webhook-url"
            />
          </label>
          <label class="lbl">
            <span>{{ t("apiConnection.webhookSecret") }}</span>
            <input
              v-model="webhookForm.secret"
              type="password"
              autocomplete="new-password"
              class="font-mono text-xs"
              :placeholder="t('apiConnection.webhookSecretPlaceholder')"
              data-testid="api-webhook-secret"
            />
            <small v-if="conn.has_webhook_secret" class="hint">
              <AppIcon name="shield-check" :size="11" class="inline-block align-[-2px]" />
              {{ t("apiConnection.webhookSecretStored") }}
            </small>
          </label>
          <p v-if="conn.webhook_failures > 0" class="note note--error mt-3">
            <AppIcon name="alert-octagon" :size="14" class="flex-none" />
            <span>{{ t("apiConnection.webhookFailures", { n: conn.webhook_failures }) }}</span>
          </p>
          <div class="form-foot">
            <button
              type="submit"
              class="hdr-btn-primary"
              :disabled="saving"
              data-testid="api-webhook-save"
            >
              {{ saving ? t("apiConnection.saving") : t("apiConnection.saveWebhook") }}
            </button>
          </div>
        </template>
      </form>

      <!-- 3 · Giden stok olayları -->
      <section v-if="hasConnection" class="card mb-5" data-testid="api-events">
        <h2 class="card-title">{{ t("apiConnection.eventsHeading") }}</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ t("apiConnection.eventsText") }}
        </p>

        <div class="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            class="chip"
            :class="{ 'chip--on': eventStatus === '' }"
            @click="setEventStatus('')"
          >
            {{ t("apiConnection.all") }}
          </button>
          <button
            v-for="s in STATUS_KEYS"
            :key="s"
            type="button"
            class="chip"
            :class="{
              'chip--on': eventStatus === s,
              'chip--alert': s === 'dead' && eventCounts.dead > 0,
            }"
            :data-testid="`api-events-${s}`"
            @click="setEventStatus(s)"
          >
            {{ statusLabel(s) }} · {{ eventCounts[s] || 0 }}
          </button>
        </div>

        <div v-if="loadingEvents" class="py-2"><Skeleton variant="row" :count="4" /></div>
        <p v-else-if="!events.length" class="text-xs text-gray-500 dark:text-gray-400">
          {{ t("apiConnection.eventsEmpty") }}
        </p>

        <!-- Mobil: olay kartları -->
        <div v-else-if="!isLg" class="ev-cards">
          <article v-for="ev in events" :key="ev.name" class="ev-card">
            <div class="flex items-center justify-between gap-2">
              <span
                class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium"
                :class="statusCls(ev.status)"
              >
                {{ statusLabel(ev.status) }}
              </span>
              <span class="text-[11px] text-gray-500 dark:text-gray-400">{{
                fmtDate(ev.occurred_at)
              }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="status-key">{{ t("apiConnection.colSku") }}</span>
                <code class="mono block">{{ ev.sku || ev.listing }}</code>
              </div>
              <div>
                <span class="status-key">{{ t("apiConnection.colReason") }}</span>
                <span class="block">{{ reasonLabel(ev.reason) }}</span>
              </div>
              <div>
                <span class="status-key">{{ t("apiConnection.colStock") }}</span>
                <span class="block">{{ ev.stock_qty ?? "—" }} / {{ ev.available_qty ?? "—" }}</span>
              </div>
              <div>
                <span class="status-key">{{ t("apiConnection.colAttempts") }}</span>
                <span class="block">{{ ev.attempts || 0 }}</span>
              </div>
            </div>
            <p v-if="ev.last_error" class="text-[11px] text-red-600 dark:text-red-400 break-words">
              {{ ev.last_error }}
            </p>
            <button
              v-if="canRetry(ev)"
              type="button"
              class="hdr-btn-outlined w-full justify-center"
              @click="onRetry(ev)"
            >
              <AppIcon name="repeat" :size="13" /><span>{{ t("apiConnection.retry") }}</span>
            </button>
          </article>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="tbl-th">{{ t("apiConnection.colTime") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colSku") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colReason") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colStock") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colStatus") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colAttempts") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colError") }}</th>
                <th class="tbl-th">{{ t("apiConnection.colAction") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ev in events"
                :key="ev.name"
                class="border-b border-gray-50 dark:border-white/5"
              >
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ fmtDate(ev.occurred_at) }}
                </td>
                <td class="tbl-td">
                  <code class="mono">{{ ev.sku || ev.listing }}</code>
                </td>
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ reasonLabel(ev.reason) }}
                </td>
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ ev.stock_qty ?? "—" }} / {{ ev.available_qty ?? "—" }}
                </td>
                <td class="tbl-td">
                  <span
                    class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium"
                    :class="statusCls(ev.status)"
                  >
                    {{ statusLabel(ev.status) }}
                  </span>
                </td>
                <td class="tbl-td text-xs text-gray-600 dark:text-gray-300">
                  {{ ev.attempts || 0 }}
                </td>
                <td
                  class="tbl-td text-[11px] text-red-600 dark:text-red-400 max-w-[260px] truncate"
                  :title="ev.last_error || ''"
                >
                  {{ ev.last_error || "—" }}
                </td>
                <td class="tbl-td">
                  <button
                    v-if="canRetry(ev)"
                    type="button"
                    class="detail-link"
                    @click="onRetry(ev)"
                  >
                    {{ t("apiConnection.retry") }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ListPagination
          v-if="eventsTotal > PAGE_SIZE"
          :model-value="page"
          :total="eventsTotal"
          :page-size="PAGE_SIZE"
          class="mt-3"
          @update:model-value="onPage"
        />
      </section>

      <!-- 4 · Hızlı başlangıç -->
      <section class="card mb-5" data-testid="api-guide">
        <h2 class="card-title">{{ t("apiConnection.guideHeading") }}</h2>
        <ol class="guide-list">
          <li>{{ t("apiConnection.guideStep1", { tokenUrl }) }}</li>
          <li>{{ t("apiConnection.guideStep2") }}</li>
          <li>{{ t("apiConnection.guideStep3") }}</li>
          <li>{{ t("apiConnection.guideStep4") }}</li>
        </ol>
        <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
          {{ t("apiConnection.guideNote") }}
        </p>
        <router-link
          :to="{ name: 'bulk-import-history', query: { source: 'api' } }"
          class="detail-link inline-flex items-center gap-1 mt-2"
        >
          <AppIcon name="history" :size="12" />{{ t("apiConnection.importsLink") }}
        </router-link>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .api-connection {
    max-width: 1100px;
    margin: 0 auto;
  }
  .card-title {
    font-size: 13px;
    font-weight: 700;
    color: $l-text-900;
    margin-bottom: 12px;
    @include dark {
      color: $d-text;
    }
  }
  .empty-box {
    text-align: center;
    padding: 24px 12px;
  }
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .status-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    &--wide {
      grid-column: 1 / -1;
    }
  }
  .status-key {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .status-val {
    font-size: 13px;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text;
    }
  }
  .mono-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .mono {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 3px 7px;
    border-radius: 6px;
    background: $l-bg-muted;
    color: $l-text-900;
    overflow-wrap: anywhere;
    @include dark {
      background: $d-bg-hover;
      color: $d-text;
    }
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    color: $l-text-500;
    transition: background $t-fast;

    &:hover {
      background: $l-bg-muted;
      color: $brand;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        background: $d-bg-hover;
      }
    }
  }
  .hdr-chip {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10px;
    font-family: "JetBrains Mono", monospace;
    background: $l-bg-muted;
    color: $l-text-700;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .secret-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba($c-warning, 0.08);
    border: 1px solid rgba($c-warning, 0.35);
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
  .confirm-box {
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba($c-error, 0.06);
    border: 1px solid rgba($c-error, 0.25);
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
  }
  .form-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .lbl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: $l-text-600;
    margin-top: 8px;
    @include dark {
      color: $d-text-muted;
    }
    > span {
      font-weight: 600;
    }
    input {
      border: 1px solid $l-border;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      background: $l-bg;
      color: $l-text-900;
      transition:
        border $t-fast,
        box-shadow $t-fast;
      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px $brand-glow;
      }
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text;
      }
    }
  }
  .hint {
    font-size: 10px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 11px;
    line-height: 1.5;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
    &--warn {
      background: rgba($c-warning, 0.08);
      border: 1px solid rgba($c-warning, 0.25);
    }
    &--error {
      background: rgba($c-error, 0.08);
      border: 1px solid rgba($c-error, 0.25);
    }
  }
  .health-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    width: fit-content;
    &--ok {
      background: rgba($c-success, 0.15);
      color: $c-success;
    }
    &--error {
      background: rgba($c-error, 0.15);
      color: $c-error;
    }
  }
  .chip {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid $l-border;
    color: $l-text-700;
    transition: background $t-fast;
    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
    }
    &--on {
      background: rgba($brand, 0.12);
      border-color: rgba($brand, 0.4);
      color: $brand;
    }
    &--alert:not(.chip--on) {
      border-color: rgba($c-error, 0.5);
      color: $c-error;
    }
  }
  .detail-link {
    font-size: 11px;
    font-weight: 600;
    color: $brand;
    text-decoration: none;
    transition: opacity $t-fast;
    &:hover {
      opacity: 0.75;
    }
  }
  .guide-list {
    list-style: decimal;
    padding-left: 18px;
    font-size: 12px;
    line-height: 1.7;
    color: $l-text-700;
    overflow-wrap: anywhere;
    @include dark {
      color: $d-text-muted;
    }
  }
  .upgrade-gate {
    text-align: center;
    padding: 40px 24px;
  }
  .upgrade-gate-icon {
    color: $c-warning;
    margin-bottom: 12px;
  }
  .upgrade-gate-title {
    font-size: 15px;
    font-weight: 700;
    color: $l-text-900;
    margin-bottom: 6px;
    @include dark {
      color: $d-text;
    }
  }
  .upgrade-gate-text {
    font-size: 12px;
    line-height: 1.6;
    color: $l-text-600;
    max-width: 420px;
    margin: 0 auto;
    @include dark {
      color: $d-text-muted;
    }
  }
  .ev-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ev-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 13px;
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  @media (max-width: 767px) {
    .form-foot {
      flex-direction: column;
      .hdr-btn-outlined,
      .hdr-btn-primary,
      .hdr-btn-danger {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }
    }
    .status-grid {
      grid-template-columns: 1fr 1fr;
    }
    .lbl input {
      min-height: 42px;
    }
  }
</style>
