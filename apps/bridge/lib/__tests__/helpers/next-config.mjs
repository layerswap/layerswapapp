import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
export const phases = require('next/constants')

// Execute the real build configuration with synthetic environment values. Only the
// outer wrappers are replaced; `posthog` selects a faithful stub of withPostHogConfig.
export function buildConfig(env, phase = phases.PHASE_PRODUCTION_BUILD, { posthog = 'passthrough' } = {}) {
    const module = { exports: {} }
    const withPostHogConfig = posthog === 'wrap'
        // mirrors @posthog/nextjs-config/dist/config.js:40-51 (spreads userConfig, so headers must survive)
        ? fn => async (p, ctx) => { const { webpack, compiler, ...rest } = await fn(p, ctx); return { ...rest, webpack, compiler } }
        : config => config
    vm.runInNewContext(readFileSync(new URL('../../../next.config.js', import.meta.url), 'utf8'), {
        module, process: { env }, console, setTimeout,
        require: name => {
            if (name === '@next/bundle-analyzer') return () => config => config
            if (name === '@posthog/nextjs-config') return { withPostHogConfig }
            if (name.startsWith('./lib/')) return require('../../' + name.slice('./lib/'.length))
            return require(name)
        },
    })
    return module.exports(phase, { defaultConfig: {} })
}
