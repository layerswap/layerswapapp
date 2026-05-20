import { WalletIcon } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import { AuthorizeStarknet } from '../../Authorize/Starknet';
import { SendTransactionButton, KnownInternalNames, useSelectedAccount, useWallet, useSettingsState, ActionMessage, ErrorHandler } from '@layerswap/widget/internal';
import { TransferProps, ActionMessageType, WithdrawPageProps, Network } from '@layerswap/widget/types';

const StarknetComponent: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {

    const [loading, setLoading] = useState(false)
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<Error | undefined>()

    const { source_token } = swapBasicData;
    const { networks } = useSettingsState();
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);

    const selectedSourceAccount = useSelectedAccount("from", starknet?.name);
    const { wallets } = useWallet(starknet, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const handleTransfer = useCallback(async ({ amount, callData, swapId }: TransferProps) => {
        if (!swapId || !source_token) {
            return
        }

        try {
            setLoading(true)
            setButtonClicked(true)
            setError(undefined)
            
            if (!selectedSourceAccount) {
                throw Error("Starknet wallet not connected")
            }
    
            if (amount == undefined && !amount)
                throw Error("No amount")

            const snAccount = wallet?.metadata?.starknetAccount
            if (!snAccount) {
                throw Error("Starknet account not found")
            }
            if (!starknet?.node_url) {
                throw Error("Starknet node url not found")
            }
            const client = await AuthorizeStarknet(snAccount as any)
            const account = (client as any).account;
            const parsedCallData = JSON.parse(callData || "")

            const res = await account.execute(parsedCallData, { maxFee: '1000000000000000' });

            if (res.transaction_hash) {
                return res.transaction_hash
            }
        }
        catch (error) {
            (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setError(error as Error)
            ErrorHandler({
                type: "TransferError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
        finally {
            setLoading(false)
        }
    }, [selectedSourceAccount?.address, starknet, source_token])


    return (
        <>
            {
                buttonClicked &&
                <ActionMessage
                    error={error}
                    isLoading={loading}
                    selectedSourceAddress={selectedSourceAccount?.address || ''}
                    sourceNetwork={starknet as Network}
                />
            }
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                {
                    selectedSourceAccount &&
                    <div className="flex flex-row text-primary-text text-base space-x-2">
                        <SendTransactionButton
                            isDisabled={!!(loading)}
                            isSubmitting={!!(loading)}
                            onClick={handleTransfer}
                            icon={<WalletIcon className="h-5 w-5 ml-2" aria-hidden="true" />}
                            swapData={swapBasicData}
                            refuel={refuel}
                        >
                            Send from Starknet wallet
                        </SendTransactionButton>
                    </div>
                }
            </div >
        </>
    )
}
export default StarknetComponent;