'use client';

import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface PCaptchaProps {
  challenge: string;
  onVerified: (solution: string) => void;
}

type Status = 'idle' | 'solving' | 'solved';

export function PCaptcha({ challenge, onVerified }: PCaptchaProps) {
  const tc = useTranslations('common.captcha');
  const [status, setStatus] = useState<Status>('idle');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setStatus('idle');
  }, [challenge]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleClick = useCallback(() => {
    if (status !== 'idle') return;
    setStatus('solving');

    import('@p-captcha/react').then(() => {
      // worker 직접 생성 (p-captcha solver)
      const blob = new Blob(
        [
          `importScripts=undefined;${atob(
            // p-captcha solver worker source (from package internals)
            'KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2NvbnN0IGg9WyJRdWFkcmF0aWNSZXNpZHVlUHJvYmxlbSJdLHM9e1Vua25vd25Qcm9ibGVtVHlwZToiVU5LTk9XTl9QUk9CTEVNX1RZUEUiLFNlcmlhbGl6ZXJGYWlsZWQ6IlNFUklBTElaRVJfRkFJTEVEIixUb25lbGxpU2hhbmtzTm9Tb2x1dGlvbjoiVE9ORUxMSV9TSEFOS1NfTk9fU09MVVRJT04ifSxTPXsiNzUxKjJeNzUxLTEiOjc1MW4qMm4qKjc1MW4tMW4sIjgzKjJeNTMxOC0xIjo4M24qMm4qKjUzMThuLTFuLCI3NzU1KjJeNzc1NS0xIjo3NzU1bioybioqNzc1NW4tMW4sIjk1MzEqMl45NTMxLTEiOjk1MzFuKjJuKio5NTMxbi0xbiwiMTIzNzkqMl4xMjM3OS0xIjoxMjM3OW4qMm4qKjEyMzc5bi0xbiwiNzkxMSoyXjE1ODIzLTEiOjc5MTFuKjJuKioxNTgyM24tMW4sIjE4ODg1KjJeMTg4ODUtMSI6MTg4ODVuKjJuKioxODg4NW4tMW4sIjIyOTcxKjJeMjI5NzEtMSI6MjI5NzFuKjJuKioyMjk3MW4tMW59O2Z1bmN0aW9uIGIoZSl7bGV0IG49ZS50b1N0cmluZygxNik7aWYobi5sZW5ndGglMiE9PTAmJihuPSIwIituKSwhbil0aHJvdyBzLlNlcmlhbGl6ZXJGYWlsZWQ7Y29uc3QgdD1uLm1hdGNoKC8uezEsMn0vZyk7aWYoIXQpdGhyb3cgcy5TZXJpYWxpemVyRmFpbGVkO2NvbnN0IG89bmV3IFVpbnQ4QXJyYXkodC5tYXAoaT0+cGFyc2VJbnQoaSwxNikpKTtsZXQgcj0iIjtmb3IobGV0IGkgb2YgbylyKz1TdHJpbmcuZnJvbUNoYXJDb2RlKGkpO3JldHVybiBidG9hKHIpfWZ1bmN0aW9uIGcoZSl7Y29uc3Qgbj1hdG9iKGUpLHQ9bmV3IFVpbnQ4QXJyYXkoQXJyYXkuZnJvbShuKS5tYXAocj0+ci5jaGFyQ29kZUF0KDApKSk7bGV0IG89QXJyYXkuZnJvbSh0KS5tYXAocj0+ci50b1N0cmluZygxNikucGFkU3RhcnQoMiwiMCIpKS5qb2luKCIiKTtyZXR1cm4gQmlnSW50KCIweCIrbyl9ZnVuY3Rpb24geShlKXtjb25zdFtuLHRdPWUuc3BsaXQoIiwiKTtpZighZChuKSl0aHJvdyBzLlVua25vd25Qcm9ibGVtVHlwZTtzd2l0Y2gobil7Y2FzZSBoWzBdOmNvbnN0W28sLi4ucl09YXRvYih0KS5zcGxpdCgiLCIpO3JldHVybnt0eXBlOmhbMF0scHJvYmxlbTp7cHJpbWU6U1tvXSxjaGFsbGVuZ2VzOnIubWFwKGcpfX19fWZ1bmN0aW9uIGQoZSl7cmV0dXJuIGguaW5jbHVkZXMoZSl9ZnVuY3Rpb24gbChlLG4sdCl7bGV0IG89MW47Zm9yKGU9ZSV0O24+MG47KW4mMW4mJihvPW8qZSV0KSxuPW4vMm4sZT1lKmUldDtyZXR1cm4gb31mdW5jdGlvbiBUKGUsbil7aWYoZT1CaWdJbnQoZSksbj1CaWdJbnQobiksbChlLChuLTFuKS8ybixuKSE9PTFuKXRocm93IHMuVG9uZWxsaVNoYW5rc05vU29sdXRpb247aWYobiU0bj09PTNuKXJldHVybiBsKGUsKG4rMW4pLzRuLG4pO2xldCB0PW4tMW4sbz0wbjtmb3IoO3QlMm49PT0wbjspdC89Mm4sbys9MW47bGV0IHI9Mm47Zm9yKDtsKHIsKG4tMW4pLzJuLG4pPT09MW47KXIrPTFuO2xldCBpPW8sZj1sKHIsdCxuKSxhPWwoZSx0LG4pLHc9bChlLCh0KzFuKS8ybixuKTtmb3IoO2EhPT0wbiYmYSE9PTFuOyl7bGV0IGM9MW4sdT1hKmElbjtmb3IoO3UhPT0xbiYmYzxpOyl1PXUqdSVuLGMrPTFuO2lmKGM9PT1pKXRocm93IHMuVG9uZWxsaVNoYW5rc05vU29sdXRpb247Y29uc3QgbT1sKGYsMW48PGktYy0xbixuKTtpPWMsZj1tKm0lbixhPWEqZiVuLHc9dyptJW59cmV0dXJuIGE9PT0wbj8wbjp3fWZ1bmN0aW9uIEkoZSl7c3dpdGNoKGUudHlwZSl7Y2FzZSBoWzBdOmxldCBuPVtdO2ZvcihsZXQgdCBvZiBlLnByb2JsZW0uY2hhbGxlbmdlcyl7Y29uc3Qgbz1UKHQsZS5wcm9ibGVtLnByaW1lKTtuLnB1c2goYihvKSl9cmV0dXJuIG59fW9ubWVzc2FnZT1mdW5jdGlvbihlKXtjb25zdCBuPUEoZS5kYXRhKTtwb3N0TWVzc2FnZShuKX07ZnVuY3Rpb24gQShlKXtjb25zdCBuPXkoZSk7cmV0dXJuIEkobikuam9pbigiLCIpfX0pKCk7Cg==',
          )}`,
        ],
        { type: 'text/javascript' },
      );
      const url = URL.createObjectURL(blob);
      const w = new Worker(url);
      workerRef.current = w;
      w.onmessage = (e: MessageEvent<string>) => {
        setStatus('solved');
        onVerified(e.data);
        URL.revokeObjectURL(url);
      };
      w.postMessage(challenge);
    });
  }, [status, challenge, onVerified]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status !== 'idle'}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/20 disabled:cursor-default"
    >
      <div className="flex size-5 items-center justify-center">
        {status === 'idle' && (
          <div className="size-4 rounded border-2 border-white/30 transition hover:border-white/50" />
        )}
        {status === 'solving' && <Loader2 size={16} className="animate-spin text-sa-accent" />}
        {status === 'solved' && <Check size={16} className="text-green-400" strokeWidth={3} />}
      </div>
      <span className="flex-1 text-sm text-white/70">
        {status === 'idle' && tc('idle')}
        {status === 'solving' && tc('solving')}
        {status === 'solved' && tc('solved')}
      </span>
      <ShieldCheck size={14} className="text-white/20" />
    </button>
  );
}
