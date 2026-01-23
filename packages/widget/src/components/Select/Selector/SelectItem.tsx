import { ImageWithFallback } from '@/components/Common/ImageWithFallback';
import clsx from 'clsx';
import { ReactNode } from 'react';
import type { JSX } from 'react';

type SelectItemWrapperProps = {
    className?: string;
    children: JSX.Element | JSX.Element[];
}
const SelectItem = ({ children, className }: SelectItemWrapperProps) => {
    return <div className={clsx("flex items-center justify-between pl-2 pr-3 overflow-hidden cursor-pointer relative gap-2 py-1.5", className)}>
        {children}
    </div>
}
type SelectItemLogoProps = {
    imgSrc?: string;
    altText: string;
    className?: string;
}
const Logo = ({ imgSrc, altText, className = 'rounded-md' }: SelectItemLogoProps) => {
    return <div className="shrink-0 relative h-9 w-9">
        {imgSrc ? <div className='inline-flex relative'>
            <ImageWithFallback
                src={imgSrc}
                alt={altText}
                height="36"
                width="36"
                loading="eager"
                className={`${className} object-contain`}
            />
        </div>
            :
            <div className={`${className} object-contain bg-gray-200 h-9 w-9 rounded-full`} ></div>
        }
    </div>
}

type SelectItemTitleProps = {
    className?: string;
    children?: ReactNode;
}
const Title = ({ children, className }: SelectItemTitleProps) => {
    return <div className={`flex justify-between w-full text-base items-center pb-0.5 ${className}`}>
        {children}
    </div>
}

type SelectItemDetailedTitleProps = {
    className?: string;
    children?: ReactNode;
    title: ReactNode;
    secondary: ReactNode;
    secondaryImageAlt: string;
    secondaryLogoSrc: string | undefined;
    logoClassName?: string;
}

const DetailedTitle = ({ children, className, title, secondary, secondaryImageAlt, secondaryLogoSrc, logoClassName }: SelectItemDetailedTitleProps) => {
    return <Title className={clsx("w-full grid grid-cols-9", className)}>
        <div className="col-span-9 flex flex-col gap-1 leading-5 align-middle font-medium">
            <div className="align-middle leading-5 text-base flex items-center justify-between w-full min-w-0">{title}</div>
        </div>
        <div className="col-span-5 sm:col-span-6 flex items-center gap-1 min-w-0 overflow-hidden pr-2">
            {secondaryLogoSrc && <ImageWithFallback
                src={secondaryLogoSrc}
                alt={secondaryImageAlt}
                height="16"
                width="16"
                loading="eager"
                className={clsx("h-4 w-4 object-contain rounded shrink-0", logoClassName)}
            />}
            <div className="text-secondary-text text-xs min-w-0 whitespace-nowrap">
                {secondary}
            </div>
        </div>
        {children && <div className="col-span-4 sm:col-span-3 text-right truncate">{children}</div>}
    </Title>
}

SelectItem.Logo = Logo
SelectItem.Title = Title
SelectItem.DetailedTitle = DetailedTitle

export { SelectItem }