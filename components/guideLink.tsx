import { ReactNode, useState } from "react";
import SecondaryButton from "./buttons/secondaryButton";
import { DocIframe } from "./docInIframe";
import Modal from "./modal/modal";
import VaulDrawer from "./modal/vaulModal";
import Link from "next/link";

export default function GuideLink({ userGuideUrl, text, button, buttonClassNames }: { userGuideUrl: string, text?: string, button?: ReactNode, buttonClassNames?: string }) {
    const [showGuide, setShowGuide] = useState(false);

    return (
        <>
            {
                button ?
                    <SecondaryButton onClick={() => setShowGuide(true)} className={buttonClassNames}>
                        {button}
                    </SecondaryButton>
                    :
                    <Link target="_blank" href={userGuideUrl} className='text-primary cursor-pointer hover:text-primary-400'>&nbsp;<span>{text}</span></Link>
            }
            {/* <VaulDrawer
                className="bg-[#181c1f]"
                header={text || button}
                show={showGuide}
                setShow={setShowGuide}
                modalId="guide">
                <VaulDrawer.Snap id="item-1" openFullHeight>
                    <DocIframe onConfirm={() => setShowGuide(false)} URl={userGuideUrl} />
                </VaulDrawer.Snap>
            </VaulDrawer> */}
        </>
    )
}