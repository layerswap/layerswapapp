import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
export const phases = require('next/constants')

// Execute the real build configuration with synthetic environment values. Only the
// bundle-analyzer wrapper is replaced.
export function buildConfig(env, phase = phases.PHASE_PRODUCTION_BUILD) {
    const sandboxModule = { exports: {} }
    vm.runInNewContext(readFileSync(new URL('../../../next.config.js', import.meta.url), 'utf8'), {
        module: sandboxModule, process: { env }, console, setTimeout,
        require: name => {
            if (name === '@next/bundle-analyzer') return () => config => config
            if (name.startsWith('./lib/')) return require('../../' + name.slice('./lib/'.length))
            return require(name)
        },
    })
    return sandboxModule.exports(phase, { defaultConfig: {} })
}
