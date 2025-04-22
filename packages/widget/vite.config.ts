import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import swc from 'unplugin-swc'
import { peerDependencies } from './package.json'

export default defineConfig({
    esbuild: false,
    plugins: [
        swc.vite({
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: true,
                    decorators: true,
                },
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
                target: 'es2020',
            },
            module: {
                type: 'es6',
            },
        }),
        dts({
            insertTypesEntry: true,
            exclude: ['**/*.stories.ts', '**/*.test.tsx'],
        }),
    ],
    css: {
        postcss: './postcss.config.js',
    },
    build: {
        cssCodeSplit: true,   
        lib: {
            entry: './src/index.ts',
            name: 'widget',
            fileName: (format) => `widget.${format}.js`,
            formats: ['es', 'cjs', 'umd'],
        },
        minify: false,
        rollupOptions: {
            external: Object.keys(peerDependencies),
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
        target: 'es2020',
    },
})
