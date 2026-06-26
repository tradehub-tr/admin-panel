<template>
  <div class="commissions-page">
    <header class="page-head">
      <h1>Hakedişlerim</h1>
    </header>

    <section class="kpi-row" data-tour="myc-kpi">
      <div class="kpi-card">
        <span class="kpi-label">Bekleyen</span>
        <CurrencyAmount
          :amount="totals['Lider Onayı Bekliyor'] + totals['Süperadmin Onayı Bekliyor']"
          :currency="cur"
        />
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Onaylanan</span>
        <CurrencyAmount :amount="totals.Onaylandı" :currency="cur" />
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Ödenen</span>
        <CurrencyAmount :amount="totals.Ödendi" :currency="cur" />
      </div>
    </section>

    <section class="table-wrap" data-tour="myc-table">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tür</th>
            <th>Paket</th>
            <th>Esas Tutar</th>
            <th>Oran</th>
            <th>Komisyon</th>
            <th>Durum</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading">
            <td colspan="7" class="cell-empty">Yükleniyor…</td>
          </tr>
          <tr v-else-if="!store.rows.length">
            <td colspan="7" class="cell-empty">Henüz hakediş kaydınız yok.</td>
          </tr>
          <tr v-for="r in store.rows" v-else :key="r.name">
            <td>{{ r.kind || "Satış" }}</td>
            <td>{{ r.plan }}</td>
            <td>
              <CurrencyAmount
                v-if="r.commission_type !== 'Sabit Ücret'"
                :amount="r.base_amount"
                :currency="r.currency"
              />
              <span v-else class="cell-empty">—</span>
            </td>
            <td>{{ r.commission_type === "Sabit Ücret" ? "Sabit" : `%${r.commission_rate}` }}</td>
            <td><CurrencyAmount :amount="r.commission_amount" :currency="r.currency" /></td>
            <td><StatusPill :status="r.status" :variant="variantFor(r.status)" /></td>
            <td><RelativeTime :value="r.creation" /></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
  import { computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useFieldCommissionsStore } from "@/stores/fieldCommissions";
  import { usePageTour } from "@/composables/usePageTour";
  import CurrencyAmount from "@/components/crm/CurrencyAmount.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";

  const { t } = useI18n();
  const store = useFieldCommissionsStore();

  // Sayfa-içi onboarding: KPI özeti → hakediş tablosu.
  usePageTour("my-commissions", () => [
    {
      target: '[data-tour="myc-kpi"]',
      title: t("tourSteps.page.mycKpi_t"),
      desc: t("tourSteps.page.mycKpi_d"),
    },
    {
      target: '[data-tour="myc-table"]',
      title: t("tourSteps.page.mycTable_t"),
      desc: t("tourSteps.page.mycTable_d"),
    },
  ]);

  // İlk para birimini özetten al (Faz 1: tek para birimi varsayımı).
  const cur = computed(() => Object.keys(store.summary)[0] || "");
  const totals = computed(
    () =>
      store.summary[cur.value] || {
        "Lider Onayı Bekliyor": 0,
        "Süperadmin Onayı Bekliyor": 0,
        Onaylandı: 0,
        Ödendi: 0,
        Reddedildi: 0,
      }
  );

  const VARIANT_BY_STATUS = {
    "Lider Onayı Bekliyor": "warning",
    "Süperadmin Onayı Bekliyor": "info",
    Onaylandı: "info",
    Ödendi: "success",
    Reddedildi: "error",
  };
  const variantFor = (status) => VARIANT_BY_STATUS[status] || "";

  onMounted(() => store.fetchMine());
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .commissions-page {
    padding: 1.5rem;
  }
  .page-head h1 {
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .kpi-card {
    padding: 1rem 1.25rem;
    border: 1px solid $l-border;
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }
  }
  .kpi-label {
    font-size: 0.8rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .table-wrap {
    overflow-x: auto;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table th,
  .data-table td {
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid $l-border;
    font-size: 0.9rem;
    @include dark {
      border-color: $d-border;
    }
  }
  .cell-empty {
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
</style>
