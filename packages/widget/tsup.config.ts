import { defineConfig } from 'tsup'

export default defineConfig({
    // compile every source file one-to-one
    entry: ["src/index.ts"],
    // no bundling, no extra chunks
    bundle: false,
    splitting: false,
    // emit both module types
    format: ['cjs', 'esm'],
    // turn OFF tsup's d.ts generation
    dts: false,
    // clean dist/ on each run
    clean: true,
    // produce sourcemaps if you like
    sourcemap: false,
    // leave React to the consumer
    external: ['react', 'react-dom'],
    treeshake: true, // Remove unused code
})
