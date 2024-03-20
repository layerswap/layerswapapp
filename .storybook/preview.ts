import type { Preview } from "@storybook/react";
import "../styles/globals.css";
import { themes } from '@storybook/theming';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
};

const preview: Preview = {
  loaders: [
    async () => ({
      settings: await (await fetch(`https://api-dev.layerswap.cloud/api/v2-alpha/networks`, {
        headers: {
          'X-LS-APIKEY': '/QPySyStxAtctj/zJfis/5prWi/ulhf5PuOa1BQlbeiCXg2t2jjpuokbADirSBXKzOo5jekY+2Y1sQpnyBBiig'
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
