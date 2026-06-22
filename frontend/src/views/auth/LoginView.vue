<template>
  <div class="min-h-screen flex items-center justify-center bg-[#0f0f12] px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div
          class="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20"
        >
          <i class="fas fa-bolt text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">TradeHub</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t("auth.subtitle") }}</p>
      </div>

      <!-- Login Card -->
      <div class="bg-[#1c1c26] border border-[#26263a] rounded-2xl p-8">
        <h2 class="text-lg font-bold text-white mb-1">{{ t("auth.welcome") }}</h2>
        <p class="text-sm text-gray-500 mb-6">{{ t("auth.loginPrompt") }}</p>

        <div v-if="error" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p class="text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1.5">{{
              t("auth.email")
            }}</label>
            <input
              v-model="email"
              type="email"
              :placeholder="t('auth.emailPlaceholder')"
              class="w-full px-4 py-3 bg-[#0f0f12] border border-[#26263a] text-white text-sm rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-600"
              @keydown.enter="handleLogin"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 mb-1.5">{{
              t("auth.password")
            }}</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 bg-[#0f0f12] border border-[#26263a] text-white text-sm rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-600"
              @keydown.enter="handleLogin"
            />
          </div>
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2">
              <input
                v-model="remember"
                type="checkbox"
                class="form-checkbox rounded text-violet-600 bg-transparent border-[#26263a]"
              />
              <span class="text-xs text-gray-500">{{ t("auth.rememberMe") }}</span>
            </label>
            <a href="#" class="text-xs text-violet-500 hover:text-violet-400 font-medium">{{
              t("auth.forgotPassword")
            }}</a>
          </div>
          <button
            :disabled="loading"
            class="w-full py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleLogin"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            {{ loading ? t("auth.signingIn") : t("auth.signIn") }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-[11px] text-gray-600 mt-6">
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
