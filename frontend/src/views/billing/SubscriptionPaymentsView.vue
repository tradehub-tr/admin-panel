<script setup>
  import { computed, ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const toast = useToast();

  // AD-3 / AC-12 SSR/test tohumu (attentionSubscriptions.test.js — AD-1
  // deseni): onMounted SSR'de koşmadığı için dikkat listesi test tarafından
  // props ile beslenir; runtime'da router bu prop'u geçirmez.
  const props = defineProps({
    initialAttention: { type: Object, default: null },
  });

  // Sayfa-içi onboarding: durum filtreleri → ödeme tablosu → onay/ret işlemleri.
  usePageTour("subscription-payments", () => [
    {
      target: '[data-tour="spv-filters"]',
      title: t("tourSteps.page.spvFilters_t"),
      desc: t("tourSteps.page.spvFilters_d"),
    },
    {
      target: '[data-tour="spv-table"]',
      title: t("tourSteps.page.spvTable_t"),
      desc: t("tourSteps.page.spvTable_d"),
    },
    {
      target: '[data-tour="spv-actions"]',
      title: t("tourSteps.page.spvActions_t"),
      desc: t("tourSteps.page.spvActions_d"),
    },
  ]);
  const rows = ref([]);
  const loading = ref(true);
  const statusFilter = ref("pending");
  const acting = ref("");

  const FILTERS = [
    { key: "pending", label: "Bekleyen" },
    { key: "confirmed", label: "Onaylı" },
    { key: "rejected", label: "Reddedilen" },
    { key: "all", label: "Tümü" },
  ];

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.subscription_payment.list_subscription_payments",
        { status: statusFilter.value }
      );
      rows.value = res?.message || [];
    } catch (e) {
      toast.error(e.message || "Liste yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  async function confirmPayment(name) {
    if (acting.value) return;
    if (!window.confirm("Havalenin hesaba ulaştığını onaylıyor musunuz? Abonelik aktifleşecek."))
      return;
    acting.value = name;
    try {
      await api.callMethod(
        "tradehub_core.api.v1.subscription_payment.confirm_subscription_payment",
        {
          payment: name,
        }
      );
      toast.success("Ödeme onaylandı, abonelik aktif edildi");
      await load();
    } catch (e) {
      toast.error(e.message || "Onaylanamadı");
    } finally {
      acting.value = "";
    }
  }

  async function rejectPayment(name) {
    if (acting.value) return;
    const reason = window.prompt("Ret sebebi (opsiyonel):", "");
    if (reason === null) return; // iptal
    acting.value = name;
    try {
      await api.callMethod(
        "tradehub_core.api.v1.subscription_payment.reject_subscription_payment",
        {
          payment: name,
          reason,
        }
      );
      toast.success("Ödeme talebi reddedildi");
      await load();
    } catch (e) {
      toast.error(e.message || "Reddedilemedi");
    } finally {
      acting.value = "";
    }
  }

  function setFilter(s) {
    statusFilter.value = s;
    load();
  }

  const STATUS_LABEL = {
    pending: "Bekliyor",
    confirmed: "Onaylı",
    rejected: "Reddedildi",
    canceled: "İptal",
  };

  // ── AD-3 / AC-12: İptal Planlı & Ödemesi Geciken Mağazalar ──
  // Tek uç (`list_attention_subscriptions`, superadmin-only) üç bloğu döner:
  // cancellations / dunning / reason_breakdown. Ayrı route/DocType yok.
  const attention = ref(props.initialAttention);
  const attentionLoading = ref(!props.initialAttention);

  // İptal sebebi kodları CancelSubscriptionModal anketiyle aynı sözlük.
  const REASON_LABEL = {
    fiyat: "Fiyat bana uygun değil",
    kullanmiyorum: "Paneli kullanmıyorum",
    ozellik_eksik: "İhtiyacım olan özellik eksik",
    gecici_durgunluk: "İşlerim geçici olarak durgun",
    kapaniyor: "Mağazamı kapatıyorum",
    diger: "Diğer",
  };
  const reasonLabel = (code) => REASON_LABEL[code] || code || "—";

  const DUNNING_STATUS_LABEL = { past_due: "Ödeme gecikti", suspended: "Askıda" };

  const cancellations = computed(() => attention.value?.cancellations || []);
  const dunning = computed(() => attention.value?.dunning || []);
  // Sebep dağılımı chip'leri — backend yalnız görülen (>0) anahtarları döner.
  const reasonChips = computed(() =>
    Object.entries(attention.value?.reason_breakdown || {}).map(([code, count]) => ({
      code,
      label: reasonLabel(code),
      count,
    }))
  );

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(String(d).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  }

  async function loadAttention() {
    attentionLoading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.subscription_admin.list_attention_subscriptions"
      );
      attention.value = res?.message || null;
    } catch (e) {
      toast.error(e.message || "Dikkat listesi yüklenemedi");
    } finally {
      attentionLoading.value = false;
    }
  }

  onMounted(() => {
    load();
    if (!props.initialAttention) loadAttention();
  });
</script>

<template>
  <div class="sub-pay">
    <h1 class="sub-pay__title">Abonelik Ödemeleri (Havale / EFT)</h1>

    <div class="filters" data-tour="spv-filters">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="filter"
        :class="{ 'filter--active': statusFilter === f.key }"
        @click="setFilter(f.key)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="state-msg">Yükleniyor…</div>
    <div v-else-if="!rows.length" class="state-msg">Kayıt yok.</div>
    <div v-else class="table-wrap" data-tour="spv-table">
      <table class="table">
        <thead>
          <tr>
            <th>Mağaza</th>
            <th>Paket</th>
            <th>Tutar</th>
            <th>Referans</th>
            <th>Durum</th>
            <th>Talep</th>
            <th class="ta-right" data-tour="spv-actions">İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name">
            <td class="td-strong">{{ r.store_name }}</td>
            <td>
              {{ r.plan }} <span class="muted">/ {{ r.billing_cycle }}</span>
            </td>
            <td>{{ r.amount }} {{ r.currency }}</td>
            <td class="mono">{{ r.reference_code }}</td>
            <td>
              <span class="badge" :class="`badge--${r.status}`">
                {{ STATUS_LABEL[r.status] || r.status }}
              </span>
            </td>
            <td class="muted small">{{ r.requested_at }}</td>
            <td class="ta-right">
              <template v-if="r.status === 'pending'">
                <button
                  type="button"
                  class="btn btn--confirm"
                  :disabled="!!acting"
                  @click="confirmPayment(r.name)"
                >
                  Onayla
                </button>
                <button
                  type="button"
                  class="btn btn--reject"
                  :disabled="!!acting"
                  @click="rejectPayment(r.name)"
                >
                  Reddet
                </button>
              </template>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── AD-3 / AC-12: İptal Planlı & Ödemesi Geciken Mağazalar ── -->
    <section class="attn" aria-labelledby="attn-title">
      <h2 id="attn-title" class="attn__title">İptal Planlı &amp; Ödemesi Geciken Mağazalar</h2>

      <div v-if="attentionLoading" class="state-msg">Yükleniyor…</div>
      <div v-else-if="!attention" class="state-msg">Dikkat listesi yüklenemedi.</div>
      <template v-else>
        <div v-if="reasonChips.length" class="attn__chips" aria-label="İptal sebebi dağılımı">
          <span v-for="c in reasonChips" :key="c.code" class="attn__chip">
            {{ c.label }} <b class="attn__chip-count">{{ c.count }}</b>
          </span>
        </div>

        <h3 class="attn__subtitle">İptal planlı (dönem sonunda kapanacak)</h3>
        <p v-if="!cancellations.length" class="state-msg state-msg--tight">
          İptal planlı mağaza yok.
        </p>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Mağaza</th>
                <th>Paket</th>
                <th>Sebep</th>
                <th>İptal talebi</th>
                <th>Dönem sonu (fesih)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in cancellations" :key="r.store">
                <td class="td-strong">{{ r.store_name }}</td>
                <td>{{ r.plan }}</td>
                <td>
                  <span class="attn__chip attn__chip--cell">{{
                    reasonLabel(r.cancellation_reason)
                  }}</span>
                </td>
                <td class="muted small">{{ fmtDate(r.cancel_requested_at) }}</td>
                <td class="muted small">{{ fmtDate(r.current_period_end) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="attn__subtitle">Ödemesi geciken / askıda</h3>
        <p v-if="!dunning.length" class="state-msg state-msg--tight">Ödemesi geciken mağaza yok.</p>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Mağaza</th>
                <th>Paket</th>
                <th>Durum</th>
                <th>Dönem sonu</th>
                <th>Askı tarihi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in dunning" :key="r.store">
                <td class="td-strong">{{ r.store_name }}</td>
                <td>{{ r.plan }}</td>
                <td>
                  <span
                    class="badge"
                    :class="r.status === 'suspended' ? 'badge--rejected' : 'badge--pending'"
                  >
                    {{ DUNNING_STATUS_LABEL[r.status] || r.status }}
                  </span>
                </td>
                <td class="muted small">{{ fmtDate(r.current_period_end) }}</td>
                <td class="muted small">{{ fmtDate(r.suspended_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .sub-pay {
    max-width: 1100px;
    margin: 0 auto;
  }
  .sub-pay__title {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }

  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .filter {
    padding: 0.4rem 0.9rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-600;
    transition:
      background $t-base,
      border-color $t-base,
      color $t-base;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
    &:hover {
      border-color: rgba($brand, 0.4);
    }
  }
  .filter--active {
    border-color: $brand;
    background: rgba($brand, 0.08);
    color: $brand;
    @include dark {
      color: $brand-light;
      border-color: $brand-light;
      background: rgba($brand-light, 0.12);
    }
  }

  .table-wrap {
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    overflow: hidden;
    overflow-x: auto;
    @include dark {
      border-color: $d-border;
    }
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    background: $l-bg;
    @include dark {
      background: $d-bg-card;
    }
    th {
      text-align: left;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      padding: 0.65rem 1rem;
      background: $l-bg-soft;
      color: $l-text-400;
      @include dark {
        background: $d-bg-elevated;
        color: $d-text-faint;
      }
    }
    td {
      padding: 0.7rem 1rem;
      border-top: 1px solid $l-border;
      color: $l-text-700;
      @include dark {
        border-color: $d-border-inner;
        color: $d-text;
      }
    }
  }
  .td-strong {
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .ta-right {
    text-align: right;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
  }
  .muted {
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .small {
    font-size: 0.78rem;
  }

  .badge {
    display: inline-block;
    padding: 0.18rem 0.6rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
  }
  .badge--pending {
    background: rgba($c-warning, 0.15);
    color: #b45309;
    @include dark {
      color: #fbbf24;
    }
  }
  .badge--confirmed {
    background: rgba($c-success, 0.15);
    color: #047857;
    @include dark {
      color: #34d399;
    }
  }
  .badge--rejected {
    background: rgba($c-error, 0.15);
    color: #b91c1c;
    @include dark {
      color: #f87171;
    }
  }
  .badge--canceled {
    background: $l-bg-muted;
    color: $l-text-500;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }

  .btn {
    padding: 0.4rem 0.85rem;
    border-radius: 7px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      filter $t-base,
      background $t-base;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }
  }
  .btn--confirm {
    margin-right: 0.4rem;
    background: $c-success;
    color: #fff;
  }
  .btn--reject {
    background: transparent;
    border-color: $c-error;
    color: $c-error;
    &:hover:not(:disabled) {
      filter: none;
      background: rgba($c-error, 0.08);
    }
  }

  .state-msg {
    padding: 2.5rem 0;
    text-align: center;
    color: $l-text-400;
    @include dark {
      color: $d-text-muted;
    }
  }
  .state-msg--tight {
    margin: 0;
    padding: 1rem 0;
    text-align: left;
    font-size: 0.85rem;
  }

  /* ── AD-3 / AC-12: dikkat listesi bölümü ── */
  .attn {
    margin-top: 2rem;
  }
  .attn__title {
    margin: 0 0 0.8rem;
    font-size: 1rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .attn__subtitle {
    margin: 1.2rem 0 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .attn__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.4rem;
  }
  .attn__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid $l-border;
    background: $l-bg-soft;
    color: $l-text-700;
    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
      color: $d-text;
    }
  }
  .attn__chip--cell {
    padding: 0.18rem 0.6rem;
    font-size: 0.72rem;
  }
  .attn__chip-count {
    font-weight: 700;
    color: $brand;
    @include dark {
      color: $brand-light;
    }
  }
</style>
