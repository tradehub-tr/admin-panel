/**
 * Sprint 6 — DB-driven RBAC composable.
 *
 * Component'lerin tek noktadan capability ve modül erişimi sorgulaması için:
 *
 *   <script setup>
 *   import { usePermission } from "@/composables/usePermission";
 *   const { can, seesModule, moduleMode, isMasked, isHidden } = usePermission();
 *   </script>
 *
 *   <template>
 *     <button v-if="can('order.refund')">İade</button>
 *     <section v-if="seesModule('seller.store.profil.kyb')">…</section>
 *     <span :class="{ blur: isMasked('Order.total') }">{{ total }}</span>
 *   </template>
 *
 * Kararlar 3 store'dan beslenir:
 *   - useAuthStore — capability seti (backend get_session_user payload'ı)
 *   - useNavigationStore — modül × rol mode haritası (TH Module Policy)
 *   - (Sprint 4) Field mask map — pii_field_policy
 *
 * Tüm lookup'lar O(1) (Set.has / Map.get). Component'te tetiklenmeden önce
 * `auth.user` ve `navigation.dbLoaded` reactive olduğu için store değişimi
 * UI'da anında yansır.
 */

import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";

export function usePermission() {
  const auth = useAuthStore();
  const navigation = useNavigationStore();

  /**
   * Capability check — backend has_seller_capability ile tutarlı.
   * Boş/undefined capability → False (fail-secure).
   * Platform admin (System Manager / Marketplace Admin) → True (bypass).
   */
  function can(capability) {
    return auth.can(capability);
  }

  /**
   * Modül kullanıcı için görünür mü?
   * mode "hidden" değilse görünür (visible veya masked).
   * DB henüz yüklenmediyse varsayılan True (kullanıcıyı boş ekrana atma).
   */
  function seesModule(moduleKey) {
    return navigation.getModuleMode(moduleKey) !== "hidden";
  }

  /**
   * Modül için mod döner: "visible" | "masked" | "hidden".
   * Backend'in TH Module Policy'sinde tanım yoksa "visible".
   */
  function moduleMode(moduleKey) {
    return navigation.getModuleMode(moduleKey);
  }

  /**
   * Modül "masked" mı? — field-level mask uygulayan component'ler için.
   * Tipik kullanım: <td :class="{ blur: isMasked(...) }">.
   */
  function isMasked(moduleKey) {
    return navigation.getModuleMode(moduleKey) === "masked";
  }

  /**
   * Modül "hidden" mı? — DOM'dan kaldırma kararı için (v-if).
   */
  function isHidden(moduleKey) {
    return navigation.getModuleMode(moduleKey) === "hidden";
  }

  return {
    can,
    seesModule,
    moduleMode,
    isMasked,
    isHidden,
  };
}
