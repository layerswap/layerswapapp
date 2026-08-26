/** Test-only resolver for the workspace's extensionless TypeScript ESM output. */
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context)
    } catch (error) {
        if (
            !specifier.startsWith('.')
            || !['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error?.code)
        ) throw error

        try {
            return await nextResolve(`${specifier}.js`, context)
        } catch (extensionError) {
            if (extensionError?.code !== 'ERR_MODULE_NOT_FOUND') throw extensionError
            return nextResolve(`${specifier}/index.js`, context)
        }
    }
}
