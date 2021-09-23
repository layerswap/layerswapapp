export class CryptoNetwork {
    name: string;
    displayName: string;
    explorerUrl: string;
    imgSrc: string;

    static layerTwos: CryptoNetwork[] = [
        {
            name: "ARBITRUM_RINKEBY",
            displayName: "Arbitrum R",
            explorerUrl: "https://rinkeby-explorer.arbitrum.io/tx/",
            imgSrc: '/arbitrum-rinkeby-logo.png'
        },
        {
            name: "ARBITRUM_MAINNET",
            displayName: "Arbitrum M",
            explorerUrl: "https://arbiscan.io/tx/",
            imgSrc: '/arbitrum-logo.png'
        },
    ];

    static GetLayerTwoByName(name: string): CryptoNetwork {
        return this.layerTwos.filter(item => item.name === name)[0];
    }
}
