import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  esbuild: {
    target: 'esnext',
  },

  resolve: {
    alias: [
      // Some transitive deps (WalletConnect/Reown -> viem -> @noble/curves) pull in an
      // older nested @noble/hashes whose `/utils` entry predates the `anumber` export,
      // which breaks dependency optimization. Redirect ONLY the `/utils` subpath to the
      // root-level @noble/hashes (other subpaths like `/_assert` keep their own copy, so
      // legacy consumers such as ethereum-cryptography are left untouched).
      {
        find: /^@noble\/hashes\/utils$/,
        replacement: fileURLToPath(
          new URL('./node_modules/@noble/hashes/esm/utils.js', import.meta.url)
        ),
      },
    ],
  },

  server: {
    port: 3000,
    open: true,
  },
})
