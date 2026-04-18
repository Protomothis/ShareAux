import { RefreshCw, ServerOff } from 'lucide-react';

import { ShareAuxLogo } from '@/components/common/ShareAuxLogo';
import { Button } from '@/components/ui/button';
import type { ConnState } from '@/hooks/useServerStatus';

interface ServerStatusScreenProps {
  connState: Exclude<ConnState, 'connected'>;
  onRetry: () => void;
}

export function ServerStatusScreen({ connState, onRetry }: ServerStatusScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-sa-bg-primary">
      {connState === 'connecting' ? (
        <>
          <div className="animate-shimmer-opacity">
            <ShareAuxLogo className="h-14 w-auto" />
          </div>
          <p className="text-sm text-sa-text-muted">서버에 연결하는 중...</p>
        </>
      ) : (
        <>
          <ServerOff className="size-10 text-sa-text-muted" />
          <div className="text-center">
            <p className="text-sm font-medium text-sa-text-secondary">서버에 연결할 수 없습니다</p>
            <p className="mt-1 text-xs text-sa-text-muted">잠시 후 자동으로 재시도합니다</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            지금 재시도
          </Button>
        </>
      )}
    </div>
  );
}
