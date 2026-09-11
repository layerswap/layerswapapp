import { LogLevel } from '@grafana/faro-web-sdk'

/** Build mode controls verbosity, not deployment identity or API network. */
export function getFaroVolumePolicy(nodeEnv: string | undefined) {
    const deployedBuild = nodeEnv === 'production'
    return {
        dedupe: true,
        trackResources: !deployedBuild,
        consoleInstrumentation: {
            disabledLevels: deployedBuild ? [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG, LogLevel.INFO] : [],
            consoleErrorAsLog: false,
            serializeErrors: true,
        },
    }
}
