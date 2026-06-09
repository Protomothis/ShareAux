'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { favoritesControllerBulkRemove, favoritesControllerMoveFavorite } from '@/api/favorites/favorites';
import type { FolderItem } from '@/api/model';
import { Button } from '@/components/common/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FavoritesEditBarProps {
  removeSet: Set<string>;
  folders: FolderItem[];
  onDone: () => void;
  refetch: () => void;
  refetchFolders: () => void;
}

export function FavoritesEditBar({ removeSet, folders, onDone, refetch, refetchFolders }: FavoritesEditBarProps) {
  const t = useTranslations('favorites');

  return (
    <div className="flex shrink-0 items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="text-xs text-sa-text-secondary">{t('selected', { count: removeSet.size })}</span>
      <div className="flex items-center gap-1.5">
        {folders.length > 0 && (
          <Select
            onValueChange={async (val) => {
              const v = val as string;
              const target = v === '__none__' ? null : v;
              for (const sid of removeSet) await favoritesControllerMoveFavorite(sid, { folderId: target });
              const count = removeSet.size;
              onDone();
              refetch();
              refetchFolders();
              toast.success(t('movedCount', { count }));
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-auto min-w-20 text-xs">
              <SelectValue placeholder={t('moveTo')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('uncategorized')}</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await favoritesControllerBulkRemove({ sourceIds: [...removeSet] });
            const count = removeSet.size;
            onDone();
            toast.success(t('removedCount', { count }));
            refetch();
            refetchFolders();
          }}
          className="h-7 gap-1 px-2 text-xs text-red-400 hover:text-red-300"
        >
          <Trash2 size={12} />
          {t('removeFavorite')}
        </Button>
      </div>
    </div>
  );
}
