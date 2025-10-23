import { validate, Network } from 'bitcoin-address-validation';
import { Network as LsNetwork } from '@layerswap/widget/types';
export const isBitcoinAddressValid = (address: string, network: LsNetwork) => {
    const isTestnet = network.name.toLowerCase().includes("testnet");
    return validate(address, isTestnet ? Network.testnet : Network.mainnet);
}