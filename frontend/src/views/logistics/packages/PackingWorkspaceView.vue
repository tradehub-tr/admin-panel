<template>
  <div class="space-y-4">
    <p v-if="store.isLocked" class="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:text-slate-400 dark:border-slate-600">
      {{ t("logistics.packing.lockedBand", { status: statusLabel }) }}
    </p>
    <p v-else-if="!can.write" class="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:text-slate-400 dark:border-slate-600">
      {{ t("logistics.packing.readOnlyBand") }}
    </p>

    <!-- <header> DEĞİL <div>: koyu temada base.scss'teki global
         `header { background-color: $d-bg-card !important }` her <header>'ı
         kart rengine boyuyor ve sayfa arka planıyla arasında gri bir çizgi
         gibi okunan bir bant bırakıyor. Bu blok `<main>` içinde olduğu için
         zaten `banner` landmark'ı üretmiyordu — semantik kayıp yok. -->
    <div class="flex flex-wrap items-start gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-lg font-semibold">{{ t("logistics.packing.title") }}</h1>
          <StatusBadge v-if="store.shipment" :status="store.shipment.status" />
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          <code class="font-mono">{{ shipmentName }}</code>
          <template v-if="store.shipment"> · {{ store.shipment.buyer_name }}</template>
        </p>
      </div>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="goQueue">
          {{ t("logistics.packing.backToQueue") }}
        </button>
        <button type="button" class="th-btn-outline text-sm" @click="goPallets">
          {{ t("logistics.pallet.title") }}
        </button>
        <button type="button" class="th-btn-outline text-sm" @click="goLabels">
          {{ t("logistics.packing.goLabels") }}
        </button>
        <!-- "Koli ekle" burada DEĞİL: aynı iş koliler sütununun başında
             duruyor ve koli oraya ekleniyor. Başlıktaki ikinci kopya, tıklayan
             kişiye kolinin nereye gittiğini göstermiyordu. -->
      </div>
    </div>

    <!-- YÜKLEME hatası tüm ekranı kaplar: gösterilecek veri yok.
         KAYDETME hatası kaplamaz — kullanıcının girdiği koli taslağı ekranda
         durmalı. CONFLICT'te "taslağın korunuyor" demek, onu göstermek
         demektir; hata ekranına düşmek taslağı kaybolmuş gösteriyordu. -->
    <ErrorState v-if="store.error && !store.shipment" :error="store.error" @retry="reload" />

    <div v-else-if="store.loading && !store.shipment" class="space-y-2" aria-busy="true">
      <Skeleton variant="row" :count="7" />
    </div>

    <!-- İşlem hatası taslağın ÜSTÜNDE bant olarak; ekran değişmiyor. -->
    <div
      v-if="store.shipment && store.error"
      class="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
      role="alert"
    >
      <span aria-hidden="true">⛔</span>
      <div class="grow">
        <b>{{ store.error.message }}</b>
        <span class="ms-2 font-mono text-[11px] opacity-70">{{ store.error.code }}</span>
        <p v-if="store.error.code === 'CONFLICT'" class="mt-0.5 text-xs opacity-85">
          {{ t("logistics.packing.conflictHint") }}
        </p>
      </div>
      <button type="button" class="th-btn-outline text-xs" @click="reload">
        {{ t("logistics.packing.reloadShipment") }}
      </button>
    </div>

    <!-- A2 · üç bölge: kalemler | koliler | özet+doğrulama
         Kırılma 1280 DEĞİL 1440: 1280px'de üç sütun 340px'lik özet paneliyle
         birlikte kalem adlarını iki satıra kırıyor ve koli kartındaki ölçü
         satırı sarıyordu. 1280-1440 arasında kalemler ve koliler yan yana
         kalıyor, özet tam genişlikte alta düşüyor. -->
    <div
      v-if="store.shipment"
      class="grid gap-4 xl:grid-cols-2 min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]"
    >
      <div class="space-y-3">
        <ScanInput
          v-if="scanEnabled"
          :active-label="store.activePackage ? packageRows[store.activeIndex]?.sequence_label : ''"
          :feedback="store.lastScan"
          :disabled="!canWrite"
          @scan="onScan"
          @new-package="store.addPackage()"
          @next-package="nextPackage"
        />
        <!-- Hiç barkod yoksa kutu ÇİZİLMİYOR: boş bir tarama alanı "okutma
             bozuk" izlenimi verir, oysa veri eksik (sözleşme §4.3). -->
        <p
          v-else
          class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        >
          <span aria-hidden="true">⌨</span>
          <span>{{ t("logistics.packing.noScannableItems") }}</span>
        </p>

        <ItemPickList
          :rows="store.itemRows"
          :can-write="canWrite"
          :has-packages="Boolean(store.packages.length)"
          @assign="onAssign"
          @assign-new="onAssignNew"
        />
      </div>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            {{ t("logistics.packing.packages") }}
          </h2>
          <button v-if="canWrite" type="button" class="th-btn-outline text-xs" @click="store.addPackage()">
            {{ t("logistics.packing.newPackage") }}
          </button>
        </div>

        <!-- Boş durumda ÜÇÜNCÜ bir buton yok: hemen üstünde "Yeni koli"
             duruyor ve ikisi arası 40 piksel. İşaret metni yeterli. -->
        <p
          v-if="!packageRows.length"
          class="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:text-slate-400 dark:border-slate-600"
        >
          {{ t("logistics.package.empty") }}
          <span v-if="canWrite" class="mt-1 block text-xs text-slate-600 dark:text-slate-400">
            {{ t("logistics.packing.createFirstHint") }}
          </span>
        </p>

        <template v-for="(pkg, index) in packageRows" :key="pkg.package_code ?? `draft-${index}`">
          <PackageCard
            :pkg="pkg"
            :items="store.items"
            :findings="findingsFor(pkg, index)"
            :is-active="index === store.activeIndex"
            :can-write="canWrite"
            :package-types="store.packageTypes"
            @activate="store.setActive(index)"
            @edit="toggleEditor(index)"
            @duplicate="store.duplicatePackage(index)"
            @remove="confirmRemove(index)"
            @unassign="store.unassignItem($event, index)"
          />
          <PackageEditorDrawer
            v-if="editorIndex === index"
            :pkg="pkg"
            :package-types="store.packageTypes"
            :divisor="store.divisor"
            @update="store.updatePackage(index, $event)"
            @close="editorIndex = null"
          />
        </template>
      </section>

      <PackingSummaryPanel
        class="xl:col-span-2 min-[1440px]:col-span-1"
        :totals="store.totals"
        :validation="store.validation"
        :can-write="canWrite"
        :saving="store.saving"
        :dirty="store.isDirty"
        @save="save"
        @complete="complete"
      />
    </div>

    <ConfirmDialog
      v-model:open="removeDialog"
      :title="t('logistics.packing.removePackage')"
      :message="t('logistics.packing.removeConfirm')"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";

  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import StatusBadge from "@/components/logistics/StatusBadge.vue";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePackagingStore } from "@/stores/packaging";
  import { hasScannableItems } from "@/utils/scanMatcher";
  import ItemPickList from "./components/ItemPickList.vue";
  import PackageCard from "./components/PackageCard.vue";
  import PackageEditorDrawer from "./components/PackageEditorDrawer.vue";
  import PackingSummaryPanel from "./components/PackingSummaryPanel.vue";
  import ScanInput from "./components/ScanInput.vue";

  /**
   * **P2 · Paketleme çalışma alanı** — A2 düzeni (üç bölge), B1+B3 birleşik
   * atama.
   *
   * OTOMATİK KAYDETME YOK: depoda ağ kopuyor ve yarım koli kaydı kirli veri
   * üretir. Değişiklikler taslakta birikiyor, "Kaydet" açık bir eylem.
   * Kaydedilmemiş değişiklikle çıkışta uyarı veriliyor.
   */
  const store = usePackagingStore();
  const logisticsStore = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const editorIndex = ref(null);
  const removeDialog = ref(false);
  const pendingRemove = ref(null);

  const shipmentName = computed(() => route.params.name);
  const packageRows = computed(() => store.packageRows);
  const scanEnabled = computed(() => hasScannableItems({ items: store.items }));

  const can = computed(() => logisticsStore.can);
  /** Terminal durumda sunucu da reddediyor — buton çizmemek doğru davranış. */
  const canWrite = computed(() => can.value.write && !store.isLocked);

  const statusLabel = computed(() =>
    store.shipment ? t(`logistics.status.${store.shipment.status}`) : ""
  );

  /** Doğrulama motoru tek otorite; kart kendi kuralını uydurmuyor. */
  function findingsFor(pkg, index) {
    const code = pkg.package_code || `#${index + 1}`;
    return store.validation.findings.filter((f) => f.package_code === code);
  }

  function onScan(code, qty = 1) {
    const outcome = store.scan(code, qty);
    // Okutma yeni bir koliyi aktif ettiyse açık editörü kapat — başka kolinin
    // formunu düzenliyormuş gibi görünmesin.
    if (outcome.result === "activated") editorIndex.value = null;
  }

  function onAssign({ rowId, qty }) {
    store.assignItem(rowId, qty);
  }

  /** Tab — aktif koliyi ilerletir, sondan başa döner. */
  function nextPackage() {
    if (!store.packages.length) return;
    store.setActive((store.activeIndex + 1) % store.packages.length);
    editorIndex.value = null;
  }

  /** "Yeni koliye" — önce koli açılıyor, sonra atama oraya gidiyor. */
  function onAssignNew({ rowId, qty }) {
    store.addPackage();
    store.assignItem(rowId, qty, store.packages.length - 1);
  }

  function toggleEditor(index) {
    editorIndex.value = editorIndex.value === index ? null : index;
    store.setActive(index);
  }

  function confirmRemove(index) {
    pendingRemove.value = index;
    removeDialog.value = true;
  }

  function doRemove() {
    if (pendingRemove.value === null) return;
    store.removePackage(pendingRemove.value);
    if (editorIndex.value === pendingRemove.value) editorIndex.value = null;
    pendingRemove.value = null;
  }

  async function save() {
    try {
      await store.savePackages();
    } catch {
      // Hata store'da `{code, message}` olarak duruyor; ErrorState gösteriyor.
      // CONFLICT'te taslak korunuyor — kullanıcının girdiği ölçüler silinmesin.
    }
  }

  /**
   * Tamamla → kaydet + `complete_packing`. Başarılıysa etiket adımına geçer:
   * paketlemenin bittiği yer, etiketin başladığı yerdir.
   */
  async function complete() {
    try {
      await store.completeAndSave();
      goLabels();
    } catch {
      // Hata store'da; ErrorState gösteriyor. Sayfada kal ki kullanıcı
      // engeli görüp düzeltebilsin.
    }
  }

  function reload() {
    store.fetchPacking(shipmentName.value);
  }

  function goQueue() {
    router.push({ name: "LogisticsPackingQueue" });
  }

  function goLabels() {
    router.push({ name: "LogisticsLabels", params: { name: shipmentName.value } });
  }

  /**
   * Palet planı parametreli bir rota, yani menüde görünmüyor — giriş kapısı
   * burası. Buton olmadan ekran yalnız URL'yi elle yazana açık kalırdı.
   */
  function goPallets() {
    router.push({ name: "LogisticsPalletPlan", params: { name: shipmentName.value } });
  }

  /** Sekme kapatma / yenileme — tarayıcının kendi uyarısı. */
  function beforeUnload(event) {
    if (!store.isDirty) return;
    event.preventDefault();
    event.returnValue = "";
  }

  onMounted(async () => {
    await logisticsStore.fetchPermissions();
    reload();
    window.addEventListener("beforeunload", beforeUnload);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", beforeUnload);
    store.reset();
  });

  onBeforeRouteLeave(() => {
    if (!store.isDirty) return true;
    // Kaydedilmemiş koli taslağını sessizce atmak operatörün girdiği
    // ölçüleri çöpe atar; onay şart.
    return window.confirm(t("logistics.packing.leaveConfirm"));
  });

  watch(shipmentName, reload);
</script>
