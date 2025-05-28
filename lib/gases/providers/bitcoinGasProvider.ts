import { GasProps } from "../../../Models/Balance";
import { Network, NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import axios from "axios";

interface RecommendedFeeResponse {
    fastestFee: number,
    halfHourFee: number,
    hourFee: number,
    economyFee: number,
    minimumFee: number
}

export class BitcoinGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    async getGas({ network }: GasProps): Promise<any> {

        if (!network?.token) throw new Error("No native token provided")

        try {
            const recommendedFees = await fetchRecommendedFees(network.name);

            return Number((formatAmount(Number(recommendedFees.economyFee), network.token.decimals) * 2).toFixed(network.token.decimals))

        } catch (e) {
            console.log(e)
        }

    }
}

async function fetchRecommendedFees(networkName: string): Promise<RecommendedFeeResponse> {
    const url = `https://mempool.space${networkName.toLowerCase().includes('testnet') ? '/testnet' : ''}/api//v1/fees/recommended`;
    const fetchedData = await axios.get<RecommendedFeeResponse>(url)
    return fetchedData.data

}