<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-surface dark:bg-[#121110]">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <img :src="logoLight" alt="iStoc" class="h-8 mx-auto dark:hidden" />
        <img :src="logoDark" alt="iStoc" class="h-8 mx-auto hidden dark:block" />
        <p class="text-[#6d6a61] dark:text-[#9c988e] text-sm mt-3">{{ t("auth.subtitle") }}</p>
      </div>

      <!-- Login Card -->
      <div
        class="login-card bg-white dark:bg-panel border border-surface-border dark:border-[#2c2a26] rounded-2xl p-8"
      >
        <h2 class="text-[#1d1c19] dark:text-[#edebe6] text-lg font-bold mb-1">
          {{ t("auth.welcome") }}
        </h2>
        <p class="text-[#6d6a61] dark:text-[#9c988e] text-sm mb-6">
          {{ t("auth.loginPrompt") }}
        </p>

        <div v-if="error" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p class="text-xs text-red-500">{{ error }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <div>
            <label class="text-[#4e4c45] dark:text-[#9c988e] block text-xs font-semibold mb-1.5">{{
              t("auth.email")
            }}</label>
            <input
              v-model="email"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.emailPlaceholder')"
              class="w-full px-4 py-3 text-sm rounded-xl outline-none bg-[#faf9f7] dark:bg-[#121110] border border-surface-border dark:border-[#2c2a26] text-[#1d1c19] dark:text-[#edebe6] placeholder:text-[#a09c92] dark:placeholder:text-[#6a665e] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div>
            <label class="text-[#4e4c45] dark:text-[#9c988e] block text-xs font-semibold mb-1.5">{{
              t("auth.password")
            }}</label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full px-4 py-3 text-sm rounded-xl outline-none bg-[#faf9f7] dark:bg-[#121110] border border-surface-border dark:border-[#2c2a26] text-[#1d1c19] dark:text-[#edebe6] placeholder:text-[#a09c92] dark:placeholder:text-[#6a665e] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div class="login-options flex items-center justify-between">
            <label class="flex items-center gap-2">
              <input v-model="remember" type="checkbox" class="accent-brand-500 rounded" />
              <span class="text-[#6d6a61] dark:text-[#9c988e] text-xs">{{
                t("auth.rememberMe")
              }}</span>
            </label>
            <a
              href="#"
              class="text-xs font-medium text-brand-800 hover:text-brand-900 dark:text-brand-500 dark:hover:text-brand-300"
              >{{ t("auth.forgotPassword") }}</a
            >
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 bg-brand-500 text-brand-ink hover:bg-brand-600 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            {{ loading ? t("auth.signingIn") : t("auth.signIn") }}
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-[#a09c92] dark:text-[#6a665e] text-center text-[11px] mt-6">
        {{ t("auth.copyright") }}
      </p>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter, useRoute } from "vue-router";
  import { useAuthStore } from "@/stores/auth";
  import logoLight from "@/assets/media/istoc-logo.png";
  import logoDark from "@/assets/media/istoc-logo-beyaz.png";

  const { t } = useI18n();
  const router = useRouter();
  const route = useRoute();
  const auth = useAuthStore();

  // Login sayfası mount edildiğinde tarayıcının bozuk/eski session cookie'lerini
  // (httpOnly sid dahil) NGINX-level endpoint ile temizle. Bu sayede kullanıcı
  // bozuk state'te sıkışmaz — login formuna geldiğinde temiz başlar.
  onMounted(async () => {
    try {
      await fetch("/panel/clear-cookies", { credentials: "include", cache: "no-store" });
    } catch {
      /* defansif — başarısız olursa kullanıcı yine login yapabilir */
    }
  });

  const email = ref("");
  const password = ref("");
  const remember = ref(false);
  const loading = ref(false);
  const localError = ref("");

  const error = computed(() => localError.value || auth.error || "");

  async function handleLogin() {
    if (!email.value || !password.value) {
      localError.value = t("auth.errors.credentialsRequired");
      return;
    }
    loading.value = true;
    localError.value = "";
    auth.error = null;
    try {
      await auth.login(email.value, password.value);
      if (!auth.isAdmin && !auth.isSeller) {
        await auth.logout();
        localError.value = t("auth.errors.sellerAdminOnly");
        return;
      }
      // Navigate to the redirect target or dashboard
      const redirectTo = route.query.redirect || "/dashboard";
      router.push(redirectTo);
    } catch (err) {
      localError.value = err.message || t("auth.errors.loginFailed");
    } finally {
      loading.value = false;
    }
  }
</script>

<style scoped lang="scss">
  /* Mobilde padding zinciri: kök px-4 (16px) + kart p-8 (32px) = 48px/kenar —
     320px ekranda form alanlarına 224px kalıyor. Kart padding'ini düşürerek
     alanlara ~248px kazandırıyoruz; desktop görünümü değişmiyor. */
  @media (max-width: 767px) {
    .login-card {
      padding: 1.25rem; // p-8 (32px) yerine 20px
    }

    // "Beni hatırla" + "Şifremi unuttum" dar ekranda / uzun çeviride
    // tek satıra sığmayabilir — sarmasına izin ver.
    .login-options {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
</style>
