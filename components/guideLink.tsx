import { ReactNode } from "react";
import SecondaryButton from "./buttons/secondaryButton";
import { DocIframe } from "./docInIframe";
import SlideOver, { slideOverPlace } from "./SlideOver";

export default function GuideLink({ userGuideUrl, text, button, buttonClassNames, place = "inStep" }: { userGuideUrl: string, text?: string, button?: ReactNode, buttonClassNames?: string, place?: slideOverPlace }) {
    return (
        <SlideOver moreClassNames="bg-[#181c1f] sm:!pb-6 !pb-0" opener={(open) =>
            button ?
                <SecondaryButton onClick={open} className={buttonClassNames}>
                    {button}
                </SecondaryButton>
                :
                <span className='text-primary cursor-pointer hover:text-primary-400' onClick={open}>&nbsp;<span>{text}</span></span>
        }
            place={place}
            header={text || button}>
            {(close) => (
                <DocIframe onConfirm={() => close()} URl={userGuideUrl} />
            )}
        </SlideOver>
    )
}