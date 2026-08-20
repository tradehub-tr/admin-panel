<template>
  <div ref="rootEl" class="app-select" :class="{ open }">
    <button
      type="button"
      class="as-trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown.down.prevent="openAndMove(1)"
      @keydown.up.prevent="openAndMove(-1)"
      @keydown.enter.prevent="onEnter"
      @keydown.escape="open = false"
    >
      <span v-if="selected?.dot" class="as-dot" :class="selected.dot"></span>
      <span class="as-label">{{ selected ? selected.label : placeholder }}</span>
      <AppIcon name="chevron-down" :size="13" class="as-chevron" />
    </button>

    <!-- Panel body'ye Teleport edilir: parent'ların overflow:hidden'ı ya da
         stacking context'i menüyü KIRPMASIN (ör. sayfalama dropdown'u kartın alt
         kenarında kesiliyordu). Konum trigger'dan hesaplanıp position:fixed ile
         verilir; aşağı yer yoksa yukarı açılır, scroll/resize'da güncellenir. -->
    <Teleport to="body">
      <Transition name="dropdown">
        <ul
          v-if="open"
          ref="panelEl"
          class="as-panel"
          :style="menuStyle"
          role="listbox"
        >
          <li
            v-for="(opt, i) in normalized"
            :key="String(opt.value)"
            role="option"
            :aria-selected="opt.value === modelValue"
            class="as-option"
            :class="{ selected: opt.value === modelValue, active: i === activeIndex }"
            @mouseenter="activeIndex = i"
            @click="select(opt)"
          >
            <span v-if="opt.dot" class="as-dot" :class="opt.dot"></span>
            <span class="as-option-label">{{ opt.label }}</span>
            <AppIcon v-if="opt.value === modelValue" name="check" :size="13" class="as-check" />
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  /**
   * AppSelect — panel standardı özel dropdown (native <select> yerine).
   *
   * Native option listesi OS görünümünde açılıyor ve markalanamıyor; bu
   * bileşen tetikleyici + açılır paneli tasarım diliyle çizer.
   *
   * Kullanım:
   *   <AppSelect v-model="status" :options="[{ value: '', label: 'Tümü', dot: 'bg-brand-400' }]" />
   *   <AppSelect v-model="sort" :options="['A', 'B']" />   <!-- düz string de kabul -->
   */
  import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    modelValue: { type: [String, Number, null], default: "" },
    /** [{ value, label, dot? }] veya düz string dizisi */
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: "" },
  });
  const emit = defineEmits(["update:modelValue", "change"]);

  const open = ref(false);
  const activeIndex = ref(-1);
  const rootEl = ref(null);
  const panelEl = ref(null);
  const menuStyle = ref({});

  // Panel body'ye teleport edildiği için konumu trigger'dan hesaplanıp
  // position:fixed ile verilir. Aşağı yer yoksa yukarı açılır; viewport'un
  // sağına taşarsa trigger'ın sağ kenarına hizalanır (x-scroll oluşmasın).
  function positionMenu() {
    const trigger = rootEl.value;
    if (!trigger) return;
    const tr = trigger.getBoundingClientRect();
    const gap = 6;
    const panelH = panelEl.value?.offsetHeight || 0;
    const panelW = panelEl.value?.offsetWidth || tr.width;

    const spaceBelow = window.innerHeight - tr.bottom;
    const top =
      panelH && spaceBelow < panelH + gap && tr.top > panelH + gap
        ? tr.top - panelH - gap
        : tr.bottom + gap;
    const left =
      tr.left + panelW > window.innerWidth - 8 ? tr.right - panelW : tr.left;

    menuStyle.value = {
      position: "fixed",
      top: `${Math.max(8, top)}px`,
      left: `${Math.max(8, left)}px`,
      minWidth: `${tr.width}px`,
    };
  }

  watch(open, async (isOpen) => {
    if (!isOpen) {
      window.removeEventListener("resize", positionMenu);
      document.removeEventListener("scroll", positionMenu, true);
      return;
    }
    // İlk kaba konum (panel ölçülmeden), sonra ölçüp yukarı-açılma/hizalama.
    positionMenu();
    await nextTick();
    positionMenu();
    window.addEventListener("resize", positionMenu);
    // capture=true: herhangi bir kaydırılabilir üst konteynerin scroll'unu da yakala.
    document.addEventListener("scroll", positionMenu, true);
  });

  const normalized = computed(() =>
    props.options.map((o) =>
      typeof o === "object" && o !== null ? o : { value: o, label: String(o) }
    )
  );

  const selected = computed(
    () => normalized.value.find((o) => o.value === props.modelValue) || null
  );

  function toggle() {
    open.value = !open.value;
    if (open.value) syncActive();
  }

  function syncActive() {
    activeIndex.value = normalized.value.findIndex((o) => o.value === props.modelValue);
  }

  function openAndMove(dir) {
    if (!open.value) {
      open.value = true;
      syncActive();
      return;
    }
    const n = normalized.value.length;
    if (!n) return;
    activeIndex.value = (activeIndex.value + dir + n) % n;
  }

  function onEnter() {
    if (!open.value) {
      toggle();
      return;
    }
    const opt = normalized.value[activeIndex.value];
    if (opt) select(opt);
  }

  function select(opt) {
    open.value = false;
    if (opt.value === props.modelValue) return;
    emit("update:modelValue", opt.value);
    emit("change", opt.value);
  }

  function onDocClick(e) {
    // Panel body'ye teleport edildi — hem trigger hem panel dışına tıklanınca kapat.
    const inTrigger = rootEl.value?.contains(e.target);
    const inPanel = panelEl.value?.contains(e.target);
    if (!inTrigger && !inPanel) open.value = false;
  }
  onMounted(() => document.addEventListener("click", onDocClick));
  onUnmounted(() => {
    document.removeEventListener("click", onDocClick);
    window.removeEventListener("resize", positionMenu);
    document.removeEventListener("scroll", positionMenu, true);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .app-select {
    position: relative;
    min-width: 0;
  }

  .as-trigger {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    height: 34px;
    padding: 0 10px;
    font-family: inherit;
    font-size: 13px;
    color: $l-text-700;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color $t-fast;

    &:hover {
      border-color: rgba($brand, 0.5);
    }

    &:focus-visible {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;

      &:hover {
        border-color: rgba($brand, 0.6);
      }
    }
  }

  .open .as-trigger {
    border-color: $brand;
  }

  .as-label {
    flex: 1;
    min-width: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .as-chevron {
    color: $l-text-400;
    transition: transform $t-fast;
    flex-shrink: 0;

    @include dark {
      color: $d-text-faint;
    }
  }

  .open .as-chevron {
    transform: rotate(180deg);
  }

  .as-panel {
    // Konum inline :style ile (position:fixed + top/left/min-width) veriliyor;
    // body'ye teleport edildiği için parent overflow'u kırpmaz.
    max-width: min(300px, calc(100vw - 16px));
    max-height: 280px;
    overflow-y: auto;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(#000, 0.12);
    // Teleport'lu panel body'de — modal/overlay'lerin de üstünde kalsın.
    z-index: 1000;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-panel-border;
      box-shadow: 0 10px 30px rgba(#000, 0.4);
    }
  }

  .as-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    color: $l-text-700;
    cursor: pointer;
    white-space: nowrap;

    &.active {
      background: $l-bg-muted;
    }

    &.selected {
      font-weight: 600;
      color: $l-text-900;
    }

    @include dark {
      color: $d-text;

      &.active {
        background: $d-item-hover;
      }

      &.selected {
        color: $d-text-max;
      }
    }
  }

  .as-option-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .as-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .as-check {
    margin-left: auto;
    color: #a87b00;
    flex-shrink: 0;

    @include dark {
      color: $brand;
    }
  }
</style>
