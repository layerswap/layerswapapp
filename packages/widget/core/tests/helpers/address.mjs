import { createRequire, registerHooks } from 'node:module'
import { extname } from 'node:path'
import { existsSync } from 'node:fs'

// The published utilities target bundlers and use extensionless imports.
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            const file = new URL(`${specifier}.js`, context.parentURL)
            return nextResolve(existsSync(file) ? `${specifier}.js` : `${specifier}/index.js`, context)
        }
        return nextResolve(specifier, context)
    },
})
const require = createRequire(import.meta.url)
export const { Address } = require('../../../../utils/dist/esm/address/Address.js')
hooks.deregister()
