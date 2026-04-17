'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { AdminControllerGetUsersParams, User } from '@/api/model';
import { UpdateRoleDtoRole, UserRole } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminTable } from '@/components/admin/AdminTable';
import type { Column } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVIDER_LABELS, ROLE_LABELS } from '@/lib/constants';
import { useAdminUsers, useUpdateUserRole } from '@/hooks/admin/useAdminUsers';

const LIMIT = 20;
const DEBOUNCE_MS = 300;

interface FilterSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}

function FilterSelect({ value, onValueChange, placeholder, options }: FilterSelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger className="h-8 w-28 border-white/10 bg-white/5 text-xs">
        <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: '전체 역할' },
  { value: 'user', label: ROLE_LABELS.user },
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'guest', label: ROLE_LABELS.guest },
];

const PROVIDER_FILTER_OPTIONS = [
  { value: 'all', label: '전체 가입' },
  { value: 'local', label: PROVIDER_LABELS.local.label },
  { value: 'google', label: PROVIDER_LABELS.google.label },
  { value: 'invite', label: PROVIDER_LABELS.invite.label },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: '정상' },
  { value: 'banned', label: '정지됨' },
];

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_MS);
  }, []);

  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (v: string) => {
      setter(v);
      setPage(1);
    },
    [],
  );

  const params: AdminControllerGetUsersParams = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: debouncedSearch,
      ...(roleFilter !== 'all' && { role: roleFilter }),
      ...(providerFilter !== 'all' && { provider: providerFilter }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
    }),
    [page, debouncedSearch, roleFilter, providerFilter, statusFilter],
  );

  const { data, isLoading } = useAdminUsers(params);
  const updateRole = useUpdateUserRole();

  const handleRoleChange = useCallback(
    (id: string, role: UpdateRoleDtoRole) => {
      updateRole.mutate({ id, data: { role } });
    },
    [updateRole],
  );

  const columns: Column<User>[] = [
    {
      key: 'nickname',
      header: '닉네임',
      render: (user) => (
        <Link href={`/admin/users/${user.id}`} className="font-medium text-white hover:text-sa-accent">
          {user.nickname}
        </Link>
      ),
    },
    {
      key: 'username',
      header: '유저네임',
      hideOnMobile: true,
      render: (user) => <span className="text-sa-text-muted">{user.username ? `@${user.username}` : '-'}</span>,
    },
    {
      key: 'email',
      header: '이메일',
      hideOnMobile: true,
      render: (user) => <span className="text-sa-text-muted">{user.email ?? '-'}</span>,
    },
    {
      key: 'provider',
      header: '가입/연동',
      render: (user) => {
        const info = PROVIDER_LABELS[user.provider] ?? { label: user.provider, variant: 'muted' as const };
        return (
          <div className="flex flex-wrap gap-1">
            <StatusBadge variant={info.variant}>{info.label}</StatusBadge>
            {user.googleId && user.provider !== 'google' && <StatusBadge variant="accent">Google 연동</StatusBadge>}
          </div>
        );
      },
    },
    {
      key: 'role',
      header: '역할',
      render: (user) => {
        if (user.role === UserRole.superAdmin) return <StatusBadge variant="accent">superAdmin</StatusBadge>;
        if (user.role === UserRole.guest) return <StatusBadge variant="muted">게스트</StatusBadge>;
        return (
          <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v as UpdateRoleDtoRole)}>
            <SelectTrigger className="h-8 w-28 border-white/10 bg-white/5 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(UpdateRoleDtoRole).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r] ?? r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: 'createdAt',
      header: '가입일',
      hideOnMobile: true,
      render: (user) => (
        <span className="text-sa-text-muted">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (user) =>
        user.bannedAt ? (
          <StatusBadge variant="danger">정지됨</StatusBadge>
        ) : (
          <StatusBadge variant="success">정상</StatusBadge>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="유저 관리"
        search={{ value: search, onChange: handleSearch, placeholder: '닉네임 또는 유저네임 검색...' }}
      />

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          value={roleFilter}
          onValueChange={handleFilterChange(setRoleFilter)}
          placeholder="역할"
          options={ROLE_FILTER_OPTIONS}
        />
        <FilterSelect
          value={providerFilter}
          onValueChange={handleFilterChange(setProviderFilter)}
          placeholder="가입 방식"
          options={PROVIDER_FILTER_OPTIONS}
        />
        <FilterSelect
          value={statusFilter}
          onValueChange={handleFilterChange(setStatusFilter)}
          placeholder="상태"
          options={STATUS_FILTER_OPTIONS}
        />
      </div>

      <AdminTable columns={columns} data={data?.items ?? []} loading={isLoading} rowKey={(user) => user.id} />
      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />
    </div>
  );
}
