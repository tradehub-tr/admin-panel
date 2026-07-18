<template>
  <div class="accept-invite-page">
    <div class="card">
      <header class="card-head">
        <h1>{{ t("acceptInvite.welcome") }}</h1>
        <p class="subtitle">{{ t("acceptInvite.subtitle") }}</p>
      </header>

      <p v-if="loading" class="state">{{ t("acceptInvite.verifying") }}</p>

      <div v-else-if="invalid" class="state error">
        <p>{{ t("acceptInvite.invalidLink") }}</p>
        <p class="small">{{ t("acceptInvite.invalidHint") }}</p>
      </div>

      <div v-else-if="accepted" class="state success">
        <p>{{ t("acceptInvite.activated") }}</p>
        <p class="small">{{ t("acceptInvite.redirecting") }}</p>
      </div>

      <form v-else class="form" @submit.prevent="submit">
        <div class="invite-info">
          <div class="row">
            <span class="label">{{ t("acceptInvite.store") }}</span>
            <strong>{{ invite.tenant }}</strong>
          </div>
          <div class="row">
            <span class="label">{{ t("acceptInvite.roleProfile") }}</span>
            <span class="chip">{{ invite.role_profile }}</span>
          </div>
          <div class="row">
            <span class="label">{{ t("acceptInvite.email") }}</span>
            <span class="mono">{{ invite.email }}</span>
          </div>
        </div>

        <label class="field">
          <span class="lbl">{{ t("acceptInvite.fullName") }}</span>
          <input
            v-model="form.full_name"
            type="text"
            required
            :placeholder="invite.full_name || t('acceptInvite.fullNamePlaceholder')"
          />
        </label>

        <label class="field">
          <span class="lbl">{{ t("acceptInvite.newPassword") }}</span>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            :placeholder="t('acceptInvite.passwordPlaceholder')"
            autocomplete="new-password"
          />
        </label>

        <label class="field">
          <span class="lbl">{{ t("acceptInvite.passwordConfirm") }}</span>
          <input
            v-model="form.password_confirm"
            type="password"
            required
            autocomplete="new-password"
          />
        </label>

        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

        <button type="submit" class="btn-primary" :disabled="submitting" :aria-busy="submitting">
          {{ submitting ? t("acceptInvite.processing") : t("acceptInvite.activateAccount") }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";

  const { t } = useI18n();

  const route = useRoute();
  const router = useRouter();

  const loading = ref(true);
  const invalid = ref(false);
  const accepted = ref(false);
  const submitting = ref(false);
  const errorMessage = ref("");

  const invite = ref({
    tenant: "",
    role_profile: "",
    email: "",
    full_name: "",
  });

  const form = reactive({
    full_name: "",
    password: "",
    password_confirm: "",
  });

  const token = route.query.token || "";

  async function verifyToken() {
    if (!token) {
      invalid.value = true;
      loading.value = false;
      return;
    }
    try {
      const res = await api.callMethod("tradehub_core.api.v1.seller_users.verify_invite", {
        token,
      });
      const data = res?.message || res;
      if (!data || !data.email) {
        invalid.value = true;
      } else {
        invite.value = data;
        form.full_name = data.full_name || "";
      }
    } catch (_err) {
      invalid.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function submit() {
    errorMessage.value = "";

    if (form.password !== form.password_confirm) {
      errorMessage.value = t("acceptInvite.passwordsMismatch");
      return;
    }
    if (form.password.length < 8) {
      errorMessage.value = t("acceptInvite.passwordTooShort");
      return;
    }

    submitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.v1.seller_users.accept_invite", {
        token,
        full_name: form.full_name,
        password: form.password,
      });
      accepted.value = true;
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      errorMessage.value = err.message || t("acceptInvite.acceptFailed");
    } finally {
      submitting.value = false;
    }
  }

  onMounted(verifyToken);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .accept-invite-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, $l-bg-soft 0%, $l-bg-subtle 100%);

    @include dark {
      background: linear-gradient(135deg, $d-bg 0%, $d-bg-card 100%);
    }
  }

  .card {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(#000, 0.08);
    width: 100%;
    max-width: 460px;
    padding: 2rem 2.25rem;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      box-shadow: 0 20px 60px rgba(#000, 0.5);
    }
  }

  .card-head {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    margin: 0 0 0.5rem;
    color: $l-text-900;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;

    @include dark {
      color: $d-text-max;
    }
  }

  .subtitle {
    color: $l-text-500;
    font-size: 0.875rem;
    margin: 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  .state {
    text-align: center;
    padding: 2rem 1rem;
    color: $l-text-600;

    p {
      margin: 0.4rem 0;
    }
    .small {
      color: $l-text-500;
      font-size: 0.85rem;
    }

    @include dark {
      color: $d-text-hi;
      .small {
        color: $d-text-muted;
      }
    }

    &.error p:first-child {
      color: $c-error;
      font-weight: 600;
    }
    &.success p:first-child {
      color: $c-success;
      font-weight: 600;
    }
  }

  .invite-info {
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    padding: 1rem 1.1rem;
    margin-bottom: 1.25rem;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.35rem 0;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .label {
      color: $l-text-500;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;

      @include dark {
        color: $d-text-muted;
      }
    }
    strong {
      color: $l-text-900;
      font-size: 0.95rem;

      @include dark {
        color: $d-text-max;
      }
    }
    .mono {
      font-family: ui-monospace, monospace;
      color: $l-text-700;
      font-size: 0.875rem;

      @include dark {
        color: $d-text-hi;
      }
    }
    .chip {
      background: rgba($brand, 0.12);
      color: $brand;
      border: 1px solid rgba($brand, 0.25);
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 500;

      @include dark {
        background: rgba($brand-light, 0.15);
        color: $brand-light;
        border-color: rgba($brand-light, 0.3);
      }
    }
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .lbl {
    color: $l-text-700;
    font-size: 0.85rem;
    font-weight: 600;

    @include dark {
      color: $d-text-max;
    }
  }
  input {
    padding: 0.7rem 0.85rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.95rem;
    background: $l-bg;
    color: $l-text-900;
    transition: border-color $t-base, box-shadow $t-base;

    &::placeholder {
      color: $l-text-400;
    }

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.18);
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-max;
      &::placeholder {
        color: $d-text-faint;
      }
      &:focus {
        border-color: $brand-light;
        box-shadow: 0 0 0 3px rgba($brand-light, 0.22);
      }
    }
  }

  .form-error {
    color: $c-error;
    background: rgba($c-error, 0.08);
    border: 1px solid rgba($c-error, 0.25);
    padding: 0.6rem 0.85rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin: 0;
  }

  .btn-primary {
    background: $brand;
    color: #fff;
    border: none;
    padding: 0.85rem 1.2rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color $t-base, transform $t-base, box-shadow $t-base;
    margin-top: 0.5rem;
    box-shadow: 0 4px 12px rgba($brand, 0.25);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, $brand 88%, #000);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba($brand, 0.35);
    }
    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }

  // Mobil: sayfa (24px) + kart (36px) padding zinciri 320px ekranda forma ~200px bırakıyor;
  // kenar boşluklarını daraltarak form alanlarına ~250px alan aç. (auth view — negatif margin yok)
  @media (max-width: 767px) {
    .accept-invite-page {
      padding: 1rem;
    }
    .card {
      padding: 1.5rem 1.1rem;
      border-radius: 12px;
    }
    // Üçüncü iç padding katmanı — info satırları daralmasın diye ~12px'e in
    .invite-info {
      padding: 0.85rem 0.75rem;
    }
  }
</style>
