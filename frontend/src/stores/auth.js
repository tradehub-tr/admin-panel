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

  // FAZ 1.5 — Rol bazlı UI filter (sidebar + route guard)
  const userRoles = computed(() => user.value?.roles || []);
  const userCapabilities = computed(() => user.value?.capabilities || []);
  const roleProfileName = computed(() => user.value?.role_profile_name || "");
  const isSellerOwner = computed(() =>
    !!user.value?.is_owner || userRoles.value.includes("Seller Owner"),
  );
  const isSellerCoOwner = computed(() => userRoles.value.includes("Seller Co-Owner"));
  const isComplianceOfficer = computed(() => userRoles.value.includes("Compliance Officer"));

  // Seller capability check — backend require_seller_capability ile tutarlı.
  // UI butonlarını gizlemek/disable etmek için v-if="can('order.ship')" deseni.
  // Backend yine de kontrol eder; bu sadece UX (yetki yoksa buton görünmesin).
  //
  // Fail-secure: undefined/boş capability → False döner (M4 fix). Backend'in
  // "tanımsız capability = deny" davranışı ile uyumlu. Bir dev yanlışlıkla
  // auth.can(undef) yazarsa butonun herkese görünmesi yerine herkesten gizlenir.
  function can(capability) {
    if (!capability) return false;
    if (isAdmin.value) return true;
    return userCapabilities.value.includes(capability);
  }

  /**
   * Bir menü item'ı veya route, mevcut kullanıcı için erişilebilir mi?
   * `requires`: gerekli rol veya capability listesi (herhangi biri yeterli).
   * Boş ya da undefined → herkes görür.
   *
   * Desteklenen tag'ler:
   *   "owner"            — Seller Owner (tradehub_is_owner=1 + Seller Owner rolü)
   *   "co_owner"         — Seller Co-Owner
   *   "owner_or_co"      — Owner veya Co-Owner
   *   "admin"            — System Manager
   *   "compliance"       — Compliance Officer
   *   "<Role Name>"      — direkt rol kontrolü
   */
  function canAccess(requires) {
    if (!requires || requires.length === 0) return true;
    if (isAdmin.value) return true; // Super Admin her şeyi görür

    const list = Array.isArray(requires) ? requires : [requires];
    return list.some((tag) => {
      if (tag === "owner") return isSellerOwner.value;
      if (tag === "co_owner") return isSellerCoOwner.value;
      if (tag === "owner_or_co") return isSellerOwner.value || isSellerCoOwner.value;
      if (tag === "admin") return isAdmin.value;
      if (tag === "compliance") return isComplianceOfficer.value;
      return userRoles.value.includes(tag);
    });
  }

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
    userRoles,
    userCapabilities,
    roleProfileName,
    isSellerOwner,
    isSellerCoOwner,
    isComplianceOfficer,
    canAccess,
    can,
    login,
    fetchUser,
    logout,
    register,
    forgotPassword,
    uploadProfileImage,
  };
});
