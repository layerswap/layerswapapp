/** Test-only resolver for the workspace's extensionless TypeScript ESM output. */
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context)
    } catch (error) {
        if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error
        return nextResolve(`${specifier}.js`, context)
    }
}
