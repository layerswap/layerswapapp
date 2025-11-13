import { FC } from "react";
import { ChevronDown } from "lucide-react";
import FailIcon from "../../../../Icons/FailIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";

export type WalletMessageProps = {
    header: string;
    details: string;
    status: 'pending' | 'error';
    showInModal?: boolean;
}
const WalletMessage: FC<WalletMessageProps> = ({ header, details, status, showInModal }) => {
    return <div className="flex text-center space-x-2">
        <div className='relative -mt-0.5'>
            {
                status === "error" ?
                    <FailIcon className="relative top-0 left-0 w-6 h-6 md:w-7 md:h-7" />
                    :
                    <>
                        <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                    </>
            }
        </div>
        {showInModal ? (
            <div className="text-left space-y-1 w-full max-w-2xl">
                <Accordion type="single" collapsible>
                    <AccordionItem value="wallet-message">
                        <AccordionTrigger className="flex justify-between w-full items-center">
                            <p className="text-md font-semibold self-center text-primary-text">
                                {header}
                            </p>
                            <ChevronDown className="h-4 w-4 shrink-0 text-primary-text transition-transform duration-200 data-[state=open]:rotate-180" />
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="text-left space-y-1">
                                <p className="text-sm text-secondary-text wrap-anywhere whitespace-pre-wrap">
                                    {details}
                                </p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        ) : (
            <div className="text-left space-y-1">
                <p className="text-md font-semibold self-center text-primary-text">
                    {header}
                </p>
                <p
                    className={`text-sm text-secondary-text ${details.length > 200 ? "break-words" : ""
                        }`}
                >
                    {details}
                </p>
            </div>
        )}
    </div>
}

export default WalletMessage