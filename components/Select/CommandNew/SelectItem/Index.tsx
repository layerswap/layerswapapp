import { ImageWithFallback } from '@/components/Common/ImageWithFallback';
import clsx from 'clsx';

type SelectItemWrapperProps = {
    className?: string;
    children: JSX.Element | JSX.Element[];
}
const SelectItem = ({ children, className }: SelectItemWrapperProps) => {
    return <div className={clsx("flex items-center justify-between w-full pl-2 pr-3 overflow-hidden cursor-pointer relative gap-2", className)}>
        {children}
    </div>
}
type SeelctItemLogoProps = {
    imgSrc: string;
    altText: string;
    className?: string;
}
const Logo = ({ imgSrc, altText, className = 'rounded-md' }: SeelctItemLogoProps) => {
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
            <div className={`${className} object-contain bg-gray-200`} ></div>
        }
    </div>
}

type SelectItemTitleProps = {
    className?: string;
    children?: string | JSX.Element | JSX.Element[];
}
const Title = ({ children, className }: SelectItemTitleProps) => {
    return <div className={`flex justify-between w-full items-center ${className}`}>
        <div className="flex items-center pb-0.5 text-base w-full">
            <div className="flex justify-between w-full items-center">
                {children}
            </div>
        </div>
    </div>
}

type SelectItemDetailedTitleProps = {
    className?: string;
    children?: JSX.Element | JSX.Element[];
    title: string;
    secondary: string | JSX.Element | JSX.Element[];
    secondaryLogoSrc?: string;
    logoClassName?: string;
}

const DetailedTitle = ({ children, className, title, secondary, secondaryLogoSrc, logoClassName }: SelectItemDetailedTitleProps) => {
    return <Title className={`py-2 ${className}`}>
        <>
            <div className="grid gap-0 leading-5 align-middle space-y-0.5 font-medium">
                <span className="align-middle">{title}</span>
                <div className="flex items-center space-x-1 align-middle" >
                    {secondaryLogoSrc && <ImageWithFallback
                        src={secondaryLogoSrc}
                        alt={title}
                        height="36"
                        width="36"
                        loading="eager"
                        className={`h-4 w-4 object-contain rounded-[4px] ${logoClassName}`}
                    />}
                    <span className="text-secondary-text text-xs whitespace-nowrap">
                        {secondary}
                    </span>
                </div>
            </div>
            {children}
        </>
    </Title>
}

SelectItem.Logo = Logo
SelectItem.Title = Title
SelectItem.DetailedTitle = DetailedTitle

export { SelectItem }