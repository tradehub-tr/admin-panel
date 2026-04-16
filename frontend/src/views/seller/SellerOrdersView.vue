<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Siparişlerim</h1>
        <p class="text-xs text-gray-400 mt-0.5">Siparişleri takip edin ve ödeme onaylayın</p>
      </div>
      <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadOrders">
        <AppIcon name="refresh-cw" :size="13" />
        Yenile
      </button>
    </div>

    <!-- Status Tabs -->
    <div class="flex gap-2 mb-5 flex-wrap">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-4 py-1.5 text-xs font-medium rounded-full border transition-colors"
        :class="activeTab === tab.id
          ? 'bg-violet-600 text-white border-violet-600'
          : 'bg-white text-gray-600 border-gray-300 dark:bg-[#1e1e2a] dark:text-gray-400 dark:border-[#2a2a35] hover:border-violet-400'"
        @click="activeTab = tab.id; loadOrders()"
      >
        {{ tab.label }}
        <span v-if="tab.id === 'unpaid' && unpaidCount > 0" class="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ unpaidCount }}</span>
        <span v-if="tab.id === 'refund' && refundCount > 0" class="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ refundCount }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="orders.length === 0" class="card text-center py-12">
      <AppIcon name="package" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">Bu durumda sipariş bulunamadı.</p>
    </div>

    <!-- Orders Table -->
    <div v-else class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Sipariş No</th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tarih</th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Alıcı</th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ürünler</th>
            <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">Tutar</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Durum</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr v-for="order in orders" :key="order.name" class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors">
            <!-- Order Number -->
            <td class="px-4 py-3">
              <span class="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">{{ order.order_number }}</span>
            </td>
            <!-- Date -->
            <td class="px-4 py-3 text-xs text-gray-500">
              {{ formatDate(order.order_date) }}
            </td>
            <!-- Buyer -->
            <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
              {{ order.buyer_name || order.buyer }}
            </td>
            <!-- Products -->
            <td class="px-4 py-3">
              <div class="space-y-0.5">
                <p v-for="item in order.items" :key="item.product_name" class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                  {{ item.product_name }} × {{ item.quantity }}
                </p>
              </div>
            </td>
            <!-- Total -->
            <td class="px-4 py-3 text-right">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ order.currency }} {{ Number(order.total || 0).toFixed(2) }}
              </span>
            </td>
            <!-- Status -->
            <td class="px-4 py-3 text-center">
              <!-- İade varsa iade statüsü göster -->
              <template v-if="order.refund_status">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="{
                    'bg-red-50 text-red-700 border border-red-200': order.refund_status === 'Pending',
                    'bg-emerald-50 text-emerald-700 border border-emerald-200': order.refund_status === 'Approved',
                    'bg-red-50 text-red-700 border border-red-200': order.refund_status === 'Rejected',
                  }"
                >
                  <AppIcon name="alert-circle" :size="10" />
                  {{ order.refund_status === 'Pending' ? 'İade Talebi' : order.refund_status === 'Approved' ? 'İade Onaylandı' : 'İade Reddedildi' }}
                </span>
                <p class="text-[10px] text-gray-400 mt-1">{{ order.status }}</p>
              </template>
              <!-- Normal statü -->
              <span
                v-else
                class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                :class="statusClass(order.status)"
              >
                {{ order.status }}
              </span>
            </td>
            <!-- Action -->
            <td class="px-4 py-3 text-center">
              <div class="flex flex-col items-center gap-1.5">
                <!-- Receipt link -->
                <a
                  v-if="order.receipt_url"
                  :href="order.receipt_url"
                  target="_blank"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                  title="Dekontu görüntüle"
                >
                  <AppIcon name="file-text" :size="11" />
                  Dekont
                </a>
                <!-- Confirm payment -->
                <button
                  v-if="order.status === 'Ödeme Bekleniyor'"
                  :disabled="confirmingOrder === order.name"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  @click="confirmPayment(order)"
                >
                  <AppIcon v-if="confirmingOrder === order.name" name="loader" :size="11" class="animate-spin" />
                  <AppIcon v-else name="check-circle" :size="11" />
                  Ödemeyi Onayla
                </button>
                <!-- Ship order -->
                <button
                  v-if="order.status === 'Onaylanıyor' && !order.refund_status"
                  :disabled="shippingOrder === order.name"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  @click="openShipModal(order)"
                >
                  <AppIcon v-if="shippingOrder === order.name" name="loader" :size="11" class="animate-spin" />
                  <AppIcon v-else name="truck" :size="11" />
                  Kargoya Ver
                </button>
                <!-- Refund detail button -->
                <button
                  v-if="order.refund_status"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  @click="openRefundDetail(order)"
                >
                  <AppIcon name="eye" :size="11" />
                  İade Detayı
                </button>
                <span v-if="!order.receipt_url && order.status !== 'Ödeme Bekleniyor' && !order.refund_status" class="text-xs text-gray-400">—</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>Toplam {{ total }} sipariş</span>
      <div class="flex items-center gap-2">
        <button :disabled="page <= 1" class="px-3 py-1 border rounded disabled:opacity-40" @click="prevPage">← Önceki</button>
        <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
        <button :disabled="page >= Math.ceil(total / pageSize)" class="px-3 py-1 border rounded disabled:opacity-40" @click="nextPage">Sonraki →</button>
      </div>
    </div>

    <!-- Ship Modal -->
    <div v-if="showShipModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showShipModal = false"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[420px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Kargoya Ver</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <strong>{{ pendingShipOrder?.order_number }}</strong> numaralı sipariş kargoya verilmiş olarak işaretlenecek.
        </p>
        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            Kargo Takip Numarası <span class="font-normal text-gray-400">(opsiyonel)</span>
          </label>
          <input
            v-model="trackingNumber"
            type="text"
            placeholder="örn. 1234567890"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2a35] rounded-lg bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <p class="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-5">
          Onayladığınızda sipariş "Kargoda" durumuna geçecek ve alıcı bilgilendirilecek.
        </p>
        <div class="flex gap-3 justify-end">
          <button class="hdr-btn-outlined" @click="showShipModal = false">İptal</button>
          <button :disabled="shippingOrder !== null" class="hdr-btn-primary bg-blue-600 hover:bg-blue-700" @click="doShipOrder">
            <AppIcon v-if="shippingOrder" name="loader" :size="13" class="animate-spin" />
            <AppIcon v-else name="truck" :size="13" />
            Kargoya Ver
          </button>
        </div>
      </div>
    </div>

    <!-- Refund Detail Modal -->
    <div v-if="showRefundModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showRefundModal = false"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl w-[480px] max-w-[calc(100vw-32px)] overflow-hidden">

        <!-- Modal top accent bar -->
        <div
class="h-1 w-full"
          :class="{
            'bg-red-500': refundDetailOrder?.refund_status === 'Pending',
            'bg-emerald-500': refundDetailOrder?.refund_status === 'Approved',
            'bg-red-500': refundDetailOrder?.refund_status === 'Rejected',
          }"
        ></div>

        <div class="p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-5">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">İade Talebi</h3>
              <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ refundDetailOrder?.order_number }}</p>
            </div>
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full"
              :class="{
                'bg-red-50 text-red-700 border border-red-200': refundDetailOrder?.refund_status === 'Pending',
                'bg-emerald-50 text-emerald-700 border border-emerald-200': refundDetailOrder?.refund_status === 'Approved',
                'bg-red-50 text-red-700 border border-red-200': refundDetailOrder?.refund_status === 'Rejected',
              }"
            >
              <AppIcon name="alert-circle" :size="10" />
              {{ refundDetailOrder?.refund_status === 'Pending' ? 'İnceleniyor' : refundDetailOrder?.refund_status === 'Approved' ? 'Onaylandı' : 'Reddedildi' }}
            </span>
          </div>

          <!-- Info rows -->
          <div class="rounded-lg border border-gray-100 dark:border-[#2a2a35] divide-y divide-gray-100 dark:divide-[#2a2a35] mb-4">
            <div class="flex justify-between items-center gap-4 px-4 py-2.5">
              <span class="text-xs text-gray-500">Alıcı</span>
              <span class="text-xs text-gray-800 dark:text-gray-200 font-medium">{{ refundDetailOrder?.buyer_name || refundDetailOrder?.buyer }}</span>
            </div>
            <div class="flex justify-between items-center gap-4 px-4 py-2.5">
              <span class="text-xs text-gray-500">Sipariş Tutarı</span>
              <span class="text-xs text-gray-800 dark:text-gray-200 font-semibold">{{ refundDetailOrder?.currency }} {{ Number(refundDetailOrder?.total || 0).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center gap-4 px-4 py-2.5">
              <span class="text-xs text-gray-500">İade Tutarı</span>
              <span class="text-xs font-bold text-red-600">{{ refundDetailOrder?.currency }} {{ Number(refundDetailOrder?.refund_amount || 0).toFixed(2) }}</span>
            </div>
            <div v-if="refundDetailOrder?.refund_requested_at" class="flex justify-between items-center gap-4 px-4 py-2.5">
              <span class="text-xs text-gray-500">Talep Tarihi</span>
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ formatDate(refundDetailOrder?.refund_requested_at) }}</span>
            </div>
          </div>

          <!-- Refund reason -->
          <div class="mb-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">İade Sebebi</p>
            <p class="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#16161f] border border-gray-100 dark:border-[#2a2a35] rounded-lg px-4 py-3 leading-relaxed min-h-[56px]">
              {{ refundDetailOrder?.refund_reason || 'Sebep belirtilmemiş.' }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2.5 justify-end">
            <button class="hdr-btn-outlined" @click="showRefundModal = false">Kapat</button>
            <template v-if="refundDetailOrder?.refund_status === 'Pending'">
              <button
class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                @click="handleRefund(refundDetailOrder, 'reject'); showRefundModal = false">
                <AppIcon name="x" :size="12" />
                Reddet
              </button>
              <button
class="hdr-btn-primary"
                @click="handleRefund(refundDetailOrder, 'approve'); showRefundModal = false">
                <AppIcon name="check" :size="12" />
                İadeyi Onayla
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showConfirmModal = false"></div>
      <div class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[400px] max-w-[calc(100vw-32px)]">
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Ödemeyi Onayla</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
          <strong>{{ pendingOrder?.order_number }}</strong> numaralı sipariş için ödeme onaylanacak.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Alıcı: <strong>{{ pendingOrder?.buyer_name }}</strong> —
          Tutar: <strong>{{ pendingOrder?.currency }} {{ Number(pendingOrder?.total || 0).toFixed(2) }}</strong>
        </p>
        <!-- Receipt preview in confirm modal -->
        <div v-if="pendingOrder?.receipt_url" class="mb-4 p-3 bg-gray-50 dark:bg-[#16161f] border border-gray-200 dark:border-[#2a2a35] rounded-lg">
          <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Alıcının yüklediği dekont:</p>
          <a
:href="pendingOrder.receipt_url" target="_blank"
            class="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline font-medium">
            <AppIcon name="external-link" :size="12" />
            Dekontu Görüntüle
          </a>
          <p v-if="pendingOrder.remittance_sender" class="text-xs text-gray-500 mt-1">
            Gönderen: <strong>{{ pendingOrder.remittance_sender }}</strong>
            <span v-if="pendingOrder.remittance_amount"> — Tutar: <strong>{{ pendingOrder.currency }} {{ Number(pendingOrder.remittance_amount).toFixed(2) }}</strong></span>
          </p>
        </div>
        <p class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
          Onayladığınızda sipariş "Onaylanıyor" durumuna geçecek ve ürünü hazırlayıp gönderebileceksiniz.
        </p>
        <div class="flex gap-3 justify-end">
          <button class="hdr-btn-outlined" @click="showConfirmModal = false">İptal</button>
          <button :disabled="confirmingOrder !== null" class="hdr-btn-primary" @click="doConfirmPayment">
            <AppIcon v-if="confirmingOrder" name="loader" :size="13" class="animate-spin" />
            Onayla
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import api from '@/utils/api'
import AppIcon from '@/components/common/AppIcon.vue'

const toast = useToast()

const orders = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const activeTab = ref('all')
const confirmingOrder = ref(null)
const showConfirmModal = ref(false)
const pendingOrder = ref(null)
const showShipModal = ref(false)
const pendingShipOrder = ref(null)
const trackingNumber = ref('')
const shippingOrder = ref(null)
const showRefundModal = ref(false)
const refundDetailOrder = ref(null)

const tabs = [
  { id: 'all', label: 'Tümü' },
  { id: 'unpaid', label: 'Ödeme Bekliyor' },
  { id: 'confirming', label: 'Onaylanıyor' },
  { id: 'delivering', label: 'Kargoda' },
  { id: 'completed', label: 'Tamamlandı' },
  { id: 'refund', label: 'İade Talepleri' },
]

const unpaidCount = ref(0)
const refundCount = ref(0)

async function fetchBadgeCounts() {
  try {
    const [unpaidRes, refundRes] = await Promise.all([
      api.callMethod('tradehub_core.api.order.get_seller_orders', { status: 'unpaid', page: 1, page_size: 1 }),
      api.callMethod('tradehub_core.api.order.get_seller_orders', { status: 'refund_pending', page: 1, page_size: 1 }),
    ])
    unpaidCount.value = unpaidRes.message?.total || 0
    refundCount.value = refundRes.message?.total || 0
  } catch { /* sessizce geç */ }
}

async function loadOrders() {
  loading.value = true
  try {
    const apiStatus = activeTab.value === 'refund' ? 'refund_pending' : activeTab.value
    const res = await api.callMethod('tradehub_core.api.order.get_seller_orders', {
      status: apiStatus,
      page: page.value,
      page_size: pageSize,
    })
    orders.value = res.message?.orders || []
    total.value = res.message?.total || 0
    fetchBadgeCounts()
  } catch (err) {
    toast.error(err.message || 'Siparişler yüklenemedi')
  } finally {
    loading.value = false
  }
}

function confirmPayment(order) {
  pendingOrder.value = order
  showConfirmModal.value = true
}

async function doConfirmPayment() {
  if (!pendingOrder.value) return
  confirmingOrder.value = pendingOrder.value.name
  try {
    await api.callMethod('tradehub_core.api.order.seller_confirm_payment', {
      order_number: pendingOrder.value.name,
    })
    toast.success('Ödeme onaylandı! Sipariş "Onaylanıyor" durumuna geçti.')
    showConfirmModal.value = false
    pendingOrder.value = null
    await loadOrders()
  } catch (err) {
    toast.error(err.message || 'Onaylama başarısız')
  } finally {
    confirmingOrder.value = null
  }
}

function statusClass(status) {
  const map = {
    'Ödeme Bekleniyor': 'bg-amber-50 text-amber-700 border border-amber-200',
    'Onaylanıyor': 'bg-blue-50 text-blue-700 border border-blue-200',
    'Kargoda': 'bg-green-50 text-green-700 border border-green-200',
    'Tamamlandı': 'bg-gray-100 text-gray-600 border border-gray-200',
    'İptal Edildi': 'bg-red-50 text-red-600 border border-red-200',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function openRefundDetail(order) {
  refundDetailOrder.value = order
  showRefundModal.value = true
}

function openShipModal(order) {
  pendingShipOrder.value = order
  trackingNumber.value = ''
  showShipModal.value = true
}

async function doShipOrder() {
  if (!pendingShipOrder.value) return
  shippingOrder.value = pendingShipOrder.value.name
  try {
    await api.callMethod('tradehub_core.api.order.seller_ship_order', {
      order_number: pendingShipOrder.value.name,
      tracking_number: trackingNumber.value.trim(),
    }, true)
    toast.success('Sipariş kargoya verildi!')
    showShipModal.value = false
    pendingShipOrder.value = null
    await loadOrders()
  } catch (err) {
    toast.error(err.message || 'İşlem başarısız')
  } finally {
    shippingOrder.value = null
  }
}

async function handleRefund(order, action) {
  try {
    await api.callMethod('tradehub_core.api.order.seller_handle_refund', {
      order_number: order.name,
      action,
    }, true)
    const label = action === 'approve' ? 'onaylandı' : 'reddedildi'
    toast.success(`İade talebi ${label}.`)
    await loadOrders()
  } catch (err) {
    toast.error(err.message || 'İşlem başarısız')
  }
}

function prevPage() {
  if (page.value > 1) { page.value--; loadOrders() }
}

function nextPage() {
  if (page.value < Math.ceil(total.value / pageSize)) { page.value++; loadOrders() }
}

onMounted(() => { loadOrders() })
</script>
