import Image from "next/image";
import { Transaction } from "@/models/Swap";
import { formatAmount } from "@/helpers/formatAmount";
import CopyButton from "./buttons/copyButton";
import { shortenAddress } from "@/lib/utils";

export default function Refund({ refund }: { refund: Transaction }) {
    const asset = refund.token;
    const network = refund.network;
    const txHash = refund.transaction_hash;

    return (
        <div className="rounded-md w-full p-6 grid gap-y-3 items-baseline bg-secondary-900 rounded-t-lg border-secondary-500 border-t-4 shadow-lg mb-2">
            <div className="flex items-center text-white">
                <div className="mr-2 text-2xl font-medium">Refund</div>
            </div>
            <div className="rounded-md w-full grid grid-cols-8 text-primary-text bg-secondary-700 shadow-lg relative border-secondary-600 border divide-y divide-secondary-500">
                <div className="flex-1 p-4 whitespace-nowrap col-span-2">
                    <div className="text-base font-normal text-socket-secondary">Asset</div>
                    <div className="flex items-center">
                        <span className="text-sm lg:text-base font-medium text-socket-table text-white flex items-center">
                            <Image alt="Source token icon" src={asset?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md mr-2" />
                            {formatAmount(refund?.amount)} {asset?.symbol}
                        </span>
                    </div>
                </div>
                <div className="flex-1 p-4 border-secondary-600 border-l col-span-2">
                    <div className="text-base font-normal text-socket-secondary">Network</div>
                    <div className="flex items-center">
                        <Image alt="Source chain icon" src={network?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md mr-2" />
                        <span className="text-sm lg:text-base font-medium text-socket-table text-white">{network?.display_name}</span>
                    </div>
                </div>
                <div className="flex flex-col p-4 border-secondary-600 border-l col-span-4">
                    <div className="text-base font-normal text-socket-secondary">Transaction</div>
                    <div className="text-sm lg:text-base font-medium text-tx-base w-full">
                        <div className="flex justify-between items-center text-white">
                            <span className="break-all">{shortenAddress(txHash)}</span>
                            <CopyButton toCopy={txHash} iconHeight={16} iconClassName="order-2" iconWidth={16} className="ml-2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
