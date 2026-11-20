import {
    WalletsHeaderView,
    type WalletsIconsProps,
} from '@/components/Wallet/WalletComponents/WalletsHeaderView';
import { Page2Contained } from './Page2Contained';
import {
    DrawerSurfaceView,
    DrawerHeadingGroup,
    DrawerTitleView,
    DrawerCloseButton,
    DrawerBodyView,
    DrawerBackdropView,
    DrawerHandleView,
} from '@/components/Modal/DrawerPresentation';
import { WidgetFrame, WidgetHeaderView } from '@/components/Widget/WidgetFrame';
import {
    WidgetBackButton,
    WidgetMenuButton,
} from '@/components/Widget/WidgetNavigationView';
import { useId, type ReactNode } from 'react';

export type Page2PreviewMode = 'component' | 'modal';
export function Page2PreviewFrame({
    mode,
    children,
    wallets,
    confirmation,
}: {
    mode: Page2PreviewMode;
    children: ReactNode;
    wallets?: WalletsIconsProps['wallets'];
    confirmation?: ReactNode;
}) {
    const previewId = useId();
    return (
        <WidgetFrame
            id={`page2-preview-widget-${previewId}`}
            enableWideVersion
            header={
                <WidgetHeaderView
                    start={mode === 'component' && <WidgetBackButton />}
                    end={
                        <>
                            <WalletsHeaderView wallets={wallets} />
                            <WidgetMenuButton />
                        </>
                    }
                />
            }
            overlay={
                <>
                    {mode === 'modal' && (
                        <>
                            <DrawerBackdropView />
                            <DrawerSurfaceView
                                fitHeight
                                className="expandContainerHeight"
                                role="dialog"
                                aria-label="Complete the swap"
                                aria-modal="false"
                                data-page2-modal
                                data-state="open"
                                data-vaul-drawer=""
                                data-vaul-drawer-direction="bottom"
                                data-vaul-snap-points="false"
                                data-vaul-custom-container="true"
                                style={{ maxHeight: '100%', touchAction: 'auto' }}
                            >
                                <DrawerHeadingGroup
                                    handleMobileOnly
                                    title={
                                        <DrawerTitleView>
                                            Complete the swap
                                        </DrawerTitleView>
                                    }
                                    close={<DrawerCloseButton />}
                                    handle={
                                        <DrawerHandleView className="sm:hidden w-12! bg-primary-text-tertiary!" style={{ touchAction: 'inherit' }} />
                                    }
                                />
                                <DrawerBodyView
                                    fitHeight
                                    style={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                    }}
                                >
                                    <Page2Contained>{children}</Page2Contained>
                                </DrawerBodyView>
                            </DrawerSurfaceView>
                        </>
                    )}
                    {confirmation && (
                        <>
                            <DrawerBackdropView />
                            <DrawerSurfaceView
                                fitHeight
                                role="dialog"
                                aria-label="Confirm transfer limits"
                                aria-modal="false"
                                data-page2-confirmation
                                data-state="open"
                                data-vaul-drawer=""
                                data-vaul-drawer-direction="bottom"
                                data-vaul-snap-points="false"
                                data-vaul-custom-container="true"
                                style={{ maxHeight: '100%', touchAction: 'auto' }}
                            >
                                <DrawerHeadingGroup
                                    handleMobileOnly
                                    title={<DrawerTitleView />}
                                    close={<DrawerCloseButton />}
                                    handle={
                                        <DrawerHandleView className="sm:hidden w-12! bg-primary-text-tertiary!" style={{ touchAction: 'inherit' }} />
                                    }
                                />
                                <DrawerBodyView
                                    fitHeight
                                    style={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                    }}
                                >
                                    {confirmation}
                                </DrawerBodyView>
                            </DrawerSurfaceView>
                        </>
                    )}
                </>
            }
        >
            {mode === 'component' ? children : null}
        </WidgetFrame>
    );
}
