'use client';

import { Loader2, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PCaptcha } from '@/components/common/PCaptcha';
import { useEffect, useState } from 'react';

import { authControllerGuestLogin } from '@/api/auth/auth';
import { ApiError } from '@/api/mutator';
import type { ErrorCode } from '@/api/model';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCaptcha } from '@/hooks/useCaptcha';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { Surface } from '@/components/ui/surface';

interface GuestLoginFormProps {
  onSuccess: () => void;
  onBack: () => void;
  initialCode?: string;
}

export function GuestLoginForm({ onSuccess, onBack, initialCode }: GuestLoginFormProps) {
  const t = useTranslations('auth');
  const te = useTranslations('errorTitle');
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
        setError(te(err.code as ErrorCode) || (err.body.description as string));
      } else {
        setError(t('guestForm.errorFallback'));
      }
      captcha.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md lg:max-w-2xl">
      <Surface variant="elevated" padding="lg">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sa-accent/20">
            <Ticket size={18} className="text-sa-accent" />
          </div>
          <div>
            <p className="font-semibold text-white">{t('guestForm.title')}</p>
            <p className="text-xs text-sa-text-muted">
              {initialCode ? t('guestForm.subtitleWithCode') : t('guestForm.subtitleWithoutCode')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField label={t('guestForm.codeLabel')}>
            <Input
              value={code}
              onChange={(e) => !initialCode && setCode(e.target.value)}
              placeholder={t('guestForm.codePlaceholder')}
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
          <FormField label={t('guestForm.nicknameLabel')}>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('guestForm.nicknamePlaceholder')}
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
            {loading ? <Loader2 size={16} className="animate-spin" /> : t('guestForm.submitButton')}
          </Button>
        </form>
      </Surface>

      <Button variant="ghost" onClick={onBack} className="mt-4 w-full text-sa-text-muted hover:text-white">
        {t('backToMethods')}
      </Button>
    </div>
  );
}
