import { DocIframe } from "./docInIframe";
import SlideOver, { slideOverPlace } from "./SlideOver";

export default function GuideLink({ userGuideUrl, text, place = "inStep" }: { userGuideUrl: string, text: string, place?: slideOverPlace }) {
    return <span className="items-center">
        <SlideOver moreClassNames="bg-[#181c1f] sm:!pb-6 !pb-0" opener={(open) => <span className='text-primary cursor-pointer hover:text-primary-400' onClick={open}>&nbsp;<span>{text}</span></span>} place={place}>
            {(close) => (
                <DocIframe onConfirm={() => close()} URl={userGuideUrl} />
            )}
        </SlideOver>
    </span>;
}