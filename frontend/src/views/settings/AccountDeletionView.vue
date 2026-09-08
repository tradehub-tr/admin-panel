<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import api from "@/utils/api";
  import { useAuthStore } from "@/stores/auth";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Panel Ayarlar > Hesap Silme (AD-3 / AC-12, Apple 5.1.1(v)).
   *
   * Silme uygulama içinden, telefon/destek gerektirmeden ANINDA başlatılır.
   * Onay ekranı `get_account_deletion_preview` verisiyle sonuçları açıkça
   * gösterir: mağaza Suspended, abonelik canceled (dönem sonu beklenmez, iade
   * yok), alt kullanıcı sayısı, 15 günlük KVKK anonimleştirme penceresi.
   * Parola doğrulaması backend'de (`delete_account`); başarıda logout +
   * login'e yönlendirme. Satış yüzeyi içermediği için iOS bayrağından
   * etkilenmez — iOS webview'da uçtan uca aynı çalışır.
   */
  const router = useRouter();
  const auth = useAuthStore();
  const toast = useToast();

  const loading = ref(true);
  const loadError = ref("");
  // {has_store, store_name, active_subscription:{plan,status,current_period_end}|null,
  //  sub_user_count, grace_days, consequences: string[]}
  const preview = ref(null);

  const password = ref("");
  const confirmed = ref(false);
  const deleting = ref(false);
  const deleteError = ref("");

  const canDelete = computed(() => !!password.value && confirmed.value && !deleting.value);

  const graceDays = computed(() => preview.value?.grace_days ?? 15);
  const consequences = computed(() => preview.value?.consequences || []);
  const activeSub = computed(() => preview.value?.active_subscription || null);
  const subUserCount = computed(() => preview.value?.sub_user_count || 0);

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(String(d).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  }

  async function loadPreview() {
    loading.value = true;
    loadError.value = "";
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.identity.get_account_deletion_preview"
      );
      preview.value = res?.message ?? null;
    } catch (e) {
      loadError.value = e.message || "Silme özeti yüklenemedi.";
    } finally {
      loading.value = false;
    }
  }

  async function deleteAccount() {
    if (!canDelete.value) return;
    deleting.value = true;
    deleteError.value = "";
    try {
      await api.callMethod("tradehub_core.api.v1.identity.delete_account", {
        password: password.value,
      });
      toast.success("Hesabınız silindi. Oturumunuz kapatılıyor…");
      // Backend soft-delete + oturum temizliği yaptı; frontend logout ile
      // yerel oturumu kapatır ve girişe döner (AC-12).
      await auth.logout();
      router.push("/login");
    } catch (e) {
      deleteError.value = e.message || "Hesap silinemedi. Parolanızı kontrol edin.";
      toast.error(deleteError.value);
    } finally {
      deleting.value = false;
    }
  }

  onMounted(loadPreview);
</script>

<template>
  <div class="acc-del">
    <h1 class="acc-del__title">Hesabı Sil</h1>
    <p class="acc-del__lead">
      Hesabınızı silmek geri alınması zor bir işlemdir. Aşağıdaki sonuçları okuyup parolanızla
      onaylayın.
    </p>

    <!-- Yükleniyor -->
    <div v-if="loading" class="acc-del__state">Silme özeti yükleniyor…</div>

    <!-- Hata -->
    <div v-else-if="loadError" class="acc-del__state acc-del__state--error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="ad-btn ad-btn--outline" @click="loadPreview">
        Yeniden dene
      </button>
    </div>

    <template v-else>
      <!-- Sonuçlar -->
      <section class="ad-card ad-card--warn" aria-labelledby="ad-consequences">
        <h2 id="ad-consequences" class="ad-card__title">
          <AppIcon name="alert-triangle" :size="16" /> Hesabınızı sildiğinizde
        </h2>
        <ul class="ad-list">
          <li v-for="c in consequences" :key="c">{{ c }}</li>
          <template v-if="!consequences.length">
            <li v-if="preview?.has_store">
              <strong>{{ preview.store_name || "Mağazanız" }}</strong> askıya alınır ve panel
              erişimi kapanır.
            </li>
            <li v-if="activeSub">
              <strong>{{ activeSub.plan }}</strong> aboneliğiniz dönem sonu beklenmeden hemen iptal
              edilir ({{ fmtDate(activeSub.current_period_end) }} yerine bugün); ücret iadesi
              yapılmaz.
            </li>
            <li v-if="subUserCount">
              Mağazanıza bağlı {{ subUserCount }} alt kullanıcının panel erişimi kapanır.
            </li>
            <li>Tüm oturumlarınız kapatılır ve tekrar giriş engellenir.</li>
            <li>
              Kişisel verileriniz KVKK gereği {{ graceDays }} gün içinde anonimleştirilir; bu süre
              içinde destek üzerinden hesap kurtarma mümkündür.
            </li>
          </template>
        </ul>
      </section>

      <!-- Onay formu -->
      <form class="ad-card" @submit.prevent="deleteAccount">
        <label class="ad-field">
          <span class="ad-field__label">Parolanız</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="ad-field__input"
            :disabled="deleting"
            required
          />
        </label>

        <label class="ad-check">
          <input v-model="confirmed" type="checkbox" :disabled="deleting" />
          <span>
            Hesabımın silineceğini, mağaza ve aboneliğimle ilgili yukarıdaki sonuçları anladığımı
            onaylıyorum.
          </span>
        </label>

        <p v-if="deleteError" class="ad-error" role="alert">{{ deleteError }}</p>

        <div class="ad-actions">
          <button
            type="button"
            class="ad-btn ad-btn--ghost"
            :disabled="deleting"
            @click="router.back()"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            class="ad-btn ad-btn--danger"
            :disabled="!canDelete"
            :aria-busy="deleting"
          >
            {{ deleting ? "Siliniyor…" : "Hesabımı Kalıcı Olarak Sil" }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .acc-del {
    max-width: 640px;
    margin: 0 auto;
    padding: 0.5rem 0 2rem;
  }
  .acc-del__title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .acc-del__lead {
    margin: 0.4rem 0 1.1rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .acc-del__state {
    padding: 2.5rem 0;
    text-align: center;
    font-size: 0.875rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-muted;
    }
  }
  .acc-del__state--error {
    color: $c-error;
    .ad-btn {
      margin-top: 0.8rem;
    }
  }

  .ad-card {
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    background: $l-bg;
    padding: 1.1rem 1.25rem;
    margin-bottom: 1.1rem;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .ad-card--warn {
    border-color: rgba($c-error, 0.4);
    background: rgba($c-error, 0.04);
    @include dark {
      border-color: rgba($c-error, 0.35);
      background: rgba($c-error, 0.08);
    }
  }
  .ad-card__title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    font-size: 0.92rem;
    font-weight: 700;
    color: $c-error;
  }
  .ad-list {
    margin: 0.7rem 0 0;
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
    line-height: 1.5;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
    strong {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }

  .ad-field {
    display: block;
  }
  .ad-field__label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .ad-field__input {
    margin-top: 0.3rem;
    width: 100%;
    padding: 0.55rem 0.7rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.875rem;
    background: $l-bg;
    color: $l-text-900;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-hi;
    }
  }
  .ad-check {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    margin-top: 0.9rem;
    font-size: 0.82rem;
    line-height: 1.5;
    color: $l-text-700;
    cursor: pointer;
    @include dark {
      color: $d-text;
    }
    input {
      margin-top: 0.2rem;
      accent-color: $c-error;
    }
  }
  .ad-error {
    margin: 0.7rem 0 0;
    font-size: 0.82rem;
    color: $c-error;
  }
  .ad-actions {
    margin-top: 1.1rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .ad-btn {
    padding: 0.55rem 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background $t-base,
      filter $t-base,
      opacity $t-base;
    &:disabled {
      opacity: 0.55;
      cursor: default;
    }
  }
  .ad-btn--danger {
    background: $c-error;
    border-color: $c-error;
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }
  }
  .ad-btn--outline {
    background: transparent;
    color: $brand;
    border-color: $brand;
    @include dark {
      color: $brand-light;
      border-color: $brand-light;
    }
  }
  .ad-btn--ghost {
    background: transparent;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
    &:hover:not(:disabled) {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
</style>
