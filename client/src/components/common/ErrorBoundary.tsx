'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';

function ErrorFallback() {
  const t = useTranslations('common');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <p className="mb-4 text-lg">{t('errorBoundary.message')}</p>
      <Button variant="accent" onClick={() => window.location.reload()} className="px-6 py-2">
        {t('errorBoundary.reload')}
      </Button>
    </div>
  );
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
