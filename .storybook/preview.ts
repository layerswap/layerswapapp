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
          'X-LS-APIKEY': 'NHPls+1CSPTx8imeiQUlKm5DvoCJpm1kq7SLcVXVNIx9y69lm1ywl9DKTOWzqClwPsyECo3STBNMZteyLsfnRw'
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
