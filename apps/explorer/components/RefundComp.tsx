import Image from "next/image";
import { Transaction } from "@/models/Swap";
import { formatAmount } from "@/helpers/formatAmount";
import CopyButton from "./buttons/copyButton";
import { shortenAddress } from "@/lib/utils";
import Link from "next/link";

export default function Refund({ refund }: { refund: Transaction }) {
    const asset = refund.token;
    const network = refund.network;
    const txHash = refund.transaction_hash;

    return (
        <div className="w-full lg:p-6 grid gap-y-3 items-baseline">
            <div className="flex items-center text-primary-text">
                <div className="mr-2 text-2xl font-medium">Refund transaction</div>
            </div>
            <div className="rounded-lg w-full grid grid-cols-2 lg:grid-cols-8 text-primary-text bg-secondary-500 shadow-lg relative border-secondary-400 border-t-4">
                <div className="flex-1 p-4 whitespace-nowrap col-span-2">
                    <div className="text-base font-normal text-secondary-text">Asset</div>
                    <div className="flex items-center">
                        <span className="text-sm lg:text-base font-medium text-primary-text flex items-center">
                            <Image alt="Source token icon" src={asset?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md mr-2" />
                            {formatAmount(refund?.amount)} {asset?.symbol}
                        </span>
                    </div>
                </div>
                <div className="flex-1 p-4 border-secondary-400 border-l col-span-2">
                    <div className="text-base font-normal text-secondary-text">Network</div>
                    <div className="flex items-center">
                        <Image alt="Source chain icon" src={network?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md mr-2" />
                        <span className="text-sm lg:text-base font-medium text-primary-text">{network?.display_name}</span>
                    </div>
                </div>
                <div className="flex flex-col p-4 border-secondary-400 border-t lg:border-l col-span-4">
                    <div className="text-base font-normal text-secondary-text">Transaction</div>
                    <div className="text-sm lg:text-base font-medium text-tx-base w-full">
                        <div className="flex justify-between items-center text-primary-text">

                            <Link
                                href={network?.transaction_explorer_template?.replace('{0}', txHash) || '#'}
                                target="_blank"
                                className="hover:text-secondary-text w-fit contents items-center"
                            >
                                <span className="break-all">
                                    {shortenAddress(txHash)}
                                </span>
                            </Link>
                            <CopyButton toCopy={txHash} iconHeight={16} iconClassName="order-2" iconWidth={16} className="ml-2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
