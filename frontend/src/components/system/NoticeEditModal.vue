<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-labelledby="notice-modal-title">
      <div class="modal-header">
        <h2 id="notice-modal-title">{{ isEdit ? "Duyuruyu Düzenle" : "Yeni Duyuru" }}</h2>
        <button class="icon-btn" aria-label="Kapat" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <form class="modal-body" @submit.prevent="onSubmit">
        <div class="tabs">
          <button type="button" :class="{ active: lang === 'tr' }" @click="lang = 'tr'">
            Türkçe
          </button>
          <button type="button" :class="{ active: lang === 'en' }" @click="lang = 'en'">
            English
          </button>
        </div>

        <div v-show="lang === 'tr'" class="field-group">
          <label>
            Mesaj (TR) <span class="required">*</span>
            <textarea v-model="form.message_tr" rows="2" required maxlength="200"></textarea>
            <small>{{ form.message_tr?.length || 0 }} / 200</small>
          </label>
          <label>
            Link metni (TR)
            <input v-model="form.link_text_tr" type="text" maxlength="60" />
          </label>
        </div>

        <div v-show="lang === 'en'" class="field-group">
          <label>
            Message (EN)
            <textarea v-model="form.message_en" rows="2" maxlength="200"></textarea>
            <small>{{ form.message_en?.length || 0 }} / 200 — boş bırakılırsa TR fallback</small>
          </label>
          <label>
            Link text (EN)
            <input v-model="form.link_text_en" type="text" maxlength="60" />
          </label>
        </div>

        <label>
          Link adresi
          <input v-model="form.link_href" type="text" placeholder="/pages/... veya https://..." />
        </label>

        <div class="row">
          <label class="toggle">
            <input v-model="form.is_active" type="checkbox" :true-value="1" :false-value="0" />
            <span>Aktif</span>
          </label>
        </div>

        <div class="row two">
          <label>
            Başlangıç tarihi
            <input v-model="form.start_at" type="datetime-local" />
            <small>Boş = hemen aktif</small>
          </label>
          <label>
            Bitiş tarihi
            <input v-model="form.end_at" type="datetime-local" />
            <small>Boş = süresiz</small>
          </label>
        </div>

        <div class="modal-footer">
          <button type="button" class="hdr-btn-outlined" @click="$emit('close')">İptal</button>
          <button type="submit" class="hdr-btn-primary" :disabled="saving">
            {{ saving ? "Kaydediliyor..." : "Kaydet" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch } from "vue";
  import { X } from "lucide-vue-next";

  const props = defineProps({
    notice: { type: Object, required: true },
  });
  const emit = defineEmits(["save", "close"]);

  const lang = ref("tr");
  const saving = ref(false);

  const form = reactive({
    name: null,
    message_tr: "",
    message_en: "",
    link_text_tr: "",
    link_text_en: "",
    link_href: "",
    icon: "none",
    is_active: 1,
    sort_order: 0,
    start_at: null,
    end_at: null,
  });

  const isEdit = computed(() => Boolean(form.name));

  watch(
    () => props.notice,
    (n) => {
      Object.assign(form, {
        name: n.name ?? null,
        message_tr: n.message_tr ?? "",
        message_en: n.message_en ?? "",
        link_text_tr: n.link_text_tr ?? "",
        link_text_en: n.link_text_en ?? "",
        link_href: n.link_href ?? "",
        icon: n.icon ?? "none",
        is_active: n.is_active ?? 1,
        sort_order: n.sort_order ?? 0,
        start_at: n.start_at ?? null,
        end_at: n.end_at ?? null,
      });
    },
    { immediate: true }
  );

  async function onSubmit() {
    if (saving.value) return;
    saving.value = true;
    try {
      await Promise.resolve(emit("save", { ...form }));
    } finally {
      saving.value = false;
    }
  }
</script>

<style lang="scss" scoped>
@use "@/assets/scss/variables" as *;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  @include dark {
    background: rgba(0, 0, 0, 0.7);
  }
}

.modal {
  background: $l-bg;
  border-radius: 8px;
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  @include dark {
    background: $d-bg-card;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $l-border;
  @include dark {
    border-bottom-color: $d-border;
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: $l-text-900;
    @include dark {
      color: $d-text;
    }
  }
}

.icon-btn {
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 4px;
  color: $l-text-500;
  &:hover {
    color: $l-text-900;
  }
  @include dark {
    color: $d-text-muted;
    &:hover {
      color: $d-text;
    }
  }
}

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid $l-border;
  @include dark {
    border-bottom-color: $d-border;
  }
}

.tabs button {
  background: transparent;
  border: 0;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: $l-text-500;
  border-bottom: 2px solid transparent;
  &.active {
    color: $l-text-900;
    border-bottom-color: $brand;
    font-weight: 500;
  }
  @include dark {
    color: $d-text-muted;
    &.active {
      color: $d-text;
    }
  }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: $l-text-700;
  @include dark {
    color: $d-text;
  }
}

label input,
label textarea {
  border: 1px solid $l-border;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  background: $l-bg;
  color: $l-text-900;
  &:focus {
    outline: none;
    border-color: $brand;
  }
  @include dark {
    background-color: $d-bg-elevated !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: $d-text !important;
    &:focus {
      border-color: $brand !important;
      background-color: $d-bg-card !important;
    }
  }
}

label small {
  color: $l-text-500;
  font-size: 11px;
  @include dark {
    color: $d-text-faint;
  }
}

.required {
  color: #dc2626;
}

.row {
  display: flex;
  gap: 12px;
}

.row.two label {
  flex: 1;
}

.toggle {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid $l-border;
  @include dark {
    border-top-color: $d-border;
  }
}

.modal-footer .hdr-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

</style>
