import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { CheckboxGroup } from '@/components/admin/CheckboxGroup';

const meta: Meta<typeof CheckboxGroup> = {
  title: 'Features/Admin/CheckboxGroup',
  component: CheckboxGroup,
};
export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

const options = [
  { key: 'queue', label: '곡 신청' },
  { key: 'skip', label: '스킵 투표' },
  { key: 'chat', label: '채팅' },
  { key: 'reaction', label: '리액션' },
  { key: 'admin', label: '관리자', disabled: true },
];

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState(new Set(['queue', 'chat']));
    return (
      <CheckboxGroup
        label="권한"
        options={options}
        selected={selected}
        onChange={(key) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          })
        }
      />
    );
  },
};
