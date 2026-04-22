'use client';

import { Loader2, Ticket } from 'lucide-react';
import { PCaptcha } from '@/components/common/PCaptcha';
import { useEffect, useState } from 'react';

import { authControllerGuestLogin } from '@/api/auth/auth';
import { ApiError } from '@/api/mutator';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCaptcha } from '@/hooks/useCaptcha';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

interface GuestLoginFormProps {
  onSuccess: () => void;
  onBack: () => void;
  initialCode?: string;
}

export function GuestLoginForm({ onSuccess, onBack, initialCode }: GuestLoginFormProps) {
  const [code, setCode] = useState(initialCode ?? '');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha();

  useEffect(() => {
    captcha.fetchChallenge();
  }, [captcha.fetchChallenge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authControllerGuestLogin({ code, nickname, ...captcha.getCaptchaBody() });
      if (res) {
        useAuthStore.getState().init();
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiError && err.code) {
        setError((err.body.description ?? err.body.title ?? err.message) as string);
      } else {
        setError('입장에 실패했습니다');
      }
      captcha.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md lg:max-w-2xl">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sa-accent/20">
            <Ticket size={18} className="text-sa-accent" />
          </div>
          <div>
            <p className="font-semibold text-white">게스트 입장</p>
            <p className="text-xs text-sa-text-muted">
              {initialCode ? '닉네임만 입력하면 바로 입장할 수 있습니다' : '초대코드와 닉네임을 입력하세요'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField label="초대코드">
            <Input
              value={code}
              onChange={(e) => !initialCode && setCode(e.target.value)}
              placeholder="6~12자리 코드"
              maxLength={12}
              required
              readOnly={!!initialCode}
              autoFocus={!initialCode}
              className={cn(
                'w-full rounded-xl border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-sa-accent/50',
                initialCode && 'opacity-60 cursor-default',
              )}
            />
          </FormField>
          <FormField label="닉네임">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="방에서 사용할 이름"
              maxLength={30}
              required
              autoFocus={!!initialCode}
              className="w-full rounded-xl border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-sa-accent/50"
            />
          </FormField>

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

          {captcha.enabled && captcha.challenge && (
            <PCaptcha challenge={captcha.challenge} onVerified={captcha.onVerified} />
          )}

          <Button
            variant="accent"
            type="submit"
            disabled={loading || !code || !nickname || (captcha.enabled && !captcha.solved)}
            className="mt-1 py-2.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : '입장하기'}
          </Button>
        </form>
      </div>

      <Button variant="ghost" onClick={onBack} className="mt-4 w-full text-sa-text-muted hover:text-white">
        ← 다른 방법으로 로그인
      </Button>
    </div>
  );
}
