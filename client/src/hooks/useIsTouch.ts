import { useSyncExternalStore } from 'react';

const query = typeof window !== 'undefined' ? matchMedia('(pointer: coarse)') : null;
const subscribe = (cb: () => void) => {
  query?.addEventListener('change', cb);
  return () => query?.removeEventListener('change', cb);
};

/** primary input이 터치스크린인지 여부 */
export function useIsTouch() {
  return useSyncExternalStore(subscribe, () => !!query?.matches, () => false);
}
