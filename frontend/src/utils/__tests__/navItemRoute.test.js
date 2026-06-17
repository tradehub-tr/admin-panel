// Node 22 native test runner.
// Çalıştırma: node --test src/utils/__tests__/navItemRoute.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveNavItemRoute, getSellerOwnRecordName } from "../navItemRoute.js";

const sellerCtx = {
  isAdmin: false,
  user: {
    // User Profile autoname=field:user → kayıt adı email'dir, seller_profile DEĞİL.
    email: "satici@example.com",
    seller_profile: "DEMO-011", // satıcı kodu — User Profile name'i değil
    admin_seller_profile: { name: "ASP-0001" },
    kyb_verification: "KYB-0001",
  },
};

const adminCtx = { isAdmin: true, user: { email: "admin@example.com" } };

test("explicit route her zaman aynen döner", () => {
  const item = { route: "/seller-listings", doctype: "User Profile" };
  assert.equal(resolveNavItemRoute(item, sellerCtx), "/seller-listings");
});

test("sellerOwned User Profile → kendi kullanıcı profili formuna (name=email)", () => {
  const item = { doctype: "User Profile", sellerOwned: true };
  assert.equal(
    resolveNavItemRoute(item, sellerCtx),
    "/app/User%20Profile/satici%40example.com"
  );
});

test("Admin Seller Profile sellerOwned → kendi admin_seller_profile.name formuna", () => {
  const item = { doctype: "Admin Seller Profile", sellerOwned: true };
  assert.equal(
    resolveNavItemRoute(item, sellerCtx),
    "/app/Admin%20Seller%20Profile/ASP-0001"
  );
});

test("sellerOwned doctype ama kayıt yoksa generic liste route'una düşer", () => {
  const item = { doctype: "User Profile", sellerOwned: true };
  const ctx = { isAdmin: false, user: {} }; // email yok
  assert.equal(resolveNavItemRoute(item, ctx), "/app/User%20Profile");
});

test("admin için sellerOwned doctype direct-form mantığı uygulanmaz, liste döner", () => {
  const item = { doctype: "User Profile", sellerOwned: true };
  assert.equal(resolveNavItemRoute(item, adminCtx), "/app/User%20Profile");
});

test("sellerOwned olmayan doctype generic liste route'u döner", () => {
  const item = { doctype: "Listing" };
  assert.equal(resolveNavItemRoute(item, sellerCtx), "/app/Listing");
});

test("doctype + filters → query string ekler", () => {
  const item = { doctype: "Order", filters: { status: "Pending" } };
  assert.equal(resolveNavItemRoute(item, sellerCtx), "/app/Order?status=Pending");
});

test("report item → report route'u döner", () => {
  const item = { report: "Sales Summary" };
  assert.equal(resolveNavItemRoute(item, sellerCtx), "/app/report/Sales%20Summary");
});

test("ne route ne doctype ne report → '#'", () => {
  assert.equal(resolveNavItemRoute({ label: "x" }, sellerCtx), "#");
});

test("getSellerOwnRecordName: User Profile → kullanıcının email'i", () => {
  assert.equal(getSellerOwnRecordName("User Profile", sellerCtx.user), "satici@example.com");
});

test("getSellerOwnRecordName: Admin Seller Profile → admin_seller_profile.name", () => {
  assert.equal(getSellerOwnRecordName("Admin Seller Profile", sellerCtx.user), "ASP-0001");
});

test("getSellerOwnRecordName: bilinmeyen doctype → undefined", () => {
  assert.equal(getSellerOwnRecordName("Listing", sellerCtx.user), undefined);
});
