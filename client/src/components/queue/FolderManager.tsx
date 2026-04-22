'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  favoritesControllerCreateFolder,
  favoritesControllerDeleteFolder,
  favoritesControllerUpdateFolder,
  useFavoritesControllerListFolders,
} from '@/api/favorites/favorites';
import { FolderItemColor } from '@/api/model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { folderColorClass, FOLDER_COLOR_MAP } from '@/lib/folder-colors';
import { cn } from '@/lib/utils';

import Modal from '../common/Modal';
import { useTranslations } from 'next-intl';

interface FolderManagerProps {
  onClose: () => void;
}

const COLOR_OPTIONS = Object.keys(FOLDER_COLOR_MAP) as string[];

export function FolderManager({ onClose }: FolderManagerProps) {
  const t = useTranslations('folders');
  const { data: folders = [], refetch } = useFavoritesControllerListFolders();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(FolderItemColor.blue);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(FolderItemColor.blue);

  const handleCreate = async () => {
    if (newName.length < 2 || newName.length > 20) return;
    await favoritesControllerCreateFolder({ name: newName, color: newColor as unknown as undefined });
    setNewName('');
    setCreating(false);
    refetch();
    toast.success(t('created'));
  };

  const handleUpdate = async (id: string) => {
    if (editName.length < 2 || editName.length > 20) return;
    await favoritesControllerUpdateFolder(id, { name: editName, color: editColor as unknown as undefined });
    setEditingId(null);
    refetch();
    toast.success(t('updated'));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    await favoritesControllerDeleteFolder(id);
    refetch();
    toast.success(t('deleted'));
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="sm:max-w-sm">
      <Modal.Header>
        <Modal.Title>{t('title')}</Modal.Title>
        <Modal.Description>{t('count', { count: folders.length })}</Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-2">
          {/* 폴더 목록 */}
          {folders.map((f) =>
            editingId === f.id ? (
              <FolderForm
                key={f.id}
                name={editName}
                color={editColor}
                onNameChange={setEditName}
                onColorChange={setEditColor}
                onSubmit={() => handleUpdate(f.id)}
                onCancel={() => setEditingId(null)}
                submitLabel={t('save')}
              />
            ) : (
              <div key={f.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
                <span className={cn('size-3 shrink-0 rounded-full', folderColorClass(f.color))} />
                <span className="flex-1 truncate text-sm text-white">{f.name}</span>
                <span className="text-xs text-sa-text-muted">{t('trackCount', { count: f.trackCount })}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(f.id);
                    setEditName(f.name);
                    setEditColor(f.color);
                    setCreating(false);
                  }}
                  className="h-7 w-7 p-0 text-sa-text-muted hover:text-white"
                >
                  <Pencil size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(f.id)}
                  className="h-7 w-7 p-0 text-sa-text-muted hover:text-red-400"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            ),
          )}

          {/* 새 폴더 */}
          {creating ? (
            <FolderForm
              name={newName}
              color={newColor}
              onNameChange={setNewName}
              onColorChange={setNewColor}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
              submitLabel={t('create')}
            />
          ) : (
            folders.length < 20 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setCreating(true);
                  setEditingId(null);
                  setNewName('');
                  setNewColor(FolderItemColor.blue);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-xs text-sa-text-muted hover:border-white/20 hover:text-white"
              >
                <Plus size={14} />
                {t('newFolder')}
              </Button>
            )
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}

function FolderForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  name: string;
  color: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const t = useTranslations('folders');
  return (
    <div className="space-y-2 rounded-lg bg-white/5 p-3">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t('placeholder')}
        maxLength={20}
        className="h-8 rounded-lg border-white/10 bg-white/5 text-xs"
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        autoFocus
      />
      <div className="flex flex-wrap gap-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={cn(
              'size-6 rounded-full border-2 transition touch-manipulation',
              FOLDER_COLOR_MAP[c],
              color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100',
            )}
          />
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-3 text-xs">
          {t('cancel')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSubmit}
          disabled={name.length < 2}
          className="h-7 px-3 text-xs text-sa-accent"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
