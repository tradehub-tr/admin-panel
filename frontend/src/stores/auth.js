import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/utils/api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const successMessage = ref(null);

  const isAuthenticated = computed(() => !!user.value);
  const isLoading = computed(() => loading.value);

  const userInitials = computed(() => {
    if (!user.value?.full_name) return "??";
    return user.value.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  });

  const userName = computed(() => user.value?.full_name || user.value?.email || "");

  const isSeller = computed(() => !!user.value?.is_seller);
  const isAdmin = computed(() => !!user.value?.is_admin);
  // KYB doğrulanmış satıcı flag'i — sipariş gate'inin admin panel görsel temsili.
  // Backend "Verified Seller" rolü atamasına göre döner. False iken satıcı dashboard'da
  // KYB durum banner'ı + listing'lerde "Sipariş bekliyor" rozeti gösterilir.
  const isVerifiedSeller = computed(() => !!user.value?.is_verified_seller);
  const kybStatus = computed(() => user.value?.kyb_status || null);

  async function login(email, password) {
    loading.value = true;
    error.value = null;
    successMessage.value = null;
    try {
      await api.login(email, password);
      await fetchUser();
    } catch (err) {
      error.value = err.message || "Giriş başarısız";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser() {
    try {
      const res = await api.getSessionUser();
      const session = res.message;
      if (session?.logged_in && session?.user) {
        user.value = session.user;
        // Login sonrası CSRF token'ı hemen cache'le — POST çağrılarında 417 hatası önlenir
        if (session.csrf_token) {
          api.setCsrfToken(session.csrf_token);
        }
      } else {
        user.value = null;
      }
    } catch {
      user.value = null;
    }
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      user.value = null;
      error.value = null;
      successMessage.value = null;
    }
  }

  async function register(email, fullName) {
    loading.value = true;
    error.value = null;
    successMessage.value = null;
    try {
      await api.register(email, fullName);
      successMessage.value = "Kayıt başarılı! E-postanızı kontrol edin.";
    } catch (err) {
      error.value = err.message || "Kayıt başarısız";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function forgotPassword(email) {
    loading.value = true;
    error.value = null;
    successMessage.value = null;
    try {
      await api.forgotPassword(email);
      successMessage.value = "Şifre sıfırlama bağlantısı e-postanıza gönderildi.";
    } catch (err) {
      error.value = err.message || "İşlem başarısız";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function uploadProfileImage(file) {
    if (!file) throw new Error("Dosya seçilmedi.");
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      throw new Error("Geçersiz dosya türü. JPG, PNG, WEBP veya GIF yükleyin.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Dosya 5 MB'dan küçük olmalı.");
    }

    const filedata = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Dosya okunamadı."));
      reader.readAsDataURL(file);
    });

    const res = await api.callMethod("tradehub_core.api.v1.identity.update_profile_image", {
      filename: file.name,
      filedata,
    });
    const nextUrl = res?.message?.user_image || "";
    if (nextUrl && user.value) {
      user.value = {
        ...user.value,
        user_image: nextUrl + (nextUrl.includes("?") ? "&" : "?") + "t=" + Date.now(),
      };
    }
    return nextUrl;
  }

  return {
    user,
    loading,
    error,
    successMessage,
    isAuthenticated,
    isLoading,
    userInitials,
    userName,
    isSeller,
    isAdmin,
    isVerifiedSeller,
    kybStatus,
    login,
    fetchUser,
    logout,
    register,
    forgotPassword,
    uploadProfileImage,
  };
});
