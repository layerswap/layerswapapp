import { clsx } from 'clsx';
import { Dispatch, FC, ReactNode, SetStateAction, useCallback, useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import IconButton from '../buttons/iconButton';
import { X } from 'lucide-react';

type VaulDrawerProps = {
    children: ReactNode;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    header: ReactNode;
    description?: ReactNode;
}

const VaulDrawer: FC<VaulDrawerProps> = ({ children, show, setShow, header, description }) => {
    const snapPoints = ['300px', 1];
    const [loaded, setLoaded] = useState(false);
    const [snap, setSnap] = useState<number | string | null>(snapPoints[0]);
    const { isMobile } = useWindowDimensions();

    const handleOpenChange = (open: boolean) => {
        setSnap(open ? snapPoints[0] : 0);
        setShow(open);
    }

    useEffect(() => {
        if (show) {
            setSnap(snapPoints[0]);
        }
    }, [show])

    useEffect(() => {
        setLoaded(true);
    }, []);

    if (!loaded) return null;

    return (
        <Drawer.Root open={show} onOpenChange={handleOpenChange} container={isMobile ? document.body : document.getElementById('widget')} snapPoints={snapPoints} activeSnapPoint={snap} setActiveSnapPoint={setSnap} >
            <Drawer.Portal >
                <Drawer.Overlay className="absolute inset-0 -inset-y-4 z-50 bg-black/50" />
                <Drawer.Content
                    data-testid="content"
                    className="absolute flex flex-col bg-secondary-900 border border-secondary-700 border-b-none rounded-t-lg bottom-0 left-0 right-0 h-full z-50"
                >
                    <div
                        className={clsx('flex flex-col w-full px-6 py-3 styled-scroll', {
                            'overflow-y-auto': snap === 1,
                            'overflow-hidden': snap !== 1,
                        })}
                    >
                        <div className='flex items-center w-full justify-between'>
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
                            <Drawer.Description className="text-sm mt-2 text-secondary-text">
                                {description}
                            </Drawer.Description>
                        }
                        <div className='w-full h-full'>
                            {children}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

export default VaulDrawer;