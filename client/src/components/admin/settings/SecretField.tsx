'use client';

import { Eye, EyeOff, Pencil, X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SecretFieldProps {
  label: string;
  description: string;
  masked: string;
  configured: boolean;
  configuredLabel: string;
  notConfiguredLabel: string;
  onSave: (value: string) => void;
}

export function SecretField({
  label,
  description,
  masked,
  configured,
  configuredLabel,
  notConfiguredLabel,
  onSave,
}: SecretFieldProps) {
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');

  const handleToggleEdit = () => {
    if (editing) {
      if (value) onSave(value);
      setValue('');
    }
    setEditing(!editing);
  };

  return (
    <FormField label={label} description={description} inline>
      <div className="flex items-center gap-2.5">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="새 값 입력"
              className="w-72 font-mono text-xs"
              autoFocus
            />
            <Button variant="accent" size="sm" onClick={handleToggleEdit} disabled={!value}>
              저장
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(false);
                setValue('');
              }}
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <>
            <Badge variant={configured ? 'default' : 'secondary'} className="text-[11px]">
              {configured ? configuredLabel : notConfiguredLabel}
            </Badge>
            {configured && (
              <span className="font-mono text-xs text-sa-text-muted">{visible ? masked : '••••••••••••'}</span>
            )}
            {configured && (
              <Button variant="ghost" size="icon-sm" onClick={() => setVisible(!visible)}>
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)}>
              <Pencil size={14} />
            </Button>
          </>
        )}
      </div>
    </FormField>
  );
}
