'use client';

import { useEffect, useState } from 'react';

import type { AuthConfigResponse } from '@/api/model';
import { authControllerGetAuthConfig } from '@/api/auth/auth';

const defaultConfig: AuthConfigResponse = { google: false, captcha: false, translation: false };

let cachedConfig: AuthConfigResponse | null = null;

export function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfigResponse>(cachedConfig ?? defaultConfig);

  useEffect(() => {
    if (cachedConfig) return;
    authControllerGetAuthConfig()
      .then((c) => {
        cachedConfig = c;
        setConfig(c);
      })
      .catch(() => {});
  }, []);

  return config;
}
