import clsx from 'clsx';
import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import IconButton from '../Buttons/iconButton';
import { X } from 'lucide-react';

export function drawerSurfaceClasses({
    fitHeight,
    fullHeight,
    portal,
    className,
}: {
    fitHeight: boolean;
    fullHeight?: boolean;
    portal?: boolean;
    className?: string;
}) {
    return clsx(
        'absolute bg-secondary-700 rounded-t-3xl bottom-0 left-0 right-0 z-50 text-primary-text ring-0! outline-hidden!',
        className,
        {
            'flex flex-col pb-4 h-full': !fitHeight,
            'flex flex-col': fitHeight,
            'border-none! rounded-none!': !fitHeight && fullHeight,
            'fixed! sm:absolute!': portal,
        },
    );
}

export function drawerBodyClasses({
    fitHeight,
    fullHeight,
}: {
    fitHeight: boolean;
    fullHeight?: boolean;
}) {
    return clsx('w-full px-4 styled-scroll', {
        'flex flex-col overflow-x-hidden relative': !fitHeight,
        'h-full': !fitHeight && !fullHeight,
        'flex-1 min-h-0': fullHeight,
        'pb-4': fitHeight,
    });
}

export function DrawerHeaderView({
    title,
    close,
}: {
    title: ReactNode;
    close?: ReactNode;
}) {
    return (
        <div className="flex items-center w-full text-left justify-between px-4 sm:pt-2 pb-2">
            {title}
            {close}
        </div>
    );
}

export const DrawerSurfaceView = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & {
        fitHeight: boolean;
        fullHeight?: boolean;
        portal?: boolean;
    }
>(function DrawerSurfaceView(
    { fitHeight, fullHeight, portal, className, ...props },
    ref,
) {
    return (
        <div
            {...props}
            ref={ref}
            className={drawerSurfaceClasses({
                fitHeight,
                fullHeight,
                portal,
                className,
            })}
        />
    );
});
export const DrawerBodyView = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & {
        fitHeight: boolean;
        fullHeight?: boolean;
    }
>(function DrawerBodyView({ fitHeight, fullHeight, ...props }, ref) {
    return (
        <div
            {...props}
            ref={ref}
            className={drawerBodyClasses({ fitHeight, fullHeight })}
        />
    );
});
export const DrawerHeadingGroup = forwardRef<
    HTMLDivElement,
    {
        title?: ReactNode;
        close?: ReactNode;
        handle?: ReactNode;
        description?: ReactNode;
        snapPoints?: boolean;
        handleMobileOnly?: boolean;
    }
>(function DrawerHeadingGroup(
    { title, close, handle, description, snapPoints, handleMobileOnly },
    ref,
) {
    return (
        <div
            ref={ref}
            className={clsx('w-full flex-shrink-0', { relative: snapPoints })}
        >
            {handle && (
                <div
                    className={clsx(
                        'flex justify-center w-full mt-2 mb-[6px]',
                        handleMobileOnly && 'sm:hidden',
                    )}
                >
                    {handle}
                </div>
            )}
            {(title || close) && (
                <DrawerHeaderView title={title} close={close} />
            )}
            {description}
        </div>
    );
});
export const DrawerTitleView = forwardRef<
    HTMLHeadingElement,
    HTMLAttributes<HTMLHeadingElement>
>(function DrawerTitleView(props, ref) {
    return (
        <h3
            {...props}
            ref={ref}
            className="text-lg text-secondary-text font-semibold w-full"
        />
    );
});
export const DrawerCloseButton = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(function DrawerCloseButton(props, ref) {
    return (
        <div {...props} ref={ref}>
            <IconButton
                aria-label="Close modal"
                className="inline-flex active:animate-press-down"
                icon={<X strokeWidth={2} />}
            />
        </div>
    );
});
export const DrawerHandleView = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(function DrawerHandleView({ children, ...props }, ref) {
    return (
        <div ref={ref} data-vaul-handle="" aria-hidden="true" {...props}>
            <span data-vaul-handle-hitarea="" aria-hidden="true">
                {children}
            </span>
        </div>
    );
});
export const DrawerBackdropView = forwardRef<
    HTMLDivElement,
    { onClick?: () => void }
>(function DrawerBackdropView(props, ref) {
    return (
        <motion.div
            {...props}
            ref={ref}
            className="absolute inset-0 z-50 bg-black/50 block pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        />
    );
});
