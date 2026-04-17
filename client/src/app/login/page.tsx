'use client';

import { LogIn, Ticket, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import AnimatedBackground from '@/components/common/AnimatedBackground';
import { GuestLoginForm } from '@/components/common/GuestLoginForm';
import { LoginCard } from '@/components/common/LoginCard';
import { LoginForm } from '@/components/common/LoginForm';
import { RegisterForm } from '@/components/common/RegisterForm';
import { ShareAuxLogo } from '@/components/common/ShareAuxLogo';
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
  const codeParam = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const [mode, setMode] = useState<Mode>(codeParam ? 'register' : 'select');
  const [ready, setReady] = useState(false);
  const [inviteRoomName, setInviteRoomName] = useState<string | null>(null);

  useEffect(() => {
    const api = getApiUrl();

    const inviteRoomId = localStorage.getItem('inviteRoomId');
    if (inviteRoomId) {
      fetch(`${api}/rooms/${inviteRoomId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { name?: string } | null) => {
          if (data?.name) setInviteRoomName(data.name);
        })
        .catch(() => {});
    }

    fetch(`${api}/setup/status`)
      .then((r) => r.json())
      .then((data: { needsSetup: boolean }) => {
        if (data.needsSetup) router.replace('/setup');
        else setReady(true);
      })
      .catch(() => setReady(true));

    // bfcache 복원 시 강제 리렌더링
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setReady(true);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [router]);

  const handleSuccess = () => {
    const redirect = localStorage.getItem('redirectAfterLogin') || '/rooms';
    localStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('inviteRoomId');
    router.push(redirect);
  };

  if (!ready)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-sa-bg-primary">
        <div style={{ animation: 'shimmer-opacity 2s ease-in-out infinite' }}>
          <ShareAuxLogo className="h-14 w-auto" />
        </div>
        <style>{`@keyframes shimmer-opacity { 0%, 100% { opacity: 0.3 } 50% { opacity: 1 } }`}</style>
      </div>
    );

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
          <p className="mt-2 text-sm text-sa-text-muted">함께 듣는 음악, 함께 만드는 플레이리스트</p>
          {inviteRoomName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-xl border border-sa-accent/30 bg-sa-accent/10 px-4 py-2.5 text-sm text-sa-accent"
            >
              🎵 <span className="font-semibold">{inviteRoomName}</span> 방에서 초대받았습니다
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
              className="relative z-10 flex w-full max-w-xs sm:max-w-sm lg:max-w-md flex-col gap-3"
            >
              <LoginCard
                icon={LogIn}
                title="로그인"
                description="아이디와 비밀번호로 로그인"
                onClick={() => setMode('login')}
              />
              <LoginCard
                icon={UserPlus}
                title="회원가입"
                description="초대코드로 계정 만들기"
                onClick={() => setMode('register')}
              />
              <LoginCard
                icon={Ticket}
                title="게스트 입장"
                description="초대코드로 바로 참여하기"
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
              className="relative z-10 flex w-full max-w-xs sm:max-w-sm lg:max-w-md items-center justify-center"
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
            개인정보처리방침
          </a>
          <span>·</span>
          <a href="/terms" className="hover:text-sa-text-secondary hover:underline">
            이용약관
          </a>
        </div>
      </motion.main>
    </>
  );
}
