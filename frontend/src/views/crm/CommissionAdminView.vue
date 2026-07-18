<template>
  <div class="commissions-admin">
    <header class="page-head">
      <h1>Hakediş Yönetimi</h1>
      <div class="filters" data-tour="cma-filters">
        <select v-model="statusFilter" class="input" @change="reload">
          <option :value="null">Tüm durumlar</option>
          <option value="Lider Onayı Bekliyor">Lider Onayı Bekliyor</option>
          <option value="Süperadmin Onayı Bekliyor">Süperadmin Onayı Bekliyor</option>
          <option value="Onaylandı">Onaylandı</option>
          <option value="Ödendi">Ödendi</option>
          <option value="Reddedildi">Reddedildi</option>
        </select>
        <input
          v-model="agentFilter"
          class="input"
          placeholder="Saha elemanı (e-posta)"
          @keyup.enter="reload"
        />
      </div>
    </header>

    <section class="table-wrap" data-tour="cma-table">
      <table class="data-table">
        <thead>
          <tr>
            <th>Saha Elemanı</th>
            <th>Paket</th>
            <th>Komisyon</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading">
            <td colspan="6" class="cell-empty">Yükleniyor…</td>
          </tr>
          <tr v-else-if="!store.rows.length">
            <td colspan="6" class="cell-empty">Kayıt yok.</td>
          </tr>
          <tr v-for="r in store.rows" v-else :key="r.name">
            <td>{{ r.agent }}</td>
            <td>{{ r.plan }}</td>
            <td><CurrencyAmount :amount="r.commission_amount" :currency="r.currency" /></td>
            <td><StatusPill :status="r.status" :variant="variantFor(r.status)" /></td>
            <td><RelativeTime :value="r.creation" /></td>
            <td class="actions">
              <template v-if="r.status === 'Süperadmin Onayı Bekliyor'">
                <button type="button" class="th-btn-primary" @click="approve(r)">Onayla</button>
                <button type="button" class="th-btn-outline" @click="reject(r)">Reddet</button>
              </template>
              <button
                v-else-if="r.status === 'Onaylandı'"
                type="button"
                class="th-btn-dark"
                @click="pay(r)"
              >
                Ödendi
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useFieldCommissionsStore } from "@/stores/fieldCommissions";
  import { usePageTour } from "@/composables/usePageTour";
  import CurrencyAmount from "@/components/crm/CurrencyAmount.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";

  const { t } = useI18n();
  const store = useFieldCommissionsStore();

  // Sayfa-içi onboarding: filtreler → hakediş tablosu.
  usePageTour("commission-admin", () => [
    {
      target: '[data-tour="cma-filters"]',
      title: t("tourSteps.page.cmaFilters_t"),
      desc: t("tourSteps.page.cmaFilters_d"),
    },
    {
      target: '[data-tour="cma-table"]',
      title: t("tourSteps.page.cmaTable_t"),
      desc: t("tourSteps.page.cmaTable_d"),
    },
  ]);
  const statusFilter = ref(null);
  const agentFilter = ref("");

  const VARIANT_BY_STATUS = {
    "Lider Onayı Bekliyor": "warning",
    "Süperadmin Onayı Bekliyor": "info",
    Onaylandı: "info",
    Ödendi: "success",
    Reddedildi: "error",
  };
  const variantFor = (status) => VARIANT_BY_STATUS[status] || "";

  function reload() {
    store.fetchAll({ status: statusFilter.value, agent: agentFilter.value || null });
  }

  async function approve(r) {
    await store.approve(r.name);
    reload();
  }
  async function reject(r) {
    const note = window.prompt("Red sebebi:");
    if (!note) return;
    await store.reject(r.name, note);
    reload();
  }
  async function pay(r) {
    await store.markPaid(r.name);
    reload();
  }

  onMounted(reload);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .commissions-admin {
    padding: 1.5rem;
  }
  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .page-head h1 {
    font-size: 1.4rem;
    font-weight: 600;
  }
  .filters {
    display: flex;
    gap: 0.5rem;
  }
  .input {
    padding: 0.4rem 0.6rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
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
  .actions {
    display: flex;
    gap: 0.4rem;
  }

  // Mobil: padding zinciri (1.5rem + page-content 16px = 40px/kenar) 320px'te
  // içeriği 240px'e düşürüyor; filtreler sabit genişlikte yan yana sığmıyor.
  @media (max-width: 767px) {
    .commissions-admin {
      padding: 1rem 0.25rem;
      margin: 0 -0.75rem; // page-content'in 16px yan padding'ini geri kazan
    }
    .filters {
      flex-wrap: wrap; // select + input dar ekranda alt alta kırılsın, yatay taşma olmasın
      width: 100%;
    }
    .input {
      flex: 1 1 140px;
      min-width: 0; // flex item'in içerik genişliğine takılıp taşmasını engelle
      max-width: 100%;
    }
  }
</style>
