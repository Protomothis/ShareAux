'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Sub-components ──────────────────────────────────────

function ModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pt-5 pb-3', className)}>{children}</div>;
}

function ModalTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Title className={cn('font-heading text-base font-medium leading-none', className)}>
      {children}
    </DialogPrimitive.Title>
  );
}

function ModalDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Description className={cn('mt-1 text-sm text-muted-foreground', className)}>
      {children}
    </DialogPrimitive.Description>
  );
}

function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-h-0 overflow-y-auto px-5 py-4', className)}>{children}</div>;
}

function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-t border-foreground/10 bg-muted/50 px-5 py-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  /** 모바일에서 전체화면으로 표시 */
  fullscreenMobile?: boolean;
}

function ModalRoot({
  open,
  onClose,
  onOpenChange,
  children,
  className,
  showCloseButton = true,
  fullscreenMobile,
}: ModalProps) {
  const handleOpenChange = (o: boolean) => {
    onOpenChange?.(o);
    if (!o) onClose?.();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none [&>form]:contents data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            fullscreenMobile
              ? 'h-[100dvh] max-w-full rounded-none lg:max-h-[90vh] lg:max-w-2xl lg:rounded-xl'
              : 'max-h-[calc(100dvh-4rem)] max-w-[calc(100%-2rem)] sm:max-w-sm',
            className,
          )}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Compound export ─────────────────────────────────────

const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Body: ModalBody,
  Footer: ModalFooter,
});

export default Modal;
