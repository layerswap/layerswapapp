import Image from 'next/image'

type SelectItemWrapperProps = {
    children: JSX.Element | JSX.Element[];
}
const SelectItem = ({ children }: SelectItemWrapperProps) => {
    return <div className="flex items-center justify-between gap-3 w-full overflow-hidden cursor-pointer">
        <div className="relative flex items-center  pl-1 w-full space-x-2">
            {children}
        </div>
    </div>
}
type SeelctItemLogoProps = {
    imgSrc: string;
    altText: string;
    className?: string;
}
const Logo = ({ imgSrc, altText, className = 'rounded-md' }: SeelctItemLogoProps) => {
    return <div className="flex-shrink-0 relative">
        {imgSrc ? <Image
            src={imgSrc}
            alt={altText}
            height="36"
            width="36"
            loading="eager"
            className={`${className} object-contain`}
        /> :
            <div className={`${className} object-contain w-9 h-9 bg-gray-200`} ></div>
        }
    </div>
}

type SeelctItemTitleProps = {
    title: React.ReactNode;
}
const Title = ({ title }: SeelctItemTitleProps) => {
    return <div className="flex justify-between w-full">
        <span className="flex items-center pb-0.5 font-normal">
            {title}
        </span>
    </div>
}

SelectItem.Logo = Logo
SelectItem.Title = Title

export { SelectItem }