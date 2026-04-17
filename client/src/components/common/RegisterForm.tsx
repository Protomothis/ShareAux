'use client';

import { Loader2, UserPlus } from 'lucide-react';
import { PCaptcha } from '@/components/common/PCaptcha';
import { useEffect, useState } from 'react';

import { authControllerRegister } from '@/api/auth/auth';
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

const rules = {
  code: (v: string) => !v.trim() && '초대코드를 입력하세요',
  username: (v: string) => {
    if (v.length < AUTH_USERNAME_MIN) return `아이디는 ${AUTH_USERNAME_MIN}자 이상이어야 합니다`;
    if (v.length > AUTH_USERNAME_MAX) return `아이디는 ${AUTH_USERNAME_MAX}자 이하여야 합니다`;
    if (!AUTH_USERNAME_REGEX.test(v)) return '영소문자, 숫자, 밑줄(_)만 사용할 수 있습니다';
    return false;
  },
  password: (v: string) => v.length < AUTH_PASSWORD_MIN && `비밀번호는 ${AUTH_PASSWORD_MIN}자 이상이어야 합니다`,
  confirmPassword: (v: string, vals: RegisterValues) => v !== vals.password && '비밀번호가 일치하지 않습니다',
  nickname: (v: string) => {
    if (v.length < AUTH_NICKNAME_MIN) return `닉네임은 ${AUTH_NICKNAME_MIN}자 이상이어야 합니다`;
    if (v.length > AUTH_NICKNAME_MAX) return `닉네임은 ${AUTH_NICKNAME_MAX}자 이하여야 합니다`;
    return false;
  },
};

export function RegisterForm({ onSuccess, onBack, initialCode, skipInviteCode }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterValues>({
    code: initialCode ?? '',
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const { errors, validate, clearError } = useFormValidation<RegisterValues>({
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
      setServerError(err instanceof Error ? err.message : '회원가입에 실패했습니다');
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
            <p className="font-semibold text-white">회원가입</p>
            <p className="text-xs text-sa-text-muted">초대코드로 계정을 만드세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!skipInviteCode && (
            <FormField label="초대코드" error={errors.code}>
              <Input
                value={values.code}
                onChange={(e) => onChange('code', e.target.value)}
                placeholder="초대코드를 입력하세요"
                required
                readOnly={!!initialCode}
                autoFocus={!initialCode}
                className={cn(initialCode && 'cursor-default opacity-60')}
              />
            </FormField>
          )}
          <FormField label="아이디" error={errors.username}>
            <Input
              value={values.username}
              onChange={(e) => onChange('username', e.target.value)}
              placeholder="영소문자, 숫자, 밑줄 (4~20자)"
              maxLength={AUTH_USERNAME_MAX}
              required
              autoFocus={!!initialCode || skipInviteCode}
            />
          </FormField>
          <FormField label="닉네임" error={errors.nickname}>
            <Input
              value={values.nickname}
              onChange={(e) => onChange('nickname', e.target.value)}
              placeholder="방에서 사용할 이름 (2~20자)"
              maxLength={AUTH_NICKNAME_MAX}
              required
            />
          </FormField>
          <FormField label="비밀번호" error={errors.password}>
            <PasswordInput
              value={values.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="8자 이상"
              required
            />
          </FormField>
          <FormField label="비밀번호 확인" error={errors.confirmPassword}>
            <PasswordInput
              value={values.confirmPassword}
              onChange={(e) => onChange('confirmPassword', e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
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
            {loading ? <Loader2 size={16} className="animate-spin" /> : '가입하기'}
          </Button>
        </form>
      </div>

      {!skipInviteCode && (
        <Button variant="ghost" onClick={onBack} className="mt-4 w-full text-sa-text-muted hover:text-white">
          ← 다른 방법으로 로그인
        </Button>
      )}
    </div>
  );
}
