import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { BoolField, NumField, SelectField, SettingSection } from '@/components/admin/settings';

const meta: Meta = {
  title: 'Features/Admin/Settings/Fields',
};
export default meta;

export const Section: StoryObj = {
  render: () => {
    const [enabled, setEnabled] = useState('true');
    const [limit, setLimit] = useState('100');
    const [model, setModel] = useState('gemini-2.5-flash');
    return (
      <div className="w-96">
        <SettingSection icon="🎵" title="스트림 설정">
          <BoolField
            label="최대 비트레이트 제한"
            description="활성화하면 비트레이트를 제한합니다"
            value={enabled}
            onChange={setEnabled}
          />
          <NumField
            label="최대 비트레이트"
            description="kbps 단위"
            value={limit}
            onChange={setLimit}
            min={64}
            max={320}
          />
          <SelectField
            label="모델"
            description="사용할 AI 모델"
            value={model}
            onChange={setModel}
            options={['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']}
          />
        </SettingSection>
      </div>
    );
  },
};

export const Disabled: StoryObj = {
  render: () => (
    <div className="w-96">
      <SettingSection icon="🌐" title="번역 설정">
        <BoolField
          label="번역 활성화"
          description="Gemini 키가 필요합니다"
          value="false"
          onChange={() => {}}
          disabled
          disabledReason="Gemini API 키를 먼저 설정하세요"
        />
        <NumField
          label="일일 제한"
          description="하루 최대 번역 수"
          value="100"
          onChange={() => {}}
          disabled
          disabledReason="번역을 먼저 활성화하세요"
        />
      </SettingSection>
    </div>
  ),
};
