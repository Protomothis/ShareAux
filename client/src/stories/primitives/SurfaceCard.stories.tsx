import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Card, CardContent,CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Surface } from '@/components/ui/surface';

export default {
  title: 'Primitives/Surface & Card',
} satisfies Meta;

export const SurfaceVariants: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(['default', 'elevated', 'glass', 'danger', 'interactive'] as const).map((v) => (
        <Surface key={v} variant={v} padding="md">
          <p className="text-sm font-medium text-white">{v}</p>
          <p className="text-xs text-sa-text-muted">Surface variant</p>
        </Surface>
      ))}
    </div>
  ),
};

export const CardExample: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>방 설정</CardTitle>
          <CardDescription>방의 기본 설정을 변경합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-sa-text-secondary">카드 콘텐츠 영역</p>
        </CardContent>
      </Card>
    </div>
  ),
};
