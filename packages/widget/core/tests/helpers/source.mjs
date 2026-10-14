import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
export function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name in imports) return imports[name]
        if (name === 'react/jsx-runtime') return require(name)
        throw new Error(`Unexpected ${path} dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}
export const rounding = loadSource('components/utils/RoundDecimals.ts')
export const maxHelpers = loadSource('components/Input/Amount/helpers.ts', { '@/components/utils/RoundDecimals': rounding })
export const amountPresets = loadSource('lib/amountPresets.ts', {
    '@/components/Input/Amount/helpers': maxHelpers, '@/components/utils/RoundDecimals': rounding,
})
export const swapProgress = loadSource('helpers/swapProgress.ts', {
    './gasless': loadSource('helpers/gasless.ts'),
    '@layerswap/widget-types': require('@layerswap/widget-types'),
    '@/lib/apiClients/layerSwapApiClient': { BackendTransactionStatus: { Failed: 'failed' }, TransactionType: { Input: 'input' } },
})
