export class CryptoNetwork {
    name: string;
    displayName: string;
    explorerUrl: string;
    imgSrc: string;
    disabled: boolean;

    static GetLayerTwoByName(name: string): CryptoNetwork {
        return this.GetAvailableNetworks().filter(item => item.name === name)[0];
    }

    static GetAvailableNetworks(): CryptoNetwork[] {
        let networks: CryptoNetwork[] = [
            {
                name: "ARBITRUM_MAINNET",
                displayName: "Arbitrum",
                explorerUrl: "https://arbiscan.io/tx/",
                imgSrc: '/arbitrum-logo.png',
                disabled: false
            },
            {
                name: "OPTIMISM_MAINNET",
                displayName: "Optimism",
                explorerUrl: "https://arbiscan.io/tx/",
                imgSrc: '/optimism-logo.png',
                disabled: true
            },
        ];

        let testNetworks: CryptoNetwork[] = [
            {
                name: "ARBITRUM_RINKEBY",
                displayName: "Arbitrum R",
                explorerUrl: "https://rinkeby-explorer.arbitrum.io/tx/",
                imgSrc: '/arbitrum-rinkeby-logo.png',
                disabled: false
            }
        ];

        if (process.env.NODE_ENV == "development") {
            networks = networks.concat(testNetworks);
        }

        return networks;
    }
}
