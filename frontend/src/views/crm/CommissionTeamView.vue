<template>
  <div class="commissions-team">
    <header class="page-head">
      <h1>Ekip Hakedişleri</h1>
      <div class="filters" data-tour="ctm-filters">
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

    <section class="table-wrap" data-tour="ctm-table">
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
              <template v-if="r.status === 'Lider Onayı Bekliyor'">
                <button type="button" class="th-btn-primary" @click="approve(r)">
                  Lider Onayla
                </button>
                <button type="button" class="th-btn-outline" @click="reject(r)">Reddet</button>
              </template>
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

  // Sayfa-içi onboarding: filtreler → ekip hakediş tablosu.
  usePageTour("commission-team", () => [
    {
      target: '[data-tour="ctm-filters"]',
      title: t("tourSteps.page.ctmFilters_t"),
      desc: t("tourSteps.page.ctmFilters_d"),
    },
    {
      target: '[data-tour="ctm-table"]',
      title: t("tourSteps.page.ctmTable_t"),
      desc: t("tourSteps.page.ctmTable_d"),
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
    store.fetchTeam({ status: statusFilter.value, agent: agentFilter.value || null });
  }

  async function approve(r) {
    await store.leaderApprove(r.name);
    reload();
  }
  async function reject(r) {
    const note = window.prompt("Red sebebi:");
    if (!note) return;
    await store.leaderReject(r.name, note);
    reload();
  }

  onMounted(reload);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .commissions-team {
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

  /* Mobil: page-content 16px + kök 24px padding zinciri 320px'te içeriği 240px'e
     düşürüyor — kök padding'i azalt, negatif margin ile page-content boşluğunu geri al.
     Filtre çifti (select+input) wrap'sız 240px'e sığmıyor; wrap + esnek genişlik ver. */
  @media (max-width: 767px) {
    .commissions-team {
      padding: 0.75rem 0.25rem;
      margin: 0 -0.75rem;
    }
    .filters {
      flex-wrap: wrap;
      width: 100%;
    }
    .filters .input {
      flex: 1 1 140px;
      min-width: 0;
    }
    .table-wrap {
      overflow-x: auto; // geniş tablo kendi içinde kaysın, sayfa yatay taşmasın
    }
  }
</style>
