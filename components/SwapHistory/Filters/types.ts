export type FilterNetworkOption = {
    name: string
    display_name: string
    logo: string
}

export type FilterOpts = {
    walletAddrs: string[] | null
    networks: string[] | null
}
