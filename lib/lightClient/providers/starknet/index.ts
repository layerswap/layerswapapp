import formatAmount from "../../../formatAmount"
import _LightClient from "../../types/lightClient"
import EVMERC20_PHTLC from '../../../abis/atomic/EVMERC20_PHTLC.json'
import EVM_PHTLC from '../../../abis/atomic/EVM_PHTLC.json'
import { Commit } from "../../../../Models/PHTLC"
import KnownInternalNames from "../../../knownIds"
import { Network, Token } from "../../../../Models/Network"

export default class StarknetLightClient extends _LightClient {

    private worker: Worker

    private supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetSepolia,
    ]

    supportsNetwork = (network: Network): boolean => {
        return this.supportedNetworks.includes(network.name)
    }

    init({ network }: { network: Network }) {
        return new Promise((resolve: (value: { initialized: boolean }) => void, reject) => {
            try {
                const worker = new Worker('/workers/beerus/beerusWorker.js', {
                    type: 'module',
                })

                const workerMessage = {
                    type: 'init',
                    payload: {
                        data: {
                            initConfigs: {
                                hostname: window.location.origin,
                                network: network.name,
                                alchemyKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
                                version: network.name.toLowerCase().includes('sepolia') ? 'sandbox' : 'mainnet'
                            },
                        },
                    },
                }
                worker.postMessage(workerMessage)
                this.worker = worker

                worker.onmessage = (event) => {
                    const result = event.data.data

                    console.log('Worker event:', event)
                    if (result.initialized) {
                        resolve(result)
                    } else {
                        reject(result)
                    }
                }
                worker.onerror = (error) => {
                    reject(error)
                    console.error('Worker error:', error)
                }

            } catch (error) {
                console.error('Error connecting:', error);
                reject(error); // Reject the promise if an exception is thrown
            }
        });
    }
    getDetails = async ({ network, token, commitId, atomicContract }: { network: Network, token: Token, commitId: string, atomicContract: string }) => {
        return new Promise(async (resolve: (value: Commit) => void, reject) => {
            try {

                if (!this.worker) {
                    const result = await this.init({ network })
                    if (!result.initialized) {
                        throw new Error('Worker could not be initialized')
                    }
                }

                const workerMessage = {
                    type: 'getDetails',
                    payload: {
                        data: {
                            commitConfigs: {
                                commitId: commitId,
                                contractAddress: atomicContract,
                            },
                        },
                    },
                }
                this.worker.postMessage(workerMessage)

                this.worker.onmessage = (event) => {
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
                this.worker.onerror = (error) => {
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