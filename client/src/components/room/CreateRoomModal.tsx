'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import Modal from '@/components/common/Modal';
import { roomsControllerCreate } from '@/api/rooms/rooms';
import RoomSettingsForm, { DEFAULT_FORM_VALUES } from '@/components/common/RoomSettingsForm';
import type { RoomFormValues } from '@/components/common/RoomSettingsForm';
import { Button } from '@/components/ui/button';
import { useFormValidation } from '@/hooks/useFormValidation';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

export default function CreateRoomModal({ open, onClose, onCreated }: CreateRoomModalProps) {
  const t = useTranslations('rooms');
  const [values, setValues] = useState<RoomFormValues>({ ...DEFAULT_FORM_VALUES });
  const [loading, setLoading] = useState(false);

  const rules = useMemo(
    () => ({
      name: (v: string) => !v.trim() && t('createModal.nameRequired'),
      password: (v: string, vals: RoomFormValues) => vals.isPrivate && !v && t('createModal.passwordRequired'),
    }),
    [],
  );
  const { errors, validate, clearError, clearAll } = useFormValidation<RoomFormValues>(rules);

  const set = useCallback(<K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = () => {
    setValues({ ...DEFAULT_FORM_VALUES });
    clearAll();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(values) || loading) return;
    setLoading(true);
    try {
      const room = await roomsControllerCreate({
        name: values.name.trim(),
        maxMembers: values.maxMembers,
        ...(values.isPrivate && values.password ? { isPrivate: true, password: values.password } : {}),
        crossfade: values.crossfade,
        defaultEnqueueEnabled: values.defaultEnqueueEnabled,
        defaultVoteSkipEnabled: values.defaultVoteSkipEnabled,
        maxSelectPerAdd: values.maxSelectPerAdd,
        autoDjEnabled: values.autoDjEnabled,
        ...(values.autoDjEnabled
          ? {
              autoDjMode: values.autoDjMode,
              autoDjThreshold: values.autoDjThreshold,
              autoDjFolderId: values.autoDjFolderId,
              autoDjFavFallbackMixed: values.autoDjFavFallbackMixed,
            }
          : {}),
      });
      onCreated(room.id);
    } catch {
      /* mutator가 toast 처리 */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={reset} className="max-w-sm sm:max-w-lg">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Modal.Header>
          <Modal.Title>{t('createModal.title')}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <RoomSettingsForm mode="create" values={values} onChange={set} errors={errors} onClearError={clearError} />
        </Modal.Body>

        <Modal.Footer>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : t('createModal.submit')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
