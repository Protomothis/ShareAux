import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({ page, totalPages, onPageChange }: AdminPaginationProps) {
  const t = useTranslations('admin.common');
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-center gap-3">
      <Button
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="bg-white/5 hover:bg-white/10 disabled:opacity-30"
      >
        이전
      </Button>
      <span className="text-sm text-sa-text-muted">
        {page} / {totalPages}
      </span>
      <Button
        variant="ghost"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="bg-white/5 hover:bg-white/10 disabled:opacity-30"
      >
        다음
      </Button>
    </div>
  );
}
