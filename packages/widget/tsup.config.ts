import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ["src/index.ts"],
    bundle: false,
    splitting: false,
    format: ['cjs', 'esm'],
    dts: false,
    clean: true,
    sourcemap: false,
    external: ['react', 'react-dom'],
    treeshake: true,
})