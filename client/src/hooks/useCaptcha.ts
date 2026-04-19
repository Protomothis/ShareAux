'use client';

import { useCallback, useRef, useState } from 'react';

import { captchaControllerGetChallenge } from '@/api/captcha/captcha';

import type { CaptchaChallengeResponse } from '@/api/model';

interface CaptchaState {
  enabled: boolean;
  id: string | null;
  challenge: string | null;
  answer: string | null;
}

export function useCaptcha() {
  const [state, setState] = useState<CaptchaState>({
    enabled: false,
    id: null,
    challenge: null,
    answer: null,
  });
  const fetchingRef = useRef(false);

  const fetchChallenge = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await captchaControllerGetChallenge();
      setState({
        enabled: res.enabled,
        id: res.id ?? null,
        challenge: res.challenge ?? null,
        answer: null,
      });
    } catch {
      // CAPTCHA 실패 시 비활성 처리
      setState({ enabled: false, id: null, challenge: null, answer: null });
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const onVerified = useCallback((solution: string) => {
    setState((prev) => ({ ...prev, answer: solution }));
  }, []);

  /** 폼 submit 시 body에 추가할 captcha 필드 */
  const getCaptchaBody = useCallback(() => {
    if (!state.enabled || !state.id || !state.answer) return {};
    return { captchaId: state.id, captchaAnswer: state.answer };
  }, [state]);

  /** 재시도용 리셋 */
  const reset = useCallback(() => {
    setState((prev) => ({ ...prev, answer: null, challenge: null, id: null }));
    void fetchChallenge();
  }, [fetchChallenge]);

  return {
    enabled: state.enabled,
    challenge: state.challenge,
    answer: state.answer,
    solved: !!state.answer,
    fetchChallenge,
    onVerified,
    getCaptchaBody,
    reset,
  };
}
