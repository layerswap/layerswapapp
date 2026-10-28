import { readFile } from 'node:fs/promises'

// Match the bundler's extensionless ESM and JSON handling for built packages.
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context)
    } catch (error) {
        if (!specifier.startsWith('.')
            || !['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error?.code)) throw error

        try {
            return await nextResolve(`${specifier}.js`, context)
        } catch (extensionError) {
            if (extensionError?.code !== 'ERR_MODULE_NOT_FOUND') throw extensionError
            return nextResolve(`${specifier}/index.js`, context)
        }
    }
}

export async function load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
        const json = JSON.parse(await readFile(new URL(url), 'utf8'))
        return { format: 'module', source: `export default ${JSON.stringify(json)}`, shortCircuit: true }
    }
    return nextLoad(url, context)
}
