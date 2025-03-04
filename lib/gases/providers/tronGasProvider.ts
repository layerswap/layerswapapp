import { GasProps } from "../../../Models/Balance";
import { Network, Token } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class TronGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TronMainnet.includes(network.name)
    }

    async getGas({ address, network, token }: GasProps): Promise<any> {

        const { TronWeb } = await import('tronweb');
        const tronWeb = new TronWeb({ fullNode: network.node_url, solidityNode: network.node_url });

        if (!token.contract) throw new Error('Not implemented for native asset');
        if (!network.token) throw new Error('Network token not found');
        try {
            const params = await tronWeb.trx.getChainParameters();
            const energyPriceParam = params.find(p => p.key === "getEnergyFee");
            const energyPrice = energyPriceParam?.value

            if (!energyPrice) throw new Error('Failed to estimate energy price');

            const transaction = await tronWeb.transactionBuilder.triggerConstantContract(
                token.contract,
                'transfer(address,uint256)',
                {},
                [
                    { type: 'address', value: 'TWRdG7FoGpksQjpKjqvw2TENPDGaoxUJ8a' },
                    { type: 'uint256', value: tronWeb.toBigNumber(0.5 * Math.pow(10, token.decimals)).toFixed() },
                ],
                address,
            );
            const energyUsage = transaction.energy_used;

            if (!energyUsage) throw new Error('Failed to estimate energy usage');

            return formatAmount(energyUsage * energyPrice, network.token?.decimals);
        } catch (e) {
            console.log(e)
            throw new Error(e.message)
        }

    }
}