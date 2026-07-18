<template>
  <div class="om">
    <!-- Hızlı işlemler (Order için genelde boş; sözleşme tutarlılığı) -->
    <div v-if="quickActions.length" class="om-qa">
      <button
        v-for="action in quickActions"
        :key="action.key"
        type="button"
        class="om-qa-btn"
        :class="{ disabled: action.disabled || actionLoading }"
        :disabled="action.disabled || actionLoading"
        @click="emit('quick-action', action)"
      >
        <AppIcon :name="actionLoading ? 'loader' : action.icon" :size="14" />
        <span>{{ action.label }}</span>
      </button>
    </div>

    <!-- Durum + meta kartı -->
    <div class="om-card om-head">
      <div class="om-head-top">
        <span class="om-status" :class="`is-${statusTone}`">{{
          docData.status || formData.status || "—"
        }}</span>
        <span class="om-date">{{ fmtDateTime(docData.order_date) }}</span>
      </div>
      <div class="om-kvs">
        <div class="om-kv">
          <span>Alıcı</span>
          <b>{{ docData.buyer || "—" }}</b>
        </div>
        <div class="om-kv">
          <span>Satıcı</span>
          <b>{{ docData.seller || "—" }}</b>
        </div>
        <div class="om-kv">
          <span>Ödeme Yöntemi</span>
          <b>{{ docData.payment_method || "—" }}</b>
        </div>
      </div>
    </div>

    <!-- Tutar kartı -->
    <div class="om-card om-money">
      <div class="om-kv">
        <span>Ara Toplam</span>
        <b>{{ fmtMoney(docData.subtotal) }}</b>
      </div>
      <div class="om-kv">
        <span>Kargo Ücreti</span>
        <b>{{ fmtMoney(docData.shipping_fee) }}</b>
      </div>
      <div v-if="docData.coupon_code" class="om-kv">
        <span>Kupon</span>
        <b>
          {{ docData.coupon_code }} ·
          <span class="om-discount">−{{ fmtMoney(docData.coupon_discount) }}</span>
        </b>
      </div>
      <div class="om-total-sep" aria-hidden="true"></div>
      <div class="om-total">
        <span>Toplam</span>
        <b>{{ fmtMoney(docData.total) }}</b>
      </div>
    </div>

    <!-- Ürün kalemleri -->
    <div class="om-items-head">
      <p class="om-sec-title">Ürünler</p>
      <span class="om-count">{{ items.length }}</span>
    </div>
    <div v-if="!items.length" class="om-card om-empty">
      {{ t("docTypeForm.noRecordsYet") }}
    </div>
    <div v-for="(item, idx) in items" :key="item.name || idx" class="om-card om-item">
      <img v-if="safeUrl(item.image)" :src="safeUrl(item.image)" alt="" class="om-item-img" />
      <span v-else class="om-item-ph"><AppIcon name="package" :size="18" /></span>
      <span class="om-item-main">
        <b>{{ item.listing_title || item.listing || "—" }}</b>
        <span v-if="itemVariant(item)" class="om-item-var">{{ itemVariant(item) }}</span>
        <span v-if="item.is_sample" class="om-chip">Numune</span>
      </span>
      <span class="om-item-price">
        <span>{{ item.quantity || 0 }} × {{ fmtMoney(item.unit_price) }}</span>
        <b>{{ fmtMoney(item.total_price) }}</b>
      </span>
    </div>

    <!-- Bölüm satırları -->
    <p class="om-sec-title">{{ t("upMobile.sections") }}</p>
    <button
      v-for="sec in sections"
      :key="sec.id"
      type="button"
      class="om-card om-secrow"
      @click="sheet = sec.id"
    >
      <span class="om-secic"><AppIcon :name="sec.icon" :size="15" /></span>
      <span class="om-secmain">
        <b>{{ sec.label }}</b>
        <span>{{ sectionSummary(sec.id) }}</span>
      </span>
      <AppIcon name="chevron-right" :size="15" class="om-chev" />
    </button>

    <!-- Bölüm sheet'i -->
    <Teleport to="body">
      <Transition name="om-sheet">
        <div v-if="sheet" class="om-backdrop" @click.self="sheet = null">
          <div class="om-sheet" role="dialog" aria-modal="true">
          <div class="om-grab" aria-hidden="true"></div>
          <header class="om-sh-head">
            <div class="om-sh-title">
              <b>{{ SHEET_LABELS[sheet] }}</b>
              <span>{{ docData.name }}</span>
            </div>
            <button
              type="button"
              class="om-sh-x"
              :aria-label="t('upMobile.close')"
              @click="sheet = null"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </header>

          <div class="om-sh-body">
            <!-- SİPARİŞ -->
            <template v-if="sheet === 'siparis'">
              <label class="om-f">
                <span>Seri</span>
                <input :value="fd.naming_series" type="text" class="om-mono" disabled />
              </label>
              <label class="om-f">
                <span>Alıcı</span>
                <input :value="fd.buyer" type="text" disabled />
              </label>
              <label class="om-f">
                <span>Satıcı</span>
                <input :value="fd.seller" type="text" disabled />
              </label>
              <div class="om-frow">
                <label class="om-f">
                  <span>Durum</span>
                  <select v-model="fd.status" :disabled="!canEdit">
                    <option v-for="o in STATUSES" :key="o" :value="o">{{ o }}</option>
                  </select>
                </label>
                <label class="om-f">
                  <span>Ödeme Yöntemi</span>
                  <input :value="fd.payment_method" type="text" disabled />
                </label>
              </div>
              <div class="om-frow">
                <label class="om-f">
                  <span>Sipariş Tarihi</span>
                  <input :value="fmtDateTime(fd.order_date)" type="text" disabled />
                </label>
                <label class="om-f">
                  <span>Para Birimi</span>
                  <input :value="fd.currency" type="text" class="om-mono" disabled />
                </label>
              </div>
              <div v-if="fd.coupon_code" class="om-card om-kvs om-kvs-pad">
                <div class="om-kv">
                  <span>Kupon Kodu</span>
                  <b>{{ fd.coupon_code }}</b>
                </div>
                <div class="om-kv">
                  <span>Kupon İndirimi</span>
                  <b class="om-discount">−{{ fmtMoney(fd.coupon_discount) }}</b>
                </div>
              </div>
            </template>

            <!-- KARGO -->
            <template v-else-if="sheet === 'kargo'">
              <label class="om-f">
                <span>Teslimat Adresi</span>
                <textarea v-model="fd.shipping_address" rows="3" :disabled="!canEdit"></textarea>
              </label>
              <div class="om-frow">
                <label class="om-f">
                  <span>Kargo Yöntemi</span>
                  <input v-model="fd.shipping_method" type="text" :disabled="!canEdit" />
                </label>
                <label class="om-f">
                  <span>Gönderim Yeri</span>
                  <input v-model="fd.ship_from" type="text" :disabled="!canEdit" />
                </label>
              </div>
              <div class="om-frow">
                <label class="om-f">
                  <span>Kargo Firması</span>
                  <input v-model="fd.carrier" type="text" :disabled="!canEdit" />
                </label>
                <label class="om-f">
                  <span>Takip Numarası</span>
                  <input
                    v-model="fd.tracking_number"
                    type="text"
                    class="om-mono"
                    :disabled="!canEdit"
                  />
                </label>
              </div>
              <label class="om-f">
                <span>Alıcı Notu</span>
                <textarea :value="fd.buyer_note" rows="2" class="om-italic" disabled></textarea>
              </label>
            </template>

            <!-- ÖDEME -->
            <template v-else-if="sheet === 'odeme'">
              <div class="om-frow">
                <label class="om-f">
                  <span>Havale Tarihi</span>
                  <input v-model="fd.remittance_date" type="date" :disabled="!canEdit" />
                </label>
                <label class="om-f">
                  <span>Havale Tutarı</span>
                  <input v-model.number="fd.remittance_amount" type="number" :disabled="!canEdit" />
                </label>
              </div>
              <label class="om-f">
                <span>Gönderen</span>
                <input v-model="fd.remittance_sender" type="text" :disabled="!canEdit" />
              </label>
              <div class="om-f">
                <span>Dekont</span>
                <a
                  v-if="receiptHref"
                  :href="receiptHref"
                  target="_blank"
                  rel="noopener"
                  class="om-receipt"
                >
                  <img :src="receiptHref" alt="Dekont" />
                </a>
                <p v-else class="om-none">—</p>
              </div>
              <div class="om-card om-kvs om-kvs-pad">
                <div class="om-kv">
                  <span>Stok Düşüldü</span>
                  <b class="om-checkval" :class="fd.stock_deducted ? 'ok' : ''">
                    <AppIcon :name="fd.stock_deducted ? 'check' : 'minus'" :size="13" />
                    {{ fd.stock_deducted ? "Evet" : "Hayır" }}
                  </b>
                </div>
              </div>
            </template>

            <!-- FATURA -->
            <template v-else-if="sheet === 'fatura'">
              <label class="om-f">
                <span>Fatura Tipi</span>
                <select v-model="fd.billing_type" :disabled="!canEdit">
                  <option value="Bireysel">Bireysel</option>
                  <option value="Şirket">Şirket</option>
                </select>
              </label>
              <label class="om-f">
                <span>Şirket Adı</span>
                <input v-model="fd.billing_company_name" type="text" :disabled="!canEdit" />
              </label>
              <div class="om-frow">
                <label class="om-f">
                  <span>Vergi Dairesi</span>
                  <input v-model="fd.billing_tax_office" type="text" :disabled="!canEdit" />
                </label>
                <label class="om-f">
                  <span>Vergi Numarası</span>
                  <input
                    v-model="fd.billing_tax_number"
                    type="text"
                    class="om-mono"
                    :disabled="!canEdit"
                  />
                </label>
              </div>
              <label class="om-f">
                <span>TCKN</span>
                <input v-model="fd.billing_tcn" type="text" class="om-mono" :disabled="!canEdit" />
              </label>
              <div class="om-card om-switches">
                <label class="om-switchrow">
                  <span class="om-sl"><b>e-Fatura</b></span>
                  <input
                    v-model="fd.billing_e_invoice"
                    type="checkbox"
                    :true-value="1"
                    :false-value="0"
                    :disabled="!canEdit"
                    class="om-sw"
                  />
                </label>
                <label class="om-switchrow">
                  <span class="om-sl"><b>Teslimat adresi ile aynı</b></span>
                  <input
                    v-model="fd.billing_same_as_shipping"
                    type="checkbox"
                    :true-value="1"
                    :false-value="0"
                    :disabled="!canEdit"
                    class="om-sw"
                  />
                </label>
              </div>
              <label class="om-f">
                <span>Fatura Adresi</span>
                <textarea v-model="fd.billing_address" rows="3" :disabled="!canEdit"></textarea>
              </label>
              <div class="om-frow">
                <label class="om-f">
                  <span>İl</span>
                  <input v-model="fd.billing_city" type="text" :disabled="!canEdit" />
                </label>
                <label class="om-f">
                  <span>İlçe</span>
                  <input v-model="fd.billing_district" type="text" :disabled="!canEdit" />
                </label>
              </div>
              <label class="om-f">
                <span>Posta Kodu</span>
                <input
                  v-model="fd.billing_postal_code"
                  type="text"
                  class="om-mono"
                  :disabled="!canEdit"
                />
              </label>
            </template>

            <!-- İADE -->
            <template v-else-if="sheet === 'iade'">
              <label class="om-f">
                <span>İade Durumu</span>
                <select v-model="fd.refund_status" :disabled="!canEdit">
                  <option value=""></option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>
              <label class="om-f">
                <span>İade Nedeni</span>
                <textarea v-model="fd.refund_reason" rows="3" :disabled="!canEdit"></textarea>
              </label>
              <div class="om-card om-kvs om-kvs-pad">
                <div class="om-kv">
                  <span>İade Tutarı</span>
                  <b>{{ fmtMoney(fd.refund_amount) }}</b>
                </div>
                <div class="om-kv">
                  <span>Talep Tarihi</span>
                  <b>{{ fmtDateTime(fd.refund_requested_at) }}</b>
                </div>
              </div>
            </template>
          </div>

          <footer class="om-sh-foot">
            <button type="button" class="om-btn-ghost" @click="sheet = null">
              {{ t("upMobile.close") }}
            </button>
            <button
              v-if="canEdit"
              type="button"
              class="om-btn-solid"
              :disabled="saving"
              @click="emit('save')"
            >
              {{ saving ? t("upMobile.saving") : t("upMobile.save") }}
            </button>
          </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    formData: { type: Object, required: true },
    docData: { type: Object, required: true },
    quickActions: { type: Array, default: () => [] },
    actionLoading: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
  });
  const emit = defineEmits(["update-field", "save", "quick-action"]);

  const { t } = useI18n();

  // v-model köprüsü: props.formData'yı child'dan doğrudan mutasyona uğratmamak
  // için (vue/no-mutating-props) yazmalar update-field emit'ine çevrilir; parent
  // formData'yı günceller, okumalar reaktif kalır.
  const fd = new Proxy(
    {},
    {
      get: (_, key) => props.formData[key],
      set: (_, key, value) => {
        emit("update-field", key, value);
        return true;
      },
      has: (_, key) => key in props.formData,
    }
  );

  const STATUSES = ["Ödeme Bekleniyor", "Onaylanıyor", "Kargoda", "Tamamlandı", "İptal Edildi"];
  const STATUS_TONES = {
    Tamamlandı: "success",
    "İptal Edildi": "error",
    Kargoda: "info",
    "Ödeme Bekleniyor": "warning",
    Onaylanıyor: "warning",
  };
  const SHEET_LABELS = {
    siparis: "Sipariş Bilgileri",
    kargo: "Kargo",
    odeme: "Ödeme",
    fatura: "Fatura",
    iade: "İade",
  };

  const sheet = ref(null);

  const statusTone = computed(
    () => STATUS_TONES[props.docData.status || props.formData.status] || "neutral"
  );

  const items = computed(() => props.docData.items || []);

  // İade satırı yalnızca refund_status doluysa görünür — boşsa gürültü olmasın.
  const sections = computed(() => {
    const rows = [
      { id: "siparis", icon: "clipboard-list", label: "Sipariş" },
      { id: "kargo", icon: "truck", label: "Kargo" },
      { id: "odeme", icon: "credit-card", label: "Ödeme" },
      { id: "fatura", icon: "file-text", label: "Fatura" },
    ];
    if (props.formData.refund_status || props.docData.refund_status) {
      rows.push({ id: "iade", icon: "rotate-ccw", label: "İade" });
    }
    return rows;
  });

  // ── Biçimleyiciler ────────────────────────────────────
  function fmtMoney(v) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v) || 0;
    const cur = props.docData.currency || "TRY";
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: cur }).format(n);
    } catch {
      return `${n.toLocaleString("tr-TR")} ${cur}`;
    }
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Dinamik href/src güvenliği: yalnızca https/http veya site-relative yol.
  function safeUrl(v) {
    const u = String(v || "");
    return /^(https?:\/\/|\/)/.test(u) && !u.startsWith("//") ? u : "";
  }

  const receiptHref = computed(() => safeUrl(props.formData.receipt_url));

  function itemVariant(item) {
    return [item.listing_variant, item.variation].filter(Boolean).join(" · ");
  }

  // ── Bölüm özetleri ────────────────────────────────────
  function sectionSummary(id) {
    const f = props.formData;
    if (id === "siparis") {
      return [f.status, f.payment_method].filter(Boolean).join(" · ") || "—";
    }
    if (id === "kargo") {
      if (f.carrier && f.tracking_number) return `${f.carrier} · ${f.tracking_number}`;
      return f.shipping_method || "—";
    }
    if (id === "odeme") {
      const parts = [];
      if (f.remittance_amount) parts.push(fmtMoney(f.remittance_amount));
      if (f.remittance_date) parts.push(fmtDate(f.remittance_date));
      if (f.receipt_url) parts.push("Dekont ✓");
      return parts.join(" · ") || "—";
    }
    if (id === "fatura") {
      return (
        [f.billing_type, f.billing_company_name || f.billing_tcn].filter(Boolean).join(" · ") || "—"
      );
    }
    if (id === "iade") {
      if (!f.refund_status) return "İade yok";
      return [f.refund_status, f.refund_amount ? fmtMoney(f.refund_amount) : null]
        .filter(Boolean)
        .join(" · ");
    }
    return "";
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "sass:color";

  .om {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .om-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .om-sec-title {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: $l-text-500;
    margin: 4px 2px 0;
    @include dark {
      color: $d-text-muted;
    }
  }

  /* Hızlı işlemler */
  .om-qa {
    display: flex;
    gap: 7px;
  }
  .om-qa-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 42px;
    font-size: 11.5px;
    font-weight: 700;
    font-family: inherit;
    border-radius: 10px;
    padding: 8px 6px;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-500;
    cursor: pointer;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
    &.disabled {
      opacity: 0.45;
      cursor: default;
    }
  }

  /* Durum + meta kartı */
  .om-head {
    padding: 12px 13px;
  }
  .om-head-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 9px;
    border-bottom: 1px solid $l-border-alt;
    @include dark {
      border-bottom-color: $d-border-inner;
    }
  }
  .om-status {
    font-size: 11px;
    font-weight: 800;
    border-radius: 999px;
    padding: 4px 11px;
    white-space: nowrap;
    &.is-success {
      background: rgba($c-success, 0.12);
      color: $c-success;
    }
    &.is-error {
      background: rgba($c-error, 0.12);
      color: $c-error;
    }
    &.is-info {
      background: rgba($c-info, 0.12);
      color: $c-info;
    }
    &.is-warning {
      background: rgba($c-warning, 0.14);
      color: color.adjust($c-warning, $lightness: -12%);
      @include dark {
        color: $c-warning;
      }
    }
    &.is-neutral {
      background: $l-bg-muted;
      color: $l-text-500;
      @include dark {
        background: $d-bg-elevated;
        color: $d-text-muted;
      }
    }
  }
  .om-date {
    font-size: 0.68rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: $l-text-400;
    flex-shrink: 0;
    @include dark {
      color: $d-text-faint;
    }
  }

  /* kv satırları */
  .om-kvs {
    padding: 3px 0 0;
  }
  .om-kvs-pad {
    padding: 3px 13px;
  }
  .om-kv {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid $l-border-alt;
    font-size: 12.5px;
    &:last-child {
      border-bottom: none;
    }
    @include dark {
      border-bottom-color: $d-border-inner;
    }
    > span {
      color: $l-text-500;
      flex-shrink: 0;
      @include dark {
        color: $d-text-muted;
      }
    }
    > b {
      font-weight: 600;
      text-align: right;
      min-width: 0;
      overflow-wrap: anywhere;
      font-variant-numeric: tabular-nums;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }
  .om-discount {
    color: $c-success;
    font-weight: 700;
  }

  /* Tutar kartı */
  .om-money {
    padding: 4px 14px 12px;
  }
  .om-total-sep {
    height: 1px;
    background: $l-border;
    margin: 2px 0 0;
    @include dark {
      background: $d-border;
    }
  }
  .om-total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding-top: 11px;
    > span {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    > b {
      font-size: 18px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  /* Ürün kalemleri */
  .om-items-head {
    display: flex;
    align-items: center;
    gap: 7px;
    .om-sec-title {
      margin: 4px 0 0 2px;
    }
  }
  .om-count {
    font-size: 10px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    border-radius: 999px;
    padding: 1px 7px;
    margin-top: 4px;
    background: rgba($brand, 0.14);
    color: color.adjust($brand, $lightness: -18%);
    @include dark {
      background: rgba($brand-light, 0.16);
      color: $brand-light;
    }
  }
  .om-empty {
    padding: 16px;
    text-align: center;
    font-size: 12px;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .om-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
  }
  .om-item-img {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
    max-width: 100%;
  }
  .om-item-ph {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $l-bg-muted;
    color: $l-text-400;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-faint;
    }
  }
  .om-item-main {
    flex: 1;
    min-width: 0;
    b {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 12.5px;
      font-weight: 700;
      line-height: 1.35;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }
  .om-item-var {
    display: block;
    font-size: 10.5px;
    color: $l-text-400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
    @include dark {
      color: $d-text-faint;
    }
  }
  .om-chip {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 800;
    border-radius: 999px;
    padding: 2px 8px;
    margin-top: 3px;
    background: rgba($c-info, 0.12);
    color: $c-info;
  }
  .om-item-price {
    flex-shrink: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
    > span {
      display: block;
      font-size: 10px;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
    > b {
      display: block;
      font-size: 13px;
      font-weight: 800;
      margin-top: 2px;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }

  /* Bölüm satırları */
  .om-secrow {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: start;
    font-family: inherit;
    cursor: pointer;
    padding: 12px;
    transition: border-color $t-fast;
    &:active {
      border-color: rgba($brand, 0.5);
    }
  }
  .om-secic {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba($brand, 0.16);
    color: color.adjust($brand, $lightness: -18%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    @include dark {
      background: rgba($brand-light, 0.16);
      color: $brand-light;
    }
  }
  .om-secmain {
    flex: 1;
    min-width: 0;
    b {
      display: block;
      font-size: 12.5px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      display: block;
      font-size: 10.5px;
      color: $l-text-400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .om-chev {
    color: $l-text-300;
    flex-shrink: 0;
    @include dark {
      color: $d-text-faint;
    }
  }

  /* Sheet */
  .om-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-end;
    z-index: 1000;
  }
  .om-sheet {
    width: 100%;
    max-height: 88vh;
    background: $l-bg;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    @include dark {
      background: $d-bg-card;
    }
  }
  .om-grab {
    width: 36px;
    height: 4px;
    border-radius: 99px;
    background: $l-border;
    margin: 8px auto 4px;
    flex-shrink: 0;
    @include dark {
      background: $d-border;
    }
  }
  .om-sh-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 16px 10px;
    border-bottom: 1px solid $l-border;
    flex-shrink: 0;
    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .om-sh-title {
    min-width: 0;
    b {
      display: block;
      font-size: 14.5px;
      font-weight: 800;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    span {
      font-size: 10.5px;
      color: $l-text-400;
      overflow-wrap: anywhere;
      @include dark {
        color: $d-text-faint;
      }
    }
  }
  .om-sh-x {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: $l-bg-muted;
    color: $l-text-500;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }
  .om-sh-body {
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .om-sh-foot {
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    padding: 10px 16px calc(14px + env(safe-area-inset-bottom));
    border-top: 1px solid $l-border;
    @include dark {
      border-top-color: $d-border;
    }
  }
  .om-btn-ghost {
    flex: 0 0 auto;
    border: 1px solid $l-border;
    background: transparent;
    border-radius: 10px;
    padding: 11px 18px;
    font-size: 12.5px;
    font-weight: 700;
    font-family: inherit;
    color: $l-text-700;
    cursor: pointer;
    &:only-child {
      flex: 1;
    }
    @include dark {
      border-color: $d-border;
      color: $d-text-hi;
    }
  }
  .om-btn-solid {
    flex: 1;
    background: $brand;
    border: none;
    border-radius: 10px;
    padding: 11px 16px;
    font-size: 12.5px;
    font-weight: 800;
    font-family: inherit;
    color: #fff;
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }

  /* Form parçaları */
  .om-f {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    > span {
      font-size: 10.5px;
      font-weight: 600;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
    input,
    select,
    textarea {
      width: 100%;
      background: $l-bg-subtle;
      border: 1px solid $l-border;
      border-radius: 9px;
      padding: 10px 11px;
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      color: $l-text-900;
      min-height: 40px;
      @include dark {
        background: $d-bg-elevated;
        border-color: $d-border;
        color: $d-text-hi;
      }
      &:disabled {
        opacity: 0.6;
      }
      &:focus {
        outline: none;
        border-color: $brand;
        box-shadow: 0 0 0 3px rgba($brand, 0.15);
      }
    }
    textarea {
      resize: vertical;
      font-weight: 500;
      line-height: 1.5;
    }
  }
  .om-mono {
    font-family: ui-monospace, monospace !important;
    font-size: 12px !important;
  }
  .om-italic {
    font-style: italic;
  }
  .om-frow {
    display: flex;
    gap: 9px;
    > .om-f {
      flex: 1;
    }
  }
  .om-none {
    font-size: 12.5px;
    color: $l-text-400;
    margin: 0;
    @include dark {
      color: $d-text-faint;
    }
  }
  .om-receipt {
    display: block;
    border: 1px solid $l-border;
    border-radius: 10px;
    overflow: hidden;
    @include dark {
      border-color: $d-border;
    }
    img {
      display: block;
      width: 100%;
      max-height: 160px;
      object-fit: cover;
    }
  }
  .om-checkval {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    &.ok {
      color: $c-success;
    }
  }

  /* Switch'ler */
  .om-switches {
    padding: 2px 13px;
  }
  .om-switchrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid $l-border-alt;
    cursor: pointer;
    &:last-child {
      border-bottom: none;
    }
    @include dark {
      border-bottom-color: $d-border-inner;
    }
  }
  .om-sl {
    min-width: 0;
    b {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
  }
  .om-sw {
    appearance: none;
    width: 36px;
    height: 21px;
    border-radius: 99px;
    background: $l-border;
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
    transition: background $t-fast;
    @include dark {
      background: $d-border;
    }
    &::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      transition: transform $t-fast;
    }
    &:checked {
      background: $brand;
      &::after {
        transform: translateX(15px);
      }
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  // Bottom sheet giriş/çıkış — Vue <Transition name="om-sheet">. Çıkışta artık ani
  // yok olmuyor; alttan kayarak kapanıyor ($ease-drawer). Çıkış girişten hızlı.
  .om-sheet-enter-active {
    transition: opacity $d-pop $ease-out;
  }
  .om-sheet-leave-active {
    transition: opacity $d-fast $ease-out;
  }
  .om-sheet-enter-active .om-sheet {
    transition: transform $d-sheet $ease-drawer;
  }
  .om-sheet-leave-active .om-sheet {
    transition: transform $d-modal $ease-drawer;
  }
  .om-sheet-enter-from,
  .om-sheet-leave-to {
    opacity: 0;
  }
  .om-sheet-enter-from .om-sheet,
  .om-sheet-leave-to .om-sheet {
    transform: translateY(100%);
  }
</style>
