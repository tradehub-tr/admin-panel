<template>
  <div class="storage-settings-page">
    <div class="page-header">
      <div>
        <h1>{{ t("mediaStorage.title") }}</h1>
        <p class="subtitle">{{ t("mediaStorage.subtitle") }}</p>
      </div>
      <button
        type="button"
        class="hdr-btn-primary"
        data-testid="media-storage-save"
        :disabled="saving || !form"
        @click="save"
      >
        {{ saving ? t("mediaStorage.saving") : t("mediaStorage.save") }}
      </button>
    </div>

    <p v-if="loading" class="state">{{ t("mediaStorage.loading") }}</p>

    <div v-else-if="denied" class="state error">
      {{ t("mediaStorage.denied") }}
    </div>

    <div v-else-if="loadError" class="state error">
      {{ loadError }}
      <button type="button" class="hdr-btn-outlined retry-btn" @click="load">
        {{ t("mediaStorage.retry") }}
      </button>
    </div>

    <template v-else-if="form">
      <!-- Fabrikanın gerçekte kurduğu plan. "Neden hâlâ yerel diskteyim"in tek dürüst cevabı. -->
      <section v-if="status" class="card panel status-panel">
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
            <dd>
              <!-- "Evet/Hayır" yerine durum rozeti (öneri 5, 2026-09-09). -->
              <span
                class="status-pill"
                :class="status.boto3_available ? 'status-pill--ok' : 'status-pill--off'"
              >
                <AppIcon :name="status.boto3_available ? 'check' : 'x'" :size="12" />
                {{
                  status.boto3_available
                    ? t("mediaStorage.status.boto3Yes")
                    : t("mediaStorage.status.boto3No")
                }}
              </span>
            </dd>
          </div>
        </dl>
        <p
          v-if="
            status.plan?.mode &&
            status.plan?.requested_mode === status.plan?.mode &&
            !status.plan?.degraded
          "
          class="status-ok"
        >
          <AppIcon name="check" :size="14" />
          {{ t("mediaStorage.status.match") }}
        </p>
        <p v-if="status.plan?.degraded" class="warn-line">
          {{ t("mediaStorage.status.degraded", { from: status.plan.downgraded_from }) }}
          <span v-if="status.plan.reasons?.length">— {{ status.plan.reasons.join(", ") }}</span>
        </p>
        <p v-if="status.plan?.error" class="warn-line">{{ status.plan.error }}</p>
      </section>

      <!-- 1 · Birincil depolama -->
      <section class="card panel">
        <h2>{{ t("mediaStorage.section.primary") }}</h2>
        <div class="field-grid">
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.backend") }}</span>
            <select
              v-model="form.backend"
              class="form-input field-input"
              data-testid="storage-mode"
            >
              <option v-for="mode in BACKENDS" :key="mode" :value="mode">{{ mode }}</option>
            </select>
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.changeReason") }}</span>
            <textarea
              v-model="form.change_reason"
              class="form-input field-input"
              rows="2"
            ></textarea>
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
      <section class="card panel">
        <div class="panel-head">
          <h2>{{ t("mediaStorage.section.s3") }}</h2>
          <button
            type="button"
            class="hdr-btn-outlined"
            data-testid="s3-test-connection"
            :disabled="testing === 's3'"
            @click="test('s3')"
          >
            {{ testing === "s3" ? t("mediaStorage.test.running") : t("mediaStorage.test.button") }}
          </button>
        </div>
        <div class="field-grid">
          <label class="toggle-row">
            <input
              v-model="form.s3_enabled"
              data-testid="s3-enabled"
              type="checkbox"
              :true-value="1"
              :false-value="0"
            />
            <span>{{ t("mediaStorage.field.s3Enabled") }}</span>
          </label>
          <label class="toggle-row">
            <input
              v-model="form.s3_path_style"
              data-testid="s3-path-style"
              type="checkbox"
              :true-value="1"
              :false-value="0"
            />
            <span>{{ t("mediaStorage.field.s3PathStyle") }}</span>
          </label>
          <label class="toggle-row">
            <input
              v-model="form.s3_upload_originals"
              data-testid="s3-upload-originals"
              type="checkbox"
              :true-value="1"
              :false-value="0"
            />
            <span>{{ t("mediaStorage.field.s3UploadOriginals") }}</span>
          </label>
          <label class="toggle-row">
            <input
              v-model="form.s3_upload_renditions"
              data-testid="s3-upload-renditions"
              type="checkbox"
              :true-value="1"
              :false-value="0"
            />
            <span>{{ t("mediaStorage.field.s3UploadRenditions") }}</span>
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.s3Endpoint") }}</span>
            <input
              v-model="form.s3_endpoint"
              data-testid="s3-endpoint"
              type="text"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.s3Region") }}</span>
            <input
              v-model="form.s3_region"
              data-testid="s3-region"
              type="text"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.s3Bucket") }}</span>
            <input
              v-model="form.s3_bucket"
              data-testid="s3-bucket"
              type="text"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.s3AccessKey") }}</span>
            <input
              v-model="form.s3_access_key"
              data-testid="s3-access-key"
              type="text"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.s3SecretKey") }}</span>
            <span class="secret-field">
              <input
                v-model="secrets.s3_secret_key"
                data-testid="s3-secret-key"
                :type="revealed.s3_secret_key ? 'text' : 'password'"
                class="form-input field-input"
                autocomplete="new-password"
                :placeholder="t('mediaStorage.secretPlaceholder')"
              />
              <button
                type="button"
                class="secret-field__toggle"
                :aria-label="
                  revealed.s3_secret_key
                    ? t('mediaStorage.hideSecret')
                    : t('mediaStorage.showSecret')
                "
                :aria-pressed="revealed.s3_secret_key"
                @click.prevent="revealed.s3_secret_key = !revealed.s3_secret_key"
              >
                <AppIcon :name="revealed.s3_secret_key ? 'eye-off' : 'eye'" :size="16" />
              </button>
            </span>
            <small class="field-hint">{{ t("mediaStorage.secretHint") }}</small>
          </label>
        </div>
        <TestResult :result="results.s3" />
      </section>

      <!-- 3 · CDN -->
      <section class="card panel">
        <div class="panel-head">
          <h2>{{ t("mediaStorage.section.cdn") }}</h2>
          <button
            type="button"
            class="hdr-btn-outlined"
            :disabled="testing === 'cdn'"
            @click="test('cdn')"
          >
            {{ testing === "cdn" ? t("mediaStorage.test.running") : t("mediaStorage.test.button") }}
          </button>
        </div>
        <div class="field-grid">
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.cdnBaseUrl") }}</span>
            <input v-model="form.cdn_base_url" type="text" class="form-input field-input" />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.signedUrlTtl") }}</span>
            <input
              v-model.number="form.signed_url_ttl_seconds"
              type="number"
              min="0"
              class="form-input field-input"
            />
          </label>
        </div>
        <TestResult :result="results.cdn" />
      </section>

      <!-- 4 · imgproxy -->
      <section class="card panel">
        <div class="panel-head">
          <h2>{{ t("mediaStorage.section.imgproxy") }}</h2>
          <button
            type="button"
            class="hdr-btn-outlined"
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
            <span class="form-label field-label">{{
              t("mediaStorage.field.imgproxyBaseUrl")
            }}</span>
            <input v-model="form.imgproxy_base_url" type="text" class="form-input field-input" />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.imgproxyKey") }}</span>
            <span class="secret-field">
              <input
                v-model="secrets.imgproxy_key"
                :type="revealed.imgproxy_key ? 'text' : 'password'"
                class="form-input field-input"
                autocomplete="new-password"
                :placeholder="t('mediaStorage.secretPlaceholder')"
              />
              <button
                type="button"
                class="secret-field__toggle"
                :aria-label="
                  revealed.imgproxy_key
                    ? t('mediaStorage.hideSecret')
                    : t('mediaStorage.showSecret')
                "
                :aria-pressed="revealed.imgproxy_key"
                @click.prevent="revealed.imgproxy_key = !revealed.imgproxy_key"
              >
                <AppIcon :name="revealed.imgproxy_key ? 'eye-off' : 'eye'" :size="16" />
              </button>
            </span>
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.imgproxySalt") }}</span>
            <span class="secret-field">
              <input
                v-model="secrets.imgproxy_salt"
                :type="revealed.imgproxy_salt ? 'text' : 'password'"
                class="form-input field-input"
                autocomplete="new-password"
                :placeholder="t('mediaStorage.secretPlaceholder')"
              />
              <button
                type="button"
                class="secret-field__toggle"
                :aria-label="
                  revealed.imgproxy_salt
                    ? t('mediaStorage.hideSecret')
                    : t('mediaStorage.showSecret')
                "
                :aria-pressed="revealed.imgproxy_salt"
                @click.prevent="revealed.imgproxy_salt = !revealed.imgproxy_salt"
              >
                <AppIcon :name="revealed.imgproxy_salt ? 'eye-off' : 'eye'" :size="16" />
              </button>
            </span>
          </label>
        </div>
        <TestResult :result="results.imgproxy" />
      </section>

      <!-- 5 · Saklama -->
      <section class="card panel">
        <h2>{{ t("mediaStorage.section.retention") }}</h2>
        <div class="field-grid">
          <label class="toggle-row">
            <input v-model="form.keep_originals" type="checkbox" :true-value="1" :false-value="0" />
            <span>{{ t("mediaStorage.field.keepOriginals") }}</span>
          </label>
          <label class="field">
            <span class="form-label field-label">{{
              t("mediaStorage.field.originalLocalDays")
            }}</span>
            <input
              v-model.number="form.original_local_days"
              type="number"
              min="0"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{
              t("mediaStorage.field.originalThenAction")
            }}</span>
            <select v-model="form.original_then_action" class="form-input field-input">
              <option v-for="act in ACTIONS" :key="act" :value="act">{{ act }}</option>
            </select>
          </label>
          <label class="field">
            <span class="form-label field-label">{{
              t("mediaStorage.field.derivativeUnusedDays")
            }}</span>
            <input
              v-model.number="form.derivative_unused_days"
              type="number"
              min="0"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{
              t("mediaStorage.field.derivativeAction")
            }}</span>
            <select v-model="form.derivative_action" class="form-input field-input">
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
            <span class="form-label field-label">{{
              t("mediaStorage.field.trashRetentionDays")
            }}</span>
            <input
              v-model.number="form.trash_retention_days"
              type="number"
              min="0"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{
              t("mediaStorage.field.archiveRetentionDays")
            }}</span>
            <input
              v-model.number="form.archive_retention_days"
              type="number"
              min="0"
              class="form-input field-input"
            />
          </label>
          <label class="field">
            <span class="form-label field-label">{{ t("mediaStorage.field.backupKeepSets") }}</span>
            <input
              v-model.number="form.backup_keep_sets"
              type="number"
              min="1"
              class="form-input field-input"
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

  import AppIcon from "@/components/common/AppIcon.vue";
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
    "s3_enabled",
    "s3_endpoint",
    "s3_region",
    "s3_bucket",
    "s3_access_key",
    "s3_path_style",
    "s3_upload_originals",
    "s3_upload_renditions",
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
  // Yazılan sırrın göster/gizle durumu — yalnız YENİ yazılan değeri açar,
  // kayıtlı değer zaten hiç gelmiyor.
  const revealed = reactive({ s3_secret_key: false, imgproxy_key: false, imgproxy_salt: false });
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
      for (const key of SECRET_FIELDS) {
        secrets[key] = "";
        revealed[key] = false;
      }
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
  @use "@/assets/scss/media" as media;

  // ── Sayfa iskeleti ──────────────────────────────────────────────────
  //
  // Kök neden (telefon): eski kural `padding: 16px 0.25rem; margin: 0 -0.75rem`
  // ile sayfayı main'in dolgusundan dışarı taşırıyordu; kartlar ekranın
  // kenarına yapışıyor, gölge kırpılıyordu. Negatif margin yok — dar ekranda
  // sayfanın kendi yatay dolgusu sıfırlanıyor, main'in 16px'i yetiyor
  // (MediaBackupView ile aynı karar).
  .storage-settings-page {
    max-width: 1040px;
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;

    @media (max-width: media.$m-bp-sm) {
      padding-inline: 0;
    }

    @media (max-width: 1023px) {
      padding-bottom: calc(#{media.$m-float-bottom} + 56px);
    }
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: media.$s-4;
    margin-bottom: media.$s-5;

    // base.scss'teki global `html.dark header` kuralı zemin basmasın.
    @include dark {
      background-color: transparent !important;
    }

    h1 {
      margin: 0;
      @include media.text("display");
      font-weight: 700;
      @include media.heading;
    }

    // Telefonda başlık + kaydet alt alta; kaydet tam satır, 44px.
    @media (max-width: media.$m-bp-sm) {
      flex-direction: column;
      align-items: stretch;

      .hdr-btn-primary {
        justify-content: center;
        @include media.tap-target;
      }
    }
  }

  .subtitle {
    margin: media.$s-05 0 0;
    @include media.text("xs");
    color: $l-text-600;

    @include dark {
      color: $d-text-muted;
    }
  }

  .state {
    padding: media.$s-4 0;
    @include media.text("body");
    color: $l-text-600;

    @include dark {
      color: $d-text-muted;
    }

    &.error {
      color: $c-error-text;

      @include dark {
        color: $c-error;
      }
    }
  }

  .retry-btn {
    margin-left: media.$s-3;
  }

  // ── Bölüm kartları ──────────────────────────────────────────────────
  // Kabuk `card` (scss.md §8); burada yalnız aralık ve iç ritim.
  .panel {
    margin-bottom: media.$s-4;

    @media (max-width: media.$m-bp-sm) {
      padding: media.$s-4;
    }

    h2 {
      margin: 0 0 media.$s-4;
      @include media.text("body");
      font-weight: 600;
      @include media.heading;
    }
  }

  // Bölüm başlığı + "Bağlantıyı test et".
  //
  // Kök neden: düğme `hdr-btn-ghost` sınıfını taşıyordu, o sınıf HİÇBİR
  // yerde tanımlı değil — düğme stilsiz, dolgusuz, `white-space` serbest;
  // başlıkla aynı satırda ikisi de ikiye kırılıyordu. Artık `hdr-btn-outlined`
  // (tanımlı, `nowrap`); telefonda başlık üstte, düğme altta tam satır.
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: media.$s-3;
    margin-bottom: media.$s-4;

    h2 {
      margin-bottom: 0;
      min-width: 0;
    }

    .hdr-btn-outlined {
      flex-shrink: 0;
    }

    @media (max-width: media.$m-bp-sm) {
      flex-direction: column;
      align-items: stretch;
      gap: media.$s-2;

      .hdr-btn-outlined {
        width: 100%;
        justify-content: center;
        height: auto;
        @include media.tap-target;
      }
    }
  }

  // ── Alanlar ─────────────────────────────────────────────────────────
  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: media.$s-4;

    @media (max-width: media.$m-bp-md) {
      grid-template-columns: minmax(0, 1fr);
      gap: media.$s-3;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }

  // `form-label` global ölçü; burada yalnız telefon tipografisi.
  .field-label {
    @include media.text("xs");
  }

  .field-hint {
    margin-top: media.$s-1;
    @include media.text("xs");
    color: $l-text-600;

    @include dark {
      color: $d-text-muted;
    }
  }

  // `form-input` global görünüm; telefonda 16px (iOS zoom) ve 44px yükseklik.
  .field-input {
    @media (max-width: media.$m-bp-md) {
      font-size: 1rem;
      @include media.tap-target;
    }
  }

  textarea.field-input {
    resize: vertical;
    min-height: 4.5rem;
  }

  // Gizli anahtar: alan + göster/gizle düğmesi aynı kutuda, düğme sağda
  // alanın içinde ve tam yükseklikte — dolgu düğmenin altına yazı girmesin
  // diye 44px.
  .secret-field {
    position: relative;
    display: block;

    .field-input {
      padding-right: 2.75rem;
    }
  }

  .secret-field__toggle {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: grid;
    place-items: center;
    width: 2.75rem;
    border: 0;
    border-radius: 0 8px 8px 0;
    background: none;
    color: $l-text-500;
    cursor: pointer;
    @include media.focus-ring;

    @include dark {
      color: $d-text-muted;
    }

    @include media.hoverable {
      &:hover {
        color: $l-text-900;

        @include dark {
          color: $d-text-hi;
        }
      }
    }
  }

  // Onay kutusu satırı.
  //
  // Kök neden: `align-items: center` — metin iki satıra inince kutu ortada
  // asılı kalıyordu. Kutu ilk satırla hizalanıyor; satırın tamamı dokunma
  // alanı (min 44px), böylece metne dokunmak da kutuyu çevirir.
  .toggle-row {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    padding: media.$s-1 0;
    @include media.text("sm");
    line-height: 1.4;
    color: $l-text-700;
    cursor: pointer;

    @include dark {
      color: $d-text;
    }

    // Telefonda 40px satır: 44 ile art arda dört kutu seyrek dağılıyordu,
    // ızgaranın 12px boşluğuyla adım zaten 52px'e çıkıyor.
    @media (max-width: media.$m-bp-md) {
      min-height: 2.5rem;
      padding: media.$s-1 0;
    }

    input {
      flex-shrink: 0;
      width: 1.125rem;
      height: 1.125rem;
      margin: 0.1em 0 0;
      accent-color: $brand;
      cursor: pointer;
    }

    span {
      min-width: 0;
    }
  }

  .note {
    margin: 0 0 media.$s-3;
    @include media.text("sm");
    color: $l-text-600;

    @include dark {
      color: $d-text-muted;
    }
  }

  .blockers {
    margin-top: media.$s-4;
    padding: media.$s-3 media.$s-3;
    border-radius: media.$r-md;
    background: media.$tint-warning;
    border: 1px solid rgba($c-warning, 0.25);
    @include media.text("sm");
    color: $l-text-700;
    overflow-wrap: anywhere;

    @include dark {
      color: $d-text;
    }

    &__head {
      font-weight: 600;
      margin-bottom: media.$s-1;
    }

    ul {
      margin: 0 0 media.$s-2 media.$s-4;
      list-style: disc;
    }
  }

  .warn-line {
    margin: media.$s-2 0 0;
    @include media.text("sm");
    color: $c-warning-text;
    overflow-wrap: anywhere;

    @include dark {
      color: $c-warning;
    }
  }

  // ── Durum ızgarası ──────────────────────────────────────────────────
  .status-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: media.$s-3;
    margin: 0;

    > div {
      min-width: 0;
      padding: media.$s-2 media.$s-3;
      border-radius: media.$r-md;
      @include media.surface("soft");
    }

    dt {
      @include media.text("xs");
      color: $l-text-600;

      @include dark {
        color: $d-text-muted;
      }
    }

    dd {
      margin: media.$s-05 0 0;
      @include media.text("body");
      font-weight: 600;
      overflow-wrap: anywhere;
      @include media.heading;
    }

    // Ray + yan panel altında (≤1023) gri karolar 2+2 diziliyor,
    // "LocalDiskStorage" hece ortasından kırılıyordu (öneri 5, 2026-09-09).
    // Anahtar/değer satırları: teknik değer monospace ve tek satır.
    @media (max-width: media.$m-bp-rail) {
      display: block;
      border-bottom: 1px solid $l-border-alt;

      @include dark {
        border-bottom-color: $d-border;
      }

      > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: media.$s-3;
        min-height: 2.75rem;
        padding: media.$s-1 0;
        border: 0;
        border-top: 1px solid $l-border-alt;
        border-radius: 0;
        background: none;

        @include dark {
          background: none;
          border-top-color: $d-border;
        }
      }

      dd {
        margin: 0;
        text-align: end;
        white-space: nowrap;
        overflow-wrap: normal;
        font-family: "JetBrains Mono", ui-monospace, monospace;
        @include media.text("sm");
      }
    }
  }

  .status-pill {
    @include media.chip("neutral");
  }

  .status-pill--ok {
    @include media.chip("success");
  }

  .status-pill--off {
    @include media.chip("warning");
  }

  .status-ok {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: media.$s-3 0 0;
    color: $c-success-text;
    @include media.text("sm");

    @include dark {
      color: $c-success;
    }
  }

  // ── Test sonucu ─────────────────────────────────────────────────────
  // `overflow-x: auto` kaldırıldı: uzun adım metni kutuyu yatay kaydırıyordu,
  // telefonda sayfa kayıyor sanılıyordu. Metin kırılır, kutu taşmaz.
  .test-result {
    margin-top: media.$s-3;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    overflow-wrap: anywhere;

    &.is-ok {
      color: $c-success-text;
      background: media.$tint-success;
      border: 1px solid rgba($c-success, 0.25);

      @include dark {
        color: $c-success;
      }
    }

    &.is-fail {
      color: $c-error-text;
      background: media.$tint-danger;
      border: 1px solid rgba($c-error, 0.25);

      @include dark {
        color: $c-error;
      }
    }

    &__head {
      font-weight: 600;
      margin: 0 0 media.$s-1;
    }

    ul {
      margin: 0 0 0 media.$s-4;
      list-style: disc;
    }
  }
</style>
