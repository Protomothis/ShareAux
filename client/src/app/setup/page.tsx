'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RegisterForm } from '@/components/common/RegisterForm';
import { getApiUrl } from '@/lib/urls';

export default function SetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

  if (!ready) return null;

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 animate-gradient bg-[length:400%_400%] bg-gradient-to-br from-sa-accent/20 via-purple-900/20 to-cyan-900/20 opacity-60" />

      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold text-white md:text-4xl">
          ShareAux 초기 설정
        </h1>
        <p className="text-lg text-sa-text-secondary">첫 번째 계정이 관리자로 등록됩니다.</p>
        <p className="text-sm text-sa-text-secondary/70">초대코드 없이 가입할 수 있습니다.</p>
      </div>

      <RegisterForm onSuccess={() => router.push('/rooms')} onBack={() => {}} skipInviteCode />
    </main>
  );
}
