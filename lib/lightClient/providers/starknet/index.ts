import formatAmount from "../../../formatAmount"
import _LightClient from "../../types/lightClient"
import EVMERC20_PHTLC from '../../../abis/atomic/EVMERC20_PHTLC.json'
import EVM_PHTLC from '../../../abis/atomic/EVM_PHTLC.json'
import { Commit } from "../../../../Models/PHTLC"
import KnownInternalNames from "../../../knownIds"
import { Network, Token } from "../../../../Models/Network"

export default class StarknetLightClient extends _LightClient {

    private supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetSepolia,
    ]

    supportsNetwork = (network: Network): boolean => {
        return this.supportedNetworks.includes(network.name)
    }

    init = async () => { return { initialized: false } }
    getDetails = async ({ network, token, commitId, atomicContract }: { network: Network, token: Token, commitId: string, atomicContract: string }) => {
        return new Promise((resolve: (value: Commit) => void, reject) => {
            try {

                const heliosWorker = new Worker('/workers/beerus/beerusWorker.js', {
                    type: 'module',
                })

                const workerMessage = {
                    type: 'init',
                    payload: {
                        data: {
                            commitConfigs: {
                                commitId: commitId,
                                abi: token.contract ? EVMERC20_PHTLC : EVM_PHTLC,
                                contractAddress: atomicContract,
                                network: network.name
                            },
                        },
                    },
                }
                heliosWorker.postMessage(workerMessage)

                heliosWorker.onmessage = (event) => {
                    const result = event.data.data
                    const parsedResult: Commit = {
                        ...result,
                        secret: Number(result.secret) !== 1 ? result.secret : null,
                        amount: formatAmount(Number(result.amount), token.decimals),
                        timelock: Number(result.timelock)
                    }
                    console.log('Worker event:', event)
                    resolve(parsedResult)
                }
                heliosWorker.onerror = (error) => {
                    reject(error)
                    console.error('Worker error:', error)
                }

            } catch (error) {
                console.error('Error connecting:', error);
                reject(error); // Reject the promise if an exception is thrown
            }
        });

    }
}