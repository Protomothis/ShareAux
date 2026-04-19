'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { BanInfo } from '@/api/model';
import { roomsControllerResetEnqueueCounts, roomsControllerUnban, roomsControllerUpdate } from '@/api/rooms/rooms';
import { customFetch } from '@/api/mutator';
import Modal from '@/components/common/Modal';
import RoomSettingsForm from '@/components/common/RoomSettingsForm';
import type { RoomFormValues } from '@/components/common/RoomSettingsForm';
import { FormSection } from '@/components/ui/form';
import type { AutoDjMode } from '@/types';
import { Button } from '@/components/ui/button';
import { useFormValidation } from '@/hooks/useFormValidation';

interface MuteInfo {
  userId: string;
  nickname: string;
  remainingSec: number;
  level: number;
}

interface SanctionsResponse {
  bans: BanInfo[];
  mutes: MuteInfo[];
}

interface RoomSettingsModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  enqueueWindowMin: number;
  enqueueLimitPerWindow: number;
  crossfade: boolean;
  maxSelectPerAdd: number;
  defaultEnqueueEnabled: boolean;
  defaultVoteSkipEnabled: boolean;
  autoDjEnabled: boolean;
  autoDjMode: string;
  autoDjThreshold: number;
  onSaved: () => void;
}

export default function RoomSettingsModal({
  open,
  onClose,
  roomId,
  roomName,
  enqueueWindowMin,
  enqueueLimitPerWindow,
  crossfade,
  maxSelectPerAdd,
  defaultEnqueueEnabled,
  defaultVoteSkipEnabled,
  autoDjEnabled,
  autoDjMode,
  autoDjThreshold,
  onSaved,
}: RoomSettingsModalProps) {
  const [values, setValues] = useState<RoomFormValues>({
    name: roomName,
    maxMembers: 10,
    isPrivate: false,
    password: '',
    crossfade,
    defaultEnqueueEnabled,
    defaultVoteSkipEnabled,
    maxSelectPerAdd,
    autoDjEnabled,
    autoDjMode: autoDjMode as AutoDjMode,
    autoDjThreshold,
    enqueueWindowMin,
    enqueueLimitPerWindow,
  });
  const [bans, setBans] = useState<BanInfo[]>([]);
  const [mutes, setMutes] = useState<MuteInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [resettingEnqueue, setResettingEnqueue] = useState(false);
  const [resettingBans, setResettingBans] = useState(false);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const [unmutingId, setUnmutingId] = useState<string | null>(null);

  const rules = useMemo(
    () => ({
      name: (v: string) => !v.trim() && '방 이름을 입력하세요',
    }),
    [],
  );
  const { errors, validate, clearError, clearAll } = useFormValidation<RoomFormValues>(rules);

  // props 변경 시 동기화
  useEffect(() => {
    if (!open) return;
    setValues({
      name: roomName,
      maxMembers: 10,
      isPrivate: false,
      password: '',
      crossfade,
      defaultEnqueueEnabled,
      defaultVoteSkipEnabled,
      maxSelectPerAdd,
      autoDjEnabled,
      autoDjMode: autoDjMode as AutoDjMode,
      autoDjThreshold,
      enqueueWindowMin,
      enqueueLimitPerWindow,
    });
    clearAll();
    customFetch<SanctionsResponse>('/rooms/' + roomId + '/sanctions')
      .then((res) => {
        setBans(res.bans ?? []);
        setMutes(res.mutes ?? []);
      })
      .catch(() => {
        setBans([]);
        setMutes([]);
      });
  }, [
    open,
    roomId,
    roomName,
    crossfade,
    maxSelectPerAdd,
    defaultEnqueueEnabled,
    defaultVoteSkipEnabled,
    autoDjEnabled,
    autoDjMode,
    autoDjThreshold,
    enqueueWindowMin,
    enqueueLimitPerWindow,
    clearAll,
  ]);

  const set = <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!validate(values) || saving) return;
    setSaving(true);
    try {
      await roomsControllerUpdate(roomId, {
        name: values.name,
        enqueueWindowMin: values.enqueueWindowMin,
        enqueueLimitPerWindow: values.enqueueLimitPerWindow,
        crossfade: values.crossfade,
        maxSelectPerAdd: values.maxSelectPerAdd,
        defaultEnqueueEnabled: values.defaultEnqueueEnabled,
        defaultVoteSkipEnabled: values.defaultVoteSkipEnabled,
        autoDjEnabled: values.autoDjEnabled,
        autoDjMode: values.autoDjMode,
        autoDjThreshold: values.autoDjThreshold,
      });
      onSaved();
      toast.success('설정이 저장되었습니다');
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleResetEnqueue = async () => {
    if (resettingEnqueue) return;
    setResettingEnqueue(true);
    try {
      await roomsControllerResetEnqueueCounts(roomId);
      toast.success('신청 횟수가 초기화되었습니다');
    } catch {
    } finally {
      setResettingEnqueue(false);
    }
  };

  const handleResetBans = async () => {
    if (resettingBans) return;
    setResettingBans(true);
    try {
      const res = await customFetch<{ cleared: number }>(`/rooms/${roomId}/bans`, { method: 'DELETE' });
      toast.success(`제재 목록이 초기화되었습니다 (${res.cleared}명)`);
      setBans([]);
      setMutes([]);
    } catch {
    } finally {
      setResettingBans(false);
    }
  };

  const handleUnban = async (userId: string) => {
    if (unbanningId) return;
    setUnbanningId(userId);
    try {
      await roomsControllerUnban(roomId, userId);
      setBans((prev) => prev.filter((b) => b.userId !== userId));
      toast.success('추방이 해제되었습니다');
    } catch {
    } finally {
      setUnbanningId(null);
    }
  };

  const handleUnmute = async (userId: string) => {
    if (unmutingId) return;
    setUnmutingId(userId);
    try {
      await customFetch(`/rooms/${roomId}/mute/${userId}`, { method: 'DELETE' });
      setMutes((prev) => prev.filter((m) => m.userId !== userId));
      toast.success('채팅 제한이 해제되었습니다');
    } catch {
    } finally {
      setUnmutingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-sm sm:max-w-lg">
      <Modal.Header>
        <Modal.Title>⚙️ 방 설정</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <RoomSettingsForm mode="edit" values={values} onChange={set} errors={errors} onClearError={clearError} />

        {/* 곡 신청 횟수 초기화 */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleResetEnqueue}
            disabled={resettingEnqueue}
          >
            {resettingEnqueue ? <Loader2 size={14} className="animate-spin" /> : '신청 횟수 초기화'}
          </Button>
        </div>

        {/* 제재 관리 */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <FormSection title="제재 관리">
            {bans.length === 0 && mutes.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">제재된 멤버가 없습니다</p>
            ) : (
              <>
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {mutes.map((m) => (
                    <div
                      key={`mute-${m.userId}`}
                      className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-sm">{m.nickname}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          🔇 채팅 제한 ({Math.ceil(m.remainingSec / 60)}분 남음)
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto shrink-0 p-0"
                        onClick={() => handleUnmute(m.userId)}
                        disabled={unmutingId === m.userId}
                      >
                        {unmutingId === m.userId ? <Loader2 size={12} className="animate-spin" /> : '해제'}
                      </Button>
                    </div>
                  ))}
                  {bans.map((b) => (
                    <div
                      key={`ban-${b.userId}`}
                      className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-sm">{b.nickname}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">🚫 추방됨</span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto shrink-0 p-0"
                        onClick={() => handleUnban(b.userId)}
                        disabled={unbanningId === b.userId}
                      >
                        {unbanningId === b.userId ? <Loader2 size={12} className="animate-spin" /> : '해제'}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs text-destructive"
                  onClick={handleResetBans}
                  disabled={resettingBans}
                >
                  {resettingBans ? <Loader2 size={12} className="animate-spin" /> : '전체 해제'}
                </Button>
              </>
            )}
          </FormSection>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : '저장'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
