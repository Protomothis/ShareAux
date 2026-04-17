'use client';

import { useEffect, useState } from 'react';

/** iOS Safari 키보드가 올라올 때 viewport 높이 반환 */
export function useKeyboardHeight() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // window.innerHeight - visualViewport.height = 키보드 높이
      setOffset(Math.max(0, Math.round(window.innerHeight - vv.height)));
    };

    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return offset;
}
