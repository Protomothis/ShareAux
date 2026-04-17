interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-xs space-y-5 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white/[0.04]">
          <span className="text-3xl">{icon}</span>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-white/70">{title}</p>
          {description && (
            <p className="whitespace-pre-line text-xs leading-relaxed text-white/30">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
