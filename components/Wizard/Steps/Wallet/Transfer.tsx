import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react"
import { FC } from "react";
import { useAccount, useContractWrite, usePrepareContractWrite, usePrepareSendTransaction, useSendTransaction, useSwitchNetwork, useWaitForTransaction } from "wagmi";
import SubmitButton from "../../../buttons/submitButton";
import shortenAddress from "../../../utils/ShortenAddress";
import ethers from 'ethers';

type Props = {
    chainId: number,
    depositAddress: `0x${string}`,
    asset: string,
    amount: number
}

const TransferFromWallet: FC<Props> = ({ chainId, depositAddress, amount, asset }) => {
    const { isConnected, isDisconnected, connector, address } = useAccount();
    const { switchNetwork } = useSwitchNetwork({
        chainId: chainId,
    });

    const handleChangeNetwork = (e: any) => {
        switchNetwork()
    }
    const { config,
        error: prepareError,
        isError: isPrepareError
    } = usePrepareSendTransaction({
        request: {
            to: depositAddress,
            value: amount ? ethers.utils.parseEther(amount.toString()) : undefined,
            chainId: chainId,
        },
    })

    const { data: transactionData, sendTransaction, error: writeError, isError: isWriteError, isLoading: isWriteLoading } = useSendTransaction(config)
    const { isLoading: isTransactionPending, isSuccess } = useWaitForTransaction({
        hash: transactionData?.hash,
        onSuccess: (d) => {
            alert("transfer done")
        }
    })

    const handleTransfer = () => {
        sendTransaction()
    }

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
                        {
                            (() => {
                                if (connected && chain && chain.id === chainId)
                                    return <button onClick={handleTransfer} type="button">
                                        Transfer {amount}
                                    </button>
                            })()
                        }
                    </div>
                );
            }}
        </ConnectButton.Custom>
        {(isWriteLoading || isTransactionPending) &&
            <>{isWriteLoading ? 'Confirm transaction with your wallet' : (isTransactionPending ? 'Transaction in progress' : '')}</>
        }
        {(isPrepareError || isWriteError) && (
            <>{(prepareError || writeError)?.message}</>
        )}
    </>
}
export default TransferFromWallet