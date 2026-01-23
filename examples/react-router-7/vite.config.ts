import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: {
      "react-router-dom": "react-router",
      "stream": "stream-browserify",
    },
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
    noExternal: ["@layerswap/widget", "@layerswap/wallet-evm", "@layerswap/wallet-svm", "@layerswap/wallet-bitcoin", "@layerswap/wallet-starknet", "js-sha3", "@layerswap/wallets", "@layerswap/wallet-fuel", '@layerswap/wallet-ton', '@layerswap/wallet-paradex', '@layerswap/wallet-imtbl-x', '@layerswap/wallet-imtbl-passport', '@layerswap/wallet-module-zksync', '@layerswap/wallet-module-loopring', '@layerswap/wallet-tron'],
  },
  optimizeDeps: {
    include: ["@layerswap/widget", "@layerswap/wallet-evm", "@layerswap/wallet-svm", "@layerswap/wallet-bitcoin", "@layerswap/wallet-starknet", "js-sha3", "@layerswap/wallets", "@layerswap/wallet-fuel", "@layerswap/wallet-ton", '@layerswap/wallet-paradex', '@layerswap/wallet-imtbl-x', '@layerswap/wallet-imtbl-passport', '@layerswap/wallet-module-zksync', '@layerswap/wallet-module-loopring','@layerswap/wallet-tron'],
  },
});
