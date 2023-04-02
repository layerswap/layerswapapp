import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react"
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
        address: "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C",
        abi: erc20ABI,
        functionName: 'transfer',
        enabled: isConnected,
        args: [depositAddress, BigNumber.from(amount)],
        overrides: {
            gasLimit: BigNumber.from(1500000)
        }
    });
    console.log("bn", BigNumber.from(amount))
    console.log("eth", utils.parseEther(amount.toString()))

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
                                    <SubmitButton text_align='center' isDisabled={false} isSubmitting={false} onClick={openConnectModal} buttonStyle='outline' size="medium">
                                        Connect wallet
                                    </SubmitButton>
                                );
                            }
                            return (
                                <span className='w-full cursor-pointer block p-5 bg-darkblue-800 text-primary-text' onClick={openAccountModal} >
                                    {shortenAddress(account.address)}
                                </span>
                            );
                        })()}
                        {
                            (() => {
                                if (chain && chain.id !== chainId)
                                    return <SubmitButton text_align='center' isDisabled={false} isSubmitting={false} onClick={handleChangeNetwork} buttonStyle='outline' size="medium">
                                        Change network
                                    </SubmitButton>
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