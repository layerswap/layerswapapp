import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: [
      { find: "react-router-dom", replacement: "react-router" },
      { find: "stream", replacement: "stream-browserify" },
      // aes-js v4 (pulled in by ethers v6 via wallet-tron / imtbl-passport / cartridge)
      // ships ESM with named-only exports, but ethers v5's @ethersproject/json-wallets
      // does `import aes from "aes-js"` and needs a default export — which breaks Vite's
      // dependency optimization. Redirect the bare `aes-js` specifier to aes-js v4's
      // CommonJS build: CJS interop synthesizes a default export (for ethers v5) while
      // still exposing the named CTR/CBC/... exports (for ethers v6), so both majors resolve.
      {
        find: /^aes-js$/,
        replacement: fileURLToPath(
          new URL("./node_modules/aes-js/lib.commonjs/index.js", import.meta.url)
        ),
      },
    ],
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  define: {
    global: "globalThis",
  },
  ssr: {
    noExternal: ["@layerswap/widget", "@layerswap/wallet-evm", "@layerswap/wallet-svm", "@layerswap/wallet-bitcoin", "@layerswap/wallet-starknet", "js-sha3", "@layerswap/wallets", "@layerswap/wallet-fuel", '@layerswap/wallet-ton', '@layerswap/wallet-paradex', '@layerswap/wallet-imtbl-passport', '@layerswap/wallet-tron', '@layerswap/utils'],
  },
  optimizeDeps: {
    include: ["@layerswap/widget", "@layerswap/wallet-evm", "@layerswap/wallet-svm", "@layerswap/wallet-bitcoin", "@layerswap/wallet-starknet", "js-sha3", "@layerswap/wallets", "@layerswap/wallet-fuel", "@layerswap/wallet-ton", '@layerswap/wallet-paradex', '@layerswap/wallet-imtbl-passport','@layerswap/wallet-tron', '@layerswap/utils'],
  },
});
