/** Bütün bağlam şablonlarının ORTAK prop sözleşmesi (ImagePlacementModal bunları geçirir). */
export const CONTEXT_PROPS = {
  src: { type: String, required: true },
  focal: { type: Object, required: true },
  place: { type: Object, required: true },
  device: { type: String, default: "desktop" },
  scale: { type: Number, default: 1 },
  data: { type: Object, default: () => ({}) },
};
