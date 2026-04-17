import Link from 'next/link';
import type { ReactNode } from 'react';

interface LegalPageLayoutProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

export default function LegalPageLayout({ title, updatedAt, children }: LegalPageLayoutProps) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6">
      <header className="shrink-0 pb-4 pt-16">
        <Link href="/rooms" className="mb-6 inline-flex items-center gap-1 text-xs text-sa-text-muted hover:text-white">
          ← 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-xs text-sa-text-muted">최종 수정일: {updatedAt}</p>
      </header>
      <main className="flex-1 overflow-y-auto pb-16 text-sm leading-relaxed text-sa-text-secondary">{children}</main>
    </div>
  );
}
