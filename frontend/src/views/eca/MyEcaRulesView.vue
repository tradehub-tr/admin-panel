<template>
  <div class="my-eca-view">
    <header class="my-eca-header">
      <div>
        <h1 class="my-eca-title">
          <AppIcon name="zap" :size="22" />
          Toplu Yükleme Kurallarım
        </h1>
        <p class="my-eca-subtitle">
          Bu kurallar sadece SİZİN ürünlerinizde, sadece toplu yükleme sırasında çalışır.
        </p>
      </div>
      <button class="btn-primary" @click="goNew">+ Yeni Kural</button>
    </header>

    <div v-if="loading" class="my-eca-loading">Yükleniyor...</div>

    <div v-else-if="!rules.length" class="my-eca-empty">
      <AppIcon name="zap" :size="40" />
      <h3>Henüz kural eklemedin</h3>
      <p>
        Toplu yükleme sırasında otomatik dönüştürmek istediğin alanlar için bir kural yaz. Örnek:
        "10 adet üstü %5 indirim".
      </p>
      <button class="btn-primary" @click="goNew">İlk kuralını yaz</button>
    </div>

    <div v-else class="my-eca-table-wrap">
      <table class="my-eca-table">
        <thead>
          <tr>
            <th>Kural</th>
            <th>Olay</th>
            <th class="text-center">Aktif</th>
            <th>Son tetik</th>
            <th class="text-right">Aksiyonlar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.name">
            <td>
              <div class="cell-title">{{ r.rule_name || r.name }}</div>
              <div class="cell-sub">
                {{ r.reference_doctype }} · priority {{ r.priority }} · {{ r.action_type }}
              </div>
            </td>
            <td>
              <code class="event-code">{{ r.event }}</code>
            </td>
            <td class="text-center">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="!!r.enabled"
                  @change="onToggle(r, $event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </label>
            </td>
            <td>
              <template v-if="r.last_fired_at">
                {{ formatDate(r.last_fired_at) }}
                <span class="cell-sub"> — {{ r.total_fired_count || 0 }} kez</span>
              </template>
              <span v-else class="muted">—</span>
            </td>
            <td class="text-right">
              <button class="btn-link" @click="goEdit(r)">Düzenle</button>
              <button class="btn-link danger" @click="onDelete(r)">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
  import { onMounted } from "vue";
  import { useRouter } from "vue-router";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { useEcaRule } from "@/composables/useEcaRule";

  const router = useRouter();
  const { rules, loading, fetchMyRules, toggleRule, deleteRule } = useEcaRule();

  function goNew() {
    router.push("/my-eca-rules/new");
  }

  function goEdit(r) {
    router.push(`/my-eca-rules/${encodeURIComponent(r.name)}`);
  }

  async function onToggle(r, checked) {
    await toggleRule(r.name, checked);
  }

  async function onDelete(r) {
    if (!confirm(`"${r.rule_name}" kuralını silmek istediğine emin misin?`)) return;
    try {
      await deleteRule(r.name);
    } catch {
      /* toast composable tarafından */
    }
  }

  function formatDate(dt) {
    if (!dt) return "";
    try {
      const d = new Date(dt.replace(" ", "T"));
      if (Number.isNaN(d.getTime())) return dt;
      return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  }

  onMounted(() => fetchMyRules());
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .my-eca-view {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .my-eca-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .my-eca-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .my-eca-subtitle {
    font-size: 13px;
    color: $l-text-500;
    margin: 4px 0 0;
    max-width: 640px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .btn-primary {
    height: 32px;
    padding: 0 14px;
    background: $brand;
    color: #fff;
    border: 0;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: darken(#7c3aed, 6%);
    }
  }

  .my-eca-loading {
    padding: 48px 16px;
    text-align: center;
    color: $l-text-500;
    font-size: 14px;
  }

  .my-eca-empty {
    padding: 48px 24px;
    text-align: center;
    border: 1px dashed $l-border;
    border-radius: 12px;
    background: $l-bg-subtle;
    color: $l-text-700;

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 12px 0 4px;
      color: $l-text-900;
    }

    p {
      font-size: 13px;
      color: $l-text-500;
      margin: 0 auto 16px;
      max-width: 460px;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;

      h3 {
        color: $d-text-hi;
      }

      p {
        color: $d-text-muted;
      }
    }
  }

  .my-eca-table-wrap {
    border: 1px solid $l-border;
    border-radius: 8px;
    overflow: hidden;
    background: $l-bg;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .my-eca-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    thead {
      background: $l-bg-subtle;

      @include dark {
        background: $d-bg-elevated;
      }
    }

    th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: $l-text-500;
      letter-spacing: 0.04em;

      @include dark {
        color: $d-text-muted;
      }
    }

    td {
      padding: 12px;
      border-top: 1px solid $l-border;
      color: $l-text-700;

      @include dark {
        border-top-color: $d-border-inner;
        color: $d-text;
      }
    }

    tbody tr:hover {
      background: $l-bg-subtle;

      @include dark {
        background: $d-bg-hover;
      }
    }
  }

  .cell-title {
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  .cell-sub {
    font-size: 11px;
    color: $l-text-500;
    margin-top: 2px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .event-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 2px 6px;
    border-radius: 4px;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .muted {
    color: $l-text-400;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .btn-link {
    font-size: 12px;
    background: transparent;
    border: 0;
    color: $brand;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    transition: opacity $t-base;

    &:hover {
      opacity: 0.7;
    }

    &.danger {
      color: $c-error;
    }
  }

  .toggle {
    display: inline-flex;
    position: relative;
    width: 36px;
    height: 20px;
    cursor: pointer;

    input {
      opacity: 0;
      width: 0;
      height: 0;
    }
  }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: #cbd5e1;
    border-radius: 999px;
    transition: background $t-base;

    &::before {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform $t-base;
    }
  }

  .toggle input:checked + .toggle-slider {
    background: $c-success;

    &::before {
      transform: translateX(16px);
    }
  }
</style>
