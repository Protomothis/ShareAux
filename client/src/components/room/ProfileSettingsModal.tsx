'use client';

import { ArrowLeft, ChevronRight, KeyRound, Link2, Loader2, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import Modal from '@/components/common/Modal';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useAuthConfig } from '@/hooks/useAuthConfig';
import type { ApiError } from '@/api/mutator';
import {
  authControllerDeleteAccount,
  authControllerMe,
  authControllerUpdateNickname,
  authControllerUpdatePassword,
} from '@/api/auth/auth';
import { useAuthStore } from '@/stores/auth';

type Page = 'menu' | 'nickname' | 'password' | 'google' | 'delete';

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface MeResponse {
  userId: string;
  email?: string | null;
  nickname: string;
}

// ─── Menu Item ──────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function MenuItem({ icon, label, description, onClick, variant = 'default' }: MenuItemProps) {
  const isDanger = variant === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 ${isDanger ? 'text-red-400' : 'text-white'}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
    </button>
  );
}

// ─── Sub-page Header ────────────────────────────────────

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon-xs" onClick={onBack}>
        <ArrowLeft size={16} />
      </Button>
      <Modal.Title>{title}</Modal.Title>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function ProfileSettingsModal({ open, onClose }: ProfileSettingsModalProps) {
  const [page, setPage] = useState<Page>('menu');
  const [me, setMe] = useState<MeResponse | null>(null);
  const role = useAuthStore((s) => s.role);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setPage('menu');
      return;
    }
    (authControllerMe() as unknown as Promise<MeResponse>).then(setMe).catch(() => {});
  }, [open]);

  const done = useCallback(
    (msg: string) => {
      toast.success(msg);
      onClose();
    },
    [onClose],
  );

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-sm">
      {page === 'menu' && <MenuPage setPage={setPage} me={me} role={role} />}
      {page === 'nickname' && <NicknamePage me={me} onBack={() => setPage('menu')} onDone={done} />}
      {page === 'password' && <PasswordPage onBack={() => setPage('menu')} onDone={done} />}
      {page === 'google' && <GooglePage me={me} onBack={() => setPage('menu')} />}
      {page === 'delete' && <DeletePage onBack={() => setPage('menu')} router={router} />}
    </Modal>
  );
}

// ─── Pages ──────────────────────────────────────────────

function MenuPage({ setPage, me, role }: { setPage: (p: Page) => void; me: MeResponse | null; role?: string }) {
  const authConfig = useAuthConfig();
  const isGuest = role === 'guest';
  return (
    <>
      <Modal.Header>
        <Modal.Title>프로필 설정</Modal.Title>
      </Modal.Header>
      <Modal.Body className="-mx-0 space-y-0.5">
        <MenuItem
          icon={<User size={16} />}
          label="닉네임 변경"
          description={me?.nickname}
          onClick={() => setPage('nickname')}
        />
        {!isGuest && (
          <MenuItem
            icon={<KeyRound size={16} />}
            label="비밀번호 변경"
            description="계정 비밀번호"
            onClick={() => setPage('password')}
          />
        )}
        {!isGuest && authConfig.google && (
          <MenuItem
            icon={<Link2 size={16} />}
            label="Google 연동"
            description={me?.email ?? '미연동'}
            onClick={() => setPage('google')}
          />
        )}
        {!isGuest && role !== 'superAdmin' && (
          <>
            <div className="my-1 h-px bg-white/[0.06]" />
            <MenuItem
              icon={<Trash2 size={14} />}
              label="회원 탈퇴"
              variant="danger"
              onClick={() => setPage('delete')}
            />
          </>
        )}
      </Modal.Body>
    </>
  );
}

function NicknamePage({
  me,
  onBack,
  onDone,
}: {
  me: MeResponse | null;
  onBack: () => void;
  onDone: (msg: string) => void;
}) {
  const [value, setValue] = useState(me?.nickname ?? '');
  const [loading, setLoading] = useState(false);
  const { errors, validate, clearError } = useFormValidation<{ nickname: string }>({
    nickname: (v) => (!v.trim() ? '닉네임을 입력해주세요' : v.trim().length < 2 ? '2자 이상' : false),
  });

  const handleSave = async () => {
    if (!validate({ nickname: value })) return;
    setLoading(true);
    try {
      await authControllerUpdateNickname({ nickname: value.trim() });
      useAuthStore.getState().init();
      onDone('닉네임이 변경되었습니다');
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <SubHeader title="닉네임 변경" onBack={onBack} />
      </Modal.Header>
      <Modal.Body>
        <FormField label="닉네임" error={errors.nickname}>
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              clearError('nickname');
            }}
            placeholder="닉네임"
            maxLength={20}
            autoFocus
          />
        </FormField>
      </Modal.Body>
      <Modal.Footer>
        <Button className="w-full" onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : '저장'}
        </Button>
      </Modal.Footer>
    </>
  );
}

function PasswordPage({ onBack, onDone }: { onBack: () => void; onDone: (msg: string) => void }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { errors, validate, clearError } = useFormValidation<{ cur: string; next: string; confirm: string }>({
    cur: (v) => !v && '현재 비밀번호를 입력해주세요',
    next: (v) => (!v ? '새 비밀번호를 입력해주세요' : v.length < 8 ? '8자 이상' : false),
    confirm: (v, vals) => (!v ? '확인을 입력해주세요' : v !== vals.next ? '비밀번호 불일치' : false),
  });

  const handleSave = async () => {
    if (!validate({ cur, next, confirm })) return;
    setLoading(true);
    try {
      await authControllerUpdatePassword({ currentPassword: cur, newPassword: next });
      onDone('비밀번호가 변경되었습니다');
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <SubHeader title="비밀번호 변경" onBack={onBack} />
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <FormField label="현재 비밀번호" error={errors.cur}>
          <PasswordInput
            value={cur}
            onChange={(e) => {
              setCur(e.target.value);
              clearError('cur');
            }}
            placeholder="현재 비밀번호"
            autoFocus
          />
        </FormField>
        <FormField label="새 비밀번호" error={errors.next}>
          <PasswordInput
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              clearError('next');
            }}
            placeholder="8자 이상"
          />
        </FormField>
        <FormField label="비밀번호 확인" error={errors.confirm}>
          <PasswordInput
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clearError('confirm');
            }}
            placeholder="비밀번호 확인"
          />
        </FormField>
      </Modal.Body>
      <Modal.Footer>
        <Button className="w-full" onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : '변경'}
        </Button>
      </Modal.Footer>
    </>
  );
}

function GooglePage({ me, onBack }: { me: MeResponse | null; onBack: () => void }) {
  const linked = !!me?.email;
  return (
    <>
      <Modal.Header>
        <SubHeader title="Google 연동" onBack={onBack} />
      </Modal.Header>
      <Modal.Body>
        {linked ? (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
            <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{me?.email}</p>
              <p className="text-[11px] text-green-400">연동됨</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Google 계정을 연동하면 Google로도 로그인할 수 있습니다.</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = `${window.location.origin}/api/auth/link-google`;
              }}
            >
              Google 계정 연동하기
            </Button>
          </div>
        )}
      </Modal.Body>
    </>
  );
}

function DeletePage({ onBack, router }: { onBack: () => void; router: ReturnType<typeof useRouter> }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      setError('비밀번호를 입력해주세요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authControllerDeleteAccount({ password });
      useAuthStore.getState().clear();
      router.push('/login');
    } catch (e) {
      setError((e as ApiError).message || '탈퇴 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <SubHeader title="회원 탈퇴" onBack={onBack} />
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.</p>
        </div>
        <FormField label="비밀번호 확인" error={error}>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="현재 비밀번호"
          />
        </FormField>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="destructive" className="w-full" onClick={() => setConfirmOpen(true)} disabled={!password}>
          회원 탈퇴
        </Button>
      </Modal.Footer>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} className="sm:max-w-xs">
        <Modal.Header>
          <Modal.Title>정말 탈퇴하시겠습니까?</Modal.Title>
          <Modal.Description>이 작업은 되돌릴 수 없습니다.</Modal.Description>
        </Modal.Header>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : '탈퇴하기'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
