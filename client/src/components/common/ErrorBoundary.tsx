'use client';

import React from 'react';

import { Button } from '@/components/ui/button';

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
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
          <p className="mb-4 text-lg">문제가 발생했습니다</p>
          <Button variant="accent" onClick={() => window.location.reload()} className="px-6 py-2">
            새로고침
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
