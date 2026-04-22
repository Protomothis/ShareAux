'use client';

import { Loader2, LogIn } from 'lucide-react';
import { PCaptcha } from '@/components/common/PCaptcha';
import { useEffect, useState } from 'react';

import { authControllerLogin } from '@/api/auth/auth';
import { ApiError } from '@/api/mutator';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuthConfig } from '@/hooks/useAuthConfig';
import { useCaptcha } from '@/hooks/useCaptcha';
import { useFormValidation } from '@/hooks/useFormValidation';
import { getApiUrl } from '@/lib/urls';
import { useAuthStore } from '@/stores/auth';

interface LoginFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

interface LoginValues {
  username: string;
  password: string;
}

const rules = {
  username: (v: string) => !v.trim() && '아이디를 입력하세요',
  password: (v: string) => !v.trim() && '비밀번호를 입력하세요',
};

export function LoginForm({ onSuccess, onBack }: LoginFormProps) {
  const [values, setValues] = useState<LoginValues>({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const { errors, validate, clearError } = useFormValidation<LoginValues>(rules);
  const authConfig = useAuthConfig();
  const captcha = useCaptcha();

  useEffect(() => {
    captcha.fetchChallenge();
  }, [captcha.fetchChallenge]);

  const onChange = (field: keyof LoginValues, value: string) => {
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
      await authControllerLogin({ ...values, ...captcha.getCaptchaBody() });
      useAuthStore.getState().init();
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code) {
        setServerError((err.body.description ?? err.body.title ?? err.message) as string);
      } else {
        setServerError('로그인에 실패했습니다');
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
            <LogIn size={18} className="text-sa-accent" />
          </div>
          <div>
            <p className="font-semibold text-white">로그인</p>
            <p className="text-xs text-sa-text-muted">아이디와 비밀번호로 로그인하세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField label="아이디" error={errors.username}>
            <Input
              value={values.username}
              onChange={(e) => onChange('username', e.target.value)}
              placeholder="아이디를 입력하세요"
              required
              autoFocus
            />
          </FormField>
          <FormField label="비밀번호" error={errors.password}>
            <PasswordInput
              value={values.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="비밀번호를 입력하세요"
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
            {loading ? <Loader2 size={16} className="animate-spin" /> : '로그인'}
          </Button>

          {authConfig.google && (
            <>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] text-sa-text-muted">또는</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <a
                href={`${getApiUrl()}/auth/google`}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
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
                Google로 로그인
              </a>
              <p className="text-center text-[10px] text-sa-text-muted">연동된 계정만 가능</p>
            </>
          )}
        </form>
      </div>

      <Button variant="ghost" onClick={onBack} className="mt-4 w-full text-sa-text-muted hover:text-white">
        ← 다른 방법으로 로그인
      </Button>
    </div>
  );
}
