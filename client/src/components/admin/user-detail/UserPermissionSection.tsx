'use client';

import { Save } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { UpdatePermissionsBodyPermissionsItem, UserDetailResponse } from '@/api/model';
import { UpdateRoleDtoRole } from '@/api/model';
import { ACCOUNT_PERM_OPTIONS, ROLE_LABELS } from '@/lib/constants';
import { CheckboxGroup } from '@/components/admin/CheckboxGroup';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateUserDetailRole, useUpdateUserPermissions } from '@/hooks/admin/useAdminUserDetail';

interface UserPermissionSectionProps {
  user: UserDetailResponse;
}

export function UserPermissionSection({ user }: UserPermissionSectionProps) {
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<Set<string>>(
    () => new Set(user.accountPermissions.length > 0 ? user.accountPermissions : ['listen']),
  );

  const updateRole = useUpdateUserDetailRole(user.id);
  const updatePermissions = useUpdateUserPermissions(user.id);

  const isSuperAdmin = role === 'superAdmin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const saving = updateRole.isPending || updatePermissions.isPending;

  const effectiveOptions = useMemo(
    () => ACCOUNT_PERM_OPTIONS.map((opt) => ({ ...opt, disabled: opt.disabled || isAdmin })),
    [isAdmin],
  );

  const effectivePermissions = useMemo(
    () => (isAdmin ? new Set(ACCOUNT_PERM_OPTIONS.map((o) => o.key)) : permissions),
    [isAdmin, permissions],
  );

  const togglePerm = useCallback((key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (role !== user.role) {
        await updateRole.mutateAsync({ id: user.id, data: { role: role as UpdateRoleDtoRole } });
      }
      if (!isAdmin) {
        await updatePermissions.mutateAsync({
          permissions: [...permissions] as UpdatePermissionsBodyPermissionsItem[],
        });
      }
      toast.success('저장되었습니다');
    } catch {
      toast.error('저장에 실패했습니다');
    }
  }, [user, role, permissions, isAdmin, updateRole, updatePermissions]);

  return (
    <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-6">
      <h3 className="mb-4 text-sm font-medium text-white">계정 설정</h3>

      <FormField label="역할">
        {isSuperAdmin ? (
          <StatusBadge variant="accent">superAdmin (변경 불가)</StatusBadge>
        ) : (
          <Select value={role} onValueChange={(v) => v && setRole(v)}>
            <SelectTrigger className="h-9 w-40 border-white/10 bg-white/5 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['user', 'admin'].map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r] ?? r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <div className="mt-4">
        <CheckboxGroup
          label="계정 권한"
          options={effectiveOptions}
          selected={effectivePermissions}
          onChange={togglePerm}
        />
        {isAdmin && <p className="mt-2 text-xs text-sa-text-muted">관리자는 모든 권한을 가집니다</p>}
      </div>

      {!isSuperAdmin && (
        <Button variant="accent" className="mt-5 gap-1.5" onClick={handleSave} disabled={saving}>
          <Save size={14} />
          {saving ? '저장 중...' : '저장'}
        </Button>
      )}
    </div>
  );
}
