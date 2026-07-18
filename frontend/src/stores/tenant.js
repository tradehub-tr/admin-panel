import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "./auth";

// Role Profile → kısa görünür label map'i. Backend role_profile_name boşsa
// is_admin/is_seller flag fallback'i kullanılır.
const ROLE_LABEL_MAP = {
  "Platform Super Admin": "Süper Admin",
  "Platform Finance Manager": "Finans",
  "Compliance Manager": "Compliance",
  "Support Staff": "Destek",
  "Seller Full Access": "Owner",
  "Seller Co-Owner": "Co-Owner",
  "Seller Manager": "Yönetici",
  "Seller Finance Staff": "Finans",
  "Seller Operations": "Operasyon",
  "Buyer Full Access": "Owner",
  "Buyer Operations": "Operasyon",
  "Buyer Finance Staff": "Finans",
  "Buyer Approver L1": "Approver L1",
  "Buyer Approver L2": "Approver L2",
  "Buyer Viewer Only": "Viewer",
};

function resolveRoleLabel(user) {
  if (!user) return "";
  const rp = user.role_profile_name || "";
  if (rp && ROLE_LABEL_MAP[rp]) return ROLE_LABEL_MAP[rp];
  if (rp) return rp; // tanımsız role profile → adını olduğu gibi göster
  if (user.is_admin) return "Admin";
  if (user.is_seller) return "Satıcı";
  return "Alıcı";
}

export const useTenantStore = defineStore("tenant", () => {
  const dropdownOpen = ref(false);

  const activeTenant = computed(() => {
    const auth = useAuthStore();
    const user = auth.user;
    if (!user) return null;

    const name = user.full_name || user.email || "Kullanıcı";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    return {
      id: user.email,
      initials,
      name,
      role: resolveRoleLabel(user),
      gradient: "from-brand-400 to-brand-600",
    };
  });

  const tenants = computed(() => {
    const active = activeTenant.value;
    return active ? [active] : [];
  });

  const activeTenantId = computed(() => activeTenant.value?.id || "");

  const shortName = computed(() => {
    const name = activeTenant.value?.name || "";
    return name.length > 10 ? name.substring(0, 9) + "." : name;
  });

  function switchTenant() {
    dropdownOpen.value = false;
  }

  function toggleDropdown() {
    dropdownOpen.value = !dropdownOpen.value;
  }

  function closeDropdown() {
    dropdownOpen.value = false;
  }

  return {
    tenants,
    activeTenantId,
    activeTenant,
    shortName,
    dropdownOpen,
    switchTenant,
    toggleDropdown,
    closeDropdown,
  };
});
