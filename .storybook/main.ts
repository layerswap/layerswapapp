import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  env: () => ({
    NEXT_PUBLIC_LS_BRIDGE_API: "https://bridge-api-dev.layerswap.cloud",
    NEXT_PUBLIC_API_VERSION: "sandbox",
    NEXT_PUBLIC_IDENTITY_API: "/",
    NEXT_PUBLIC_RESOURCE_STORAGE_URL: "https://prodlslayerswapbridgesa.blob.core.windows.net",
  }),
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
    "@storybook/addon-mdx-gfm",
    "storybook-addon-mock"
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (config) => {
    config.module?.rules?.push({
      test: /\.scss$/,
      use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
    });

    return config;
  },
};
export default config;
