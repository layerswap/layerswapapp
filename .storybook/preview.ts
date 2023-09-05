import type { Preview } from "@storybook/react";
import React from 'react'
import * as nextImage from "next/image";
import "../styles/globals.css";


export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
};

const preview: Preview = {
  // decorators: [
  //   (Story) => {
  //     window.localStorage.clear();
  //     return Story();
  //   },
  // ],
  loaders: [
    async () => ({
      settings: await (await fetch('https://jsonplaceholder.typicode.com/users/1')).json(),
    }),
  ],
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
