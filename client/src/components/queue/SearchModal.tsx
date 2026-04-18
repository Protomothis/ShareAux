'use client';

import { Search, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Track } from '@/api/model';
import { queueControllerAddTracks } from '@/api/queue/queue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

import Modal from '../common/Modal';
import SearchResults from './SearchResults';
import { SearchSelectedBar } from './SearchSelectedBar';
import SearchShowcase from './SearchShowcase';

import { MAX_QUEUE_SIZE } from '@/lib/constants';

type Tab = 'showcase' | 'search';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  canEnqueue?: boolean;
  queueTrackIds?: string[];
  onTrackAdded?: () => void;
  maxSelectPerAdd?: number;
  isHost?: boolean;
}

export default function SearchModal({
  isOpen,
  onClose,
  roomId,
  canEnqueue: _canEnqueue = true,
  queueTrackIds = [],
  onTrackAdded,
  maxSelectPerAdd = 3,
  isHost = false,
}: SearchModalProps) {
  const [tab, setTab] = useState<Tab>('showcase');
  const [selected, setSelected] = useState<Track[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const search = useSearch(isOpen);
  const maxSelect = isHost ? MAX_QUEUE_SIZE : maxSelectPerAdd;

  useEffect(() => {
    if (isOpen) {
      setTab('showcase');
      setAddedIds(new Set());
      setSelected([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (tab === 'search') setTimeout(() => inputRef.current?.focus(), 100);
  }, [tab]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || search.loadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) search.loadMore();
  }, [search]);

  const toggleSelect = (track: Track) => {
    setSelected((prev) => {
      const idx = prev.findIndex((t) => t.id === track.id);
      if (idx >= 0) return prev.filter((t) => t.id !== track.id);
      if (prev.length >= maxSelect) return prev;
      return [...prev, track];
    });
  };

  const handleAdd = async () => {
    if (!selected.length || adding) return;
    if (queueTrackIds.length + selected.length > MAX_QUEUE_SIZE) {
      toast.error(`신청곡이 가득 찼습니다 (최대 ${MAX_QUEUE_SIZE}곡)`);
      return;
    }
    setAdding(true);
    try {
      await queueControllerAddTracks(roomId, { trackIds: selected.map((t) => t.id) });
      for (const track of selected) setAddedIds((prev) => new Set(prev).add(track.id));
      const names = selected.map((t) => t.name).slice(0, 2);
      const label = names.join(', ') + (selected.length > 2 ? ` 외 ${selected.length - 2}곡` : '');
      toast.success('🎵 신청 완료', { description: label });
      onTrackAdded?.();
      onClose();
    } catch {
    } finally {
      setAdding(false);
    }
  };

  const selectedIds = new Set(selected.map((t) => t.id));
  const disabledIds = new Set([...addedIds, ...queueTrackIds]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      fullscreenMobile
      showCloseButton={false}
      className="max-w-lg rounded-2xl bg-black/90 border border-white/10 shadow-2xl backdrop-blur-2xl max-lg:rounded-none max-lg:border-0 max-lg:bg-black md:max-w-xl lg:max-w-2xl lg:h-[80vh]"
    >
      <Modal.Header className="border-0 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">곡 추가</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-sa-text-muted hover:text-white">
            <X size={20} />
          </Button>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl bg-white/5 p-1">
          <Button
            variant="ghost"
            onClick={() => setTab('showcase')}
            className={cn(
              'flex-1 gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
              tab === 'showcase' ? 'bg-white/10 text-white' : 'text-sa-text-muted hover:text-white',
            )}
          >
            <Sparkles size={14} />
            추천
          </Button>
          <Button
            variant="ghost"
            onClick={() => setTab('search')}
            className={cn(
              'flex-1 gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
              tab === 'search' ? 'bg-white/10 text-white' : 'text-sa-text-muted hover:text-white',
            )}
          >
            <Search size={14} />
            검색
          </Button>
        </div>

        {tab === 'search' && (
          <div className="relative pt-3 pb-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sa-text-muted" />
              <Input
                ref={inputRef}
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                onKeyDown={(e) => {
                  const visible = search.showSuggestions && search.suggestions.length > 0;
                  const max = Math.min(search.suggestions.length, 8);
                  if (e.key === 'ArrowDown' && visible) {
                    e.preventDefault();
                    search.setHighlightIdx((i) => (i + 1) % max);
                  } else if (e.key === 'ArrowUp' && visible) {
                    e.preventDefault();
                    search.setHighlightIdx((i) => (i <= 0 ? max - 1 : i - 1));
                  } else if (e.key === 'Escape' && visible) {
                    search.setShowSuggestions(false);
                    search.setHighlightIdx(-1);
                  } else if (e.key === 'Enter') {
                    search.setShowSuggestions(false);
                    if (visible && search.highlightIdx >= 0)
                      search.pickSuggestion(search.suggestions[search.highlightIdx]);
                    else search.executeSearch(search.query);
                  }
                }}
                onFocus={() =>
                  search.suggestions.length > 0 && !search.debouncedQuery && search.setShowSuggestions(true)
                }
                onBlur={() => setTimeout(() => search.setShowSuggestions(false), 150)}
                placeholder="곡 제목 또는 아티스트..."
                className="w-full rounded-xl border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-sa-text-muted focus-visible:border-sa-accent/50 focus-visible:ring-2 focus-visible:ring-sa-accent/20"
              />
            </div>
            {search.showSuggestions && search.suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-white/10 bg-sa-bg-elevated/95 py-1 shadow-xl backdrop-blur-xl">
                {search.suggestions.slice(0, 8).map((s, i) => (
                  <li key={s}>
                    <Button
                      variant="ghost"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        search.pickSuggestion(s);
                        inputRef.current?.focus();
                      }}
                      onMouseEnter={() => search.setHighlightIdx(i)}
                      className={cn(
                        'flex h-auto w-full items-center justify-start gap-2 rounded-none px-3 py-1.5 text-left text-sm',
                        i === search.highlightIdx ? 'bg-white/10 text-white' : 'text-sa-text-secondary',
                      )}
                    >
                      <Search size={12} className="shrink-0 text-sa-text-muted" />
                      <span className="truncate">{s}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal.Header>

      <Modal.Body className="px-5 py-0">
        <div
          ref={listRef}
          onScroll={tab === 'search' ? handleScroll : undefined}
          className={`h-full ${adding ? 'pointer-events-none opacity-50' : ''}`}
        >
          {tab === 'showcase' && (
            <SearchShowcase
              roomId={roomId}
              onSelectTrack={toggleSelect}
              selectedIds={selectedIds}
              selectedOrder={selected.map((t) => t.id)}
              disabledIds={disabledIds}
              maxReached={selected.length >= maxSelect}
            />
          )}

          {tab === 'search' && (
            <SearchResults
              loading={search.loading}
              loadingMore={search.loadingMore}
              debouncedQuery={search.debouncedQuery}
              results={search.results}
              playlists={search.playlists}
              selected={selected}
              disabledIds={disabledIds}
              addedIds={addedIds}
              queueTrackIds={queueTrackIds}
              maxSelect={maxSelect}
              onToggleTrack={toggleSelect}
            />
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="border-0 px-5 py-3 sm:flex-col sm:items-stretch">
        <SearchSelectedBar
          selected={selected}
          adding={adding}
          onRemove={(id) => setSelected((prev) => prev.filter((t) => t.id !== id))}
          onSubmit={handleAdd}
        />
      </Modal.Footer>
    </Modal>
  );
}
