import arbitrumRinkebyLogo from '../public/arbitrum-rinkeby-logo.png';
import arbitrumLogo from '../public/arbitrum-logo.png';

export class CryptoNetwork {
    name: string;
    displayName: string;
    explorerUrl: string;
    imgSrc: StaticImageData;

    static layerTwos: CryptoNetwork[] = [
        {
            name: "ARBITRUM_RINKEBY",
            displayName: "Arbitrum R",
            explorerUrl: "https://rinkeby-explorer.arbitrum.io/tx/",
            imgSrc: arbitrumRinkebyLogo
        },
        {
            name: "ARBITRUM_MAINNET",
            displayName: "Arbitrum M",
            explorerUrl: "https://arbiscan.io/tx/",
            imgSrc: arbitrumLogo
        },
    ];

    static GetLayerTwoByName(name: string): CryptoNetwork {
        return this.layerTwos.filter(item => item.name === name)[0];
    }
}
