import { isMobile } from '@layerswap/utils'
import { walletKey } from '../walletKey'
import { getDynamicWcMetadata, getPendingDynamicWcMetadata } from './dynamicMetadata'
import { isSafeDeepLink } from './foregroundWalletApp'

type Session = {
    topic: string
    namespaces: Record<string, { accounts: string[] }>
    peer: { metadata: { name: string; redirect?: { native?: string; universal?: string } } }
    sessionConfig?: { disableDeepLink?: boolean }
    transportType?: string
}

type SentRequest = {
    topic: string
    id: number
    chainId: string
}

// Keep wallet-core independent of a particular WalletConnect SDK version.
type SignClient = {
    session: {
        get(topic: string): Session
        getAll(): Session[]
        update(topic: string, update: { sessionConfig: Session['sessionConfig'] }): Promise<void>
    }
    on(event: 'session_connect', listener: (event: { session: Session }) => void): unknown
    on(event: 'session_request_sent', listener: (event: SentRequest) => void): unknown
    off(event: 'session_connect', listener: (event: { session: Session }) => void): unknown
    off(event: 'session_request_sent', listener: (event: SentRequest) => void): unknown
}

function resolveDeepLink(session: Session, namespace: string): string | undefined {
    const peer = session.peer.metadata
    // The session identifies the wallet that will actually receive the request.
    // Address-only metadata can belong to another wallet using the same account.
    const address = session.namespaces[namespace]?.accounts[0]?.split(':').slice(2).join(':')
    const metadata = [
        getPendingDynamicWcMetadata(namespace),
        address ? getDynamicWcMetadata(namespace, address) : null,
    ].find(meta => meta?.deepLink && walletKey(meta.name) === walletKey(peer.name))
    const link = peer.redirect?.native || peer.redirect?.universal || metadata?.deepLink
    if (!link || !isSafeDeepLink(link)) return undefined
    // Use the same MetaMask workaround as the pairing link builder.
    return walletKey(peer.name) === 'metamask' ? 'https://metamask.app.link' : link
}

export function buildWalletRequestLink(link: string, id: number, topic: string): string {
    const url = new URL(link)
    if (url.protocol === 'https:' && url.hostname === 't.me') {
        const payload = btoa(`requestId=${id}&sessionTopic=${topic}`)
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        url.searchParams.set('startapp', payload)
        return url.toString()
    }
    // Registry entries can already include /wc (e.g. okex://main/wc).
    if (url.hostname !== 'wc' && !url.pathname.replace(/\/$/, '').endsWith('/wc')) {
        if (link.endsWith('://')) url.hostname = 'wc'
        else url.pathname = `${url.pathname.replace(/\/$/, '')}/wc`
    }
    url.searchParams.delete('uri')
    url.searchParams.set('requestId', String(id))
    url.searchParams.set('sessionTopic', topic)
    return url.toString()
}

/**
 * Our registry connectors own their redirects. WalletConnect's default uses
 * the origin-wide WALLETCONNECT_DEEPLINK_CHOICE, which may name a different
 * EVM/Solana wallet. Disable that path only for these sessions and open the
 * session's wallet after the signing request has reached the relay.
 */
export function subscribeWalletRequests(client: SignClient, namespace: string): () => void {
    const configureSession = (session: Session) => {
        if (!isMobile() || !session.namespaces[namespace] || session.sessionConfig?.disableDeepLink) return
        // Store.update replaces the in-memory session synchronously, before its
        // persistence promise settles and before connect() can return to callers.
        void client.session.update(session.topic, {
            sessionConfig: { ...session.sessionConfig, disableDeepLink: true },
        }).catch(error => console.warn('Could not persist WalletConnect redirect settings', error))
    }
    const onConnect = ({ session }: { session: Session }) => configureSession(session)
    const onRequest = ({ topic, id, chainId }: SentRequest) => {
        if (!isMobile() || chainId.split(':')[0] !== namespace) return
        try {
            const session = client.session.get(topic)
            // Link-mode sessions carry their request in the SDK's own app link.
            if (session.transportType === 'link_mode') return
            const link = resolveDeepLink(session, namespace)
            if (link) window.location.href = buildWalletRequestLink(link, id, topic)
        } catch (error) {
            // A deleted session or blocked navigation must not reject a request
            // that has already been published and can still be approved manually.
            console.warn('Could not open the WalletConnect wallet', error)
        }
    }

    client.on('session_connect', onConnect)
    client.on('session_request_sent', onRequest)
    client.session.getAll().forEach(configureSession)
    return () => {
        client.off('session_connect', onConnect)
        client.off('session_request_sent', onRequest)
    }
}
