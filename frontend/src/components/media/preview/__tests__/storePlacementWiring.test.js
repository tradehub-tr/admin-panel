import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(new URL(`../../../../${p}`, import.meta.url), "utf8");
const dropzone = read("components/upload/ProfileImageDropzone.vue");
const doctype = read("views/doctype/DocTypeFormView.vue");
const editor = read("views/seller/StorefrontLayoutEditor.vue");
const card = read("components/seller/LayoutSectionCard.vue");

test("logo/banner alanı düğme gösterir ve yükleme olayı yayar", () => {
  assert.match(dropzone, /placementSlot: \{ type: String, default: "" \}/);
  assert.match(dropzone, /defineEmits\(\["update:modelValue", "uploaded", "placement"\]\)/);
  assert.match(dropzone, /emit\("uploaded", url\)/);
  assert.match(dropzone, /<ImagePlacementButton[\s\S]*?:slot-key="placementSlot"/);
});

test("satıcı profili: logo seller.logo, banner company.cover_image; galeri satırı", () => {
  assert.match(
    doctype,
    /:placement-slot="\s*field\.fieldname === 'banner_image'\s*\?\s*'company\.cover_image'\s*:\s*'seller\.logo'\s*"/
  );
  assert.match(doctype, /@uploaded="onProfileImageUploaded\(field\.fieldname, \$event\)"/);
  assert.match(doctype, /table\.options === 'Seller Gallery Image'/);
  assert.match(doctype, /placement\.afterUpload\(\{\s*selected: files\.length,/);
  assert.equal((doctype.match(/<ImagePlacementModal/g) || []).length, 1);
});

test("vitrin düzenleyici: başlık logosu ve slayt görselleri", () => {
  assert.match(editor, /<ImagePlacementButton[\s\S]*?slot-key="seller\.logo"/);
  assert.match(editor, /placement\.afterUpload\(\{\s*selected: 1,/);
  assert.equal((editor.match(/<ImagePlacementModal/g) || []).length, 1);
  assert.match(card, /<ImagePlacementButton[\s\S]*?slot-key="company\.cover_image"/);
  assert.match(card, /placement\.afterUpload\(\{\s*selected: 1,/);
  assert.equal((card.match(/<ImagePlacementModal/g) || []).length, 1);
});

test("final I-2: vitrin slaytı önizlemesi gerçek mağaza adını taşır (boş bağlam yok)", () => {
  assert.doesNotMatch(card, /context: \{\}/);
  assert.match(card, /import \{ useAuthStore \} from "@\/stores\/auth"/);
  assert.match(card, /storeName: auth\.user\?\.admin_seller_profile\?\.seller_name \|\| ""/);
  assert.match(
    card,
    /placement\.show\(\{ fileUrl, slotKey, trigger, context: placementContext\(\) \}\)/
  );
  assert.match(
    card,
    /placement\.afterUpload\(\{[\s\S]*?slotKey: "company\.cover_image",\s*context: placementContext\(\),/
  );
  for (const src of [editor, read("views/seller/ListingFormView.vue")])
    assert.match(src, /storeName: auth\.user\?\.admin_seller_profile\?\.seller_name \|\| ""/);
});
