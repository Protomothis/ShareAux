import AnimatedBackground from '@/components/common/AnimatedBackground';
import { ShareAuxLogo } from '@/components/common/ShareAuxLogo';

export default function Loading() {
  return (
    <>
      <AnimatedBackground />
      <div className="fixed inset-0 z-10 flex items-center justify-center">
        <div style={{ animation: 'shimmer-opacity 1.2s ease-in-out infinite' }}>
          <ShareAuxLogo className="h-14 w-auto" />
        </div>
        <style>{`
          @keyframes shimmer-opacity {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </>
  );
}
