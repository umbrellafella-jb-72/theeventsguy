'use client';

import { useEffect, useSyncExternalStore } from 'react';

// The saved-events list in the browser. Mirrors the member database when it's switched on
// ("server" mode), otherwise lives in localStorage on this device ("local" mode).
type State = { ready: boolean; mode: 'server' | 'local'; saved: Set<string> };
let state: State = { ready: false, mode: 'local', saved: new Set() };
let started = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const LS = 'eg_shortlist';

function readLocal(): string[] { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } }
function writeLocal(ids: string[]) { try { localStorage.setItem(LS, JSON.stringify(ids)); } catch { /* private mode: keep in memory */ } }

async function start() {
  if (started) return; started = true;
  try {
    const r = await fetch('/api/shortlist', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const j = await r.json();
    if (j.mode === 'server') {
      // First sign-in on the database: carry over anything saved on this device before.
      const local = readLocal().filter(id => !j.saved.includes(id));
      state = { ready: true, mode: 'server', saved: new Set([...j.saved, ...local]) };
      for (const id of local) fetch('/api/shortlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, saved: true }) });
      if (local.length) writeLocal([]);
    } else state = { ready: true, mode: 'local', saved: new Set(readLocal()) };
  } catch { state = { ready: true, mode: 'local', saved: new Set(readLocal()) }; }
  emit();
}

export async function setSaved(id: string, saved: boolean) {
  const next = new Set(state.saved); saved ? next.add(id) : next.delete(id);
  state = { ...state, saved: next }; emit();
  if (state.mode === 'local') { writeLocal([...next]); return; }
  const r = await fetch('/api/shortlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, saved }) }).catch(() => null);
  if (!r || !r.ok) { const back = new Set(state.saved); saved ? back.delete(id) : back.add(id); state = { ...state, saved: back }; emit(); }
}

/** The shortlist, for members. Pass enabled=false for visitors (nothing is fetched). */
export function useShortlist(enabled: boolean): State {
  useEffect(() => { if (enabled) start(); }, [enabled]);
  return useSyncExternalStore(f => (subs.add(f), () => subs.delete(f)), () => state, () => state);
}
