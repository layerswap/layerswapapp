export type Eip6963Provider = {
    info: {
        uuid: string
        rdns?: string
    }
}

let providers: readonly Eip6963Provider[] = []

export function getEip6963Providers(): readonly Eip6963Provider[] {
    return providers
}

export function subscribeEip6963Providers(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined

    const onAnnouncement = (event: Event) => {
        const detail = (event as CustomEvent<Eip6963Provider>).detail
        if (!detail?.info?.uuid || providers.some(provider => provider.info.uuid === detail.info.uuid)) return
        providers = [...providers, detail]
        listener()
    }

    window.addEventListener('eip6963:announceProvider', onAnnouncement)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    return () => window.removeEventListener('eip6963:announceProvider', onAnnouncement)
}
