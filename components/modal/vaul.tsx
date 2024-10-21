import { clsx } from 'clsx';
import { Dispatch, FC, HTMLAttributes, ReactNode, SetStateAction, useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import IconButton from '../buttons/iconButton';
import { ChevronUp, X } from 'lucide-react';
import { useMeasure } from '@uidotdev/usehooks';
import { SnapElement, SnapPointsProvider, useSnapPoints } from '../../context/snapPointsContext';
import { motion } from 'framer-motion';

type VaulDrawerProps = {
    children: ReactNode;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    header: ReactNode;
    description?: ReactNode;
    modalId: string;
    snapPointsCount?: number;
}

const Comp: FC<VaulDrawerProps> = ({ children, show, setShow, header, description }) => {
    const { isMobile } = useWindowDimensions();
    let [headerRef, { height }] = useMeasure();
    const { setHeaderHeight } = useSnapPoints()

    const [loaded, setLoaded] = useState(false);
    const [snap, setSnap] = useState<number | string | null>(null);
    const [snapElement, setSnapElement] = useState<SnapElement | null>(null);

    const { snapPoints } = useSnapPoints()
    const snapPointsHeight = snapPoints.map((item) => item.height);

    const isLastSnap = snapElement?.id === snapPoints[snapPoints.length - 1].id;
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
    }

    useEffect(() => {
        setLoaded(true);
    }, []);

    if (!loaded) return null;

    return (
        <Drawer.Root
            open={show}
            onOpenChange={handleOpenChange}
            container={isMobile ? null : document.getElementById('widget')}
            snapPoints={snapPointsHeight}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
            handleOnly={!isMobile}
            fadeFromIndex={0}
            modal={isMobile}
        >
            <Drawer.Portal >

                {
                    isMobile
                        ? <Drawer.Overlay className='absolute inset-0 z-40 bg-black/50 block' />
                        : <motion.div
                            key="backdrop"
                            className={`absolute inset-0 z-40 bg-black/50 block`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                }

                <Drawer.Content
                    data-testid="content"
                    className={`absolute flex flex-col bg-secondary-900 rounded-t-3xl bottom-0 left-0 right-0 h-full z-50 pb-6 text-primary-text ${snap === 1 && '!border-none !rounded-none'}`}
                >
                    <div
                        ref={headerRef}
                        className='w-full relative'>
                        {
                            isMobile &&
                            <div className="absolute w-12 h-1 flex-shrink-0 rounded-full bg-primary-text-muted top-2.5 left-[calc(50%-24px)]" />
                        }
                        <div className='flex items-center w-full text-left justify-between px-6 pt-3 pb-2'>
                            <Drawer.Title className="text-lg text-secondary-text font-semibold">
                                {header || 'Modal'}
                            </Drawer.Title>
                            <Drawer.Close asChild>
                                <div className='-mr-2'>
                                    <IconButton icon={
                                        <X strokeWidth={3} />
                                    }>
                                    </IconButton>
                                </div>
                            </Drawer.Close>
                        </div>
                        {
                            description &&
                            <Drawer.Description className="text-sm mt-2 text-secondary-text px-6">
                                {description}
                            </Drawer.Description>
                        }
                    </div>
                    <div
                        className={clsx('flex flex-col w-full h-fit px-6 styled-scroll relative', {
                            'overflow-y-auto': snap === 1,
                            'overflow-hidden': snap !== 1,
                        })}
                    >
                        {children}
                        {
                            !isLastSnap && snapElement &&
                            <div style={{ top: `${Number(snap?.toString().replace('px', '')) - 88}px` }} className={`w-full fixed left-0 z-50`}>
                                <button onClick={goToNextSnap} className="w-full px-6 pt-10 pb-6 justify-center from-secondary-900 bg-gradient-to-t items-center gap-2 inline-flex text-secondary-text">
                                    <ChevronUp className="w-6 h-6 relative" />
                                    <div className="text-sm font-medium">Expand</div>
                                </button>
                            </div>
                        }
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

const VaulDrawerSnap: FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {

    let [ref, { height }] = useMeasure();
    const { setSnapElemenetsHeight } = useSnapPoints()

    useEffect(() => {
        if (!height) return;

        setSnapElemenetsHeight((prev) => {
            const id = Number(props.id?.replace('item-', ''));

            return [{ id, height: height }, ...prev.filter((item) => item.id !== id)]
        })

    }, [height])

    return (
        <div {...props} ref={ref}>
            {props.children}
        </div>
    )
}

const VaulDrawer: typeof Comp & { Snap: FC<HTMLAttributes<HTMLDivElement>> } = (props) => {
    const { isMobile } = useWindowDimensions();

    return (
        <SnapPointsProvider snapPointsCount={props.snapPointsCount} isMobile={isMobile}>
            <Comp {...props}>
                {props.children}
            </Comp>
        </SnapPointsProvider>
    )

}

VaulDrawer.Snap = VaulDrawerSnap;

export default VaulDrawer;