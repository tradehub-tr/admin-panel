import assert from "node:assert/strict";
import { test } from "node:test";
import { effectScope, nextTick, ref } from "vue";
import { usePlacementLauncher } from "../usePlacementLauncher.js";
import { useUploadPlacementQueue } from "../useUploadPlacementQueue.js";

const fileUrl = "/files/flow-test.png";
async function settle() {
  for (let i = 0; i < 5; i++) await nextTick();
}
function setup(getPrefs = async () => ({ autoopen: true })) {
  const scope = effectScope();
  const rows = ref([
    { id: "1", kind: "image", status: "done", result: { name: "F1", file_url: fileUrl } },
  ]);
  const facts = ref({});
  const selected = ref(fileUrl);
  const launcher = usePlacementLauncher({ getPrefs });
  const queue = scope.run(() =>
    useUploadPlacementQueue({ rows, facts, launcher, isCurrent: (url) => selected.value === url })
  );
  const enqueue = (count = 1) =>
    queue.enqueue({ selected: count, fileUrl, slotKey: "product.image" });
  return { scope, rows, facts, selected, launcher, enqueue };
}

test("transfer, pending scan and processing never open focal; clean + ready opens once", async () => {
  const v = setup();
  try {
    v.enqueue();
    for (const facts of [
      null,
      { scan_status: "pending", asset_states: ["ready"] },
      { scan_status: "clean", asset_states: ["processing"] },
    ]) {
      v.facts.value = { F1: facts };
      await settle();
      assert.equal(v.launcher.state.open, false);
    }
    v.facts.value = { F1: { scan_status: "clean", asset_states: ["ready"] } };
    await settle();
    assert.equal(v.launcher.state.open, true);
    assert.equal(v.launcher.state.fileUrl, fileUrl);
    v.launcher.hide();
    await settle();
    assert.equal(v.launcher.state.open, false);
  } finally {
    v.scope.stop();
  }
});

test("infected, failed and unverified scans cannot open even with a ready asset", async () => {
  const v = setup();
  try {
    v.enqueue();
    for (const scan_status of ["infected", "failed", ""]) {
      v.facts.value = { F1: { scan_status, asset_states: ["ready"] } };
      await settle();
      assert.equal(v.launcher.state.open, false);
    }
  } finally {
    v.scope.stop();
  }
});

test("multi-select and replaced form images do not open automatically", async () => {
  const v = setup();
  try {
    v.facts.value = { F1: { scan_status: "clean", asset_states: ["ready"] } };
    v.enqueue(3);
    await settle();
    assert.equal(v.launcher.state.open, false);
    v.enqueue();
    v.selected.value = "/files/replacement.png";
    await settle();
    assert.equal(v.launcher.state.open, false);
  } finally {
    v.scope.stop();
  }
});

test("delayed preference response cannot open an unmounted form", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const v = setup(() => pending);
  v.enqueue();
  v.facts.value = { F1: { scan_status: "clean", asset_states: ["ready"] } };
  await settle();
  v.scope.stop();
  release({ autoopen: true });
  await settle();
  assert.equal(v.launcher.state.open, false);
});

test("an existing editor is not replaced; pending image waits until it closes", async () => {
  const v = setup();
  try {
    v.launcher.show({ fileUrl: "/files/editing.png", slotKey: "product.image" });
    v.enqueue();
    v.facts.value = { F1: { scan_status: "clean", asset_states: ["ready"] } };
    await settle();
    assert.equal(v.launcher.state.fileUrl, "/files/editing.png");
    v.launcher.hide();
    await settle();
    assert.equal(v.launcher.state.fileUrl, fileUrl);
  } finally {
    v.scope.stop();
  }
});
