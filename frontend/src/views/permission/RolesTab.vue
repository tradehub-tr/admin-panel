<template>
  <div class="roles-tab">
    <p v-if="loading && !roles.length" class="state">Yükleniyor…</p>

    <div v-else class="roles-layout">
      <!-- Sol: Rol listesi (kategoriye göre gruplu) -->
      <aside class="role-list">
        <div v-for="cat in categories" :key="cat.id" class="role-group">
          <h3 class="role-group-title">
            <component :is="cat.icon" :size="14" />
            {{ cat.label }}
            <span class="role-count">({{ cat.roles.length }})</span>
          </h3>
          <button
            v-for="role in cat.roles"
            :key="role.name"
            type="button"
            :class="['role-item', { active: selectedRole?.name === role.name }]"
            @click="selectRole(role.name)"
          >
            <span class="role-name">{{ role.role_profile }}</span>
            <span class="role-meta">{{ role.user_count }} kullanıcı</span>
          </button>
        </div>
      </aside>

      <!-- Sağ: Detay -->
      <section class="role-detail">
        <p v-if="!selectedRole" class="state">
          Soldaki listeden bir rol seçin.
        </p>

        <template v-else>
          <div class="detail-header">
            <div>
              <h2>{{ selectedRole.role_profile }}</h2>
              <p class="detail-meta">{{ selectedRole.user_count }} kullanıcıda atanmış</p>
            </div>
          </div>

          <section class="detail-section">
            <h3>İçerdiği Roller</h3>
            <div class="role-chips">
              <span v-for="r in selectedRole.roles || []" :key="r" class="chip">{{ r }}</span>
              <p v-if="!selectedRole.roles?.length" class="muted">Bu profile rol atanmamış.</p>
            </div>
          </section>

          <section class="detail-section">
            <h3>Bu Rolü Kullanan Kullanıcılar</h3>
            <p v-if="!selectedRole.users?.length" class="muted">Henüz kullanıcı yok.</p>
            <ul v-else class="user-list">
              <li v-for="u in selectedRole.users" :key="u.name" class="user-row">
                <div class="u-main">
                  <span class="u-name">{{ u.full_name || u.email }}</span>
                  <span class="u-email">{{ u.email }}</span>
                </div>
                <div class="u-meta">
                  <span v-if="u.tradehub_tenant" class="badge">{{ u.tradehub_tenant }}</span>
                  <span :class="['status-dot', u.enabled ? 'on' : 'off']" />
                  <span class="u-status">{{ u.enabled ? "Aktif" : "Pasif" }}</span>
                </div>
              </li>
            </ul>
          </section>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { Shield, Store, ShoppingCart, Sparkles } from "lucide-vue-next";
  import { usePermissionStore } from "@/stores/permission";

  const store = usePermissionStore();
  const { roles, selectedRole, platformRoles, sellerRoles, buyerRoles, customRoles, loading } =
    storeToRefs(store);

  const categories = computed(() => [
    { id: "platform", label: "Platform", icon: Shield, roles: platformRoles.value },
    { id: "seller", label: "Satıcı", icon: Store, roles: sellerRoles.value },
    { id: "buyer", label: "Alıcı", icon: ShoppingCart, roles: buyerRoles.value },
    { id: "custom", label: "Özel", icon: Sparkles, roles: customRoles.value },
  ]);

  async function selectRole(name) {
    try {
      await store.fetchRoleDetail(name);
    } catch {
      // hata banner'da
    }
  }

  onMounted(async () => {
    if (!roles.value.length) {
      try {
        await store.fetchRoles();
      } catch {
        // hata banner'da
      }
    }
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .roles-tab {
    display: block;
  }
  .state {
    color: $l-text-500;
    padding: 2rem;
    text-align: center;

    @include dark {
      color: $d-text-muted;
    }
  }
  .muted {
    color: $l-text-400;
    font-size: 0.875rem;
    font-style: italic;

    @include dark {
      color: $d-text-faint;
    }
  }

  .roles-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
    min-height: 480px;
  }

  // ── Sol liste ─────────────────────────────────────────────
  .role-list {
    border-right: 1px solid $l-border;
    padding-right: 1rem;

    @include dark {
      border-right-color: $d-border;
    }
  }
  .role-group {
    margin-bottom: 1.25rem;
  }
  .role-group-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: $l-text-500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .role-count {
    color: $l-text-400;
    font-weight: 400;

    @include dark {
      color: $d-text-faint;
    }
  }
  .role-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    font-size: 0.875rem;
    margin-bottom: 0.15rem;
    transition: all $t-base;

    &:hover {
      background: $l-bg-subtle;
    }
    &.active {
      background: rgba($brand, 0.08);
      border-color: rgba($brand, 0.25);
      color: $brand;
      font-weight: 500;

      .role-name {
        color: $brand;
      }
    }

    @include dark {
      &:hover {
        background: $d-bg-hover;
      }
      &.active {
        background: rgba($brand-light, 0.12);
        border-color: rgba($brand-light, 0.3);
        color: $brand-light;

        .role-name {
          color: $brand-light;
        }
      }
    }
  }
  .role-name {
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }
  .role-meta {
    color: $l-text-400;
    font-size: 0.72rem;

    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Sağ detay ─────────────────────────────────────────────
  .role-detail h2 {
    margin: 0 0 0.25rem;
    color: $l-text-900;
    font-size: 1.15rem;
    font-weight: 600;

    @include dark {
      color: $d-text-max;
    }
  }
  .detail-meta {
    color: $l-text-500;
    font-size: 0.875rem;
    margin: 0;

    @include dark {
      color: $d-text-muted;
    }
  }
  .detail-section {
    margin-top: 1.5rem;
  }
  .detail-section h3 {
    font-size: 0.78rem;
    font-weight: 600;
    color: $l-text-700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 0.6rem;

    @include dark {
      color: $d-text-hi;
    }
  }

  .role-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid $l-border-alt;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
      border-color: $d-border;
    }
  }

  .user-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .user-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 0.85rem;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    margin-bottom: 0.4rem;
    background: $l-bg;
    transition: border-color $t-base;

    &:hover {
      border-color: rgba($brand, 0.3);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;

      &:hover {
        border-color: rgba($brand-light, 0.35);
      }
    }
  }
  .u-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .u-name {
    font-weight: 500;
    color: $l-text-900;
    font-size: 0.875rem;

    @include dark {
      color: $d-text-hi;
    }
  }
  .u-email {
    color: $l-text-500;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .u-meta {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.75rem;
  }
  .badge {
    background: rgba($brand, 0.1);
    color: $brand;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-weight: 500;
    font-size: 0.7rem;

    @include dark {
      background: rgba($brand-light, 0.15);
      color: $brand-light;
    }
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;

    &.on {
      background: $c-success;
      box-shadow: 0 0 0 3px rgba($c-success, 0.15);
    }
    &.off {
      background: $c-error;
      box-shadow: 0 0 0 3px rgba($c-error, 0.12);
    }
  }
  .u-status {
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 760px) {
    .roles-layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .role-list {
      border-right: none;
      border-bottom: 1px solid $l-border;
      padding-right: 0;
      padding-bottom: 1rem;

      @include dark {
        border-bottom-color: $d-border;
      }
    }
    .user-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
