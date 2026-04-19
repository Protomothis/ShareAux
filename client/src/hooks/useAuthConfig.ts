'use client';

import { useEffect, useState } from 'react';

import { customFetch } from '@/api/mutator';

interface AuthConfig {
  google: boolean;
  captcha: boolean;
}

const defaultConfig: AuthConfig = { google: false, captcha: false };

let cachedConfig: AuthConfig | null = null;

export function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfig>(cachedConfig ?? defaultConfig);

  useEffect(() => {
    if (cachedConfig) return;
    customFetch<AuthConfig>('/auth/config')
      .then((c) => {
        cachedConfig = c;
        setConfig(c);
      })
      .catch(() => {});
  }, []);

  return config;
}
