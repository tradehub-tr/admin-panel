<template>
  <div class="storage-settings-page">
    <div class="page-header">
      <div>
        <h1>{{ t("mediaStorage.title") }}</h1>
        <p class="subtitle">{{ t("mediaStorage.subtitle") }}</p>
      </div>
      <button type="button" class="hdr-btn-primary" :disabled="saving || !form" @click="save">
        {{ saving ? t("mediaStorage.saving") : t("mediaStorage.save") }}
      </button>
    </div>

    <p v-if="loading" class="state">{{ t("mediaStorage.loading") }}</p>

    <div v-else-if="denied" class="state error">
      {{ t("mediaStorage.denied") }}
    </div>

    <div v-else-if="loadError" class="state error">
      {{ loadError }}
      <button type="button" class="hdr-btn-ghost retry-btn" @click="load">
        {{ t("mediaStorage.retry") }}
      </button>
    </div>

    <template v-else-if="form">
      <!-- Fabrikanın gerçekte kurduğu plan. "Neden hâlâ yerel diskteyim"in tek dürüst cevabı. -->
      <section v-if="status" class="panel status-panel">
        <h2>{{ t("mediaStorage.status.title") }}</h2>
        <dl class="status-grid">
          <div>
            <dt>{{ t("mediaStorage.status.mode") }}</dt>
            <dd>{{ status.plan?.mode || "—" }}</dd>
          </div>
          <div>
            <dt>{{ t("mediaStorage.status.requested") }}</dt>
            <dd>{{ status.plan?.requested_mode || "—" }}</dd>
          </div>
          <div>
            <dt>{{ t("mediaStorage.status.adapter") }}</dt>
            <dd>{{ status.plan?.backend || "—" }}</dd>
          </div>
          <div>
            <dt>{{ t("mediaStorage.status.boto3") }}</dt>
            <dd>{{ status.boto3_available ? t("mediaStorage.yes") : t("mediaStorage.no") }}</dd>
          </div>
        </dl>
        <p v-if="status.plan?.degraded" class="warn-line">
          {{ t("mediaStorage.status.degraded", { from: status.plan.downgraded_from }) }}
          <span v-if="status.plan.reasons?.length">— {{ status.plan.reasons.join(", ") }}</span>
        </p>
        <p v-if="status.plan?.error" class="warn-line">{{ status.plan.error }}</p>
      </section>

      <!-- 1 · Birincil depolama -->
      <section class="panel">
        <h2>{{ t("mediaStorage.section.primary") }}</h2>
        <div class="field-grid">
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.backend") }}</span>
            <select v-model="form.backend" class="field-input">
              <option v-for="mode in BACKENDS" :key="mode" :value="mode">{{ mode }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.changeReason") }}</span>
            <textarea v-model="form.change_reason" class="field-input" rows="2"></textarea>
          </label>
        </div>

        <div v-if="blockers.length" class="blockers">
          <p class="blockers__head">{{ t("mediaStorage.blockers.title") }}</p>
          <ul>
            <li v-for="blocker in blockers" :key="blocker">{{ blocker }}</li>
          </ul>
          <label class="toggle-row">
            <input v-model="form.blocker_ack" type="checkbox" :true-value="1" :false-value="0" />
            <span>{{ t("mediaStorage.blockers.ack") }}</span>
          </label>
          <p v-if="needsAck" class="warn-line">{{ t("mediaStorage.blockers.required") }}</p>
        </div>
      </section>

      <!-- 2 · S3 -->
      <section class="panel">
        <div class="panel-head">
          <h2>{{ t("mediaStorage.section.s3") }}</h2>
          <button
            type="button"
            class="hdr-btn-ghost"
            :disabled="testing === 's3'"
            @click="test('s3')"
          >
            {{ testing === "s3" ? t("mediaStorage.test.running") : t("mediaStorage.test.button") }}
          </button>
        </div>
        <div class="field-grid">
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.s3Endpoint") }}</span>
            <input v-model="form.s3_endpoint" type="text" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.s3Region") }}</span>
            <input v-model="form.s3_region" type="text" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.s3Bucket") }}</span>
            <input v-model="form.s3_bucket" type="text" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.s3AccessKey") }}</span>
            <input v-model="form.s3_access_key" type="text" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.s3SecretKey") }}</span>
            <input
              v-model="secrets.s3_secret_key"
              type="password"
              class="field-input"
              autocomplete="new-password"
              :placeholder="t('mediaStorage.secretPlaceholder')"
            />
            <small class="field-hint">{{ t("mediaStorage.secretHint") }}</small>
          </label>
        </div>
        <TestResult :result="results.s3" />
      </section>

      <!-- 3 · CDN -->
      <section class="panel">
        <div class="panel-head">
          <h2>{{ t("mediaStorage.section.cdn") }}</h2>
          <button
            type="button"
            class="hdr-btn-ghost"
            :disabled="testing === 'cdn'"
            @click="test('cdn')"
          >
            {{ testing === "cdn" ? t("mediaStorage.test.running") : t("mediaStorage.test.button") }}
          </button>
        </div>
        <div class="field-grid">
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.cdnBaseUrl") }}</span>
            <input v-model="form.cdn_base_url" type="text" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.signedUrlTtl") }}</span>
            <input
              v-model.number="form.signed_url_ttl_seconds"
              type="number"
              min="0"
              class="field-input"
            />
          </label>
        </div>
        <TestResult :result="results.cdn" />
      </section>

      <!-- 4 · imgproxy -->
      <section class="panel">
        <div class="panel-head">
          <h2>{{ t("mediaStorage.section.imgproxy") }}</h2>
          <button
            type="button"
            class="hdr-btn-ghost"
            :disabled="testing === 'imgproxy'"
            @click="test('imgproxy')"
          >
            {{
              testing === "imgproxy"
                ? t("mediaStorage.test.running")
                : t("mediaStorage.test.button")
            }}
          </button>
        </div>
        <p class="note">{{ t("mediaStorage.imgproxyNote") }}</p>
        <div class="field-grid">
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.imgproxyBaseUrl") }}</span>
            <input v-model="form.imgproxy_base_url" type="text" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.imgproxyKey") }}</span>
            <input
              v-model="secrets.imgproxy_key"
              type="password"
              class="field-input"
              autocomplete="new-password"
              :placeholder="t('mediaStorage.secretPlaceholder')"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.imgproxySalt") }}</span>
            <input
              v-model="secrets.imgproxy_salt"
              type="password"
              class="field-input"
              autocomplete="new-password"
              :placeholder="t('mediaStorage.secretPlaceholder')"
            />
          </label>
        </div>
        <TestResult :result="results.imgproxy" />
      </section>

      <!-- 5 · Saklama -->
      <section class="panel">
        <h2>{{ t("mediaStorage.section.retention") }}</h2>
        <div class="field-grid">
          <label class="toggle-row">
            <input v-model="form.keep_originals" type="checkbox" :true-value="1" :false-value="0" />
            <span>{{ t("mediaStorage.field.keepOriginals") }}</span>
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.originalLocalDays") }}</span>
            <input
              v-model.number="form.original_local_days"
              type="number"
              min="0"
              class="field-input"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.originalThenAction") }}</span>
            <select v-model="form.original_then_action" class="field-input">
              <option v-for="act in ACTIONS" :key="act" :value="act">{{ act }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.derivativeUnusedDays") }}</span>
            <input
              v-model.number="form.derivative_unused_days"
              type="number"
              min="0"
              class="field-input"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.derivativeAction") }}</span>
            <select v-model="form.derivative_action" class="field-input">
              <option v-for="act in ACTIONS" :key="act" :value="act">{{ act }}</option>
            </select>
          </label>
          <label class="toggle-row">
            <input
              v-model="form.derivative_regenerate_on_demand"
              type="checkbox"
              :true-value="1"
              :false-value="0"
            />
            <span>{{ t("mediaStorage.field.derivativeRegenerate") }}</span>
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.trashRetentionDays") }}</span>
            <input
              v-model.number="form.trash_retention_days"
              type="number"
              min="0"
              class="field-input"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.archiveRetentionDays") }}</span>
            <input
              v-model.number="form.archive_retention_days"
              type="number"
              min="0"
              class="field-input"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ t("mediaStorage.field.backupKeepSets") }}</span>
            <input
              v-model.number="form.backup_keep_sets"
              type="number"
              min="1"
              class="field-input"
            />
          </label>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed, h, onMounted, reactive, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";

  /**
   * Medya Depolama Ayarları (T-051 şartname).
   *
   * Beş bölüm tek sayfada: birincil depolama · S3 · CDN · imgproxy · saklama.
   * Alan adları backend'deki `Media Storage Settings` DocType'ıyla BİREBİR
   * aynıdır; DocType da `media/pipeline/storage` fabrikasının okuduğu adları
   * kullanır. Buradaki bir yeniden adlandırma ayarı sessizce etkisiz bırakır.
   *
   * Ekran `Media Superadmin` rolü dışına kapalıdır. Router `meta.roles` ile
   * kapıyı tutar, ama ASIL kapı backend'dedir: DocPerm listesinde yalnız
   * `Media Superadmin` + `System Manager` var ve satıcı/alıcı rolleri okuma
   * dahil hiçbir hak almaz. Panel yetkisiz kullanıcıya boş ekran değil,
   * gerekçe gösterir (403 → `denied`).
   *
   * Sır alanları (`s3_secret_key`, `imgproxy_key`, `imgproxy_salt`) BOŞ
   * yüklenir ve yalnız doldurulursa gönderilir. Backend Password fieldtype'ı
   * kullandığı için REST yanıtı yıldız döndürür; o yıldızları geri POST etmek
   * gerçek sırrı yıldız dizesiyle EZERDİ.
   */
  const DOCTYPE = "Media Storage Settings";
  const STATUS_METHOD =
    "tradehub_core.tradehub_core.doctype.media_storage_settings.media_storage_settings.get_storage_status";
  const TEST_METHOD =
    "tradehub_core.tradehub_core.doctype.media_storage_settings.media_storage_settings.test_connection";

  const BACKENDS = ["local", "s3", "mirror", "tiered"];
  const ACTIONS = ["notify_only", "delete", "s3_cold", "s3_standard"];
  const SECRET_FIELDS = ["s3_secret_key", "imgproxy_key", "imgproxy_salt"];
  const EDITABLE_FIELDS = [
    "backend",
    "blocker_ack",
    "change_reason",
    "s3_endpoint",
    "s3_region",
    "s3_bucket",
    "s3_access_key",
    "cdn_base_url",
    "signed_url_ttl_seconds",
    "imgproxy_base_url",
    "keep_originals",
    "original_local_days",
    "original_then_action",
    "trash_retention_days",
    "derivative_unused_days",
    "derivative_action",
    "derivative_regenerate_on_demand",
    "archive_retention_days",
    "backup_keep_sets",
  ];

  const { t } = useI18n();
  const toast = useToast();

  const form = ref(null);
  const status = ref(null);
  const loading = ref(true);
  const saving = ref(false);
  const denied = ref(false);
  const loadError = ref("");
  const testing = ref("");
  const secrets = reactive({ s3_secret_key: "", imgproxy_key: "", imgproxy_salt: "" });
  const results = reactive({ s3: null, cdn: null, imgproxy: null });

  const blockers = computed(() => status.value?.blockers || []);
  const needsAck = computed(
    () => !!form.value && form.value.backend !== "local" && !form.value.blocker_ack
  );

  /** Adım listesini render eden küçük görüntüleyici — ayrı dosya açmaya değmez. */
  const TestResult = (props) => {
    const result = props.result;
    if (!result) return null;
    return h("div", { class: ["test-result", result.ok ? "is-ok" : "is-fail"] }, [
      h("p", { class: "test-result__head" }, [
        (result.ok ? t("mediaStorage.test.ok") : t("mediaStorage.test.fail")) +
          ` · ${result.ms} ms`,
      ]),
      h(
        "ul",
        {},
        (result.steps || []).map((step) =>
          h("li", { key: step.step }, `${step.step}: ${step.ok ? "✓" : "✗"} ${step.detail || ""}`)
        )
      ),
    ]);
  };
  TestResult.props = ["result"];

  function isForbidden(error) {
    const text = `${error?.message || ""} ${error?.status || ""}`;
    return /403|PermissionError|yetki/i.test(text);
  }

  async function load() {
    loading.value = true;
    loadError.value = "";
    denied.value = false;
    try {
      const res = await api.getDoc(DOCTYPE, DOCTYPE);
      const doc = res.data || {};
      const next = {};
      for (const key of EDITABLE_FIELDS) next[key] = doc[key] ?? "";
      form.value = next;
      // Sırlar sunucudan yıldız olarak gelir; forma HİÇ taşınmaz.
      for (const key of SECRET_FIELDS) secrets[key] = "";
      status.value = (await api.callMethodGET(STATUS_METHOD)).message;
    } catch (error) {
      if (isForbidden(error)) denied.value = true;
      else loadError.value = error.message || t("mediaStorage.loadFailed");
    } finally {
      loading.value = false;
    }
  }

  async function save() {
    saving.value = true;
    try {
      const payload = { ...form.value };
      // Yalnız DOLDURULMUŞ sır alanları gönderilir.
      for (const key of SECRET_FIELDS) {
        if (secrets[key]) payload[key] = secrets[key];
      }
      await api.updateDoc(DOCTYPE, DOCTYPE, payload);
      for (const key of SECRET_FIELDS) secrets[key] = "";
      toast.success(t("mediaStorage.saved"));
      status.value = (await api.callMethodGET(STATUS_METHOD)).message;
    } catch (error) {
      toast.error(error.message || t("mediaStorage.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function test(target) {
    testing.value = target;
    try {
      const res = await api.callMethod(TEST_METHOD, { target });
      results[target] = res.message;
    } catch (error) {
      toast.error(error.message || t("mediaStorage.test.fail"));
      results[target] = null;
    } finally {
      testing.value = "";
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .storage-settings-page {
    max-width: 1040px;
    margin: 0 auto;
    padding: 24px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    gap: 16px;

    h1 {
      font-size: 1.375rem;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .subtitle {
    margin-top: 4px;
    font-size: 0.875rem;
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }
  }

  .state {
    padding: 16px 0;
    font-size: 0.9375rem;
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }

    &.error {
      color: $c-error;
    }
  }

  .retry-btn {
    margin-left: 12px;
  }

  .panel {
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg;
    padding: 20px;
    margin-bottom: 20px;

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }

    h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;

    h2 {
      margin-bottom: 0;
    }

    margin-bottom: 16px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .field-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }

  .field-hint {
    font-size: 0.75rem;
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }
  }

  .field-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.875rem;
    background: $l-bg;
    color: $l-text-900;

    @include dark {
      border-color: $d-border;
      background: $d-bg;
      color: $d-text-hi;
    }

    &:focus {
      outline: none;
      border-color: $brand;
    }
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }

    input {
      accent-color: $brand;
    }
  }

  .note {
    margin-bottom: 12px;
    font-size: 0.8125rem;
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }
  }

  .blockers {
    margin-top: 16px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba($c-warning, 0.08);
    border: 1px solid rgba($c-warning, 0.25);
    font-size: 0.8125rem;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }

    &__head {
      font-weight: 600;
      margin-bottom: 6px;
    }

    ul {
      margin: 0 0 10px 16px;
      list-style: disc;
    }
  }

  .warn-line {
    margin-top: 8px;
    font-size: 0.8125rem;
    color: $c-warning;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    dt {
      font-size: 0.75rem;
      color: $l-text-600;
      @include dark {
        color: $d-text-muted;
      }
    }

    dd {
      font-size: 0.9375rem;
      font-weight: 600;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .test-result {
    margin-top: 14px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 0.8125rem;
    overflow-x: auto;

    &.is-ok {
      background: rgba($c-success, 0.08);
      border: 1px solid rgba($c-success, 0.25);
    }

    &.is-fail {
      background: rgba($c-error, 0.08);
      border: 1px solid rgba($c-error, 0.25);
    }

    &__head {
      font-weight: 600;
      margin-bottom: 4px;
    }

    ul {
      margin-left: 16px;
      list-style: disc;
    }
  }

  @media (max-width: 640px) {
    .storage-settings-page {
      padding: 16px 0.25rem;
      margin: 0 -0.75rem;
    }

    .page-header {
      flex-wrap: wrap;
    }
  }
</style>
