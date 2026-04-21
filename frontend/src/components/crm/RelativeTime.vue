<template>
  <span :title="absolute">{{ relative }}</span>
</template>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    value: { type: [String, Date], default: "" },
  });

  const dateObj = computed(() => {
    if (!props.value) return null;
    try {
      return new Date(props.value);
    } catch {
      return null;
    }
  });

  const absolute = computed(() => {
    if (!dateObj.value) return "";
    try {
      return dateObj.value.toLocaleString("tr-TR");
    } catch {
      return String(props.value);
    }
  });

  const relative = computed(() => {
    if (!dateObj.value) return "";
    const d = dateObj.value;
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "az önce";
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}gün önce`;
    try {
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return String(props.value);
    }
  });
</script>
