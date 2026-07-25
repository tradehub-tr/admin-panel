import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKanbanPage,
  createKanbanPageState,
  moveKanbanItem,
} from "../kanbanPageState.js";

test("Kanban state starts each status with a bounded first-page cursor", () => {
  const state = createKanbanPageState([{ value: "New" }, { value: "Qualified" }]);

  assert.deepEqual(state, {
    New: { items: [], total: 0, nextOffset: 0, hasMore: true, loading: false, error: false },
    Qualified: { items: [], total: 0, nextOffset: 0, hasMore: true, loading: false, error: false },
  });
});

test("Kanban page append deduplicates cards and preserves the server cursor", () => {
  const initial = createKanbanPageState([{ value: "Won" }]);
  initial.Won.items = [{ name: "DEAL-1" }];

  const next = applyKanbanPage(initial, "Won", {
    items: [{ name: "DEAL-1" }, { name: "DEAL-2" }],
    total: 51,
    next_offset: 40,
    has_more: true,
  });

  assert.deepEqual(next.Won, {
    items: [{ name: "DEAL-1" }, { name: "DEAL-2" }],
    total: 51,
    nextOffset: 40,
    hasMore: true,
    loading: false,
    error: false,
  });
});

test("successful status drag moves the visible card and adjusts both server totals", () => {
  const state = createKanbanPageState([{ value: "Qualification" }, { value: "Won" }]);
  state.Qualification = {
    ...state.Qualification,
    items: [{ name: "DEAL-1", status: "Qualification" }],
    total: 2,
  };
  state.Won = { ...state.Won, total: 3 };

  const next = moveKanbanItem(state, {
    item: state.Qualification.items[0],
    fromStatus: "Qualification",
    toStatus: "Won",
  });

  assert.deepEqual(next.Qualification.items, []);
  assert.equal(next.Qualification.total, 1);
  assert.deepEqual(next.Won.items, [{ name: "DEAL-1", status: "Won" }]);
  assert.equal(next.Won.total, 4);
});
