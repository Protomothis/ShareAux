import { Input as InputPrimitive } from '@base-ui/react/input';
import { ClipboardPaste, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends React.ComponentProps<'input'> {
  /** 값이 있을 때 X 버튼 표시 */
  clearable?: boolean;
  onClear?: () => void;
  /** 붙여넣기 버튼 표시 (값이 비어있을 때) */
  pasteable?: boolean;
  onPasteText?: (text: string) => void;
  ref?: React.Ref<HTMLInputElement>;
}

function Input({ className, type, clearable, onClear, pasteable, onPasteText, value, ref, ...props }: InputProps) {
  const showClear = clearable && value;
  const showPaste = pasteable && !value && !!navigator.clipboard?.readText;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) onPasteText?.(text.trim());
    } catch {
      /* 권한 거부 무시 */
    }
  };

  return (
    <div className="relative w-full">
      <InputPrimitive
        ref={ref}
        type={type}
        data-slot="input"
        value={value}
        className={cn(
          'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          (showClear || showPaste) && 'pr-9',
          className,
        )}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          <X className="size-3.5" />
        </button>
      )}
      {showPaste && (
        <button
          type="button"
          onClick={handlePaste}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          <ClipboardPaste className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export { Input };
