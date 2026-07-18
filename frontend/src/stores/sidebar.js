import { defineStore } from "pinia";
import { ref } from "vue";

export const useSidebarStore = defineStore("sidebar", () => {
  // Mobilde (<768px) panel overlay olarak açıldığı için kapalı başlar;
  // desktop'ta eskisi gibi açık başlar.
  const panelVisible = ref(window.matchMedia("(min-width: 768px)").matches);

  function togglePanel() {
    panelVisible.value = !panelVisible.value;
  }

  function openPanel() {
    panelVisible.value = true;
  }

  function closePanel() {
    panelVisible.value = false;
  }

  return {
    panelVisible,
    togglePanel,
    openPanel,
    closePanel,
  };
});
