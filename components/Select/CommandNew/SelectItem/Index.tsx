import Image from 'next/image'

type SelectItemWrapperProps = {
    className?: string;
    children: JSX.Element | JSX.Element[];
}
const SelectItem = ({ children, className }: SelectItemWrapperProps) => {
    return <div className="flex items-center justify-between gap-3 w-full overflow-hidden cursor-pointer relative pr-4">
        <div className={`gap-4 pl-4 relative flex items-center w-full ${className}`}>
            {children}
        </div>
    </div>
}
type SeelctItemLogoProps = {
    imgSrc: string;
    altText: string;
    className?: string;
    secondaryLogoSrc?: string;
}
const Logo = ({ imgSrc, altText, secondaryLogoSrc, className = 'rounded-md' }: SeelctItemLogoProps) => {
    return <div className="flex-shrink-0 relative h-8 w-8">
        {imgSrc ? <div className='inline-flex items-center relative'>
            <Image
                src={imgSrc}
                alt={altText}
                height="36"
                width="36"
                loading="eager"
                className={`${className} object-contain`}
            />
            {secondaryLogoSrc &&
                <Image
                    src={secondaryLogoSrc}
                    alt={altText}
                    height="36"
                    width="36"
                    loading="eager"
                    className='h-5 w-5 absolute -right-1.5 -bottom-1.5 object-contain rounded-md border-2 border-secondary-800'
                />
            }

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
            <div className="flex justify-between w-full">
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
}

const DetailedTitle = ({ children, className, title, secondary }: SelectItemDetailedTitleProps) => {
    return <Title className={`py-2 ${className}`}>
        <>
            <div className="grid gap-0 leading-none align-middle">
                <span className="align-middle">{title}</span>
                <div className="flex items-center space-x-0.5 align-middle" >
                    <span className="text-secondary-text text-xs font-light whitespace-nowrap">{secondary}</span>
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