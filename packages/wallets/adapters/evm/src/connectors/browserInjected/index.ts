import { createConnector } from 'wagmi'
import { injected } from '@wagmi/connectors'
import { explicitInjectedProviderDetected } from '../explicitInjectedProviderDetected'

export function browserInjected(): ReturnType<typeof createConnector> {
    return createConnector((config) => {
        const injectedConnector = injected()(config)

        return {
            ...injectedConnector,
            connect(...params) {
                if (typeof window !== 'undefined' && !explicitInjectedProviderDetected()) {
                    window.open('https://metamask.io/', 'inst_metamask')
                }
                return injectedConnector.connect(...params)
            },
            get icon() {
                return undefined
            },
            get name() {
                return 'Browser Wallet'
            },
        }
    })
}
