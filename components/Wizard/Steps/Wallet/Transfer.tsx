import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, X } from "lucide-react"
import { FC } from "react";
import { useAccount, useContractWrite, usePrepareContractWrite, usePrepareSendTransaction, useSendTransaction, useSwitchNetwork, useWaitForTransaction } from "wagmi";
import SubmitButton from "../../../buttons/submitButton";
import shortenAddress from "../../../utils/ShortenAddress";
import { BigNumber, utils } from 'ethers';
import { erc20ABI } from 'wagmi'


type Props = {
    chainId: number,
    depositAddress: `0x${string}`,
    tokenContractAddress: `0x${string}`,
    amount: number
}

const TransferFromWallet: FC<Props> = ({ chainId, depositAddress, amount, tokenContractAddress }) => {
    const { isConnected, isDisconnected, connector, address } = useAccount();
    const { switchNetwork } = useSwitchNetwork({
        chainId: chainId,
    });

    const handleChangeNetwork = (e: any) => {
        switchNetwork()
    }
    // const { config,
    //     error: prepareError,
    //     isError: isPrepareError
    // } = usePrepareSendTransaction({
    //     request: {
    //         to: depositAddress,
    //         value: amount ? utils.parseEther(amount.toString()) : undefined,
    //     },
    //     chainId: chainId,
    // })
    const {
        config,
        error: prepareError,
        isError: isPrepareError
    } = usePrepareContractWrite({
        address: tokenContractAddress || depositAddress,
        abi: erc20ABI,
        functionName: 'transfer',
        enabled: isConnected,
        args: [depositAddress, utils.parseUnits(amount.toString(), 6)],
        overrides: {
            gasLimit: BigNumber.from(1500000)
        }
    });

    const { data: writeData, write, error: writeError, isError: isWriteError, isLoading: isWriteLoading } = useContractWrite(config)
    const { isLoading: isTransactionPending, isSuccess } = useWaitForTransaction({
        hash: writeData?.hash,
        onSuccess: (d) => {
            alert("transfer done")
        }
    })

    const handleTransfer = () => {
        write()
    }

    return <>
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openConnectModal,
                openAccountModal,
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
                                    <SubmitButton text_align='center' isDisabled={false} isSubmitting={false} onClick={openConnectModal} buttonStyle='filled' size="medium">
                                        Connect wallet
                                    </SubmitButton>
                                );
                            }
                            return (<>
                            </>);
                        })()}
                        {
                            (() => {
                                if (connected)
                                    return <>
                                        <div className="flex flex-row text-white text-base space-x-2">
                                            <div className='basis-1/3'>
                                                <SubmitButton onClick={openAccountModal} text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline'>
                                                    {shortenAddress(account.address)}
                                                </SubmitButton>
                                            </div>
                                            {
                                                (() => {
                                                    if (chain && chain.id === chainId) {
                                                        return <div className='basis-2/3'>
                                                            <SubmitButton text_align='center' isDisabled={false} isSubmitting={false} onClick={handleTransfer} buttonStyle='filled' size="medium">
                                                                Transfer {amount}
                                                            </SubmitButton>
                                                        </div>
                                                    }
                                                    else {
                                                        return <div className='basis-2/3'>
                                                            <SubmitButton text_align='center' isDisabled={false} isSubmitting={false} onClick={handleChangeNetwork} buttonStyle='filled' size="medium">
                                                                Change network
                                                            </SubmitButton>
                                                        </div>
                                                    }
                                                })()
                                            }

                                        </div>
                                    </>
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