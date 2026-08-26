import { validate, Network } from 'bitcoin-address-validation';
export const isBitcoinAddressValid = (address: string, isTestnet: boolean) => {
    return validate(address, isTestnet ? Network.testnet : Network.mainnet);
}