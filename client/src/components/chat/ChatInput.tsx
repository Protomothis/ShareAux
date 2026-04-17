'use client';

import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { MAX_CHAT_LENGTH } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  canChat: boolean;
  mutedUntil?: number;
}

export default function ChatInput({ onSend, canChat, mutedUntil }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [muteRemaining, setMuteRemaining] = useState(0);

  useEffect(() => {
    if (!mutedUntil || mutedUntil <= Date.now()) {
      setMuteRemaining(0);
      return;
    }
    setMuteRemaining(Math.ceil((mutedUntil - Date.now()) / 1000));
    const interval = setInterval(() => {
      const r = Math.ceil((mutedUntil - Date.now()) / 1000);
      if (r <= 0) {
        setMuteRemaining(0);
        clearInterval(interval);
      } else {
        setMuteRemaining(r);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mutedUntil]);

  const isMuted = muteRemaining > 0;
  const disabled = !canChat || isMuted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > MAX_CHAT_LENGTH || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const placeholder = isMuted
    ? `채팅이 제한되었습니다 (${muteRemaining}초)`
    : canChat
      ? '메시지를 입력하세요...'
      : '채팅 권한이 없습니다';

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_CHAT_LENGTH}
        disabled={disabled}
        aria-label="채팅 메시지"
        className={cn(
          'flex-1 rounded-xl border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-sa-text-muted focus-visible:border-sa-accent/50 focus-visible:ring-0',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      />
      <Button
        type="submit"
        variant="accent"
        size="icon"
        disabled={disabled}
        className="shrink-0 rounded-xl disabled:opacity-40"
        aria-label="전송"
      >
        <Send size={16} />
      </Button>
    </form>
  );
}
