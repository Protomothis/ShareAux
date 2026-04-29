import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import NumberStepper from '@/components/ui/number-stepper';

const meta: Meta<typeof NumberStepper> = {
  title: 'Primitives/NumberStepper',
  component: NumberStepper,
  args: { value: 5, onChange: fn(), min: 0, max: 20 },
};
export default meta;
type Story = StoryObj<typeof NumberStepper>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm', value: 3 } };
export const AtMin: Story = { args: { value: 0 } };
export const AtMax: Story = { args: { value: 20 } };
export const Disabled: Story = { args: { disabled: true } };
