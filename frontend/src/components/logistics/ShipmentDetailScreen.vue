<template>
  <div class="space-y-5">
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-3">
      <Skeleton variant="rect" height="88px" />
      <Skeleton variant="rect" height="320px" />
    </div>

    <template v-else-if="shipment">
      <!-- Özet başlık: operasyonun sekmeye girmeden görmesi gerekenler.
           Düzen DocTypeFormView başlığıyla aynı — geri oku + 15px başlık +
           gri alt satır; panel genelinde tek bir detay-sayfası dili var. -->
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
            :aria-label="t('logistics.shipment.listTitle')"
            @click="$emit('back')"
          >
            <AppIcon name="arrow-left" :size="14" />
          </button>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="font-mono text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
                {{ shipment.name }}
              </h1>
              <StatusBadge :status="shipment.status" />
              <span
                v-if="shipment.is_delayed"
                class="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300"
              >
                {{ t("logistics.shipment.delayed") }}
              </span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              {{ shipment.order }} · {{ shipment.carrier || t("logistics.shipment.noCarrier") }}
              <template v-if="shipment.tracking_number">
                · <code class="font-mono">{{ shipment.tracking_number }}</code>
              </template>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Paketleme ekranına giriş (13-FE, Ali). Sevkiyatı açan operatör
               kolileri oradan düzenliyor; tek kapı paketleme kuyruğu kalsaydı
               detaydan o akışa geçilemezdi. `can.pack` container'da hesaplanır:
               yetki + G1 rotasının kayıtlı olması (ölü buton yasağı). -->
          <button
            v-if="can.pack"
            type="button"
            class="hdr-btn-outlined"
            @click="$emit('open-packing')"
          >
            {{ t("logistics.packing.title") }}
          </button>
          <!-- `can.updateStatus` AYRI bir bayrak: yetki (`can.write`) VE hedef
               ekranın (C2) kayıtlı olması. İkisini `can.write`te birleştirmek,
               C2'nin durumunu tüm sekmelere sızdırırdı. -->
          <button
            v-if="can.updateStatus"
            type="button"
            class="hdr-btn-primary"
            @click="$emit('update-status')"
          >
            {{ t("logistics.shipment.updateStatus") }}
          </button>
          <!-- İptal YALNIZ Logistics Manager'da (TUR-103 AC-6) -->
          <button
            v-if="can.cancel"
            type="button"
            class="hdr-btn-danger"
            @click="$emit('cancel-shipment')"
          >
            {{ t("logistics.shipment.cancel") }}
          </button>
        </div>
      </header>

      <DetailTabs v-model="activeKey" :tabs="tabBar">
        <template #default>
          <div class="card">
            <!-- Verisi henüz gelmeyen sekme BOŞ LİSTE göstermiyor: "kayıt yok"
                 ile "veri gelmiyor" farklı şeyler. Boş liste, operasyona
                 sevkiyatın bacağı olmadığını söylerdi — oysa bilgi taşınmıyor.
                 Sebep sekmenin KENDİ kaydında (`blockedBy`) yazılı.

                 Kaydın teknik kimliği (`screenKey`) ve gerekçesi (`blockedBy`)
                 YALNIZ `title`da: destek/geliştirici üzerine gelince görüyor,
                 son kullanıcı "B6" ya da uç adıyla karşılaşmıyor. -->
            <div
              v-if="activeTab?.blocked"
              class="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-white/15"
              :title="blockedDetail"
            >
              <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                {{ t("logistics.tab.unavailable") }}
              </p>
              <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {{ t("logistics.tab.unavailableHint") }}
              </p>
            </div>

            <!-- `:is` kaynağı KULLANICI GİRDİSİ DEĞİL: bileşen, derleme anında
                 sabit olan kayıt defterinden geliyor (api-security.md §3'ün
                 "izin verilen map'ten seç" koşulu). -->
            <component
              :is="activeRender.component"
              v-else-if="activeRender"
              v-bind="activeRender.props"
            />
          </div>
        </template>
      </DetailTabs>
    </template>
  </div>
</template>

<script setup>
  import { computed, onErrorCaptured, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import DetailTabs from "./DetailTabs.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { TabRenderError, asyncTabComponent } from "./shipmentTabHost";

  /**
   * **B2 · Sevkiyat detayı kabuğu** (TUR-117 · 16-FE-0).
   *
   * Özet başlık, sekmeye girmeden görülmesi gerekenleri gösterir: durum,
   * gecikme, taşıyıcı, takip no. Aksiyonlar yetkiye göre; iptal yalnız
   * Logistics Manager'da (TUR-103 AC-6).
   *
   * SEKMELERİ ARTIK BU DOSYA BİLMİYOR. Eskiden altı sekme burada bir
   * `v-else-if` zinciriydi; sekme ekleyen herkes bu dosyayı açmak zorundaydı
   * ve iki geliştirici aynı bloğu düzenlerdi. Şimdi kabuk yalnız çözülmüş
   * sekme listesini alıyor (`views/logistics/shipmentTabRegistry.js` →
   * `resolveShipmentTabs`), sahipler kendi dizinlerinde çalışıyor.
   */
  const props = defineProps({
    shipment: { type: Object, default: null },
    documents: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: {
      type: Object,
      default: () => ({ read: true, write: false, cancel: false, updateStatus: false }),
    },
    /**
     * Kayıt defterinden çözülmüş sekmeler (`resolveShipmentTabs` çıktısı).
     *
     * Kabuk bunu ÜRETMİYOR, alıyor: container hangi bağlamı verdiğini
     * biliyor, Storybook ise gerçek kaydı verip tasarımı gerçek sekme
     * kümesiyle gösterebiliyor.
     */
    tabs: { type: Array, default: () => [] },
  });

  defineEmits(["retry", "update-status", "cancel-shipment", "back", "open-packing"]);

  const { t } = useI18n();

  const activeKey = ref(props.tabs[0]?.key ?? "");

  const activeTab = computed(() => props.tabs.find((tab) => tab.key === activeKey.value) ?? null);

  /** Engelli sekmenin teknik gerekçesi — yalnız `title` attribute'unda. */
  const blockedDetail = computed(() =>
    [activeTab.value?.screenKey, activeTab.value?.blockedBy].filter(Boolean).join(" · ")
  );

  /**
   * Sekme GÖVDESİNDE (setup/render) atılan hata.
   *
   * `activeRender`in try/catch'i yalnız `props(ctx)` çağrısını sarıyor;
   * sekme bileşeninin KENDİ render'ı/setup'ı patlarsa hata yukarı kaçar ve
   * Vue tüm kabuğu söker. `onErrorCaptured` o boşluğu kapatıyor: `false`
   * döndürüp hatayı burada durduruyor ve yalnız gövdeyi hata paneline
   * çeviriyoruz — "tek sekme çubuğu düşüremez" sözü böylece render'ı da
   * kapsıyor, yalnız `props()`'u değil.
   */
  const renderError = ref(null);

  onErrorCaptured((error) => {
    renderError.value = error;
    return false;
  });

  // Sekme değişince önceki hatayı taşıma — yeni sekme temiz başlasın.
  watch(activeKey, () => {
    renderError.value = null;
  });

  /**
   * Aktif sekmenin ÇİZİM PLANI: hangi bileşen, hangi prop'larla.
   *
   * `props` bir thunk olduğu için yalnız aktif sekme hesaplanıyor — on iki
   * sekmenin prop'unu her render'da kurmak gereksizdi.
   *
   * `try/catch` sözü tutuyor: kayıt defteri iki geliştiricinin ortak alanı
   * ve bir sekmenin `props(ctx)` fonksiyonu yanlış varsayım yapabilir
   * (backend beklenmedik bir şekil döndürdüğünde). Yakalanmasaydı hata
   * KABUĞU götürürdü — başlık, sekme çubuğu, diğer beş sekme dahil ekranın
   * tamamı boşalırdı. Şimdi yalnız o sekmenin gövdesi hata paneline dönüyor.
   *
   * Log burada DEĞİL: computed saf kalmalı (`workflow.md` kural 7). Çözüm
   * hataları `props.tabs` watcher'ında, render hataları `TabRenderError`
   * içinde raporlanıyor.
   */
  const activeRender = computed(() => {
    const tab = activeTab.value;
    if (!tab || tab.blocked) return null;
    if (renderError.value)
      return { component: TabRenderError, props: { error: renderError.value } };
    try {
      return { component: asyncTabComponent(tab.component), props: tab.props() };
    } catch (e) {
      return { component: TabRenderError, props: { error: e } };
    }
  });

  /** DetailTabs'in beklediği `[{ key, label, count?, alert? }]` biçimi. */
  const tabBar = computed(() =>
    props.tabs.map((tab) => ({
      key: tab.key,
      label: t(tab.labelKey),
      count: tab.count,
      alert: tab.alert,
    }))
  );

  /**
   * Aktif sekme listeden düşerse (rol değişti, kayıt güncellendi) ilk
   * sekmeye dön — aksi hâlde panel gövdesi sessizce boş kalırdı.
   *
   * Çözüm sırasında yakalanan sekme hataları da BURADA raporlanıyor.
   * `resolveShipmentTabs` bilerek loglamıyor: o bir `computed` içinden
   * çağrılıyor ve mutlak kural 7 computed'de yan etkiyi (log dahil)
   * yasaklıyor. Sessiz `undefined` "sayaç yok" gibi okunurdu; görünürlük
   * şart ama doğru katmanda.
   */
  watch(
    () => props.tabs,
    (list) => {
      for (const tab of list) {
        for (const issue of tab.issues ?? []) {
          console.error(`[shipmentTab:${issue.key}] ${issue.field}() hata verdi:`, issue.error);
        }
      }
      if (!list.some((tab) => tab.key === activeKey.value)) activeKey.value = list[0]?.key ?? "";
    },
    { immediate: true }
  );
</script>
