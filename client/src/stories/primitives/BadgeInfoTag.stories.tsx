import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Check, Music, Wifi, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { InfoTag } from '@/components/common/InfoTag';

export default { title: 'Primitives/Badge & InfoTag' } satisfies Meta;

export const BadgeVariants: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['default', 'secondary', 'destructive', 'outline'] as const).map((v) => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </div>
  ),
};

export const BadgeWithIcon: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default"><Check size={12} /> 연결됨</Badge>
      <Badge variant="destructive"><X size={12} /> 오류</Badge>
      <Badge variant="secondary"><Music size={12} /> 재생 중</Badge>
    </div>
  ),
};

export const InfoTags: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <InfoTag>OPUS</InfoTag>
      <InfoTag>128K</InfoTag>
      <InfoTag variant="accent">LIVE</InfoTag>
      <InfoTag variant="accent"><Wifi size={9} /> 스트리밍</InfoTag>
    </div>
  ),
};
