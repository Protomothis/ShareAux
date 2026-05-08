import { useCallback, useState } from 'react';

import type { PaletteItem } from '@/components/chat/ChatCommandPalette';

interface UseChatPaletteOptions {
  items: PaletteItem[];
  onSelect: (item: PaletteItem) => void;
}

export function useChatPalette({ items, onSelect }: UseChatPaletteOptions) {
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? items.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const open = useCallback((initialFilter = '') => {
    setFilter(initialFilter);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setFilter('');
  }, []);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      onSelect(item);
      close();
    },
    [onSelect, close],
  );

  return {
    visible,
    filter,
    filtered,
    open,
    close,
    setFilter,
    onSelect: handleSelect,
  };
}
