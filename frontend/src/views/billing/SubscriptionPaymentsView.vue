<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const toast = useToast();

  // Sayfa-içi onboarding: durum filtreleri → ödeme tablosu → onay/ret işlemleri.
  usePageTour("subscription-payments", () => [
    { target: '[data-tour="spv-filters"]', title: t("tourSteps.page.spvFilters_t"), desc: t("tourSteps.page.spvFilters_d") },
    { target: '[data-tour="spv-table"]', title: t("tourSteps.page.spvTable_t"), desc: t("tourSteps.page.spvTable_d") },
    { target: '[data-tour="spv-actions"]', title: t("tourSteps.page.spvActions_t"), desc: t("tourSteps.page.spvActions_d") },
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

  onMounted(load);
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
</style>
