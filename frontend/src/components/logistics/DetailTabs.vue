<template>
  <div class="space-y-5">
    <!-- Sekme çubuğu kendi kartında (DocTypeFormView deseni): kart gövdesini
         sekme sahibi sarıyor, çubuk yalnız kabuk. -->
    <div class="card !p-0 overflow-hidden">
      <!-- ARIA tabs deseni: roving tabindex (seçili 0, diğerleri -1),
           ←/→ + Home/End klavye gezinmesi, tab ↔ panel bağı id'lerle. -->
      <!-- `role="tablist"` ERİŞİLEBİLİR AD ister (WCAG 4.1.2): adsız bir
           sekme grubu okuyucuda yalnız "sekme listesi" diye anons ediliyordu.
           Ad çağırandan geliyor — AppSelect/LinkInput ile aynı sözleşme:
           görünür bir başlık varsa `ariaLabelledby`, yoksa `ariaLabel`. -->
      <nav
        class="flex border-b border-gray-100 dark:border-white/10 overflow-x-auto"
        role="tablist"
        :aria-label="ariaLabel || undefined"
        :aria-labelledby="ariaLabelledby || undefined"
        @keydown="onTablistKeydown"
      >
        <button
          v-for="(tab, index) in tabs"
          :id="tabId(tab.key)"
          :key="tab.key"
          :ref="(el) => setTabRef(el, index)"
          type="button"
          role="tab"
          :aria-selected="tab.key === modelValue"
          :aria-controls="panelId"
          :tabindex="tab.key === modelValue ? 0 : -1"
          :class="[
            'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[13px] font-medium transition-all',
            tab.key === modelValue
              ? 'border-brand-500 text-brand-800 bg-brand-50/50 dark:text-brand-500 dark:bg-brand-500/5'
              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
          ]"
          @click="$emit('update:modelValue', tab.key)"
        >
          {{ tab.label }}
          <span
            v-if="tab.count !== undefined && tab.count !== null"
            class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-white/10 dark:text-gray-300"
          >
            {{ tab.count }}
          </span>
          <!-- Dikkat noktası yalnız renk+title değil: sr-only metin de var
               (WCAG 1.4.1 / 1.1.1). -->
          <span
            v-if="tab.alert"
            class="h-1.5 w-1.5 rounded-full bg-red-500"
            :title="t('logistics.tab.needsAttention')"
          />
          <span v-if="tab.alert" class="sr-only">{{ t("logistics.tab.needsAttention") }}</span>
        </button>
      </nav>
    </div>

    <!-- tabindex=0: panel içinde ilk odaklanabilir öğe yoksa klavye kullanıcı
         içeriğe yine de inebilsin (ARIA APG tabs deseni). -->
    <div
      :id="panelId"
      role="tabpanel"
      tabindex="0"
      :aria-labelledby="activeTab ? tabId(activeTab.key) : undefined"
    >
      <slot :active="modelValue" />
    </div>
  </div>
</template>

<script setup>
  import { computed, nextTick, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Sevkiyat detayının sekme kabuğu (TUR-117).
   *
   * Sekme başına sayaç ve dikkat noktası gösterir — operasyon hangi sekmede
   * iş olduğunu açmadan görmeli. Hover'da yalnız renk değişiyor, kenarlık
   * kalınlığı sabit: kök CLAUDE.md §4.5 layout shift yasağı.
   *
   * Klavye: ok tuşları "seçerek gezer" (otomatik aktivasyon) — sekme
   * gövdeleri hafif/lazy olduğundan APG'nin önerdiği bu varyant yeterli.
   * Tek panel var; tüm sekmeler aynı `panelId`i kontrol eder (içerik slot).
   *
   * `tabs`: [{ key, label, count?, alert? }]
   */
  const props = defineProps({
    tabs: { type: Array, required: true },
    modelValue: { type: String, required: true },
    /** Sekme grubunun erişilebilir adı — görünür başlık yoksa. */
    ariaLabel: { type: String, default: "" },
    /** Görünür başlığın id'si — varsa aria-label yerine BU kullanılmalı. */
    ariaLabelledby: { type: String, default: "" },
  });
  const emit = defineEmits(["update:modelValue"]);

  const { t } = useI18n();

  const uid = useId();
  const panelId = `${uid}-panel`;
  const tabId = (key) => `${uid}-tab-${key}`;

  const activeTab = computed(() => props.tabs.find((tab) => tab.key === props.modelValue) ?? null);
  const activeIndex = computed(() => props.tabs.findIndex((tab) => tab.key === props.modelValue));

  // Fonksiyon ref: v-for içindeki dizi ref'lerinin sırası garanti değil,
  // index'le yerine yazmak sırayı sabitler.
  const tabRefs = [];
  function setTabRef(el, index) {
    tabRefs[index] = el;
  }

  // Liste KÜÇÜLÜNCE eski indeksler dizide kalıyordu: `tabRefs[next]` DOM'dan
  // kalkmış düğüme işaret edip odak taşıma sessizce başarısız oluyordu
  // (dinamik sekme listesi — WCAG 2.4.3). Fazlalık her değişimde budanır.
  watch(
    () => props.tabs.length,
    (count) => {
      tabRefs.length = count;
    }
  );

  function activate(index) {
    const count = props.tabs.length;
    if (!count) return;
    const next = (index + count) % count;
    emit("update:modelValue", props.tabs[next].key);
    nextTick(() => tabRefs[next]?.focus());
  }

  function onTablistKeydown(e) {
    const current = activeIndex.value;
    if (current < 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      activate(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      activate(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      activate(0);
    } else if (e.key === "End") {
      e.preventDefault();
      activate(props.tabs.length - 1);
    }
  }
</script>
