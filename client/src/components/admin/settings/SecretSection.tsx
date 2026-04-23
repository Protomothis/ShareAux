'use client';

import { useTranslations } from 'next-intl';

import { useAdminControllerGetSecrets } from '@/api/admin/admin';
import { SettingSection } from './SettingSection';
import { SecretField } from './SecretField';

interface SecretSectionProps {
  onSecretChange: (key: string, value: string) => void;
}

export function SecretSection({ onSecretChange }: SecretSectionProps) {
  const t = useTranslations('admin.settings');
  const { data: secretsData } = useAdminControllerGetSecrets();
  const secrets = (secretsData ?? {}) as Record<string, { masked: string; configured: boolean }>;

  const common = { configuredLabel: t('configured'), notConfiguredLabel: t('notConfigured') };

  return (
    <SettingSection icon="🔑" title={t('secretsSection')}>
      <SecretField
        label={t('googleClientId')}
        description={t('googleClientIdDesc')}
        masked={secrets['secret.googleClientId']?.masked ?? ''}
        configured={secrets['secret.googleClientId']?.configured ?? false}
        onSave={(v) => onSecretChange('secret.googleClientId', v)}
        {...common}
      />
      <SecretField
        label={t('googleClientSecret')}
        description={t('googleClientSecretDesc')}
        masked={secrets['secret.googleClientSecret']?.masked ?? ''}
        configured={secrets['secret.googleClientSecret']?.configured ?? false}
        onSave={(v) => onSecretChange('secret.googleClientSecret', v)}
        {...common}
      />
      <SecretField
        label={t('googleCallbackUrl')}
        description={t('googleCallbackUrlDesc')}
        masked={secrets['secret.googleCallbackUrl']?.masked ?? ''}
        configured={secrets['secret.googleCallbackUrl']?.configured ?? false}
        onSave={(v) => onSecretChange('secret.googleCallbackUrl', v)}
        {...common}
      />
      <SecretField
        label={t('geminiApiKey')}
        description={t('geminiApiKeyDesc')}
        masked={secrets['secret.geminiApiKey']?.masked ?? ''}
        configured={secrets['secret.geminiApiKey']?.configured ?? false}
        onSave={(v) => onSecretChange('secret.geminiApiKey', v)}
        {...common}
      />
    </SettingSection>
  );
}
