import { RefreshCw, ServerOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ShareAuxLogo } from '@/components/common/ShareAuxLogo';
import { Button } from '@/components/ui/button';
import type { ConnState } from '@/hooks/useServerStatus';

interface ServerStatusScreenProps {
  connState: Exclude<ConnState, 'connected'>;
  onRetry: () => void;
}

export function ServerStatusScreen({ connState, onRetry }: ServerStatusScreenProps) {
  const t = useTranslations('common');

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-sa-bg-primary">
      {connState === 'connecting' ? (
        <>
          <div className="animate-shimmer-opacity">
            <ShareAuxLogo className="h-14 w-auto" />
          </div>
          <p className="text-sm text-sa-text-muted">{t('serverStatus.connecting')}</p>
        </>
      ) : (
        <>
          <ServerOff className="size-10 text-sa-text-muted" />
          <div className="text-center">
            <p className="text-sm font-medium text-sa-text-secondary">{t('serverStatus.disconnected')}</p>
            <p className="mt-1 text-xs text-sa-text-muted">{t('serverStatus.autoRetry')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            {t('serverStatus.retryNow')}
          </Button>
        </>
      )}
    </div>
  );
}
