/**
 * Per-status CRM Kanban pagination state.
 *
 * The API owns ordering and returns an opaque next offset. Keeping the state
 * separate from the generic list stores prevents a Kanban view from replacing
 * a normal table/list page with hundreds of cards.
 */
export function createKanbanPageState(columns) {
  return Object.fromEntries(
    columns.map((column) => [
      column.value,
      { items: [], total: 0, nextOffset: 0, hasMore: true, loading: false, error: false },
    ])
  );
}

export function applyKanbanPage(state, status, page) {
  const current = state[status] || {
    items: [],
    total: 0,
    nextOffset: 0,
    hasMore: true,
    loading: false,
    error: false,
  };
  const seen = new Set(current.items.map((item) => item.name));
  const items = current.items.concat((page.items || []).filter((item) => !seen.has(item.name)));

  return {
    ...state,
    [status]: {
      ...current,
      items,
      total: Number(page.total || 0),
      nextOffset: page.next_offset ?? null,
      hasMore: Boolean(page.has_more),
      loading: false,
      error: false,
    },
  };
}

export function setKanbanPageError(state, status) {
  const current = state[status];
  if (!current) return state;
  return { ...state, [status]: { ...current, loading: false, error: true } };
}

export function moveKanbanItem(state, { item, fromStatus, toStatus }) {
  if (!item || fromStatus === toStatus || !state[fromStatus] || !state[toStatus]) return state;
  const moved = { ...item, status: toStatus };
  return {
    ...state,
    [fromStatus]: {
      ...state[fromStatus],
      items: state[fromStatus].items.filter((current) => current.name !== item.name),
      total: Math.max(0, state[fromStatus].total - 1),
    },
    [toStatus]: {
      ...state[toStatus],
      // Bir sonraki API sayfası duplicate'i de-dupe eder; kartı hemen görünür yap.
      items: [moved, ...state[toStatus].items.filter((current) => current.name !== item.name)],
      total: state[toStatus].total + 1,
    },
  };
}
