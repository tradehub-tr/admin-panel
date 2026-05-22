<script setup>
  import { ref, computed } from "vue";

  const props = defineProps({
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    url: { type: String, default: "" },
  });

  const mode = ref("desktop"); // 'desktop' | 'mobile'

  const displayTitle = computed(() => props.title || "Sayfa Başlığı");
  const displayDescription = computed(
    () => props.description || "Sayfa açıklaması burada görünecek..."
  );

  const breadcrumb = computed(() => {
    try {
      const u = new URL(props.url);
      const path = u.pathname.replace(/^\//, "").replace(/\//g, " › ");
      return `${u.hostname} › ${path}`;
    } catch {
      return props.url || "istoc.com";
    }
  });
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Google Arama Önizleme
      </h3>
      <div class="flex gap-1">
        <button
          type="button"
          class="px-2 py-1 text-xs rounded"
          :class="mode === 'desktop' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'"
          @click="mode = 'desktop'"
        >
          Desktop
        </button>
        <button
          type="button"
          class="px-2 py-1 text-xs rounded"
          :class="mode === 'mobile' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'"
          @click="mode = 'mobile'"
        >
          Mobil
        </button>
      </div>
    </div>

    <div class="font-serif" :class="mode === 'mobile' ? 'max-w-sm' : ''">
      <div class="text-xs text-gray-600 mb-1 truncate">{{ breadcrumb }}</div>
      <a
        class="block text-blue-700 hover:underline leading-snug line-clamp-2"
        :class="mode === 'mobile' ? 'text-base' : 'text-lg'"
        href="#"
      >
        {{ displayTitle }}
      </a>
      <p class="text-gray-600 line-clamp-2 mt-1" :class="mode === 'mobile' ? 'text-xs' : 'text-sm'">
        {{ displayDescription }}
      </p>
    </div>
  </div>
</template>
