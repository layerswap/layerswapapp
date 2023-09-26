import type { Preview } from "@storybook/react";
import React from 'react'
import * as nextImage from "next/image";
import "../styles/globals.css";


export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
};

const preview: Preview = {
  parameters: {
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
