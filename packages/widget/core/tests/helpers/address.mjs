import { createRequire, registerHooks } from 'node:module'
import { extname } from 'node:path'

// Load the real chain-aware address rules from bundler-oriented package output.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try {
            return nextResolve(`${specifier}.js`, context)
        } catch (error) {
            if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
            return nextResolve(`${specifier}/index.js`, context)
        }
    }
    return nextResolve(specifier, context)
} })
let Address
try {
    const utils = createRequire(import.meta.url)('@layerswap/utils')
    Address = utils.Address
} finally {
    hooks.deregister()
}
export { Address }
