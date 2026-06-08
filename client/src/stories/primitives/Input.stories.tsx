import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: '텍스트를 입력하세요' } };
export const Disabled: Story = { args: { placeholder: 'Disabled', disabled: true } };
export const WithValue: Story = { args: { defaultValue: 'ShareAux' } };

export const Password: Story = {
  render: () => <PasswordInput placeholder="비밀번호" />,
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-3">
      <Input placeholder="기본" />
      <Input placeholder="비활성" disabled />
      <Input placeholder="에러" aria-invalid />
      <PasswordInput placeholder="비밀번호" />
    </div>
  ),
};
