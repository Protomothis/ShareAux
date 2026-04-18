import AnimatedBackground from '@/components/common/AnimatedBackground';
import { ShareAuxLogo } from '@/components/common/ShareAuxLogo';

export default function Loading() {
  return (
    <>
      <AnimatedBackground />
      <div className="fixed inset-0 z-10 flex items-center justify-center">
        <div className="animate-shimmer-opacity">
          <ShareAuxLogo className="h-14 w-auto" />
        </div>
      </div>
    </>
  );
}
