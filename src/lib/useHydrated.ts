import { useSyncExternalStore } from 'react';
import { useApp } from './store';

const subscribe = (onChange: () => void) => useApp.persist.onFinishHydration(onChange);
const getSnapshot = () => useApp.persist.hasHydrated();

/** True once the persisted store (onboarding flag, settings, draft) has been read from storage. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
