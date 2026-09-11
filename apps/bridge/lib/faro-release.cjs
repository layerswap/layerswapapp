/** One build identity for the browser SDK and source-map uploader. */
function resolveFaroRelease(env, productionBuild) {
    return env.NEXT_PUBLIC_FARO_RELEASE || env.VERCEL_GIT_COMMIT_SHA
        || env.GITHUB_SHA || env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
        || (productionBuild ? 'unknown-release' : 'local')
}
/** API mode and NODE_ENV do not identify where an optimized build is deployed. */
function resolveFaroDeployment(env, productionBuild) {
    if (!productionBuild) return 'local'
    const target = [env.VERCEL_TARGET_ENV, env.NEXT_PUBLIC_VERCEL_TARGET_ENV,
        env.VERCEL_ENV, env.NEXT_PUBLIC_VERCEL_ENV].find(value => value?.trim())?.trim()
    return target === 'development' ? 'local' : target || 'unknown'
}

module.exports = { resolveFaroRelease, resolveFaroDeployment }
