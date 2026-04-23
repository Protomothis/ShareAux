'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import AnimatedBackground from '@/components/common/AnimatedBackground';
import { InviteCodeForm, InviteCodeResult } from '@/components/admin/invite-codes';
import type { InviteCodeFormData } from '@/components/admin/invite-codes';
import { RegisterForm } from '@/components/common/RegisterForm';
import { StepIndicator } from '@/components/common/StepIndicator';
import { Button } from '@/components/ui/button';
import { useCreateInviteCode } from '@/hooks/admin/useAdminInviteCodes';
import { getApiUrl } from '@/lib/urls';
import { Surface } from '@/components/ui/surface';

type Step = 'account' | 'invite' | 'complete';

export default function SetupPage() {
  const router = useRouter();
  const t = useTranslations('common.setup');
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('account');
  const [createdCode, setCreatedCode] = useState('');
  const createCode = useCreateInviteCode();

  useEffect(() => {
    const api = getApiUrl();
    fetch(`${api}/setup/status`)
      .then((r) => r.json())
      .then((data: { needsSetup: boolean }) => {
        if (!data.needsSetup) router.replace('/');
        else setReady(true);
      })
      .catch(() => router.replace('/'));
  }, [router]);

  const handleAccountCreated = useCallback(() => setStep('invite'), []);

  const handleInviteSubmit = useCallback(
    (data: InviteCodeFormData) => {
      createCode.mutate(
        { data },
        {
          onSuccess: (res) => {
            const code = (res as unknown as { code: string }).code;
            setCreatedCode(code);
            setStep('complete');
            toast.success(t('completeTitle'));
          },
        },
      );
    },
    [createCode, t],
  );

  const handleSkip = useCallback(() => {
    setStep('complete');
  }, []);

  if (!ready) return null;

  const steps = [t('stepAccount'), t('stepInvite'), t('stepComplete')];
  const stepIndex = step === 'account' ? 0 : step === 'invite' ? 1 : 2;

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />

      <div className="w-full max-w-md">
        {/* 스텝 인디케이터 */}
        <div className="mb-8 flex justify-center">
          <StepIndicator steps={steps} current={stepIndex} />
        </div>

        {/* Step 1: 관리자 계정 */}
        {step === 'account' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <span className="text-5xl">🎉</span>
              <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-3xl font-bold text-white">{t('title')}</h1>
              <p className="mt-2 text-sa-text-secondary">{t('subtitle')}</p>
            </div>
            <div className="w-full">
              <RegisterForm onSuccess={handleAccountCreated} onBack={() => {}} skipInviteCode />
            </div>
          </div>
        )}

        {/* Step 2: 초대 코드 */}
        {step === 'invite' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <span className="text-5xl">🎫</span>
              <h1 className="mt-4 text-2xl font-bold text-white">{t('inviteTitle')}</h1>
              <p className="mt-2 text-sm text-sa-text-secondary">{t('inviteSubtitle')}</p>
            </div>
            <Surface className="w-full">
              <InviteCodeForm onSubmit={handleInviteSubmit} isPending={createCode.isPending} />
            </Surface>
            <Button variant="ghost" className="text-sm text-sa-text-muted" onClick={handleSkip}>
              {t('skip')}
            </Button>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === 'complete' && (
          <Surface padding="lg">
            {createdCode ? (
              <InviteCodeResult
                code={createdCode}
                title={t('completeTitle')}
                description={t('completeDesc')}
                actionLabel={t('start')}
                onAction={() => router.push('/rooms')}
              />
            ) : (
              <div className="flex flex-col items-center gap-6 text-center">
                <span className="text-5xl">✅</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('completeTitle')}</h2>
                  <p className="mt-1 text-sm text-sa-text-secondary">{t('skippedDesc')}</p>
                </div>
                <Button variant="accent" className="w-full max-w-xs" onClick={() => router.push('/rooms')}>
                  {t('start')}
                </Button>
              </div>
            )}
          </Surface>
        )}
      </div>
    </main>
  );
}
