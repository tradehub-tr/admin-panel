<template>
  <div>
    <!-- Page Header — panel deseni (DocTypeListView ile aynı) -->
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.carrierAccount.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.carrierAccount.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Yetki yoksa buton HİÇ render edilmez; disabled bırakmak
             "yapabilirim ama şu an olmaz" der, oysa yetki yok.
             `canCreate` = yetki VE hedefin var olması (bkz. prop gerekçesi). -->
        <button v-if="canCreate" type="button" class="hdr-btn-primary" @click="$emit('create')">
          <AppIcon name="plus" :size="14" />
          <span>{{ t("logistics.carrierAccount.new") }}</span>
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="4" />
    </div>

    <EmptyState
      v-else-if="!rows.length"
      :filtered="false"
      :entity="t('logistics.carrierAccount.entity')"
    />

    <template v-else>
      <ul class="space-y-3">
        <li v-for="row in rows" :key="row.name" class="card">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-bold text-gray-900 dark:text-gray-100">
              {{ row.account_name }}
            </span>
            <StatusBadge
              :status="row.is_active ? 'active' : 'passive'"
              :tone="row.is_active ? 'success' : 'neutral'"
              :label="
                row.is_active ? t('logistics.catalog.active') : t('logistics.catalog.passive')
              "
              :show-dot="false"
            />
            <!-- Sandbox/production ayrımı gözden kaçarsa test siparişi
                 gerçek kargoya düşer. Bu yüzden rozet, dipnot değil. -->
            <StatusBadge
              :status="row.environment"
              :tone="row.environment === 'production' ? 'warning' : 'info'"
              :label="environmentLabel(row.environment)"
              :show-dot="false"
            />
            <span
              v-if="row.is_default"
              class="badge bg-brand-50 text-brand-800 dark:bg-brand-900/20 dark:text-brand-500"
            >
              {{ t("logistics.carrierAccount.default") }}
            </span>
            <span class="text-xs text-gray-600 dark:text-gray-400">
              {{
                row.is_platform_account
                  ? t("logistics.carrierAccount.platform")
                  : row.seller_profile
              }}
            </span>
          </div>

          <p
            v-if="row.base_url"
            class="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400 break-all"
          >
            {{ row.base_url }}
          </p>

          <!-- KİMLİK BİLGİSİ SINIRI: yanıt gizli DEĞER taşımıyor, yalnız
               "tanımlı mı" bayrağı. Maskeli bir değer bile yanıt gövdesinde,
               tarayıcı geçmişinde ve ara sunucu loglarında dolaşırdı. -->
          <div class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="secret in SECRET_FIELDS"
              :key="secret"
              class="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
              :class="
                row[`has_${secret}`]
                  ? 'border-gray-200 dark:border-white/10'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30'
              "
            >
              <!-- Ham alan adı (`api_secret`) yalnız `title`'da: kullanıcı
                   okunur adı görür, destek kaydında sözleşme adı lazım. -->
              <span class="font-medium text-gray-700 dark:text-gray-200" :title="secret">{{
                secretLabel(secret)
              }}</span>

              <!-- Açığa çıkarılmış değer BURADA gösteriliyor, toast'ta değil:
                   toast 3,5 saniyede kayboluyor ve bir credential'ı okumaya
                   yetmiyor. Kullanıcı kendisi kapatana kadar duruyor. -->
              <span
                v-if="revealed[row.name]?.[secret] !== undefined"
                class="font-mono select-all text-gray-900 dark:text-gray-100"
                >{{ revealed[row.name][secret] || t("logistics.carrierAccount.emptyValue") }}</span
              >
              <span
                v-else-if="row[`has_${secret}`]"
                class="font-mono tracking-widest text-gray-600 dark:text-gray-400"
                >•••••</span
              >
              <span v-else class="text-amber-700 dark:text-amber-400">{{
                t("logistics.carrierAccount.notSet")
              }}</span>

              <!-- Değeri görmek AYRI bir eylem, ayrı bir yetki ve denetim
                   kaydı bırakıyor (reveal_carrier_secret). Yalnız kullanıcı
                   tıklamasıyla tetiklenir — otomatik çağrı YOK. -->
              <button
                v-if="row[`has_${secret}`] && can.viewSecret"
                type="button"
                class="text-brand-700 dark:text-brand-500 underline underline-offset-2"
                @click="
                  revealed[row.name]?.[secret] !== undefined
                    ? $emit('hide', { name: row.name, field: secret })
                    : $emit('reveal', { name: row.name, field: secret })
                "
              >
                {{
                  revealed[row.name]?.[secret] !== undefined
                    ? t("logistics.carrierAccount.hide")
                    : t("logistics.carrierAccount.reveal")
                }}
              </button>
            </div>
          </div>

          <p v-if="row.token_expiry" class="mt-2 text-xs" :class="tokenExpiryClass(row)">
            {{ t("logistics.carrierAccount.tokenExpiry", { at: row.token_expiry }) }}
          </p>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-if="canTest"
              type="button"
              class="hdr-btn-outlined"
              @click="$emit('test', row)"
            >
              <AppIcon name="plug" :size="14" />
              <span>{{ t("logistics.carrierAccount.test") }}</span>
            </button>
            <button
              v-if="canEdit"
              type="button"
              class="hdr-btn-outlined"
              @click="$emit('edit', row)"
            >
              <AppIcon name="pencil" :size="14" />
              <span>{{ t("logistics.legOps.edit") }}</span>
            </button>
          </div>
        </li>
      </ul>

      <!-- Sayfalama: uç `page`/`page_size` kabul ediyor, liste 50'de kesiliyor.
           Sayfalayıcı olmadan 51. hesap sessizce kaybolurdu. -->
      <div v-if="total > pageSize" class="card p-0 mt-4">
        <ListPagination
          :model-value="page"
          :total="total"
          :page-size="pageSize"
          @update:model-value="$emit('update:page', $event)"
        />
      </div>
    </template>

    <p class="mt-4 text-xs text-gray-600 dark:text-gray-400">
      {{ t("logistics.carrierAccount.auditNote") }}
    </p>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { enumLabel } from "./catalogMeta";

  /**
   * **F1 · Taşıyıcı hesapları** (TUR-110, TUR-111).
   *
   * Faz B'de yazılan gizli bilgi sözleşmesinin görünen yüzü: liste ve detay
   * yanıtları gizli DEĞER taşımaz, yalnız `has_<alan>` bayrağı taşır. Ekran
   * "••••• (tanımlı)" gösterip üzerine yazmayı teklif eder; okumak isteyen
   * ayrı bir eylemle, `view.carrier_secret` yetkisiyle ve denetim kaydı
   * bırakarak ister.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /** `manage` = carrier_credential.manage, `viewSecret` = view.carrier_secret */
    can: { type: Object, default: () => ({ read: true, manage: false, viewSecret: false }) },
    /**
     * "Yeni hesap" butonu AYRI bayrakta, `can.manage`de değil.
     *
     * ÖLÜ BUTON YASAĞI: `create` emit'ini dinleyen kimse yok — taşıyıcı
     * hesabı FORM EKRANI henüz yazılmadı (manifestte karşılığı yok).
     * `can.manage` ile çizilseydi yetkili kullanıcı tıklar, hiçbir şey
     * olmaz, hata da görmezdi. Form geldiğinde container `can.manage &&
     * isScreenReady("<yeni ekran>")` geçirir.
     */
    canCreate: { type: Boolean, default: false },
    /**
     * "Düzenle" butonu AYRI bayrakta — `edit` emit'ini de dinleyen yok,
     * `canCreate` ile aynı gerekçe (aynı form ekranını bekliyor).
     */
    canEdit: { type: Boolean, default: false },
    /**
     * "Bağlantıyı test et" butonu AYRI bayrakta.
     *
     * Önceden HİÇBİR koşula bağlı değildi: yetkisiz kullanıcıya bile
     * çiziliyordu ve `test` emit'ini dinleyen yoktu. F2 (bağlantı testi)
     * manifestte `ready: false`, ucu `api.v1.logistics.test_carrier_connection`
     * ile birlikte gelecek. O gün container `can.manage && isScreenReady("F2")`
     * geçirir.
     */
    canTest: { type: Boolean, default: false },
    /**
     * Açığa çıkarılmış gizli değerler: `{ [hesapAdı]: { [alan]: değer } }`.
     * Container tutuyor — bileşen kendi state'inde saklamıyor ki ekran
     * değişince değer bellekte kalmasın.
     */
    revealed: { type: Object, default: () => ({}) },
    /** "Şu an" — token süresi kontrolü için (test edilebilirlik). */
    now: { type: String, default: "" },
    /** Sayfalama — `list_carrier_accounts` page/page_size ile sunucu tarafında. */
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 50 },
    total: { type: Number, default: 0 },
  });

  defineEmits(["create", "edit", "test", "reveal", "hide", "retry", "update:page"]);

  const { t, te } = useI18n();

  /** `logistics_admin.py` SECRET_FIELDS ile aynı sıra ve içerik. */
  const SECRET_FIELDS = ["api_key", "api_secret", "webhook_secret", "access_token"];

  /** Ham alan adı sözleşme; ekranda okunur ad görünür. */
  function secretLabel(field) {
    const key = `logistics.secretField.${field}`;
    return te(key) ? t(key) : field;
  }

  /**
   * `environment` BACKEND ENUM'U — çeviri anahtarı korumasız kurulamaz.
   *
   * Sözlükte bugün `sandbox` ve `production` var; adapter sözleşmesi
   * genişleyip (`staging` gibi) yeni bir değer gönderdiğinde `t()` ham
   * anahtarı ("logistics.environment.staging") rozete basardı. Bu rozet
   * canlı/test ayrımını taşıyor — okunmaz hâle gelmesi test siparişinin
   * gerçek kargoya düşmesiyle sonuçlanabilir. `te()` ile korunuyor, çeviri
   * yoksa ham enum değerinin kendisi gösteriliyor.
   *
   * NOT: `catalogMeta.js`'e `enumLabel` yardımcısı eklendiğinde bu fonksiyon
   * ona devredilmeli (aynı kalıp `secretLabel`/`flagLabel`de de var).
   */
  /** Backend enum'u — ortak `enumLabel` koruması (te kapısı + humanize fallback). */
  function environmentLabel(environment) {
    return enumLabel("logistics.environment", environment, t, te);
  }

  function tokenExpiryClass(row) {
    if (!props.now || !row.token_expiry) return "text-gray-600 dark:text-gray-400";
    return row.token_expiry < props.now
      ? "font-medium text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-400";
  }
</script>
