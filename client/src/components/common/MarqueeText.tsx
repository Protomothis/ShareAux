'use client';

import { useEffect, useRef, useState } from 'react';

export default function MarqueeText({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    // 숨겨진 span으로 실제 텍스트 너비 측정
    const measure = measureRef.current;
    const container = containerRef.current;
    if (!measure || !container) return;
    const check = () => setOverflow(measure.offsetWidth > container.offsetWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      {/* 측정용 (보이지 않음) */}
      <span ref={measureRef} className="invisible absolute left-0 top-0 whitespace-nowrap">
        {text}
      </span>
      {/* 실제 표시 */}
      {overflow ? (
        <div className="inline-flex" style={{ animation: 'marquee 12s linear infinite' }}>
          <span className="shrink-0">{text}</span>
          <span className="shrink-0" aria-hidden>
            &nbsp;&nbsp;·&nbsp;&nbsp;
          </span>
          <span className="shrink-0">{text}</span>
          <span className="shrink-0" aria-hidden>
            &nbsp;&nbsp;·&nbsp;&nbsp;
          </span>
        </div>
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
}
