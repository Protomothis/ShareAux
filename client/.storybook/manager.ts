import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

addons.setConfig({
  theme: {
    ...themes.dark,
    brandTitle: 'ShareAux',
    appBg: '#0a0a0a',
    appContentBg: '#000000',
    barBg: '#0a0a0a',
  },
});
