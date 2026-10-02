import { FC, ReactNode, useCallback, useState } from "react";
import { CopyButton } from "@layerswap/ui-kit";
import LayerSwapLogo from "../Icons/layerSwapLogo";
import { Paperclip } from 'lucide-react'
import LayerSwapLogoSmall from "../Icons/layerSwapLogoSmall";
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import clsx from "clsx";
import LayerswapMobileLogo from "../Icons/layerSwapMobileLogo";
interface Props {
    className?: string;
    onlyFullVersion?: boolean;
}

// Serialize an unstyled SVG after it mounts. Importing react-dom/server here
// bundles a renderer that may not match the federated host's React version.
const CopyLogoButton = ({ children, label }: { children: ReactNode; label: string }) => {
    const [svg, setSvg] = useState('');
    const captureSvg = useCallback((node: HTMLSpanElement | null) => {
        if (node) setSvg(node.querySelector('svg')?.outerHTML ?? '');
    }, []);

    return (
        <>
            <span hidden aria-hidden="true" ref={captureSvg}>{children}</span>
            <CopyButton toCopy={svg} disabled={!svg}>{label}</CopyButton>
        </>
    );
};

const LogoWithDetails: FC<Props> = (({ className, onlyFullVersion }) => {

    return (
        <ContextMenuPrimitive.Root>
            <ContextMenuPrimitive.Trigger asChild>
                <div>
                    {
                        onlyFullVersion !== true && <LayerswapMobileLogo
                            className={clsx(
                                "block md:hidden h-4 w-auto text-logo fill-primary-text",
                                className
                            )}
                        />
                    }
                    <LayerSwapLogo
                        className={clsx(
                            "hidden md:block h-8 w-auto text-logo fill-primary-text",
                            {
                                '!block': onlyFullVersion == true
                            },
                            className
                        )}
                    />
                </div>
            </ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Content className="dialog-overlay absolute z-40 border h-fit text-secondary-text border-secondary-100 mt-2 w-fit rounded-md shadow-lg bg-secondary-700 ring-1 ring-black/5 focus:outline-hidden">
                <ContextMenuPrimitive.ContextMenuItem className="dialog-content px-4 py-2 text-sm text-left w-full rounded-t hover:bg-secondary-400 whitespace-nowrap">
                    <CopyLogoButton label="Copy logo as SVG"><LayerSwapLogo /></CopyLogoButton>
                </ContextMenuPrimitive.ContextMenuItem >
                <ContextMenuPrimitive.ContextMenuItem className="dialog-content px-4 py-2 text-sm text-left w-full hover:bg-secondary-400 whitespace-nowrap">
                    <CopyLogoButton label="Copy symbol as SVG"><LayerSwapLogoSmall /></CopyLogoButton>
                </ContextMenuPrimitive.ContextMenuItem >
                <hr className="horizontal-gradient" />
                <ContextMenuPrimitive.ContextMenuItem className="dialog-content">
                    <a href="https://layerswap.notion.site/layerswap/Layerswap-brand-guide-0822bc4f1a2d4af7bc2f1acbb05119e2" target='_blank' className='flex space-x-1 items-center px-4 py-2 rounded-b text-sm text-left w-full hover:bg-secondary-400 whitespace-nowrap'>
                        <Paperclip width={16} />
                        <p>Brand Guidelines</p>
                    </a>
                </ContextMenuPrimitive.ContextMenuItem >
            </ContextMenuPrimitive.Content>
        </ContextMenuPrimitive.Root>
    )
})
export default LogoWithDetails;
