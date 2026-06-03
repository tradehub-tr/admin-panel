<template>
  <div class="hero-slider-page">
    <div class="page-header">
      <div>
        <h1>Hero Slider</h1>
        <p class="subtitle">
          Ana sayfa üstündeki büyük slider'ı buradan yönet. Görsel/renk/gradient arka plan, metin,
          buton ve konum eklenebilir.
        </p>
      </div>
      <button class="hs-btn-primary" type="button" @click="openCreate">
        <Plus :size="16" /> Yeni Slide
      </button>
    </div>

    <section class="list-section">
      <h2>Tüm Slide'lar</h2>
      <p v-if="loading" class="state">Yükleniyor...</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <p v-else-if="!slides.length" class="state">
        Henüz slide yok. "Yeni Slide" ile başlayın. (Hiç slide yokken storefront varsayılan gradient
        slide'ları gösterir.)
      </p>

      <draggable
        v-else
        v-model="slides"
        item-key="name"
        handle=".drag-handle"
        :animation="150"
        @end="onReorder"
      >
        <template #item="{ element: slide }">
          <div class="slide-row" :class="{ inactive: !slide.is_active }">
            <button class="drag-handle" type="button" aria-label="Sürükle">
              <GripVertical :size="16" />
            </button>
            <span class="swatch" :style="{ background: swatch(slide) }"></span>
            <div class="row-main">
              <span class="row-title">{{ slide.title_tr || "(başlıksız)" }}</span>
              <span class="row-meta"
                >{{ bgLabel(slide.background_type) }} · {{ alignLabel(slide.content_align) }}</span
              >
            </div>
            <button
              type="button"
              class="badge"
              :class="slide.is_active ? 'badge--on' : 'badge--off'"
              @click="toggleActive(slide)"
            >
              {{ slide.is_active ? "Aktif" : "Pasif" }}
            </button>
            <button type="button" class="row-icon" aria-label="Düzenle" @click="openEdit(slide)">
              <Pencil :size="15" />
            </button>
            <button
              type="button"
              class="row-icon row-icon--danger"
              aria-label="Sil"
              @click="confirmDelete(slide)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </draggable>
    </section>

    <HeroSlideEditModal v-if="editing" :slide="editing" @save="onSave" @close="editing = null" />
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import draggable from "vuedraggable";
  import { Plus, GripVertical, Pencil, Trash2 } from "lucide-vue-next";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import HeroSlideEditModal from "@/components/system/HeroSlideEditModal.vue";

  const DOCTYPE = "Hero Slide";
  const toast = useToast();

  const slides = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const editing = ref(null);

  function swatch(s) {
    if (s.background_type === "image" && s.background_image) {
      return `url('${s.background_image}') center/cover no-repeat`;
    }
    if (s.background_type === "color") return s.background_color || "#1f5fae";
    return `linear-gradient(${s.gradient_angle || 120}deg, ${s.background_color || "#1f5fae"} 0%, ${s.background_color_2 || "#0c2e61"} 100%)`;
  }
  const bgLabel = (t) => ({ gradient: "Gradient", color: "Düz renk", image: "Görsel" })[t] || t;
  const alignLabel = (a) => ({ center: "Orta", left: "Sol", right: "Sağ" })[a] || a;

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.getList(DOCTYPE, {
        fields: ["*"],
        order_by: "sort_order asc, creation desc",
        limit_page_length: 0,
      });
      slides.value = res.data || [];
    } catch (e) {
      error.value = e.message || "Slide'lar yüklenemedi";
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    const maxOrder = slides.value.reduce((m, s) => Math.max(m, s.sort_order ?? 0), -1);
    editing.value = {
      label_tr: "",
      label_en: "",
      title_tr: "",
      title_en: "",
      description_tr: "",
      description_en: "",
      button_text_tr: "",
      button_text_en: "",
      button_href: "",
      background_type: "gradient",
      background_image: "",
      background_color: "#1f5fae",
      background_color_2: "#0c2e61",
      gradient_angle: 120,
      text_color: "#ffffff",
      content_align: "center",
      overlay: 0,
      is_active: 1,
      sort_order: maxOrder + 1,
      start_at: null,
      end_at: null,
    };
  }

  function openEdit(s) {
    editing.value = { ...s };
  }

  async function onSave(payload) {
    try {
      if (payload.name) {
        await api.updateDoc(DOCTYPE, payload.name, payload);
        toast.success("Slide güncellendi.");
      } else {
        await api.createDoc(DOCTYPE, payload);
        toast.success("Slide eklendi.");
      }
      editing.value = null;
      await fetchAll();
    } catch (e) {
      toast.error(e.message || "Kaydedilemedi");
    }
  }

  async function toggleActive(s) {
    const next = s.is_active ? 0 : 1;
    try {
      await api.updateDoc(DOCTYPE, s.name, { is_active: next });
      s.is_active = next;
    } catch (e) {
      toast.error(e.message || "Güncellenemedi");
    }
  }

  async function onReorder() {
    try {
      await Promise.all(
        slides.value.map((s, i) =>
          s.sort_order === i ? null : api.updateDoc(DOCTYPE, s.name, { sort_order: i })
        )
      );
      slides.value = slides.value.map((s, i) => ({ ...s, sort_order: i }));
    } catch (e) {
      toast.error(e.message || "Sıralama kaydedilemedi");
    }
  }

  async function confirmDelete(s) {
    if (!confirm(`"${s.title_tr || "Bu slide"}" silinsin mi?`)) return;
    try {
      await api.deleteDoc(DOCTYPE, s.name);
      await fetchAll();
    } catch (e) {
      toast.error(e.message || "Silinemedi");
    }
  }

  onMounted(fetchAll);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .hero-slider-page {
    padding: 24px;
    max-width: 960px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;

    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0;
      color: $l-text-900;
      @include dark {
        color: $d-text;
      }
    }
    .subtitle {
      font-size: 13px;
      color: $l-text-500;
      margin: 4px 0 0;
      max-width: 620px;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .list-section h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $l-text-500;
    font-weight: 600;
    margin: 0 0 8px;
    @include dark {
      color: $d-text-muted;
    }
  }

  .state {
    padding: 24px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    color: $l-text-500;
    text-align: center;
    font-size: 13px;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
    &.error {
      color: #dc2626;
      background: #fee2e2;
    }
  }

  .slide-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    margin-bottom: 8px;
    transition: border-color $t-base;
    &:hover {
      border-color: $l-text-500;
    }
    &.inactive {
      opacity: 0.6;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .drag-handle {
    appearance: none;
    border: none;
    background: transparent;
    color: $l-text-300;
    cursor: grab;
    display: inline-flex;
    padding: 2px;
    &:active {
      cursor: grabbing;
    }
  }

  .swatch {
    width: 44px;
    height: 30px;
    border-radius: 6px;
    flex-shrink: 0;
    border: 1px solid rgba(#000, 0.08);
  }

  .row-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .row-title {
    font-size: 14px;
    font-weight: 500;
    color: $l-text-900;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    @include dark {
      color: $d-text;
    }
  }
  .row-meta {
    font-size: 11px;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  .badge {
    appearance: none;
    border: none;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    cursor: pointer;
    &--on {
      background: rgba($c-success, 0.12);
      color: $c-success;
    }
    &--off {
      background: $l-bg-muted;
      color: $l-text-500;
    }
  }

  .row-icon {
    appearance: none;
    border: none;
    background: transparent;
    color: $l-text-500;
    cursor: pointer;
    display: inline-flex;
    padding: 6px;
    border-radius: 6px;
    &:hover {
      color: $l-text-900;
      background: $l-bg-muted;
    }
    &--danger:hover {
      color: $c-error;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        color: $d-text;
        background: $d-bg-hover;
      }
    }
  }

  .hs-btn-primary {
    appearance: none;
    border: none;
    background: $brand;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
</style>
