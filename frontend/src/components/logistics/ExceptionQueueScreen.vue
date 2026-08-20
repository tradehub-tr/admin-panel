<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("logistics.exception.title") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.exception.subtitle") }}
        </p>
      </div>
      <!-- TABLO MODU YOK — bilinçli. Aşağıdaki yorumda yazıldığı gibi her
           satırın açıklaması, çözüm notu ve aksiyonu var; tabloya sığdırmak
           en gerekli bilgiyi keserdi. Mobilde düğmeler çizilmiyor. -->
      <ViewModeToggle v-model="viewMode" :modes="['grid', 'kanban', 'list']" class="ms-auto hidden lg:flex" />
    </div>

    <!-- Önem derecesi filtresi. "Critical" öne alınıyor: bu ekrana bakan
         kişi önce onu görmeli. Seçili değerin TEK KAYNAĞI container (URL) —
         iç state'te tutulsaydı paylaşılan link filtreli veri getirir ama
         yanlış hap vurgulu kalırdı (B1'deki aynı ders). -->
    <!-- Panoda gizli: pano üç önem derecesini birden sütun olarak gösteriyor. -->
    <StatusFilterPills
      v-if="!isKanban"
      :model-value="severity"
      :options="severityOptions"
      @change="$emit('filter-severity', $event)"
    />

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 6" :key="i" variant="rect" height="60px" />
    </div>

    <div
      v-else-if="!rows.length"
      class="rounded-lg border border-emerald-200 bg-emerald-50 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20"
    >
      <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
        {{ t("logistics.exception.allClear") }}
      </p>
    </div>

    <!-- Kart listesi, tablo değil: her satırın çözüm notu ve aksiyonu var;
         tabloya sığdırmak açıklamayı kesip en gerekli bilgiyi gizlerdi. -->
    <!-- ══ PANO ══ Üç önem derecesi yan yana: hangi ağırlıkta iş biriktiği
         tek bakışta görünür. Süzgeç tek dereceyi gösterir, pano üçünü de. -->
    <template v-else-if="isKanban">
      <p
        class="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-400"
      >
        {{ t("logistics.exception.kanbanReadonly") }}
      </p>
      <div class="list-kanban">
        <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
          <div class="kanban-col-header">
            <span>{{ col.label }}</span>
            <span class="kanban-col-count">{{ col.rows.length }}</span>
          </div>
          <div class="kanban-col-body">
            <!-- Kart SÜRÜKLENMİYOR: önem derecesi istisnanın kendi verisi,
                 taşımak onu değiştirmez; kart bir sonraki yüklemede eski
                 sütununa dönerdi. Tıklama sevkiyata gider. -->
            <button
              v-for="row in col.rows"
              :key="row.name"
              type="button"
              class="kanban-card w-full text-start"
              @click="$emit('open-shipment', row.shipment)"
            >
              <span class="kanban-card-title block">{{ row.exception_label || row.exception_code }}</span>
              <span class="block truncate font-mono text-[11px]">{{ row.shipment }}</span>
              <span class="kanban-card-meta mt-1 block truncate">{{ formatTime(row.occurred_at) }}</span>
              <span v-if="row.resolved_at" class="mt-1 block text-[11px] text-emerald-700 dark:text-emerald-300">
                {{ t("logistics.exception.resolvedShort") }}
              </span>
            </button>
            <p
              v-if="!col.rows.length"
              class="px-2 py-6 text-center text-[11px] italic text-gray-600 dark:text-gray-400"
            >
              {{ t("logistics.exception.kanbanEmptyColumn") }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ LİSTE ══ Dar ekranda zorunlu kompakt görünüm. -->
    <ul v-else-if="viewMode === 'list'" class="card !p-0 overflow-hidden">
      <li
        v-for="row in orderedRows"
        :key="row.name"
        class="flex items-start justify-between gap-3 border-b border-gray-100 p-3 last:border-b-0 dark:border-white/10"
      >
        <div class="min-w-0">
          <span class="block truncate text-[13px] font-medium">
            {{ row.exception_label || row.exception_code }}
          </span>
          <span class="block font-mono text-[11px] text-gray-600 dark:text-gray-400">{{ row.shipment }}</span>
        </div>
        <StatusBadge :status="row.severity" kind="severity" :label="severityLabel(row.severity)" />
      </li>
    </ul>

    <!-- ══ KART ══ Varsayılan: açıklama, çözüm notu ve aksiyon bir arada. -->
    <ul v-else class="space-y-2">
      <li
        v-for="row in orderedRows"
        :key="row.name"
        class="rounded-lg border p-3"
        :class="rowClass(row)"
      >
        <div class="flex flex-wrap items-start gap-3">
          <StatusBadge
            :status="row.severity"
            kind="severity"
            :label="severityLabel(row.severity)"
          />

          <div class="min-w-0 grow">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ row.exception_label || row.exception_code }}
              <code v-if="row.exception_label" class="ms-1 font-mono text-xs text-gray-600">
                {{ row.exception_code }}
              </code>
            </p>
            <p v-if="row.description" class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
              {{ row.description }}
            </p>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
              <button
                type="button"
                class="font-mono underline-offset-2 hover:underline"
                @click="$emit('open-shipment', row.shipment)"
              >
                {{ row.shipment }}
              </button>
              <span v-if="row.carrier">{{ row.carrier }}</span>
              <span>{{ formatTime(row.occurred_at) }}</span>
            </div>

            <!-- Çözülmüş istisna listeden KAYBOLMUYOR: aynı sevkiyatta
                 tekrarlıyor mu, ancak geçmiş görünürse anlaşılır. -->
            <p
              v-if="row.resolved_at"
              class="mt-1.5 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              {{ t("logistics.exception.resolvedBy", { user: row.resolved_by || "—" }) }} ·
              {{ formatTime(row.resolved_at) }}
              <template v-if="row.resolution_note"> — {{ row.resolution_note }}</template>
            </p>
          </div>

          <button
            v-if="can.write && !row.resolved_at"
            type="button"
            class="hdr-btn-outlined shrink-0 text-xs"
            @click="$emit('resolve', row)"
          >
            {{ t("logistics.exception.resolve") }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useResponsiveViewMode } from "@/composables/useResponsiveViewMode.js";

  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { SEVERITY_TONE } from "./constants";

  /**
   * **A3 · İstisna kuyruğu** (TUR-113, TUR-118).
   *
   * TUR-113 kabul kriteri: *"İstisna kaydı çözüm notu olmadan kapatılamaz."*
   * Bu ekran çözümü BAŞLATIR (`resolve` event'i); notu toplayan diyalog
   * container'ın işi — sunum katmanı zorunluluğu tek başına garanti edemez,
   * asıl doğrulama backend'de.
   *
   * 2026-08-19: panel diline çevrildi; severity filtresi iç state'ten
   * prop'a taşındı (tek kaynak: container'daki URL query).
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    /** { Critical: 3, Warning: 8, Info: 2 } */
    severityCounts: { type: Object, default: () => ({}) },
    /** Aktif önem filtresi ("" = tümü) — tek kaynak container. */
    severity: { type: String, default: "" },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  const emit = defineEmits(["retry", "resolve", "open-shipment", "filter-severity"]);

  const { t, te } = useI18n();

  const SEVERITY_ORDER = ["Critical", "Warning", "Info"];

  // Görünüm modu. Varsayılan KART — açıklama ve çözüm notu ancak orada tam
  // okunuyor. Tablo hiç sunulmuyor (yukarıdaki gerekçe).
  const { viewMode } = useResponsiveViewMode("grid", "list", "logistics-exceptions");
  const isKanban = computed(() => viewMode.value === "kanban");

  /**
   * Pano sütunları — üç önem derecesi.
   *
   * Süzgeç seçiliyken sunucu YALNIZ o dereceyi döndürüyor; pano üçünü birden
   * göstermek zorunda olduğu için panoya geçerken süzgeç temizleniyor
   * (`watch` aşağıda). Aksi hâlde pano tek dolu sütunla açılır ve
   * "diğerlerinde iş yok" yalanını söylerdi.
   */
  const kanbanColumns = computed(() =>
    SEVERITY_ORDER.map((key) => ({
      key,
      label: severityLabel(key),
      rows: props.rows.filter((r) => r.severity === key),
    }))
  );

  const severityOptions = computed(() => [
    {
      value: "",
      label: t("logistics.exception.allSeverities"),
      count: SEVERITY_ORDER.reduce((sum, key) => sum + Number(props.severityCounts[key] ?? 0), 0),
    },
    ...SEVERITY_ORDER.map((key) => ({
      value: key,
      label: severityLabel(key),
      count: Number(props.severityCounts[key] ?? 0),
    })),
  ]);

  /**
   * Çözülmemişler önce, sonra önem derecesine göre. Zaman sıralaması
   * ikincil: 3 gün önceki kritik bir istisna, 5 dakika önceki bilgi
   * notundan daha acil.
   */
  const orderedRows = computed(() =>
    [...props.rows].sort((a, b) => {
      const resolvedDiff = Number(Boolean(a.resolved_at)) - Number(Boolean(b.resolved_at));
      if (resolvedDiff !== 0) return resolvedDiff;
      const severityDiff =
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return String(b.occurred_at).localeCompare(String(a.occurred_at));
    })
  );

  // Süzgeç seçiliyken sunucu yalnız o dereceyi döndürüyor; pano üçünü de
  // göstermek zorunda. Süzgeç panoda gizlendiği için kullanıcı kaldıramaz —
  // geçişte container'a temizleme sinyali gidiyor.
  watch(isKanban, (pano) => {
    if (pano && props.severity) emit("filter-severity", "");
  });

  function severityLabel(value) {
    const key = `logistics.severity.${value}`;
    return te(key) ? t(key) : value;
  }

  function rowClass(row) {
    if (row.resolved_at) return "border-gray-200 opacity-70 dark:border-gray-700";
    if (SEVERITY_TONE[row.severity] === "danger") {
      return "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10";
    }
    return "border-gray-200 dark:border-gray-700";
  }

  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>
