<script setup>
  /**
   * LinkTreePicker — ECA değer seçici (büyük/ağaç link alanları için).
   *
   * İki mod:
   *  - TREE (isTree=true, Product Category): arama (yaz → path'li sonuç) + altında
   *    kök listesi, tıklayınca lazy çocuk yüklenir, yaprak/iç düğüm seçilebilir.
   *  - SEARCH (isTree=false, Brand/Product Type): yaz-bul autocomplete (q+limit).
   *
   * 11k düz dump YOK — her şey lazy/aranır. Seçilen değer name (UUID) olarak
   * v-model ile dışarı verilir; ekranda okunur label/path gösterilir.
   *
   * Backend: useEcaRule → link_tree_roots / link_tree_children / link_search /
   * link_resolve (hepsi admin-guard + allowlist'li).
   */
  import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
  import { useI18n } from "vue-i18n";
  import { useEcaRule } from "@/composables/useEcaRule";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const { fetchLinkTreeRoots, fetchLinkTreeChildren, searchLinkOptions, resolveLinkValue } =
    useEcaRule();

  const props = defineProps({
    doctype: { type: String, required: true },
    isTree: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
  });

  // Seçilen kayıt name'i (UUID) — kaydedilen değer.
  const model = defineModel({ type: String, default: "" });

  const triggerRef = ref(null);
  const searchRef = ref(null);
  const open = ref(false);
  const query = ref("");
  const searching = ref(false);
  const searchResults = ref([]);
  // Seçili değerin okunur etiketi (label + path) — buton metni.
  const selectedLabel = ref("");
  // Ağaç düğümleri: { value, label, has_children, depth, parent, expanded, loading }
  const treeNodes = ref([]);
  const treeLoaded = ref(false);
  const dropdownStyle = reactive({
    top: "0px",
    bottom: "auto",
    left: "0px",
    width: "260px",
    maxHeight: "360px",
  });
  let searchTimer = null;
  let closeTimer = null;
  let rafId = null;

  const displayText = computed(() => selectedLabel.value || model.value || "");
  const ph = computed(() => props.placeholder || t("linkTreePicker.placeholder"));

  function updatePosition() {
    const el = triggerRef.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    // Aşağıda yeterli yer yoksa ve yukarıda daha çok yer varsa yukarı aç (kırpılmasın).
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const avail = openUp ? spaceAbove : spaceBelow;
    dropdownStyle.maxHeight = `${Math.min(360, Math.max(180, avail))}px`;
    dropdownStyle.left = `${r.left}px`;
    dropdownStyle.width = `${Math.max(r.width, 240)}px`;
    if (openUp) {
      dropdownStyle.top = "auto";
      dropdownStyle.bottom = `${window.innerHeight - r.top + 4}px`;
    } else {
      dropdownStyle.bottom = "auto";
      dropdownStyle.top = `${r.bottom + 4}px`;
    }
  }

  async function openDropdown() {
    open.value = true;
    await nextTick();
    updatePosition();
    searchRef.value?.focus();
    if (props.isTree && !treeLoaded.value) await loadRoots();
  }

  function scheduleClose() {
    closeTimer = setTimeout(() => (open.value = false), 200);
  }
  function cancelClose() {
    clearTimeout(closeTimer);
  }

  // ── Ağaç-gezinme ────────────────────────────────────────────────────────────
  async function loadRoots() {
    const roots = await fetchLinkTreeRoots(props.doctype);
    treeNodes.value = roots.map((r) => toNode(r, 0, null));
    treeLoaded.value = true;
  }

  function toNode(r, depth, parent) {
    return {
      value: r.value,
      label: r.label,
      hasChildren: !!r.has_children,
      depth,
      parent,
      expanded: false,
      loading: false,
    };
  }

  async function toggleExpand(node) {
    if (!node.hasChildren) return;
    if (node.expanded) return collapseNode(node);
    node.loading = true;
    const children = await fetchLinkTreeChildren(props.doctype, node.value);
    node.loading = false;
    node.expanded = true;
    const idx = treeNodes.value.indexOf(node);
    const mapped = children.map((c) => toNode(c, node.depth + 1, node.value));
    treeNodes.value.splice(idx + 1, 0, ...mapped);
  }

  function collapseNode(node) {
    node.expanded = false;
    const idx = treeNodes.value.indexOf(node);
    let end = idx + 1;
    while (end < treeNodes.value.length && treeNodes.value[end].depth > node.depth) end++;
    treeNodes.value.splice(idx + 1, end - idx - 1);
  }

  // ── Arama (her iki mod) ───────────────────────────────────────────────────────
  watch(query, (q) => {
    clearTimeout(searchTimer);
    const term = (q || "").trim();
    if (term.length < 2) {
      searchResults.value = [];
      searching.value = false;
      return;
    }
    searching.value = true;
    searchTimer = setTimeout(async () => {
      searchResults.value = await searchLinkOptions(props.doctype, term, 20);
      searching.value = false;
    }, 300);
  });

  function pick(item) {
    model.value = item.value;
    selectedLabel.value = item.path || item.label || item.value;
    open.value = false;
    query.value = "";
    searchResults.value = [];
  }

  function clearSelection() {
    model.value = "";
    selectedLabel.value = "";
  }

  // ── Seçili değer etiketi (düzenleme açılışı / dış değişim) ────────────────────
  async function resolveLabel(value) {
    if (!value) {
      selectedLabel.value = "";
      return;
    }
    const res = await resolveLinkValue(props.doctype, value);
    selectedLabel.value = res ? res.path || res.label || value : value;
  }

  watch(
    () => model.value,
    (v) => {
      // Dış kaynak (düzenleme/şablon) değeri set ettiyse ve etiket yoksa çöz.
      if (v && !selectedLabel.value) resolveLabel(v);
      if (!v) selectedLabel.value = "";
    }
  );

  function onScrollResize() {
    // Scroll/resize'da input'a yapışık kalsın; rAF ile frame başına bir kez (titremesin).
    if (!open.value || rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updatePosition();
    });
  }

  onMounted(() => {
    if (model.value) resolveLabel(model.value);
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
  });
  onBeforeUnmount(() => {
    clearTimeout(searchTimer);
    clearTimeout(closeTimer);
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", onScrollResize, true);
    window.removeEventListener("resize", onScrollResize);
  });
</script>

<template>
  <div class="ltp">
    <button
      ref="triggerRef"
      type="button"
      class="ltp-trigger field-input"
      :aria-expanded="open"
      @click="open ? (open = false) : openDropdown()"
    >
      <span class="ltp-text" :class="{ ph: !displayText }">{{ displayText || ph }}</span>
      <AppIcon
        v-if="model"
        name="x"
        :size="13"
        class="ltp-clear"
        @click.stop="clearSelection"
      />
      <AppIcon name="chevron-down" :size="14" class="ltp-caret" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="ltp-pop"
        :style="dropdownStyle"
        @mousedown.prevent
        @mouseenter="cancelClose"
        @mouseleave="scheduleClose"
      >
        <div class="ltp-search">
          <AppIcon name="search" :size="13" class="ltp-search-ic" />
          <input
            ref="searchRef"
            v-model="query"
            type="text"
            class="ltp-search-in"
            :placeholder="t('linkTreePicker.searchPlaceholder')"
            @blur="scheduleClose"
            @keydown.esc="open = false"
          />
        </div>

        <!-- Arama sonuçları (yaz → path'li) -->
        <div v-if="query.trim().length >= 2" class="ltp-list">
          <div v-if="searching" class="ltp-msg">
            <AppIcon name="loader" :size="13" class="animate-spin" />
            {{ t("linkTreePicker.searching") }}
          </div>
          <div v-else-if="!searchResults.length" class="ltp-msg">
            {{ t("linkTreePicker.noResults") }}
          </div>
          <button
            v-for="r in searchResults"
            v-else
            :key="r.value"
            type="button"
            class="ltp-opt"
            @click="pick(r)"
          >
            <span class="ltp-opt-label">{{ r.label }}</span>
            <span v-if="r.path" class="ltp-opt-path">{{ r.path }}</span>
          </button>
        </div>

        <!-- Ağaç gezinme (TREE modu, arama boşken) -->
        <div v-else-if="isTree" class="ltp-list">
          <div v-if="!treeLoaded" class="ltp-msg">
            <AppIcon name="loader" :size="13" class="animate-spin" />
            {{ t("linkTreePicker.loading") }}
          </div>
          <div v-else-if="!treeNodes.length" class="ltp-msg">
            {{ t("linkTreePicker.noResults") }}
          </div>
          <div
            v-for="node in treeNodes"
            v-else
            :key="node.value"
            class="ltp-node"
            :style="{ paddingInlineStart: `${8 + node.depth * 16}px` }"
          >
            <button
              type="button"
              class="ltp-chev"
              :class="{ leaf: !node.hasChildren }"
              :aria-label="t('linkTreePicker.expand')"
              @click="toggleExpand(node)"
            >
              <AppIcon v-if="node.loading" name="loader" :size="12" class="animate-spin" />
              <AppIcon
                v-else-if="node.hasChildren"
                :name="node.expanded ? 'chevron-down' : 'chevron-right'"
                :size="12"
              />
            </button>
            <button type="button" class="ltp-node-label" @click="pick(node)">
              {{ node.label }}
            </button>
          </div>
        </div>

        <!-- SEARCH modu, arama boşken ipucu -->
        <div v-else class="ltp-msg">{{ t("linkTreePicker.typeToSearch") }}</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .ltp {
    position: relative;
  }

  .ltp-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    cursor: pointer;
    text-align: start;
  }

  .ltp-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.ph {
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .ltp-clear,
  .ltp-caret {
    flex-shrink: 0;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .ltp-clear {
    cursor: pointer;
    border-radius: 4px;
    transition: color $t-fast;

    &:hover {
      color: $c-error;
    }
  }

  .ltp-pop {
    position: fixed;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgb(0 0 0 / 14%);
    overflow: hidden;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .ltp-search {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }

  .ltp-search-ic {
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .ltp-search-in {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.85rem;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }

  .ltp-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .ltp-msg {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 12px;
    font-size: 0.8rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .ltp-opt {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 2px;
    padding: 8px 12px;
    text-align: start;
    cursor: pointer;
    transition: background $t-fast;

    &:hover {
      background: $l-bg-muted;
      @include dark {
        background: $d-bg-hover;
      }
    }
  }

  .ltp-opt-label {
    font-size: 0.85rem;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }

  .ltp-opt-path {
    font-size: 0.72rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .ltp-node {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-block: 2px;
    padding-inline-end: 8px;
  }

  .ltp-chev {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    cursor: pointer;
    color: $l-text-400;
    border-radius: 4px;

    &.leaf {
      cursor: default;
    }

    @include dark {
      color: $d-text-faint;
    }
  }

  .ltp-node-label {
    flex: 1;
    padding: 5px 8px;
    text-align: start;
    font-size: 0.85rem;
    border-radius: 6px;
    cursor: pointer;
    color: $l-text-900;
    transition: background $t-fast;

    &:hover {
      background: $l-bg-muted;
      @include dark {
        background: $d-bg-hover;
      }
    }

    @include dark {
      color: $d-text-hi;
    }
  }
</style>
