'use client';

import { LogIn, Ticket, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import AnimatedBackground from '@/components/common/AnimatedBackground';
import { GuestLoginForm } from '@/components/common/GuestLoginForm';
import { LoginCard } from '@/components/common/LoginCard';
import { LoginForm } from '@/components/common/LoginForm';
import { RegisterForm } from '@/components/common/RegisterForm';
import { ServerStatusScreen } from '@/components/common/ServerStatusScreen';
import { ShareAuxLogo } from '@/components/common/ShareAuxLogo';
import { useServerStatus } from '@/hooks/useServerStatus';
import { getApiUrl } from '@/lib/urls';

type Mode = 'select' | 'login' | 'register' | 'guest';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const codeParam = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const [mode, setMode] = useState<Mode>(codeParam ? 'register' : 'select');
  const [inviteRoomName, setInviteRoomName] = useState<string | null>(null);
  const { connState, retry } = useServerStatus();

  useEffect(() => {
    const inviteRoomId = localStorage.getItem('inviteRoomId');
    if (!inviteRoomId) return;
    fetch(`${getApiUrl()}/rooms/${inviteRoomId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { name?: string } | null) => {
        if (data?.name) setInviteRoomName(data.name);
      })
      .catch(() => {});
  }, []);

  const handleSuccess = () => {
    const redirect = localStorage.getItem('redirectAfterLogin') || '/rooms';
    localStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('inviteRoomId');
    router.push(redirect);
  };

  if (connState !== 'connected') return <ServerStatusScreen connState={connState} onRetry={retry} />;

  return (
    <>
      <AnimatedBackground />
      <motion.main
        layout
        transition={{ layout: { duration: 0.3 } }}
        className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto px-4 py-8"
      >
        <motion.div
          layout
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mb-10 text-center"
        >
          <ShareAuxLogo className="mx-auto h-16 w-auto md:h-20" />
          <p className="mt-2 text-sm text-sa-text-muted">{t('tagline')}</p>
          {inviteRoomName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-xl border border-sa-accent/30 bg-sa-accent/10 px-4 py-2.5 text-sm text-sa-accent"
            >
              🎵 {t('invitedTo', { roomName: inviteRoomName })}
            </motion.div>
          )}
          {errorParam && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
            >
              {errorParam}
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm lg:max-w-md"
            >
              <LoginCard
                icon={LogIn}
                title={t('loginTitle')}
                description={t('loginDescription')}
                onClick={() => setMode('login')}
              />
              <LoginCard
                icon={UserPlus}
                title={t('registerTitle')}
                description={t('registerDescription')}
                onClick={() => setMode('register')}
              />
              <LoginCard
                icon={Ticket}
                title={t('guestTitle')}
                description={t('guestDescription')}
                onClick={() => setMode('guest')}
              />
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 flex w-full max-w-xs items-center justify-center sm:max-w-sm lg:max-w-md"
            >
              {mode === 'login' && <LoginForm onSuccess={handleSuccess} onBack={() => setMode('select')} />}
              {mode === 'register' && (
                <RegisterForm
                  onSuccess={handleSuccess}
                  onBack={() => setMode('select')}
                  initialCode={codeParam ?? undefined}
                />
              )}
              {mode === 'guest' && (
                <GuestLoginForm
                  onSuccess={handleSuccess}
                  onBack={() => setMode('select')}
                  initialCode={codeParam ?? undefined}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 mt-8 flex gap-3 text-xs text-sa-text-muted">
          <a href="/privacy" className="hover:text-sa-text-secondary hover:underline">
            {tc('privacyPolicy')}
          </a>
          <span>·</span>
          <a href="/terms" className="hover:text-sa-text-secondary hover:underline">
            {tc('terms')}
          </a>
        </div>
      </motion.main>
    </>
  );
}
