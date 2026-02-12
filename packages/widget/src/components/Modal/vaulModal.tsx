import { Dispatch, FC, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import IconButton from '../Buttons/iconButton';
import { ChevronUp, X } from 'lucide-react';
import { useMeasure } from '@uidotdev/usehooks';
import { SnapElement, SnapPointsProvider, useSnapPoints } from '@/context/snapPointsContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Drawer } from './vaul';
import AppSettings from '@/lib/AppSettings';

export type VaulDrawerProps = {
    children: ReactNode;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    header?: ReactNode;
    description?: ReactNode;
    modalId: string;
    onClose?: () => void;
    onAnimationEnd?: (open: boolean) => void;
    className?: string;
    mode?: 'snapPoints' | 'fitHeight';
}

const Comp: FC<VaulDrawerProps> = ({ children, show, setShow, header, description, onClose, onAnimationEnd, className, modalId, mode = 'snapPoints' }) => {
    const { isMobileWithPortal: isMobile, isMobile: isMobileWithoutPortal } = useWindowDimensions();
    let [headerRef, { height }] = useMeasure();
    const { setHeaderHeight } = useSnapPoints()
    const expandRef = useRef<HTMLDivElement>(null);
    const drawerContentRef = useRef<HTMLDivElement>(null);

    const [loaded, setLoaded] = useState(false);
    const [snap, setSnap] = useState<number | string | null>(null);
    const [snapElement, setSnapElement] = useState<SnapElement | null>(null);

    const { snapPoints } = useSnapPoints()
    const snapPointsHeight = useMemo(() => snapPoints.map((item) => item.height), [snapPoints]);

    const isFitHeightMode = mode === 'fitHeight';
    const isSnapPointsMode = mode === 'snapPoints';
    const isLastSnap = isSnapPointsMode ? snapElement?.id === snapPoints[snapPoints.length - 1]?.id : true;

    const snapPointsProps = useMemo(() => {
        if (!isSnapPointsMode) return {};
        return {
            snapPoints: snapPointsHeight,
            activeSnapPoint: snap,
            setActiveSnapPoint: setSnap,
            fadeFromIndex: 0 as const,
            onDrag: (e: any) => { if (e.movementY < 0 && !expandRef.current?.classList.contains('hidden')) expandRef.current?.classList.add('hidden') }
        };
    }, [mode, snapPointsHeight, snap]);

    const goToNextSnap = () => {
        if (!snapElement || isFitHeightMode) return;
        setSnapElement(snapPoints.find((item) => item.id === snapElement.id + 1) || null);
    }

    useEffect(() => {
        if (isFitHeightMode || !show || snapPoints.length === 0) return;
        setSnapElement(snapPoints.find((item) => item.id === snapElement?.id) || snapPoints[0]);
    }, [snapPoints, show, mode, snapElement?.id])

    useEffect(() => {
        if (isFitHeightMode || !snapElement || snapElement.height === snap) return;
        setSnap(snapElement.height)
    }, [snapElement, mode, snap])

    useEffect(() => {
        if (isFitHeightMode || !snap || snap === snapElement?.height) return
        setSnapElement(snapPoints.find((item) => item.height === snap) || null)
    }, [snap, mode, snapElement?.height, snapPoints])

    useEffect(() => {
        if (!height) return;
        setHeaderHeight(height);
    }, [height, setHeaderHeight])

    useEffect(() => {
        if (!isFitHeightMode || !show) return;

        let isActive = true;
        const rafId = requestAnimationFrame(() => {
            if (!isActive) return;
            const wrapper = drawerContentRef.current;
            const drawer = wrapper?.closest('[data-vaul-drawer]') as HTMLElement;
            if (!drawer || !wrapper) return;

            const maxHeight = isMobile ? window.innerHeight : (document.getElementById('widget')?.offsetHeight ?? window.innerHeight);

            drawer.style.maxHeight = `${maxHeight}px`;
            wrapper.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden';
        });

        return () => {
            isActive = false;
            cancelAnimationFrame(rafId);
            const wrapper = drawerContentRef.current;
            if (wrapper) {
                const drawer = wrapper.closest('[data-vaul-drawer]') as HTMLElement;
                drawer?.style.removeProperty('maxHeight');
                wrapper.style.cssText = '';
            }
        };
    }, [mode, show, isMobile])

    const handleOpenChange = (open: boolean) => {
        if (isSnapPointsMode) setSnap(open && snapPoints.length > 0 ? snapPoints[0].height : null);
        setShow(open);
        if (!open) return onClose && onClose()
    }

    useEffect(() => {
        setLoaded(true);
    }, []);

    // Inject theme styles into document head for mobile modals
    useEffect(() => {
        if (isMobile) {
            const styleId = 'vaul-modal-theme-styles';
            let styleElement = document.getElementById(styleId);

            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                styleElement.textContent = vaulStyles;
                document.head.appendChild(styleElement);
            }
        }

        return () => {
            // Clean up when component unmounts
            const styleElement = document.getElementById('vaul-modal-theme-styles');
            if (styleElement && !isMobile) {
                styleElement.remove();
            }
        };
    }, [isMobile]);

    if (!loaded) return null;

    const container = (isMobile && AppSettings.ThemeData?.enablePortal) ? undefined : document.getElementById('widget');

    return (
        <Drawer.Root
            open={show}
            onOpenChange={handleOpenChange}
            container={container}
            {...snapPointsProps}
            modal={isMobile ? true : false}
            repositionInputs={false}
            onAnimationEnd={(e) => { onAnimationEnd && onAnimationEnd(e) }}
            handleOnly={isMobileWithoutPortal}
        >
            <Drawer.Portal>
                {isMobile ? (
                    <Drawer.Close asChild>
                        <Drawer.Overlay
                            className='fixed inset-0 z-50 bg-black/50 block'
                        />
                    </Drawer.Close>
                ) : (
                    <AnimatePresence>
                        {show && (
                            <Drawer.Close asChild key={`backdrop-${modalId}`}>
                                <motion.div
                                    className='absolute inset-0 z-50 bg-black/50 block pointer-events-auto'
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Drawer.Close>
                        )}
                    </AnimatePresence>
                )}
                <Drawer.Content
                    data-testid="content"
                    data-fit-height={isFitHeightMode ? 'true' : undefined}
                    className={clsx('absolute bg-secondary-700 rounded-t-3xl bottom-0 left-0 right-0 z-50 text-primary-text ring-0! outline-hidden!', className, {
                        'flex flex-col pb-4 h-full': isSnapPointsMode,
                        'flex flex-col': isFitHeightMode,
                        'border-none! rounded-none!': isSnapPointsMode && snap === 1,
                        'fixed! sm:absolute!': AppSettings.ThemeData?.enablePortal == true,
                    })}
                >
                    <div
                        ref={headerRef}
                        className={clsx('w-full flex-shrink-0', { 'relative': isSnapPointsMode })}>
                        {
                            isMobileWithoutPortal &&
                            <div className="flex justify-center w-full mt-2 mb-[6px]" >
                                <Drawer.Handle className='w-12! bg-primary-text-tertiary!' />
                            </div>
                        }

                        <div className='flex items-center w-full text-left justify-between px-4 sm:pt-2 pb-2'>
                            <Drawer.Title className="text-lg text-secondary-text font-semibold w-full">
                                {header}
                            </Drawer.Title>
                            <Drawer.Close asChild>
                                <div>
                                    <IconButton className='inline-flex active:animate-press-down' icon={
                                        <X strokeWidth={2} />
                                    }>
                                    </IconButton>
                                </div>
                            </Drawer.Close>
                        </div>
                        {
                            description &&
                            <Drawer.Description className="text-sm mt-2 text-secondary-text px-4">
                                {description}
                            </Drawer.Description>
                        }
                    </div>
                    <div
                        ref={isFitHeightMode ? drawerContentRef : undefined}
                        className={clsx('w-full px-4 styled-scroll', {
                            'flex flex-col overflow-x-hidden relative h-full': isSnapPointsMode,
                            'pb-4': isFitHeightMode
                        })}
                        id="virtualListContainer"
                    >
                        {children}
                        <AnimatePresence>
                            {
                                isSnapPointsMode && !isLastSnap && snapElement &&
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    ref={expandRef}
                                    style={{ top: `${Number(snapElement.height?.toString().replace('px', '')) - 88}px` }} className='w-full fixed left-0 z-50'>
                                    <button type='button' onClick={goToNextSnap} className="w-full px-4 pt-10 pb-4 justify-center from-secondary-700 bg-linear-to-t items-center gap-2 inline-flex text-secondary-text">
                                        <ChevronUp className="w-6 h-6 relative" />
                                        <div className="text-sm font-medium">Expand</div>
                                    </button>
                                </motion.div>
                            }
                        </AnimatePresence>
                        {isMobile && <VaulFooter snapElement={snapElement} mode={mode} />}
                    </div>
                    {!isMobile && <VaulFooter snapElement={snapElement} mode={mode} />}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

const VaulFooter: FC<{ snapElement: SnapElement | null; mode?: 'snapPoints' | 'fitHeight' }> = ({ snapElement, mode = 'snapPoints' }) => {
    let [ref, { height }] = useMeasure();
    const { setFooterHeight } = useSnapPoints()

    useEffect(() => {
        setFooterHeight(height || 0);
    }, [height])

    return <div
        ref={ref}
        id='walletModalFooter'
        style={{
            top: mode === 'snapPoints' && snapElement?.height !== 1 ? `${Number(snapElement?.height?.toString().replace('px', '')) - 50}px` : undefined,
            bottom: mode === 'snapPoints' && snapElement?.height === 1 ? '12px' : undefined
        }}
        className='w-full left-0 z-50 max-sm:absolute'
    />
}

const VaulDrawerSnap: FC<React.HTMLAttributes<HTMLDivElement> & { id: `item-${number}`, openFullHeight?: boolean }> = (props) => {
    const { openFullHeight, ...domProps } = props;

    let [ref, { height }] = useMeasure();
    const { setSnapElemenetsHeight } = useSnapPoints()

    useEffect(() => {
        if (!height) return;

        setSnapElemenetsHeight((prev) => {
            const id = Number(props.id?.replace('item-', ''));
            return [{ id, height: height as number, fullHeight: openFullHeight }, ...prev.filter((item) => item.id !== id)]
        })

    }, [height])

    return (
        <div {...domProps} className={props.className ?? 'pb-4'} id={props.id} ref={ref}>
            {props.children}
        </div>
    )
}

const VaulDrawer: typeof Comp & { Snap: typeof VaulDrawerSnap } = (props) => {
    const { isMobile } = useWindowDimensions();

    return (
        <SnapPointsProvider isMobile={isMobile}>
            <Comp {...props}>
                {props.children}
            </Comp>
        </SnapPointsProvider>
    )

}

VaulDrawer.Snap = VaulDrawerSnap;


type Props = {
    children: React.ReactNode,
    isWalletModalOpen?: boolean
}

export const ModalFooterPortal: FC<Props> = ({ children, isWalletModalOpen }) => {
    const ref = useRef<Element | null>(null);
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        let element = isWalletModalOpen && document.getElementById('walletModalFooter');

        if (element) {
            ref.current = element
            setMounted(true)
        }

    }, [isWalletModalOpen]);

    return ref.current && mounted ? createPortal(children, ref.current) : null;
};

export default VaulDrawer;

const vaulStyles = `
[data-vaul-drawer] {
    touch-action: none;
    will-change: transform;
    transition: transform 0.1s cubic-bezier(0.32, 0.72, 0, 1);
    animation-duration: 0.1s;
    animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}
[data-vaul-drawer][data-vaul-snap-points='false'][data-vaul-drawer-direction='bottom'][data-state='open'] {
    animation-name: slideFromBottom;
}
[data-vaul-drawer][data-vaul-snap-points='false'][data-vaul-drawer-direction='bottom'][data-state='closed'] {
    animation-name: slideToBottom;
}
[data-vaul-drawer][data-vaul-snap-points='true'][data-vaul-drawer-direction='bottom'] {
    transform: translate3d(0, var(--initial-transform, 100%), 0);
}
[data-vaul-drawer][data-vaul-delayed-snap-points='true'][data-vaul-drawer-direction='bottom'] {
    transform: translate3d(0, var(--snap-point-height, 0), 0);
}
[data-vaul-overlay][data-vaul-snap-points='false'] {
    animation-duration: 0.1s;
    animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}
[data-vaul-overlay][data-vaul-snap-points='false'][data-state='open'] {
    animation-name: fadeIn;
}
[data-vaul-overlay][data-state='closed'] {
    animation-name: fadeOut;
}
[data-vaul-overlay][data-vaul-snap-points='true'] {
    opacity: 0;
    transition: opacity 0.1s cubic-bezier(0.32, 0.72, 0, 1);
}
[data-vaul-overlay][data-vaul-snap-points='true'] {
    opacity: 1;
}
[data-vaul-drawer]:not([data-vaul-custom-container='true'])::after {
    content: '';
    position: absolute;
    background: inherit;
    background-color: inherit;
}
[data-vaul-drawer][data-vaul-drawer-direction='bottom']::after {
    top: 100%;
    bottom: initial;
    left: 0;
    right: 0;
    height: 200%;
}
[data-vaul-handle] {
    display: block;
    position: relative;
    opacity: 0.7;
    background: #e2e2e4;
    margin-left: auto;
    margin-right: auto;
    height: 5px;
    width: 32px;
    border-radius: 1rem;
    touch-action: pan-y;
}
[data-vaul-handle]:hover,
[data-vaul-handle]:active {
    opacity: 1;
}
[data-vaul-handle-hitarea] {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: max(100%, 2.75rem);
    height: max(100%, 2.75rem);
    touch-action: inherit;
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes fadeOut {
    to { opacity: 0; }
}
@keyframes slideFromBottom {
    from { transform: translate3d(0, var(--initial-transform, 100%), 0); }
    to { transform: translate3d(0, 0, 0); }
}
@keyframes slideToBottom {
    to { transform: translate3d(0, var(--initial-transform, 100%), 0); }
}
`