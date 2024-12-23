import { Network, Token } from "../../Models/Network"
import EVMLightClient from "./providers/evm"
// import StarknetLightClient from "./providers/starknet"

export default class LightClient {
    protected network: Network
    protected token: Token
    protected commitId: string
    protected atomicContract: string

    constructor({ network, token, commitId, atomicContract }: { network: Network, token: Token, commitId: string, atomicContract: string }) {
        this.network = network
        this.token = token
        this.commitId = commitId
        this.atomicContract = atomicContract
    }

    private providers = [
        new EVMLightClient(),
        // new StarknetLightClient()
    ]

    getHashlock = async () => {
        const provider = this.providers.find(p => p.supportsNetwork(this.network));

        if (!provider) throw new Error(`No light client provider found for network ${this.network.name}`);

        return provider.getDetails({
            network: this.network,
            token: this.token,
            commitId: this.commitId,
            atomicContract: this.atomicContract
        })
    }

}