<template>
  <span class="crm-avatar" :class="sizeCls" :title="title">
    <img v-if="image" :src="image" :alt="title" />
    <span v-else>{{ initials }}</span>
  </span>
</template>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    email: { type: String, default: "" },
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    size: { type: String, default: "md" }, // sm|md|lg
  });

  const title = computed(() => props.name || props.email || "");

  const initials = computed(() => {
    const src = props.name || props.email || "";
    if (!src) return "?";
    const parts = src
      .trim()
      .split(/[\s@.]+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  const sizeCls = computed(() => {
    if (props.size === "sm") return "crm-avatar-sm";
    if (props.size === "lg") return "crm-avatar-lg";
    return "";
  });
</script>
