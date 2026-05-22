<script setup>
  import { computed } from "vue";

  const props = defineProps({
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    url: { type: String, default: "" },
  });

  const displayTitle = computed(() => props.title || "Sayfa Başlığı");
  const displayDescription = computed(() => props.description || "Sayfa açıklaması...");
  const displayImage = computed(() => props.image || "");

  const domain = computed(() => {
    try {
      return new URL(props.url).hostname.toUpperCase();
    } catch {
      return "ISTOC.COM";
    }
  });
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
      Facebook / WhatsApp Önizleme
    </h3>

    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <div class="aspect-[1.91/1] bg-gray-100 flex items-center justify-center">
        <img
          v-if="displayImage"
          :src="displayImage"
          class="w-full h-full object-cover"
          alt="OG önizleme"
        />
        <span v-else class="text-gray-400 text-sm">OG image yok (1200x630 öneririz)</span>
      </div>
      <div class="bg-gray-50 px-3 py-2 border-t border-gray-200">
        <div class="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
          {{ domain }}
        </div>
        <div class="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {{ displayTitle }}
        </div>
        <div class="text-xs text-gray-500 line-clamp-2 mt-0.5">
          {{ displayDescription }}
        </div>
      </div>
    </div>
  </div>
</template>
