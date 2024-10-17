import { clsx } from 'clsx';
import { Dispatch, FC, HTMLAttributes, ReactNode, SetStateAction, useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import IconButton from '../buttons/iconButton';
import { X } from 'lucide-react';
import { useMeasure } from '@uidotdev/usehooks';
import { SnapElement, SnapPointsProvider, useSnapPoints } from '../../context/snapPointsContext';

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
    let [ref, { height }] = useMeasure();

    const [loaded, setLoaded] = useState(false);
    const [snap, setSnap] = useState<number | string | null>(null);
    const [snapElement, setSnapElement] = useState<SnapElement | null>(null);

    const { snapPoints } = useSnapPoints()
    const snapPointsHeight = snapPoints.map((item) => item.height);

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

    const handleOpenChange = (open: boolean) => {
        setSnapElement(open ? snapPoints[0] : null);
        setShow(open);
    }

    useEffect(() => {
        setLoaded(true);
    }, []);

    if (!loaded) return null;

    return (
        <Drawer.Root open={show} onOpenChange={handleOpenChange} container={isMobile ? document.body : document.getElementById('widget')} snapPoints={snapPointsHeight} activeSnapPoint={snap} setActiveSnapPoint={setSnap} >
            <Drawer.Portal >
                <Drawer.Overlay className="absolute inset-0 -inset-y-4 z-50 bg-black/50" />
                <Drawer.Content
                    data-testid="content"
                    className={`absolute flex flex-col bg-secondary-900 border-secondary-700 border-t-2 rounded-t-lg bottom-0 left-0 right-0 h-full z-50 pb-6 text-primary-text ${snap === 1 && '!border-none !rounded-none'}`}
                >
                    <div className='w-full'>
                        <div className='flex items-center w-full justify-between px-6 pt-3'>
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
                        className={clsx('flex flex-col w-full h-fit px-6 styled-scroll mt-2', {
                            'overflow-y-auto': snap === 1,
                            'overflow-hidden': snap !== 1,
                        })}
                    >
                        {children}
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