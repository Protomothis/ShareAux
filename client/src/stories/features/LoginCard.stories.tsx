import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { fn } from 'storybook/test';

import { LoginCard } from '@/components/common/LoginCard';

const meta: Meta<typeof LoginCard> = {
  title: 'Features/LoginCard',
  component: LoginCard,
  args: { onClick: fn() },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof LoginCard>;

export const Login: Story = {
  args: { icon: LogIn, title: '로그인', description: '기존 계정으로 로그인합니다' },
};

export const Register: Story = {
  args: { icon: UserPlus, title: '회원가입', description: '새 계정을 만듭니다' },
};

export const Guest: Story = {
  args: { icon: KeyRound, title: '게스트 입장', description: '초대코드로 바로 입장합니다' },
};

export const AllCards: Story = {
  render: () => (
    <div className="space-y-3">
      <LoginCard icon={LogIn} title="로그인" description="기존 계정으로 로그인합니다" onClick={fn()} />
      <LoginCard icon={UserPlus} title="회원가입" description="새 계정을 만듭니다" onClick={fn()} />
      <LoginCard icon={KeyRound} title="게스트 입장" description="초대코드로 바로 입장합니다" onClick={fn()} />
    </div>
  ),
};
