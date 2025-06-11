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
            const recommendedFees = await fetchRecommendedFees(network.node_url);

            return Number((formatAmount(Number(recommendedFees.economyFee), network.token.decimals) * 2).toFixed(network.token.decimals))

        } catch (e) {
            console.log(e)
        }

    }
}

async function fetchRecommendedFees(node_url: string): Promise<RecommendedFeeResponse> {
    const payload = {
        jsonrpc: "2.0",
        method: 'estimatesmartfee',
        params: [6],
        id: 1,
    };

    const response = await fetch(node_url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const json = await response.json();

    if (!response.ok || !json.result || !json.result.feerate) {
        throw new Error(`Failed to fetch fee: ${json.error?.message || 'Unknown error'}`);
    }
    return json.result.feerate; // Returns the fee rate in satoshis per byte

}