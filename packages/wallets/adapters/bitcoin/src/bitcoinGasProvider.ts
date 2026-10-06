import { fetchUtxos } from "./transferProvider/transactionBuilder/buildPsbt";
import { estimateConservativeFee } from "./transferProvider/transactionBuilder/estimateFee";
import { KnownInternalNames, formatUnits } from "@layerswap/utils";
import { GasProps, GasWithToken, GasProvider, Network } from "@layerswap/widget-types";

export class BitcoinGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    async getGas({ address, network }: GasProps): Promise<GasWithToken | undefined> {
        if (!network.token) throw new Error("No native token provided");
        if (!address) throw new Error("No address provided");

        const version = KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) ? 'mainnet' : 'testnet';
        const utxos = await fetchUtxos(address, version);
        // No spendable inputs is unavailable, not a known zero fee.
        if (!utxos.length) return;
        const fee = await estimateConservativeFee(utxos.length, version);
        return { gas: Number(formatUnits(fee, network.token.decimals)), token: network.token };
    }
}
