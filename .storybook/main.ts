import { createRequire } from "node:module";
import type { StorybookConfig } from "@storybook/nextjs";
import path, { dirname, join } from "path";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  env: () => ({
    NEXT_PUBLIC_LS_BRIDGE_API: "https://bridge-api-dev.layerswap.cloud",
    NEXT_PUBLIC_IDENTITY_API: "/",
    NEXT_PUBLIC_RESOURCE_STORAGE_URL: "https://devlslayerswapbridgesa.blob.core.windows.net",
    NEXT_PUBLIC_LS_API: "https://api-dev.layerswap.cloud",
    NEXT_PUBLIC_API_KEY: "sandbox",
    NEXT_PUBLIC_API_VERSION: "sandbox"
  }),

  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],

  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-onboarding"),
    getAbsolutePath("storybook-addon-mock"),
    getAbsolutePath("@storybook/addon-docs")
  ],

  framework: {
    name: getAbsolutePath("@storybook/nextjs"),
    options: {},
  },

  webpackFinal: async (config) => {
    config.module?.rules?.push({
      test: /\.scss$/,
      use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
    });

    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../'),
      };
    }

    return config;
  }
};
export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
