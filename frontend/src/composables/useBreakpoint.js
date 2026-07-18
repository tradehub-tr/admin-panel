import { ref, onMounted, onUnmounted } from "vue";

const breakpoints = {
  lg: "(min-width: 768px)",
  xl: "(min-width: 1024px)",
  "2xl": "(min-width: 1280px)",
};

export function useBreakpoint() {
  // İlk render'da doğru değer: onMounted beklenirse bir kare yanlış layout çizilir.
  const isLg = ref(window.matchMedia(breakpoints.lg).matches);
  const isXl = ref(window.matchMedia(breakpoints.xl).matches);
  const is2xl = ref(window.matchMedia(breakpoints["2xl"]).matches);

  const queries = {};
  const handlers = {};

  function update(key, mql) {
    if (key === "lg") isLg.value = mql.matches;
    if (key === "xl") isXl.value = mql.matches;
    if (key === "2xl") is2xl.value = mql.matches;
  }

  onMounted(() => {
    for (const [key, query] of Object.entries(breakpoints)) {
      const mql = window.matchMedia(query);
      queries[key] = mql;
      update(key, mql);
      handlers[key] = (e) => update(key, e);
      mql.addEventListener("change", handlers[key]);
    }
  });

  onUnmounted(() => {
    for (const [key, mql] of Object.entries(queries)) {
      mql.removeEventListener("change", handlers[key]);
    }
  });

  return { isLg, isXl, is2xl };
}
