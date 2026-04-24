'use client';

import { Surface } from '@/components/ui/surface';

import { Save } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { UpdatePermissionsBodyPermissionsItem, UserDetailResponse } from '@/api/model';
import { UpdateRoleDtoRole } from '@/api/model';
import { ROLE_LABELS } from '@/lib/constants';
import { usePermissionMeta, usePermLookup } from '@/hooks/usePermissionMeta';
import { CheckboxGroup } from '@/components/admin/CheckboxGroup';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateUserDetailRole, useUpdateUserPermissions } from '@/hooks/admin/useAdminUserDetail';
import { useTranslations } from 'next-intl';

interface UserPermissionSectionProps {
  user: UserDetailResponse;
}

export function UserPermissionSection({ user }: UserPermissionSectionProps) {
  const t = useTranslations('admin.userDetail');
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<Set<string>>(
    () => new Set(user.accountPermissions.length > 0 ? user.accountPermissions : ['listen']),
  );

  const updateRole = useUpdateUserDetailRole(user.id);
  const updatePermissions = useUpdateUserPermissions(user.id);
  const { data: permMeta } = usePermissionMeta();
  const pl = usePermLookup();
  const baseOptions = (permMeta ?? []).map((m) => ({
    key: m.key,
    label: pl.full(m.key),
    disabled: m.key === 'listen',
  }));

  const isSuperAdmin = role === 'superAdmin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const saving = updateRole.isPending || updatePermissions.isPending;

  const effectiveOptions = useMemo(
    () => baseOptions.map((opt) => ({ ...opt, disabled: opt.disabled || isAdmin })),
    [baseOptions, isAdmin],
  );

  const effectivePermissions = useMemo(
    () => (isAdmin ? new Set(baseOptions.map((o) => o.key)) : permissions),
    [isAdmin, baseOptions, permissions],
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
      toast.success(t('saved'));
    } catch {}
  }, [user, role, permissions, isAdmin, updateRole, updatePermissions]);

  return (
    <Surface padding="lg" className="mb-6">
      <h3 className="mb-4 text-sm font-medium text-white">{t('accountSettings')}</h3>

      <FormField label={t('roleLabel')}>
        {isSuperAdmin ? (
          <StatusBadge variant="accent">{t('superAdminFixed')}</StatusBadge>
        ) : (user.role as string) === 'guest' ? (
          <StatusBadge variant="muted">{t('guestFixed')}</StatusBadge>
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
          label={t('accountPermissions')}
          options={effectiveOptions}
          selected={effectivePermissions}
          onChange={togglePerm}
        />
        {isAdmin && <p className="mt-2 text-xs text-sa-text-muted">{t('adminAllPerms')}</p>}
      </div>

      {!isSuperAdmin && (
        <Button variant="accent" className="mt-5 gap-1.5" onClick={handleSave} disabled={saving}>
          <Save size={14} />
          {saving ? t('saving') : t('save')}
        </Button>
      )}
    </Surface>
  );
}
