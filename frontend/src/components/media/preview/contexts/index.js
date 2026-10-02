import "./contexts.css";

import CartContext from "./CartContext.vue";
import FavoritesContext from "./FavoritesContext.vue";
import GalleryContext from "./GalleryContext.vue";
import ProductCardContext from "./ProductCardContext.vue";
import ProductPageContext from "./ProductPageContext.vue";
import RelatedContext from "./RelatedContext.vue";
import StoreCardContext from "./StoreCardContext.vue";
import StoreHeaderContext from "./StoreHeaderContext.vue";
import StoreVitrinContext from "./StoreVitrinContext.vue";

/** `placements.json → preview_places[].context` adı → bileşen. */
export const CONTEXTS = Object.freeze({
  StoreHeaderContext,
  StoreVitrinContext,
  GalleryContext,
  StoreCardContext,
  ProductCardContext,
  ProductPageContext,
  CartContext,
  RelatedContext,
  FavoritesContext,
});
