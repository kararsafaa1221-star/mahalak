export function restoreAppScroll(scrollY: number) {
  const y = Math.max(0, Math.round(scrollY));
  const apply = () => window.scrollTo({ top: y, left: 0, behavior: 'instant' });

  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 0);
    setTimeout(apply, 50);
    setTimeout(apply, 120);
  });
}

export function saveScrollToHistoryState() {
  const state = window.history.state;
  if (!state?.isAppNav) return;

  window.history.replaceState(
    { ...state, scrollY: window.scrollY },
    '',
    window.location.href,
  );
}

export function readHistoryScrollY(state: unknown): number {
  if (
    state &&
    typeof state === 'object' &&
    'scrollY' in state &&
    typeof (state as { scrollY: unknown }).scrollY === 'number'
  ) {
    return Math.max(0, (state as { scrollY: number }).scrollY);
  }
  return 0;
}
