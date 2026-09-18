import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addMember,
  emptyTeamForm,
  formFromTeam,
  removeMember,
  toPayload,
  validateTeamForm,
} from "../salesTeamForm.js";

test("emptyTeamForm: aktif, lider ve üye boş", () => {
  const f = emptyTeamForm();
  assert.equal(f.name, null);
  assert.equal(f.is_active, 1);
  assert.deepEqual(f.members, []);
});

test("formFromTeam: backend satırını forma çevirir", () => {
  const f = formFromTeam({
    name: "Ekip A",
    team_name: "Ekip A",
    leader: "l@x.com",
    leader_name: "Lider",
    is_active: 0,
    members: [{ agent: "a@x.com", full_name: "Ali" }, { agent: "b@x.com" }],
  });
  assert.equal(f.name, "Ekip A");
  assert.equal(f.is_active, 0);
  assert.deepEqual(f.members, [
    { agent: "a@x.com", full_name: "Ali" },
    { agent: "b@x.com", full_name: "b@x.com" },
  ]);
});

test("addMember: tekrarı engeller, yeni dizi döner", () => {
  const m0 = [];
  const m1 = addMember(m0, { name: "a@x.com", full_name: "Ali" });
  const m2 = addMember(m1, "a@x.com");
  assert.notEqual(m0, m1);
  assert.equal(m1.length, 1);
  assert.equal(m2, m1);
  assert.equal(addMember(m1, null), m1);
});

test("removeMember: yalnız verilen üyeyi çıkarır", () => {
  const m = [{ agent: "a@x.com" }, { agent: "b@x.com" }];
  assert.deepEqual(removeMember(m, "a@x.com"), [{ agent: "b@x.com" }]);
});

test("validateTeamForm: ad ve lider zorunlu", () => {
  assert.deepEqual(validateTeamForm({ team_name: " ", leader: "" }), [
    "Ekip adı zorunlu.",
    "Ekip lideri seçin.",
  ]);
  assert.deepEqual(validateTeamForm({ team_name: "X", leader: "l@x.com" }), []);
});

test("toPayload: üyeleri e-posta listesine indirger, alanları kırpar", () => {
  const p = toPayload({
    name: null,
    team_name: " Ekip ",
    leader: " l@x.com ",
    members: [{ agent: "a@x.com" }],
    is_active: true,
  });
  assert.deepEqual(p, {
    name: null,
    team_name: "Ekip",
    leader: "l@x.com",
    members: ["a@x.com"],
    is_active: 1,
  });
});
