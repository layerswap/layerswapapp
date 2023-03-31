import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react"
import { FC } from "react";
import { useAccount, usePrepareContractWrite, usePrepareSendTransaction, useSwitchNetwork } from "wagmi";
import SubmitButton from "../../../buttons/submitButton";
import shortenAddress from "../../../utils/ShortenAddress";
import { BigNumber, ethers, utils } from 'ethers';

type Props = {
    chainId: number,
    depositAddress: `0x${string}`,
    amount: number
}

const TransferFromWallet: FC<Props> = ({ chainId, depositAddress, amount }) => {
    const { isConnected, isDisconnected, connector, address } = useAccount();
    const { switchNetwork } = useSwitchNetwork({
        chainId: chainId,
    });

    const handleChangeNetwork = (e: any) => {
        switchNetwork()
    }

    // const {
    //     config,
    //     error: prepareError,
    //     isError: isPrepareError
    // } = usePrepareContractWrite({
    //     address: depositAddress,
    //     functionName: 'sendToTwitterHandle',
    //     enabled: Boolean(handle) && isConnected && numericAmount > 0,
    //     overrides: {
    //         value: numericAmount > 0 ? ethers.utils.parseEther((amountIsInUSD ? usdToAsset(numericAmount, usdPriceData.price) : numericAmount)?.toString()) : BigNumber.from(0),
    //         gasLimit: BigNumber.from(1500000)
    //     }
    // });

    // const { data: writeData, write, error: writeError, isError: isWriteError, isLoading: isWriteLoading } = useContractWrite(config)
    // const { isLoading: isTransactionPending, isSuccess, data } = useWaitForTransaction({
    //     hash: writeData?.hash,
    //     onSuccess: (d) => {
    //         router.push(`/sent?txId=${d.transactionHash}&handle=${handle}&amount=${numericAmount}`);
    //     }
    // });
    return <>
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected =
                    ready &&
                    account &&
                    chain
                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            'style': {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <SubmitButton text_align='center' isDisabled={false} isSubmitting={false} onClick={openConnectModal} buttonStyle='outline' size="medium" icon={<Wallet className="h-6 w-6" />} >
                                        Connect wallet
                                    </SubmitButton>
                                );
                            }
                            return (
                                <span className='w-full cursor-pointer' onClick={openConnectModal} >
                                    {shortenAddress(account.address)}
                                </span>
                            );
                        })()}
                        {
                            (() => {
                                if (chain && chain.id !== chainId)
                                    return <button onClick={handleChangeNetwork} type="button">
                                        Change network
                                    </button>
                            })()
                        }
                    </div>
                );
            }}
        </ConnectButton.Custom>
    </>
}
export default TransferFromWallet