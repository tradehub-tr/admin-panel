<template>
  <ReturnQueueScreen
    :rows="store.rows"
    :status-counts="store.statusCounts"
    :loading="store.loading"
    :error="store.error"
    :can="can"
    :now="now"
    @open="goDetail"
    @decide="goDecide"
    @filter-status="onFilter"
    @retry="load"
  />
</template>

<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";

  import ReturnQueueScreen from "@/components/logistics/ReturnQueueScreen.vue";
  import { useLogisticsStore } from "@/stores/logistics";
  import { useReturnsStore } from "@/stores/returns";

  /**
   * **I1 container** — iade kuyruğu; satıcının ve platformun giriş kapısı.
   *
   * Satır tıklanınca hangi ekrana gidileceği KAYDIN DURUMUNA bağlı: karar
   * bekleyen talep karar ekranına, kontrol bekleyen depo ekranına, kalanı
   * kapanış özetine. Sabit bir "detay" ekranı olsaydı operatör her seferinde
   * oradan ikinci bir tıkla doğru ekrana gitmek zorunda kalırdı
   * (kök CLAUDE.md §4.14a — ana iş için ara sayfa yok).
   */
  const router = useRouter();
  const store = useReturnsStore();
  const logistics = useLogisticsStore();

  /**
   * Bekleme süresi rozetinin referansı. Ekranda hesaplanıyor (sözleşme §4.2);
   * sunucu süre göndermiyor. Mount anında sabitleniyor ki liste her
   * render'da milisaniye oynamasın.
   */
  const now = ref("");

  const can = computed(() => ({
    read: true,
    write: logistics.can.returnDecide,
  }));

  const load = () => store.fetchList();

  function onFilter(status) {
    store.fetchList({ status });
  }

  /** Kaydın durumu hangi ekranın sırası olduğunu söylüyor. */
  function goDetail(row) {
    if (Number(row.is_closed) === 1) return goClosure(row);
    if (!row.decided_at) return goDecide(row);
    return goInspection(row);
  }

  const goDecide = (row) =>
    router.push({ name: "LogisticsReturnDecision", params: { name: row.name } });
  const goInspection = (row) =>
    router.push({ name: "LogisticsReturnInspection", params: { name: row.name } });
  const goClosure = (row) =>
    router.push({ name: "LogisticsReturnClosure", params: { name: row.name } });

  onMounted(() => {
    now.value = new Date().toISOString().slice(0, 19).replace("T", " ");
    load();
  });
</script>
