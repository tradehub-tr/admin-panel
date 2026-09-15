<script setup>
  import { computed, onMounted, ref } from "vue";
  import api from "@/utils/api";
  import { isIosApp } from "@/utils/platform";

  /**
   * AD-2 / AC-6..7 — Satıcı ödeme geçmişi (makbuz) bölümü.
   *
   * Veriyi kendi içinde çeker (`list_my_subscription_payments`, owner-only);
   * 403 dahil her hatada bölüm SESSİZCE gizlenir (alt kullanıcı/platform-admin
   * bu ucu göremez — toast/hata yüzeyi yok).
   *
   * E2 (BAĞLAYICI): isIosApp() iken status='pending' satırlar DOM'a HİÇ
   * girmez — pending satırın referans kodu + tutarı fiilen harici ödeme
   * TALİMATIDIR ve iOS gating'in gizlediği havale yüzeyini arka kapıdan
   * geri getirirdi (Apple 3.1.1 anti-steering). Yalnız confirmed/rejected
   * (ve canceled) geçmiş görünür; web davranışı değişmez.
   *
   * Bölüm copy'sinde fiyat listesi / yükseltme çağrısı YASAK (risk #4 —
   * makbuz erişimi satış yüzeyi değildir, öyle kalmalı).
   */

  // SSR/test tohumu (paymentHistorySection.test.js — AD-1 deseni): onMounted
  // SSR'de koşmadığı için satırlar/hata/açık satır test tarafından props ile
  // beslenir. Runtime'da parent bu props'ları geçirmez → davranış aynı kalır.
  const props = defineProps({
    initialPayments: { type: Array, default: null },
    initialError: { type: Boolean, default: false },
    initialExpanded: { type: String, default: "" },
  });

  const iosApp = isIosApp();

  const rows = ref(props.initialPayments || []);
  const loaded = ref(!!props.initialPayments);
  const failed = ref(props.initialError);
  const expanded = ref(props.initialExpanded); // açık makbuz satırının name'i

  // E2: iOS'ta pending (ve sonuçlanmamış diğer) satırlar TAMAMEN dışarıda —
  // v-show değil allowlist filtresi: yalnız confirmed/rejected geçmiş kalır,
  // referans kodu/tutar DOM'a hiç basılmaz.
  const visibleRows = computed(() =>
    iosApp
      ? rows.value.filter((r) => r.status === "confirmed" || r.status === "rejected")
      : rows.value
  );

  const STATUS_LABEL = {
    pending: "Bekliyor",
    confirmed: "Onaylı",
    rejected: "Reddedildi",
    canceled: "İptal",
  };

  function cycleLabel(cycle) {
    return cycle === "monthly" ? "Aylık" : "Yıllık";
  }

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(String(d).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function toggle(name) {
    expanded.value = expanded.value === name ? "" : name;
  }

  async function load() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.subscription_payment.list_my_subscription_payments"
      );
      rows.value = res?.message || [];
      loaded.value = true;
    } catch {
      // 403 (owner-değil) dahil her hata → bölüm sessizce gizli kalır.
      failed.value = true;
    }
  }

  onMounted(() => {
    if (!loaded.value && !failed.value) load();
  });
</script>

<template>
  <!-- Yüklenene kadar da gizli: boş iskelet/başlık flash'ı yok. -->
  <section v-if="loaded && !failed" class="pay-hist" aria-labelledby="pay-hist-title">
    <h2 id="pay-hist-title" class="pay-hist__title">Ödeme Geçmişi</h2>

    <p v-if="!visibleRows.length" class="pay-hist__empty">Henüz bir ödeme kaydınız bulunmuyor.</p>

    <div v-else class="pay-hist__wrap">
      <table class="pay-hist__table">
        <thead>
          <tr>
            <th>Paket</th>
            <th>Döngü</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th class="ta-right"><span class="sr-only">Makbuz detayı</span></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="r in visibleRows" :key="r.name">
            <tr>
              <td class="td-strong">{{ r.plan }}</td>
              <td>{{ cycleLabel(r.billing_cycle) }}</td>
              <td>{{ r.amount }} {{ r.currency }}</td>
              <td>
                <span class="badge" :class="`badge--${r.status}`">
                  {{ STATUS_LABEL[r.status] || r.status }}
                </span>
              </td>
              <td class="muted">{{ fmtDate(r.requested_at) }}</td>
              <td class="ta-right">
                <button
                  type="button"
                  class="ph-toggle"
                  :aria-expanded="expanded === r.name"
                  @click="toggle(r.name)"
                >
                  {{ expanded === r.name ? "Gizle" : "Detay" }}
                </button>
              </td>
            </tr>
            <tr v-if="expanded === r.name" class="ph-detail">
              <td :colspan="6">
                <dl class="ph-receipt">
                  <div class="ph-receipt__row">
                    <dt>Referans Kodu</dt>
                    <dd class="mono">{{ r.reference_code || "—" }}</dd>
                  </div>
                  <div class="ph-receipt__row">
                    <dt>Talep tarihi</dt>
                    <dd>{{ fmtDate(r.requested_at) }}</dd>
                  </div>
                  <div v-if="r.confirmed_at" class="ph-receipt__row">
                    <dt>Onay tarihi</dt>
                    <dd>{{ fmtDate(r.confirmed_at) }}</dd>
                  </div>
                  <div v-if="r.rejection_reason" class="ph-receipt__row">
                    <dt>Ret sebebi</dt>
                    <dd>{{ r.rejection_reason }}</dd>
                  </div>
                </dl>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .pay-hist {
    margin-bottom: 1.25rem;
  }
  .pay-hist__title {
    margin: 0 0 0.7rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .pay-hist__empty {
    margin: 0;
    padding: 1rem 1.25rem;
    border: 1px dashed $l-border-alt;
    border-radius: 12px;
    font-size: 0.85rem;
    color: $l-text-500;
    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
    }
  }

  .pay-hist__wrap {
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    overflow: hidden;
    overflow-x: auto;
    @include dark {
      border-color: $d-border;
    }
  }
  .pay-hist__table {
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
      padding: 0.6rem 1rem;
      background: $l-bg-soft;
      color: $l-text-400;
      @include dark {
        background: $d-bg-elevated;
        color: $d-text-faint;
      }
    }
    td {
      padding: 0.65rem 1rem;
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
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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

  .ph-toggle {
    padding: 0.3rem 0.75rem;
    border: 1px solid $l-border;
    border-radius: 7px;
    background: transparent;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    color: $l-text-500;
    transition:
      border-color $t-base,
      color $t-base;
    @include dark {
      border-color: $d-border;
      color: $d-text-muted;
    }
    &:hover,
    &[aria-expanded="true"] {
      border-color: rgba($brand, 0.5);
      color: $brand;
      @include dark {
        border-color: rgba($brand-light, 0.5);
        color: $brand-light;
      }
    }
  }

  .ph-detail td {
    background: $l-bg-soft;
    @include dark {
      background: $d-bg-elevated;
    }
  }
  .ph-receipt {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.45rem 1.5rem;
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .ph-receipt__row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    dt {
      flex: 0 0 auto;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    dd {
      margin: 0;
      font-size: 0.82rem;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
</style>
