'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** 슬롯 단위 에러 격리 — 에러 발생 시 해당 영역만 fallback 표시 */
export class SlotErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SlotErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? <div className="flex h-full items-center justify-center text-xs text-white/30">⚠️</div>
      );
    }
    return this.props.children;
  }
}
