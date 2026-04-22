'use client';

import { Loader2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PCaptcha } from '@/components/common/PCaptcha';
import { useEffect, useState } from 'react';

import { authControllerRegister } from '@/api/auth/auth';
import { ApiError } from '@/api/mutator';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useCaptcha } from '@/hooks/useCaptcha';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useAuthStore } from '@/stores/auth';
import {
  AUTH_NICKNAME_MAX,
  AUTH_NICKNAME_MIN,
  AUTH_PASSWORD_MIN,
  AUTH_USERNAME_MAX,
  AUTH_USERNAME_MIN,
  AUTH_USERNAME_REGEX,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

interface RegisterFormProps {
  onSuccess: () => void;
  onBack: () => void;
  initialCode?: string;
  skipInviteCode?: boolean;
}

interface RegisterValues {
  code: string;
  username: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

const getRules = (t: ReturnType<typeof useTranslations<'auth'>>) => ({
  code: (v: string) => !v.trim() && t('registerForm.codeRequired'),
  username: (v: string) => {
    if (v.length < AUTH_USERNAME_MIN) return t('registerForm.usernameMinLength', { min: AUTH_USERNAME_MIN });
    if (v.length > AUTH_USERNAME_MAX) return t('registerForm.usernameMaxLength', { max: AUTH_USERNAME_MAX });
    if (!AUTH_USERNAME_REGEX.test(v)) return t('registerForm.usernamePattern');
    return false;
  },
  password: (v: string) =>
    v.length < AUTH_PASSWORD_MIN && t('registerForm.passwordMinLength', { min: AUTH_PASSWORD_MIN }),
  confirmPassword: (v: string, vals: RegisterValues) =>
    v !== vals.password && t('registerForm.confirmPasswordMismatch'),
  nickname: (v: string) => {
    if (v.length < AUTH_NICKNAME_MIN) return t('registerForm.nicknameMinLength', { min: AUTH_NICKNAME_MIN });
    if (v.length > AUTH_NICKNAME_MAX) return t('registerForm.nicknameMaxLength', { max: AUTH_NICKNAME_MAX });
    return false;
  },
});

export function RegisterForm({ onSuccess, onBack, initialCode, skipInviteCode }: RegisterFormProps) {
  const t = useTranslations('auth');
  const rules = getRules(t);
  const [values, setValues] = useState<RegisterValues>({
    code: initialCode ?? '',
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const { errors, validate, clearError, setError } = useFormValidation<RegisterValues>({
    ...rules,
    code: skipInviteCode ? () => false : rules.code,
  });
  const captcha = useCaptcha();

  useEffect(() => {
    captcha.fetchChallenge();
  }, [captcha.fetchChallenge]);

  const onChange = (field: keyof RegisterValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearError(field);
    setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(values)) return;
    setLoading(true);
    setServerError('');
    try {
      await authControllerRegister({ ...values, ...captcha.getCaptchaBody() });
      useAuthStore.getState().init();
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code) {
        const fieldMap: Partial<Record<string, keyof RegisterValues>> = {
          AUTH_003: 'code',
          AUTH_004: 'code',
          AUTH_005: 'code',
          AUTH_006: 'code',
          AUTH_007: 'code',
          AUTH_008: 'username',
        };
        const field = fieldMap[err.code];
        if (field) setError(field, err.body.description as string);
        else setServerError((err.body.description ?? err.body.title ?? err.message) as string);
      } else {
        setServerError(t('registerForm.errorFallback'));
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
            <UserPlus size={18} className="text-sa-accent" />
          </div>
          <div>
            <p className="font-semibold text-white">{t('registerForm.title')}</p>
            <p className="text-xs text-sa-text-muted">{t('registerForm.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!skipInviteCode && (
            <FormField label={t('registerForm.codeLabel')} error={errors.code}>
              <Input
                value={values.code}
                onChange={(e) => onChange('code', e.target.value)}
                placeholder={t('registerForm.codePlaceholder')}
                required
                readOnly={!!initialCode}
                autoFocus={!initialCode}
                className={cn(initialCode && 'cursor-default opacity-60')}
              />
            </FormField>
          )}
          <FormField label={t('registerForm.usernameLabel')} error={errors.username}>
            <Input
              value={values.username}
              onChange={(e) => onChange('username', e.target.value)}
              placeholder={t('registerForm.usernamePlaceholder')}
              maxLength={AUTH_USERNAME_MAX}
              required
              autoFocus={!!initialCode || skipInviteCode}
            />
          </FormField>
          <FormField label={t('registerForm.nicknameLabel')} error={errors.nickname}>
            <Input
              value={values.nickname}
              onChange={(e) => onChange('nickname', e.target.value)}
              placeholder={t('registerForm.nicknamePlaceholder')}
              maxLength={AUTH_NICKNAME_MAX}
              required
            />
          </FormField>
          <FormField label={t('registerForm.passwordLabel')} error={errors.password}>
            <PasswordInput
              value={values.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder={t('registerForm.passwordPlaceholder')}
              required
            />
          </FormField>
          <FormField label={t('registerForm.confirmPasswordLabel')} error={errors.confirmPassword}>
            <PasswordInput
              value={values.confirmPassword}
              onChange={(e) => onChange('confirmPassword', e.target.value)}
              placeholder={t('registerForm.confirmPasswordPlaceholder')}
              required
            />
          </FormField>

          {serverError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{serverError}</p>}

          {captcha.enabled && captcha.challenge && (
            <PCaptcha challenge={captcha.challenge} onVerified={captcha.onVerified} />
          )}

          <Button
            variant="accent"
            type="submit"
            disabled={loading || (captcha.enabled && !captcha.solved)}
            className="mt-1 py-2.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : t('registerForm.submitButton')}
          </Button>
        </form>
      </div>

      {!skipInviteCode && (
        <Button variant="ghost" onClick={onBack} className="mt-4 w-full text-sa-text-muted hover:text-white">
          {t('backToMethods')}
        </Button>
      )}
    </div>
  );
}
