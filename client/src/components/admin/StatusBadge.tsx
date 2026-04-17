type Variant = 'success' | 'danger' | 'muted' | 'accent';

const styles: Record<Variant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400',
  danger: 'bg-red-500/10 text-red-400',
  muted: 'bg-white/5 text-sa-text-muted',
  accent: 'bg-sa-accent/10 text-sa-accent',
};

interface StatusBadgeProps {
  variant: Variant;
  children: React.ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>{children}</span>
  );
}
