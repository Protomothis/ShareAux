'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import AnimatedBackground from '@/components/common/AnimatedBackground';
import { Button } from '@/components/ui/button';

import { useAuthStore } from '@/stores/auth';

export default function AuthCallbackPage() {
  const t = useTranslations('authCallback');
  const router = useRouter();
  const calledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      setError(error);
      return;
    }

    const linked = params.get('linked');
    if (linked) {
      router.replace('/rooms');
      return;
    }

    const code = params.get('code');
    if (!code) {
      router.replace('/login');
      return;
    }

    fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    })
      .then(async (r) => {
        if (r.ok) {
          useAuthStore.getState().init();
          const redirect = localStorage.getItem('redirectAfterLogin') || '/rooms';
          localStorage.removeItem('redirectAfterLogin');
          localStorage.removeItem('inviteRoomId');
          router.replace(redirect);
        } else {
          const data = (await r.json().catch(() => null)) as { message?: string } | null;
          const msg = data?.message ?? t('loginFailed');
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
        }
      })
      .catch(() => router.replace('/login?error=' + encodeURIComponent(t('loginFailed'))));
  }, [router]);

  const ERROR_MESSAGES: Record<string, { title: string; desc: string }> = {
    default: { title: t('defaultTitle'), desc: t('defaultDesc') },
  };

  const getErrorInfo = (msg: string) => {
    if (msg.includes('연동되지 않았습니다')) return { title: t('notLinkedTitle'), desc: msg };
    if (msg.includes('not configured') || msg.includes('비활성'))
      return { title: t('googleDisabledTitle'), desc: t('googleDisabledDesc') };
    if (msg.includes('이미 다른 계정')) return { title: t('alreadyLinkedTitle'), desc: msg };
    return { title: ERROR_MESSAGES.default.title, desc: msg || ERROR_MESSAGES.default.desc };
  };

  if (error) {
    const info = getErrorInfo(error);
    return (
      <main className="relative flex min-h-svh items-center justify-center">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{info.title}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-sa-text-muted">{info.desc}</p>
          </div>
          <Button variant="secondary" onClick={() => router.replace('/login')}>
            로그인으로 돌아가기
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center">
      <AnimatedBackground />
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-sa-accent/30" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-sa-accent/20 backdrop-blur-sm">
            <span className="text-2xl">🎧</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{t('processing')}</p>
          <p className="mt-1 text-sm text-sa-text-muted">{t('wait')}</p>
        </div>
      </div>
    </main>
  );
}
