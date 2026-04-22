'use client';

import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

interface WsDisconnectBannerProps {
  connected: boolean;
}

export function WsDisconnectBanner({ connected }: WsDisconnectBannerProps) {
  const t = useTranslations('common');
  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="shrink-0 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white">
            <WifiOff className="size-3.5" />
            {t('wsDisconnect.message')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
