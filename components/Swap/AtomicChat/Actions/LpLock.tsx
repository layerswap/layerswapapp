import { FC, useEffect } from "react";
import { Network, Token } from "../../../../Models/Network";
import useWallet, { WalletProvider } from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import LightClient from "../../../../lib/lightClient";
import SubmitButton from "../../../buttons/submitButton";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, setDestinationDetails, destination_asset } = useAtomicState()
    const { getWithdrawalProvider } = useWallet()

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const atomicContract = (destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract) as `0x${string}`
    const supportsHelios = destination_network?.chain_id && destination_network?.chain_id == "11155111"

    const getDetails = async ({ provider, network, commitId, asset }: { provider: WalletProvider, network: Network, commitId: string, asset: Token }) => {
        if (supportsHelios) {
            const lightClient = new LightClient({
                network: network,
                token: asset,
                commitId,
                atomicContract
            })

            const destinationDetails = await lightClient.getHashlock()
            if (destinationDetails) {
                setDestinationDetails(destinationDetails)
                return
            }
        }

        let lockHandler: any = undefined
        lockHandler = setInterval(async () => {
            if (!network.chain_id)
                throw Error("No chain id")

            if (provider.secureGetDetails) {
                try {
                    const destiantionDetails = await provider.secureGetDetails({
                        type: asset?.contract ? 'erc20' : 'native',
                        chainId: network.chain_id,
                        id: commitId,
                        contractAddress: atomicContract,
                    })

                    if (destiantionDetails?.hashlock) {
                        setDestinationDetails(destiantionDetails)
                        clearInterval(lockHandler)
                    }
                    return
                }
                catch (e) {
                    clearInterval(lockHandler)
                    console.log(e)
                }

            }

            const destiantionDetails = await provider.getDetails({
                type: asset?.contract ? 'erc20' : 'native',
                chainId: network.chain_id,
                id: commitId,
                contractAddress: atomicContract
            })

            if (destiantionDetails?.hashlock) {
                setDestinationDetails(destiantionDetails)
                clearInterval(lockHandler)
            }

        }, 5000)

        return () => {
            lockHandler && clearInterval(lockHandler);
        };

    }

    useEffect(() => {
        (async () => {
            if (destination_provider && destination_network && commitId && destination_asset) {
                await getDetails({ provider: destination_provider, network: destination_network, commitId, asset: destination_asset })
            }
        })()
    }, [destination_provider, destination_network, commitId])

    return <SubmitButton
        isDisabled={true}
    >
        Sign & Confirm
    </SubmitButton>
}