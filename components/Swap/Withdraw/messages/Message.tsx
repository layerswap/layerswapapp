import { FC, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import FailIcon from "../../../icons/FailIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";

export type WalletMessageProps = {
    header: string;
    details: string;
    status: 'pending' | 'error';
}
const WalletMessage: FC<WalletMessageProps> = ({ header, details, status }) => {
    return <>
        <div className="px-2 py-3 rounded-2xl bg-secondary-400">
            <div className="flex items-start gap-2 relative">
                <span className="shrink-0 p-0.5">
                    {
                        status === "error" ?
                            <FailIcon className="relative top-0 left-0 h-5 w-5" />
                            :
                            <>
                                <div className='absolute top-1.5 left-1.5 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                <div className='absolute top-2.5 left-2.5 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                                <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                            </>
                    }
                </span>
                <div className="flex flex-col gap-1">
                    <p className="text-white font-medium leading-4 text-base mt-0.5">{header}</p>
                    {details ? <p className="text-secondary-text text-sm leading-[18px]">{details}</p> : null}
                </div>
            </div>
        </div>
    </>
}

export const WalletUnknownError: FC = () => {
    return <div className="text-left space-y-1 w-full max-w-2xl rounded-2xl ">
        <Accordion type="single" collapsible className="rounded-2xl bg-secondary-500 overflow-hidden">
            <AccordionItem value="wallet-message">
                <AccordionTrigger className="flex justify-between w-full gap-2 items-center px-2 py-3 bg-secondary-400 rounded-2xl group">
                    <div className="shrink-0 p-0.5 self-start">
                        <FailIcon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                        <p className="text-white font-medium leading-4 text-base">Wallet error</p>
                        <p className="text-sm text-secondary-text text-left wrap-anywhere whitespace-pre-wrap">An error occurred, the swap wasn’t initiated your assets were not moved.</p>
                    </div>
                    <ChevronDown className="h-4 w-4 self-start shrink-0 text-primary-text transition-transform duration-200 group-aria-expanded:rotate-180" />
                </AccordionTrigger>
                <AccordionContent>
                    <div className="text-left space-y-1 bg-secondary-500 px-10 py-3">
                        <p className="text-sm text-secondary-text wrap-anywhere whitespace-pre-wrap">
                            <span>Try one of the following:</span>
                            <ul className="list-outside pl-6 list-disc">
                                <li>Reconnect your wallet</li>
                                <li>Switch the wallet network, to match the swap’s source network</li>
                                <li>Restart the browser and the wallet app</li>
                            </ul>
                            <br />
                            <p>If the error persists try the manual transfer options</p>
                        </p>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
}

export default WalletMessage