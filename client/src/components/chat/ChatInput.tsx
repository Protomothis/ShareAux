'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MemberWithPermission } from '@/api/model';
import { roomsControllerGetBans } from '@/api/rooms/rooms';
import { ChatCommandPalette, type PaletteItem } from '@/components/chat/ChatCommandPalette';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseSlashInput, SLASH_COMMANDS, type SlashCommand } from '@/lib/chat-commands';
import { MAX_CHAT_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCommand?: (command: string, targetUserId?: string) => void;
  canChat: boolean;
  mutedUntil?: number;
  isHost?: boolean;
  members?: MemberWithPermission[];
  currentUserId?: string;
  roomId?: string;
}

type PaletteMode = 'none' | 'commands' | 'users' | 'mention';

export default function ChatInput({
  onSend,
  onCommand,
  canChat,
  mutedUntil,
  isHost = false,
  members = [],
  currentUserId,
  roomId,
}: ChatInputProps) {
  const t = useTranslations('chat');
  const [input, setInput] = useState('');
  const [muteRemaining, setMuteRemaining] = useState(0);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('none');
  const [paletteFilter, setPaletteFilter] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [bannedItems, setBannedItems] = useState<PaletteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 뮤트 타이머
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

  // 팝오버 아이템 생성
  const commandItems: PaletteItem[] = useMemo(
    () =>
      SLASH_COMMANDS.map((cmd) => ({
        id: cmd.name,
        label: `/${cmd.name}`,
        description: cmd.description,
        icon: cmd.icon,
      })),
    [],
  );

  const memberItems: PaletteItem[] = useMemo(
    () => members.filter((m) => m.userId !== currentUserId).map((m) => ({ id: m.userId, label: m.user.nickname })),
    [members, currentUserId],
  );

  const paletteItems = useMemo(() => {
    if (paletteMode === 'commands') return commandItems;
    if (paletteMode === 'users') {
      if (activeCommand?.target === 'banned') return bannedItems;
      return memberItems;
    }
    if (paletteMode === 'mention') return memberItems;
    return [];
  }, [paletteMode, commandItems, memberItems, bannedItems, activeCommand]);

  const filteredItems = useMemo(() => {
    if (!paletteFilter) return paletteItems;
    const lower = paletteFilter.toLowerCase();
    return paletteItems.filter((item) => item.label.toLowerCase().includes(lower));
  }, [paletteItems, paletteFilter]);

  // input 변경 시 팝오버 트리거 판별
  const handleChange = (value: string) => {
    setInput(value);

    // 슬래시 명령어 (호스트만)
    if (isHost && value.startsWith('/')) {
      const parsed = parseSlashInput(value);
      if (parsed) {
        if (parsed.command) {
          // 명령어 확정 → 유저 선택 모드
          const cmd = SLASH_COMMANDS.find((c) => c.name === parsed.command);
          if (cmd && cmd.target !== 'none') {
            setActiveCommand(cmd);
            setPaletteMode('users');
            setPaletteFilter(parsed.filter);
          } else if (cmd && cmd.target === 'none') {
            // /clear 같은 즉시 실행 명령어 — 팝오버 닫기
            setPaletteMode('none');
          } else {
            setPaletteMode('none');
          }
        } else {
          // 명령어 타이핑 중
          setActiveCommand(null);
          setPaletteMode('commands');
          setPaletteFilter(parsed.filter);
        }
      }
      setHighlightIdx(0);
      return;
    }

    // 멘션 트리거
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setPaletteMode('mention');
        setPaletteFilter(afterAt);
        setHighlightIdx(0);
        return;
      }
    }

    // 팝오버 닫기
    setPaletteMode('none');
    setPaletteFilter('');
    setActiveCommand(null);
  };

  // 팝오버 아이템 선택
  const handlePaletteSelect = useCallback(
    (item: PaletteItem) => {
      if (paletteMode === 'commands') {
        const cmd = SLASH_COMMANDS.find((c) => c.name === item.id);
        if (cmd?.target === 'none') {
          // 즉시 실행
          onCommand?.(cmd.name);
          setInput('');
          setPaletteMode('none');
        } else {
          // 유저 선택 모드로 전환
          setInput(`/${item.id} `);
          setActiveCommand(cmd ?? null);
          setPaletteMode('users');
          setPaletteFilter('');
          // banned 목록 fetch
          if (cmd?.target === 'banned' && roomId) {
            setBannedItems([{ id: '_loading', label: '...' }]);
            roomsControllerGetBans(roomId).then((bans) => {
              setBannedItems(bans.length > 0 ? bans.map((b) => ({ id: b.userId, label: b.nickname })) : []);
            }).catch(() => setBannedItems([]));
          }
        }
      } else if (paletteMode === 'users') {
        if (item.id === '_loading') return;
        // 명령어 실행
        if (activeCommand) {
          onCommand?.(activeCommand.name, item.id);
        }
        setInput('');
        setPaletteMode('none');
        setActiveCommand(null);
      } else if (paletteMode === 'mention') {
        // 멘션 삽입
        const lastAt = input.lastIndexOf('@');
        const before = input.slice(0, lastAt);
        setInput(`${before}@${item.label} `);
        setPaletteMode('none');
        setPaletteFilter('');
      }
      inputRef.current?.focus();
    },
    [paletteMode, activeCommand, input, onCommand],
  );

  // 키보드 핸들링
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (paletteMode === 'none' || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? filteredItems.length - 1 : i - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredItems[highlightIdx]) {
        e.preventDefault();
        handlePaletteSelect(filteredItems[highlightIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setPaletteMode('none');
      setActiveCommand(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paletteMode !== 'none') return; // 팝오버 열려있으면 전송 안 함
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > MAX_CHAT_LENGTH || disabled) return;

    // 슬래시 명령어 즉시 실행 (target=none)
    if (isHost && trimmed.startsWith('/')) {
      const parsed = parseSlashInput(trimmed);
      if (parsed?.command) {
        const cmd = SLASH_COMMANDS.find((c) => c.name === parsed.command);
        if (cmd?.target === 'none') {
          onCommand?.(cmd.name);
          setInput('');
          return;
        }
      }
      // 인자 필요한 명령어인데 유저 선택 안 했으면 무시
      setInput('');
      return;
    }

    onSend(trimmed);
    setInput('');
  };

  const placeholder = isMuted ? t('muted', { seconds: muteRemaining }) : canChat ? t('placeholder') : t('noPermission');

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-1 gap-2">
      <ChatCommandPalette
        items={filteredItems}
        visible={paletteMode !== 'none'}
        highlightIdx={highlightIdx}
        onSelect={handlePaletteSelect}
        onClose={() => {
          setPaletteMode('none');
          setActiveCommand(null);
        }}
      />
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={MAX_CHAT_LENGTH}
        disabled={disabled}
        aria-label={t('inputLabel')}
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
        aria-label={t('send')}
      >
        <Send size={16} />
      </Button>
    </form>
  );
}
