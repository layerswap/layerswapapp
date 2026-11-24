import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

const compiled = new Map()

export function transpileToCommonJs(url) {
    const path = fileURLToPath(url)
    if (!compiled.has(path)) {
        compiled.set(path, transformSync(readFileSync(path, 'utf8'), {
            loader: extname(path).slice(1),
            format: 'cjs',
            target: 'es2022',
            jsx: 'automatic',
            supported: { 'dynamic-import': false },
            sourcefile: path,
        }).code)
    }
    return compiled.get(path)
}

// Mocks written as `{ default: X }` are ES module namespaces: a default import must receive X, not the object.
export const esModuleRequire = require => id => {
    const module = require(id)
    if (module == null || module.__esModule || !Object.hasOwn(module, 'default')) return module
    return new Proxy(module, { get: (target, key) => key === '__esModule' ? true : Reflect.get(target, key) })
}

export function loadCommonJs(url, require) {
    const module = { exports: {} }
    new Function('require', 'module', 'exports', transpileToCommonJs(url))(esModuleRequire(require), module, module.exports)
    return module.exports
}

export function runInNewContext(url, { require, ...globals }) {
    const module = { exports: {} }
    vm.runInNewContext(transpileToCommonJs(url), { ...globals, module, exports: module.exports, require: esModuleRequire(require) })
    return module.exports
}
