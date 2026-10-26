import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

/** Load one TypeScript source with its dependencies replaced, so the module under test stays real. */
export function loadSource(url, imports) {
    const { outputText } = ts.transpileModule(readFileSync(url, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        assert.ok(name in imports, `Unexpected dependency: ${name}`)
        return imports[name]
    }, module, module.exports)
    return module.exports
}
