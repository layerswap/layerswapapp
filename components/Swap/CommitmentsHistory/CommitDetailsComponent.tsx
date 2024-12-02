import { FC } from 'react'
import Image from 'next/image'
import CopyButton from '../../buttons/copyButton';
import shortenAddress from '../../utils/ShortenAddress';
import { useSettingsState } from '../../../context/settings';
import SubmitButton from '../../buttons/submitButton';
import { useRouter } from 'next/router';
import { Eye } from 'lucide-react';
import StatusIcon from './StatusIcons';
import { HistoryCommit } from '.';
import { NetworkWithTokens, Token } from '../../../Models/Network';
import { truncateDecimals } from '../../utils/RoundDecimals';

type Props = {
    commit: HistoryCommit,
    source_network: NetworkWithTokens
    source_asset: Token,
    destination_network: NetworkWithTokens,
}

const CommitDetails: FC<Props> = ({ commit, source_network, destination_network, source_asset }) => {
    const router = useRouter()

    const { amount, id } = commit

    return (
        <>
            {/* <div className="w-full grid grid-flow-row animate-fade-in">
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
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Committed amount</span>
                            <span className='text-primary-text font-normal flex'>
                                {source_asset && truncateDecimals(amount, source_asset?.precision)} {source_asset?.symbol}
                            </span>
                        </div>
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
                                amount: source_asset && truncateDecimals(amount, source_asset?.precision),
                                address: dstAddress,
                                source: source_network?.name,
                                destination: destination_network?.name,
                                source_asset: srcAsset,
                                destination_asset: dstAsset,
                                commitId: id
                            }
                        }, undefined, { shallow: false })}
                        icon={
                            <Eye className='h-5 w-5' />
                        }
                    >
                        View swap
                    </SubmitButton>
                </div>
            </div> */}
        </>
    )
}

export default CommitDetails;