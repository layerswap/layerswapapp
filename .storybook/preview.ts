import type { Preview } from "@storybook/react";
import "../styles/globals.css";
import { themes } from '@storybook/theming';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
};

const preview: Preview = {
  loaders: [
    async () => ({
      settings: await (await fetch(`https://api-dev.layerswap.cloud/api/networks`, {
        headers: {
          'X-LS-APIKEY': '+ov+NmG0IjisqoCIQuOUQTNOkkzP+b4QphPkbq3JnId/6bjRyaAQVSqGqRTb9LizsTHVF0wimdlKvb9kR7O54g'
        },
      })).json(),
    }),
  ],
  parameters: {
    docs: {
      theme: themes.dark,
    },
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
