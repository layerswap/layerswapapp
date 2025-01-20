import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";
import { GasProps } from "../../../Models/Balance";
import WatchdogAbi from '../../abis/FUELWATCHDOG.json'
import formatAmount from "../../formatAmount";

export class FuelGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name))
    }

    async getGas({ address, network, token }: GasProps): Promise<any> {

        if (!network.metadata?.watchdog_contract) throw new Error("Watchdog contract not found")
        if (!network?.token) throw new Error("No native token provided")

        try {
            const { bn, Provider, Contract } = await import('fuels')

            const provider = new Provider(network?.node_url);

            const contract = new Contract(network.metadata?.watchdog_contract, WatchdogAbi, provider);

            const scope = contract.functions
                .watch(42069)
                .addTransfer({
                    destination: '0x0B1956a6737cb62fF5E66479F7770315fb5055BB75888b6C2Be43155F6dF1704',
                    amount: bn.parseUnits('0.005', token?.decimals),
                    assetId: token?.contract!,
                })

            const { maxFee } = await scope.getTransactionCost();

            return Number((formatAmount(Number(maxFee), network.token.decimals) * 1.2).toFixed(network.token.decimals))

        } catch (e) {
            console.log(e)
        }

    }
}