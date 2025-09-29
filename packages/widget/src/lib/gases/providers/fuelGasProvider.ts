import { Network } from "@/Models/Network";
import KnownInternalNames from "@/lib/knownIds";
import { GasProps } from "@/Models/Balance";
import WatchdogAbi from '@/lib/jsons/abis/FUELWATCHDOG.json'
import formatAmount from "@/lib/formatAmount";

export class FuelGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name))
    }

    async getGas({ address, network, token }: GasProps): Promise<any> {

        if (!network.metadata?.watchdog_contract) throw new Error("Watchdog contract not found")
        if (!network?.token) throw new Error("No native token provided")

        try {
            const { Provider, Contract, Address } = await import('fuels')

            const provider = new Provider(network?.node_url);

            const contract = new Contract(network.metadata?.watchdog_contract, WatchdogAbi, provider);

            const asset_id = await provider.getBaseAssetId();
            const assetAddress = Address.fromB256(token.contract || asset_id);
            const assetId = assetAddress.toAssetId();

            const parsedAmount = 0.005 * Math.pow(10, token?.decimals)
            const receiver = { bits: Address.fromDynamicInput('0x0B1956a6737cb62fF5E66479F7770315fb5055BB75888b6C2Be43155F6dF1704').toB256() };

            const scope = contract.functions
                .watch(42069, receiver)
                .txParams({
                    variableOutputs: 1,
                })
                .callParams({
                    forward: [parsedAmount, assetId.bits],
                })

            const { maxFee } = await scope.getTransactionCost();

            const formatedGas = Number((formatAmount(Number(maxFee), network.token.decimals) * 2).toFixed(network.token.decimals))

            if (formatedGas) return { gas: formatedGas, token: network.token }

        } catch (e) {
            console.log(e)
        }

    }
}