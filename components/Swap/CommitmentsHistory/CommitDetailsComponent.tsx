import { FC } from 'react'
import Image from 'next/image'
import CopyButton from '../../buttons/copyButton';
import shortenAddress from '../../utils/ShortenAddress';
import { Commit } from '../../../Models/PHTLC';
import { useSettingsState } from '../../../context/settings';
import { Wallet } from '../../../stores/walletStore';
import formatAmount from '../../../lib/formatAmount';
import SubmitButton from '../../buttons/submitButton';
import { useRouter } from 'next/router';
import { Eye } from 'lucide-react';
import StatusIcon from './StatusIcons';
import { HistoryCommit } from '.';

type Props = {
    commit: HistoryCommit,
    selectedWallet: Wallet
}

const CommitDetails: FC<Props> = ({ commit, selectedWallet }) => {
    const router = useRouter()

    const { amount, dstAddress, dstAsset, dstChain, locked, messenger, sender, srcAsset, srcReceiver, timelock, uncommitted, id } = commit

    const { networks } = useSettingsState()

    const source_network = networks.find(n => n.chain_id == selectedWallet.chainId)
    const source_token = source_network?.tokens.find(t => t.symbol === srcAsset)

    const destination_network = networks.find(n => n.name.toUpperCase() === dstChain.toUpperCase())
    const destination_token = destination_network?.tokens.find(t => t.symbol === dstAsset)

    const input_tx_explorer_template = source_network?.transaction_explorer_template
    const output_tx_explorer_template = destination_network?.transaction_explorer_template

    return (
        <>
            <div className="w-full grid grid-flow-row animate-fade-in">
                <div className="rounded-md w-full grid grid-flow-row">
                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-secondary-text">
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Id </span>
                            <span className="text-primary-text">
                                <div className='inline-flex items-center'>
                                    <CopyButton toCopy={id} iconClassName="text-gray-500">
                                        {shortenAddress(id)}
                                    </CopyButton>
                                </div>
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Status </span>
                            <span className="text-primary-text">
                                {commit && <StatusIcon commit={commit} />}
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Timelock </span>
                            <span className='text-primary-text font-normal'>{(new Date(Number(commit.timelock) * 1000)).toLocaleString()}</span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">From  </span>
                            {
                                source_network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            <Image
                                                src={source_network.logo}
                                                alt="Exchange Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }

                                    </div>
                                    <div className="mx-1 text-primary-text">{source_network?.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">To </span>
                            {
                                destination_network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            <Image
                                                src={destination_network.logo}
                                                alt="Exchange Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }
                                    </div>
                                    <div className="mx-1 text-primary-text">{destination_network.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Address </span>
                            <span className="text-primary-text">
                                <div className='inline-flex items-center'>
                                    <CopyButton toCopy={dstAddress} iconClassName="text-gray-500">
                                        {shortenAddress(dstAddress)}
                                    </CopyButton>
                                </div>
                            </span>
                        </div>
                        {/* {swapInputTransaction?.transaction_hash &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Source Tx </span>
                                    <span className="text-primary-text">
                                        <div className='inline-flex items-center'>
                                            <div className='underline hover:no-underline flex items-center space-x-1'>
                                                <a target={"_blank"} href={input_tx_explorer_template?.replace("{0}", swapInputTransaction.transaction_hash)}>{shortenAddress(swapInputTransaction.transaction_hash)}</a>
                                                <ExternalLink className='h-4' />
                                            </div>
                                        </div>
                                    </span>
                                </div>
                            </>
                        }
                        {swapOutputTransaction?.transaction_hash &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Destination Tx </span>
                                    <span className="text-primary-text">
                                        <div className='inline-flex items-center'>
                                            <div className='underline hover:no-underline flex items-center space-x-1'>
                                                <a target={"_blank"} href={output_tx_explorer_template?.replace("{0}", swapOutputTransaction.transaction_hash)}>{shortenAddress(swapOutputTransaction.transaction_hash)}</a>
                                                <ExternalLink className='h-4' />
                                            </div>
                                        </div>
                                    </span>
                                </div>
                            </>
                        } */}
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Committed amount</span>
                            <span className='text-primary-text font-normal flex'>
                                {source_token && formatAmount(amount, source_token?.decimals)} {source_token?.symbol}
                            </span>
                        </div>
                        {/* {
                            swapInputTransaction &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Transfered amount</span>
                                    <span className='text-primary-text font-normal flex'>
                                        {swapInputTransaction?.amount} {source_token?.symbol}
                                    </span>
                                </div>
                            </>
                        }
                        {
                            swapOutputTransaction &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Layerswap Fee </span>
                                    <span className='text-primary-text font-normal'>{swapData?.quote.total_fee} {source_token?.symbol}</span>
                                </div>
                            </>
                        }
                        {
                            swapOutputTransaction &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Amount You Received</span>
                                    <span className='text-primary-text font-normal flex'>
                                        {swapOutputTransaction?.amount} {destination_token?.symbol}
                                    </span>
                                </div>
                            </>
                        } */}
                    </div>
                </div>
            </div>
            <div className="text-primary-text text-sm mt-6 space-y-3">
                <div className="flex flex-row text-primary-text text-base space-x-2">
                    <SubmitButton
                        text_align="center"
                        onClick={() => router.push({
                            pathname: `/atomic`,
                            query: {
                                amount: source_token && formatAmount(amount, source_token?.decimals),
                                address: dstAddress,
                                source: source_network?.name,
                                destination: destination_network?.name,
                                source_asseet: srcAsset,
                                destination_asset: dstAsset,
                                commitId: id
                            }
                        }, undefined, { shallow: false })}
                        icon={
                            <Eye
                                className='h-5 w-5' />
                        }
                    >
                        View swap
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default CommitDetails;
