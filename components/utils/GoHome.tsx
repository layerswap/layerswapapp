import { useRouter } from "next/router";
import { FC, useCallback } from "react";
import CopyButton from "../buttons/copyButton";
import LayerSwapLogo from "../icons/layerSwapLogo";
import { PaperClipIcon } from '@heroicons/react/outline'
import { renderToString } from 'react-dom/server'
import LayerSwapLogoSmall from "../icons/layerSwapLogoSmall";
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';


interface Props {
    className?: string;
    children?: JSX.Element | JSX.Element[] | string;
}

const GoHomeButton: FC<Props> = (({ className, children }) => {
    const router = useRouter()

    const handleGoHome = useCallback(() => {
        router.push({
            pathname: "/"
        })
    }, [router.query])

    return (
        <div onClick={handleGoHome}>
            {
                children ??
                <>
                    <ContextMenuPrimitive.Root>
                        <ContextMenuPrimitive.Trigger>
                            <LayerSwapLogo className={className ?? "h-8 w-auto text-primary-logoColor"} />
                        </ContextMenuPrimitive.Trigger>
                        <ContextMenuPrimitive.Content className="dialog-overlay absolute z-40 border h-fit text-primary-text border-darkblue-50 mt-2 w-fit rounded-md shadow-lg bg-darkblue ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <ContextMenuPrimitive.ContextMenuItem className="dialog-content px-4 py-2 text-sm text-left w-full rounded-t hover:bg-darkblue-300 whitespace-nowrap">
                                <CopyButton toCopy={renderToString(<LayerSwapLogo />)}>Copy logo as SVG</CopyButton>
                            </ContextMenuPrimitive.ContextMenuItem >
                            <ContextMenuPrimitive.ContextMenuItem className="dialog-content px-4 py-2 text-sm text-left w-full hover:bg-darkblue-300 whitespace-nowrap">
                                <CopyButton toCopy={renderToString(<LayerSwapLogoSmall />)}>Copy symbol as SVG</CopyButton>
                            </ContextMenuPrimitive.ContextMenuItem >
                            <hr className="horizontal-gradient" />
                            <ContextMenuPrimitive.ContextMenuItem className="dialog-content">
                                <a href="https://layerswap.notion.site/layerswap/Layerswap-brand-guide-4b579a04a4c3477cad1c28f466749cf1" target='_blank' className='flex space-x-1 items-center px-4 py-2 rounded-b text-sm text-left w-full hover:bg-darkblue-300 whitespace-nowrap'>
                                    <PaperClipIcon width={16} />
                                    <p>Brand Guidelines</p>
                                </a>
                            </ContextMenuPrimitive.ContextMenuItem >
                        </ContextMenuPrimitive.Content>
                    </ContextMenuPrimitive.Root>
                </>
            }
        </div>
    )
})

export default GoHomeButton;
