'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = '날짜 선택', className }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm transition hover:bg-white/10 focus:border-sa-accent/50 focus:outline-none',
          value ? 'text-white' : 'text-sa-text-muted',
          className,
        )}
      >
        <CalendarIcon size={14} className="shrink-0 text-sa-text-muted" />
        <span className="flex-1 text-left">
          {value ? format(value, 'yyyy년 M월 d일', { locale: ko }) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="shrink-0 text-sa-text-muted transition hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} locale={ko} disabled={{ before: new Date() }} />
      </PopoverContent>
    </Popover>
  );
}
