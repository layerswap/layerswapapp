import { FC, useEffect } from "react";
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ButtonStatus from "./Status/ButtonStatus";
import { WalletActionButton } from "../buttons";
import SubmitButton from "../../../buttons/submitButton";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, setDestinationDetails, destination_asset } = useAtomicState()
    const { getWithdrawalProvider } = useWallet()

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const atomicContract = (destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract) as `0x${string}`

    useEffect(() => {
        let lockHandler: any = undefined
        if (destination_provider && destination_network && commitId) {
            lockHandler = setInterval(async () => {
                if (!destination_network.chain_id)
                    throw Error("No chain id")

                const destiantionDetails = await destination_provider.getDetails({
                    type: destination_asset?.contract ? 'erc20' : 'native',
                    chainId: destination_network.chain_id,
                    id: commitId,
                    contractAddress: atomicContract
                })

                if (destiantionDetails?.hashlock) {
                    setDestinationDetails(destiantionDetails)
                    clearInterval(lockHandler)
                }

            }, 5000)
        }
        return () => {
            lockHandler && clearInterval(lockHandler);
        };
    }, [destination_provider, destination_network, commitId])

    return <SubmitButton
        isDisabled={true}
    >
        Sign & Confirm
    </SubmitButton>
}