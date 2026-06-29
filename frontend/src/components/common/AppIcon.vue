<template>
  <component :is="iconComponent" :size="size" :stroke-width="strokeWidth" :class="className" />
</template>

<script setup>
  /**
   * AppIcon — Central Lucide icon wrapper
   *
   * Usage:
   *   <AppIcon name="bell" />
   *   <AppIcon name="home" :size="20" class="text-red-500" />
   *
   * Icons use `currentColor` by default so they inherit text color from parent.
   */
  import { computed } from "vue";
  import { icons } from "lucide-vue-next";

  const props = defineProps({
    /** Lucide icon name in kebab-case, e.g. 'shopping-cart', 'house' */
    name: { type: String, required: true },
    /** Icon size in pixels */
    size: { type: [Number, String], default: 16 },
    /** SVG stroke-width */
    strokeWidth: { type: [Number, String], default: 2 },
    /** Additional CSS classes */
    class: { type: String, default: "" },
  });

  // Convert kebab-case to PascalCase for Lucide component lookup
  function toPascalCase(str) {
    return str
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  }

  // Lucide v1+ rename'leri için geriye uyumluluk alias'ları.
  // Kodda eski adlar kullanılmaya devam eder, AppIcon yeni Lucide adına çevirir.
  // Eklenmesi gerekirse: rename listesi için Lucide changelog ya da
  // https://lucide.dev/icons göz at.
  const LUCIDE_ALIASES = {
    AlertTriangle: "TriangleAlert",
    AlertCircle: "CircleAlert",
    AlertOctagon: "OctagonAlert",
    CheckCircle: "CircleCheck",
    CheckCircle2: "CircleCheckBig",
    CheckSquare: "SquareCheck",
    XCircle: "CircleX",
    HelpCircle: "CircleHelp",
    PlusCircle: "CirclePlus",
    MinusCircle: "CircleMinus",
    UserCircle: "CircleUser",
    PlayCircle: "CirclePlay",
    PauseCircle: "CirclePause",
    StopCircle: "CircleStop",
    UploadCloud: "CloudUpload",
    DownloadCloud: "CloudDownload",
    FileWarning: "TriangleAlert",
    Grid: "Grid3x3",
    // Lucide v1'de yeniden adlandırılan / kaldırılan adlar (render etmiyordu → boş ikon).
    Edit3: "SquarePen",
    Edit2: "SquarePen",
    Columns: "Columns2",
    // Lucide v0.5xx: "Filter" → "Funnel" (icons map'inde Filter kaldırıldı,
    // render etmiyordu → boş ikon). Tüm name="filter" kullanımları için alias.
    Filter: "Funnel",
  };

  const iconComponent = computed(() => {
    const name = toPascalCase(props.name);
    return icons[name] || icons[LUCIDE_ALIASES[name]] || null;
  });

  const className = computed(() => props.class);
</script>
