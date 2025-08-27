import { clsx } from 'clsx';
import { Dispatch, FC, ReactNode, SetStateAction, useEffect, useRef, useState } from 'react';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import IconButton from '../buttons/iconButton';
import { ChevronUp, X } from 'lucide-react';
import { useMeasure } from '@uidotdev/usehooks';
import { SnapElement, SnapPointsProvider, useSnapPoints } from '../../context/snapPointsContext';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Drawer } from './vaul';

export type VaulDrawerProps = {
    children: ReactNode;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    header?: ReactNode;
    description?: ReactNode;
    modalId: string;
    onClose?: () => void;
    onAnimationEnd?: (open: boolean) => void;
}

const Comp: FC<VaulDrawerProps> = ({ children, show, setShow, header, description, onClose, onAnimationEnd }) => {
    const { isMobile } = useWindowDimensions();
    let [headerRef, { height }] = useMeasure();
    const { setHeaderHeight } = useSnapPoints()
    const expandRef = useRef<HTMLDivElement>(null);

    const [loaded, setLoaded] = useState(false);
    const [snap, setSnap] = useState<number | string | null>(null);
    const [snapElement, setSnapElement] = useState<SnapElement | null>(null);

    const { snapPoints } = useSnapPoints()
    const snapPointsHeight = snapPoints.map((item) => item.height);

    const isLastSnap = snapElement?.id === snapPoints[snapPoints.length - 1]?.id;

    const goToNextSnap = () => {
        if (!snapElement) return;
        setSnapElement(snapPoints.find((item) => item.id === snapElement.id + 1) || null);
    }

    useEffect(() => {
        if (show && snapPoints.length > 0) {
            setSnapElement(snapPoints.find((item) => item.id === snapElement?.id) || snapPoints[0]);
        }
    }, [snapPoints, show])

    useEffect(() => {
        if (!snapElement || snapElement.height === snap) return;

        setSnap(snapElement.height)
    }, [snapElement])

    useEffect(() => {
        if (!snap || snap === snapElement?.height) return

        setSnapElement(snapPoints.find((item) => item.height === snap) || null)
    }, [snap])

    useEffect(() => {
        if (!height) return;
        setHeaderHeight(height);
    }, [height])

    const handleOpenChange = (open: boolean) => {
        setSnap(open ? snapPoints[0].height : null);
        setShow(open);
        if (!open) return onClose && onClose()
    }

    useEffect(() => {
        setLoaded(true);
    }, []);

    if (!loaded) return null;

    const container = isMobile ? document.body : document.getElementById('widget');

    return (
        <Drawer.Root
            open={show}
            onOpenChange={handleOpenChange}
            container={container}
            snapPoints={snapPointsHeight}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
            fadeFromIndex={0}
            onDrag={(e) => {
                if (e.movementY < 0 && !expandRef.current?.classList.contains('hidden')) expandRef.current?.classList.add('hidden')
            }}
            modal={isMobile ? true : false}
            repositionInputs={false}
            onAnimationEnd={(e) => { onAnimationEnd && onAnimationEnd(e) }}
            handleOnly={isMobile}
        >
            <DesktopBackdropPortal isOpen={show} container={container} isMobile={isMobile}>
                <AnimatePresence mode='wait'>
                    {
                        show &&
                        <motion.div
                            onClick={() => setShow(false)}
                            key="backdrop"
                            className='absolute inset-0 z-40 bg-black/50 block'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    }
                </AnimatePresence>
            </DesktopBackdropPortal>

            <Drawer.Portal>
                {
                    isMobile &&
                    <Drawer.Close asChild>
                        <Drawer.Overlay
                            className='fixed inset-0 z-50 bg-black/50 block'
                        />
                    </Drawer.Close>

                }

                <Drawer.Content
                    data-testid="content"
                    className={clsx('fixed sm:absolute flex flex-col bg-secondary-700 rounded-t-3xl bottom-0 left-0 right-0 h-full z-50 pb-4 text-primary-text ring-0! outline-hidden! ', {
                        'border-none! rounded-none!': snap === 1,
                    })}
                >
                    <div
                        ref={headerRef}
                        className='w-full relative'>
                        {
                            isMobile &&
                            <div className="absolute top-2 left-[calc(50%-24px)]" >
                                <Drawer.Handle className='!w-12 bg-primary-text-muted' />
                            </div>
                        }

                        <div className='flex items-center w-full text-left justify-between px-4 pt-3 pb-2'>
                            <Drawer.Title className="text-lg text-secondary-text font-semibold w-full">
                                {header}
                            </Drawer.Title>
                            <Drawer.Close asChild>
                                <div>
                                    <IconButton className='inline-flex' icon={
                                        <X strokeWidth={3} />
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
                        className={clsx('flex flex-col w-full h-fit max-h-[90dvh] px-4 styled-scroll overflow-x-hidden relative', {
                            'overflow-y-auto h-full': snap === 1,
                            'overflow-hidden': snap !== 1,
                        })}
                        id="virtualListContainer"
                    >
                        {children}
                        <AnimatePresence>
                            {
                                !isLastSnap && snapElement &&
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    ref={expandRef}
                                    style={{ top: `${Number(snapElement.height?.toString().replace('px', '')) - 88}px` }} className='w-full fixed left-0 z-50'>
                                    <button type='button' onClick={goToNextSnap} className="w-full px-4 pt-10 pb-4 justify-center from-secondary-700 bg-gradient-to-t items-center gap-2 inline-flex text-secondary-text">
                                        <ChevronUp className="w-6 h-6 relative" />
                                        <div className="text-sm font-medium">Expand</div>
                                    </button>
                                </motion.div>
                            }
                        </AnimatePresence>
                        <VaulFooter snapElement={snapElement} />
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root >
    );
}

const VaulFooter: FC<{ snapElement: SnapElement | null }> = ({ snapElement }) => {
    let [ref, { height }] = useMeasure();
    const { setFooterHeight } = useSnapPoints()

    useEffect(() => {
        setFooterHeight(height || 0);
    }, [height])

    return (
        <div
            ref={ref}
            id='walletModalFooter'
            style={{
                top: snapElement?.height !== 1 ? `${Number(snapElement?.height?.toString().replace('px', '')) - 50}px` : undefined,
                bottom: snapElement?.height === 1 ? '12px' : undefined
            }}
            className='w-full fixed left-0 z-50'
        />
    )
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

const DesktopBackdropPortal = ({ isOpen, container, children, isMobile }: { isOpen: boolean, container?: Element | null, children: React.ReactNode, isMobile: boolean }) => {
    const ref = useRef<Element | null>(null);
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        if (!isMobile && isOpen) {
            const observer = new MutationObserver(() => {
                if (window.document.body.style.pointerEvents === 'none') {
                    window.document.body.style.pointerEvents = 'auto';
                }
            });

            observer.observe(window.document.body, {
                attributes: true,
                attributeFilter: ['style']
            });

            // Also set it immediately
            window.document.body.style.pointerEvents = 'auto';

            return () => {
                observer.disconnect();
                window.document.body.style.pointerEvents = '';
            }
        }
    }, [isMobile, isOpen])

    useEffect(() => {

        if (container && isOpen) {
            ref.current = container
            setMounted(true)
        }

    }, [isOpen, container]);

    return ref.current && mounted ? createPortal(children, ref.current) : null;
}

export default VaulDrawer;