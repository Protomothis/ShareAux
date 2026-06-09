'use client';

import { FolderOpen, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortKey = 'recent' | 'oldest' | 'name' | 'artist';

interface FavoritesToolbarProps {
  filter: string;
  setFilter: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onOpenFolderManager: () => void;
  onExitEdit: () => void;
}

export function FavoritesToolbar({
  filter,
  setFilter,
  sort,
  setSort,
  editMode,
  onOpenFolderManager,
  onExitEdit,
  setEditMode,
}: FavoritesToolbarProps) {
  const t = useTranslations('favorites');

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sa-text-muted" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="h-8 rounded-lg border-white/10 bg-white/5 pl-8 text-xs"
        />
      </div>
      <Select value={sort} onValueChange={(val) => setSort(val as SortKey)}>
        <SelectTrigger size="sm" className="h-8 w-auto min-w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">{t('sortRecent')}</SelectItem>
          <SelectItem value="oldest">{t('sortOldest')}</SelectItem>
          <SelectItem value="name">{t('sortName')}</SelectItem>
          <SelectItem value="artist">{t('sortArtist')}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={onOpenFolderManager} className="h-8 px-2 text-xs">
        <FolderOpen size={12} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (editMode) {
            onExitEdit();
          } else {
            setEditMode(true);
          }
        }}
        className="h-8 px-2 text-xs"
      >
        {editMode ? t('done') : t('edit')}
      </Button>
    </div>
  );
}
